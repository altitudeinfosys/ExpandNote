import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import { parseEmailContent, extractTagsFromSubject } from '@/lib/email/parser';
import { MAX_CONTENT_SIZE_BYTES } from '@/lib/constants';
import { config } from '@/lib/config';

/**
 * Resend webhook event structure for email.received events
 */
interface ResendWebhookEvent {
  type: 'email.received';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string | string[];
    subject?: string;
  };
}

/**
 * POST /api/email/webhook
 * Webhook endpoint for Resend inbound emails
 *
 * This endpoint receives emails from Resend and creates notes for users.
 * Email addresses are in the format: u-{token}@{domain}
 *
 * Security: Webhook signature verification required in production
 * Idempotency: Duplicate email_id events return existing note
 * Race Conditions: Atomic tag creation via upsert
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Resend client once (used for both verification and fetching)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    // Verify webhook signature for security
    const signature = request.headers.get('svix-signature');
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');

    // Check if we're in production mode
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, webhook secret is REQUIRED
    if (isProduction && !config.resend.webhookSecret) {
      console.error('RESEND_WEBHOOK_SECRET is required in production');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    let parsedEvent;

    if (config.resend.webhookSecret) {
      // Verify signature when webhook secret is configured
      if (!signature || !svixId || !svixTimestamp) {
        console.error('Missing webhook signature headers');
        return NextResponse.json(
          { error: 'Missing webhook signature headers' },
          { status: 401 }
        );
      }

      const payload = await request.text();

      try {
        resend.webhooks.verify({
          payload,
          headers: {
            id: svixId,
            timestamp: svixTimestamp,
            signature: signature,
          },
          webhookSecret: config.resend.webhookSecret,
        });
      } catch (error) {
        console.error('Webhook signature verification failed:', error);
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }

      // Parse the event after verification
      parsedEvent = JSON.parse(payload);
    } else {
      // No webhook secret - only allowed in development (defense in depth)
      if (process.env.NODE_ENV === 'production') {
        // This should never happen due to check at line 52-58, but defense in depth
        console.error('CRITICAL: Production deployment without RESEND_WEBHOOK_SECRET');
        throw new Error('Production deployment missing RESEND_WEBHOOK_SECRET');
      }
      console.warn('RESEND_WEBHOOK_SECRET not configured - skipping signature verification (DEVELOPMENT ONLY)');
      parsedEvent = await request.json();
    }

    // Type-safe event parsing
    const event = parsedEvent as ResendWebhookEvent;

    // Validate event type
    if (event.type !== 'email.received') {
      return NextResponse.json(
        { error: 'Unsupported event type' },
        { status: 400 }
      );
    }

    // Extract email metadata from webhook event
    const { email_id, from, to, subject } = event.data;

    // Validate required fields
    if (!email_id || !to || !from) {
      return NextResponse.json(
        { error: 'Missing required fields: email_id, to, from' },
        { status: 400 }
      );
    }

    // Handle array format for 'to' field
    const toAddress = Array.isArray(to) ? to[0] : to;

    // Extract token from email address (format: u-{token}@domain)
    const tokenMatch = toAddress.match(/^u-([a-z0-9]+)@/i);
    if (!tokenMatch) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    const token = tokenMatch[1].toLowerCase();

    // Create service role Supabase client to bypass RLS (webhooks are not authenticated)
    const supabase = createServiceClient();

    // Lookup user by token
    const { data: userSettings, error: lookupError } = await supabase
      .from('user_settings')
      .select('user_id, email_to_note_enabled')
      .eq('email_to_note_token', token)
      .maybeSingle();

    if (lookupError) {
      console.error('Error looking up user by token:', lookupError);
      return NextResponse.json(
        { error: 'Failed to lookup user' },
        { status: 500 }
      );
    }

    if (!userSettings) {
      return NextResponse.json(
        { error: 'Email address not found' },
        { status: 404 }
      );
    }

    if (!userSettings.email_to_note_enabled) {
      return NextResponse.json(
        { error: 'Email-to-note feature not enabled for this user' },
        { status: 403 }
      );
    }

    // Check if already processed (idempotency)
    const { data: alreadyProcessed } = await supabase
      .from('processed_emails')
      .select('note_id')
      .eq('email_id', email_id)
      .maybeSingle();

    if (alreadyProcessed) {
      console.log(`Email ${email_id} already processed, returning success`);
      return NextResponse.json({
        success: true,
        note_id: alreadyProcessed.note_id,
        message: 'Email already processed (idempotent)',
      });
    }

    // Fetch the actual email content from Resend API (resend client already initialized)
    const { data: email, error: fetchError } = await resend.emails.receiving.get(email_id);

    if (fetchError || !email) {
      console.error('Error fetching email from Resend:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch email content' },
        { status: 500 }
      );
    }

    // Parse email content (Resend returns html and text fields)
    const content = parseEmailContent(
      email.text ?? undefined,
      email.html ?? undefined
    );

    // Validate content size
    if (content.length > MAX_CONTENT_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Email content too large. Maximum size: ${MAX_CONTENT_SIZE_BYTES} bytes` },
        { status: 413 }
      );
    }

    // Extract tags from subject line
    const tags = extractTagsFromSubject(subject || '');

    // Create note (without tags - they'll be added via note_tags table)
    const { data: note, error: createError } = await supabase
      .from('notes')
      .insert({
        user_id: userSettings.user_id,
        title: subject || 'Note from email',
        content: content || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create note:', createError);
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      );
    }

    // Record that we processed this email (idempotency)
    await supabase
      .from('processed_emails')
      .insert({
        email_id: email_id,
        note_id: note.id,
      });

    // Process tags extracted from subject
    // Use upsert to handle race conditions when multiple emails arrive simultaneously
    let tagsCreated = 0;
    if (tags.length > 0) {
      for (const tagName of tags) {
        try {
          // Use upsert with onConflict to handle race conditions atomically
          const { data: tag, error: tagError } = await supabase
            .from('tags')
            .upsert(
              {
                user_id: userSettings.user_id,
                name: tagName,
              },
              {
                onConflict: 'user_id,name',
                ignoreDuplicates: false,
              }
            )
            .select('id')
            .single();

          if (tagError) {
            console.error(`Failed to create/fetch tag ${tagName}:`, tagError);
            continue; // Skip this tag but continue with others
          }

          // Create note_tags association
          const { error: associationError } = await supabase
            .from('note_tags')
            .insert({
              note_id: note.id,
              tag_id: tag.id,
            });

          if (associationError) {
            // If association already exists (unique violation), ignore the error
            if (associationError.code !== '23505') {
              console.error(`Failed to associate tag ${tagName}:`, associationError);
            }
          } else {
            tagsCreated++;
          }
        } catch (error) {
          console.error(`Error processing tag ${tagName}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      note_id: note.id,
      tags_created: tagsCreated,
      message: 'Note created successfully',
    });

  } catch (error) {
    console.error('Email webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

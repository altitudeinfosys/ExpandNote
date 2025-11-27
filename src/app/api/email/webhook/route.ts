import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import { parseEmailContent, extractTagsFromSubject } from '@/lib/email/parser';
import { MAX_CONTENT_SIZE_BYTES } from '@/lib/constants';

/**
 * POST /api/email/webhook
 * Webhook endpoint for Resend inbound emails
 *
 * This endpoint receives emails from Resend and creates notes for users.
 * Email addresses are in the format: u-{token}@{domain}
 *
 * Expected payload from Resend (webhook event):
 * {
 *   "type": "email.received",
 *   "created_at": "2024-02-22T23:41:12.126Z",
 *   "data": {
 *     "email_id": "uuid",
 *     "from": "sender@example.com",
 *     "to": ["u-abc123@domain"],
 *     "subject": "Note title #tag1 #tag2"
 *   }
 * }
 *
 * Note: Webhooks do NOT include the email body. We must fetch it using the Resend API.
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Verify webhook signature using Resend's webhook secret
    // This should be done in production for security
    // const signature = request.headers.get('svix-signature');
    // const svixId = request.headers.get('svix-id');
    // const svixTimestamp = request.headers.get('svix-timestamp');

    const event = await request.json();

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

    // Initialize Resend client
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    // Fetch the actual email content from Resend API
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
    const tags = extractTagsFromSubject(subject);

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

    return NextResponse.json({
      success: true,
      note_id: note.id,
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

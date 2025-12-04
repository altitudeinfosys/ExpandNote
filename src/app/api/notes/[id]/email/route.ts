import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// Rate limit constants
const RATE_LIMIT_MAX_EMAILS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Maximum content size for emails (500KB)
const MAX_EMAIL_CONTENT_SIZE = 500 * 1024;

/**
 * Sanitize text for use in email subject line
 * Removes newlines (header injection prevention) and escapes HTML
 */
function sanitizeSubject(text: string): string {
  return text
    .replace(/[\r\n]/g, ' ')  // Remove newlines to prevent header injection
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 100);  // Limit subject length
}

/**
 * POST /api/notes/[id]/email
 * Send a note via email using Resend
 *
 * Request body:
 * - email: string (required) - destination email address
 *
 * Security:
 * - User must be authenticated and own the note
 * - Rate limited to 10 emails per hour per user
 * - Content size limited to 500KB
 * - Input sanitization for XSS and header injection prevention
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: noteId } = await params;

    // Parse request body
    const body = await request.json();
    const { email } = body;

    // Validate email parameter
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Enhanced email validation with header injection prevention
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || /[\r\n]/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Check for Resend API key
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Initialize Resend client
    const resend = new Resend(resendApiKey);

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check rate limit
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: emailCount, error: countError } = await supabase
      .from('email_sends')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('sent_at', oneHourAgo);

    if (countError) {
      console.error('Error checking rate limit:', countError);
      // Continue anyway - don't block users due to rate limit check errors
    } else if (emailCount !== null && emailCount >= RATE_LIMIT_MAX_EMAILS) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can send up to 10 emails per hour. Please try again later.' },
        { status: 429 }
      );
    }

    // Fetch the note and verify ownership
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, title, content, user_id')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (noteError) {
      console.error('Error fetching note:', noteError);
      return NextResponse.json(
        { error: 'Failed to fetch note' },
        { status: 500 }
      );
    }

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found or you do not have permission to access it' },
        { status: 404 }
      );
    }

    // Check content size limit
    const contentSize = new Blob([note.content || '']).size;
    if (contentSize > MAX_EMAIL_CONTENT_SIZE) {
      return NextResponse.json(
        { error: 'Note is too large to email. Maximum size is 500KB.' },
        { status: 400 }
      );
    }

    // Get user info for "from" address
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 500 }
      );
    }

    // Prepare email content with sanitization
    const noteTitle = note.title || 'Untitled Note';
    const noteContent = note.content || '';
    const sanitizedTitle = sanitizeSubject(noteTitle);

    // Create HTML email content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #4F46E5;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #1F2937;
      margin: 0 0 10px 0;
    }
    .content {
      white-space: pre-wrap;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      background-color: #F9FAFB;
      padding: 15px;
      border-radius: 5px;
      border: 1px solid #E5E7EB;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      font-size: 12px;
      color: #6B7280;
      text-align: center;
    }
    .branding {
      color: #4F46E5;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">${noteTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
  </div>
  <div class="content">${noteContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  <div class="footer">
    <p>Sent from <a href="https://expandnote.com" class="branding">ExpandNote</a></p>
    <p>This note was shared by ${userData.email}</p>
  </div>
</body>
</html>
    `.trim();

    // Create plain text version
    const textContent = `
${noteTitle}
${'='.repeat(noteTitle.length)}

${noteContent}

---
Sent from ExpandNote
This note was shared by ${userData.email}
    `.trim();

    // Send email via Resend
    try {
      const { data: emailData, error: sendError } = await resend.emails.send({
        from: `ExpandNote <noreply@${process.env.RESEND_EMAIL_DOMAIN || 'send.expandnote.com'}>`,
        to: email,
        subject: `Note: ${sanitizedTitle}`,
        html: htmlContent,
        text: textContent,
        replyTo: userData.email,
      });

      if (sendError) {
        console.error('Resend API error:', sendError);
        return NextResponse.json(
          { error: 'Failed to send email. Please try again later.' },
          { status: 500 }
        );
      }

      // Log the email send for rate limiting
      const { error: logError } = await supabase
        .from('email_sends')
        .insert({
          user_id: user.id,
          note_id: noteId,
          recipient_email: email,
        });

      if (logError) {
        // Log but don't fail - email was sent successfully
        console.error('Error logging email send:', logError);
      }

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        email_id: emailData?.id,
      });

    } catch (sendError) {
      console.error('Error sending email:', sendError);
      return NextResponse.json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

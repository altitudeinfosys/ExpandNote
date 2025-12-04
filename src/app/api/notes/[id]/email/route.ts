import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/notes/[id]/email
 * Send a note via email using Resend
 *
 * Request body:
 * - email: string (required) - destination email address
 *
 * Security: User must be authenticated and own the note
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: noteId } = await context.params;

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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
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

    // Prepare email content
    const noteTitle = note.title || 'Untitled Note';
    const noteContent = note.content || '';

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
        subject: `Note: ${noteTitle}`,
        html: htmlContent,
        text: textContent,
        reply_to: userData.email,
      });

      if (sendError) {
        console.error('Resend API error:', sendError);
        return NextResponse.json(
          { error: 'Failed to send email', details: sendError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        email_id: emailData?.id,
      });

    } catch (sendError) {
      console.error('Error sending email:', sendError);
      return NextResponse.json(
        { error: 'Failed to send email' },
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

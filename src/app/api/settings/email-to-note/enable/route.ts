import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/settings/email-to-note/enable
 * Enable email-to-note feature for the authenticated user
 *
 * This generates a unique token and email address for the user.
 * The email address format is: u-{token}@{RESEND_DOMAIN}
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Resend domain from environment variable
    const resendDomain = process.env.RESEND_EMAIL_DOMAIN || 'notes.resend.dev';

    // Call the database function to generate a token
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_email_token');

    if (tokenError) {
      console.error('Error generating token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate token' },
        { status: 500 }
      );
    }

    const token = tokenData as string;
    const emailAddress = `u-${token}@${resendDomain}`;

    // Update user settings with token and email address
    const { data: settings, error: updateError } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: user.id,
          email_to_note_enabled: true,
          email_to_note_token: token,
          email_to_note_address: emailAddress,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (updateError) {
      console.error('Error updating settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to enable email-to-note' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email_address: emailAddress,
      enabled: true,
    });
  } catch (error) {
    console.error('Error in POST /api/settings/email-to-note/enable:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

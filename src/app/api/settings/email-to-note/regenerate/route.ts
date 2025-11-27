import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/settings/email-to-note/regenerate
 * Regenerate email address for the authenticated user
 *
 * This generates a new token and email address, invalidating the old one.
 * Useful if the user's email address is compromised or they want a fresh address.
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

    // Call the database function to generate a new token
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

    // Update user settings with new token and email address
    const { data: settings, error: updateError } = await supabase
      .from('user_settings')
      .update({
        email_to_note_token: token,
        email_to_note_address: emailAddress,
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to regenerate email address' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email_address: emailAddress,
    });
  } catch (error) {
    console.error('Error in POST /api/settings/email-to-note/regenerate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

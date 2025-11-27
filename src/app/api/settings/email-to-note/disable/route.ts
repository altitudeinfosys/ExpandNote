import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/settings/email-to-note/disable
 * Disable email-to-note feature for the authenticated user
 *
 * This sets email_to_note_enabled to false but preserves the token/address
 * in case the user wants to re-enable it later.
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

    // Update user settings to disable email-to-note
    const { data: settings, error: updateError } = await supabase
      .from('user_settings')
      .update({
        email_to_note_enabled: false,
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to disable email-to-note' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      enabled: false,
    });
  } catch (error) {
    console.error('Error in POST /api/settings/email-to-note/disable:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

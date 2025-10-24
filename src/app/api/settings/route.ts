import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/settings - Get user settings
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // If no settings exist, return default settings
    if (!settings) {
      return NextResponse.json({
        user_id: user.id,
        openai_api_key: null,
        claude_api_key: null,
        default_ai_provider: 'openai',
        enable_auto_tagging: true,
        default_sort: 'modified_desc',
        theme: 'auto'
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error in GET /api/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      openai_api_key,
      claude_api_key,
      default_ai_provider,
      enable_auto_tagging,
      default_sort,
      theme
    } = body;

    // Validate enums if provided
    if (default_ai_provider && !['openai', 'claude'].includes(default_ai_provider)) {
      return NextResponse.json({ error: 'Invalid AI provider' }, { status: 400 });
    }

    if (theme && !['auto', 'light', 'dark'].includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
    }

    // Build update object
    const updates: Record<string, unknown> = {
      user_id: user.id
    };
    if (openai_api_key !== undefined) updates.openai_api_key = openai_api_key;
    if (claude_api_key !== undefined) updates.claude_api_key = claude_api_key;
    if (default_ai_provider !== undefined) updates.default_ai_provider = default_ai_provider;
    if (enable_auto_tagging !== undefined) updates.enable_auto_tagging = enable_auto_tagging;
    if (default_sort !== undefined) updates.default_sort = default_sort;
    if (theme !== undefined) updates.theme = theme;

    // Upsert the settings (insert or update)
    const { data: settings, error } = await supabase
      .from('user_settings')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error in PUT /api/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

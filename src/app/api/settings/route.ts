import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { encryptApiKey, decryptApiKey, maskApiKey } from '@/lib/encryption';

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

    // Decrypt API keys if they exist
    let openaiKey = null;
    let claudeKey = null;

    if (settings.openai_api_key_encrypted) {
      openaiKey = await decryptApiKey(settings.openai_api_key_encrypted);
    } else if (settings.openai_api_key) {
      // Legacy: Migrate plaintext key to encrypted
      openaiKey = settings.openai_api_key;
      // Encrypt and update in background (fire and forget)
      encryptApiKey(openaiKey).then(encrypted => {
        if (encrypted) {
          supabase
            .from('user_settings')
            .update({ openai_api_key_encrypted: encrypted })
            .eq('user_id', user.id)
            .then(() => console.log('Migrated OpenAI key to encrypted format'));
        }
      }).catch(err => console.error('Failed to migrate OpenAI key:', err));
    }

    if (settings.claude_api_key_encrypted) {
      claudeKey = await decryptApiKey(settings.claude_api_key_encrypted);
    } else if (settings.claude_api_key) {
      // Legacy: Migrate plaintext key to encrypted
      claudeKey = settings.claude_api_key;
      // Encrypt and update in background (fire and forget)
      encryptApiKey(claudeKey).then(encrypted => {
        if (encrypted) {
          supabase
            .from('user_settings')
            .update({ claude_api_key_encrypted: encrypted })
            .eq('user_id', user.id)
            .then(() => console.log('Migrated Claude key to encrypted format'));
        }
      }).catch(err => console.error('Failed to migrate Claude key:', err));
    }

    return NextResponse.json({
      ...settings,
      openai_api_key: openaiKey,
      claude_api_key: claudeKey,
      // Don't send encrypted versions to client
      openai_api_key_encrypted: undefined,
      claude_api_key_encrypted: undefined
    });
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

    // Encrypt API keys if provided
    if (openai_api_key !== undefined) {
      if (openai_api_key === null || openai_api_key === '') {
        updates.openai_api_key_encrypted = null;
        updates.openai_api_key = null; // Clear legacy field too
      } else {
        const encrypted = await encryptApiKey(openai_api_key);
        updates.openai_api_key_encrypted = encrypted;
        updates.openai_api_key = null; // Clear legacy field
      }
    }

    if (claude_api_key !== undefined) {
      if (claude_api_key === null || claude_api_key === '') {
        updates.claude_api_key_encrypted = null;
        updates.claude_api_key = null; // Clear legacy field too
      } else {
        const encrypted = await encryptApiKey(claude_api_key);
        updates.claude_api_key_encrypted = encrypted;
        updates.claude_api_key = null; // Clear legacy field
      }
    }

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

    // Return response with masked API keys (never return decrypted keys after save)
    return NextResponse.json({
      ...settings,
      openai_api_key: settings.openai_api_key_encrypted ? maskApiKey(openai_api_key) : null,
      claude_api_key: settings.claude_api_key_encrypted ? maskApiKey(claude_api_key) : null,
      // Don't send encrypted versions to client
      openai_api_key_encrypted: undefined,
      claude_api_key_encrypted: undefined
    });
  } catch (error) {
    console.error('Error in PUT /api/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/ai-profiles/:id - Get a single AI profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('ai_profiles')
      .select(`
        *,
        tags (
          id,
          name
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching AI profile:', error);
      return NextResponse.json({ error: 'AI profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error in GET /api/ai-profiles/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/ai-profiles/:id - Update an AI profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      tag_id,
      ai_provider,
      model,
      system_prompt,
      user_prompt_template,
      trigger_mode,
      output_behavior,
      output_title_template,
      is_active
    } = body;

    // Validate enums if provided
    if (ai_provider && !['openai', 'claude'].includes(ai_provider)) {
      return NextResponse.json({ error: 'Invalid AI provider' }, { status: 400 });
    }

    if (trigger_mode && !['automatic', 'manual'].includes(trigger_mode)) {
      return NextResponse.json({ error: 'Invalid trigger mode' }, { status: 400 });
    }

    if (output_behavior && !['append', 'new_note', 'replace'].includes(output_behavior)) {
      return NextResponse.json({ error: 'Invalid output behavior' }, { status: 400 });
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (tag_id !== undefined) updates.tag_id = tag_id;
    if (ai_provider !== undefined) updates.ai_provider = ai_provider;
    if (model !== undefined) updates.model = model;
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;
    if (user_prompt_template !== undefined) updates.user_prompt_template = user_prompt_template;
    if (trigger_mode !== undefined) updates.trigger_mode = trigger_mode;
    if (output_behavior !== undefined) updates.output_behavior = output_behavior;
    if (output_title_template !== undefined) updates.output_title_template = output_title_template;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update the profile
    const { data: profile, error } = await supabase
      .from('ai_profiles')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        tags (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating AI profile:', error);
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'A profile already exists for this tag' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to update AI profile' }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error in PUT /api/ai-profiles/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ai-profiles/:id - Delete an AI profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('ai_profiles')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting AI profile:', error);
      return NextResponse.json({ error: 'Failed to delete AI profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/ai-profiles/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

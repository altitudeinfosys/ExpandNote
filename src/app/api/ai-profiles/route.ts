import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/ai-profiles - List all AI profiles for the user
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profiles, error } = await supabase
      .from('ai_profiles')
      .select(`
        *,
        tags (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AI profiles:', error);
      return NextResponse.json({ error: 'Failed to fetch AI profiles' }, { status: 500 });
    }

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Error in GET /api/ai-profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ai-profiles - Create a new AI profile
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Validate required fields
    if (!name || !tag_id || !ai_provider || !model || !system_prompt || !user_prompt_template || !trigger_mode || !output_behavior) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate enums
    if (!['openai', 'claude'].includes(ai_provider)) {
      return NextResponse.json({ error: 'Invalid AI provider' }, { status: 400 });
    }

    if (!['automatic', 'manual'].includes(trigger_mode)) {
      return NextResponse.json({ error: 'Invalid trigger mode' }, { status: 400 });
    }

    if (!['append', 'new_note', 'replace'].includes(output_behavior)) {
      return NextResponse.json({ error: 'Invalid output behavior' }, { status: 400 });
    }

    // Create the profile
    const { data: profile, error } = await supabase
      .from('ai_profiles')
      .insert({
        user_id: user.id,
        name,
        tag_id,
        ai_provider,
        model,
        system_prompt,
        user_prompt_template,
        trigger_mode,
        output_behavior,
        output_title_template,
        is_active: is_active ?? true
      })
      .select(`
        *,
        tags (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating AI profile:', error);
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'A profile already exists for this tag' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create AI profile' }, { status: 500 });
    }

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/ai-profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

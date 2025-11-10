import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MAX_TAGS_PER_NOTE } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tags
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }

    return NextResponse.json({ data: tags || [] });
  } catch (error) {
    console.error('Unexpected error fetching tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    // Check name length
    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
      return NextResponse.json(
        { error: 'Tag name must be 50 characters or less' },
        { status: 400 }
      );
    }

    // Check if the tag already exists for this user
    const { data: existingTags, error: checkError } = await supabase
      .from('tags')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', trimmedName);

    if (checkError) {
      console.error('Error checking existing tag:', checkError);
      return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
    }

    if (existingTags && existingTags.length > 0) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }

    // Check if user has reached the max number of tags (100 tags per user limit)
    const { count, error: countError } = await supabase
      .from('tags')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error counting user tags:', countError);
      return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
    }

    if (count && count >= 100) {
      return NextResponse.json(
        { error: 'You have reached the maximum number of tags (100)' },
        { status: 403 }
      );
    }

    // Create tag
    const { data: newTag, error: insertError } = await supabase
      .from('tags')
      .insert([{ name: trimmedName, user_id: user.id }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating tag:', insertError);
      return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
    }

    return NextResponse.json({ data: newTag });
  } catch (error) {
    console.error('Error processing tag creation:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
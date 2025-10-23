import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// GET - Retrieve a specific tag (including notes count)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid tag ID format' }, { status: 400 });
    }

    // Get tag
    const { data: tag, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    console.error('Error fetching tag:', error);
    return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 });
  }

    // Get note count for this tag
    const { count, error: countError } = await supabase
      .from('note_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', id);

    if (countError) {
      console.error('Error counting notes for tag:', countError);
      return NextResponse.json({ data: tag }); // Return tag without count
    }

    return NextResponse.json({
      data: {
        ...tag,
        note_count: count || 0
      }
    });
  } catch (error) {
    console.error('Unexpected error fetching tag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a tag
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid tag ID format' }, { status: 400 });
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

    // Check if the tag exists and belongs to the user
    const { data: existingTag, error: checkError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
      }
      console.error('Error checking existing tag:', checkError);
      return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
    }

    // Check if another tag with the same name already exists for this user
    const { data: duplicateTags, error: duplicateError } = await supabase
      .from('tags')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', trimmedName)
      .neq('id', id); // Exclude current tag

    if (duplicateError) {
      console.error('Error checking duplicate tag:', duplicateError);
      return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
    }

    if (duplicateTags && duplicateTags.length > 0) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }

    // Update tag
    const { data: updatedTag, error: updateError } = await supabase
      .from('tags')
      .update({ name: trimmedName })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the tag
      .select()
      .single();

    if (updateError) {
      console.error('Error updating tag:', updateError);
      return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedTag });
  } catch (error) {
    console.error('Error processing tag update:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE - Delete a tag
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid tag ID format' }, { status: 400 });
    }

    // Check if the tag exists and belongs to the user
    const { data: existingTag, error: checkError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

  if (checkError) {
    if (checkError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    console.error('Error checking tag ownership:', checkError);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }

    // Delete all note_tags associations first
    const { error: noteTagsError } = await supabase
      .from('note_tags')
      .delete()
      .eq('tag_id', id);

    if (noteTagsError) {
      console.error('Error deleting note_tags associations:', noteTagsError);
      return NextResponse.json(
        { error: 'Failed to delete tag associations' },
        { status: 500 }
      );
    }

    // Delete the tag
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user owns the tag

    if (deleteError) {
      console.error('Error deleting tag:', deleteError);
      return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error deleting tag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
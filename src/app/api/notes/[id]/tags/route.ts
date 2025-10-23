import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MAX_TAGS_PER_NOTE } from '@/lib/constants';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// Get tags for a specific note
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
      return NextResponse.json({ error: 'Invalid note ID format' }, { status: 400 });
    }

    // Check if the note exists and belongs to the user
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

  if (noteError) {
    if (noteError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    console.error('Error checking note ownership:', noteError);
    return NextResponse.json({ error: 'Failed to fetch note tags' }, { status: 500 });
  }

    // First, get all note_tags entries for this note
    const { data: noteTags, error: noteTagsError } = await supabase
      .from('note_tags')
      .select('tag_id')
      .eq('note_id', id);

    if (noteTagsError) {
      console.error('Error fetching note tags:', noteTagsError);
      return NextResponse.json({ error: 'Failed to fetch note tags' }, { status: 500 });
    }

    if (!noteTags || noteTags.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Then, get all tags with these IDs
    const tagIds = noteTags.map(nt => nt.tag_id);
    const { data: tags, error } = await supabase
      .from('tags')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .in('id', tagIds);

    if (error) {
      console.error('Error fetching note tags:', error);
      return NextResponse.json({ error: 'Failed to fetch note tags' }, { status: 500 });
    }

    return NextResponse.json({ data: tags || [] });
  } catch (error) {
    console.error('Unexpected error fetching note tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Replace all tags for a note
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
      return NextResponse.json({ error: 'Invalid note ID format' }, { status: 400 });
    }

    const { tagIds } = await request.json();

    // Validate input
    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: 'tagIds must be an array of tag IDs' },
        { status: 400 }
      );
    }

    // Enforce maximum tags per note
    if (tagIds.length > MAX_TAGS_PER_NOTE) {
      return NextResponse.json(
        { error: `A note can have a maximum of ${MAX_TAGS_PER_NOTE} tags` },
        { status: 400 }
      );
    }

    // Validate each tag ID format
    const invalidTagIds = tagIds.filter((tagId) => !uuidRegex.test(tagId));
    if (invalidTagIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid tag ID format in the provided list' },
        { status: 400 }
      );
    }

    // Check if the note exists and belongs to the user
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (noteError) {
      if (noteError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }
      console.error('Error checking note ownership:', noteError);
      return NextResponse.json({ error: 'Failed to update note tags' }, { status: 500 });
    }

    // Check if all tags exist and belong to the user
    if (tagIds.length > 0) {
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', user.id)
        .in('id', tagIds);

      if (tagsError) {
        console.error('Error checking tag ownership:', tagsError);
        return NextResponse.json({ error: 'Failed to update note tags' }, { status: 500 });
      }

      if (!tags || tags.length !== tagIds.length) {
        return NextResponse.json(
          { error: 'One or more tags do not exist or do not belong to you' },
          { status: 404 }
        );
      }
    }

    // Delete existing note_tags associations
    const { error: deleteError } = await supabase
      .from('note_tags')
      .delete()
      .eq('note_id', id);

    if (deleteError) {
      console.error('Error deleting existing note_tags:', deleteError);
      return NextResponse.json({ error: 'Failed to update note tags' }, { status: 500 });
    }

    // Insert new note_tags associations if there are tags to add
    if (tagIds.length > 0) {
      const noteTagsToInsert = tagIds.map((tagId) => ({
        note_id: id,
        tag_id: tagId,
      }));

      const { error: insertError } = await supabase
        .from('note_tags')
        .insert(noteTagsToInsert);

      if (insertError) {
        console.error('Error inserting note_tags:', insertError);
        return NextResponse.json(
          { error: 'Failed to update note tags' },
          { status: 500 }
        );
      }
    }

    // Update the note's updated_at timestamp
    const { error: updateError } = await supabase
      .from('notes')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating note timestamp:', updateError);
      // This is not critical, so we don't return an error
    }

    // Get the updated tags for the note
    // First, fetch the tag IDs from note_tags
    const { data: noteTags, error: noteTagsError } = await supabase
      .from('note_tags')
      .select('tag_id')
      .eq('note_id', id);

    if (noteTagsError) {
      console.error('Error fetching updated note tags:', noteTagsError);
      return NextResponse.json({ success: true }); // Return success even if we can't fetch the updated tags
    }

    if (!noteTags || noteTags.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Then, get all tags with these IDs
    const updatedTagIds = noteTags.map(nt => nt.tag_id);
    const { data: updatedTags, error: fetchError } = await supabase
      .from('tags')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .in('id', updatedTagIds);

    if (fetchError) {
      console.error('Error fetching updated tags:', fetchError);
      return NextResponse.json({ success: true }); // Return success even if we can't fetch the updated tags
    }

    return NextResponse.json({ data: updatedTags || [] });
  } catch (error) {
    console.error('Error processing note tags update:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
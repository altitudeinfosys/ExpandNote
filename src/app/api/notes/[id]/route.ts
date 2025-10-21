import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// GET /api/notes/[id] - Get a single note
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch note with tags
    const { data: note, error } = await supabase
      .from('notes')
      .select(
        `
        *,
        tags:note_tags(
          tag:tags(*)
        )
      `
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }
      console.error('Error fetching note:', error);
      return NextResponse.json(
        { error: 'Failed to fetch note' },
        { status: 500 }
      );
    }

    // Transform the data to flatten tags
    const transformedNote = {
      ...note,
      tags: note.tags?.map((t: any) => t.tag).filter(Boolean) || [],
    };

    return NextResponse.json({ data: transformedNote });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/notes/[id] - Update a note
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, is_favorite, tagIds } = body;

    // Validate content if provided
    if (content !== undefined) {
      // Allow empty content for notes
      if (content.length > 1048576) {
        return NextResponse.json(
          { error: 'Content exceeds maximum size of 1MB' },
          { status: 400 }
        );
      }
    }

    // First, verify the note belongs to the user
    const { data: existingNote, error: fetchError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title || null;
    if (content !== undefined) updates.content = content;
    if (is_favorite !== undefined) updates.is_favorite = is_favorite;

    // Update the note
    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating note:', updateError);
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }

    // Handle tag updates if provided
    if (tagIds !== undefined && Array.isArray(tagIds)) {
      // Validate max 5 tags
      if (tagIds.length > 5) {
        return NextResponse.json(
          { error: 'Maximum 5 tags allowed per note' },
          { status: 400 }
        );
      }

      // Remove existing tags
      await supabase.from('note_tags').delete().eq('note_id', id);

      // Add new tags
      if (tagIds.length > 0) {
        const noteTags = tagIds.map((tagId: string) => ({
          note_id: id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from('note_tags')
          .insert(noteTags);

        if (tagError) {
          console.error('Error updating tags:', tagError);
        }
      }
    }

    // Fetch the updated note with tags
    const { data: noteWithTags } = await supabase
      .from('notes')
      .select(
        `
        *,
        tags:note_tags(
          tag:tags(*)
        )
      `
      )
      .eq('id', id)
      .single();

    const transformedNote = {
      ...noteWithTags,
      tags: noteWithTags?.tags?.map((t: any) => t.tag).filter(Boolean) || [],
    };

    return NextResponse.json({ data: transformedNote });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Soft delete a note
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete the note
    const { data, error } = await supabase
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }
      console.error('Error deleting note:', error);
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { id: data.id } });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

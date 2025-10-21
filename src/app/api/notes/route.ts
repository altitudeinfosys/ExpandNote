import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/notes - List all notes for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering and sorting
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const showFavorites = searchParams.get('favorites') === 'true';

    // Build query
    let query = supabase
      .from('notes')
      .select(
        `
        *,
        tags:note_tags(
          tag:tags(*)
        )
      `
      )
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // Apply filters
    if (showFavorites) {
      query = query.eq('is_favorite', true);
    }

    // Note: Tag filtering is handled client-side for now
    // To implement server-side tag filtering, we'd need a separate query
    // if (tagIds && tagIds.length > 0) {
    //   // Filter by tags - this would require a join or subquery
    // }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    const { data: notes, error } = await query;

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    // Transform the data to flatten tags
    const transformedNotes = notes?.map((note) => ({
      ...note,
      tags: note.tags?.map((t: { tag: unknown }) => t.tag).filter(Boolean) || [],
    }));

    return NextResponse.json({ data: transformedNotes });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
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

    // Validate content exists (can be empty for new notes)
    if (content === undefined || content === null) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Check content size (max 1MB)
    if (content.length > 1048576) {
      return NextResponse.json(
        { error: 'Content exceeds maximum size of 1MB' },
        { status: 400 }
      );
    }

    // Create the note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: title || null,
        content,
        is_favorite: is_favorite || false,
      })
      .select()
      .single();

    if (noteError) {
      console.error('Error creating note:', noteError);
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      );
    }

    // Add tags if provided
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      // Validate max 5 tags
      if (tagIds.length > 5) {
        return NextResponse.json(
          { error: 'Maximum 5 tags allowed per note' },
          { status: 400 }
        );
      }

      const noteTags = tagIds.map((tagId: string) => ({
        note_id: note.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from('note_tags')
        .insert(noteTags);

      if (tagError) {
        console.error('Error adding tags to note:', tagError);
        // Note was created but tags failed - we'll still return the note
      }
    }

    // Fetch the note with tags
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
      .eq('id', note.id)
      .single();

    const transformedNote = {
      ...noteWithTags,
      tags: noteWithTags?.tags?.map((t: { tag: unknown }) => t.tag).filter(Boolean) || [],
    };

    return NextResponse.json({ data: transformedNote }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

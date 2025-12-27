import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  MAX_CONTENT_SIZE_BYTES,
  MAX_TITLE_LENGTH,
  MAX_TAGS_PER_NOTE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/lib/constants';

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

    // Get query parameters for filtering, sorting, and pagination
    const searchParams = request.nextUrl.searchParams;

    // Validate and sanitize sortBy parameter to prevent SQL injection
    const allowedSortFields = ['updated_at', 'created_at', 'title'] as const;
    const sortByParam = searchParams.get('sortBy') || 'updated_at';
    const sortBy = allowedSortFields.includes(sortByParam as typeof allowedSortFields[number])
      ? sortByParam
      : 'updated_at';

    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const showFavorites = searchParams.get('favorites') === 'true';
    const showTrash = searchParams.get('trash') === 'true';
    const showArchived = searchParams.get('archived') === 'true';

    // Pagination
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE)),
      MAX_PAGE_SIZE
    );
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('notes')
      .select(
        `
        *,
        tags:note_tags(
          tag:tags(*)
        )
      `,
        { count: 'exact' } // Get total count for pagination
      )
      .eq('user_id', user.id);

    // Filter by trash status
    // Note: trash and favorites filters are mutually exclusive (enforced client-side)
    if (showTrash) {
      // Show only deleted notes
      query = query.not('deleted_at', 'is', null);
    } else if (showArchived) {
      // Show only archived notes (non-deleted)
      query = query.is('deleted_at', null).eq('is_archived', true);
    } else {
      // Show only non-deleted, non-archived notes (default view)
      query = query.is('deleted_at', null).eq('is_archived', false);

      // Apply favorites filter only when not showing trash or archived
      // This prevents the confusing UX of "favorited trash items"
      if (showFavorites) {
        query = query.eq('is_favorite', true);
      }
    }

    // Note: Tag filtering is handled client-side for now
    // To implement server-side tag filtering, we'd need a separate query
    // if (tagIds && tagIds.length > 0) {
    //   // Filter by tags - this would require a join or subquery
    // }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: notes, error, count } = await query;

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

    return NextResponse.json({
      data: transformedNotes,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
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
    const { title, content, is_favorite, is_archived, tagIds } = body;

    // Validate content exists (can be empty for new notes)
    if (content === undefined || content === null) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Validate title length
    if (title && title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `Title cannot exceed ${MAX_TITLE_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Check content size
    if (content.length > MAX_CONTENT_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Content exceeds maximum size of ${MAX_CONTENT_SIZE_BYTES / 1024 / 1024}MB` },
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
        is_archived: is_archived || false,
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
      // Validate max tags
      if (tagIds.length > MAX_TAGS_PER_NOTE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_TAGS_PER_NOTE} tags allowed per note` },
          { status: 400 }
        );
      }

      // Validate tag IDs are valid UUIDs and belong to user
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidTagIds = tagIds.filter((id: string) => !uuidRegex.test(id));

      if (invalidTagIds.length > 0) {
        return NextResponse.json(
          { error: 'Invalid tag IDs provided' },
          { status: 400 }
        );
      }

      // Verify tags belong to user
      const { data: userTags, error: tagsCheckError } = await supabase
        .from('tags')
        .select('id')
        .in('id', tagIds)
        .eq('user_id', user.id);

      if (tagsCheckError || !userTags || userTags.length !== tagIds.length) {
        return NextResponse.json(
          { error: 'One or more tags do not exist or do not belong to you' },
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

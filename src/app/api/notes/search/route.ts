import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/notes/search - Search notes using full-text search and optional tag filtering
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

    // Get search parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const tagIds = searchParams.getAll('tagId');
    const showArchived = searchParams.get('archived') === 'true';
    const showFavorites = searchParams.get('favorites') === 'true';
    const showTrash = searchParams.get('trash') === 'true';

    // Either a search query or tag IDs must be provided
    if ((!query || query.trim().length === 0) && tagIds.length === 0) {
      return NextResponse.json(
        { error: 'Either search query or tag filter is required' },
        { status: 400 }
      );
    }

    // Validate tagIds format if present
    if (tagIds.length > 0) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidTagIds = tagIds.filter(id => !uuidRegex.test(id));
      if (invalidTagIds.length > 0) {
        return NextResponse.json(
          { error: 'Invalid tag ID format' },
          { status: 400 }
        );
      }
    }

    // Build initial query based on view filters
    // Mutually exclusive: trash > archived > favorites > all
    let initialQuery = supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id);

    if (showTrash) {
      // Show only deleted notes
      initialQuery = initialQuery.not('deleted_at', 'is', null);
    } else if (showArchived) {
      // Show only archived, non-deleted notes
      initialQuery = initialQuery.is('deleted_at', null).eq('is_archived', true);
    } else {
      // Default: show only non-deleted, non-archived notes
      initialQuery = initialQuery.is('deleted_at', null).eq('is_archived', false);

      if (showFavorites) {
        initialQuery = initialQuery.eq('is_favorite', true);
      }
    }

    // If we have a text search query, use the search_notes function instead
    let searchResults;
    if (query && query.trim().length > 0) {
      // Determine the archive filter parameter
      let filterArchived: boolean | null = null;
      if (showTrash) {
        filterArchived = null; // Don't filter by archived status in trash
      } else if (showArchived) {
        filterArchived = true; // Only archived notes
      } else {
        filterArchived = false; // Only non-archived notes
      }

      console.log('[Search] Calling RPC with:', {
        search_query: query.trim(),
        filter_archived: filterArchived,
        showArchived,
      });

      const { data: results, error } = await supabase.rpc('search_notes', {
        search_query: query.trim(),
        user_uuid: user.id,
        filter_archived: filterArchived,
      });

      console.log('[Search] RPC results:', {
        count: results?.length,
        error: error?.message,
      });

      if (error) {
        console.error('Error searching notes:', error);
        return NextResponse.json(
          { error: 'Failed to search notes' },
          { status: 500 }
        );
      }

      // The search_notes function now filters by archived status at the database level
      // We only need to filter by favorites if needed
      searchResults = results;

      if (searchResults && searchResults.length > 0 && showFavorites && !showTrash) {
        searchResults = searchResults.filter((note: { is_favorite: boolean }) => note.is_favorite === true);
      }
    } else {
      // No text search, just get all notes matching the view filter
      const { data: allNotes, error } = await initialQuery;
      if (error) {
        console.error('Error fetching notes:', error);
        return NextResponse.json(
          { error: 'Failed to fetch notes' },
          { status: 500 }
        );
      }
      searchResults = allNotes;
    }

    // If no results or no tag filter, we can skip the tag filtering step
    if (!searchResults || searchResults.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // If tag IDs are provided, filter notes that have all the specified tags
    if (tagIds.length > 0) {
      // Get all note_tags entries for the search results and specified tags
      const noteIds = searchResults.map((note: { id: string }) => note.id);

      const { data: noteTags, error: noteTagsError } = await supabase
        .from('note_tags')
        .select('note_id, tag_id')
        .in('note_id', noteIds)
        .in('tag_id', tagIds);

      if (noteTagsError) {
        console.error('Error fetching note tags:', noteTagsError);
        return NextResponse.json(
          { error: 'Failed to filter notes by tags' },
          { status: 500 }
        );
      }

      // Count how many of the requested tags each note has
      const noteTagCounts: Record<string, number> = {};
      noteTags?.forEach((nt: { note_id: string }) => {
        noteTagCounts[nt.note_id] = (noteTagCounts[nt.note_id] || 0) + 1;
      });

      // Only keep notes that have all the requested tags
      searchResults = searchResults.filter(
        (note: { id: string }) => noteTagCounts[note.id] === tagIds.length
      );
    }

    // If no results after filtering, return empty array
    if (searchResults.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch tags for the filtered notes
    const noteIds = searchResults.map((note: { id: string }) => note.id);

    const { data: noteTags } = await supabase
      .from('note_tags')
      .select(
        `
        note_id,
        tag:tags(*)
      `
      )
      .in('note_id', noteIds);

    // Group tags by note_id
    const tagsByNoteId: Record<string, unknown[]> = {};
    noteTags?.forEach((nt: { note_id: string; tag: unknown }) => {
      if (!tagsByNoteId[nt.note_id]) {
        tagsByNoteId[nt.note_id] = [];
      }
      tagsByNoteId[nt.note_id].push(nt.tag);
    });

    // Combine results with tags
    const notesWithTags = searchResults.map((note: { id: string }) => ({
      ...note,
      tags: tagsByNoteId[note.id] || [],
    }));

    return NextResponse.json({ data: notesWithTags });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

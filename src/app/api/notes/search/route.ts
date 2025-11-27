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

    // Initial query to get all non-deleted notes (including archived)
    // Note: Archived notes still appear in tag searches as per requirements
    const initialQuery = supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // If we have a text search query, use the search_notes function instead
    let searchResults;
    if (query && query.trim().length > 0) {
      const { data: results, error } = await supabase.rpc('search_notes', {
        search_query: query.trim(),
        user_uuid: user.id,
      });

      if (error) {
        console.error('Error searching notes:', error);
        return NextResponse.json(
          { error: 'Failed to search notes' },
          { status: 500 }
        );
      }
      searchResults = results;
    } else {
      // No text search, just get all non-deleted notes
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

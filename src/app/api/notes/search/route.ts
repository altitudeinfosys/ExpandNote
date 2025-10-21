import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/notes/search - Search notes using full-text search
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

    // Get search query parameter
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Use the search_notes function from the database
    const { data: searchResults, error } = await supabase.rpc('search_notes', {
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

    // Fetch tags for the found notes
    const noteIds = searchResults.map((note: { id: string }) => note.id);

    if (noteIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

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

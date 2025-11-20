import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVersions, createVersion } from '@/lib/versioning/version-manager';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify note exists and belongs to user
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Get versions
    const versions = await getVersions(id);

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Failed to get versions:', error);
    return NextResponse.json(
      { error: 'Failed to get versions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get note with tags
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('*, note_tags(tag:tags(*))')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { trigger = 'manual', aiProfileId } = body;

    // Extract tags from the nested structure
    const tags = note.note_tags?.map((nt: { tag: { id: string; name: string } }) => nt.tag) || [];

    // Create version
    const version = await createVersion({
      noteId: note.id,
      userId: user.id,
      title: note.title,
      content: note.content,
      tags: tags,
      trigger,
      aiProfileId,
    });

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    console.error('Failed to create version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}

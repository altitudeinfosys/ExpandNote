import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVersion, createVersion } from '@/lib/versioning/version-manager';

type RouteParams = {
  params: Promise<{
    id: string;
    versionId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, versionId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get version to restore
    const version = await getVersion(versionId);
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Verify ownership
    if (version.note_id !== id || version.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get current note state
    const { data: currentNote } = await supabase
      .from('notes')
      .select('*, tags(*)')
      .eq('id', id)
      .single();

    // Create a version of current state before restoring (backup)
    if (currentNote) {
      await createVersion({
        noteId: currentNote.id,
        userId: user.id,
        title: currentNote.title,
        content: currentNote.content,
        tags: currentNote.tags || [],
        trigger: 'manual',
      });
    }

    // Restore the version by updating the note
    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update({
        title: version.title,
        content: version.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to restore version: ${updateError.message}`);
    }

    // Update tags if they changed
    if (version.tags && version.tags.length > 0) {
      // Delete existing note_tags
      await supabase
        .from('note_tags')
        .delete()
        .eq('note_id', id);

      // Insert new tags
      const tagInserts = version.tags.map((tag: { id: string; name: string }) => ({
        note_id: id,
        tag_id: tag.id,
      }));

      await supabase.from('note_tags').insert(tagInserts);
    }

    return NextResponse.json({
      success: true,
      note: updatedNote,
      restoredFrom: version.version_number,
    });
  } catch (error) {
    console.error('Failed to restore version:', error);
    return NextResponse.json(
      { error: 'Failed to restore version' },
      { status: 500 }
    );
  }
}

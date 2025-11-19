import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVersion } from '@/lib/versioning/version-manager';

type RouteParams = {
  params: Promise<{
    id: string;
    versionId: string;
  }>;
};

export async function GET(
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

    // Get version
    const version = await getVersion(versionId);

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Verify version belongs to user's note
    if (version.note_id !== id || version.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error('Failed to get version:', error);
    return NextResponse.json(
      { error: 'Failed to get version' },
      { status: 500 }
    );
  }
}

# Note Versioning System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automatic note versioning to track changes, enable recovery from errors, and preserve history of AI-generated content modifications.

**Architecture:** Event-driven snapshot system that creates full-content versions before/after AI executions, on manual saves, and periodically during auto-saves. Versions stored in Supabase with automatic retention management (keep last 10 versions per note). Simple UI for viewing, previewing, and restoring versions.

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL), React, Tailwind CSS

---

## Phase 1: Database Schema & Migration

### Task 1.1: Create note_versions table migration

**Files:**
- Create: `supabase/migrations/20251118000001_create_note_versions.sql`

**Step 1: Create the migration file**

Create file with this exact content:

```sql
-- Create note_versions table for tracking note history
CREATE TABLE IF NOT EXISTS note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Version content (full snapshot)
  title TEXT,
  content TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  snapshot_trigger TEXT NOT NULL CHECK (snapshot_trigger IN ('auto_save', 'manual', 'before_ai', 'after_ai')),
  ai_profile_id UUID REFERENCES ai_profiles(id) ON DELETE SET NULL,

  -- Size tracking for retention
  content_size INTEGER GENERATED ALWAYS AS (length(content)) STORED,

  -- Constraints
  UNIQUE(note_id, version_number)
);

-- Create indexes for performance
CREATE INDEX idx_note_versions_note_id ON note_versions(note_id);
CREATE INDEX idx_note_versions_created_at ON note_versions(created_at DESC);
CREATE INDEX idx_note_versions_user_id ON note_versions(user_id);

-- Function to auto-increment version_number per note
CREATE OR REPLACE FUNCTION set_version_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO NEW.version_number
  FROM note_versions
  WHERE note_id = NEW.note_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set version_number before insert
CREATE TRIGGER set_note_version_number
  BEFORE INSERT ON note_versions
  FOR EACH ROW
  WHEN (NEW.version_number IS NULL)
  EXECUTE FUNCTION set_version_number();

-- Enable RLS
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own note versions
CREATE POLICY "Users can view their own note versions"
  ON note_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create versions for their own notes"
  ON note_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own note versions"
  ON note_versions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to clean up old versions (keep last 10 per note)
CREATE OR REPLACE FUNCTION cleanup_old_versions()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM note_versions
  WHERE note_id = NEW.note_id
    AND version_number <= (
      SELECT version_number
      FROM note_versions
      WHERE note_id = NEW.note_id
      ORDER BY version_number DESC
      OFFSET 10
      LIMIT 1
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup after insert
CREATE TRIGGER cleanup_note_versions
  AFTER INSERT ON note_versions
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_versions();
```

**Step 2: Apply the migration**

Run:
```bash
npx supabase db push
```

Expected: Migration applied successfully

**Step 3: Verify migration**

Check that table exists and has correct structure.

**Step 4: Commit**

```bash
git add supabase/migrations/20251118000001_create_note_versions.sql
git commit -m "feat(db): add note_versions table for version history"
```

---

## Phase 2: Core Version Manager Logic

### Task 2.1: Create version manager types

**Files:**
- Create: `src/types/version.ts`

**Step 1: Create types file**

```typescript
export interface NoteVersion {
  id: string;
  note_id: string;
  user_id: string;
  title: string | null;
  content: string;
  tags: Array<{ id: string; name: string }>;
  version_number: number;
  created_at: string;
  snapshot_trigger: 'auto_save' | 'manual' | 'before_ai' | 'after_ai';
  ai_profile_id: string | null;
  content_size: number;
}

export interface CreateVersionParams {
  noteId: string;
  userId: string;
  title: string | null;
  content: string;
  tags: Array<{ id: string; name: string }>;
  trigger: 'auto_save' | 'manual' | 'before_ai' | 'after_ai';
  aiProfileId?: string;
}

export interface VersionListItem {
  id: string;
  version_number: number;
  created_at: string;
  snapshot_trigger: string;
  content_size: number;
  ai_profile_id: string | null;
}
```

**Step 2: Export from main types**

Modify: `src/types/index.ts`

Add export:
```typescript
export * from './version';
```

**Step 3: Commit**

```bash
git add src/types/version.ts src/types/index.ts
git commit -m "feat(types): add note version types"
```

---

### Task 2.2: Create version manager with createVersion

**Files:**
- Create: `src/lib/versioning/version-manager.ts`
- Create: `src/lib/versioning/__tests__/version-manager.test.ts`

**Step 1: Write the failing test**

Create test file:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createVersion, shouldCreateVersion } from '../version-manager';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'version-1',
              note_id: 'note-1',
              user_id: 'user-1',
              title: 'Test Note',
              content: 'Test content',
              tags: [],
              version_number: 1,
              created_at: new Date().toISOString(),
              snapshot_trigger: 'manual',
              ai_profile_id: null,
              content_size: 12
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('version-manager', () => {
  describe('createVersion', () => {
    it('should create a new version', async () => {
      const params = {
        noteId: 'note-1',
        userId: 'user-1',
        title: 'Test Note',
        content: 'Test content',
        tags: [],
        trigger: 'manual' as const
      };

      const result = await createVersion(params);

      expect(result).toBeDefined();
      expect(result.note_id).toBe('note-1');
      expect(result.snapshot_trigger).toBe('manual');
    });
  });

  describe('shouldCreateVersion', () => {
    it('should return true for manual trigger', () => {
      const result = shouldCreateVersion(
        'current content',
        'previous content',
        'manual',
        1
      );
      expect(result).toBe(true);
    });

    it('should return false if content is identical', () => {
      const content = 'same content';
      const result = shouldCreateVersion(
        content,
        content,
        'auto_save',
        1
      );
      expect(result).toBe(false);
    });

    it('should return true for before_ai trigger', () => {
      const result = shouldCreateVersion(
        'current',
        'previous',
        'before_ai',
        1
      );
      expect(result).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test src/lib/versioning/__tests__/version-manager.test.ts
```

Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `src/lib/versioning/version-manager.ts`:

```typescript
import { createClient } from '@/lib/supabase/client';
import { CreateVersionParams, NoteVersion } from '@/types/version';

/**
 * Creates a new version snapshot of a note
 */
export async function createVersion(
  params: CreateVersionParams
): Promise<NoteVersion> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('note_versions')
    .insert({
      note_id: params.noteId,
      user_id: params.userId,
      title: params.title,
      content: params.content,
      tags: params.tags,
      snapshot_trigger: params.trigger,
      ai_profile_id: params.aiProfileId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create version:', error);
    throw new Error(`Failed to create version: ${error.message}`);
  }

  return data;
}

/**
 * Determines if a new version should be created based on trigger type and content changes
 */
export function shouldCreateVersion(
  currentContent: string,
  previousContent: string | null,
  trigger: 'auto_save' | 'manual' | 'before_ai' | 'after_ai',
  saveCount: number
): boolean {
  // Always create for manual triggers
  if (trigger === 'manual') return true;

  // Always create for AI triggers
  if (trigger === 'before_ai' || trigger === 'after_ai') return true;

  // Don't create if content is identical
  if (currentContent === previousContent) return false;

  // For auto_save, create every 5th save
  if (trigger === 'auto_save' && saveCount % 5 === 0) return true;

  // Check if content changed significantly (>100 chars difference)
  const contentDiff = Math.abs(
    currentContent.length - (previousContent?.length || 0)
  );
  if (contentDiff > 100) return true;

  return false;
}

/**
 * Gets the last saved content for comparison
 */
export async function getLastVersionContent(noteId: string): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('note_versions')
    .select('content')
    .eq('note_id', noteId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to get last version:', error);
    return null;
  }

  return data?.content || null;
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test src/lib/versioning/__tests__/version-manager.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/versioning/
git commit -m "feat(versioning): add core version manager with createVersion"
```

---

### Task 2.3: Add getVersions function

**Files:**
- Modify: `src/lib/versioning/version-manager.ts`
- Modify: `src/lib/versioning/__tests__/version-manager.test.ts`

**Step 1: Write the failing test**

Add to test file:

```typescript
describe('getVersions', () => {
  it('should get all versions for a note', async () => {
    const versions = await getVersions('note-1');

    expect(Array.isArray(versions)).toBe(true);
  });

  it('should return versions in descending order', async () => {
    const versions = await getVersions('note-1');

    if (versions.length > 1) {
      expect(versions[0].version_number).toBeGreaterThan(
        versions[1].version_number
      );
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test src/lib/versioning/__tests__/version-manager.test.ts
```

Expected: FAIL - getVersions not defined

**Step 3: Write implementation**

Add to `version-manager.ts`:

```typescript
import { VersionListItem } from '@/types/version';

/**
 * Gets all versions for a note (ordered newest first)
 */
export async function getVersions(noteId: string): Promise<VersionListItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('note_versions')
    .select('id, version_number, created_at, snapshot_trigger, content_size, ai_profile_id')
    .eq('note_id', noteId)
    .order('version_number', { ascending: false });

  if (error) {
    console.error('Failed to get versions:', error);
    throw new Error(`Failed to get versions: ${error.message}`);
  }

  return data || [];
}

/**
 * Gets a specific version by ID
 */
export async function getVersion(versionId: string): Promise<NoteVersion | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('note_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (error) {
    console.error('Failed to get version:', error);
    return null;
  }

  return data;
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test src/lib/versioning/__tests__/version-manager.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/versioning/
git commit -m "feat(versioning): add getVersions and getVersion functions"
```

---

## Phase 3: API Endpoints

### Task 3.1: Create GET /api/notes/[id]/versions endpoint

**Files:**
- Create: `src/app/api/notes/[id]/versions/route.ts`

**Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVersions } from '@/lib/versioning/version-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify note exists and belongs to user
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Get versions
    const versions = await getVersions(params.id);

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Failed to get versions:', error);
    return NextResponse.json(
      { error: 'Failed to get versions' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test the endpoint manually**

After implementation, test with:
```bash
curl http://localhost:3003/api/notes/[test-note-id]/versions
```

Expected: Returns array of versions

**Step 3: Commit**

```bash
git add src/app/api/notes/[id]/versions/route.ts
git commit -m "feat(api): add GET endpoint for note versions"
```

---

### Task 3.2: Create POST /api/notes/[id]/versions endpoint

**Files:**
- Modify: `src/app/api/notes/[id]/versions/route.ts`

**Step 1: Add POST handler**

Add to same file:

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get note with tags
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('*, tags(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { trigger = 'manual', aiProfileId } = body;

    // Create version
    const version = await createVersion({
      noteId: note.id,
      userId: user.id,
      title: note.title,
      content: note.content,
      tags: note.tags || [],
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
```

**Step 2: Test the endpoint**

```bash
curl -X POST http://localhost:3003/api/notes/[test-note-id]/versions \
  -H "Content-Type: application/json" \
  -d '{"trigger": "manual"}'
```

Expected: Returns created version with 201 status

**Step 3: Commit**

```bash
git add src/app/api/notes/[id]/versions/route.ts
git commit -m "feat(api): add POST endpoint to create manual versions"
```

---

### Task 3.3: Create GET /api/notes/[id]/versions/[versionId] endpoint

**Files:**
- Create: `src/app/api/notes/[id]/versions/[versionId]/route.ts`

**Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVersion } from '@/lib/versioning/version-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const supabase = createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get version
    const version = await getVersion(params.versionId);

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Verify version belongs to user's note
    if (version.note_id !== params.id || version.user_id !== user.id) {
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
```

**Step 2: Test the endpoint**

```bash
curl http://localhost:3003/api/notes/[note-id]/versions/[version-id]
```

Expected: Returns specific version details

**Step 3: Commit**

```bash
git add src/app/api/notes/[id]/versions/[versionId]/route.ts
git commit -m "feat(api): add GET endpoint for specific version"
```

---

### Task 3.4: Create restore endpoint

**Files:**
- Create: `src/app/api/notes/[id]/versions/[versionId]/restore/route.ts`

**Step 1: Create restore endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVersion, createVersion } from '@/lib/versioning/version-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const supabase = createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get version to restore
    const version = await getVersion(params.versionId);
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Verify ownership
    if (version.note_id !== params.id || version.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get current note state
    const { data: currentNote } = await supabase
      .from('notes')
      .select('*, tags(*)')
      .eq('id', params.id)
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
      .eq('id', params.id)
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
        .eq('note_id', params.id);

      // Insert new tags
      const tagInserts = version.tags.map((tag: any) => ({
        note_id: params.id,
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
```

**Step 2: Test restore**

```bash
curl -X POST http://localhost:3003/api/notes/[note-id]/versions/[version-id]/restore
```

Expected: Note content restored, returns success

**Step 3: Commit**

```bash
git add src/app/api/notes/[id]/versions/[versionId]/restore/route.ts
git commit -m "feat(api): add endpoint to restore note versions"
```

---

## Phase 4: UI Components

### Task 4.1: Create VersionHistory component

**Files:**
- Create: `src/components/VersionHistory/VersionHistory.tsx`
- Create: `src/components/VersionHistory/index.ts`

**Step 1: Create the component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { VersionListItem } from '@/types/version';
import { formatDateTime } from '@/lib/utils/date';

interface VersionHistoryProps {
  noteId: string;
  onViewVersion: (versionId: string) => void;
  onRestoreVersion: (versionId: string) => void;
}

export function VersionHistory({ noteId, onViewVersion, onRestoreVersion }: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [noteId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notes/${noteId}/versions`);

      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }

      const data = await response.json();
      setVersions(data);
    } catch (err) {
      console.error('Failed to fetch versions:', err);
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'manual':
        return '✏️ Manual save';
      case 'auto_save':
        return '💾 Auto-save';
      case 'before_ai':
        return '🤖 Before AI';
      case 'after_ai':
        return '✨ After AI';
      default:
        return trigger;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} chars`;
    return `${(bytes / 1024).toFixed(1)}KB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--foreground-secondary)]">
        <p>No version history yet</p>
        <p className="text-sm mt-2">Versions are created automatically when you edit this note</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h3 className="font-semibold text-[var(--foreground)]">Version History</h3>
        <p className="text-xs text-[var(--foreground-secondary)] mt-1">
          {versions.length} {versions.length === 1 ? 'version' : 'versions'}
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {versions.map((version) => (
          <div
            key={version.id}
            className="px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--background)] transition-colors cursor-pointer"
            onClick={() => onViewVersion(version.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--foreground)]">
                    v{version.version_number}
                  </span>
                  <span className="text-xs text-[var(--foreground-secondary)]">
                    {getTriggerLabel(version.snapshot_trigger)}
                  </span>
                </div>
                <div className="text-xs text-[var(--foreground-secondary)] mt-1">
                  {formatDateTime(new Date(version.created_at))}
                </div>
                <div className="text-xs text-[var(--foreground-secondary)] mt-1">
                  {formatSize(version.content_size)}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestoreVersion(version.id);
                }}
                className="px-3 py-1 text-xs text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded transition-colors"
              >
                Restore
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create index file**

Create `src/components/VersionHistory/index.ts`:

```typescript
export { VersionHistory } from './VersionHistory';
```

**Step 3: Test the component visually**

Add to a test page and verify it renders

**Step 4: Commit**

```bash
git add src/components/VersionHistory/
git commit -m "feat(ui): add VersionHistory component"
```

---

### Task 4.2: Create VersionPreview modal

**Files:**
- Create: `src/components/VersionHistory/VersionPreview.tsx`
- Modify: `src/components/VersionHistory/index.ts`

**Step 1: Create the component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { NoteVersion } from '@/types/version';
import { formatDateTime } from '@/lib/utils/date';

interface VersionPreviewProps {
  versionId: string;
  noteId: string;
  onClose: () => void;
  onRestore: () => void;
}

export function VersionPreview({ versionId, noteId, onClose, onRestore }: VersionPreviewProps) {
  const [version, setVersion] = useState<NoteVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersion();
  }, [versionId]);

  const fetchVersion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notes/${noteId}/versions/${versionId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch version');
      }

      const data = await response.json();
      setVersion(data);
    } catch (err) {
      console.error('Failed to fetch version:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !version) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[var(--background-surface)] rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-surface)] rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Version {version.version_number}
            </h2>
            <p className="text-sm text-[var(--foreground-secondary)]">
              {formatDateTime(new Date(version.created_at))}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {version.title && (
            <h1 className="text-2xl font-bold mb-4 text-[var(--foreground)]">
              {version.title}
            </h1>
          )}

          <div className="prose dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-mono text-sm bg-[var(--background)] p-4 rounded-lg">
              {version.content}
            </pre>
          </div>

          {version.tags && version.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {version.tags.map((tag: any) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-sm"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={onRestore}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Restore This Version
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Export from index**

Modify `src/components/VersionHistory/index.ts`:

```typescript
export { VersionHistory } from './VersionHistory';
export { VersionPreview } from './VersionPreview';
```

**Step 3: Test visually**

**Step 4: Commit**

```bash
git add src/components/VersionHistory/
git commit -m "feat(ui): add VersionPreview modal component"
```

---

### Task 4.3: Integrate into NoteEditor

**Files:**
- Modify: `src/components/NoteEditor.tsx`

**Step 1: Add version history UI to NoteEditor**

Add imports at top:

```typescript
import { VersionHistory, VersionPreview } from './VersionHistory';
import toast from 'react-hot-toast';
```

Add state:

```typescript
const [showVersionHistory, setShowVersionHistory] = useState(false);
const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
```

Add handler functions:

```typescript
const handleViewVersion = useCallback((versionId: string) => {
  setSelectedVersionId(versionId);
}, []);

const handleRestoreVersion = useCallback(async (versionId: string) => {
  if (!note) return;

  const confirmed = confirm('Are you sure you want to restore this version? Your current changes will be saved as a new version.');
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/notes/${note.id}/versions/${versionId}/restore`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to restore version');
    }

    toast.success('Version restored successfully');
    setSelectedVersionId(null);
    setShowVersionHistory(false);

    // Reload the page to show restored content
    window.location.reload();
  } catch (error) {
    console.error('Failed to restore version:', error);
    toast.error('Failed to restore version');
  }
}, [note]);

const handleCreateManualVersion = useCallback(async () => {
  if (!note) return;

  try {
    const response = await fetch(`/api/notes/${note.id}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'manual' }),
    });

    if (!response.ok) {
      throw new Error('Failed to create version');
    }

    toast.success('Version saved');
  } catch (error) {
    console.error('Failed to create version:', error);
    toast.error('Failed to save version');
  }
}, [note]);
```

Add button in header (after delete button):

```typescript
{note && (
  <button
    onClick={() => setShowVersionHistory(!showVersionHistory)}
    className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
    aria-label="Version history"
    title="Version history"
  >
    <span className="material-symbols-outlined text-lg">history</span>
  </button>
)}
```

Add version history panel before closing div:

```typescript
{/* Version History Panel */}
{note && showVersionHistory && (
  <div className="fixed right-0 top-0 bottom-0 w-80 bg-[var(--background-surface)] border-l border-[var(--border)] shadow-lg z-40">
    <VersionHistory
      noteId={note.id}
      onViewVersion={handleViewVersion}
      onRestoreVersion={handleRestoreVersion}
    />
  </div>
)}

{/* Version Preview Modal */}
{selectedVersionId && note && (
  <VersionPreview
    versionId={selectedVersionId}
    noteId={note.id}
    onClose={() => setSelectedVersionId(null)}
    onRestore={() => handleRestoreVersion(selectedVersionId)}
  />
)}
```

**Step 2: Test integration**

1. Open a note
2. Click history icon
3. Verify version panel appears
4. Click on a version
5. Verify preview modal appears
6. Test restore

**Step 3: Commit**

```bash
git add src/components/NoteEditor.tsx
git commit -m "feat(ui): integrate version history into NoteEditor"
```

---

## Phase 5: Auto-Versioning Integration

### Task 5.1: Hook into AI Profile execution

**Files:**
- Modify: `src/components/NoteEditor.tsx` (handleExecuteProfile function)

**Step 1: Create version before AI execution**

Modify the `handleExecuteProfile` function to create a version before execution:

```typescript
const handleExecuteProfile = useCallback(async (profileId: string) => {
  if (!note || executingProfileId) return;

  setExecutingProfileId(profileId);
  const profile = aiProfiles.find(p => p.id === profileId);
  const profileName = profile?.name || 'AI Profile';

  try {
    // Create version BEFORE AI execution
    await fetch(`/api/notes/${note.id}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger: 'before_ai',
        aiProfileId: profileId
      }),
    });

    const response = await fetch(`/api/ai-profiles/${profileId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        noteId: note.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to execute AI profile');
    }

    const result = await response.json();

    // Create version AFTER AI execution
    await fetch(`/api/notes/${note.id}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger: 'after_ai',
        aiProfileId: profileId
      }),
    });

    toast.success(`${profileName} executed successfully`);

    if (result.outputBehavior === 'new_note') {
      toast.success('New note created!', { duration: 4000 });
    } else if (result.outputBehavior === 'append' || result.outputBehavior === 'replace') {
      toast.success('Note updated!', { duration: 3000 });
      window.location.reload();
    }
  } catch (error) {
    console.error('Failed to execute AI profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    toast.error(`Failed to execute ${profileName}: ${errorMessage}`);
  } finally {
    setExecutingProfileId(null);
  }
}, [note, aiProfiles, executingProfileId]);
```

**Step 2: Test AI execution creates versions**

1. Execute an AI profile
2. Check version history
3. Verify "Before AI" and "After AI" versions exist

**Step 3: Commit**

```bash
git add src/components/NoteEditor.tsx
git commit -m "feat(versioning): create versions before/after AI execution"
```

---

### Task 5.2: Add auto-versioning on significant changes

**Files:**
- Modify: `src/components/NoteEditor.tsx`

**Step 1: Add save counter and version logic**

Add state:

```typescript
const [saveCount, setSaveCount] = useState(0);
```

Modify handleSave function:

```typescript
const handleSave = useCallback(async () => {
  if (!content.trim() && !title.trim()) {
    return;
  }

  setIsSaving(true);
  try {
    await onSave({
      title: title.trim() || null,
      content: content.trim(),
      is_favorite: isFavorite,
    });

    setLastSaved(new Date());
    setHasUnsavedChanges(false);

    // Increment save counter
    const newSaveCount = saveCount + 1;
    setSaveCount(newSaveCount);

    // Create version every 5th save
    if (note && newSaveCount % 5 === 0) {
      await fetch(`/api/notes/${note.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trigger: 'auto_save' }),
      });
    }
  } catch (error) {
    console.error('Failed to save note:', error);
  } finally {
    setIsSaving(false);
  }
}, [title, content, isFavorite, onSave, note, saveCount]);
```

**Step 2: Test auto-versioning**

1. Make changes to a note
2. Wait for auto-save (2 seconds)
3. Repeat 5 times
4. Check version history
5. Verify auto-save version was created

**Step 3: Commit**

```bash
git add src/components/NoteEditor.tsx
git commit -m "feat(versioning): auto-create versions every 5th save"
```

---

## Testing & Verification

### Task 6.1: End-to-end testing

**Manual Test Checklist:**

1. **Create manual version:**
   - [ ] Open note
   - [ ] Click version history icon
   - [ ] Verify versions panel opens
   - [ ] Make changes
   - [ ] Save manually
   - [ ] Verify version appears in list

2. **Auto-save versioning:**
   - [ ] Make small changes 4 times (wait for auto-save each time)
   - [ ] Verify no new versions created
   - [ ] Make 5th change
   - [ ] Verify auto-save version created

3. **AI execution versioning:**
   - [ ] Execute AI profile on a note
   - [ ] Verify "Before AI" version created
   - [ ] Verify "After AI" version created
   - [ ] Verify content differences

4. **View version:**
   - [ ] Click on a version in list
   - [ ] Verify preview modal opens
   - [ ] Verify content displays correctly
   - [ ] Verify metadata is accurate

5. **Restore version:**
   - [ ] Click "Restore" on a version
   - [ ] Confirm restoration
   - [ ] Verify note content updated
   - [ ] Verify new version created (backup of current state)

6. **Version retention:**
   - [ ] Create more than 10 versions
   - [ ] Verify only last 10 are kept
   - [ ] Verify oldest versions deleted automatically

7. **Permissions:**
   - [ ] Verify users can only see their own versions
   - [ ] Test with different user accounts

---

## Deployment Checklist

- [ ] Run database migration on production
- [ ] Verify RLS policies work correctly
- [ ] Test on mobile devices
- [ ] Verify version history panel responsive
- [ ] Check version preview modal on mobile
- [ ] Monitor database size growth
- [ ] Set up alerts for storage usage

---

## Future Enhancements (Not in this plan)

- Diff view showing changes between versions
- Pin important versions
- Search within version history
- Export version as separate note
- Version annotations/comments
- Collaborative conflict resolution

---

## Success Criteria

This implementation is complete when:

- [x] Database schema created and migrated
- [x] Version manager with create/get functions working
- [x] API endpoints functional (list, get, create, restore)
- [x] UI components render correctly
- [x] Version history integrated into NoteEditor
- [x] Auto-versioning works on AI execution
- [x] Auto-versioning works every 5th save
- [x] Manual version creation works
- [x] Version restore works correctly
- [x] Retention policy keeps last 10 versions
- [x] All manual tests pass
- [x] No build errors
- [x] Code committed with descriptive messages

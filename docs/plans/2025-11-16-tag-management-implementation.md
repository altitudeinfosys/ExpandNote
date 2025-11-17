# Tag Management Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Tag Management page under Settings where users can view, create, edit, and delete tags with proper dependency warnings.

**Architecture:** Create new page at `/settings/tags` accessible from App Settings section. Reuse existing `/api/tags` endpoints. Use modal dialogs for create/edit/delete operations following existing settings page patterns.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Material Symbols icons

---

## Task 1: Add Navigation to Tag Management Page

**Files:**
- Modify: `src/app/settings/page.tsx:575` (after Theme selector in App Settings section)

**Step 1: Add "Manage Tags" button in App Settings section**

Location: After the Theme selector div (around line 575), add:

```tsx
<div>
  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
    Manage Tags
  </label>
  <p className="text-sm text-[var(--foreground-secondary)] mb-3">
    View and organize all your tags
  </p>
  <button
    onClick={() => router.push('/settings/tags')}
    className="px-4 py-3 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--background)] transition-colors flex items-center gap-2 font-medium"
  >
    <span className="material-symbols-outlined">label</span>
    <span>Manage Tags</span>
  </button>
</div>
```

**Step 2: Verify changes**

Run: `npm run dev`
Navigate to: http://localhost:3003/settings?section=app-settings
Expected: See "Manage Tags" button below Theme selector

**Step 3: Test navigation**

Action: Click "Manage Tags" button
Expected: Navigate to /settings/tags (will show 404 for now, that's expected)

**Step 4: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(settings): add navigation to tag management page"
```

---

## Task 2: Create Tag Management Page Structure

**Files:**
- Create: `src/app/settings/tags/page.tsx`

**Step 1: Create directory and file**

```bash
mkdir -p src/app/settings/tags
touch src/app/settings/tags/page.tsx
```

**Step 2: Write page component with header only**

Add to `src/app/settings/tags/page.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

export default function TagManagementPage() {
  const router = useRouter();
  const { theme: currentTheme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden">
      {/* Header */}
      <header className="bg-[var(--background-surface)] border-b border-[var(--border)]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings?section=app-settings')}
              className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Tag Management</h1>
          </div>

          <button
            onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
            title={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="material-symbols-outlined text-xl">
              {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content - Empty for now */}
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <p className="text-[var(--foreground)]">Tag Management Page - Under Construction</p>
      </div>
    </div>
  );
}
```

**Step 3: Test page renders**

Run: `npm run dev`
Navigate to: http://localhost:3003/settings/tags
Expected: See header with "Tag Management" title, back button, and theme toggle

**Step 4: Test navigation**

Actions:
- Click back button → Should go to /settings?section=app-settings
- Click theme toggle → Should switch theme
- Navigate from settings → Should reach tag management page

**Step 5: Commit**

```bash
git add src/app/settings/tags/page.tsx
git commit -m "feat(tags): create tag management page structure with header"
```

---

## Task 3: Add Tag List State and Data Fetching

**Files:**
- Modify: `src/app/settings/tags/page.tsx`

**Step 1: Add imports and type definitions**

Add at the top of the file (after existing imports):

```tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Tag, AIProfile } from '@/types';

interface TagWithMetadata extends Tag {
  note_count: number;
  ai_profile_count: number;
  ai_profile_names: string[];
}
```

**Step 2: Add state and data fetching**

Inside the component (before the return statement):

```tsx
const { user } = useAuth();
const [tags, setTags] = useState<TagWithMetadata[]>([]);
const [aiProfiles, setAiProfiles] = useState<AIProfile[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (user) {
    fetchData();
  }
}, [user]);

const fetchData = async () => {
  setLoading(true);
  setError(null);

  try {
    // Fetch tags and AI profiles in parallel
    const [tagsRes, profilesRes] = await Promise.all([
      fetch('/api/tags'),
      fetch('/api/ai-profiles')
    ]);

    if (!tagsRes.ok) {
      throw new Error('Failed to fetch tags');
    }

    const tagsData = await tagsRes.json();
    const profilesData = profilesRes.ok ? await profilesRes.json() : [];

    // Fetch note counts for each tag
    const tagsWithMetadata = await Promise.all(
      (tagsData.data || []).map(async (tag: Tag) => {
        const tagDetailRes = await fetch(`/api/tags/${tag.id}`);
        const tagDetail = tagDetailRes.ok ? await tagDetailRes.json() : {};

        // Find AI profiles using this tag
        const linkedProfiles = profilesData.filter((p: AIProfile) => p.tag_id === tag.id);

        return {
          ...tag,
          note_count: tagDetail.data?.note_count || 0,
          ai_profile_count: linkedProfiles.length,
          ai_profile_names: linkedProfiles.map((p: AIProfile) => p.name)
        };
      })
    );

    setTags(tagsWithMetadata);
    setAiProfiles(profilesData);
  } catch (err) {
    console.error('Error fetching data:', err);
    setError('Failed to load tags. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

**Step 3: Add loading and error states**

Replace the main content section with:

```tsx
{/* Main Content */}
<div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
  {loading ? (
    <div className="text-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-[var(--foreground-secondary)]">Loading tags...</p>
    </div>
  ) : error ? (
    <div className="text-center py-12">
      <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
      <button
        onClick={fetchData}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
      >
        Retry
      </button>
    </div>
  ) : (
    <div>
      <p className="text-[var(--foreground)]">
        Loaded {tags.length} tags
      </p>
      {/* Tag list will go here */}
    </div>
  )}
</div>
```

**Step 4: Test data fetching**

Run: `npm run dev`
Navigate to: http://localhost:3003/settings/tags
Expected:
- Shows loading spinner briefly
- Then shows "Loaded X tags" message
- Check browser console for any errors

**Step 5: Commit**

```bash
git add src/app/settings/tags/page.tsx
git commit -m "feat(tags): add tag data fetching with loading and error states"
```

---

## Task 4: Display Tag List

**Files:**
- Modify: `src/app/settings/tags/page.tsx`

**Step 1: Add create button and empty state**

Replace the content div (after the error/loading checks) with:

```tsx
<div className="bg-[var(--background-surface)] rounded-xl border border-[var(--border)] p-4 sm:p-6">
  {/* Header with Create Button */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
    <h2 className="text-xl font-semibold text-[var(--foreground)]">Your Tags</h2>
    <button
      onClick={() => {/* Will implement in next task */}}
      disabled={tags.length >= 100}
      className="px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
    >
      <span className="material-symbols-outlined text-lg sm:text-xl">add</span>
      <span>Create New Tag</span>
    </button>
  </div>

  {/* Tag List or Empty State */}
  {tags.length === 0 ? (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-[var(--background)] rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-[var(--foreground-secondary)] text-3xl">label</span>
      </div>
      <p className="text-[var(--foreground)] font-medium mb-2">No tags yet</p>
      <p className="text-sm text-[var(--foreground-secondary)]">Create your first tag to organize your notes</p>
    </div>
  ) : (
    <div className="space-y-3">
      {tags.map((tag) => (
        <div
          key={tag.id}
          className="border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--background)] transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2 py-1 text-sm rounded-full bg-[var(--ai-purple)]/10 text-[var(--ai-purple)] font-medium">
                  #{tag.name}
                </span>
                {tag.ai_profile_count > 0 && (
                  <span className="text-xs text-[var(--foreground-secondary)] flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span>Linked to {tag.ai_profile_count} AI Profile{tag.ai_profile_count > 1 ? 's' : ''}</span>
                  </span>
                )}
              </div>
              <div className="text-sm text-[var(--foreground-secondary)]">
                Used in {tag.note_count} note{tag.note_count !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {/* Will implement in next task */}}
                className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => {/* Will implement in next task */}}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

**Step 2: Test tag list display**

Run: `npm run dev`
Navigate to: http://localhost:3003/settings/tags
Expected:
- If no tags: See empty state with icon and message
- If tags exist: See list of tags with:
  - Tag name in colored badge
  - Note count
  - AI Profile indicator (if linked)
  - Edit and Delete buttons (disabled for now)
- Create button should be disabled if 100 tags exist

**Step 3: Test responsive layout**

Actions:
- Resize browser to mobile width (< 640px)
- Expected: Buttons stack vertically, layout remains readable

**Step 4: Test theme toggle**

Actions:
- Toggle between light/dark theme
- Expected: All colors update correctly using CSS variables

**Step 5: Commit**

```bash
git add src/app/settings/tags/page.tsx
git commit -m "feat(tags): display tag list with metadata and empty state"
```

---

## Task 5: Create Tag Form Modal Component

**Files:**
- Modify: `src/app/settings/tags/page.tsx`

**Step 1: Add modal state and handlers**

Add state for create/edit modal (after existing state):

```tsx
const [isModalOpen, setIsModalOpen] = useState(false);
const [editingTag, setEditingTag] = useState<Tag | null>(null);
const [tagName, setTagName] = useState('');
const [formError, setFormError] = useState<string | null>(null);
const [saving, setSaving] = useState(false);

const openCreateModal = () => {
  setEditingTag(null);
  setTagName('');
  setFormError(null);
  setIsModalOpen(true);
};

const openEditModal = (tag: Tag) => {
  setEditingTag(tag);
  setTagName(tag.name);
  setFormError(null);
  setIsModalOpen(true);
};

const closeModal = () => {
  setIsModalOpen(false);
  setEditingTag(null);
  setTagName('');
  setFormError(null);
};

const validateTagName = (name: string): string | null => {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'Tag name is required';
  }
  if (trimmed.length > 50) {
    return 'Tag name must be 50 characters or less';
  }
  // Check for duplicates (exclude current tag if editing)
  const duplicate = tags.find(t =>
    t.name.toLowerCase() === trimmed.toLowerCase() &&
    t.id !== editingTag?.id
  );
  if (duplicate) {
    return 'A tag with this name already exists';
  }
  return null;
};

const handleSaveTag = async () => {
  const error = validateTagName(tagName);
  if (error) {
    setFormError(error);
    return;
  }

  setSaving(true);
  setFormError(null);

  try {
    const trimmed = tagName.trim();
    const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags';
    const method = editingTag ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save tag');
    }

    const result = await response.json();

    // Update tags list optimistically
    if (editingTag) {
      setTags(tags.map(t => t.id === editingTag.id ? { ...t, name: trimmed } : t));
    } else {
      // For new tags, we need to fetch to get full metadata
      await fetchData();
    }

    closeModal();
  } catch (err) {
    console.error('Error saving tag:', err);
    setFormError(err instanceof Error ? err.message : 'Failed to save tag');
  } finally {
    setSaving(false);
  }
};
```

**Step 2: Update Create button onClick**

Find the "Create New Tag" button and update onClick:

```tsx
onClick={openCreateModal}
```

**Step 3: Add modal component at the end (before closing div)**

Add before the final closing `</div>`:

```tsx
{/* Tag Form Modal */}
{isModalOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-[var(--background-surface)] rounded-xl max-w-md w-full p-6 border border-[var(--border)]">
      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
        {editingTag ? 'Edit Tag' : 'Create New Tag'}
      </h3>

      {/* Warning for AI Profile link */}
      {editingTag && tags.find(t => t.id === editingTag.id)?.ai_profile_count > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
          <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-sm">warning</span>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            This tag is used by{' '}
            <strong>
              {tags.find(t => t.id === editingTag.id)?.ai_profile_names.join(', ')}
            </strong>
            . Renaming will affect automation.
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Tag Name
        </label>
        <input
          type="text"
          value={tagName}
          onChange={(e) => {
            setTagName(e.target.value);
            setFormError(null);
          }}
          placeholder="e.g., work, personal, ideas"
          maxLength={50}
          className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          autoFocus
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-[var(--foreground-secondary)]">
            {tagName.length}/50 characters
          </p>
        </div>
        {formError && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            {formError}
          </p>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={closeModal}
          disabled={saving}
          className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveTag}
          disabled={saving || tagName.trim().length === 0}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <span>{editingTag ? 'Save Changes' : 'Create Tag'}</span>
          )}
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 4: Test create tag flow**

Run: `npm run dev`
Navigate to: http://localhost:3003/settings/tags

Test create:
1. Click "Create New Tag"
   - Expected: Modal opens with empty input
2. Try to save empty name
   - Expected: Shows "Tag name is required" error
3. Type a name > 50 chars
   - Expected: Shows character counter, truncates at 50
4. Type a valid unique name (e.g., "test-tag")
   - Expected: No error shown
5. Click "Create Tag"
   - Expected: Modal closes, tag appears in list

**Step 5: Test edit tag flow**

Actions:
1. Click "Edit" on an existing tag
   - Expected: Modal opens with current name pre-filled
2. Change name to duplicate another tag
   - Expected: Shows "A tag with this name already exists" error
3. Change to valid unique name
   - Expected: Saves successfully, list updates

**Step 6: Commit**

```bash
git add src/app/settings/tags/page.tsx
git commit -m "feat(tags): add create and edit tag modal with validation"
```

---

## Task 6: Implement Delete Tag with Warnings

**Files:**
- Modify: `src/app/settings/tags/page.tsx`

**Step 1: Add delete state and handler**

Add state (after existing state):

```tsx
const [deletingTag, setDeletingTag] = useState<TagWithMetadata | null>(null);
const [deleteConfirmLevel, setDeleteConfirmLevel] = useState<1 | 2 | 3>(1);
const [deleting, setDeleting] = useState(false);

const openDeleteDialog = (tag: TagWithMetadata) => {
  setDeletingTag(tag);

  // Determine confirmation level
  if (tag.ai_profile_count > 0) {
    setDeleteConfirmLevel(3); // Critical - has AI Profile
  } else if (tag.note_count > 0) {
    setDeleteConfirmLevel(2); // Moderate - has notes
  } else {
    setDeleteConfirmLevel(1); // Basic - no dependencies
  }
};

const closeDeleteDialog = () => {
  setDeletingTag(null);
  setDeleting(false);
};

const handleDeleteTag = async () => {
  if (!deletingTag) return;

  setDeleting(true);

  try {
    const response = await fetch(`/api/tags/${deletingTag.id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete tag');
    }

    // Remove from list optimistically
    setTags(tags.filter(t => t.id !== deletingTag.id));
    closeDeleteDialog();
  } catch (err) {
    console.error('Error deleting tag:', err);
    alert(err instanceof Error ? err.message : 'Failed to delete tag');
  } finally {
    setDeleting(false);
  }
};
```

**Step 2: Update Delete button onClick**

Find the "Delete" button in tag list and update:

```tsx
onClick={() => openDeleteDialog(tag)}
```

**Step 3: Add delete confirmation dialog**

Add before the closing `</div>` (after modal):

```tsx
{/* Delete Confirmation Dialog */}
{deletingTag && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-[var(--background-surface)] rounded-xl max-w-md w-full p-6 border border-[var(--border)]">
      {/* Level 3: Critical Warning */}
      {deleteConfirmLevel === 3 ? (
        <>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-2xl">warning</span>
            <h3 className="text-xl font-semibold text-[var(--foreground)]">
              Warning: AI Profile Dependency
            </h3>
          </div>
          <div className="mb-6 space-y-3">
            <p className="text-[var(--foreground)]">
              This tag is linked to the AI Profile{deletingTag.ai_profile_count > 1 ? 's' : ''}:
            </p>
            <div className="bg-[var(--background)] p-3 rounded-lg">
              <ul className="list-disc list-inside space-y-1">
                {deletingTag.ai_profile_names.map((name, i) => (
                  <li key={i} className="text-[var(--foreground)] font-medium">{name}</li>
                ))}
              </ul>
            </div>
            <p className="text-[var(--foreground-secondary)]">
              Deleting this tag will break {deletingTag.ai_profile_count > 1 ? 'these automations' : 'this automation'}.
            </p>
            <p className="text-[var(--foreground)] font-medium">
              Are you absolutely sure you want to delete <strong>#{deletingTag.name}</strong>?
            </p>
          </div>
        </>
      ) : deleteConfirmLevel === 2 ? (
        /* Level 2: Moderate Warning */
        <>
          <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Delete Tag?
          </h3>
          <div className="mb-6 space-y-3">
            <p className="text-[var(--foreground)]">
              This tag is used in <strong>{deletingTag.note_count} note{deletingTag.note_count > 1 ? 's' : ''}</strong>.
            </p>
            <p className="text-[var(--foreground-secondary)]">
              Deleting it will remove the tag from all notes.
            </p>
            <p className="text-[var(--foreground)]">
              Are you sure you want to delete <strong>#{deletingTag.name}</strong>?
            </p>
          </div>
        </>
      ) : (
        /* Level 1: Basic Confirmation */
        <>
          <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Delete Tag?
          </h3>
          <p className="text-[var(--foreground)] mb-6">
            Are you sure you want to delete <strong>#{deletingTag.name}</strong>?
          </p>
        </>
      )}

      <div className="flex gap-3 justify-end">
        <button
          onClick={closeDeleteDialog}
          disabled={deleting}
          className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDeleteTag}
          disabled={deleting}
          className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ${
            deleteConfirmLevel === 3
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {deleting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Deleting...</span>
            </>
          ) : (
            <span>{deleteConfirmLevel === 3 ? 'Delete Anyway' : 'Delete'}</span>
          )}
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 4: Test delete with Level 1 (no dependencies)**

Create a new tag with no notes:
1. Click "Delete" on the tag
   - Expected: Shows basic "Delete Tag?" dialog
2. Click "Cancel"
   - Expected: Dialog closes, tag remains
3. Click "Delete" again, then "Delete" button
   - Expected: Tag is deleted, removed from list

**Step 5: Test delete with Level 2 (has notes)**

Use a tag that's on existing notes:
1. Click "Delete"
   - Expected: Shows warning about X notes, mentions tag will be removed from all notes
2. Confirm delete
   - Expected: Tag deleted successfully

**Step 6: Test delete with Level 3 (has AI Profile)**

Prerequisites: Create an AI Profile linked to a tag
1. Click "Delete" on that tag
   - Expected: Shows critical warning with profile name(s)
   - Shows "Delete Anyway" button in red
2. Cancel and verify tag remains

**Step 7: Test Edit button hookup**

Click "Edit" on any tag:
- Expected: Opens edit modal with tag name pre-filled

**Step 8: Commit**

```bash
git add src/app/settings/tags/page.tsx
git commit -m "feat(tags): implement delete with multi-level confirmation warnings"
```

---

## Task 7: Add Keyboard Accessibility

**Files:**
- Modify: `src/app/settings/tags/page.tsx`

**Step 1: Add keyboard handlers for modal**

Update the modal div to include escape key handling:

```tsx
{isModalOpen && (
  <div
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onClick={(e) => {
      // Close on backdrop click
      if (e.target === e.currentTarget) {
        closeModal();
      }
    }}
    onKeyDown={(e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    }}
  >
```

**Step 2: Add keyboard handler for delete dialog**

Update the delete dialog div similarly:

```tsx
{deletingTag && (
  <div
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        closeDeleteDialog();
      }
    }}
    onKeyDown={(e) => {
      if (e.key === 'Escape') {
        closeDeleteDialog();
      }
    }}
  >
```

**Step 3: Add Enter key submit for modal form**

Update the input field to handle Enter key:

```tsx
<input
  type="text"
  value={tagName}
  onChange={(e) => {
    setTagName(e.target.value);
    setFormError(null);
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !saving && tagName.trim().length > 0) {
      handleSaveTag();
    }
  }}
  placeholder="e.g., work, personal, ideas"
  maxLength={50}
  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
  autoFocus
/>
```

**Step 4: Test keyboard interactions**

Actions:
1. Open create modal → Press Escape
   - Expected: Modal closes
2. Open create modal → Type tag name → Press Enter
   - Expected: Tag is created
3. Open delete dialog → Press Escape
   - Expected: Dialog closes
4. Click modal backdrop
   - Expected: Modal closes

**Step 5: Test tab navigation**

Actions:
1. Tab through page elements
   - Expected: Focus visible on all interactive elements
2. In modal, tab through input and buttons
   - Expected: Tab order is logical (input → cancel → save)

**Step 6: Commit**

```bash
git add src/app/settings/tags/page.tsx
git commit -m "feat(tags): add keyboard accessibility (Escape, Enter, focus management)"
```

---

## Task 8: Final Testing and Polish

**Files:**
- Modify: `src/app/settings/tags/page.tsx` (if bugs found)

**Step 1: Run build and fix TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds with no errors (warnings OK)

If errors: Fix them and commit

**Step 2: Manual testing checklist**

**Create Tag:**
- [ ] Empty name shows error
- [ ] Name > 50 chars shows error and character counter
- [ ] Duplicate name shows error
- [ ] Valid name creates tag successfully
- [ ] Tag appears in list immediately
- [ ] Modal closes on success
- [ ] Pressing Escape closes modal without saving
- [ ] Pressing Enter submits form

**Edit Tag:**
- [ ] Modal opens with current name
- [ ] Editing to duplicate name shows error
- [ ] Editing tag with AI Profile shows warning
- [ ] Valid edit updates list
- [ ] Cancel discards changes

**Delete Tag:**
- [ ] Tag with no notes shows Level 1 confirmation
- [ ] Tag with notes shows Level 2 with note count
- [ ] Tag with AI Profile shows Level 3 with profile names
- [ ] Cancel preserves tag
- [ ] Delete removes tag from list
- [ ] Pressing Escape closes dialog

**UI/UX:**
- [ ] Loading state shows correctly
- [ ] Error state shows with retry button
- [ ] Empty state shows when no tags
- [ ] Create button disabled at 100 tags
- [ ] Mobile responsive (< 640px)
- [ ] Dark/light theme works correctly
- [ ] Back button navigates to settings
- [ ] Theme toggle works

**Step 3: Fix any bugs found**

If bugs found:
1. Fix the bug
2. Test the fix
3. Commit with message: `fix(tags): [description of fix]`

**Step 4: Test with real data**

Actions:
1. Create 5-10 tags with various names
2. Link some tags to AI Profiles
3. Add tags to notes
4. Try editing, deleting tags with different dependency levels
5. Verify all functionality works as expected

**Step 5: Final commit if any fixes**

```bash
git add .
git commit -m "fix(tags): final polish and bug fixes"
```

---

## Task 9: Verify Build and Create PR

**Files:**
- None (verification only)

**Step 1: Final build verification**

```bash
npm run build
```

Expected: Build succeeds with 0 errors

**Step 2: Check git status**

```bash
git status
git log --oneline -10
```

Expected: See all commits for tag management feature

**Step 3: Push branch**

```bash
git push -u origin feature/tag-management
```

**Step 4: Create pull request**

```bash
gh pr create --title "feat: Add Tag Management page to Settings" --body "$(cat <<'EOF'
## Summary
Adds a comprehensive Tag Management page under Settings where users can view, create, edit, and delete tags.

## Features
- View all tags with note counts and AI Profile indicators
- Create new tags with validation (max 50 chars, unique names, max 100 tags)
- Edit tag names with AI Profile warnings
- Delete tags with multi-level confirmation:
  - Level 1: Basic confirmation for tags with no dependencies
  - Level 2: Warning for tags used in notes
  - Level 3: Critical warning for tags linked to AI Profiles
- Fully responsive (mobile, tablet, desktop)
- Keyboard accessible (Escape, Enter, Tab navigation)
- Dark/light theme support

## Testing
- ✅ Create tag flow tested
- ✅ Edit tag flow tested
- ✅ Delete tag flow tested (all 3 levels)
- ✅ Build passes with no errors
- ✅ Mobile responsive verified
- ✅ Keyboard navigation verified
- ✅ Theme switching verified

## Design
Design document: docs/plans/2025-11-16-tag-management-design.md

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 5: Verify PR created**

Visit the PR URL and verify:
- Title and description correct
- All commits included
- Checks running (Vercel preview, etc.)

**Step 6: Final commit**

```bash
git add .
git commit -m "docs: update implementation plan with completion status"
```

---

## Success Criteria

✅ Tag Management page accessible from Settings → App Settings
✅ Users can view all tags with metadata (note counts, AI Profiles)
✅ Users can create tags with proper validation
✅ Users can edit tag names
✅ Users can delete tags with appropriate warnings
✅ Multi-level delete confirmation based on dependencies
✅ Fully responsive on all screen sizes
✅ Keyboard accessible
✅ Follows existing design system and theme
✅ Build passes with no TypeScript errors
✅ All manual tests pass

---

## Estimated Time

**Total:** 2-3 hours

**Breakdown:**
- Task 1-2: Navigation and page structure (20 min)
- Task 3-4: Data fetching and list display (30 min)
- Task 5: Create/Edit modal (40 min)
- Task 6: Delete with warnings (40 min)
- Task 7: Keyboard accessibility (20 min)
- Task 8-9: Testing and PR (20-40 min)

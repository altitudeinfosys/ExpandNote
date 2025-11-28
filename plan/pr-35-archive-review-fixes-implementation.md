# PR #35 Archive Feature - Review Fixes Implementation Plan

## Overview
This plan addresses the review feedback from Claude and ChatGPT Codex for PR #35 (Archive/Unarchive functionality). The core archive feature is working, but several issues were identified that need fixes before merging.

---

## Review Summary

### What's Working Well ✅
- Database schema and indexing strategy is excellent
- Offline support properly integrated with IndexedDB
- Archive button provides immediate visual feedback
- Optimistic UI updates work correctly
- Code follows existing patterns

### Critical Issues Identified ⚠️

#### 1. **ChatGPT Codex P1 Issue** (Already Fixed ✅)
**Issue**: `isArchived` missing from `handleSave` dependency array in NoteEditor.tsx
**Status**: ✅ FIXED in commit `aeb2baf` - `toggleArchive` now saves immediately

#### 2. **Search Route Missing Archive Filter**
**Severity**: High
**Issue**: Search endpoint doesn't respect current view filters (archived vs all notes)
- Current: Search returns archived notes even when viewing "All Notes"
- Expected: Search should respect the current view context

#### 3. **Offline Hook Missing Archive Filtering**
**Severity**: Medium
**Issue**: `useOfflineNotes.ts` doesn't filter by archive status
- When offline, archived notes appear in "All Notes" view
- Need to add filter parameter similar to online mode

#### 4. **Unarchive UX Issue**
**Severity**: Low
**Issue**: When unarchiving from "Archived" view, editor stays open but note should close
- Archiving from "All Notes" → closes editor ✅
- Unarchiving from "Archived" → should close editor but doesn't ❌

---

## Implementation Tasks

### Task 1: Fix Search Route Archive Filtering
**File**: `src/app/api/notes/search/route.ts`
**Priority**: High

**Current Code** (lines 44-50):
```typescript
const initialQuery = supabase
  .from('notes')
  .select('*')
  .eq('user_id', user.id)
  .is('deleted_at', null); // No archive filtering
```

**Required Changes**:
1. Add query parameters for `archived` and `favorites` filters
2. Apply filters similar to main notes route
3. Ensure mutually exclusive filter logic (trash > archived > favorites > all)

**Implementation**:
```typescript
// Extract filter parameters
const showArchived = searchParams.get('archived') === 'true';
const showFavorites = searchParams.get('favorites') === 'true';
const showTrash = searchParams.get('trash') === 'true';

// Build query with filters
if (showTrash) {
  initialQuery = initialQuery.not('deleted_at', 'is', null);
} else if (showArchived) {
  initialQuery = initialQuery
    .is('deleted_at', null)
    .eq('is_archived', true);
} else {
  // Default: non-deleted, non-archived notes
  initialQuery = initialQuery
    .is('deleted_at', null)
    .eq('is_archived', false);

  if (showFavorites) {
    initialQuery = initialQuery.eq('is_favorite', true);
  }
}
```

**Testing**:
- [ ] Search from "All Notes" view → should NOT return archived notes
- [ ] Search from "Archived" view → should only return archived notes
- [ ] Search from "Favorites" view → should return favorites (non-archived)
- [ ] Verify tag filtering works in all views

---

### Task 2: Add Archive Filtering to Offline Notes Hook
**File**: `src/hooks/useOfflineNotes.ts`
**Priority**: Medium

**Current Issue**:
The `fetchNotes` function doesn't accept filter parameters, so offline mode shows all notes regardless of view.

**Required Changes**:

1. Update `fetchNotes` signature to accept filters:
```typescript
const fetchNotes = useCallback(async (options?: {
  showArchived?: boolean;
  showFavorites?: boolean;
  showTrash?: boolean;
}) => {
  let offlineNotes = await noteOps.getAllNotes(userId);

  // Apply filters
  if (options?.showTrash) {
    offlineNotes = offlineNotes.filter(n => n.deleted_at !== null);
  } else if (options?.showArchived) {
    offlineNotes = offlineNotes.filter(n =>
      n.is_archived === true && n.deleted_at === null
    );
  } else {
    // Default: non-deleted, non-archived notes
    offlineNotes = offlineNotes.filter(n =>
      n.is_archived === false && n.deleted_at === null
    );

    if (options?.showFavorites) {
      offlineNotes = offlineNotes.filter(n => n.is_favorite === true);
    }
  }

  // ... rest of existing logic
  setNotes(offlineNotes);
}, [userId, setNotes]);
```

2. Update all callers of `fetchNotes` in the file to pass appropriate filters

3. Ensure dashboard page passes filters to offline hook when calling

**Testing**:
- [ ] Go offline, view "All Notes" → no archived notes shown
- [ ] Go offline, view "Archived" → only archived notes shown
- [ ] Go offline, view "Favorites" → only favorite non-archived notes shown
- [ ] Create/update/archive notes while offline → changes persist correctly

---

### Task 3: Fix Unarchive Editor Behavior
**File**: `src/app/dashboard/page.tsx`
**Priority**: Low

**Current Code** (line 168):
```typescript
const shouldRemoveFromList =
  archivedChanged && noteData.is_archived && currentView !== DASHBOARD_VIEWS.ARCHIVED;
```

**Issue**: Only closes editor when ARCHIVING from non-archived view, not when UNARCHIVING from archived view.

**Required Changes**:
```typescript
const shouldRemoveFromList =
  archivedChanged && (
    // Archiving from non-archived view
    (noteData.is_archived && currentView !== DASHBOARD_VIEWS.ARCHIVED) ||
    // Unarchiving from archived view
    (!noteData.is_archived && currentView === DASHBOARD_VIEWS.ARCHIVED)
  );
```

**Testing**:
- [ ] Archive note from "All Notes" → editor closes, note disappears ✅ (already works)
- [ ] Unarchive note from "Archived" → editor closes, note disappears
- [ ] Archive note from "Favorites" → editor closes, note disappears
- [ ] Archive note while in "Archived" view → editor stays open (correct behavior)

---

### Task 4: Add JSDoc Comments
**File**: `src/types/index.ts`
**Priority**: Low

**Current**:
```typescript
is_archived: boolean;
```

**Add Comment**:
```typescript
/**
 * Whether the note is archived. Archived notes are hidden from default views
 * but remain searchable by tags and accessible in the dedicated "Archived" view.
 * Archived notes can still be favorited.
 */
is_archived: boolean;
```

---

## Files to Modify

| File | Priority | Changes |
|------|----------|---------|
| `src/app/api/notes/search/route.ts` | High | Add archive/favorites/trash filter parameters |
| `src/hooks/useOfflineNotes.ts` | Medium | Add filter parameter to `fetchNotes` |
| `src/app/dashboard/page.tsx` | Low | Fix unarchive editor close behavior |
| `src/types/index.ts` | Low | Add JSDoc comment |

---

## Testing Checklist

### Online Mode
- [ ] Archive note from "All Notes" → disappears immediately
- [ ] View archived notes in "Archived" view
- [ ] Unarchive note from "Archived" view → appears in "All Notes"
- [ ] Search from "All Notes" → no archived results
- [ ] Search from "Archived" → only archived results
- [ ] Tag filter respects current view
- [ ] Favorite + Archive combinations work

### Offline Mode
- [ ] Archive note while offline → reflects correctly
- [ ] View "All Notes" offline → no archived notes
- [ ] View "Archived" offline → only archived notes
- [ ] Sync changes when back online

### Edge Cases
- [ ] Archive favorited note → stays favorited, moves to archived
- [ ] Search with no results in different views
- [ ] Switch views while editor is open
- [ ] Archive note then immediately unarchive

---

## Risks and Considerations

### Low Risk ✅
- All changes are additive (adding filters)
- Existing functionality not impacted
- Changes follow established patterns in codebase

### Performance Impact
- Minimal: Just adding filter conditions to existing queries
- Indexes already in place to support filtered queries

### Breaking Changes
- None: Backward compatible (filters default to existing behavior)

---

## Estimated Effort

| Task | Complexity | Time Estimate |
|------|------------|---------------|
| Task 1: Search route filtering | Medium | 30-45 min |
| Task 2: Offline hook filtering | Medium | 30-45 min |
| Task 3: Unarchive UX fix | Low | 10-15 min |
| Task 4: JSDoc comments | Low | 5 min |
| Testing | Medium | 30-45 min |
| **Total** | | **~2-2.5 hours** |

---

## Success Criteria

✅ All filter behaviors are consistent between online and offline modes
✅ Search respects current view context
✅ Editor close behavior is predictable and symmetric
✅ All test cases pass
✅ Code follows existing patterns and is well-documented

---

## Notes

- The immediate save fix (commit `aeb2baf`) already resolved the P1 Codex issue
- Most issues are about consistency between online/offline and different views
- No security or performance concerns with these fixes
- Changes are straightforward and follow existing patterns

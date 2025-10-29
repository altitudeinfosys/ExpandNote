# PR #11 Implementation Plan: Trash View Fixes

## Review Summary

Claude's code review identified 2 critical issues and several improvements for the trash view feature:

**Critical Issues:**
1. **Delete operation doesn't preserve trash view context** - After deleting from trash, the view incorrectly switches to show all notes instead of remaining trash items
2. **Search functionality doesn't respect trash view** - Searching in trash view searches all notes instead of just deleted ones

**Additional Improvements:**
- Extract view constants and types for better type safety
- Add accessibility labels
- Consider memoization improvements to prevent unnecessary re-fetches

## Analysis

The review suggestions are **valid and appropriate** for our codebase:

✅ **Issue #1 (Delete Context)**: This is a real UX bug. When a user deletes a note while viewing trash, they expect to see remaining trash items, not jump back to all notes.

✅ **Issue #2 (Search in Trash)**: Currently, search doesn't consider the current view, which is confusing. We should either disable search in trash or make it search within deleted notes only.

✅ **Code Quality Suggestions**: Constants and type extraction improve maintainability and follow TypeScript best practices.

## Implementation Plan

### Phase 1: Fix Critical Issues (Priority 1)

#### Task 1.1: Fix Delete Operation to Preserve View Context
**File:** `src/app/dashboard/page.tsx` (Line 145-160)

**Current code:**
```typescript
const handleDeleteNote = useCallback(
  async (noteId: string) => {
    try {
      await deleteNoteById(noteId);
      handleCloseEditor();
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note. Please try again.');
    } finally {
      await fetchNotes(); // ❌ Missing view context
    }
  },
  [deleteNoteById, fetchNotes, handleCloseEditor]
);
```

**Fix:**
```typescript
const handleDeleteNote = useCallback(
  async (noteId: string) => {
    try {
      await deleteNoteById(noteId);
      handleCloseEditor();
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note. Please try again.');
    } finally {
      await fetchNotes({ showTrash: currentView === 'trash' }); // ✅ Preserve view context
    }
  },
  [deleteNoteById, fetchNotes, handleCloseEditor, currentView]
);
```

**Changes:**
- Add `currentView` to dependency array
- Pass `{ showTrash: currentView === 'trash' }` to `fetchNotes()`

---

#### Task 1.2: Handle Search in Trash View
**File:** `src/app/dashboard/page.tsx` (Line 162-171)

**Current code:**
```typescript
const handleSearch = useCallback(
  (query: string) => {
    searchNotes(query, {
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined
    });
  },
  [searchNotes, selectedTagIds]
);
```

**Option A: Disable search in trash view (Simpler)**
```typescript
const handleSearch = useCallback(
  (query: string) => {
    // Don't allow search in trash view for now
    if (currentView === 'trash') {
      return;
    }
    searchNotes(query, {
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined
    });
  },
  [searchNotes, selectedTagIds, currentView]
);
```

**Option B: Support search in trash (More complex, needs backend changes)**
```typescript
const handleSearch = useCallback(
  (query: string) => {
    searchNotes(query, {
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      showTrash: currentView === 'trash' // Would need API support
    });
  },
  [searchNotes, selectedTagIds, currentView]
);
```

**Recommendation**: Start with **Option A** (disable search in trash) because:
- Simpler to implement
- Search API doesn't currently support trash filtering
- Most users don't need to search in trash (they're looking for recently deleted items)
- Can be enhanced later if users request it

**Additional UI change needed:**
- Hide or disable search bar when viewing trash
- Or show a message "Search is not available in trash view"

---

### Phase 2: Code Quality Improvements (Priority 2)

#### Task 2.1: Extract View Constants and Types
**File:** `src/app/dashboard/page.tsx` (Top of file)

**Add at top of file:**
```typescript
// View types and constants
type DashboardView = 'all-notes' | 'trash';

const DASHBOARD_VIEWS = {
  ALL_NOTES: 'all-notes' as const,
  TRASH: 'trash' as const,
};
```

**Update state initialization:**
```typescript
const [currentView, setCurrentView] = useState<DashboardView>(DASHBOARD_VIEWS.ALL_NOTES);
```

**Update all string literals:**
- Replace `'all-notes'` with `DASHBOARD_VIEWS.ALL_NOTES`
- Replace `'trash'` with `DASHBOARD_VIEWS.TRASH`

---

#### Task 2.2: Add Accessibility Labels
**File:** `src/app/dashboard/page.tsx` (Lines 381-407)

**Add ARIA labels:**
```typescript
<button
  onClick={handleShowAllNotes}
  className={...}
  aria-label="View all active notes"
  aria-pressed={currentView === DASHBOARD_VIEWS.ALL_NOTES}
>
  ...
</button>

<button
  onClick={handleShowTrash}
  className={...}
  aria-label="View deleted notes in trash"
  aria-pressed={currentView === DASHBOARD_VIEWS.TRASH}
>
  ...
</button>
```

---

#### Task 2.3: Conditionally Hide Search in Trash View
**File:** `src/app/dashboard/page.tsx` (Lines 419-446)

**Option 1: Hide search bar entirely**
```typescript
{currentView !== DASHBOARD_VIEWS.TRASH && (
  <div className="flex-1">
    <SearchBar onSearch={handleSearch} />
  </div>
)}
```

**Option 2: Show disabled state with tooltip**
```typescript
<div className="flex-1 relative">
  <SearchBar
    onSearch={handleSearch}
    disabled={currentView === DASHBOARD_VIEWS.TRASH}
    placeholder={currentView === DASHBOARD_VIEWS.TRASH
      ? "Search not available in trash"
      : "Search notes..."}
  />
</div>
```

**Recommendation**: Use Option 1 (hide entirely) - cleaner UX

---

### Phase 3: Optional Enhancements (Future)

#### Task 3.1: Add Backend Support for Search in Trash
**Files:**
- `src/app/api/notes/search/route.ts`
- `src/hooks/useNotes.ts`

This would require:
1. Adding `trash` query parameter to search endpoint
2. Modifying search query to filter by `deleted_at IS NOT NULL` when trash=true
3. Updating `searchNotes` hook to accept `showTrash` option

---

## Files to Modify

### Critical Fixes (Must Do)
1. ✅ `src/app/dashboard/page.tsx`
   - Fix `handleDeleteNote` to preserve view context
   - Update `handleSearch` to disable in trash view
   - Hide search bar when viewing trash

### Code Quality (Should Do)
2. ✅ `src/app/dashboard/page.tsx`
   - Add view types and constants
   - Add ARIA labels to navigation buttons

### Optional (Nice to Have)
3. ⏳ `src/app/api/notes/search/route.ts` - Support search in trash
4. ⏳ `src/hooks/useNotes.ts` - Add trash support to search

---

## Testing Requirements

### Manual Testing Checklist

**Critical Fixes:**
- [ ] Delete a note while viewing "All Notes" - should refresh and stay on "All Notes"
- [ ] Delete a note while viewing "Trash" - should refresh and stay on "Trash"
- [ ] Try to search while viewing "Trash" - search should be hidden/disabled
- [ ] Search works normally when viewing "All Notes"

**Accessibility:**
- [ ] Navigate with keyboard - Tab to navigation buttons
- [ ] Screen reader announces active view state
- [ ] ARIA pressed state updates correctly

**Edge Cases:**
- [ ] Delete the last item in trash - should show empty trash view
- [ ] Switch from trash to all notes - search bar appears
- [ ] Tag filtering remains disabled in trash view

---

## Potential Risks & Considerations

### Low Risk
- ✅ Changes are localized to dashboard component
- ✅ No database schema changes needed
- ✅ Backend already supports trash filtering

### Considerations
- 🔶 Users might expect search to work in trash - we should communicate this clearly
- 🔶 Consider adding a "Empty Trash" button in future iterations
- 🔶 Consider adding "Restore" functionality for trash items

---

## Estimated Effort

| Task | Complexity | Time Estimate |
|------|-----------|---------------|
| Fix delete context | Low | 5 minutes |
| Disable search in trash | Low | 10 minutes |
| Add constants/types | Low | 10 minutes |
| Add ARIA labels | Low | 5 minutes |
| Testing | Medium | 15 minutes |
| **Total** | **Low-Medium** | **~45 minutes** |

---

## Implementation Order

1. ✅ Fix `handleDeleteNote` to preserve view context (5 min)
2. ✅ Disable search in trash view (10 min)
3. ✅ Hide search bar in trash (5 min)
4. ✅ Add view constants and types (10 min)
5. ✅ Add ARIA labels (5 min)
6. ✅ Test all scenarios (15 min)
7. ✅ Commit and update PR

---

## Success Criteria

✅ **Must Have:**
- Deleting from trash refreshes trash view (not all notes)
- Search is disabled/hidden when viewing trash
- No console errors

✅ **Should Have:**
- View constants extracted for type safety
- ARIA labels present for accessibility
- Clean code following project patterns

✅ **Nice to Have:**
- Search supports trash view filtering (future enhancement)

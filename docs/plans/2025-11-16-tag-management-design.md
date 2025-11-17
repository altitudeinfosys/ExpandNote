# Tag Management Feature - Design Document

**Date:** 2025-11-16
**Author:** Claude Code
**Status:** Approved

---

## Overview

Add a Tag Management screen to the Settings area where users can view, create, edit, and delete tags. This provides centralized tag organization and visibility into tag usage across notes and AI Profiles.

---

## User Requirements

1. **View all tags** - See complete list of user's tags with usage statistics
2. **Create tags** - Add new tags with validation (max 50 chars, unique names)
3. **Edit tags** - Rename existing tags
4. **Delete tags** - Remove tags with dependency warnings (AI Profiles, note counts)
5. **Usage visibility** - Show how many notes use each tag
6. **AI Profile awareness** - Warn when deleting/editing tags linked to AI Profiles

---

## Architecture

### Route Structure

**New page:** `/settings/tags`

**Navigation:** Accessible from App Settings section via "Manage Tags" button

### File Structure

```
src/
├── app/
│   └── settings/
│       ├── page.tsx (Modified - add navigation button)
│       └── tags/
│           └── page.tsx (New - tag management page)
```

### API Endpoints (Existing)

All necessary endpoints already exist:

- `GET /api/tags` - Fetch all user tags
- `POST /api/tags` - Create new tag
- `GET /api/tags/[id]` - Fetch single tag with note_count
- `PUT /api/tags/[id]` - Update tag name
- `DELETE /api/tags/[id]` - Delete tag (removes note_tags associations)
- `GET /api/ai-profiles` - Check AI Profile dependencies

### Data Flow

```
┌─────────────────┐
│  Page Load      │
└────────┬────────┘
         │
         ├─────► GET /api/tags (fetch all tags)
         │
         └─────► GET /api/ai-profiles (check dependencies)
                       │
                       ▼
         ┌─────────────────────────┐
         │ Merge data:             │
         │ - tag.note_count        │
         │ - tag.ai_profile_count  │
         │ - tag.ai_profile_names  │
         └─────────────────────────┘
```

**Tag Operations:**

1. **Create:** POST /api/tags → Refresh list
2. **Edit:** PUT /api/tags/[id] → Update UI
3. **Delete:** Check dependencies → Confirm → DELETE /api/tags/[id] → Remove from UI

---

## UI Design

### Page Layout

Following the existing settings page pattern:

```
┌────────────────────────────────────────────────────────┐
│  Header                                                 │
│  [← Back]  Tag Management              [Theme Toggle]  │
└────────────────────────────────────────────────────────┘
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  [+ Create New Tag]                              │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Tag List                                        │  │
│  │  ───────────────────────────────────────────────│  │
│  │  #work                12 notes    [Edit][Delete] │  │
│  │  #personal            5 notes     [Edit][Delete] │  │
│  │  #youtube  🤖 AI      8 notes     [Edit][Delete] │  │
│  └─────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Components

#### 1. Header
- Back button (navigate to /settings?section=app-settings)
- Page title: "Tag Management"
- Theme toggle (consistent with other settings pages)

#### 2. Create Tag Section
- Primary button: "Create New Tag" with Material icon "add"
- Opens modal dialog with tag name input

#### 3. Tag List
Desktop view (table-like):
- Tag name (with colored badge background)
- Usage stats: "Used in X notes"
- AI Profile indicator: "🤖 Linked to [Profile Name]" (if applicable)
- Action buttons: Edit, Delete

Mobile view (< 640px):
- Stacked cards with same information
- Buttons stack vertically

#### 4. Empty State
When no tags exist:
```
    ┌─────────────────────┐
    │     [label icon]    │
    │                     │
    │   No tags yet       │
    │                     │
    │ Create your first   │
    │ tag to organize     │
    │ your notes          │
    └─────────────────────┘
```

#### 5. Tag Form Modal (Create/Edit)
- Modal overlay (same style as AI Profile modals)
- Title: "Create New Tag" or "Edit Tag"
- Input field: Tag name (max 50 chars)
- Character counter: "24/50"
- Validation errors shown below input
- Buttons: Cancel (secondary), Save (primary)

#### 6. Delete Confirmation Dialog
Multi-step confirmation based on dependencies:

**Level 1 (Always):**
```
Delete Tag?
Are you sure you want to delete "#tagname"?

[Cancel]  [Delete]
```

**Level 2 (If note_count > 0):**
```
Delete Tag?
This tag is used in 12 notes. Deleting it will
remove the tag from all notes.

[Cancel]  [Delete]
```

**Level 3 (If AI Profile exists):**
```
⚠️ Warning: AI Profile Dependency

This tag is linked to the AI Profile "YouTube Summarizer".
Deleting it will break this automation.

Are you absolutely sure you want to delete "#youtube"?

[Cancel]  [Delete Anyway]
```

---

## Design System Compliance

### Colors (CSS Variables)
- Background: `var(--background)`
- Surface: `var(--background-surface)`
- Foreground: `var(--foreground)`
- Secondary text: `var(--foreground-secondary)`
- Border: `var(--border)`
- Primary: `var(--primary)`, `var(--primary-hover)`
- AI Purple: `var(--ai-purple)`
- Danger: Red-600 (for delete)

### Typography
- Page title: `text-2xl font-semibold`
- Section headers: `text-xl font-semibold`
- Body text: `text-base`
- Secondary text: `text-sm`

### Spacing
- Page padding: `px-4 sm:px-6 lg:px-8 py-4 sm:py-8`
- Content max-width: `max-w-6xl mx-auto`
- Card padding: `p-4 sm:p-6`
- Gap between elements: `gap-4 sm:gap-6`

### Icons (Material Symbols)
- Tag: `label`
- Create: `add`
- Edit: `edit`
- Delete: `delete`
- Back: `arrow_back`
- Theme: `light_mode` / `dark_mode`
- Warning: `warning`

### Buttons
- Primary: `bg-primary text-white hover:bg-primary-hover`
- Secondary: `border border-[var(--border)] hover:bg-[var(--background)]`
- Danger: `text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`

### Responsive Breakpoints
- Mobile: `< 640px` (sm)
- Tablet: `640px - 1024px` (sm to lg)
- Desktop: `>= 1024px` (lg)

---

## Tag Operations - Detailed Specs

### Create Tag

**Trigger:** Click "Create New Tag" button

**Flow:**
1. Open modal dialog
2. Focus on name input
3. User types tag name
4. Show character count (live update)
5. Validate on input:
   - Length: 1-50 characters
   - Unique: Check against existing tags (client-side)
6. Click "Save"
7. Validate again (server-side)
8. POST to `/api/tags` with `{ name: trimmedName }`
9. On success:
   - Close modal
   - Add tag to list (optimistic update)
   - Show success message (optional toast)
10. On error:
    - Show error below input
    - Keep modal open
    - Highlight input field

**Validation Rules:**
- Required: Cannot be empty
- Length: 1-50 characters after trim
- Unique: Case-sensitive check against existing tags
- Max limit: Cannot exceed 100 tags per user

**Error Messages:**
- "Tag name is required"
- "Tag name must be 50 characters or less"
- "A tag with this name already exists"
- "You've reached the maximum of 100 tags"

---

### Edit Tag

**Trigger:** Click "Edit" button on tag row

**Flow:**
1. Open modal dialog with current name pre-filled
2. Same validation as Create
3. Check if tag is linked to AI Profile:
   - If yes: Show warning below input: "⚠️ This tag is used by 'Profile Name'. Renaming will affect automation."
4. Click "Save"
5. PUT to `/api/tags/[id]` with `{ name: trimmedName }`
6. On success:
   - Close modal
   - Update tag in list
   - If AI Profile exists, consider showing info: "AI Profile 'X' will now trigger on '#newname'"
7. On error:
   - Show error below input

**Additional Validation:**
- Same as Create, but exclude current tag from uniqueness check

---

### Delete Tag

**Trigger:** Click "Delete" button on tag row

**Flow:**
1. Fetch AI Profiles for this tag (if not already cached)
2. Determine confirmation level based on:
   - Has AI Profile? → Level 3 (critical warning)
   - Has notes (note_count > 0)? → Level 2 (moderate warning)
   - No dependencies? → Level 1 (basic confirmation)
3. Show confirmation dialog with appropriate message
4. User clicks "Delete" / "Delete Anyway"
5. DELETE to `/api/tags/[id]`
6. On success:
   - Remove tag from UI list
   - Close dialog
   - Show success message (optional)
7. On error:
   - Show error in dialog
   - Keep dialog open

**Confirmation Messages:**

**Level 1:**
- Title: "Delete Tag?"
- Message: "Are you sure you want to delete '#tagname'?"
- Button: "Delete"

**Level 2:**
- Title: "Delete Tag?"
- Message: "This tag is used in [X] notes. Deleting it will remove the tag from all notes."
- Button: "Delete"

**Level 3:**
- Title: "⚠️ Warning: AI Profile Dependency"
- Message: "This tag is linked to the AI Profile '[Profile Name]'. Deleting it will break this automation. Are you absolutely sure you want to delete '#tagname'?"
- Button: "Delete Anyway" (red, emphasized)

---

## State Management

### Component State

```typescript
// Main page state
const [tags, setTags] = useState<TagWithMetadata[]>([]);
const [aiProfiles, setAiProfiles] = useState<AIProfile[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// Modal state
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
const [editingTag, setEditingTag] = useState<Tag | null>(null);
const [deletingTag, setDeletingTag] = useState<Tag | null>(null);

// Form state (managed by modal component)
const [tagName, setTagName] = useState('');
const [formError, setFormError] = useState<string | null>(null);
const [saving, setSaving] = useState(false);
```

### Data Types

```typescript
interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

interface TagWithMetadata extends Tag {
  note_count: number;
  ai_profile_count: number;
  ai_profile_names: string[]; // For display in warnings
}

interface AIProfile {
  id: string;
  name: string;
  tag_id: string;
  is_active: boolean;
  // ... other fields
}
```

---

## Error Handling

### Network Errors

**Fetch failures:**
- Show error state in page: "Failed to load tags. Please refresh."
- Retry button available

**Operation failures:**
- Show error message in modal/dialog
- Keep form data (don't close modal)
- Allow user to retry or cancel

**Timeout handling:**
- Show loading spinner for operations
- Timeout after 10 seconds
- Show error: "Request timed out. Please try again."

### Concurrent Modifications

**Scenario:** Tag deleted by another session

**Handling:**
1. When edit/delete fails with 404
2. Show message: "This tag no longer exists"
3. Refresh tag list
4. Close modal/dialog

### Client-Side Validation

**Prevent invalid requests:**
- Disable save button until validation passes
- Show inline errors immediately
- Trim whitespace before validation
- Check length and uniqueness

### Server-Side Validation

**Always validate on server:**
- Tag name format
- Uniqueness (race condition safe)
- User ownership
- Max tags limit

**Return appropriate HTTP codes:**
- 400: Bad request (invalid input)
- 401: Unauthorized
- 404: Tag not found
- 409: Conflict (duplicate name)
- 500: Server error

---

## Performance Considerations

### Data Loading

**Initial load:**
- Parallel fetch: tags + AI profiles
- Show loading skeleton while fetching
- Cache AI profiles data (doesn't change often)

**Optimistic Updates:**
- Update UI immediately on create/edit/delete
- Rollback if API call fails
- Improves perceived performance

### API Call Optimization

**Reduce redundant calls:**
- Cache AI profiles list (refresh only when needed)
- Don't refetch tags after every operation (use optimistic updates)
- Only refetch on error or stale data

**Debounce search/filter (if added later):**
- 300ms debounce on tag name search

### UI Performance

**Large lists:**
- Current max is 100 tags (manageable without virtualization)
- If limit increases, consider virtual scrolling

**Modal rendering:**
- Render modals only when open (conditional rendering)
- Clean up on unmount

---

## Accessibility

### Keyboard Navigation

- Tab order: Create button → Tag rows → Edit/Delete buttons
- Enter on row: Open edit modal
- Escape: Close modal/dialog
- Focus trap in modals

### Screen Readers

- Semantic HTML: `<button>`, `<dialog>`, `<label>`, `<input>`
- ARIA labels:
  - "Create new tag"
  - "Edit tag [name]"
  - "Delete tag [name]"
  - "Tag name input"
- Announce state changes: "Tag created", "Tag deleted"

### Visual Accessibility

- Color contrast: Follow WCAG AA standards
- Focus indicators: Visible outline on focused elements
- Error states: Don't rely on color alone (use icons/text)
- Font sizes: Minimum 14px (text-sm)

---

## Mobile Responsiveness

### Breakpoints

**Mobile (< 640px):**
- Stack all elements vertically
- Full-width buttons
- Cards instead of table rows
- Larger tap targets (min 44px)

**Tablet (640px - 1024px):**
- Reduced padding
- 2-column layout where appropriate
- Compact spacing

**Desktop (>= 1024px):**
- Full table view
- Hover states
- More spacing

### Touch Interactions

- Swipe to reveal actions (optional enhancement)
- Pull to refresh (optional enhancement)
- Large buttons (min 44px × 44px)
- No hover-only interactions

---

## Testing Requirements

### Unit Tests (Future)

- Tag list rendering
- Create form validation
- Edit form validation
- Delete confirmation levels
- Error handling

### Manual Testing Checklist

**Create Tag:**
- [ ] Empty name shows error
- [ ] Name > 50 chars shows error
- [ ] Duplicate name shows error
- [ ] Valid name creates tag successfully
- [ ] Character counter updates correctly
- [ ] Modal closes on success
- [ ] Tag appears in list

**Edit Tag:**
- [ ] Modal opens with current name
- [ ] Validation works same as create
- [ ] Editing to duplicate name shows error
- [ ] Editing tag with AI Profile shows warning
- [ ] Successful edit updates list
- [ ] Cancel discards changes

**Delete Tag:**
- [ ] Tag with no notes shows Level 1 confirmation
- [ ] Tag with notes shows Level 2 confirmation with count
- [ ] Tag with AI Profile shows Level 3 critical warning
- [ ] Tag with AI Profile shows profile name(s)
- [ ] Cancel preserves tag
- [ ] Delete removes tag from list
- [ ] Delete removes tag from all notes (verify in dashboard)

**Edge Cases:**
- [ ] Loading state shows correctly
- [ ] Error state shows correctly
- [ ] Empty state shows when no tags
- [ ] Reaching 100 tags disables create button
- [ ] Network error shows appropriate message
- [ ] Concurrent delete handled (404 error)

**Responsive:**
- [ ] Mobile view (< 640px) works correctly
- [ ] Tablet view works correctly
- [ ] Desktop view works correctly
- [ ] Modals are responsive
- [ ] Touch targets are large enough

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Screen reader announces actions
- [ ] Focus management in modals
- [ ] Color contrast passes WCAG AA

---

## Integration Points

### Settings Page (src/app/settings/page.tsx)

**Modification:** Add "Manage Tags" button in App Settings section

**Location:** After Theme selector (~line 575)

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

### Dashboard Integration

**Impact:** None directly

**Benefits:**
- Users can manage tags from settings
- No need to create tags inline while editing notes (though that still works)
- Better visibility into tag usage

### AI Profiles Integration

**Dependency Check:**
- Fetch AI Profiles when loading tag management page
- Check `profile.tag_id` against tag being deleted/edited
- Show profile name in warnings

**No API Changes Needed:**
- Existing `/api/ai-profiles` endpoint returns all needed data

---

## Future Enhancements (Out of Scope)

These are not part of the initial implementation but could be added later:

1. **Tag merging** - Combine two tags into one
2. **Bulk operations** - Select multiple tags, delete at once
3. **Tag colors** - Custom colors for tags
4. **Tag sorting/filtering** - Sort by name, note count, date created
5. **Tag search** - Filter tag list by name
6. **Tag export** - Export tag list to CSV/JSON
7. **Tag statistics** - Show most used tags, trending tags
8. **Tag suggestions** - AI-powered tag suggestions when creating notes

---

## Success Criteria

The feature is successful if:

1. ✅ Users can view all tags with note counts
2. ✅ Users can create new tags with validation
3. ✅ Users can edit tag names
4. ✅ Users can delete tags with appropriate warnings
5. ✅ AI Profile dependencies are clearly indicated
6. ✅ Design matches existing settings pages
7. ✅ Mobile responsive (works on all screen sizes)
8. ✅ No regressions in existing tag functionality
9. ✅ Build passes with no TypeScript errors
10. ✅ All manual tests pass

---

## Implementation Timeline

**Estimated Effort:** 3-4 hours

**Breakdown:**
- New page component: 1.5 hours
- Tag form modal: 1 hour
- Delete confirmation dialog: 0.5 hours
- Settings integration: 0.25 hours
- Testing & polish: 0.75-1.75 hours

---

## Risks & Mitigations

### Risk 1: Deleting tags with many notes could be slow

**Mitigation:**
- DELETE endpoint already handles this (cascades note_tags)
- Show loading state during delete
- Most tags won't have huge note counts (max 5 tags per note constraint helps)

### Risk 2: Concurrent edits by multiple sessions

**Mitigation:**
- Use optimistic updates with rollback on error
- Server-side uniqueness check prevents duplicates
- 404 handling for deleted tags

### Risk 3: Breaking AI Profiles by deleting tags

**Mitigation:**
- Level 3 confirmation with profile name
- Clear warning message
- User must explicitly click "Delete Anyway"

### Risk 4: Modal/dialog doesn't follow design system

**Mitigation:**
- Reference existing modals in AI Profile pages
- Use same CSS variables and patterns
- Test in both light/dark themes

---

## Conclusion

This design provides a comprehensive tag management interface that integrates seamlessly with the existing settings structure. It maintains consistency with the current design system while adding powerful tag organization capabilities and protecting users from accidental deletions through multi-level confirmations.

The implementation reuses existing API endpoints and follows established patterns, minimizing complexity and ensuring reliability.

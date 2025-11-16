-- Migration: Add index for favorites filtering performance
-- Created: 2025-11-16
-- Purpose: Optimize queries filtering by is_favorite column
--
-- This partial index only includes favorited, non-deleted notes
-- to minimize storage while maximizing query performance.
-- Expected impact: Favorites query time from 500ms+ to <50ms with 10k notes.

-- Create partial index for favorite notes filtering
CREATE INDEX IF NOT EXISTS idx_notes_is_favorite
ON public.notes(user_id, is_favorite)
WHERE is_favorite = true AND deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_notes_is_favorite IS
'Partial index for filtering favorited notes. Only includes non-deleted favorites to minimize storage while optimizing GET /api/notes?favorites=true queries.';

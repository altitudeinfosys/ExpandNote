-- Update search_notes function to support filtering by archived status
-- This allows searching within specific views (archived, all, etc.)
-- Updated to use ILIKE for partial word matching (users expect "dot" to find "dotloop")

-- Drop all versions of the function to handle signature changes
DROP FUNCTION IF EXISTS search_notes(text, uuid);
DROP FUNCTION IF EXISTS search_notes(text, uuid, boolean);

-- Create new function with ILIKE-based partial matching
CREATE OR REPLACE FUNCTION search_notes(
  search_query TEXT,
  user_uuid UUID,
  filter_archived BOOLEAN DEFAULT NULL  -- NULL = all notes, TRUE = only archived, FALSE = only non-archived
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content TEXT,
  is_favorite BOOLEAN,
  is_archived BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  sync_version INTEGER,
  rank REAL
) AS $$
DECLARE
  search_pattern TEXT;
BEGIN
  -- Create ILIKE pattern for partial matching
  search_pattern := '%' || search_query || '%';

  RETURN QUERY
  SELECT
    n.id,
    n.user_id,
    n.title,
    n.content,
    n.is_favorite,
    n.is_archived,
    n.created_at,
    n.updated_at,
    n.deleted_at,
    n.sync_version,
    -- Rank: title matches score higher than content matches
    CASE
      WHEN n.title ILIKE search_pattern THEN 2.0
      ELSE 1.0
    END::REAL AS rank
  FROM public.notes n
  WHERE n.user_id = user_uuid
    AND n.deleted_at IS NULL
    -- Filter by archived status if parameter is provided
    AND (filter_archived IS NULL OR n.is_archived = filter_archived)
    -- Use ILIKE for partial word matching (case-insensitive)
    AND (n.title ILIKE search_pattern OR n.content ILIKE search_pattern)
  ORDER BY rank DESC, n.updated_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

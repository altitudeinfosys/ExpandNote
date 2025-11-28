-- Fix search_notes function to return all necessary fields
-- This is required for filtering by is_archived, is_favorite, etc.

-- Drop the old function first (required to change return type)
DROP FUNCTION IF EXISTS search_notes(text, uuid);

-- Create the updated function with all necessary fields
CREATE OR REPLACE FUNCTION search_notes(
  search_query TEXT,
  user_uuid UUID
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
BEGIN
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
    ts_rank(
      to_tsvector('english', coalesce(n.title, '') || ' ' || n.content),
      plainto_tsquery('english', search_query)
    ) AS rank
  FROM public.notes n
  WHERE n.user_id = user_uuid
    AND n.deleted_at IS NULL
    AND to_tsvector('english', coalesce(n.title, '') || ' ' || n.content) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

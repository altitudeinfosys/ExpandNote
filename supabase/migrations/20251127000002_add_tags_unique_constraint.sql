-- Migration: Add unique constraint on tags (user_id, name)
-- Created: 2025-11-27
-- Description: Ensure tags are unique per user to prevent race conditions in tag creation

-- First, remove any potential duplicate tags
-- Keep the oldest tag for each (user_id, name) pair and update note_tags references
DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  -- Find and handle duplicates
  FOR duplicate_record IN
    SELECT user_id, name, array_agg(id ORDER BY created_at) as tag_ids
    FROM tags
    GROUP BY user_id, name
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first (oldest) tag, reassign note_tags from duplicates to it
    UPDATE note_tags
    SET tag_id = duplicate_record.tag_ids[1]
    WHERE tag_id = ANY(duplicate_record.tag_ids[2:]);

    -- Delete duplicate tags (keep only the first one)
    DELETE FROM tags
    WHERE id = ANY(duplicate_record.tag_ids[2:]);

    RAISE NOTICE 'Merged duplicate tags for user_id=%, name=%: kept %, removed %',
      duplicate_record.user_id,
      duplicate_record.name,
      duplicate_record.tag_ids[1],
      duplicate_record.tag_ids[2:];
  END LOOP;
END $$;

-- Add unique constraint on tags table
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_id_name
ON tags(user_id, name);

-- Add comment for documentation
COMMENT ON INDEX idx_tags_user_id_name IS
'Ensures each user can only have one tag with a given name - prevents race conditions in tag creation';

-- Add materialized tag count to notes table
-- This approach prevents deadlocks by using a check constraint instead of cross-table locking
-- The tag_count column is automatically maintained by triggers

-- Add tag_count column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tag_count INT DEFAULT 0 NOT NULL;

-- Add check constraint to enforce max 5 tags
ALTER TABLE notes ADD CONSTRAINT notes_max_tags_check CHECK (tag_count <= 5);

-- Create function to update tag count
CREATE OR REPLACE FUNCTION update_note_tag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment tag count
    UPDATE notes
    SET tag_count = tag_count + 1
    WHERE id = NEW.note_id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement tag count
    UPDATE notes
    SET tag_count = tag_count - 1
    WHERE id = OLD.note_id;

    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle note_id change (tag moved to different note)
    IF OLD.note_id IS DISTINCT FROM NEW.note_id THEN
      UPDATE notes SET tag_count = tag_count - 1 WHERE id = OLD.note_id;
      UPDATE notes SET tag_count = tag_count + 1 WHERE id = NEW.note_id;
    END IF;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Replace old triggers with new ones that maintain tag_count
DROP TRIGGER IF EXISTS enforce_note_tags_limit_update ON note_tags;
DROP TRIGGER IF EXISTS enforce_note_tags_limit_insert ON note_tags;
DROP FUNCTION IF EXISTS check_note_tags_limit();

-- Create new trigger to maintain tag count
CREATE TRIGGER maintain_note_tag_count_insert
  AFTER INSERT ON note_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_note_tag_count();

CREATE TRIGGER maintain_note_tag_count_delete
  AFTER DELETE ON note_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_note_tag_count();

CREATE TRIGGER maintain_note_tag_count_update
  AFTER UPDATE ON note_tags
  FOR EACH ROW
  WHEN (OLD.note_id IS DISTINCT FROM NEW.note_id)
  EXECUTE FUNCTION update_note_tag_count();

-- Initialize tag_count for existing notes (if any)
UPDATE notes n
SET tag_count = (
  SELECT COUNT(*)
  FROM note_tags nt
  WHERE nt.note_id = n.id
);

-- Add comment for documentation
COMMENT ON COLUMN notes.tag_count IS 'Materialized count of tags. Maintained automatically by triggers. Check constraint enforces max 5 tags.';
COMMENT ON FUNCTION update_note_tag_count() IS 'Maintains materialized tag_count column. Called by triggers on note_tags INSERT/UPDATE/DELETE.';

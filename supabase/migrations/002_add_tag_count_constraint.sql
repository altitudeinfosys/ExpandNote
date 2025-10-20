-- Add constraint to enforce max 5 tags per note
-- This prevents users from adding more than 5 tags to a single note
-- Locks parent note row to serialize tag additions and prevent race conditions

CREATE OR REPLACE FUNCTION check_note_tags_limit()
RETURNS TRIGGER AS $$
DECLARE
  tag_count INTEGER;
  note_exists BOOLEAN;
BEGIN
  -- Lock the parent note row to serialize all tag additions for this note
  -- This prevents race conditions where multiple transactions see the same count
  SELECT EXISTS(SELECT 1 FROM notes WHERE id = NEW.note_id FOR UPDATE) INTO note_exists;

  IF NOT note_exists THEN
    RAISE EXCEPTION 'Note with id % does not exist', NEW.note_id;
  END IF;

  -- Now safely count existing tags (parent row is locked)
  SELECT COUNT(*) INTO tag_count
  FROM note_tags
  WHERE note_id = NEW.note_id;

  IF tag_count >= 5 THEN
    RAISE EXCEPTION 'A note cannot have more than 5 tags';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the constraint on INSERT
CREATE TRIGGER enforce_note_tags_limit_insert
  BEFORE INSERT ON note_tags
  FOR EACH ROW
  EXECUTE FUNCTION check_note_tags_limit();

-- Create trigger to enforce the constraint on UPDATE (when note_id changes)
CREATE TRIGGER enforce_note_tags_limit_update
  BEFORE UPDATE OF note_id ON note_tags
  FOR EACH ROW
  WHEN (OLD.note_id IS DISTINCT FROM NEW.note_id)
  EXECUTE FUNCTION check_note_tags_limit();

-- Add comment for documentation
COMMENT ON FUNCTION check_note_tags_limit() IS 'Enforces maximum of 5 tags per note with row-level locking to prevent race conditions';

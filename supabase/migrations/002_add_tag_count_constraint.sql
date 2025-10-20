-- Add constraint to enforce max 5 tags per note
-- This prevents users from adding more than 5 tags to a single note
-- Locks parent note row to serialize tag additions and prevent race conditions

CREATE OR REPLACE FUNCTION check_note_tags_limit()
RETURNS TRIGGER AS $$
DECLARE
  tag_count INTEGER;
  note_exists BOOLEAN;
BEGIN
  -- Lock the parent note row to serialize tag additions
  -- FOR UPDATE ensures only one transaction can add tags to this note at a time
  -- This prevents the race condition where two concurrent INSERTs both see count=4
  SELECT EXISTS(SELECT 1 FROM notes WHERE id = NEW.note_id FOR UPDATE) INTO note_exists;

  IF NOT note_exists THEN
    RAISE EXCEPTION 'Note does not exist';
  END IF;

  -- Now safely count existing tags (parent note row is exclusively locked)
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
COMMENT ON FUNCTION check_note_tags_limit() IS 'Enforces maximum of 5 tags per note. Locks parent notes row with FOR UPDATE to serialize tag additions and prevent race conditions.';

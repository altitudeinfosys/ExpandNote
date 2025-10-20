-- Add constraint to enforce max 5 tags per note
-- This prevents users from adding more than 5 tags to a single note
-- Locks parent note row to serialize tag additions and prevent race conditions

CREATE OR REPLACE FUNCTION check_note_tags_limit()
RETURNS TRIGGER AS $$
DECLARE
  tag_count INTEGER;
BEGIN
  -- Lock existing note_tags rows for this note using FOR UPDATE
  -- This prevents concurrent tag insertions from reading the same count
  -- NOWAIT will fail fast if another transaction is adding tags
  SELECT COUNT(*) INTO tag_count
  FROM note_tags
  WHERE note_id = NEW.note_id
  FOR UPDATE NOWAIT;

  IF tag_count >= 5 THEN
    RAISE EXCEPTION 'A note cannot have more than 5 tags';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN lock_not_available THEN
    -- If we can't get the lock, another transaction is modifying tags
    -- Wait briefly and retry the count (this time with blocking FOR UPDATE)
    SELECT COUNT(*) INTO tag_count
    FROM note_tags
    WHERE note_id = NEW.note_id
    FOR UPDATE;

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
COMMENT ON FUNCTION check_note_tags_limit() IS 'Enforces maximum of 5 tags per note. Uses FOR UPDATE locks on note_tags rows to prevent concurrent insertions from bypassing the limit.';

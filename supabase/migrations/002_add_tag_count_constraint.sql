-- Add constraint to enforce max 5 tags per note
-- This prevents users from adding more than 5 tags to a single note

CREATE OR REPLACE FUNCTION check_note_tags_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM note_tags WHERE note_id = NEW.note_id) >= 5 THEN
    RAISE EXCEPTION 'A note cannot have more than 5 tags';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the constraint
CREATE TRIGGER enforce_note_tags_limit
  BEFORE INSERT ON note_tags
  FOR EACH ROW
  EXECUTE FUNCTION check_note_tags_limit();

-- Add comment for documentation
COMMENT ON FUNCTION check_note_tags_limit() IS 'Enforces maximum of 5 tags per note as per product requirements';

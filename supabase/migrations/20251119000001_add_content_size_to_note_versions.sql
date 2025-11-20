-- Add missing content_size column to note_versions table
-- This column was defined in 20251118000001 but not added to existing tables

DO $$
BEGIN
  -- Add content_size if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'note_versions' AND column_name = 'content_size'
  ) THEN
    -- Add as a generated column
    ALTER TABLE note_versions
    ADD COLUMN content_size INTEGER GENERATED ALWAYS AS (length(content)) STORED;
  END IF;
END $$;

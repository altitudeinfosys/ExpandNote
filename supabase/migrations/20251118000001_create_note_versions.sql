-- Create note_versions table for tracking note history
CREATE TABLE IF NOT EXISTS note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Version content (full snapshot)
  title TEXT,
  content TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  snapshot_trigger TEXT NOT NULL CHECK (snapshot_trigger IN ('auto_save', 'manual', 'before_ai', 'after_ai')),
  ai_profile_id UUID REFERENCES ai_profiles(id) ON DELETE SET NULL,

  -- Size tracking for retention
  content_size INTEGER GENERATED ALWAYS AS (length(content)) STORED,

  -- Constraints
  UNIQUE(note_id, version_number)
);

-- Add missing columns if table exists but schema is incomplete
DO $$
BEGIN
  -- Add user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'note_versions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE note_versions ADD COLUMN user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- Add tags if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'note_versions' AND column_name = 'tags'
  ) THEN
    ALTER TABLE note_versions ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add snapshot_trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'note_versions' AND column_name = 'snapshot_trigger'
  ) THEN
    ALTER TABLE note_versions ADD COLUMN snapshot_trigger TEXT NOT NULL DEFAULT 'manual' CHECK (snapshot_trigger IN ('auto_save', 'manual', 'before_ai', 'after_ai'));
  END IF;

  -- Add ai_profile_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'note_versions' AND column_name = 'ai_profile_id'
  ) THEN
    ALTER TABLE note_versions ADD COLUMN ai_profile_id UUID REFERENCES ai_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_note_versions_note_id ON note_versions(note_id);
CREATE INDEX IF NOT EXISTS idx_note_versions_created_at ON note_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_versions_user_id ON note_versions(user_id);

-- Function to auto-increment version_number per note
CREATE OR REPLACE FUNCTION set_version_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO NEW.version_number
  FROM note_versions
  WHERE note_id = NEW.note_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set version_number before insert
DROP TRIGGER IF EXISTS set_note_version_number ON note_versions;
CREATE TRIGGER set_note_version_number
  BEFORE INSERT ON note_versions
  FOR EACH ROW
  WHEN (NEW.version_number IS NULL)
  EXECUTE FUNCTION set_version_number();

-- Enable RLS
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own note versions
DROP POLICY IF EXISTS "Users can view their own note versions" ON note_versions;
CREATE POLICY "Users can view their own note versions"
  ON note_versions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create versions for their own notes" ON note_versions;
CREATE POLICY "Users can create versions for their own notes"
  ON note_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own note versions" ON note_versions;
CREATE POLICY "Users can delete their own note versions"
  ON note_versions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to clean up old versions (keep last 10 per note)
CREATE OR REPLACE FUNCTION cleanup_old_versions()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM note_versions
  WHERE note_id = NEW.note_id
    AND version_number <= (
      SELECT version_number
      FROM note_versions
      WHERE note_id = NEW.note_id
      ORDER BY version_number DESC
      OFFSET 10
      LIMIT 1
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup after insert
DROP TRIGGER IF EXISTS cleanup_note_versions ON note_versions;
CREATE TRIGGER cleanup_note_versions
  AFTER INSERT ON note_versions
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_versions();

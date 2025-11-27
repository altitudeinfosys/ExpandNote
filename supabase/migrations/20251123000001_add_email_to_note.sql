-- Add email-to-note columns to user_settings table
-- This allows users to create notes by sending emails to a unique address

-- Add columns for email-to-note feature
DO $$
BEGIN
  -- Add email_to_note_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'email_to_note_enabled'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN email_to_note_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Add email_to_note_token column if it doesn't exist (unique token for routing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'email_to_note_token'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN email_to_note_token TEXT UNIQUE;
  END IF;

  -- Add email_to_note_address column if it doesn't exist (full email address)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'email_to_note_address'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN email_to_note_address TEXT UNIQUE;
  END IF;
END $$;

-- Create index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_user_settings_email_token ON user_settings(email_to_note_token);

-- Function to generate a cryptographically secure random token
CREATE OR REPLACE FUNCTION generate_email_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 16 character token
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.email_to_note_enabled IS 'Whether email-to-note feature is enabled for this user';
COMMENT ON COLUMN user_settings.email_to_note_token IS 'Unique token used in email address routing (e.g., u-{token}@domain.resend.app)';
COMMENT ON COLUMN user_settings.email_to_note_address IS 'Full email address for this user (e.g., u-abc123@domain.resend.app)';
COMMENT ON FUNCTION generate_email_token() IS 'Generates a cryptographically secure random token for email-to-note routing';

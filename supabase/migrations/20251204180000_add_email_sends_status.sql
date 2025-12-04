-- Add status column to email_sends for race condition prevention
-- Status tracks: pending (reserved slot), sent (successful), failed (error)
ALTER TABLE email_sends ADD COLUMN status TEXT NOT NULL DEFAULT 'sent';

-- Add check constraint for valid status values
ALTER TABLE email_sends ADD CONSTRAINT email_sends_status_check
  CHECK (status IN ('pending', 'sent', 'failed'));

-- Add index for cleanup queries (finding old pending/failed entries)
CREATE INDEX idx_email_sends_status ON email_sends(status) WHERE status != 'sent';

-- Comment
COMMENT ON COLUMN email_sends.status IS 'Email send status: pending (reserved), sent (success), failed (error)';

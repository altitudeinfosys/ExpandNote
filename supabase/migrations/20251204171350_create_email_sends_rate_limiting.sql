-- Table to track email sends for rate limiting
CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast rate limit lookups
CREATE INDEX idx_email_sends_user_time ON email_sends(user_id, sent_at DESC);

-- Enable RLS
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- Users can only see their own email sends
CREATE POLICY "Users can view their own email sends"
  ON email_sends FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own email sends
CREATE POLICY "Users can insert their own email sends"
  ON email_sends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE email_sends IS 'Tracks email sends for rate limiting (10 per user per hour)';

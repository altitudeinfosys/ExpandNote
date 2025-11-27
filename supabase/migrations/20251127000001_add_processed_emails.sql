-- Migration: Add processed_emails table for webhook idempotency
-- Created: 2025-11-27
-- Description: Track processed email webhook events to prevent duplicate note creation

-- Create table to track processed emails for idempotency
CREATE TABLE IF NOT EXISTS processed_emails (
  email_id TEXT PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by note_id
CREATE INDEX IF NOT EXISTS idx_processed_emails_note_id ON processed_emails(note_id);

-- Enable RLS
ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies (service role can access all)
-- This table is only accessed by the webhook endpoint using service role
CREATE POLICY "Service role can manage processed emails"
ON processed_emails FOR ALL
USING (true);

-- Add comment for documentation
COMMENT ON TABLE processed_emails IS 'Tracks processed email webhook events to ensure idempotency - prevents duplicate notes from webhook retries';
COMMENT ON COLUMN processed_emails.email_id IS 'Unique email ID from Resend webhook event';
COMMENT ON COLUMN processed_emails.note_id IS 'Reference to the note created from this email';
COMMENT ON COLUMN processed_emails.processed_at IS 'Timestamp when the email was first processed';

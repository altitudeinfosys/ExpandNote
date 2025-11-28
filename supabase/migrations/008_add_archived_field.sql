-- Add is_archived field to notes table
ALTER TABLE public.notes
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for archived notes to optimize queries
CREATE INDEX IF NOT EXISTS idx_notes_is_archived ON public.notes(is_archived) WHERE is_archived = TRUE;

-- Create index for non-archived, non-deleted notes (most common query)
CREATE INDEX IF NOT EXISTS idx_notes_active ON public.notes(user_id, is_archived, deleted_at) WHERE is_archived = FALSE AND deleted_at IS NULL;

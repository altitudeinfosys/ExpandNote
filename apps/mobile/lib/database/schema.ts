// SQLite database schema for offline support
// Mirrors Supabase tables for local-first architecture

export const SCHEMA_VERSION = 1;

// SQL statements to create tables
export const CREATE_TABLES_SQL = `
-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1,
  local_only INTEGER NOT NULL DEFAULT 0
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  local_only INTEGER NOT NULL DEFAULT 0
);

-- Note-Tag junction table
CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- AI Profiles table
CREATE TABLE IF NOT EXISTS ai_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tag_id TEXT,
  ai_provider TEXT NOT NULL,
  model TEXT NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT '',
  user_prompt_template TEXT NOT NULL DEFAULT '',
  trigger_mode TEXT NOT NULL DEFAULT 'manual',
  output_behavior TEXT NOT NULL DEFAULT 'append',
  output_title_template TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  local_only INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE SET NULL
);

-- Sync queue for pending operations
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Sync metadata for tracking last sync times
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_notes_is_archived ON notes(is_archived);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_ai_profiles_user_id ON ai_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_table_name ON sync_queue(table_name);
`;

// Table names for reference
export const TABLES = {
  NOTES: 'notes',
  TAGS: 'tags',
  NOTE_TAGS: 'note_tags',
  AI_PROFILES: 'ai_profiles',
  SYNC_QUEUE: 'sync_queue',
  SYNC_METADATA: 'sync_metadata',
  SCHEMA_VERSION: 'schema_version',
} as const;

// Sync operation types
export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncQueueStatus = 'pending' | 'processing' | 'failed' | 'completed';

// Local database types (with SQLite-specific fields)
export interface LocalNote {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_favorite: number; // SQLite uses 0/1 for boolean
  is_archived: number;
  sync_version: number;
  local_only: number; // 1 if created offline and not yet synced
}

export interface LocalTag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  local_only: number;
}

export interface LocalNoteTag {
  note_id: string;
  tag_id: string;
  created_at: string;
}

export interface LocalAIProfile {
  id: string;
  user_id: string;
  name: string;
  tag_id: string | null;
  ai_provider: string;
  model: string;
  system_prompt: string;
  user_prompt_template: string;
  trigger_mode: string;
  output_behavior: string;
  output_title_template: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  local_only: number;
}

export interface SyncQueueItem {
  id: number;
  operation: SyncOperation;
  table_name: string;
  record_id: string;
  payload: string; // JSON stringified
  created_at: string;
  retry_count: number;
  last_error: string | null;
  status: SyncQueueStatus;
}

export interface SyncMetadata {
  key: string;
  value: string;
  updated_at: string;
}

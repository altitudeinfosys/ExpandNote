// Core application types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_favorite: boolean;
  sync_version: number;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface NoteTag {
  note_id: string;
  tag_id: string;
  created_at: string;
}

export type AIProvider = 'openai' | 'claude';
export type TriggerMode = 'automatic' | 'manual';
export type OutputBehavior = 'append' | 'new_note' | 'replace';

export interface AIProfile {
  id: string;
  user_id: string;
  name: string;
  tag_id: string;
  ai_provider: AIProvider;
  model: string;
  system_prompt: string;
  user_prompt_template: string;
  trigger_mode: TriggerMode;
  output_behavior: OutputBehavior;
  output_title_template: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tag?: Tag;
}

export type AIExecutionStatus = 'success' | 'failed';

export interface AIExecution {
  id: string;
  user_id: string;
  profile_id: string | null;
  note_id: string;
  ai_provider: AIProvider;
  model: string;
  tokens_used: number | null;
  execution_time_ms: number | null;
  status: AIExecutionStatus;
  error_message: string | null;
  created_at: string;
}

export type Theme = 'auto' | 'light' | 'dark';
export type SortOption = 'modified_desc' | 'modified_asc' | 'created_desc' | 'created_asc' | 'alphabetical';

export interface UserSettings {
  user_id: string;
  openai_api_key: string | null;
  claude_api_key: string | null;
  default_ai_provider: AIProvider | null;
  enable_auto_tagging: boolean;
  default_sort: SortOption;
  theme: Theme;
  created_at: string;
  updated_at: string;
}

export interface NoteVersion {
  id: string;
  note_id: string;
  title: string | null;
  content: string;
  version_number: number;
  created_at: string;
}

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'conflict';

// UI-specific types
export interface NoteWithMetadata extends Note {
  syncStatus: SyncStatus;
  tagCount: number;
}

export interface SearchFilters {
  query: string;
  tagIds: string[];
  showFavorites: boolean;
  showUntagged: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

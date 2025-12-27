// Shared TypeScript types
// These will be extracted from apps/web/src/types in Phase 2

export interface Note {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  sync_version: number;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

// Placeholder - full types will be extracted in Phase 2

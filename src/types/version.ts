export interface NoteVersion {
  id: string;
  note_id: string;
  user_id: string;
  title: string | null;
  content: string;
  tags: Array<{ id: string; name: string }>;
  version_number: number;
  created_at: string;
  snapshot_trigger: 'auto_save' | 'manual' | 'before_ai' | 'after_ai';
  ai_profile_id: string | null;
  content_size: number;
}

export interface CreateVersionParams {
  noteId: string;
  userId: string;
  title: string | null;
  content: string;
  tags: Array<{ id: string; name: string }>;
  trigger: 'auto_save' | 'manual' | 'before_ai' | 'after_ai';
  aiProfileId?: string;
}

export interface VersionListItem {
  id: string;
  version_number: number;
  created_at: string;
  snapshot_trigger: string;
  content_size: number;
  ai_profile_id: string | null;
}

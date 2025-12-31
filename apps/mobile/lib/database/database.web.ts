// Web-compatible mock database for testing
// expo-sqlite doesn't work on web, so we provide a no-op implementation

import {
  LocalNote,
  LocalTag,
  LocalAIProfile,
  SyncQueueItem,
  SyncOperation,
  SyncQueueStatus,
} from './schema';
import type { Note, Tag, AIProfile } from '@expandnote/shared/types';

class WebDatabase {
  private notes: Map<string, LocalNote> = new Map();
  private tags: Map<string, LocalTag> = new Map();
  private profiles: Map<string, LocalAIProfile> = new Map();
  private noteTags: Map<string, string[]> = new Map();
  private syncQueue: SyncQueueItem[] = [];
  private metadata: Map<string, string> = new Map();

  async getDb(): Promise<null> {
    return null;
  }

  // ==================== NOTES ====================

  async getAllNotes(userId: string, includeDeleted = false): Promise<LocalNote[]> {
    const notes = Array.from(this.notes.values())
      .filter(n => n.user_id === userId)
      .filter(n => includeDeleted || !n.deleted_at)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return notes;
  }

  async getNoteById(id: string): Promise<LocalNote | null> {
    return this.notes.get(id) ?? null;
  }

  async upsertNote(note: Partial<LocalNote> & { id: string; user_id: string }): Promise<void> {
    const existing = this.notes.get(note.id);
    const now = new Date().toISOString();

    if (existing) {
      this.notes.set(note.id, {
        ...existing,
        ...note,
        updated_at: now,
      });
    } else {
      this.notes.set(note.id, {
        id: note.id,
        user_id: note.user_id,
        title: note.title ?? null,
        content: note.content ?? '',
        created_at: note.created_at ?? now,
        updated_at: now,
        deleted_at: note.deleted_at ?? null,
        is_favorite: note.is_favorite ?? 0,
        is_archived: note.is_archived ?? 0,
        sync_version: note.sync_version ?? 1,
        local_only: note.local_only ?? 1,
      });
    }
  }

  async deleteNote(id: string, permanent = false): Promise<void> {
    if (permanent) {
      this.notes.delete(id);
    } else {
      const note = this.notes.get(id);
      if (note) {
        note.deleted_at = new Date().toISOString();
        note.updated_at = new Date().toISOString();
      }
    }
  }

  // ==================== TAGS ====================

  async getAllTags(userId: string): Promise<LocalTag[]> {
    return Array.from(this.tags.values())
      .filter(t => t.user_id === userId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTagById(id: string): Promise<LocalTag | null> {
    return this.tags.get(id) ?? null;
  }

  async upsertTag(tag: Partial<LocalTag> & { id: string; user_id: string; name: string }): Promise<void> {
    const now = new Date().toISOString();
    this.tags.set(tag.id, {
      id: tag.id,
      user_id: tag.user_id,
      name: tag.name,
      created_at: tag.created_at ?? now,
      local_only: tag.local_only ?? 0,
    });
  }

  async deleteTag(id: string): Promise<void> {
    this.tags.delete(id);
  }

  // ==================== NOTE TAGS ====================

  async getTagsForNote(noteId: string): Promise<LocalTag[]> {
    const tagIds = this.noteTags.get(noteId) ?? [];
    return tagIds
      .map(id => this.tags.get(id))
      .filter((t): t is LocalTag => t !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async setTagsForNote(noteId: string, tagIds: string[]): Promise<void> {
    this.noteTags.set(noteId, tagIds);
  }

  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    const existing = this.noteTags.get(noteId) ?? [];
    if (!existing.includes(tagId)) {
      this.noteTags.set(noteId, [...existing, tagId]);
    }
  }

  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    const existing = this.noteTags.get(noteId) ?? [];
    this.noteTags.set(noteId, existing.filter(id => id !== tagId));
  }

  // ==================== AI PROFILES ====================

  async getAllProfiles(userId: string): Promise<LocalAIProfile[]> {
    return Array.from(this.profiles.values())
      .filter(p => p.user_id === userId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getProfileById(id: string): Promise<LocalAIProfile | null> {
    return this.profiles.get(id) ?? null;
  }

  async upsertProfile(profile: Partial<LocalAIProfile> & { id: string; user_id: string }): Promise<void> {
    const existing = this.profiles.get(profile.id);
    const now = new Date().toISOString();

    if (existing) {
      this.profiles.set(profile.id, {
        ...existing,
        ...profile,
        updated_at: now,
      });
    } else {
      this.profiles.set(profile.id, {
        id: profile.id,
        user_id: profile.user_id,
        name: profile.name ?? 'Untitled Profile',
        tag_id: profile.tag_id ?? null,
        ai_provider: profile.ai_provider ?? 'openai',
        model: profile.model ?? 'gpt-4o',
        system_prompt: profile.system_prompt ?? '',
        user_prompt_template: profile.user_prompt_template ?? '',
        trigger_mode: profile.trigger_mode ?? 'manual',
        output_behavior: profile.output_behavior ?? 'append',
        output_title_template: profile.output_title_template ?? null,
        is_active: profile.is_active ?? 1,
        created_at: profile.created_at ?? now,
        updated_at: now,
        local_only: profile.local_only ?? 1,
      });
    }
  }

  async deleteProfile(id: string): Promise<void> {
    this.profiles.delete(id);
  }

  // ==================== SYNC QUEUE ====================

  async addToSyncQueue(
    operation: SyncOperation,
    tableName: string,
    recordId: string,
    payload: object
  ): Promise<void> {
    this.syncQueue.push({
      id: this.syncQueue.length + 1,
      operation,
      table_name: tableName,
      record_id: recordId,
      payload: JSON.stringify(payload),
      created_at: new Date().toISOString(),
      status: 'pending',
      retry_count: 0,
      last_error: null,
    });
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    return this.syncQueue.filter(item => item.status === 'pending' || item.status === 'failed');
  }

  async updateSyncItemStatus(
    id: number,
    status: SyncQueueStatus,
    error?: string
  ): Promise<void> {
    const item = this.syncQueue.find(i => i.id === id);
    if (item) {
      item.status = status;
      if (error) item.last_error = error;
      if (status === 'failed') item.retry_count++;
    }
  }

  async removeSyncItem(id: number): Promise<void> {
    this.syncQueue = this.syncQueue.filter(item => item.id !== id);
  }

  async clearCompletedSyncItems(): Promise<void> {
    this.syncQueue = this.syncQueue.filter(item => item.status !== 'completed');
  }

  // ==================== SYNC METADATA ====================

  async getSyncMetadata(key: string): Promise<string | null> {
    return this.metadata.get(key) ?? null;
  }

  async setSyncMetadata(key: string, value: string): Promise<void> {
    this.metadata.set(key, value);
  }

  // ==================== BULK OPERATIONS ====================

  async bulkUpsertNotes(notes: Note[]): Promise<void> {
    for (const note of notes) {
      await this.upsertNote({
        id: note.id,
        user_id: note.user_id,
        title: note.title,
        content: note.content,
        created_at: note.created_at,
        updated_at: note.updated_at,
        deleted_at: note.deleted_at,
        is_favorite: note.is_favorite ? 1 : 0,
        is_archived: note.is_archived ? 1 : 0,
        sync_version: note.sync_version,
        local_only: 0,
      });
    }
  }

  async bulkUpsertTags(tags: Tag[]): Promise<void> {
    for (const tag of tags) {
      await this.upsertTag({
        id: tag.id,
        user_id: tag.user_id,
        name: tag.name,
        created_at: tag.created_at,
        local_only: 0,
      });
    }
  }

  async bulkUpsertProfiles(profiles: AIProfile[]): Promise<void> {
    for (const profile of profiles) {
      await this.upsertProfile({
        id: profile.id,
        user_id: profile.user_id,
        name: profile.name,
        tag_id: profile.tag_id,
        ai_provider: profile.ai_provider,
        model: profile.model,
        system_prompt: profile.system_prompt,
        user_prompt_template: profile.user_prompt_template,
        trigger_mode: profile.trigger_mode,
        output_behavior: profile.output_behavior,
        output_title_template: profile.output_title_template,
        is_active: profile.is_active ? 1 : 0,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        local_only: 0,
      });
    }
  }

  // ==================== UTILITY ====================

  async clearAllData(): Promise<void> {
    this.notes.clear();
    this.tags.clear();
    this.profiles.clear();
    this.noteTags.clear();
    this.syncQueue = [];
    this.metadata.clear();
  }

  // Convert local types to shared types
  localNoteToNote(local: LocalNote, tags?: LocalTag[]): Note {
    return {
      id: local.id,
      user_id: local.user_id,
      title: local.title,
      content: local.content,
      created_at: local.created_at,
      updated_at: local.updated_at,
      deleted_at: local.deleted_at,
      is_favorite: local.is_favorite === 1,
      is_archived: local.is_archived === 1,
      sync_version: local.sync_version,
      tags: tags?.map(t => ({
        id: t.id,
        user_id: t.user_id,
        name: t.name,
        created_at: t.created_at,
      })),
    };
  }

  localTagToTag(local: LocalTag): Tag {
    return {
      id: local.id,
      user_id: local.user_id,
      name: local.name,
      created_at: local.created_at,
    };
  }

  localProfileToProfile(local: LocalAIProfile, tag?: LocalTag): AIProfile {
    return {
      id: local.id,
      user_id: local.user_id,
      name: local.name,
      tag_id: local.tag_id ?? '',
      ai_provider: local.ai_provider as AIProfile['ai_provider'],
      model: local.model,
      system_prompt: local.system_prompt,
      user_prompt_template: local.user_prompt_template,
      trigger_mode: local.trigger_mode as AIProfile['trigger_mode'],
      output_behavior: local.output_behavior as AIProfile['output_behavior'],
      output_title_template: local.output_title_template,
      is_active: local.is_active === 1,
      created_at: local.created_at,
      updated_at: local.updated_at,
      tag: tag ? this.localTagToTag(tag) : undefined,
    };
  }
}

// Export singleton instance
export const database = new WebDatabase();

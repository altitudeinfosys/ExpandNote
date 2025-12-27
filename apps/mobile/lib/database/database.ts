import * as SQLite from 'expo-sqlite';
import {
  SCHEMA_VERSION,
  CREATE_TABLES_SQL,
  TABLES,
  LocalNote,
  LocalTag,
  LocalNoteTag,
  LocalAIProfile,
  SyncQueueItem,
  SyncOperation,
  SyncQueueStatus,
} from './schema';
import type { Note, Tag, AIProfile } from '@expandnote/shared/types';

const DB_NAME = 'expandnote.db';

class Database {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
    return this.db!;
  }

  private async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(DB_NAME);

    // Enable foreign keys
    await this.db.execAsync('PRAGMA foreign_keys = ON;');

    // Create tables
    await this.db.execAsync(CREATE_TABLES_SQL);

    // Check and apply migrations
    await this.applyMigrations();
  }

  private async applyMigrations(): Promise<void> {
    const db = this.db!;

    // Get current schema version
    const result = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
    );

    const currentVersion = result?.version ?? 0;

    if (currentVersion < SCHEMA_VERSION) {
      // Apply any pending migrations here in the future
      // For now, just record the schema version
      await db.runAsync(
        'INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, ?)',
        [SCHEMA_VERSION, new Date().toISOString()]
      );
    }
  }

  // ==================== NOTES ====================

  async getAllNotes(userId: string, includeDeleted = false): Promise<LocalNote[]> {
    const db = await this.getDb();
    const query = includeDeleted
      ? 'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC'
      : 'SELECT * FROM notes WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC';

    return await db.getAllAsync<LocalNote>(query, [userId]);
  }

  async getNoteById(id: string): Promise<LocalNote | null> {
    const db = await this.getDb();
    return await db.getFirstAsync<LocalNote>(
      'SELECT * FROM notes WHERE id = ?',
      [id]
    );
  }

  async upsertNote(note: Partial<LocalNote> & { id: string; user_id: string }): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    const existing = await this.getNoteById(note.id);

    if (existing) {
      // Update
      await db.runAsync(
        `UPDATE notes SET
          title = COALESCE(?, title),
          content = COALESCE(?, content),
          updated_at = ?,
          deleted_at = ?,
          is_favorite = COALESCE(?, is_favorite),
          is_archived = COALESCE(?, is_archived),
          sync_version = COALESCE(?, sync_version),
          local_only = COALESCE(?, local_only)
        WHERE id = ?`,
        [
          note.title ?? null,
          note.content ?? '',
          now,
          note.deleted_at ?? null,
          note.is_favorite ?? existing.is_favorite,
          note.is_archived ?? existing.is_archived,
          note.sync_version ?? existing.sync_version,
          note.local_only ?? existing.local_only,
          note.id,
        ]
      );
    } else {
      // Insert
      await db.runAsync(
        `INSERT INTO notes (id, user_id, title, content, created_at, updated_at, deleted_at, is_favorite, is_archived, sync_version, local_only)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          note.id,
          note.user_id,
          note.title ?? null,
          note.content ?? '',
          note.created_at ?? now,
          now,
          note.deleted_at ?? null,
          note.is_favorite ?? 0,
          note.is_archived ?? 0,
          note.sync_version ?? 1,
          note.local_only ?? 1,
        ]
      );
    }
  }

  async deleteNote(id: string, permanent = false): Promise<void> {
    const db = await this.getDb();

    if (permanent) {
      await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    } else {
      await db.runAsync(
        'UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), new Date().toISOString(), id]
      );
    }
  }

  // ==================== TAGS ====================

  async getAllTags(userId: string): Promise<LocalTag[]> {
    const db = await this.getDb();
    return await db.getAllAsync<LocalTag>(
      'SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );
  }

  async getTagById(id: string): Promise<LocalTag | null> {
    const db = await this.getDb();
    return await db.getFirstAsync<LocalTag>(
      'SELECT * FROM tags WHERE id = ?',
      [id]
    );
  }

  async upsertTag(tag: Partial<LocalTag> & { id: string; user_id: string; name: string }): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT OR REPLACE INTO tags (id, user_id, name, created_at, local_only)
       VALUES (?, ?, ?, COALESCE((SELECT created_at FROM tags WHERE id = ?), ?), COALESCE(?, 0))`,
      [tag.id, tag.user_id, tag.name, tag.id, now, tag.local_only ?? 0]
    );
  }

  async deleteTag(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
  }

  // ==================== NOTE TAGS ====================

  async getTagsForNote(noteId: string): Promise<LocalTag[]> {
    const db = await this.getDb();
    return await db.getAllAsync<LocalTag>(
      `SELECT t.* FROM tags t
       INNER JOIN note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = ?
       ORDER BY t.name ASC`,
      [noteId]
    );
  }

  async setTagsForNote(noteId: string, tagIds: string[]): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    // Remove existing tags
    await db.runAsync('DELETE FROM note_tags WHERE note_id = ?', [noteId]);

    // Add new tags
    for (const tagId of tagIds) {
      await db.runAsync(
        'INSERT INTO note_tags (note_id, tag_id, created_at) VALUES (?, ?, ?)',
        [noteId, tagId, now]
      );
    }
  }

  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'INSERT OR IGNORE INTO note_tags (note_id, tag_id, created_at) VALUES (?, ?, ?)',
      [noteId, tagId, new Date().toISOString()]
    );
  }

  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?',
      [noteId, tagId]
    );
  }

  // ==================== AI PROFILES ====================

  async getAllProfiles(userId: string): Promise<LocalAIProfile[]> {
    const db = await this.getDb();
    return await db.getAllAsync<LocalAIProfile>(
      'SELECT * FROM ai_profiles WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );
  }

  async getProfileById(id: string): Promise<LocalAIProfile | null> {
    const db = await this.getDb();
    return await db.getFirstAsync<LocalAIProfile>(
      'SELECT * FROM ai_profiles WHERE id = ?',
      [id]
    );
  }

  async upsertProfile(profile: Partial<LocalAIProfile> & { id: string; user_id: string }): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    const existing = await this.getProfileById(profile.id);

    if (existing) {
      await db.runAsync(
        `UPDATE ai_profiles SET
          name = COALESCE(?, name),
          tag_id = ?,
          ai_provider = COALESCE(?, ai_provider),
          model = COALESCE(?, model),
          system_prompt = COALESCE(?, system_prompt),
          user_prompt_template = COALESCE(?, user_prompt_template),
          trigger_mode = COALESCE(?, trigger_mode),
          output_behavior = COALESCE(?, output_behavior),
          output_title_template = ?,
          is_active = COALESCE(?, is_active),
          updated_at = ?,
          local_only = COALESCE(?, local_only)
        WHERE id = ?`,
        [
          profile.name ?? existing.name,
          profile.tag_id ?? null,
          profile.ai_provider ?? existing.ai_provider,
          profile.model ?? existing.model,
          profile.system_prompt ?? existing.system_prompt,
          profile.user_prompt_template ?? existing.user_prompt_template,
          profile.trigger_mode ?? existing.trigger_mode,
          profile.output_behavior ?? existing.output_behavior,
          profile.output_title_template ?? null,
          profile.is_active ?? existing.is_active,
          now,
          profile.local_only ?? existing.local_only,
          profile.id,
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO ai_profiles (id, user_id, name, tag_id, ai_provider, model, system_prompt, user_prompt_template, trigger_mode, output_behavior, output_title_template, is_active, created_at, updated_at, local_only)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          profile.id,
          profile.user_id,
          profile.name ?? 'Untitled Profile',
          profile.tag_id ?? null,
          profile.ai_provider ?? 'openai',
          profile.model ?? 'gpt-4o',
          profile.system_prompt ?? '',
          profile.user_prompt_template ?? '',
          profile.trigger_mode ?? 'manual',
          profile.output_behavior ?? 'append',
          profile.output_title_template ?? null,
          profile.is_active ?? 1,
          profile.created_at ?? now,
          now,
          profile.local_only ?? 1,
        ]
      );
    }
  }

  async deleteProfile(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM ai_profiles WHERE id = ?', [id]);
  }

  // ==================== SYNC QUEUE ====================

  async addToSyncQueue(
    operation: SyncOperation,
    tableName: string,
    recordId: string,
    payload: object
  ): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT INTO sync_queue (operation, table_name, record_id, payload, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [operation, tableName, recordId, JSON.stringify(payload), new Date().toISOString(), 'pending']
    );
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const db = await this.getDb();
    return await db.getAllAsync<SyncQueueItem>(
      `SELECT * FROM sync_queue
       WHERE status = 'pending' OR status = 'failed'
       ORDER BY created_at ASC`
    );
  }

  async updateSyncItemStatus(
    id: number,
    status: SyncQueueStatus,
    error?: string
  ): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE sync_queue SET
        status = ?,
        last_error = ?,
        retry_count = retry_count + CASE WHEN ? = 'failed' THEN 1 ELSE 0 END
       WHERE id = ?`,
      [status, error ?? null, status, id]
    );
  }

  async removeSyncItem(id: number): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  async clearCompletedSyncItems(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync("DELETE FROM sync_queue WHERE status = 'completed'");
  }

  // ==================== SYNC METADATA ====================

  async getSyncMetadata(key: string): Promise<string | null> {
    const db = await this.getDb();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM sync_metadata WHERE key = ?',
      [key]
    );
    return result?.value ?? null;
  }

  async setSyncMetadata(key: string, value: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
       VALUES (?, ?, ?)`,
      [key, value, new Date().toISOString()]
    );
  }

  // ==================== BULK OPERATIONS ====================

  async bulkUpsertNotes(notes: Note[]): Promise<void> {
    const db = await this.getDb();

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
        local_only: 0, // Synced from server
      });
    }
  }

  async bulkUpsertTags(tags: Tag[]): Promise<void> {
    const db = await this.getDb();

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
    const db = await this.getDb();
    await db.execAsync(`
      DELETE FROM sync_queue;
      DELETE FROM sync_metadata;
      DELETE FROM note_tags;
      DELETE FROM notes;
      DELETE FROM tags;
      DELETE FROM ai_profiles;
    `);
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
export const database = new Database();

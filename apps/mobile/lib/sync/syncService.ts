import * as Network from 'expo-network';
import { database, SyncQueueItem, SyncOperation, TABLES } from '../database';
import { supabase } from '../supabase';
import type { Note, Tag, AIProfile, SyncStatus } from '@expandnote/shared/types';

// Sync status event types
type SyncEventType = 'status_change' | 'sync_complete' | 'sync_error' | 'conflict';
type SyncListener = (event: SyncEventType, data?: unknown) => void;

class SyncService {
  private isOnline = true;
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private networkSubscription: (() => void) | null = null;
  private syncStatus: SyncStatus = 'synced';

  // ==================== INITIALIZATION ====================

  async initialize(): Promise<void> {
    // Check initial network state
    const networkState = await Network.getNetworkStateAsync();
    this.isOnline = networkState.isConnected ?? false;
    this.updateSyncStatus(this.isOnline ? 'synced' : 'offline');

    // Subscribe to network changes
    // Note: expo-network doesn't have event subscription in newer versions
    // We'll poll network state instead or use NetInfo
    this.startNetworkPolling();
  }

  private startNetworkPolling(): void {
    // Poll network state every 5 seconds
    const pollNetwork = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        const wasOffline = !this.isOnline;
        this.isOnline = networkState.isConnected ?? false;

        // If we just came back online, trigger sync
        if (wasOffline && this.isOnline) {
          this.updateSyncStatus('syncing');
          await this.processSyncQueue();
        } else if (!this.isOnline) {
          this.updateSyncStatus('offline');
        }
      } catch (error) {
        console.error('Network polling error:', error);
      }
    };

    // Initial poll
    pollNetwork();

    // Set up interval
    setInterval(pollNetwork, 5000);
  }

  // ==================== STATUS MANAGEMENT ====================

  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  private updateSyncStatus(status: SyncStatus): void {
    if (this.syncStatus !== status) {
      this.syncStatus = status;
      this.emit('status_change', status);
    }
  }

  // ==================== LISTENERS ====================

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SyncEventType, data?: unknown): void {
    this.listeners.forEach(listener => listener(event, data));
  }

  // ==================== QUEUE OPERATIONS ====================

  async queueCreate<T extends { id: string }>(
    tableName: string,
    record: T
  ): Promise<void> {
    await database.addToSyncQueue('create', tableName, record.id, record);

    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  async queueUpdate<T extends { id: string }>(
    tableName: string,
    record: T
  ): Promise<void> {
    await database.addToSyncQueue('update', tableName, record.id, record);

    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  async queueDelete(tableName: string, recordId: string): Promise<void> {
    await database.addToSyncQueue('delete', tableName, recordId, { id: recordId });

    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  // ==================== SYNC PROCESSING ====================

  async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.updateSyncStatus('syncing');

    try {
      const pendingItems = await database.getPendingSyncItems();

      if (pendingItems.length === 0) {
        this.updateSyncStatus('synced');
        this.isSyncing = false;
        return;
      }

      let hasErrors = false;

      for (const item of pendingItems) {
        try {
          await this.processQueueItem(item);
          await database.removeSyncItem(item.id);
        } catch (error) {
          hasErrors = true;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Check for conflict
          if (errorMessage.includes('conflict') || errorMessage.includes('version')) {
            this.emit('conflict', { item, error: errorMessage });
          }

          await database.updateSyncItemStatus(item.id, 'failed', errorMessage);
          console.error('Sync item failed:', item.id, errorMessage);
        }
      }

      this.updateSyncStatus(hasErrors ? 'pending' : 'synced');
      this.emit('sync_complete', { hasErrors });
    } catch (error) {
      console.error('Sync queue processing failed:', error);
      this.updateSyncStatus('pending');
      this.emit('sync_error', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    const payload = JSON.parse(item.payload);

    switch (item.table_name) {
      case TABLES.NOTES:
        await this.syncNote(item.operation, payload);
        break;
      case TABLES.TAGS:
        await this.syncTag(item.operation, payload);
        break;
      case TABLES.AI_PROFILES:
        await this.syncProfile(item.operation, payload);
        break;
      case TABLES.NOTE_TAGS:
        await this.syncNoteTag(item.operation, payload);
        break;
      default:
        console.warn('Unknown table in sync queue:', item.table_name);
    }
  }

  // ==================== TABLE-SPECIFIC SYNC ====================

  private async syncNote(operation: SyncOperation, payload: Partial<Note> & { id: string }): Promise<void> {
    switch (operation) {
      case 'create':
        const { error: createError } = await supabase
          .from('notes')
          .insert({
            id: payload.id,
            user_id: payload.user_id,
            title: payload.title,
            content: payload.content,
            created_at: payload.created_at,
            updated_at: payload.updated_at,
            is_favorite: payload.is_favorite,
            is_archived: payload.is_archived,
            sync_version: 1,
          });
        if (createError) throw new Error(createError.message);

        // Mark as synced in local db
        await database.upsertNote({
          id: payload.id,
          user_id: payload.user_id!,
          local_only: 0,
        });
        break;

      case 'update':
        // Check for conflicts using sync_version
        const { data: serverNote } = await supabase
          .from('notes')
          .select('sync_version')
          .eq('id', payload.id)
          .single();

        if (serverNote && payload.sync_version && serverNote.sync_version > payload.sync_version) {
          throw new Error('conflict: server version is newer');
        }

        const { error: updateError } = await supabase
          .from('notes')
          .update({
            title: payload.title,
            content: payload.content,
            updated_at: payload.updated_at,
            deleted_at: payload.deleted_at,
            is_favorite: payload.is_favorite,
            is_archived: payload.is_archived,
            sync_version: (payload.sync_version ?? 1) + 1,
          })
          .eq('id', payload.id);
        if (updateError) throw new Error(updateError.message);

        // Update local sync version
        await database.upsertNote({
          id: payload.id,
          user_id: payload.user_id!,
          sync_version: (payload.sync_version ?? 1) + 1,
          local_only: 0,
        });
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('notes')
          .delete()
          .eq('id', payload.id);
        if (deleteError) throw new Error(deleteError.message);
        break;
    }
  }

  private async syncTag(operation: SyncOperation, payload: Partial<Tag> & { id: string }): Promise<void> {
    switch (operation) {
      case 'create':
        const { error: createError } = await supabase
          .from('tags')
          .insert({
            id: payload.id,
            user_id: payload.user_id,
            name: payload.name,
            created_at: payload.created_at,
          });
        if (createError) throw new Error(createError.message);

        await database.upsertTag({
          id: payload.id,
          user_id: payload.user_id!,
          name: payload.name!,
          local_only: 0,
        });
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from('tags')
          .update({ name: payload.name })
          .eq('id', payload.id);
        if (updateError) throw new Error(updateError.message);
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('tags')
          .delete()
          .eq('id', payload.id);
        if (deleteError) throw new Error(deleteError.message);
        break;
    }
  }

  private async syncProfile(operation: SyncOperation, payload: Partial<AIProfile> & { id: string }): Promise<void> {
    switch (operation) {
      case 'create':
        const { error: createError } = await supabase
          .from('ai_profiles')
          .insert({
            id: payload.id,
            user_id: payload.user_id,
            name: payload.name,
            tag_id: payload.tag_id,
            ai_provider: payload.ai_provider,
            model: payload.model,
            system_prompt: payload.system_prompt,
            user_prompt_template: payload.user_prompt_template,
            trigger_mode: payload.trigger_mode,
            output_behavior: payload.output_behavior,
            output_title_template: payload.output_title_template,
            is_active: payload.is_active,
            created_at: payload.created_at,
            updated_at: payload.updated_at,
          });
        if (createError) throw new Error(createError.message);

        await database.upsertProfile({
          id: payload.id,
          user_id: payload.user_id!,
          local_only: 0,
        });
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from('ai_profiles')
          .update({
            name: payload.name,
            tag_id: payload.tag_id,
            ai_provider: payload.ai_provider,
            model: payload.model,
            system_prompt: payload.system_prompt,
            user_prompt_template: payload.user_prompt_template,
            trigger_mode: payload.trigger_mode,
            output_behavior: payload.output_behavior,
            output_title_template: payload.output_title_template,
            is_active: payload.is_active,
            updated_at: payload.updated_at,
          })
          .eq('id', payload.id);
        if (updateError) throw new Error(updateError.message);
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('ai_profiles')
          .delete()
          .eq('id', payload.id);
        if (deleteError) throw new Error(deleteError.message);
        break;
    }
  }

  private async syncNoteTag(
    operation: SyncOperation,
    payload: { note_id: string; tag_id: string }
  ): Promise<void> {
    switch (operation) {
      case 'create':
        const { error: createError } = await supabase
          .from('note_tags')
          .insert({
            note_id: payload.note_id,
            tag_id: payload.tag_id,
          });
        if (createError && !createError.message.includes('duplicate')) {
          throw new Error(createError.message);
        }
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('note_tags')
          .delete()
          .eq('note_id', payload.note_id)
          .eq('tag_id', payload.tag_id);
        if (deleteError) throw new Error(deleteError.message);
        break;
    }
  }

  // ==================== FULL SYNC (PULL FROM SERVER) ====================

  async pullFromServer(userId: string): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot pull while offline');
    }

    this.updateSyncStatus('syncing');

    try {
      // Get last sync time
      const lastSync = await database.getSyncMetadata('last_full_sync');
      const lastSyncTime = lastSync ? new Date(lastSync) : new Date(0);

      // Fetch notes updated since last sync
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', lastSyncTime.toISOString());

      if (notesError) throw new Error(notesError.message);
      if (notes) await database.bulkUpsertNotes(notes);

      // Fetch tags
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId);

      if (tagsError) throw new Error(tagsError.message);
      if (tags) await database.bulkUpsertTags(tags);

      // Fetch note_tags for all notes
      if (notes && notes.length > 0) {
        const noteIds = notes.map(n => n.id);
        const { data: noteTags, error: noteTagsError } = await supabase
          .from('note_tags')
          .select('*')
          .in('note_id', noteIds);

        if (!noteTagsError && noteTags) {
          // Group tags by note
          for (const note of notes) {
            const tagIds = noteTags
              .filter(nt => nt.note_id === note.id)
              .map(nt => nt.tag_id);
            await database.setTagsForNote(note.id, tagIds);
          }
        }
      }

      // Fetch AI profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('ai_profiles')
        .select('*')
        .eq('user_id', userId);

      if (profilesError) throw new Error(profilesError.message);
      if (profiles) await database.bulkUpsertProfiles(profiles);

      // Update last sync time
      await database.setSyncMetadata('last_full_sync', new Date().toISOString());

      // Process any pending local changes
      await this.processSyncQueue();

      this.updateSyncStatus('synced');
    } catch (error) {
      console.error('Pull from server failed:', error);
      this.updateSyncStatus('pending');
      throw error;
    }
  }

  // ==================== CLEANUP ====================

  destroy(): void {
    if (this.networkSubscription) {
      this.networkSubscription();
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const syncService = new SyncService();

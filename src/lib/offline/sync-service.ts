/**
 * Synchronization Service
 *
 * This module handles synchronization between the local IndexedDB database
 * and the remote Supabase backend.
 */

import { createClient } from '@supabase/supabase-js';
import { Note, Tag, SyncStatus } from '@/types';
import * as db from './db';
import * as noteOps from './notes';
import * as tagOps from './tags';
import {
  getPendingSyncItems,
  updateSyncItemStatus,
  cleanupCompletedSyncItems,
  SyncOperation,
  SyncQueueItem
} from './sync-queue';
import { config } from '@/lib/config';

// Create a Supabase client for the sync service
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Sync status tracking
let isSyncing = false;
let lastSyncTime: string | null = null;
let networkStatus: 'online' | 'offline' = 'online';
let syncListeners: ((status: SyncStatus) => void)[] = [];

/**
 * Initialize the sync service
 */
export function initSyncService() {
  // Set up network status monitoring
  if (typeof window !== 'undefined') {
    // Initialize network status
    networkStatus = navigator.onLine ? 'online' : 'offline';

    // Listen for network status changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Try to get last sync time from IndexedDB
    getLastSyncTime().then(time => {
      lastSyncTime = time;
    });

    // If we're online, try to sync immediately
    if (networkStatus === 'online') {
      syncWithServer();
    }
  }
}

/**
 * Clean up sync service (remove event listeners)
 */
export function cleanupSyncService() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }
}

/**
 * Handle when the device comes online
 */
function handleOnline() {
  networkStatus = 'online';
  console.log('Device is online. Starting sync...');
  notifySyncListeners('syncing');
  syncWithServer();
}

/**
 * Handle when the device goes offline
 */
function handleOffline() {
  networkStatus = 'offline';
  console.log('Device is offline. Sync paused.');
  notifySyncListeners('offline');
}

/**
 * Add a listener for sync status changes
 */
export function addSyncListener(callback: (status: SyncStatus) => void) {
  syncListeners.push(callback);
}

/**
 * Remove a sync status listener
 */
export function removeSyncListener(callback: (status: SyncStatus) => void) {
  syncListeners = syncListeners.filter(listener => listener !== callback);
}

/**
 * Notify all listeners of a sync status change
 */
function notifySyncListeners(status: SyncStatus) {
  syncListeners.forEach(listener => listener(status));
}

/**
 * Get the last sync time from IndexedDB
 */
async function getLastSyncTime(): Promise<string | null> {
  try {
    const meta = await db.getById<{ key: string, value: string }>(
      db.STORES.META,
      'lastSyncTime'
    );
    return meta ? meta.value : null;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
}

/**
 * Set the last sync time in IndexedDB
 */
async function setLastSyncTime(time: string): Promise<void> {
  try {
    await db.put(db.STORES.META, {
      key: 'lastSyncTime',
      value: time
    });
    lastSyncTime = time;
  } catch (error) {
    console.error('Error setting last sync time:', error);
  }
}

/**
 * Check if we have an active session
 */
async function getActiveSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return null;
  }
  return data.session;
}

/**
 * Synchronize data with the server
 */
export async function syncWithServer(): Promise<boolean> {
  // Don't sync if we're offline or already syncing
  if (networkStatus === 'offline' || isSyncing) {
    return false;
  }

  try {
    isSyncing = true;
    notifySyncListeners('syncing');

    // Check if we have an active session
    const session = await getActiveSession();
    if (!session) {
      notifySyncListeners('offline');
      console.log('No active session. Sync aborted.');
      return false;
    }

    const userId = session.user.id;
    const now = new Date().toISOString();

    // 1. Process the sync queue (push changes to server)
    await processSyncQueue(userId);

    // 2. Pull changes from server (notes)
    const notesToSync = await fetchNotesFromServer(userId, lastSyncTime);
    if (notesToSync.length > 0) {
      await noteOps.bulkImportNotes(notesToSync);
      console.log(`Synced ${notesToSync.length} notes from server`);
    }

    // 3. Pull changes from server (tags)
    const tagsToSync = await fetchTagsFromServer(userId, lastSyncTime);
    if (tagsToSync.length > 0) {
      await tagOps.bulkImportTags(tagsToSync);
      console.log(`Synced ${tagsToSync.length} tags from server`);
    }

    // 4. Update last sync time
    await setLastSyncTime(now);

    // 5. Clean up completed sync items
    await cleanupCompletedSyncItems();

    console.log('Sync completed successfully at', now);
    notifySyncListeners('synced');
    return true;
  } catch (error) {
    console.error('Sync failed:', error);
    notifySyncListeners('conflict');
    return false;
  } finally {
    isSyncing = false;
  }
}

/**
 * Process the sync queue (push changes to server)
 */
async function processSyncQueue(userId: string): Promise<void> {
  // Get all pending sync items
  const pendingItems = await getPendingSyncItems();
  if (pendingItems.length === 0) {
    return;
  }

  console.log(`Processing ${pendingItems.length} pending sync items`);

  // Process each item
  for (const item of pendingItems) {
    try {
      await processSyncItem(item, userId);
      await updateSyncItemStatus(item.id!, 'completed');
    } catch (error) {
      console.error(`Error processing sync item ${item.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateSyncItemStatus(item.id!, 'failed', errorMessage);
    }
  }
}

/**
 * Process a single sync queue item
 */
async function processSyncItem(item: SyncQueueItem, userId: string): Promise<void> {
  // Make sure data belongs to current user
  if (item.data && item.data.user_id && item.data.user_id !== userId) {
    throw new Error('Cannot sync data for another user');
  }

  switch (item.entity_type) {
    case db.STORES.NOTES:
      await syncNoteItem(item);
      break;
    case db.STORES.TAGS:
      await syncTagItem(item);
      break;
    case db.STORES.NOTE_TAGS:
      await syncNoteTagItem(item);
      break;
    default:
      console.warn(`Unknown entity type: ${item.entity_type}`);
  }
}

/**
 * Sync a note item
 */
async function syncNoteItem(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case SyncOperation.CREATE:
    case SyncOperation.UPDATE: {
      const { id, user_id, title, content, is_favorite, sync_version, deleted_at } = item.data;
      const { error } = await supabase
        .from('notes')
        .upsert({
          id,
          user_id,
          title,
          content,
          is_favorite,
          sync_version: ((sync_version as number) || 0) + 1,
          deleted_at
        });

      if (error) throw new Error(`Failed to upsert note: ${error.message}`);
      break;
    }
    case SyncOperation.DELETE: {
      const { id } = item.data;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('notes')
        .update({
          deleted_at: now,
          updated_at: now
        })
        .eq('id', id);

      if (error) throw new Error(`Failed to delete note: ${error.message}`);
      break;
    }
  }
}

/**
 * Sync a tag item
 */
async function syncTagItem(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case SyncOperation.CREATE:
    case SyncOperation.UPDATE: {
      const { id, user_id, name } = item.data;
      const { error } = await supabase
        .from('tags')
        .upsert({
          id,
          user_id,
          name
        });

      if (error) throw new Error(`Failed to upsert tag: ${error.message}`);
      break;
    }
    case SyncOperation.DELETE: {
      const { id } = item.data;

      // First delete all note_tags relationships
      const { error: ntError } = await supabase
        .from('note_tags')
        .delete()
        .eq('tag_id', id);

      if (ntError) throw new Error(`Failed to delete note_tags: ${ntError.message}`);

      // Then delete the tag
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Failed to delete tag: ${error.message}`);
      break;
    }
  }
}

/**
 * Sync a note-tag relationship item
 */
async function syncNoteTagItem(item: SyncQueueItem): Promise<void> {
  switch (item.operation) {
    case SyncOperation.CREATE: {
      const { note_id, tag_id, created_at } = item.data;
      const { error } = await supabase
        .from('note_tags')
        .upsert({
          note_id,
          tag_id,
          created_at
        });

      if (error) throw new Error(`Failed to create note-tag: ${error.message}`);
      break;
    }
    case SyncOperation.DELETE: {
      const { note_id, tag_id } = item.data;
      const { error } = await supabase
        .from('note_tags')
        .delete()
        .eq('note_id', note_id)
        .eq('tag_id', tag_id);

      if (error) throw new Error(`Failed to delete note-tag: ${error.message}`);
      break;
    }
  }
}

/**
 * Fetch notes from server that have been updated since the last sync
 */
async function fetchNotesFromServer(userId: string, since: string | null): Promise<Note[]> {
  let query = supabase
    .from('notes')
    .select('*, tags:note_tags(tag:tags(*))')
    .eq('user_id', userId);

  if (since) {
    query = query.gt('updated_at', since);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch notes from server: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch tags from server that have been updated since the last sync
 */
async function fetchTagsFromServer(userId: string, since: string | null): Promise<Tag[]> {
  let query = supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId);

  if (since) {
    query = query.gt('created_at', since);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch tags from server: ${error.message}`);
  }

  return data || [];
}
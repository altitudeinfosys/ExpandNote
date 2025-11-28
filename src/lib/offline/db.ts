/**
 * IndexedDB Setup and Core Utilities
 *
 * This module handles the initialization and connection to IndexedDB
 * for offline data storage in ExpandNote.
 */

import { Note, Tag, SyncStatus } from '@/types';

// Database configuration
const DB_NAME = 'expandnote_db';
const DB_VERSION = 2;

// Store (table) names
export const STORES = {
  NOTES: 'notes',
  TAGS: 'tags',
  NOTE_TAGS: 'note_tags',
  SYNC_QUEUE: 'sync_queue',
  META: 'meta'
};

// IndexedDB connection
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the IndexedDB database
 */
export function initDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      // Check for IndexedDB support
      if (!('indexedDB' in window)) {
        reject(new Error('This browser doesn\'t support IndexedDB'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Handle database upgrade (called when DB is first created or version changes)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;

        // Version 1: Initial schema
        if (oldVersion < 1) {
          // Create Notes store
          if (!db.objectStoreNames.contains(STORES.NOTES)) {
            const notesStore = db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
            notesStore.createIndex('user_id', 'user_id', { unique: false });
            notesStore.createIndex('updated_at', 'updated_at', { unique: false });
            notesStore.createIndex('deleted_at', 'deleted_at', { unique: false });
            notesStore.createIndex('sync_version', 'sync_version', { unique: false });
            notesStore.createIndex('is_archived', 'is_archived', { unique: false });
          }
        }

        // Version 2: Add is_archived index for existing databases
        if (oldVersion >= 1 && oldVersion < 2) {
          const notesStore = transaction.objectStore(STORES.NOTES);
          if (!notesStore.indexNames.contains('is_archived')) {
            notesStore.createIndex('is_archived', 'is_archived', { unique: false });
          }
        }

        // Create Tags store
        if (!db.objectStoreNames.contains(STORES.TAGS)) {
          const tagsStore = db.createObjectStore(STORES.TAGS, { keyPath: 'id' });
          tagsStore.createIndex('user_id', 'user_id', { unique: false });
          tagsStore.createIndex('name', 'name', { unique: false });
        }

        // Create Note-Tags store (for many-to-many relationship)
        if (!db.objectStoreNames.contains(STORES.NOTE_TAGS)) {
          const noteTagsStore = db.createObjectStore(STORES.NOTE_TAGS, {
            keyPath: ['note_id', 'tag_id']
          });
          noteTagsStore.createIndex('note_id', 'note_id', { unique: false });
          noteTagsStore.createIndex('tag_id', 'tag_id', { unique: false });
        }

        // Create Sync Queue store (for offline changes that need to be synced)
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncQueueStore = db.createObjectStore(STORES.SYNC_QUEUE, {
            keyPath: 'id',
            autoIncrement: true
          });
          syncQueueStore.createIndex('entity_type', 'entity_type', { unique: false });
          syncQueueStore.createIndex('entity_id', 'entity_id', { unique: false });
          syncQueueStore.createIndex('operation', 'operation', { unique: false });
          syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncQueueStore.createIndex('status', 'status', { unique: false });
        }

        // Create Meta store (for app metadata, sync timestamps, etc.)
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: 'key' });
        }
      };

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  return dbPromise;
}

/**
 * Generic transaction executor for database operations
 */
async function executeTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await initDB();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    const request = callback(store);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get all items from a store
 */
export async function getAll<T>(storeName: string): Promise<T[]> {
  return executeTransaction<T[]>(storeName, 'readonly', (store) => {
    return store.getAll();
  });
}

/**
 * Get an item by id from a store
 */
export async function getById<T>(storeName: string, id: IDBValidKey): Promise<T | null> {
  return executeTransaction<T | null>(storeName, 'readonly', (store) => {
    return store.get(id);
  });
}

/**
 * Add or update an item in a store
 */
export async function put<T>(storeName: string, item: T): Promise<IDBValidKey> {
  return executeTransaction<IDBValidKey>(storeName, 'readwrite', (store) => {
    return store.put(item);
  });
}

/**
 * Delete an item from a store
 */
export async function del(storeName: string, key: IDBValidKey): Promise<void> {
  await executeTransaction<undefined>(storeName, 'readwrite', (store) => {
    return store.delete(key);
  });
}

/**
 * Clear all items from a store
 */
export async function clear(storeName: string): Promise<void> {
  await executeTransaction<undefined>(storeName, 'readwrite', (store) => {
    return store.clear();
  });
}

/**
 * Check if database connection is available
 */
export async function isDBAvailable(): Promise<boolean> {
  try {
    await initDB();
    return true;
  } catch (error) {
    console.error('IndexedDB not available:', error);
    return false;
  }
}
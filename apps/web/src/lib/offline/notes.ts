/**
 * Notes IndexedDB Operations
 *
 * This module provides functions for handling note CRUD operations with IndexedDB.
 */

import { Note, SyncStatus } from '@/types';
import * as db from './db';
import { addToSyncQueue, SyncOperation } from './sync-queue';

/**
 * Fetches all notes for a user from IndexedDB
 */
export async function getAllNotes(userId: string): Promise<Note[]> {
  try {
    const allNotes = await db.getAll<Note>(db.STORES.NOTES);

    // Filter notes by user_id and not deleted
    return allNotes.filter(note =>
      note.user_id === userId &&
      !note.deleted_at
    );
  } catch (error) {
    console.error('Error fetching notes from IndexedDB:', error);
    throw new Error('Failed to fetch notes from local storage');
  }
}

/**
 * Fetches a single note by ID from IndexedDB
 */
export async function getNoteById(noteId: string): Promise<Note | null> {
  try {
    return await db.getById<Note>(db.STORES.NOTES, noteId);
  } catch (error) {
    console.error('Error fetching note from IndexedDB:', error);
    throw new Error('Failed to fetch note from local storage');
  }
}

/**
 * Adds or updates a note in IndexedDB
 */
export async function saveNote(note: Note, addToQueue: boolean = true): Promise<Note> {
  try {
    // Set local timestamp for sorting and display
    const now = new Date().toISOString();
    const updatedNote = {
      ...note,
      updated_at: now,
      syncStatus: 'pending' as SyncStatus
    };

    // Save to IndexedDB
    await db.put(db.STORES.NOTES, updatedNote);

    // Add to sync queue if needed
    if (addToQueue) {
      const operation = note.id ? SyncOperation.UPDATE : SyncOperation.CREATE;
      await addToSyncQueue({
        entity_type: db.STORES.NOTES,
        entity_id: note.id,
        operation,
        data: updatedNote,
        timestamp: now,
        status: 'pending'
      });
    }

    return updatedNote;
  } catch (error) {
    console.error('Error saving note to IndexedDB:', error);
    throw new Error('Failed to save note to local storage');
  }
}

/**
 * Soft deletes a note in IndexedDB
 */
export async function deleteNote(noteId: string, userId: string): Promise<void> {
  try {
    // Get the note first
    const note = await getNoteById(noteId);

    if (note && note.user_id === userId) {
      const now = new Date().toISOString();
      const updatedNote = {
        ...note,
        deleted_at: now,
        updated_at: now,
        syncStatus: 'pending' as SyncStatus
      };

      // Update in IndexedDB (soft delete)
      await db.put(db.STORES.NOTES, updatedNote);

      // Add to sync queue
      await addToSyncQueue({
        entity_type: db.STORES.NOTES,
        entity_id: noteId,
        operation: SyncOperation.DELETE,
        data: { id: noteId },
        timestamp: now,
        status: 'pending'
      });
    }
  } catch (error) {
    console.error('Error deleting note from IndexedDB:', error);
    throw new Error('Failed to delete note from local storage');
  }
}

/**
 * Bulk import notes into IndexedDB (used for syncing from server)
 */
export async function bulkImportNotes(notes: Note[]): Promise<void> {
  try {
    // Open transaction for all notes at once
    const database = await db.initDB();
    const transaction = database.transaction(db.STORES.NOTES, 'readwrite');
    const store = transaction.objectStore(db.STORES.NOTES);

    // Add each note to the transaction
    for (const note of notes) {
      const updatedNote = {
        ...note,
        syncStatus: 'synced' as SyncStatus
      };
      store.put(updatedNote);
    }

    // Wait for transaction to complete
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error bulk importing notes to IndexedDB:', error);
    throw new Error('Failed to import notes to local storage');
  }
}
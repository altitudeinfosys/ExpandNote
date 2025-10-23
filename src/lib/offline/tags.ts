/**
 * Tags IndexedDB Operations
 *
 * This module provides functions for handling tag CRUD operations with IndexedDB.
 */

import { Tag } from '@/types';
import * as db from './db';
import { addToSyncQueue, SyncOperation } from './sync-queue';

/**
 * Fetches all tags for a user from IndexedDB
 */
export async function getAllTags(userId: string): Promise<Tag[]> {
  try {
    const allTags = await db.getAll<Tag>(db.STORES.TAGS);

    // Filter tags by user_id
    return allTags.filter(tag => tag.user_id === userId);
  } catch (error) {
    console.error('Error fetching tags from IndexedDB:', error);
    throw new Error('Failed to fetch tags from local storage');
  }
}

/**
 * Fetches a single tag by ID from IndexedDB
 */
export async function getTagById(tagId: string): Promise<Tag | null> {
  try {
    return await db.getById<Tag>(db.STORES.TAGS, tagId);
  } catch (error) {
    console.error('Error fetching tag from IndexedDB:', error);
    throw new Error('Failed to fetch tag from local storage');
  }
}

/**
 * Adds or updates a tag in IndexedDB
 */
export async function saveTag(tag: Tag, addToQueue: boolean = true): Promise<Tag> {
  try {
    // Save to IndexedDB
    await db.put(db.STORES.TAGS, tag);

    // Add to sync queue if needed
    if (addToQueue) {
      const operation = tag.id ? SyncOperation.UPDATE : SyncOperation.CREATE;
      await addToSyncQueue({
        entity_type: db.STORES.TAGS,
        entity_id: tag.id,
        operation,
        data: tag as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
        status: 'pending'
      });
    }

    return tag;
  } catch (error) {
    console.error('Error saving tag to IndexedDB:', error);
    throw new Error('Failed to save tag to local storage');
  }
}

/**
 * Deletes a tag from IndexedDB
 */
export async function deleteTag(tagId: string, userId: string): Promise<void> {
  try {
    // Get the tag first
    const tag = await getTagById(tagId);

    if (tag && tag.user_id === userId) {
      // Delete from IndexedDB
      await db.del(db.STORES.TAGS, tagId);

      // Add to sync queue
      await addToSyncQueue({
        entity_type: db.STORES.TAGS,
        entity_id: tagId,
        operation: SyncOperation.DELETE,
        data: { id: tagId },
        timestamp: new Date().toISOString(),
        status: 'pending'
      });

      // Also delete any note-tag relationships for this tag
      await deleteNoteTagsByTagId(tagId);
    }
  } catch (error) {
    console.error('Error deleting tag from IndexedDB:', error);
    throw new Error('Failed to delete tag from local storage');
  }
}

/**
 * Bulk import tags into IndexedDB (used for syncing from server)
 */
export async function bulkImportTags(tags: Tag[]): Promise<void> {
  try {
    // Open transaction for all tags at once
    const database = await db.initDB();
    const transaction = database.transaction(db.STORES.TAGS, 'readwrite');
    const store = transaction.objectStore(db.STORES.TAGS);

    // Add each tag to the transaction
    for (const tag of tags) {
      store.put(tag);
    }

    // Wait for transaction to complete
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error bulk importing tags to IndexedDB:', error);
    throw new Error('Failed to import tags to local storage');
  }
}

// Note-Tag relationship functions

export interface NoteTag {
  note_id: string;
  tag_id: string;
  created_at: string;
}

/**
 * Get all tags for a specific note
 */
export async function getTagsForNote(noteId: string): Promise<Tag[]> {
  try {
    // Get all note-tag relationships for this note
    const allNoteTags = await db.getAll<NoteTag>(db.STORES.NOTE_TAGS);
    console.log('[tagOps.getTagsForNote] All note-tags in IndexedDB:', allNoteTags.length);

    const noteTagRelations = allNoteTags.filter(nt => nt.note_id === noteId);
    console.log('[tagOps.getTagsForNote] Note-tag relations for note', {
      noteId,
      relationCount: noteTagRelations.length,
      relations: noteTagRelations
    });

    if (noteTagRelations.length === 0) {
      console.log('[tagOps.getTagsForNote] No tags found for note:', noteId);
      return [];
    }

    // Get the tag IDs
    const tagIds = noteTagRelations.map(nt => nt.tag_id);
    console.log('[tagOps.getTagsForNote] Tag IDs for note:', { noteId, tagIds });

    // Get all tags
    const allTags = await db.getAll<Tag>(db.STORES.TAGS);
    console.log('[tagOps.getTagsForNote] All tags in IndexedDB:', allTags.length);

    // Filter to just the tags for this note
    const noteTags = allTags.filter(tag => tagIds.includes(tag.id));
    console.log('[tagOps.getTagsForNote] Filtered tags for note', {
      noteId,
      tagCount: noteTags.length,
      tags: noteTags.map(t => ({ id: t.id, name: t.name }))
    });

    return noteTags;
  } catch (error) {
    console.error('[tagOps.getTagsForNote] Error fetching tags for note from IndexedDB:', error);
    throw new Error('Failed to fetch tags for note from local storage');
  }
}

/**
 * Save a note-tag relationship
 */
export async function saveNoteTag(
  noteId: string,
  tagId: string,
  addToQueue: boolean = true
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const noteTag: NoteTag = {
      note_id: noteId,
      tag_id: tagId,
      created_at: now
    };

    console.log('[tagOps.saveNoteTag] Saving note-tag relationship', { noteTag });

    // Save to IndexedDB
    await db.put(db.STORES.NOTE_TAGS, noteTag);
    console.log('[tagOps.saveNoteTag] Successfully saved to IndexedDB', { noteId, tagId });

    // Add to sync queue if needed
    if (addToQueue) {
      await addToSyncQueue({
        entity_type: db.STORES.NOTE_TAGS,
        entity_id: `${noteId}-${tagId}`,
        operation: SyncOperation.CREATE,
        data: noteTag as unknown as Record<string, unknown>,
        timestamp: now,
        status: 'pending'
      });
      console.log('[tagOps.saveNoteTag] Added to sync queue', { noteId, tagId });
    }
  } catch (error) {
    console.error('[tagOps.saveNoteTag] Error saving note-tag relationship to IndexedDB:', error);
    throw new Error('Failed to save note-tag relationship to local storage');
  }
}

/**
 * Delete a note-tag relationship
 */
export async function deleteNoteTag(
  noteId: string,
  tagId: string,
  addToQueue: boolean = true
): Promise<void> {
  try {
    // Delete from IndexedDB
    await db.del(db.STORES.NOTE_TAGS, [noteId, tagId]);

    // Add to sync queue if needed
    if (addToQueue) {
      await addToSyncQueue({
        entity_type: db.STORES.NOTE_TAGS,
        entity_id: `${noteId}-${tagId}`,
        operation: SyncOperation.DELETE,
        data: { note_id: noteId, tag_id: tagId },
        timestamp: new Date().toISOString(),
        status: 'pending'
      });
    }
  } catch (error) {
    console.error('Error deleting note-tag relationship from IndexedDB:', error);
    throw new Error('Failed to delete note-tag relationship from local storage');
  }
}

/**
 * Delete all note-tag relationships for a note
 */
export async function deleteNoteTagsByNoteId(noteId: string): Promise<void> {
  try {
    // Get all note-tag relationships for this note
    const allNoteTags = await db.getAll<NoteTag>(db.STORES.NOTE_TAGS);
    const noteTagRelations = allNoteTags.filter(nt => nt.note_id === noteId);

    // Delete each relationship
    for (const nt of noteTagRelations) {
      await deleteNoteTag(nt.note_id, nt.tag_id);
    }
  } catch (error) {
    console.error('Error deleting note-tag relationships from IndexedDB:', error);
    throw new Error('Failed to delete note-tag relationships from local storage');
  }
}

/**
 * Delete all note-tag relationships for a tag
 */
export async function deleteNoteTagsByTagId(tagId: string): Promise<void> {
  try {
    // Get all note-tag relationships for this tag
    const allNoteTags = await db.getAll<NoteTag>(db.STORES.NOTE_TAGS);
    const noteTagRelations = allNoteTags.filter(nt => nt.tag_id === tagId);

    // Delete each relationship
    for (const nt of noteTagRelations) {
      await deleteNoteTag(nt.note_id, nt.tag_id);
    }
  } catch (error) {
    console.error('Error deleting note-tag relationships from IndexedDB:', error);
    throw new Error('Failed to delete note-tag relationships from local storage');
  }
}
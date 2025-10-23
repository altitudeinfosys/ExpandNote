'use client';

import { useCallback, useEffect } from 'react';
import { Tag } from '@/types';
import { useTagsStore } from '@/stores/tagsStore';
import * as tagOps from '@/lib/offline/tags';

export function useOfflineTags(userId: string | null) {
  const {
    tags,
    selectedTagIds,
    isLoading,
    error,
    setTags,
    addTag: addTagToStore,
    updateTag: updateTagInStore,
    deleteTag: deleteTagFromStore,
    toggleTagSelection,
    clearTagSelection,
    setLoading,
    setError,
  } = useTagsStore();

  // Fetch tags from IndexedDB
  const fetchTags = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const offlineTags = await tagOps.getAllTags(userId);
      setTags(offlineTags);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tags';
      setError(errorMessage);
      console.error('Error fetching tags from IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, setLoading, setTags, setError]);

  // Create a new tag
  const createTag = useCallback(async (name: string) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      setLoading(true);

      // Create tag object
      const newTag: Tag = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: name.trim(),
        created_at: new Date().toISOString(),
      };

      // Save to IndexedDB
      const savedTag = await tagOps.saveTag(newTag);

      // Update store
      addTagToStore(savedTag);
      setError(null);

      return savedTag;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tag';
      setError(errorMessage);
      console.error('Error creating tag:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, addTagToStore, setLoading, setError]);

  // Update a tag
  const updateTag = useCallback(async (id: string, name: string) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      setLoading(true);

      // Get existing tag
      const existingTag = await tagOps.getTagById(id);

      if (!existingTag || existingTag.user_id !== userId) {
        throw new Error('Tag not found or access denied');
      }

      // Update tag
      const updatedTag: Tag = {
        ...existingTag,
        name: name.trim(),
      };

      // Save to IndexedDB
      const savedTag = await tagOps.saveTag(updatedTag);

      // Update store
      updateTagInStore(id, savedTag);
      setError(null);

      return savedTag;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tag';
      setError(errorMessage);
      console.error('Error updating tag:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, updateTagInStore, setLoading, setError]);

  // Delete a tag
  const deleteTag = useCallback(async (id: string) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      setLoading(true);

      // Delete from IndexedDB (this also handles note-tag relationships)
      await tagOps.deleteTag(id, userId);

      // Update store
      deleteTagFromStore(id);
      setError(null);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tag';
      setError(errorMessage);
      console.error('Error deleting tag:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, deleteTagFromStore, setLoading, setError]);

  // Get tags for a specific note
  const getTagsForNote = useCallback(async (noteId: string) => {
    try {
      return await tagOps.getTagsForNote(noteId);
    } catch (err) {
      console.error('Error fetching note tags from IndexedDB:', err);
      return [];
    }
  }, []);

  // Update tags for a note
  const updateNoteTags = useCallback(async (noteId: string, tagIds: string[]) => {
    if (!userId) throw new Error('User not authenticated');

    console.log('[useOfflineTags] updateNoteTags called', { noteId, tagIds, userId });

    try {
      // Delete all existing note-tag relationships
      console.log('[useOfflineTags] Deleting existing note-tag relationships for note:', noteId);
      await tagOps.deleteNoteTagsByNoteId(noteId);

      // Add new relationships
      console.log('[useOfflineTags] Adding new note-tag relationships', { noteId, tagIds });
      for (const tagId of tagIds) {
        console.log('[useOfflineTags] Saving note-tag relationship', { noteId, tagId });
        await tagOps.saveNoteTag(noteId, tagId);
      }

      // Return the tags
      console.log('[useOfflineTags] Fetching tags for note after update:', noteId);
      const tags = await tagOps.getTagsForNote(noteId);
      console.log('[useOfflineTags] Tags fetched after update', {
        noteId,
        tags: tags.map(t => ({ id: t.id, name: t.name }))
      });
      return tags;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note tags';
      console.error('[useOfflineTags] Error updating note tags in IndexedDB:', err);
      throw err;
    }
  }, [userId]);

  // Initialize when userId changes
  useEffect(() => {
    if (userId) {
      fetchTags();
    } else {
      setTags([]);
    }
  }, [userId, fetchTags, setTags]);

  return {
    tags,
    selectedTagIds,
    isLoading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    toggleTagSelection,
    clearTagSelection,
    getTagsForNote,
    updateNoteTags,
  };
}
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTagsStore } from '@/stores/tagsStore';
import { Tag } from '@/types';
//import { toast } from 'react-hot-toast'; // We'll add toast notifications later

export function useTags() {
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

  const [isInitialized, setIsInitialized] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tags');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tags');
      }

      const { data } = await response.json();
      setTags(data);
      setError(null);
      setIsInitialized(true);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tags';
      setError(errorMessage);
      console.error('Error fetching tags:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [setLoading, setTags, setError]);

  const createTag = useCallback(async (name: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tag');
      }

      const { data } = await response.json();
      addTagToStore(data);
      setError(null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tag';
      setError(errorMessage);
      console.error('Error creating tag:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addTagToStore, setLoading, setError]);

  const updateTag = useCallback(async (id: string, name: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tag');
      }

      const { data } = await response.json();
      updateTagInStore(id, data);
      setError(null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tag';
      setError(errorMessage);
      console.error('Error updating tag:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateTagInStore, setLoading, setError]);

  const deleteTag = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tag');
      }

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
  }, [deleteTagFromStore, setLoading, setError]);

  const getTagsForNote = useCallback(async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/tags`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch note tags');
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      // Don't log "Note not found" errors as they're expected when a note is being deleted
      if (err instanceof Error && !err.message.includes('Note not found')) {
        console.error('Error fetching note tags:', err);
      }
      return [];
    }
  }, []);

  const updateNoteTags = useCallback(async (noteId: string, tagIds: string[]) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update note tags');
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      // Don't log "Note not found" errors as they're expected when a note is being deleted
      if (err instanceof Error && !err.message.includes('Note not found')) {
        console.error('Error updating note tags:', err);
      }
      //toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Initialize tags on mount
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      fetchTags();
    }
  }, [isInitialized, isLoading, fetchTags]);

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
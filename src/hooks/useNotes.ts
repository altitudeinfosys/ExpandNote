'use client';

import { useCallback, useRef } from 'react';
import { useNotesStore } from '@/stores/notesStore';

export function useNotes() {
  const {
    notes,
    selectedNoteId,
    isLoading,
    error,
    setNotes,
    addNote,
    updateNote,
    deleteNote,
    selectNote,
    setLoading,
    setError,
    clearNotes,
  } = useNotesStore();

  // AbortController ref to cancel in-flight search requests
  const searchAbortControllerRef = useRef<AbortController | null>(null);

  // Fetch all notes
  const fetchNotes = useCallback(async (options?: { showTrash?: boolean; showFavorites?: boolean }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Note: trash and favorites filters are mutually exclusive
      // Priority: Trash > Favorites > All Notes
      // This prevents confusing UX of "favorited trash items"
      if (options?.showTrash && options?.showFavorites) {
        console.warn('[useNotes] Cannot filter by both trash and favorites. Showing trash only.');
      }

      if (options?.showTrash) {
        params.append('trash', 'true');
      } else if (options?.showFavorites) {
        // Only apply favorites filter if not showing trash
        params.append('favorites', 'true');
      }

      const url = params.toString() ? `/api/notes?${params.toString()}` : '/api/notes';
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch notes');
      }

      setNotes(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notes';
      setError(message);
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  }, [setNotes, setLoading, setError]);

  // Create a new note
  const createNote = useCallback(
    async (noteData: {
      title: string | null;
      content: string;
      is_favorite?: boolean;
      tagIds?: string[];
    }) => {
      try {
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create note');
        }

        addNote(result.data);
        return result.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create note';
        setError(message);
        console.error('Error creating note:', err);
        throw err;
      }
    },
    [addNote, setError]
  );

  // Update an existing note
  const updateNoteById = useCallback(
    async (
      noteId: string,
      updates: {
        title?: string | null;
        content?: string;
        is_favorite?: boolean;
        tagIds?: string[];
      }
    ) => {
      try {
        const response = await fetch(`/api/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update note');
        }

        updateNote(noteId, result.data);
        return result.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update note';
        setError(message);
        console.error('Error updating note:', err);
        throw err;
      }
    },
    [updateNote, setError]
  );

  // Delete a note
  const deleteNoteById = useCallback(
    async (noteId: string) => {
      try {
        const response = await fetch(`/api/notes/${noteId}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete note');
        }

        deleteNote(noteId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete note';
        setError(message);
        console.error('Error deleting note:', err);
        throw err;
      }
    },
    [deleteNote, setError]
  );

  // Search notes with optional filters
  const searchNotes = useCallback(
    async (query: string, filters?: { tagIds?: string[] }) => {
      // Cancel any in-flight search request
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }

      // If no query and no tag filters, just fetch all notes
      if (!query.trim() && (!filters?.tagIds || filters.tagIds.length === 0)) {
        searchAbortControllerRef.current = null;
        fetchNotes();
        return;
      }

      // Create new AbortController for this request
      const abortController = new AbortController();
      searchAbortControllerRef.current = abortController;

      setLoading(true);
      setError(null);

      try {
        // Construct search params
        const params = new URLSearchParams();

        // Add query if provided
        if (query.trim()) {
          params.append('q', query);
        }

        // Add tag filters if provided
        if (filters?.tagIds && filters.tagIds.length > 0) {
          filters.tagIds.forEach(id => params.append('tagId', id));
        }

        const response = await fetch(`/api/notes/search?${params.toString()}`, {
          signal: abortController.signal,
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to search notes');
        }

        // Only update state if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setNotes(result.data);
        }
      } catch (err) {
        // Ignore abort errors - they're expected when a new search starts
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to search notes';
        setError(message);
        console.error('Error searching notes:', err);
      } finally {
        // Only clear loading if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setLoading(false);
          searchAbortControllerRef.current = null;
        }
      }
    },
    [fetchNotes, setNotes, setLoading, setError]
  );

  // Get selected note
  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;

  return {
    notes,
    selectedNote,
    selectedNoteId,
    isLoading,
    error,
    fetchNotes,
    createNote,
    updateNoteById,
    deleteNoteById,
    searchNotes,
    selectNote,
    clearNotes,
  };
}

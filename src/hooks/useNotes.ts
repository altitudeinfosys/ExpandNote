'use client';

import { useCallback, useEffect } from 'react';
import { useNotesStore } from '@/stores/notesStore';
import type { Note } from '@/types';

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

  // Fetch all notes
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notes');
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

  // Search notes
  const searchNotes = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        fetchNotes();
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/notes/search?q=${encodeURIComponent(query)}`
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to search notes');
        }

        setNotes(result.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search notes';
        setError(message);
        console.error('Error searching notes:', err);
      } finally {
        setLoading(false);
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

'use client';

import { useCallback, useEffect } from 'react';
import { Note } from '@/types';
import { useNotesStore } from '@/stores/notesStore';
import * as noteOps from '@/lib/offline/notes';
import * as tagOps from '@/lib/offline/tags';
import * as db from '@/lib/offline/db';

export function useOfflineNotes(userId: string | null) {
  const {
    notes,
    selectedNoteId,
    isLoading,
    error,
    setNotes,
    addNote,
    updateNote,
    deleteNote: deleteNoteFromStore,
    selectNote,
    setLoading,
    setError,
    clearNotes,
  } = useNotesStore();

  // Fetch notes from IndexedDB
  const fetchNotes = useCallback(async () => {
    if (!userId) return;

    console.log('[useOfflineNotes] fetchNotes called', { userId });
    setLoading(true);
    setError(null);

    try {
      const offlineNotes = await noteOps.getAllNotes(userId);
      console.log('[useOfflineNotes] Fetched notes from IndexedDB', { count: offlineNotes.length });

      // Fetch tags for each note
      const notesWithTags = await Promise.all(
        offlineNotes.map(async (note) => {
          console.log('[useOfflineNotes] Fetching tags for note:', note.id);
          const tags = await tagOps.getTagsForNote(note.id);
          console.log('[useOfflineNotes] Tags for note', {
            noteId: note.id,
            tagCount: tags.length,
            tags: tags.map(t => ({ id: t.id, name: t.name }))
          });
          return { ...note, tags };
        })
      );

      console.log('[useOfflineNotes] Notes with tags prepared', {
        totalNotes: notesWithTags.length,
        notesWithTags: notesWithTags.map(n => ({
          id: n.id,
          title: n.title,
          tagCount: n.tags?.length || 0
        }))
      });

      setNotes(notesWithTags);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch notes';
      setError(message);
      console.error('[useOfflineNotes] Error fetching notes from IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, setNotes, setLoading, setError]);

  // Create a new note
  const createNote = useCallback(
    async (noteData: {
      title: string | null;
      content: string;
      is_favorite?: boolean;
      tagIds?: string[];
    }) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        // Create a new note object
        const now = new Date().toISOString();
        const newNote: Note = {
          id: crypto.randomUUID(),
          user_id: userId,
          title: noteData.title,
          content: noteData.content,
          is_favorite: noteData.is_favorite || false,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          sync_version: 1,
        };

        // Save to IndexedDB
        const savedNote = await noteOps.saveNote(newNote);

        // Add tags if provided
        if (noteData.tagIds && noteData.tagIds.length > 0) {
          for (const tagId of noteData.tagIds) {
            await tagOps.saveNoteTag(savedNote.id, tagId);
          }

          // Fetch tags to include in the returned note
          const tags = await tagOps.getTagsForNote(savedNote.id);
          savedNote.tags = tags;
        }

        // Update store
        addNote(savedNote);
        return savedNote;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create note';
        setError(message);
        console.error('Error creating note:', err);
        throw new Error(message);
      }
    },
    [userId, addNote, setError]
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
      if (!userId) throw new Error('User not authenticated');

      try {
        // Get current note from IndexedDB
        const existingNote = await noteOps.getNoteById(noteId);

        if (!existingNote || existingNote.user_id !== userId) {
          throw new Error('Note not found or access denied');
        }

        // Update note
        const updatedNote: Note = {
          ...existingNote,
          title: updates.title !== undefined ? updates.title : existingNote.title,
          content: updates.content !== undefined ? updates.content : existingNote.content,
          is_favorite: updates.is_favorite !== undefined ? updates.is_favorite : existingNote.is_favorite,
          updated_at: new Date().toISOString(),
          sync_version: existingNote.sync_version + 1,
        };

        // Save to IndexedDB
        const savedNote = await noteOps.saveNote(updatedNote);

        // Update tags if provided
        if (updates.tagIds !== undefined) {
          // First remove all existing tags
          await tagOps.deleteNoteTagsByNoteId(noteId);

          // Add new tags
          if (updates.tagIds.length > 0) {
            for (const tagId of updates.tagIds) {
              await tagOps.saveNoteTag(noteId, tagId);
            }
          }

          // Fetch updated tags
          const tags = await tagOps.getTagsForNote(noteId);
          savedNote.tags = tags;
        }

        // Update store
        updateNote(noteId, savedNote);
        return savedNote;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update note';
        setError(message);
        console.error('Error updating note:', err);
        throw new Error(message);
      }
    },
    [userId, updateNote, setError]
  );

  // Delete a note
  const deleteNoteById = useCallback(
    async (noteId: string) => {
      if (!userId) throw new Error('User not authenticated');

      try {
        await noteOps.deleteNote(noteId, userId);

        // Remove from store
        deleteNoteFromStore(noteId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete note';
        setError(message);
        console.error('Error deleting note:', err);
        throw new Error(message);
      }
    },
    [userId, deleteNoteFromStore, setError]
  );

  // Search notes locally
  const searchNotes = useCallback(
    async (query: string, filters?: { tagIds?: string[] }) => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        // Get all notes from IndexedDB
        const allNotes = await noteOps.getAllNotes(userId);

        let filteredNotes = allNotes;

        // Filter by search query
        if (query && query.trim()) {
          const searchTerm = query.trim().toLowerCase();
          filteredNotes = filteredNotes.filter(note => {
            return (
              (note.title && note.title.toLowerCase().includes(searchTerm)) ||
              (note.content && note.content.toLowerCase().includes(searchTerm))
            );
          });
        }

        // Filter by tags if provided
        if (filters?.tagIds && filters.tagIds.length > 0) {
          // Get notes for each tag
          const noteIdSets: Set<string>[] = await Promise.all(
            filters.tagIds.map(async (tagId) => {
              const allNoteTags = await db.getAll<tagOps.NoteTag>(db.STORES.NOTE_TAGS);
              const matchingNoteIds = allNoteTags
                .filter(nt => nt.tag_id === tagId)
                .map(nt => nt.note_id);
              return new Set(matchingNoteIds);
            })
          );

          // Only keep notes that have all the requested tags
          if (noteIdSets.length > 0) {
            const commonIds = [...noteIdSets[0]].filter(id =>
              noteIdSets.every(idSet => idSet.has(id))
            );
            filteredNotes = filteredNotes.filter(note => commonIds.includes(note.id));
          }
        }

        // Fetch tags for each note
        const notesWithTags = await Promise.all(
          filteredNotes.map(async (note) => {
            const tags = await tagOps.getTagsForNote(note.id);
            return { ...note, tags };
          })
        );

        setNotes(notesWithTags);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search notes';
        setError(message);
        console.error('Error searching notes:', err);
      } finally {
        setLoading(false);
      }
    },
    [userId, setNotes, setLoading, setError]
  );

  // Initialize when userId changes
  useEffect(() => {
    if (userId) {
      fetchNotes();
    } else {
      clearNotes();
    }
  }, [userId, fetchNotes, clearNotes]);

  // Get selected note
  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;

  // Log the selected note for debugging
  useEffect(() => {
    if (selectedNote) {
      console.log('[useOfflineNotes] Selected note', {
        id: selectedNote.id,
        title: selectedNote.title,
        hasTags: !!selectedNote.tags,
        tagCount: selectedNote.tags?.length || 0,
        tags: selectedNote.tags?.map(t => ({ id: t.id, name: t.name })) || []
      });
    }
  }, [selectedNote]);

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
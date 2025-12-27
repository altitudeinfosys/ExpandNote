import { create } from 'zustand';
import type { Note, SyncStatus } from '@/types';

interface NoteWithSync extends Note {
  syncStatus: SyncStatus;
}

interface NotesState {
  notes: NoteWithSync[];
  selectedNoteId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string | null) => void;
  setSyncStatus: (id: string, status: SyncStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearNotes: () => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  selectedNoteId: null,
  isLoading: false,
  error: null,

  setNotes: (notes) =>
    set({
      notes: notes.map((note) => ({ ...note, syncStatus: 'synced' as SyncStatus })),
    }),

  addNote: (note) =>
    set((state) => ({
      notes: [{ ...note, syncStatus: 'synced' as SyncStatus }, ...state.notes],
    })),

  updateNote: (id, updates) =>
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id
          ? { ...note, ...updates, syncStatus: 'pending' as SyncStatus }
          : note
      ),
    })),

  deleteNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
      selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
    })),

  selectNote: (id) => set({ selectedNoteId: id }),

  setSyncStatus: (id, status) =>
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, syncStatus: status } : note
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearNotes: () => set({ notes: [], selectedNoteId: null, error: null }),
}));

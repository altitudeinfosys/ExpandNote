import { create } from 'zustand';
import type { Tag } from '@/types';

interface TagsState {
  tags: Tag[];
  selectedTagIds: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  toggleTagSelection: (id: string) => void;
  clearTagSelection: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTagsStore = create<TagsState>((set) => ({
  tags: [],
  selectedTagIds: [],
  isLoading: false,
  error: null,

  setTags: (tags) => set({ tags }),

  addTag: (tag) =>
    set((state) => ({
      tags: [...state.tags, tag],
    })),

  updateTag: (id, updates) =>
    set((state) => ({
      tags: state.tags.map((tag) =>
        tag.id === id ? { ...tag, ...updates } : tag
      ),
    })),

  deleteTag: (id) =>
    set((state) => ({
      tags: state.tags.filter((tag) => tag.id !== id),
      selectedTagIds: state.selectedTagIds.filter((tagId) => tagId !== id),
    })),

  toggleTagSelection: (id) =>
    set((state) => ({
      selectedTagIds: state.selectedTagIds.includes(id)
        ? state.selectedTagIds.filter((tagId) => tagId !== id)
        : [...state.selectedTagIds, id],
    })),

  clearTagSelection: () => set({ selectedTagIds: [] }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),
}));

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineStorage } from './useOfflineStorage';
import { useOfflineNotes } from './useOfflineNotes';
import { useOfflineTags } from './useOfflineTags';
import { SyncStatus } from '@/types';

/**
 * Combined hook for offline-first functionality
 *
 * This hook integrates authentication, offline storage, and data synchronization.
 */
export function useOfflineFirst() {
  const { user } = useAuth();
  const {
    isDBAvailable,
    syncStatus,
    error: storageError,
    sync
  } = useOfflineStorage();

  const notesHook = useOfflineNotes(user?.id || null);
  const tagsHook = useOfflineTags(user?.id || null);

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Sync data when the app becomes active
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        sync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, sync]);

  // Trigger a manual sync
  const syncData = useCallback(async () => {
    if (!user) return false;

    const success = await sync();
    if (success) {
      // Refresh data after sync
      await notesHook.fetchNotes();
      await tagsHook.fetchTags();
      setLastSyncTime(new Date());
    }

    return success;
  }, [user, sync, notesHook, tagsHook]);

  // Format sync status for display
  const syncStatusDisplay = useCallback((status: SyncStatus) => {
    switch (status) {
      case 'synced': return 'All changes saved';
      case 'syncing': return 'Syncing...';
      case 'pending': return 'Changes pending';
      case 'offline': return 'Working offline';
      case 'conflict': return 'Sync error';
      default: return '';
    }
  }, []);

  return {
    // Core offline state
    isOfflineEnabled: isDBAvailable,
    syncStatus,
    syncStatusDisplay: syncStatusDisplay(syncStatus),
    lastSyncTime,
    syncError: storageError,
    manualSync: syncData,

    // Note operations
    notes: notesHook.notes,
    selectedNote: notesHook.selectedNote,
    selectedNoteId: notesHook.selectedNoteId,
    notesLoading: notesHook.isLoading,
    notesError: notesHook.error,
    fetchNotes: notesHook.fetchNotes,
    createNote: notesHook.createNote,
    updateNote: notesHook.updateNoteById,
    deleteNote: notesHook.deleteNoteById,
    searchNotes: notesHook.searchNotes,
    selectNote: notesHook.selectNote,

    // Tag operations
    tags: tagsHook.tags,
    selectedTagIds: tagsHook.selectedTagIds,
    tagsLoading: tagsHook.isLoading,
    tagsError: tagsHook.error,
    fetchTags: tagsHook.fetchTags,
    createTag: tagsHook.createTag,
    updateTag: tagsHook.updateTag,
    deleteTag: tagsHook.deleteTag,
    toggleTagSelection: tagsHook.toggleTagSelection,
    clearTagSelection: tagsHook.clearTagSelection,
    getTagsForNote: tagsHook.getTagsForNote,
    updateNoteTags: tagsHook.updateNoteTags,
  };
}
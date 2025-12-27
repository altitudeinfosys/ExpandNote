'use client';

import { useState, useEffect, useCallback } from 'react';
import { SyncStatus } from '@/types';
import * as db from '@/lib/offline/db';
import {
  initSyncService,
  cleanupSyncService,
  syncWithServer,
  addSyncListener,
  removeSyncListener,
} from '@/lib/offline/sync-service';

interface OfflineStorageState {
  isDBAvailable: boolean;
  syncStatus: SyncStatus;
  lastSyncAttempt: Date | null;
  error: Error | null;
}

export function useOfflineStorage() {
  const [state, setState] = useState<OfflineStorageState>({
    isDBAvailable: false,
    syncStatus: 'offline',
    lastSyncAttempt: null,
    error: null,
  });

  // Initialize IndexedDB and sync service
  useEffect(() => {
    let mounted = true;

    const initStorage = async () => {
      try {
        // Check if IndexedDB is available
        const isAvailable = await db.isDBAvailable();

        if (mounted) {
          setState(prev => ({
            ...prev,
            isDBAvailable: isAvailable,
            syncStatus: isAvailable ? 'synced' : 'offline',
          }));
        }

        if (isAvailable) {
          // Initialize the sync service
          initSyncService();
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }
      }
    };

    initStorage();

    // Clean up
    return () => {
      mounted = false;
      cleanupSyncService();
    };
  }, []);

  // Set up sync status listener
  useEffect(() => {
    const handleSyncStatusChange = (status: SyncStatus) => {
      setState(prev => ({
        ...prev,
        syncStatus: status,
        lastSyncAttempt: new Date(),
      }));
    };

    addSyncListener(handleSyncStatusChange);

    return () => {
      removeSyncListener(handleSyncStatusChange);
    };
  }, []);

  // Trigger a manual sync
  const sync = useCallback(async () => {
    if (!state.isDBAvailable) {
      return false;
    }

    setState(prev => ({
      ...prev,
      syncStatus: 'syncing',
      lastSyncAttempt: new Date(),
    }));

    try {
      const success = await syncWithServer();

      setState(prev => ({
        ...prev,
        syncStatus: success ? 'synced' : 'conflict',
        error: success ? null : new Error('Sync failed'),
      }));

      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncStatus: 'conflict',
        error: error instanceof Error ? error : new Error(String(error)),
      }));
      return false;
    }
  }, [state.isDBAvailable]);

  return {
    ...state,
    sync,
  };
}
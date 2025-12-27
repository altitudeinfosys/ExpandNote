import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { syncService } from '@/lib/sync';
import { database } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { SyncStatus } from '@expandnote/shared/types';

export interface ConflictData {
  localVersion: {
    title: string | null;
    content: string;
    updated_at: string;
    sync_version: number;
  };
  serverVersion: {
    title: string | null;
    content: string;
    updated_at: string;
    sync_version: number;
  };
  noteId: string;
}

interface SyncContextType {
  syncStatus: SyncStatus;
  isOnline: boolean;
  lastSyncTime: Date | null;
  triggerSync: () => Promise<void>;
  pullFromServer: () => Promise<void>;
  currentConflict: ConflictData | null;
  resolveConflict: (choice: 'local' | 'server' | 'merge') => Promise<void>;
  dismissConflict: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [currentConflict, setCurrentConflict] = useState<ConflictData | null>(null);

  // Initialize sync service
  useEffect(() => {
    syncService.initialize();

    // Subscribe to sync events
    const unsubscribe = syncService.subscribe((event, data) => {
      switch (event) {
        case 'status_change':
          setSyncStatus(data as SyncStatus);
          setIsOnline(syncService.isNetworkOnline());
          break;
        case 'sync_complete':
          setLastSyncTime(new Date());
          break;
        case 'conflict':
          // Handle conflicts by fetching both versions
          handleConflict(data as { item: { record_id: string }; error: string });
          break;
        case 'sync_error':
          console.error('Sync error:', data);
          break;
      }
    });

    return () => {
      unsubscribe();
      syncService.destroy();
    };
  }, []);

  const handleConflict = async (conflictInfo: { item: { record_id: string }; error: string }) => {
    try {
      const noteId = conflictInfo.item.record_id;

      // Get local version
      const localNote = await database.getNoteById(noteId);
      if (!localNote) return;

      // Get server version
      const { data: serverNote, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error || !serverNote) return;

      setCurrentConflict({
        noteId,
        localVersion: {
          title: localNote.title,
          content: localNote.content,
          updated_at: localNote.updated_at,
          sync_version: localNote.sync_version,
        },
        serverVersion: {
          title: serverNote.title,
          content: serverNote.content,
          updated_at: serverNote.updated_at,
          sync_version: serverNote.sync_version,
        },
      });
    } catch (error) {
      console.error('Error handling conflict:', error);
    }
  };

  // Sync when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user) {
        // Pull latest data when app becomes active
        syncService.processSyncQueue();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user]);

  // Do initial sync when user logs in
  useEffect(() => {
    if (user && isOnline) {
      syncService.pullFromServer(user.id).catch(console.error);
    }
  }, [user?.id, isOnline]);

  const triggerSync = useCallback(async () => {
    await syncService.processSyncQueue();
  }, []);

  const pullFromServer = useCallback(async () => {
    if (user) {
      await syncService.pullFromServer(user.id);
    }
  }, [user]);

  const resolveConflict = useCallback(async (choice: 'local' | 'server' | 'merge') => {
    if (!currentConflict || !user) return;

    const { noteId, localVersion, serverVersion } = currentConflict;
    const now = new Date().toISOString();

    try {
      switch (choice) {
        case 'local':
          // Push local version to server, force override
          const { error: localError } = await supabase
            .from('notes')
            .update({
              title: localVersion.title,
              content: localVersion.content,
              updated_at: now,
              sync_version: serverVersion.sync_version + 1,
            })
            .eq('id', noteId);

          if (localError) throw localError;

          // Update local sync version
          await database.upsertNote({
            id: noteId,
            user_id: user.id,
            sync_version: serverVersion.sync_version + 1,
            local_only: 0,
          });
          break;

        case 'server':
          // Replace local with server version
          await database.upsertNote({
            id: noteId,
            user_id: user.id,
            title: serverVersion.title,
            content: serverVersion.content,
            updated_at: serverVersion.updated_at,
            sync_version: serverVersion.sync_version,
            local_only: 0,
          });
          break;

        case 'merge':
          // Create a duplicate note with local content
          const duplicateId = `${noteId}-local-${Date.now()}`;
          const duplicateTitle = `${localVersion.title || 'Untitled'} (Local Copy)`;

          // Save duplicate locally
          await database.upsertNote({
            id: duplicateId,
            user_id: user.id,
            title: duplicateTitle,
            content: localVersion.content,
            created_at: now,
            updated_at: now,
            is_favorite: 0,
            is_archived: 0,
            sync_version: 1,
            local_only: 1,
          });

          // Update original with server version
          await database.upsertNote({
            id: noteId,
            user_id: user.id,
            title: serverVersion.title,
            content: serverVersion.content,
            updated_at: serverVersion.updated_at,
            sync_version: serverVersion.sync_version,
            local_only: 0,
          });

          // Queue the duplicate for sync
          await syncService.queueCreate('notes', {
            id: duplicateId,
            user_id: user.id,
            title: duplicateTitle,
            content: localVersion.content,
            created_at: now,
            updated_at: now,
            is_favorite: false,
            is_archived: false,
          });
          break;
      }

      setCurrentConflict(null);
      await syncService.processSyncQueue();
    } catch (error) {
      console.error('Error resolving conflict:', error);
    }
  }, [currentConflict, user]);

  const dismissConflict = useCallback(() => {
    setCurrentConflict(null);
  }, []);

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        isOnline,
        lastSyncTime,
        triggerSync,
        pullFromServer,
        currentConflict,
        resolveConflict,
        dismissConflict,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

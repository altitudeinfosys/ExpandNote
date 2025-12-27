import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { notificationService, NotificationData } from '@/lib/notifications';

interface NotificationContextType {
  expoPushToken: string | null;
  isEnabled: boolean;
  requestPermissions: () => Promise<boolean>;
  notifyAIComplete: (profileName: string, noteTitle: string, noteId: string, profileId: string) => Promise<void>;
  notifySyncComplete: (noteCount: number) => Promise<void>;
  notifySyncConflict: (noteTitle: string, noteId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Initialize notifications
    initializeNotifications();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(response);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const initializeNotifications = async () => {
    const token = await notificationService.initialize();
    if (token) {
      setExpoPushToken(token);
      setIsEnabled(true);
    }
  };

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const token = await notificationService.initialize();
    if (token) {
      setExpoPushToken(token);
      setIsEnabled(true);
      return true;
    }
    return false;
  }, []);

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as unknown as NotificationData;

    switch (data.type) {
      case 'ai_complete':
        if (data.noteId) {
          router.push(`/note/${data.noteId}`);
        }
        break;
      case 'sync_conflict':
        if (data.noteId) {
          router.push(`/note/${data.noteId}`);
        }
        break;
      case 'sync_complete':
        // Navigate to notes list
        router.push('/');
        break;
      default:
        break;
    }
  };

  const notifyAIComplete = useCallback(
    async (profileName: string, noteTitle: string, noteId: string, profileId: string) => {
      if (isEnabled) {
        await notificationService.notifyAIComplete(profileName, noteTitle, noteId, profileId);
      }
    },
    [isEnabled]
  );

  const notifySyncComplete = useCallback(
    async (noteCount: number) => {
      if (isEnabled && noteCount > 0) {
        await notificationService.notifySyncComplete(noteCount);
      }
    },
    [isEnabled]
  );

  const notifySyncConflict = useCallback(
    async (noteTitle: string, noteId: string) => {
      if (isEnabled) {
        await notificationService.notifySyncConflict(noteTitle, noteId);
      }
    },
    [isEnabled]
  );

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        isEnabled,
        requestPermissions,
        notifyAIComplete,
        notifySyncComplete,
        notifySyncConflict,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

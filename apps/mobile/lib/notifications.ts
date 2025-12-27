import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'ai_complete' | 'sync_complete' | 'sync_conflict' | 'general';
  noteId?: string;
  profileId?: string;
  title?: string;
  [key: string]: unknown;
}

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Initialize notifications and request permissions
   */
  async initialize(): Promise<string | null> {
    // Must use physical device for push notifications
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return null;
    }

    // Get push token
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      this.expoPushToken = token.data;

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
        });

        await Notifications.setNotificationChannelAsync('ai', {
          name: 'AI Processing',
          importance: Notifications.AndroidImportance.HIGH,
          description: 'Notifications for AI profile execution',
        });

        await Notifications.setNotificationChannelAsync('sync', {
          name: 'Sync Status',
          importance: Notifications.AndroidImportance.DEFAULT,
          description: 'Notifications for sync status',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Get the current push token
   */
  getToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Schedule a local notification for AI execution complete
   */
  async notifyAIComplete(
    profileName: string,
    noteTitle: string,
    noteId: string,
    profileId: string
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'AI Processing Complete',
        body: `${profileName} finished processing "${noteTitle}"`,
        data: {
          type: 'ai_complete',
          noteId,
          profileId,
        } as NotificationData,
        sound: true,
      },
      trigger: null, // Immediate
    });
  }

  /**
   * Schedule a local notification for sync complete
   */
  async notifySyncComplete(noteCount: number): Promise<void> {
    if (noteCount === 0) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sync Complete',
        body: `${noteCount} note${noteCount > 1 ? 's' : ''} synced successfully`,
        data: {
          type: 'sync_complete',
        } as NotificationData,
        sound: false, // Less intrusive
      },
      trigger: null,
    });
  }

  /**
   * Schedule a local notification for sync conflict
   */
  async notifySyncConflict(noteTitle: string, noteId: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sync Conflict Detected',
        body: `"${noteTitle}" has conflicting changes. Tap to resolve.`,
        data: {
          type: 'sync_conflict',
          noteId,
        } as NotificationData,
        sound: true,
      },
      trigger: null,
    });
  }

  /**
   * Schedule a general notification
   */
  async notify(title: string, body: string, data?: NotificationData): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || { type: 'general' },
        sound: true,
      },
      trigger: null,
    });
  }

  /**
   * Cancel all pending notifications
   */
  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get all pending notifications
   */
  async getPending(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Add a listener for when a notification is received
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add a listener for when a notification is tapped
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationService = new NotificationService();

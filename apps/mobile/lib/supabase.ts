import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Supabase configuration from app.json extra or environment
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? 'https://your-project.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey ?? '';

// Platform-specific storage adapter
const createStorageAdapter = () => {
  // For web, use localStorage
  if (Platform.OS === 'web') {
    return {
      getItem: async (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      },
      setItem: async (key: string, value: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      },
      removeItem: async (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      },
    };
  }

  // For native, use SecureStore with AsyncStorage fallback
  // Dynamic imports to avoid loading on web
  return {
    getItem: async (key: string) => {
      try {
        const SecureStore = require('expo-secure-store');
        return await SecureStore.getItemAsync(key);
      } catch {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          return await AsyncStorage.getItem(key);
        } catch {
          return null;
        }
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        const SecureStore = require('expo-secure-store');
        await SecureStore.setItemAsync(key, value);
      } catch {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem(key, value);
        } catch {
          // Ignore storage errors
        }
      }
    },
    removeItem: async (key: string) => {
      try {
        const SecureStore = require('expo-secure-store');
        await SecureStore.deleteItemAsync(key);
      } catch {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.removeItem(key);
        } catch {
          // Ignore storage errors
        }
      }
    },
  };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

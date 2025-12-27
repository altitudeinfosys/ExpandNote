import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

interface NetworkErrorState {
  isError: boolean;
  message: string | null;
  isRetrying: boolean;
}

interface UseNetworkErrorResult {
  error: NetworkErrorState;
  clearError: () => void;
  handleError: (error: unknown, context?: string) => void;
  retryWithConnection: <T>(
    operation: () => Promise<T>,
    context?: string
  ) => Promise<T | null>;
  checkConnection: () => Promise<boolean>;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Common network errors
    if (error.message.includes('Network request failed')) {
      return 'Unable to connect. Please check your internet connection.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return 'You don\'t have permission to perform this action.';
    }
    if (error.message.includes('404')) {
      return 'The requested resource was not found.';
    }
    if (error.message.includes('500') || error.message.includes('Server error')) {
      return 'Server error. Please try again later.';
    }
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};

export function useNetworkError(): UseNetworkErrorResult {
  const [error, setError] = useState<NetworkErrorState>({
    isError: false,
    message: null,
    isRetrying: false,
  });

  const clearError = useCallback(() => {
    setError({ isError: false, message: null, isRetrying: false });
  }, []);

  const handleError = useCallback((err: unknown, context?: string) => {
    const message = getErrorMessage(err);
    const fullMessage = context ? `${context}: ${message}` : message;

    setError({ isError: true, message: fullMessage, isRetrying: false });

    // Log for debugging
    console.error(`[NetworkError] ${fullMessage}`, err);
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }, []);

  const retryWithConnection = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    setError(prev => ({ ...prev, isRetrying: true }));

    // Check connection first
    const isConnected = await checkConnection();
    if (!isConnected) {
      setError({
        isError: true,
        message: 'No internet connection. Please check your connection and try again.',
        isRetrying: false,
      });
      return null;
    }

    try {
      const result = await operation();
      clearError();
      return result;
    } catch (err) {
      handleError(err, context);
      return null;
    }
  }, [checkConnection, clearError, handleError]);

  return {
    error,
    clearError,
    handleError,
    retryWithConnection,
    checkConnection,
  };
}

// Helper function to wrap API calls with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  onError?: (error: unknown) => void,
  context?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error(`[API Error] ${context || 'Operation failed'}:`, error);
    onError?.(error);
    return null;
  }
}

// Alert helper for showing error messages
export function showErrorAlert(
  title: string = 'Error',
  message: string,
  onRetry?: () => void
): void {
  const buttons = onRetry
    ? [
        { text: 'Cancel', style: 'cancel' as const },
        { text: 'Retry', onPress: onRetry },
      ]
    : [{ text: 'OK' }];

  Alert.alert(title, message, buttons);
}

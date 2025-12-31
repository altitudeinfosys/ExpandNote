import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/components/useColorScheme';
import type { AIProfile } from '@expandnote/shared/types';

type ExecutionState = 'idle' | 'executing' | 'success' | 'error';

interface ProfileExecutionState {
  [profileId: string]: {
    state: ExecutionState;
    error?: string;
  };
}

interface AIProfileBottomSheetProps {
  visible: boolean;
  profiles: AIProfile[];
  onClose: () => void;
  onExecute: (profileId: string) => Promise<void>;
}

export function AIProfileBottomSheet({
  visible,
  profiles,
  onClose,
  onExecute,
}: AIProfileBottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [executionStates, setExecutionStates] = useState<ProfileExecutionState>({});
  const [isRunningAll, setIsRunningAll] = useState(false);

  const handleExecute = useCallback(async (profileId: string) => {
    // Haptic feedback on press
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setExecutionStates(prev => ({
      ...prev,
      [profileId]: { state: 'executing' },
    }));

    try {
      await onExecute(profileId);
      setExecutionStates(prev => ({
        ...prev,
        [profileId]: { state: 'success' },
      }));
      // Success haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setExecutionStates(prev => ({
        ...prev,
        [profileId]: {
          state: 'error',
          error: error instanceof Error ? error.message : 'Execution failed',
        },
      }));
      // Error haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [onExecute]);

  const handleRunAll = useCallback(async () => {
    if (isRunningAll) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunningAll(true);

    // Execute profiles sequentially
    for (const profile of profiles) {
      const currentState = executionStates[profile.id];
      // Skip if already succeeded or currently executing
      if (currentState?.state === 'success' || currentState?.state === 'executing') {
        continue;
      }
      await handleExecute(profile.id);
    }

    setIsRunningAll(false);
  }, [profiles, executionStates, handleExecute, isRunningAll]);

  const handleClose = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Reset states when closing
    setExecutionStates({});
    onClose();
  }, [onClose]);

  const getExecutionIcon = (state: ExecutionState) => {
    switch (state) {
      case 'executing':
        return <ActivityIndicator size="small" color="#3b82f6" />;
      case 'success':
        return <FontAwesome name="check-circle" size={20} color="#22c55e" />;
      case 'error':
        return <FontAwesome name="times-circle" size={20} color="#ef4444" />;
      default:
        return (
          <FontAwesome
            name="play-circle"
            size={20}
            color={isDark ? '#60a5fa' : '#3b82f6'}
          />
        );
    }
  };

  const isAnyExecuting = Object.values(executionStates).some(
    s => s.state === 'executing'
  );

  const allSucceeded = profiles.length > 0 && profiles.every(
    p => executionStates[p.id]?.state === 'success'
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <FontAwesome
              name="times"
              size={20}
              color={isDark ? '#9ca3af' : '#6b7280'}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
            AI Actions
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Profile List */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {profiles.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome
                name="bolt"
                size={40}
                color={isDark ? '#374151' : '#d1d5db'}
              />
              <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                No AI profiles available for this note's tags
              </Text>
            </View>
          ) : (
            profiles.map((profile) => {
              const execState = executionStates[profile.id];
              const isExecuting = execState?.state === 'executing';
              const hasError = execState?.state === 'error';

              return (
                <View
                  key={profile.id}
                  style={[
                    styles.profileCard,
                    isDark && styles.profileCardDark,
                    hasError && styles.profileCardError,
                  ]}
                >
                  <View style={styles.profileInfo}>
                    <Text
                      style={[styles.profileName, isDark && styles.profileNameDark]}
                      numberOfLines={1}
                    >
                      {profile.name}
                    </Text>
                    {profile.tag && (
                      <View style={[styles.tagBadge, isDark && styles.tagBadgeDark]}>
                        <FontAwesome
                          name="tag"
                          size={10}
                          color={isDark ? '#9ca3af' : '#6b7280'}
                        />
                        <Text style={[styles.tagName, isDark && styles.tagNameDark]}>
                          {profile.tag.name}
                        </Text>
                      </View>
                    )}
                    {hasError && execState?.error && (
                      <Text style={styles.errorText} numberOfLines={1}>
                        {execState.error}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.executeButton,
                      isExecuting && styles.executeButtonDisabled,
                    ]}
                    onPress={() => handleExecute(profile.id)}
                    disabled={isExecuting}
                  >
                    {getExecutionIcon(execState?.state || 'idle')}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Footer with Run All button */}
        {profiles.length >= 2 && (
          <View style={[styles.footer, isDark && styles.footerDark]}>
            <TouchableOpacity
              style={[
                styles.runAllButton,
                isDark && styles.runAllButtonDark,
                (isAnyExecuting || allSucceeded) && styles.runAllButtonDisabled,
              ]}
              onPress={handleRunAll}
              disabled={isAnyExecuting || allSucceeded}
            >
              {isRunningAll ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : allSucceeded ? (
                <>
                  <FontAwesome name="check" size={14} color="#fff" />
                  <Text style={styles.runAllButtonText}>All Complete</Text>
                </>
              ) : (
                <>
                  <FontAwesome name="play" size={14} color="#fff" />
                  <Text style={styles.runAllButtonText}>
                    Run All ({profiles.length})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerDark: {
    borderBottomColor: '#374151',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerTitleDark: {
    color: '#f9fafb',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#9ca3af',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  profileCardDark: {
    backgroundColor: '#1f2937',
  },
  profileCardError: {
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  profileNameDark: {
    color: '#f9fafb',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagBadgeDark: {
    backgroundColor: '#374151',
  },
  tagName: {
    fontSize: 12,
    color: '#6b7280',
  },
  tagNameDark: {
    color: '#9ca3af',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  executeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  executeButtonDisabled: {
    opacity: 0.7,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerDark: {
    borderTopColor: '#374151',
  },
  runAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  runAllButtonDark: {
    backgroundColor: '#2563eb',
  },
  runAllButtonDisabled: {
    backgroundColor: '#22c55e',
  },
  runAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

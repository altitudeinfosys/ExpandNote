import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSync } from '@/contexts/SyncContext';
import { useColorScheme } from '@/components/useColorScheme';
import type { SyncStatus } from '@expandnote/shared/types';

interface SyncStatusIndicatorProps {
  showLabel?: boolean;
  size?: 'small' | 'medium';
  onPress?: () => void;
}

export function SyncStatusIndicator({
  showLabel = false,
  size = 'small',
  onPress,
}: SyncStatusIndicatorProps) {
  const { syncStatus, isOnline, triggerSync } = useSync();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getStatusConfig = (status: SyncStatus) => {
    switch (status) {
      case 'synced':
        return {
          icon: 'check-circle' as const,
          color: '#22c55e',
          label: 'Synced',
        };
      case 'syncing':
        return {
          icon: 'refresh' as const,
          color: '#3b82f6',
          label: 'Syncing...',
        };
      case 'pending':
        return {
          icon: 'clock-o' as const,
          color: '#f59e0b',
          label: 'Pending',
        };
      case 'offline':
        return {
          icon: 'wifi' as const,
          color: '#6b7280',
          label: 'Offline',
        };
      case 'conflict':
        return {
          icon: 'exclamation-triangle' as const,
          color: '#ef4444',
          label: 'Conflict',
        };
      default:
        return {
          icon: 'question-circle' as const,
          color: '#9ca3af',
          label: 'Unknown',
        };
    }
  };

  const config = getStatusConfig(syncStatus);
  const iconSize = size === 'small' ? 14 : 18;

  const handlePress = async () => {
    if (onPress) {
      onPress();
    } else if (syncStatus !== 'syncing' && isOnline) {
      await triggerSync();
    }
  };

  const content = (
    <View style={[styles.container, size === 'medium' && styles.containerMedium]}>
      {syncStatus === 'syncing' ? (
        <ActivityIndicator size="small" color={config.color} />
      ) : (
        <FontAwesome name={config.icon} size={iconSize} color={config.color} />
      )}
      {showLabel && (
        <Text
          style={[
            styles.label,
            { color: config.color },
            size === 'medium' && styles.labelMedium,
          ]}
        >
          {config.label}
        </Text>
      )}
      {!isOnline && syncStatus !== 'offline' && (
        <View style={styles.offlineBadge}>
          <FontAwesome name="wifi" size={8} color="#fff" />
        </View>
      )}
    </View>
  );

  if (syncStatus === 'syncing') {
    return content;
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  containerMedium: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  labelMedium: {
    fontSize: 14,
  },
  offlineBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#6b7280',
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

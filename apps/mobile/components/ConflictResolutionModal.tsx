import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import type { Note } from '@expandnote/shared/types';

interface ConflictData {
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

interface ConflictResolutionModalProps {
  visible: boolean;
  conflict: ConflictData | null;
  onResolve: (choice: 'local' | 'server' | 'merge') => void;
  onDismiss: () => void;
}

export function ConflictResolutionModal({
  visible,
  conflict,
  onResolve,
  onDismiss,
}: ConflictResolutionModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!conflict) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const truncateContent = (content: string, maxLength = 200) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
            <FontAwesome
              name="times"
              size={20}
              color={isDark ? '#9ca3af' : '#6b7280'}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
            Sync Conflict
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Warning */}
        <View style={[styles.warningBanner, isDark && styles.warningBannerDark]}>
          <FontAwesome name="exclamation-triangle" size={20} color="#f59e0b" />
          <Text style={[styles.warningText, isDark && styles.warningTextDark]}>
            This note was modified both locally and on the server. Choose which
            version to keep.
          </Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Local Version */}
          <View style={[styles.versionCard, isDark && styles.versionCardDark]}>
            <View style={styles.versionHeader}>
              <View style={styles.versionBadge}>
                <FontAwesome name="mobile" size={14} color="#3b82f6" />
                <Text style={styles.versionBadgeText}>Your Device</Text>
              </View>
              <Text style={[styles.versionDate, isDark && styles.versionDateDark]}>
                {formatDate(conflict.localVersion.updated_at)}
              </Text>
            </View>
            <Text
              style={[styles.versionTitle, isDark && styles.versionTitleDark]}
              numberOfLines={1}
            >
              {conflict.localVersion.title || 'Untitled'}
            </Text>
            <Text
              style={[styles.versionContent, isDark && styles.versionContentDark]}
            >
              {truncateContent(conflict.localVersion.content)}
            </Text>
            <TouchableOpacity
              style={[styles.choiceButton, styles.localButton]}
              onPress={() => onResolve('local')}
            >
              <FontAwesome name="check" size={14} color="#fff" />
              <Text style={styles.choiceButtonText}>Keep Local Version</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.divider, isDark && styles.dividerDark]} />
            <Text style={[styles.dividerText, isDark && styles.dividerTextDark]}>
              OR
            </Text>
            <View style={[styles.divider, isDark && styles.dividerDark]} />
          </View>

          {/* Server Version */}
          <View style={[styles.versionCard, isDark && styles.versionCardDark]}>
            <View style={styles.versionHeader}>
              <View style={[styles.versionBadge, styles.serverBadge]}>
                <FontAwesome name="cloud" size={14} color="#22c55e" />
                <Text style={[styles.versionBadgeText, styles.serverBadgeText]}>
                  Server
                </Text>
              </View>
              <Text style={[styles.versionDate, isDark && styles.versionDateDark]}>
                {formatDate(conflict.serverVersion.updated_at)}
              </Text>
            </View>
            <Text
              style={[styles.versionTitle, isDark && styles.versionTitleDark]}
              numberOfLines={1}
            >
              {conflict.serverVersion.title || 'Untitled'}
            </Text>
            <Text
              style={[styles.versionContent, isDark && styles.versionContentDark]}
            >
              {truncateContent(conflict.serverVersion.content)}
            </Text>
            <TouchableOpacity
              style={[styles.choiceButton, styles.serverButton]}
              onPress={() => onResolve('server')}
            >
              <FontAwesome name="check" size={14} color="#fff" />
              <Text style={styles.choiceButtonText}>Keep Server Version</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Merge Option */}
        <View style={[styles.footer, isDark && styles.footerDark]}>
          <TouchableOpacity
            style={[styles.mergeButton, isDark && styles.mergeButtonDark]}
            onPress={() => onResolve('merge')}
          >
            <FontAwesome
              name="code-fork"
              size={16}
              color={isDark ? '#60a5fa' : '#3b82f6'}
            />
            <Text style={[styles.mergeButtonText, isDark && styles.mergeButtonTextDark]}>
              Keep Both (Create Duplicate)
            </Text>
          </TouchableOpacity>
        </View>
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef3c7',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  warningBannerDark: {
    backgroundColor: '#422006',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  warningTextDark: {
    color: '#fcd34d',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  versionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  versionCardDark: {
    backgroundColor: '#1f2937',
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serverBadge: {
    backgroundColor: '#dcfce7',
  },
  versionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  serverBadgeText: {
    color: '#22c55e',
  },
  versionDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  versionDateDark: {
    color: '#9ca3af',
  },
  versionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  versionTitleDark: {
    color: '#f9fafb',
  },
  versionContent: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  versionContentDark: {
    color: '#9ca3af',
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  localButton: {
    backgroundColor: '#3b82f6',
  },
  serverButton: {
    backgroundColor: '#22c55e',
  },
  choiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerDark: {
    backgroundColor: '#374151',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  dividerTextDark: {
    color: '#6b7280',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerDark: {
    borderTopColor: '#374151',
  },
  mergeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  mergeButtonDark: {
    borderColor: '#60a5fa',
  },
  mergeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  mergeButtonTextDark: {
    color: '#60a5fa',
  },
});

import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import type { AIProfile, Tag } from '@expandnote/shared/types';

interface ProfileWithTag extends AIProfile {
  tag?: Tag;
}

export default function ProfilesScreen() {
  const [profiles, setProfiles] = useState<ProfileWithTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const router = useRouter();

  const isDark = colorScheme === 'dark';

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('ai_profiles')
      .select(`
        *,
        tag:tags(*)
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      setProfiles(data || []);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
    }, [fetchProfiles])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProfiles();
  };

  const toggleProfile = async (profile: AIProfile) => {
    const newActiveState = !profile.is_active;

    // Optimistic update
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profile.id ? { ...p, is_active: newActiveState } : p
      )
    );

    const { error } = await supabase
      .from('ai_profiles')
      .update({ is_active: newActiveState })
      .eq('id', profile.id);

    if (error) {
      // Revert on error
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id ? { ...p, is_active: !newActiveState } : p
        )
      );
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const getModelLabel = (model: string): string => {
    if (model.includes('gpt-4o-mini')) return 'GPT-4o Mini';
    if (model.includes('gpt-4o')) return 'GPT-4o';
    if (model.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
    if (model.includes('claude-3-5-haiku')) return 'Claude 3.5 Haiku';
    return model;
  };

  const renderProfile = ({ item }: { item: ProfileWithTag }) => (
    <TouchableOpacity
      style={[styles.profileCard, isDark && styles.profileCardDark]}
      onPress={() => router.push(`/(app)/profile/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.profileHeader}>
        <View
          style={[
            styles.profileIcon,
            { backgroundColor: item.is_active ? '#dbeafe' : '#f3f4f6' },
          ]}
        >
          <FontAwesome
            name="magic"
            size={20}
            color={item.is_active ? '#3b82f6' : '#9ca3af'}
          />
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, isDark && styles.profileNameDark]}>
            {item.name}
          </Text>
          <Text style={[styles.profileModel, isDark && styles.profileModelDark]}>
            {getModelLabel(item.model)}
          </Text>
        </View>
        <Switch
          value={item.is_active}
          onValueChange={() => toggleProfile(item)}
          trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
          thumbColor={item.is_active ? '#3b82f6' : '#f9fafb'}
        />
      </View>

      {/* Profile metadata */}
      <View style={styles.profileMeta}>
        <View style={styles.metaItem}>
          <FontAwesome
            name={item.trigger_mode === 'automatic' ? 'bolt' : 'hand-pointer-o'}
            size={12}
            color={isDark ? '#9ca3af' : '#6b7280'}
          />
          <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
            {item.trigger_mode === 'automatic' ? 'Automatic' : 'Manual'}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <FontAwesome
            name={
              item.output_behavior === 'append' ? 'plus' :
              item.output_behavior === 'replace' ? 'exchange' : 'file-text-o'
            }
            size={12}
            color={isDark ? '#9ca3af' : '#6b7280'}
          />
          <Text style={[styles.metaText, isDark && styles.metaTextDark]}>
            {item.output_behavior === 'append' ? 'Append' :
             item.output_behavior === 'replace' ? 'Replace' : 'New note'}
          </Text>
        </View>

        {item.tag && item.trigger_mode === 'automatic' && (
          <View style={[styles.metaItem, styles.tagBadge, isDark && styles.tagBadgeDark]}>
            <FontAwesome name="tag" size={10} color="#3b82f6" />
            <Text style={styles.tagText}>{item.tag.name}</Text>
          </View>
        )}
      </View>

      {/* Prompt preview */}
      <Text
        style={[styles.promptPreview, isDark && styles.promptPreviewDark]}
        numberOfLines={2}
      >
        {item.user_prompt_template || item.system_prompt}
      </Text>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome
        name="magic"
        size={64}
        color={isDark ? '#4b5563' : '#9ca3af'}
      />
      <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
        No AI Profiles
      </Text>
      <Text style={[styles.emptySubtext, isDark && styles.emptySubtextDark]}>
        Create AI profiles to automate your note processing
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/(app)/profile/new')}
      >
        <FontAwesome name="plus" size={14} color="#fff" />
        <Text style={styles.emptyButtonText}>Create Profile</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfile}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            profiles.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={isDark ? '#60a5fa' : '#3b82f6'}
            />
          }
          ListEmptyComponent={EmptyState}
        />
      )}

      {profiles.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(app)/profile/new')}
        >
          <FontAwesome name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listContentEmpty: {
    flex: 1,
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  profileNameDark: {
    color: '#f9fafb',
  },
  profileModel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  profileModelDark: {
    color: '#9ca3af',
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  metaTextDark: {
    color: '#9ca3af',
  },
  tagBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagBadgeDark: {
    backgroundColor: '#1e3a5f',
  },
  tagText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '500',
  },
  promptPreview: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    lineHeight: 18,
  },
  promptPreviewDark: {
    color: '#9ca3af',
    borderTopColor: '#374151',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyTextDark: {
    color: '#9ca3af',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtextDark: {
    color: '#6b7280',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});

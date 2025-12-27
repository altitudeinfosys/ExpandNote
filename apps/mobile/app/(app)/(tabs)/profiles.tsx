import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Switch,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import type { AIProfile } from '@expandnote/shared/types';

export default function ProfilesScreen() {
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const colorScheme = useColorScheme();

  const isDark = colorScheme === 'dark';

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('ai_profiles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      setProfiles(data || []);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

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
      console.error('Error toggling profile:', error);
    }
  };

  const getModelIcon = (model: string) => {
    if (model.includes('gpt')) return 'openai' as const;
    if (model.includes('claude')) return 'android' as const;
    return 'robot' as const;
  };

  const renderProfile = ({ item }: { item: AIProfile }) => (
    <View style={[styles.profileCard, isDark && styles.profileCardDark]}>
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
            {item.model}
          </Text>
        </View>
        <Switch
          value={item.is_active}
          onValueChange={() => toggleProfile(item)}
          trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
          thumbColor={item.is_active ? '#3b82f6' : '#f9fafb'}
        />
      </View>
      {item.tag_id && item.trigger_mode === 'automatic' && (
        <View style={styles.triggerBadge}>
          <FontAwesome name="tag" size={12} color="#6b7280" />
          <Text style={styles.triggerText}>Auto-triggers on tag</Text>
        </View>
      )}
    </View>
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
        Create AI profiles on the web app to automate your note processing
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
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
        ListEmptyComponent={!isLoading ? EmptyState : null}
      />
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
  triggerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 6,
  },
  triggerText: {
    fontSize: 12,
    color: '#6b7280',
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
});

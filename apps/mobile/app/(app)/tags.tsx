import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import type { Tag } from '@expandnote/shared/types';

interface TagWithCount extends Tag {
  noteCount?: number;
}

export default function TagsScreen() {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const colorScheme = useColorScheme();
  const router = useRouter();

  const isDark = colorScheme === 'dark';

  const fetchTags = useCallback(async () => {
    const { data, error } = await supabase
      .from('tags')
      .select(`
        *,
        note_tags(count)
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
    } else {
      const tagsWithCount = (data || []).map(tag => ({
        ...tag,
        noteCount: tag.note_tags?.[0]?.count || 0,
      }));
      setTags(tagsWithCount);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTags();
  };

  const createTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;

    // Check for duplicate
    if (tags.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      Alert.alert('Tag Exists', 'A tag with this name already exists.');
      return;
    }

    setIsCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'You must be signed in to create tags.');
      setIsCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({ name: trimmedName, user_id: user.id })
      .select()
      .single();

    setIsCreating(false);

    if (error) {
      Alert.alert('Error', 'Failed to create tag.');
    } else if (data) {
      setTags(prev => [...prev, { ...data, noteCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTagName('');
    }
  };

  const startEditing = (tag: TagWithCount) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
  };

  const cancelEditing = () => {
    setEditingTagId(null);
    setEditingTagName('');
  };

  const saveEdit = async (tag: TagWithCount) => {
    const trimmedName = editingTagName.trim();
    if (!trimmedName || trimmedName === tag.name) {
      cancelEditing();
      return;
    }

    // Check for duplicate
    if (tags.some(t => t.id !== tag.id && t.name.toLowerCase() === trimmedName.toLowerCase())) {
      Alert.alert('Tag Exists', 'A tag with this name already exists.');
      return;
    }

    const { error } = await supabase
      .from('tags')
      .update({ name: trimmedName })
      .eq('id', tag.id);

    if (error) {
      Alert.alert('Error', 'Failed to update tag.');
    } else {
      setTags(prev => prev
        .map(t => t.id === tag.id ? { ...t, name: trimmedName } : t)
        .sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    cancelEditing();
  };

  const deleteTag = async (tag: TagWithCount) => {
    Alert.alert(
      'Delete Tag',
      `Delete "${tag.name}"? This will remove it from all notes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setTags(prev => prev.filter(t => t.id !== tag.id));

            const { error } = await supabase
              .from('tags')
              .delete()
              .eq('id', tag.id);

            if (error) {
              Alert.alert('Error', 'Failed to delete tag.');
              fetchTags();
            }
          },
        },
      ]
    );
  };

  const renderTag = ({ item }: { item: TagWithCount }) => {
    const isEditing = editingTagId === item.id;

    return (
      <View style={[styles.tagCard, isDark && styles.tagCardDark]}>
        {isEditing ? (
          <View style={styles.editingContainer}>
            <TextInput
              style={[styles.editInput, isDark && styles.editInputDark]}
              value={editingTagName}
              onChangeText={setEditingTagName}
              autoFocus
              onSubmitEditing={() => saveEdit(item)}
              returnKeyType="done"
            />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => saveEdit(item)} style={styles.editButton}>
                <FontAwesome name="check" size={18} color="#22c55e" />
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelEditing} style={styles.editButton}>
                <FontAwesome name="times" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.tagContent}>
            <View style={styles.tagInfo}>
              <FontAwesome
                name="tag"
                size={16}
                color={isDark ? '#60a5fa' : '#3b82f6'}
                style={{ marginRight: 12 }}
              />
              <View>
                <Text style={[styles.tagName, isDark && styles.tagNameDark]}>
                  {item.name}
                </Text>
                <Text style={[styles.noteCount, isDark && styles.noteCountDark]}>
                  {item.noteCount} {item.noteCount === 1 ? 'note' : 'notes'}
                </Text>
              </View>
            </View>
            <View style={styles.tagActions}>
              <TouchableOpacity onPress={() => startEditing(item)} style={styles.actionButton}>
                <FontAwesome name="pencil" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteTag(item)} style={styles.actionButton}>
                <FontAwesome name="trash-o" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome
        name="tags"
        size={64}
        color={isDark ? '#4b5563' : '#9ca3af'}
      />
      <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
        No tags yet
      </Text>
      <Text style={[styles.emptySubtext, isDark && styles.emptySubtextDark]}>
        Create tags to organize your notes
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Manage Tags',
          headerStyle: {
            backgroundColor: isDark ? '#111827' : '#fff',
          },
          headerTintColor: isDark ? '#f9fafb' : '#111827',
        }}
      />
      <View style={[styles.container, isDark && styles.containerDark]}>
        {/* Create New Tag */}
        <View style={[styles.createContainer, isDark && styles.createContainerDark]}>
          <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
            <FontAwesome
              name="plus"
              size={14}
              color={isDark ? '#6b7280' : '#9ca3af'}
              style={{ marginRight: 12 }}
            />
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Create new tag..."
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              value={newTagName}
              onChangeText={setNewTagName}
              onSubmitEditing={createTag}
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity
            style={[
              styles.createButton,
              (!newTagName.trim() || isCreating) && styles.createButtonDisabled,
            ]}
            onPress={createTag}
            disabled={!newTagName.trim() || isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tags Count */}
        <View style={styles.countContainer}>
          <Text style={[styles.countText, isDark && styles.countTextDark]}>
            {tags.length} {tags.length === 1 ? 'tag' : 'tags'}
          </Text>
        </View>

        {/* Tags List */}
        {isLoading ? (
          <ActivityIndicator style={styles.loading} color="#3b82f6" />
        ) : (
          <FlatList
            data={tags}
            renderItem={renderTag}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              tags.length === 0 && styles.listContentEmpty,
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
      </View>
    </>
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
  createContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  createContainerDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputContainerDark: {
    backgroundColor: '#111827',
    borderColor: '#374151',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputDark: {
    color: '#f9fafb',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  countContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 13,
    color: '#6b7280',
  },
  countTextDark: {
    color: '#9ca3af',
  },
  loading: {
    padding: 32,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  listContentEmpty: {
    flex: 1,
  },
  tagCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tagCardDark: {
    backgroundColor: '#1f2937',
  },
  tagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  tagNameDark: {
    color: '#f9fafb',
  },
  noteCount: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  noteCountDark: {
    color: '#9ca3af',
  },
  tagActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 8,
  },
  editingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  editInputDark: {
    backgroundColor: '#111827',
    color: '#f9fafb',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
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

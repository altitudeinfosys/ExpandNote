import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/lib/supabase';
import type { Tag } from '@expandnote/shared/types';
import { MAX_TAGS_PER_NOTE } from '@expandnote/shared/constants';

interface TagSelectorProps {
  noteId: string;
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  isDark: boolean;
}

export function TagSelector({ noteId, selectedTags, onTagsChange, isDark }: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  const fetchTags = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
    } else {
      setAllTags(data || []);
    }
    setIsLoading(false);
  };

  const toggleTag = async (tag: Tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);

    if (isSelected) {
      // Remove tag
      const newTags = selectedTags.filter(t => t.id !== tag.id);
      onTagsChange(newTags);

      // Update database
      await supabase
        .from('note_tags')
        .delete()
        .eq('note_id', noteId)
        .eq('tag_id', tag.id);
    } else {
      // Add tag (enforce limit)
      if (selectedTags.length >= MAX_TAGS_PER_NOTE) {
        Alert.alert('Tag Limit', `You can only add up to ${MAX_TAGS_PER_NOTE} tags per note.`);
        return;
      }

      const newTags = [...selectedTags, tag];
      onTagsChange(newTags);

      // Update database
      await supabase
        .from('note_tags')
        .insert({ note_id: noteId, tag_id: tag.id });
    }
  };

  const createTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;

    // Check for duplicate
    if (allTags.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
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
      setAllTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTagName('');

      // Automatically select the new tag if under limit
      if (selectedTags.length < MAX_TAGS_PER_NOTE) {
        toggleTag(data);
      }
    }
  };

  const renderTag = ({ item }: { item: Tag }) => {
    const isSelected = selectedTags.some(t => t.id === item.id);

    return (
      <TouchableOpacity
        style={[
          styles.tagItem,
          isDark && styles.tagItemDark,
          isSelected && styles.tagItemSelected,
        ]}
        onPress={() => toggleTag(item)}
      >
        <FontAwesome
          name={isSelected ? 'check-square' : 'square-o'}
          size={18}
          color={isSelected ? '#3b82f6' : (isDark ? '#6b7280' : '#9ca3af')}
        />
        <Text
          style={[
            styles.tagItemText,
            isDark && styles.tagItemTextDark,
            isSelected && styles.tagItemTextSelected,
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Tag Display Chips */}
      <View style={styles.tagsContainer}>
        <TouchableOpacity
          style={[styles.addTagButton, isDark && styles.addTagButtonDark]}
          onPress={() => setIsOpen(true)}
        >
          <FontAwesome name="tag" size={14} color={isDark ? '#60a5fa' : '#3b82f6'} />
          <Text style={[styles.addTagText, isDark && styles.addTagTextDark]}>
            {selectedTags.length > 0 ? 'Edit Tags' : 'Add Tags'}
          </Text>
        </TouchableOpacity>

        {selectedTags.map(tag => (
          <View key={tag.id} style={[styles.tagChip, isDark && styles.tagChipDark]}>
            <Text style={[styles.tagChipText, isDark && styles.tagChipTextDark]}>
              {tag.name}
            </Text>
            <TouchableOpacity onPress={() => toggleTag(tag)}>
              <FontAwesome name="times" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>
        ))}

        {selectedTags.length >= MAX_TAGS_PER_NOTE && (
          <Text style={styles.limitText}>Max {MAX_TAGS_PER_NOTE} tags</Text>
        )}
      </View>

      {/* Tag Selector Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
          <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Select Tags ({selectedTags.length}/{MAX_TAGS_PER_NOTE})
            </Text>
            <TouchableOpacity onPress={() => setIsOpen(false)}>
              <FontAwesome name="times" size={24} color={isDark ? '#f9fafb' : '#111827'} />
            </TouchableOpacity>
          </View>

          {/* Create New Tag */}
          <View style={[styles.createTagContainer, isDark && styles.createTagContainerDark]}>
            <TextInput
              style={[styles.createTagInput, isDark && styles.createTagInputDark]}
              placeholder="Create new tag..."
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              value={newTagName}
              onChangeText={setNewTagName}
              onSubmitEditing={createTag}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[
                styles.createTagButton,
                (!newTagName.trim() || isCreating) && styles.createTagButtonDisabled,
              ]}
              onPress={createTag}
              disabled={!newTagName.trim() || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FontAwesome name="plus" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Tags List */}
          {isLoading ? (
            <ActivityIndicator style={styles.loading} color="#3b82f6" />
          ) : (
            <FlatList
              data={allTags}
              renderItem={renderTag}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.tagsList}
              ListEmptyComponent={
                <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                  No tags yet. Create one above!
                </Text>
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
  },
  addTagButtonDark: {
    backgroundColor: '#1e3a5f',
  },
  addTagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3b82f6',
  },
  addTagTextDark: {
    color: '#60a5fa',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  tagChipDark: {
    backgroundColor: '#374151',
  },
  tagChipText: {
    fontSize: 13,
    color: '#374151',
  },
  tagChipTextDark: {
    color: '#d1d5db',
  },
  limitText: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalContainerDark: {
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalHeaderDark: {
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalTitleDark: {
    color: '#f9fafb',
  },
  createTagContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  createTagContainerDark: {
    borderBottomColor: '#374151',
  },
  createTagInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  createTagInputDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    color: '#f9fafb',
  },
  createTagButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createTagButtonDisabled: {
    opacity: 0.5,
  },
  loading: {
    padding: 32,
  },
  tagsList: {
    padding: 16,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  tagItemDark: {
    backgroundColor: '#1f2937',
  },
  tagItemSelected: {
    backgroundColor: '#dbeafe',
  },
  tagItemText: {
    fontSize: 16,
    color: '#374151',
  },
  tagItemTextDark: {
    color: '#d1d5db',
  },
  tagItemTextSelected: {
    color: '#1d4ed8',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 32,
  },
  emptyTextDark: {
    color: '#9ca3af',
  },
});

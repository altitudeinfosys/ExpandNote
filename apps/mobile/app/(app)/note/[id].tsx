import { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import { TagSelector } from '@/components/notes/TagSelector';
import { AUTO_SAVE_DELAY_MS } from '@expandnote/shared/constants';
import type { Note, Tag } from '@expandnote/shared/types';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchNote();
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [id]);

  const fetchNote = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        tags:note_tags(tag:tags(*))
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching note:', error);
      Alert.alert('Error', 'Failed to load note');
      router.back();
    } else {
      setNote(data);
      setTitle(data.title || '');
      setContent(data.content || '');
      // Extract tags from the nested structure
      const noteTags = data.tags?.map((nt: any) => nt.tag).filter(Boolean) || [];
      setTags(noteTags);
    }
    setIsLoading(false);
  };

  const scheduleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote();
    }, AUTO_SAVE_DELAY_MS);
  }, [id, title, content]);

  const handleTitleChange = (text: string) => {
    setTitle(text);
    setHasChanges(true);
    scheduleAutoSave();
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    setHasChanges(true);
    scheduleAutoSave();
  };

  const saveNote = async () => {
    if (!id || !hasChanges) return;

    setIsSaving(true);

    const { error } = await supabase
      .from('notes')
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    setIsSaving(false);

    if (error) {
      console.error('Error saving note:', error);
    } else {
      setHasChanges(false);
      setLastSaved(new Date());
    }
  };

  const handleTagsChange = (newTags: Tag[]) => {
    setTags(newTags);
  };

  const toggleFavorite = async () => {
    if (!note) return;

    const newFavorite = !note.is_favorite;
    setNote({ ...note, is_favorite: newFavorite });

    const { error } = await supabase
      .from('notes')
      .update({ is_favorite: newFavorite })
      .eq('id', id);

    if (error) {
      setNote({ ...note, is_favorite: !newFavorite });
      Alert.alert('Error', 'Failed to update note');
    }
  };

  const archiveNote = async () => {
    if (!note) return;

    const newArchived = !note.is_archived;

    Alert.alert(
      newArchived ? 'Archive Note' : 'Unarchive Note',
      newArchived
        ? 'This note will be moved to the archive.'
        : 'This note will be restored from the archive.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newArchived ? 'Archive' : 'Unarchive',
          onPress: async () => {
            const { error } = await supabase
              .from('notes')
              .update({ is_archived: newArchived })
              .eq('id', id);

            if (error) {
              Alert.alert('Error', 'Failed to update note');
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'This note will be moved to trash. You can restore it from there.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('notes')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', id);

            if (error) {
              Alert.alert('Error', 'Failed to delete note');
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const input = contentInputRef.current;
    if (!input) return;

    // Simple insert at cursor position (or end if no selection)
    const newContent = content + prefix + suffix;
    setContent(newContent);
    setHasChanges(true);
    scheduleAutoSave();
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: isDark ? '#111827' : '#fff',
          },
          headerTintColor: isDark ? '#f9fafb' : '#111827',
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (hasChanges) {
                  saveNote().then(() => router.back());
                } else {
                  router.back();
                }
              }}
              style={styles.headerButton}
            >
              <FontAwesome
                name="chevron-left"
                size={18}
                color={isDark ? '#f9fafb' : '#111827'}
              />
              <Text style={[styles.backText, isDark && styles.backTextDark]}>
                Notes
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              {isSaving && (
                <ActivityIndicator size="small" color="#3b82f6" />
              )}
              {!isSaving && hasChanges && (
                <TouchableOpacity onPress={saveNote} style={styles.saveButton}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              )}
              {!isSaving && !hasChanges && lastSaved && (
                <Text style={[styles.savedText, isDark && styles.savedTextDark]}>
                  Saved
                </Text>
              )}
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          style={[styles.container, isDark && styles.containerDark]}
          keyboardDismissMode="interactive"
        >
          <TextInput
            style={[styles.titleInput, isDark && styles.titleInputDark]}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Note title"
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            multiline
          />

          {/* Tags */}
          <TagSelector
            noteId={id!}
            selectedTags={tags}
            onTagsChange={handleTagsChange}
            isDark={isDark}
          />

          {/* Toolbar */}
          <View style={[styles.toolbar, isDark && styles.toolbarDark]}>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => insertMarkdown('**', '**')}
            >
              <FontAwesome name="bold" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => insertMarkdown('*', '*')}
            >
              <FontAwesome name="italic" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => insertMarkdown('\n- ')}
            >
              <FontAwesome name="list-ul" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => insertMarkdown('\n1. ')}
            >
              <FontAwesome name="list-ol" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => insertMarkdown('\n> ')}
            >
              <FontAwesome name="quote-left" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => insertMarkdown('\n```\n', '\n```')}
            >
              <FontAwesome name="code" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>

            <View style={styles.toolbarSpacer} />

            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={toggleFavorite}
            >
              <FontAwesome
                name={note?.is_favorite ? 'star' : 'star-o'}
                size={18}
                color={note?.is_favorite ? '#f59e0b' : (isDark ? '#9ca3af' : '#6b7280')}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={archiveNote}
            >
              <FontAwesome
                name="archive"
                size={16}
                color={isDark ? '#9ca3af' : '#6b7280'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={handleDelete}
            >
              <FontAwesome name="trash-o" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>

          <TextInput
            ref={contentInputRef}
            style={[styles.contentInput, isDark && styles.contentInputDark]}
            value={content}
            onChangeText={handleContentChange}
            placeholder="Start writing..."
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: '#111827',
  },
  backTextDark: {
    color: '#f9fafb',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#dbeafe',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  savedText: {
    fontSize: 13,
    color: '#22c55e',
  },
  savedTextDark: {
    color: '#4ade80',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  titleInputDark: {
    color: '#f9fafb',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  toolbarDark: {
    borderColor: '#374151',
    backgroundColor: '#1f2937',
  },
  toolbarButton: {
    padding: 8,
    marginHorizontal: 2,
  },
  toolbarSpacer: {
    flex: 1,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    minHeight: 300,
    lineHeight: 24,
  },
  contentInputDark: {
    color: '#d1d5db',
  },
});

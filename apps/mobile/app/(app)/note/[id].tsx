import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import type { Note } from '@expandnote/shared/types';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchNote();
  }, [id]);

  const fetchNote = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('notes')
      .select('*')
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
    }
    setIsLoading(false);
  };

  const handleTitleChange = (text: string) => {
    setTitle(text);
    setHasChanges(true);
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    setHasChanges(true);
  };

  const handleSave = async () => {
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
      Alert.alert('Error', 'Failed to save note');
    } else {
      setHasChanges(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('notes')
              .delete()
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
                  handleSave().then(() => router.back());
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
              {hasChanges && (
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveButton}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    <Text style={styles.saveText}>Save</Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                <FontAwesome name="trash-o" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
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
        <TextInput
          style={[styles.contentInput, isDark && styles.contentInputDark]}
          value={content}
          onChangeText={handleContentChange}
          placeholder="Start writing..."
          placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
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
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: 400,
    lineHeight: 24,
  },
  contentInputDark: {
    color: '#d1d5db',
  },
});

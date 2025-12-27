import { useState } from 'react';
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
import { useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function NewNoteScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const isDark = colorScheme === 'dark';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Error', 'Please add a title or content');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be signed in to create notes');
      return;
    }

    setIsSaving(true);

    const { data, error } = await supabase
      .from('notes')
      .insert({
        title: title.trim() || 'Untitled',
        content: content.trim(),
        user_id: user.id,
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      Alert.alert('Error', 'Failed to create note');
      console.error('Error creating note:', error);
    } else {
      // Navigate to the new note
      router.replace(`/(app)/note/${data.id}`);
    }
  };

  const handleCancel = () => {
    if (title.trim() || content.trim()) {
      Alert.alert(
        'Discard Note',
        'Are you sure you want to discard this note?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: isDark ? '#111827' : '#fff',
          },
          headerTintColor: isDark ? '#f9fafb' : '#111827',
          headerTitle: 'New Note',
          headerLeft: () => (
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Text style={[styles.cancelText, isDark && styles.cancelTextDark]}>
                Cancel
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveButton,
                (!title.trim() && !content.trim()) && styles.saveButtonDisabled,
              ]}
              disabled={isSaving || (!title.trim() && !content.trim())}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
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
          onChangeText={setTitle}
          placeholder="Note title"
          placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          multiline
          autoFocus
        />
        <TextInput
          style={[styles.contentInput, isDark && styles.contentInputDark]}
          value={content}
          onChangeText={setContent}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  headerButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  cancelTextDark: {
    color: '#9ca3af',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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

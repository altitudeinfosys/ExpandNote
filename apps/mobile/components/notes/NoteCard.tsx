import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Note } from '@expandnote/shared/types';

interface NoteCardProps {
  note: Note;
  isDark: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  } else {
    return date.toLocaleDateString();
  }
}

function NoteCardComponent({ note, isDark, onPress, onToggleFavorite }: NoteCardProps) {
  return (
    <TouchableOpacity
      style={[styles.noteCard, isDark && styles.noteCardDark]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Note: ${note.title || 'Untitled'}. ${note.is_favorite ? 'Favorited.' : ''} Last updated ${formatDate(note.updated_at)}`}
      accessibilityHint="Double tap to open note"
    >
      <View style={styles.noteHeader}>
        <Text
          style={[styles.noteTitle, isDark && styles.noteTitleDark]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {note.title || 'Untitled'}
        </Text>
        {note.is_favorite && (
          <TouchableOpacity
            onPress={onToggleFavorite}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Remove from favorites"
          >
            <FontAwesome name="star" size={14} color="#f59e0b" />
          </TouchableOpacity>
        )}
      </View>
      <Text
        style={[styles.notePreview, isDark && styles.notePreviewDark]}
        numberOfLines={2}
      >
        {note.content?.replace(/[#*`]/g, '').slice(0, 100) || 'No content'}
      </Text>
      <Text style={[styles.noteDate, isDark && styles.noteDateDark]}>
        {formatDate(note.updated_at)}
      </Text>
    </TouchableOpacity>
  );
}

// Memoize component to prevent unnecessary re-renders
export const NoteCard = memo(NoteCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.title === nextProps.note.title &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.is_favorite === nextProps.note.is_favorite &&
    prevProps.note.updated_at === nextProps.note.updated_at &&
    prevProps.isDark === nextProps.isDark
  );
});

const styles = StyleSheet.create({
  noteCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noteCardDark: {
    backgroundColor: '#1f2937',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  noteTitleDark: {
    color: '#f9fafb',
  },
  notePreview: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notePreviewDark: {
    color: '#9ca3af',
  },
  noteDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  noteDateDark: {
    color: '#6b7280',
  },
});

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import { useHaptics } from '@/hooks/useHaptics';
import { NoteCard } from '@/components/notes/NoteCard';
import type { Note } from '@expandnote/shared/types';

type FilterTab = 'all' | 'favorites' | 'archived' | 'trash';

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const colorScheme = useColorScheme();
  const router = useRouter();
  const haptics = useHaptics();

  const isDark = colorScheme === 'dark';

  const fetchNotes = useCallback(async () => {
    let query = supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });

    // Apply filters
    switch (activeFilter) {
      case 'favorites':
        query = query.eq('is_favorite', true).is('deleted_at', null);
        break;
      case 'archived':
        query = query.eq('is_archived', true).is('deleted_at', null);
        break;
      case 'trash':
        query = query.not('deleted_at', 'is', null);
        break;
      case 'all':
      default:
        query = query.eq('is_archived', false).is('deleted_at', null);
        break;
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notes:', error);
    } else {
      setNotes(data || []);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, [activeFilter]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotes();
  };

  const toggleFavorite = async (note: Note) => {
    haptics.light();
    const newFavorite = !note.is_favorite;

    // Optimistic update
    setNotes(prev => prev.map(n =>
      n.id === note.id ? { ...n, is_favorite: newFavorite } : n
    ));

    const { error } = await supabase
      .from('notes')
      .update({ is_favorite: newFavorite })
      .eq('id', note.id);

    if (error) {
      haptics.error();
      // Revert on error
      setNotes(prev => prev.map(n =>
        n.id === note.id ? { ...n, is_favorite: !newFavorite } : n
      ));
      Alert.alert('Error', 'Failed to update note');
    }
  };

  const archiveNote = async (note: Note) => {
    haptics.medium();
    const newArchived = !note.is_archived;

    // Optimistic update - remove from list if archiving
    if (activeFilter === 'all' && newArchived) {
      setNotes(prev => prev.filter(n => n.id !== note.id));
    }

    const { error } = await supabase
      .from('notes')
      .update({ is_archived: newArchived })
      .eq('id', note.id);

    if (error) {
      haptics.error();
      Alert.alert('Error', 'Failed to archive note');
      fetchNotes();
    }
  };

  const deleteNote = async (note: Note) => {
    haptics.warning();
    if (note.deleted_at) {
      // Permanently delete from trash
      Alert.alert(
        'Delete Forever',
        'This will permanently delete the note. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              haptics.heavy();
              setNotes(prev => prev.filter(n => n.id !== note.id));
              const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', note.id);
              if (error) {
                haptics.error();
                Alert.alert('Error', 'Failed to delete note');
                fetchNotes();
              }
            },
          },
        ]
      );
    } else {
      // Move to trash
      setNotes(prev => prev.filter(n => n.id !== note.id));
      const { error } = await supabase
        .from('notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', note.id);
      if (error) {
        haptics.error();
        Alert.alert('Error', 'Failed to delete note');
        fetchNotes();
      }
    }
  };

  const restoreNote = async (note: Note) => {
    haptics.success();
    setNotes(prev => prev.filter(n => n.id !== note.id));
    const { error } = await supabase
      .from('notes')
      .update({ deleted_at: null })
      .eq('id', note.id);
    if (error) {
      haptics.error();
      Alert.alert('Error', 'Failed to restore note');
      fetchNotes();
    }
  };

  // Memoized callbacks for NoteCard - prevent re-creating on each render
  const handleNotePress = useCallback((noteId: string) => {
    router.push(`/(app)/note/${noteId}`);
  }, [router]);

  // Note card height is approximately 120px (padding + content)
  const ITEM_HEIGHT = 120;

  const getItemLayout = useCallback((_: unknown, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const renderLeftActions = useCallback((note: Note) => {
    return (
      <TouchableOpacity
        style={[styles.swipeAction, styles.favoriteAction]}
        onPress={() => toggleFavorite(note)}
        accessibilityRole="button"
        accessibilityLabel={note.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <FontAwesome
          name={note.is_favorite ? 'star' : 'star-o'}
          size={24}
          color="#fff"
        />
        <Text style={styles.swipeActionText}>
          {note.is_favorite ? 'Unfavorite' : 'Favorite'}
        </Text>
      </TouchableOpacity>
    );
  }, [toggleFavorite]);

  const renderRightActions = useCallback((note: Note) => {
    if (note.deleted_at) {
      return (
        <View style={styles.swipeActionsContainer}>
          <TouchableOpacity
            style={[styles.swipeAction, styles.restoreAction]}
            onPress={() => restoreNote(note)}
            accessibilityRole="button"
            accessibilityLabel="Restore note from trash"
          >
            <FontAwesome name="undo" size={24} color="#fff" />
            <Text style={styles.swipeActionText}>Restore</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeAction, styles.deleteAction]}
            onPress={() => deleteNote(note)}
            accessibilityRole="button"
            accessibilityLabel="Permanently delete note"
          >
            <FontAwesome name="trash" size={24} color="#fff" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.swipeActionsContainer}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.archiveAction]}
          onPress={() => archiveNote(note)}
          accessibilityRole="button"
          accessibilityLabel={note.is_archived ? 'Unarchive note' : 'Archive note'}
        >
          <FontAwesome name="archive" size={24} color="#fff" />
          <Text style={styles.swipeActionText}>
            {note.is_archived ? 'Unarchive' : 'Archive'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => deleteNote(note)}
          accessibilityRole="button"
          accessibilityLabel="Move note to trash"
        >
          <FontAwesome name="trash" size={24} color="#fff" />
          <Text style={styles.swipeActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  }, [archiveNote, deleteNote, restoreNote]);

  const renderNote = useCallback(({ item }: { item: Note }) => (
    <Swipeable
      renderLeftActions={() => renderLeftActions(item)}
      renderRightActions={() => renderRightActions(item)}
      overshootLeft={false}
      overshootRight={false}
    >
      <NoteCard
        note={item}
        isDark={isDark}
        onPress={() => handleNotePress(item.id)}
        onToggleFavorite={() => toggleFavorite(item)}
      />
    </Swipeable>
  ), [isDark, handleNotePress, renderLeftActions, renderRightActions, toggleFavorite]);

  const filterTabs = useMemo(() => [
    { key: 'all', label: 'All', icon: 'sticky-note' },
    { key: 'favorites', label: 'Favorites', icon: 'star' },
    { key: 'archived', label: 'Archived', icon: 'archive' },
    { key: 'trash', label: 'Trash', icon: 'trash' },
  ] as const, []);

  const FilterTabs = useMemo(() => (
    <View
      style={[styles.filterTabs, isDark && styles.filterTabsDark]}
      accessibilityRole="tablist"
    >
      {filterTabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.filterTab,
            activeFilter === tab.key && styles.filterTabActive,
          ]}
          onPress={() => setActiveFilter(tab.key as FilterTab)}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeFilter === tab.key }}
          accessibilityLabel={`${tab.label} notes filter`}
        >
          <FontAwesome
            name={tab.icon as any}
            size={16}
            color={activeFilter === tab.key ? '#3b82f6' : (isDark ? '#9ca3af' : '#6b7280')}
          />
          <Text
            style={[
              styles.filterTabText,
              isDark && styles.filterTabTextDark,
              activeFilter === tab.key && styles.filterTabTextActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [isDark, activeFilter, filterTabs]);

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome
        name={activeFilter === 'trash' ? 'trash-o' : activeFilter === 'favorites' ? 'star-o' : 'sticky-note-o'}
        size={64}
        color={isDark ? '#4b5563' : '#9ca3af'}
      />
      <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
        {activeFilter === 'all' && 'No notes yet'}
        {activeFilter === 'favorites' && 'No favorites'}
        {activeFilter === 'archived' && 'No archived notes'}
        {activeFilter === 'trash' && 'Trash is empty'}
      </Text>
      <Text style={[styles.emptySubtext, isDark && styles.emptySubtextDark]}>
        {activeFilter === 'all' && 'Tap the + button to create your first note'}
        {activeFilter === 'favorites' && 'Swipe right on a note to favorite it'}
        {activeFilter === 'archived' && 'Swipe left and tap Archive to archive notes'}
        {activeFilter === 'trash' && 'Deleted notes will appear here'}
      </Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, isDark && styles.containerDark]}>
        {FilterTabs}
        <FlatList
          data={notes}
          renderItem={renderNote}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            notes.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={isDark ? '#60a5fa' : '#3b82f6'}
            />
          }
          ListEmptyComponent={!isLoading ? EmptyState : null}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={10}
          initialNumToRender={10}
          getItemLayout={getItemLayout}
        />

        {activeFilter !== 'trash' && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/(app)/note/new')}
            accessibilityRole="button"
            accessibilityLabel="Create new note"
          >
            <FontAwesome name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </GestureHandlerRootView>
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
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTabsDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterTabActive: {
    backgroundColor: '#dbeafe',
  },
  filterTabText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTabTextDark: {
    color: '#9ca3af',
  },
  filterTabTextActive: {
    color: '#3b82f6',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listContentEmpty: {
    flex: 1,
  },
  swipeActionsContainer: {
    flexDirection: 'row',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingHorizontal: 8,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  favoriteAction: {
    backgroundColor: '#f59e0b',
  },
  archiveAction: {
    backgroundColor: '#6b7280',
  },
  deleteAction: {
    backgroundColor: '#ef4444',
  },
  restoreAction: {
    backgroundColor: '#22c55e',
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

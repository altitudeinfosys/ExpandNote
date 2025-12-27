import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import type { Note, Tag } from '@expandnote/shared/types';
import { SEARCH_DEBOUNCE_MS } from '@expandnote/shared/constants';

interface NoteWithTags extends Omit<Note, 'tags'> {
  tags?: { tag: Tag }[];
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteWithTags[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setAllTags(data);
    }
  };

  const performSearch = useCallback(async (searchQuery: string, tagIds: string[]) => {
    if (searchQuery.length < 2 && tagIds.length === 0) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    let notesQuery = supabase
      .from('notes')
      .select(`
        *,
        tags:note_tags(tag:tags(*))
      `)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(30);

    // Text search
    if (searchQuery.length >= 2) {
      notesQuery = notesQuery.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
    }

    const { data, error } = await notesQuery;

    if (error) {
      console.error('Search error:', error);
      setIsSearching(false);
      return;
    }

    let filteredResults = data || [];

    // Filter by selected tags
    if (tagIds.length > 0) {
      filteredResults = filteredResults.filter(note => {
        const noteTags = note.tags?.map((t: any) => t.tag?.id).filter(Boolean) || [];
        return tagIds.some(tagId => noteTags.includes(tagId));
      });
    }

    setResults(filteredResults);
    setIsSearching(false);
  }, []);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery, selectedTags);
    }, SEARCH_DEBOUNCE_MS);
  };

  const toggleTagFilter = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];

    setSelectedTags(newSelectedTags);
    performSearch(query, newSelectedTags);
  };

  const clearFilters = () => {
    setSelectedTags([]);
    if (query.length >= 2) {
      performSearch(query, []);
    } else {
      setResults([]);
    }
  };

  // Highlight matching text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      return <Text>{text}</Text>;
    }

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));

    return (
      <Text>
        {parts.map((part, index) =>
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <Text key={index} style={styles.highlight}>{part}</Text>
          ) : (
            <Text key={index}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderResult = ({ item }: { item: NoteWithTags }) => {
    const noteTags = item.tags?.map((t: any) => t.tag).filter(Boolean) || [];
    const titleText = item.title || 'Untitled';
    const previewText = item.content?.replace(/[#*`]/g, '').slice(0, 100) || 'No content';

    return (
      <TouchableOpacity
        style={[styles.resultCard, isDark && styles.resultCardDark]}
        onPress={() => router.push(`/(app)/note/${item.id}`)}
      >
        <View style={styles.resultHeader}>
          <Text style={[styles.resultTitle, isDark && styles.resultTitleDark]} numberOfLines={1}>
            {highlightText(titleText, query)}
          </Text>
          {item.is_favorite && (
            <FontAwesome name="star" size={12} color="#f59e0b" />
          )}
        </View>
        <Text style={[styles.resultPreview, isDark && styles.resultPreviewDark]} numberOfLines={2}>
          {highlightText(previewText, query)}
        </Text>
        <View style={styles.resultFooter}>
          <Text style={[styles.resultDate, isDark && styles.resultDateDark]}>
            {formatDate(item.updated_at)}
          </Text>
          {noteTags.length > 0 && (
            <View style={styles.resultTags}>
              {noteTags.slice(0, 3).map((tag: Tag) => (
                <View key={tag.id} style={[styles.resultTagChip, isDark && styles.resultTagChipDark]}>
                  <Text style={[styles.resultTagText, isDark && styles.resultTagTextDark]}>
                    {tag.name}
                  </Text>
                </View>
              ))}
              {noteTags.length > 3 && (
                <Text style={[styles.moreTagsText, isDark && styles.moreTagsTextDark]}>
                  +{noteTags.length - 3}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome
        name="search"
        size={48}
        color={isDark ? '#4b5563' : '#9ca3af'}
      />
      <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
        {query.length > 0 || selectedTags.length > 0
          ? 'No results found'
          : 'Search your notes'}
      </Text>
      <Text style={[styles.emptySubtext, isDark && styles.emptySubtextDark]}>
        {query.length > 0 || selectedTags.length > 0
          ? 'Try different keywords or filters'
          : 'Type to search or select tags to filter'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Search Input */}
      <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
        <FontAwesome
          name="search"
          size={16}
          color={isDark ? '#6b7280' : '#9ca3af'}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, isDark && styles.searchInputDark]}
          placeholder="Search notes..."
          placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isSearching && (
          <ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 8 }} />
        )}
        {query.length > 0 && !isSearching && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <FontAwesome
              name="times-circle"
              size={18}
              color={isDark ? '#6b7280' : '#9ca3af'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterLabel, isDark && styles.filterLabelDark]}>
              Filter by tags
            </Text>
            {selectedTags.length > 0 && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsScroll}
          >
            {allTags.map(tag => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.tagFilter,
                    isDark && styles.tagFilterDark,
                    isSelected && styles.tagFilterSelected,
                  ]}
                  onPress={() => toggleTagFilter(tag.id)}
                >
                  <FontAwesome
                    name="tag"
                    size={12}
                    color={isSelected ? '#fff' : (isDark ? '#9ca3af' : '#6b7280')}
                  />
                  <Text
                    style={[
                      styles.tagFilterText,
                      isDark && styles.tagFilterTextDark,
                      isSelected && styles.tagFilterTextSelected,
                    ]}
                  >
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Results Count */}
      {(query.length >= 2 || selectedTags.length > 0) && !isSearching && (
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, isDark && styles.resultsCountDark]}>
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </Text>
        </View>
      )}

      {/* Results List */}
      <FlatList
        data={results}
        renderItem={renderResult}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          results.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={!isSearching ? EmptyState : null}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchContainerDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  searchInputDark: {
    color: '#f9fafb',
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterLabelDark: {
    color: '#9ca3af',
  },
  clearText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  tagsScroll: {
    gap: 8,
  },
  tagFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  tagFilterDark: {
    backgroundColor: '#374151',
  },
  tagFilterSelected: {
    backgroundColor: '#3b82f6',
  },
  tagFilterText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  tagFilterTextDark: {
    color: '#9ca3af',
  },
  tagFilterTextSelected: {
    color: '#fff',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 13,
    color: '#6b7280',
  },
  resultsCountDark: {
    color: '#9ca3af',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  listContentEmpty: {
    flex: 1,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultCardDark: {
    backgroundColor: '#1f2937',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  resultTitleDark: {
    color: '#f9fafb',
  },
  resultPreview: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginTop: 4,
  },
  resultPreviewDark: {
    color: '#9ca3af',
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  resultDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  resultDateDark: {
    color: '#6b7280',
  },
  resultTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultTagChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  resultTagChipDark: {
    backgroundColor: '#374151',
  },
  resultTagText: {
    fontSize: 11,
    color: '#6b7280',
  },
  resultTagTextDark: {
    color: '#9ca3af',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  moreTagsTextDark: {
    color: '#6b7280',
  },
  highlight: {
    backgroundColor: '#fef08a',
    color: '#854d0e',
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

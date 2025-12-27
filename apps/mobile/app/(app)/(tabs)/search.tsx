import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import type { Note } from '@expandnote/shared/types';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const colorScheme = useColorScheme();
  const router = useRouter();

  const isDark = colorScheme === 'dark';

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);

    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Search error:', error);
    } else {
      setResults(data || []);
    }

    setIsSearching(false);
  };

  const renderResult = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={[styles.resultCard, isDark && styles.resultCardDark]}
      onPress={() => router.push(`/(app)/note/${item.id}`)}
    >
      <Text style={[styles.resultTitle, isDark && styles.resultTitleDark]} numberOfLines={1}>
        {item.title || 'Untitled'}
      </Text>
      <Text style={[styles.resultPreview, isDark && styles.resultPreviewDark]} numberOfLines={2}>
        {item.content?.replace(/[#*`]/g, '').slice(0, 100) || 'No content'}
      </Text>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome
        name="search"
        size={48}
        color={isDark ? '#4b5563' : '#9ca3af'}
      />
      <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
        {query.length > 0 ? 'No results found' : 'Search your notes'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
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
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <FontAwesome
              name="times-circle"
              size={18}
              color={isDark ? '#6b7280' : '#9ca3af'}
            />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={results}
        renderItem={renderResult}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          results.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={EmptyState}
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
  listContent: {
    padding: 16,
    paddingTop: 0,
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
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  resultTitleDark: {
    color: '#f9fafb',
  },
  resultPreview: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  resultPreviewDark: {
    color: '#9ca3af',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  emptyTextDark: {
    color: '#9ca3af',
  },
});

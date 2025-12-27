'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineFirst } from '@/hooks/useOfflineFirst';
import { NoteList } from '@/components/NoteList';
import { NoteEditor } from '@/components/NoteEditor';
import { SearchBar } from '@/components/SearchBar';
import { TagFilter } from '@/components/TagFilter';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';

export default function OfflineDashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const {
    // Core offline state
    syncStatus,
    lastSyncTime,
    manualSync,

    // Notes
    notes,
    selectedNote,
    selectedNoteId,
    notesLoading: isLoading,
    notesError: error,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    selectNote,

    // Tags
    selectedTagIds,
    fetchTags,
  } = useOfflineFirst();

  const [showEditor, setShowEditor] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Show editor when a note is selected
  useEffect(() => {
    setShowEditor(!!selectedNoteId);
  }, [selectedNoteId]);

  // Refilter notes when selected tags change
  useEffect(() => {
    // When tag selection changes, reapply the filter
    // This will trigger a new search with the current query and updated tag selection
    handleSearch('');
  }, [selectedTagIds]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleCreateNote = useCallback(async () => {
    setIsCreatingNote(true);
    try {
      const newNote = await createNote({
        title: null,
        content: '',
        is_favorite: false,
      });
      selectNote(newNote.id);
      setShowEditor(true);
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('Failed to create note. Please try again.');
    } finally {
      setIsCreatingNote(false);
    }
  }, [createNote, selectNote]);

  const handleSelectNote = useCallback(
    (noteId: string) => {
      selectNote(noteId);
      setShowEditor(true);
    },
    [selectNote]
  );

  const handleCloseEditor = useCallback(() => {
    selectNote(null);
    setShowEditor(false);
  }, [selectNote]);

  const handleSaveNote = useCallback(
    async (noteData: {
      title: string | null;
      content: string;
      is_favorite: boolean;
    }) => {
      if (!selectedNote) return;
      await updateNote(selectedNote.id, noteData);
    },
    [selectedNote, updateNote]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      try {
        await deleteNote(noteId);
        // Refetch notes to ensure UI is in sync with storage
        await fetchNotes();
      } catch (error) {
        console.error('Failed to delete note:', error);
        // Refetch anyway to ensure UI consistency
        await fetchNotes();
      }
    },
    [deleteNote, fetchNotes]
  );

  const handleSearch = useCallback(
    (query: string) => {
      // If tag filtering is active, use both query and tags
      searchNotes(query, {
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined
      });
    },
    [searchNotes, selectedTagIds]
  );

  const handleSyncClick = useCallback(() => {
    manualSync();
  }, [manualSync]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ExpandNote
          </h1>
          <div className="flex items-center gap-4">
            <SyncStatusIndicator
              status={syncStatus}
              lastSyncTime={lastSyncTime}
              onSync={handleSyncClick}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Note List */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Search and Create */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
            <SearchBar onSearch={handleSearch} />
            <button
              onClick={handleCreateNote}
              disabled={isCreatingNote}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {isCreatingNote ? 'Creating...' : 'New Note'}
            </button>
          </div>

          {/* Tag Filter */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <TagFilter />
          </div>

          {/* Note List */}
          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <NoteList
              notes={notes}
              selectedNoteId={selectedNoteId}
              onSelectNote={handleSelectNote}
              onCreateNote={handleCreateNote}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {showEditor && selectedNote ? (
            <NoteEditor
              note={selectedNote}
              onSave={handleSaveNote}
              onDelete={handleDeleteNote}
              onClose={handleCloseEditor}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-12 h-12 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome to ExpandNote
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Select a note or create a new one to get started
                </p>
                <button
                  onClick={handleCreateNote}
                  disabled={isCreatingNote}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Create Your First Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
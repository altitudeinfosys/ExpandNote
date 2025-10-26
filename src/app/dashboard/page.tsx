'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes } from '@/hooks/useNotes';
import { useTags } from '@/hooks/useTags';
import { NoteList } from '@/components/NoteList';
import { NoteEditor } from '@/components/NoteEditor';
import { SearchBar } from '@/components/SearchBar';
import { TagFilter } from '@/components/TagFilter';

// Constants for responsive breakpoints and layout (defined outside component to prevent recreation)
const MOBILE_BREAKPOINT = 768; // Matches Tailwind's 'md' breakpoint
const HEADER_HEIGHT = 73; // px - header height (py-4 + text + borders)

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // Use API-based hooks instead of offline-first
  const {
    notes,
    isLoading,
    error,
    fetchNotes,
    createNote,
    updateNoteById,
    deleteNoteById,
    searchNotes,
  } = useNotes();

  const {
    selectedTagIds,
    fetchTags,
    getTagsForNote,
    updateNoteTags: updateNoteTagsOriginal,
  } = useTags();

  // Wrap updateNoteTags to refetch notes after updating
  const updateNoteTags = useCallback(async (noteId: string, tagIds: string[]) => {
    const result = await updateNoteTagsOriginal(noteId, tagIds);
    // Refetch notes to get updated tag data
    await fetchNotes();
    return result;
  }, [updateNoteTagsOriginal, fetchNotes]);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;

  const [showEditor, setShowEditor] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  // Initialize sidebar state based on viewport to prevent hydration mismatch
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true; // SSR default
    return window.innerWidth >= MOBILE_BREAKPOINT; // Desktop: open, Mobile: closed
  });
  // Initialize isMobile with same check to prevent flash of incorrect UI
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false; // SSR default
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch notes and tags on mount
  useEffect(() => {
    if (user && !authLoading) {
      fetchNotes();
      fetchTags();
    }
  }, [user, authLoading, fetchNotes, fetchTags]);

  // Show editor when a note is selected
  useEffect(() => {
    setShowEditor(!!selectedNoteId);
  }, [selectedNoteId]);

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
      setSelectedNoteId(newNote.id);
      setShowEditor(true);
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('Failed to create note. Please try again.');
    } finally {
      setIsCreatingNote(false);
    }
  }, [createNote]);

  const handleSelectNote = useCallback(
    (noteId: string) => {
      setSelectedNoteId(noteId);
      setShowEditor(true);
      // Close sidebar on mobile when note is selected
      setSidebarOpen(false);
    },
    []
  );

  const handleCloseEditor = useCallback(() => {
    setSelectedNoteId(null);
    setShowEditor(false);
    // Open sidebar on mobile when editor is closed (going back to list)
    setSidebarOpen(true);
  }, []);

  const handleSaveNote = useCallback(
    async (noteData: {
      title: string | null;
      content: string;
      is_favorite: boolean;
    }) => {
      if (!selectedNote) return;

      await updateNoteById(selectedNote.id, noteData);
    },
    [selectedNote, updateNoteById]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      try {
        // Close the editor first to prevent any state issues
        handleCloseEditor();

        await deleteNoteById(noteId);
        // Refetch notes to ensure UI is in sync with backend
        await fetchNotes();
      } catch (error) {
        console.error('Failed to delete note:', error);
        // Refetch anyway to ensure UI consistency
        await fetchNotes();
      }
    },
    [deleteNoteById, fetchNotes, handleCloseEditor]
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

  // Refilter notes when selected tags change
  useEffect(() => {
    // When tag selection changes, reapply the filter
    // This will trigger a new search with the current query and updated tag selection
    handleSearch('');
  }, [selectedTagIds, handleSearch]);

  // Detect mobile viewport and handle window resize with throttling
  useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;

    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      // Only update if state actually changed to prevent unnecessary rerenders
      setIsMobile(prev => prev !== mobile ? mobile : prev);
    };

    // Throttled resize handler (150ms delay to reduce event frequency)
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 150);
    };

    // Initial check
    checkMobile();

    // Handle resize with throttling
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Lock body scroll and handle keyboard when sidebar is open on mobile
  useEffect(() => {
    if (!isMobile) return;

    // Scroll lock
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Keyboard handler
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, isMobile]);

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
          <div className="flex items-center gap-3">
            {/* Hamburger Menu - Mobile Only */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-3 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-colors"
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              ExpandNote
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-300">
              {user.email}
            </span>
            <button
              onClick={() => router.push('/settings')}
              className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              Settings
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 sm:px-4 py-2 text-sm bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors font-medium shadow-sm border border-gray-400 dark:border-gray-600"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Backdrop Overlay - Mobile Only */}
        {sidebarOpen && isMobile && (
          <div
            className="fixed left-0 right-0 bottom-0 bg-black/50 z-20 md:hidden"
            style={{ top: `${HEADER_HEIGHT}px` }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar - Note List */}
        <div
          className={`
            w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col
            md:relative md:h-full
            fixed left-0 z-30
            transform will-change-transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          // On mobile, sidebar is fixed positioned below header
          style={{ top: `${HEADER_HEIGHT}px`, height: `calc(100vh - ${HEADER_HEIGHT}px)` }}
          role={isMobile ? "dialog" : undefined}
          aria-modal={isMobile && sidebarOpen ? "true" : undefined}
        >
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
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
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
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showEditor && selectedNote ? (
            <NoteEditor
              note={selectedNote}
              onSave={handleSaveNote}
              onDelete={handleDeleteNote}
              onClose={handleCloseEditor}
              getTagsForNote={getTagsForNote}
              updateNoteTags={updateNoteTags}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-gray-400 dark:text-gray-500"
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
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {notes.length === 0 ? 'Start writing' : 'Select a note'}
                </h2>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-6">
                  {notes.length === 0
                    ? 'Create your first note to get started'
                    : 'Choose a note from the list or create a new one'}
                </p>
                {notes.length === 0 && (
                  <button
                    onClick={handleCreateNote}
                    disabled={isCreatingNote}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm md:text-base"
                  >
                    Create Note
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

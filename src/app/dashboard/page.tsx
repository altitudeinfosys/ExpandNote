'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes } from '@/hooks/useNotes';
import { useTags } from '@/hooks/useTags';
import { NoteList } from '@/components/NoteList';
import { NoteEditor } from '@/components/NoteEditor';
import { SearchBar } from '@/components/SearchBar';
import { TagFilter } from '@/components/TagFilter';

// Constants for responsive breakpoints and layout (defined outside component to prevent recreation)
const MOBILE_BREAKPOINT = 1024; // Matches Tailwind's 'lg' breakpoint for three-column layout
const RESIZE_THROTTLE_MS = 150; // Throttle resize events to prevent excessive re-renders
const MOBILE_HEADER_HEIGHT = 57; // Height of mobile header in pixels

// View types and constants
type DashboardView = 'all-notes' | 'trash';

const DASHBOARD_VIEWS = {
  ALL_NOTES: 'all-notes' as const,
  TRASH: 'trash' as const,
};

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
    getTagsForNote,
    updateNoteTags: updateNoteTagsOriginal,
    clearTagSelection,
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
  const [currentView, setCurrentView] = useState<DashboardView>(DASHBOARD_VIEWS.ALL_NOTES);
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

  // Fetch notes on mount and when view changes (tags are fetched automatically by useTags hook)
  useEffect(() => {
    if (user && !authLoading) {
      fetchNotes({ showTrash: currentView === DASHBOARD_VIEWS.TRASH });
    }
  }, [user, authLoading, fetchNotes, currentView]);

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
    // Close sidebar on mobile when creating a new note
    if (isMobile) {
      setSidebarOpen(false);
    }
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
  }, [createNote, isMobile]);

  const handleSelectNote = useCallback(
    (noteId: string) => {
      setSelectedNoteId(noteId);
      setShowEditor(true);
      // Close sidebar on mobile when note is selected
      if (isMobile) {
        setSidebarOpen(false);
      }
    },
    [isMobile]
  );

  const handleCloseEditor = useCallback(() => {
    setSelectedNoteId(null);
    setShowEditor(false);
    // Keep sidebar closed on mobile when returning to list
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

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
        await deleteNoteById(noteId);
        // Close the editor after successful delete
        handleCloseEditor();
      } catch (error) {
        console.error('Failed to delete note:', error);
        alert('Failed to delete note. Please try again.');
      } finally {
        // Always refetch notes to ensure UI is in sync with backend
        // Preserve the current view context (trash or all notes)
        await fetchNotes({ showTrash: currentView === DASHBOARD_VIEWS.TRASH });
      }
    },
    [deleteNoteById, fetchNotes, handleCloseEditor, currentView]
  );

  const handleSearch = useCallback(
    (query: string) => {
      // Don't allow search in trash view
      if (currentView === DASHBOARD_VIEWS.TRASH) {
        return;
      }
      // If tag filtering is active, use both query and tags
      searchNotes(query, {
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined
      });
    },
    [searchNotes, selectedTagIds, currentView]
  );

  const handleShowAllNotes = useCallback(() => {
    setCurrentView(DASHBOARD_VIEWS.ALL_NOTES);
    // Clear tag selection - effect will fetch all notes when selection is empty
    clearTagSelection();
    // Refresh notes when switching to All Notes view
    fetchNotes({ showTrash: false });
  }, [clearTagSelection, fetchNotes]);

  const handleShowTrash = useCallback(() => {
    setCurrentView(DASHBOARD_VIEWS.TRASH);
    // Clear tag selection when viewing trash
    clearTagSelection();
    // Refresh notes when switching to Trash view
    fetchNotes({ showTrash: true });
  }, [clearTagSelection, fetchNotes]);

  const handleRefresh = useCallback(() => {
    fetchNotes({ showTrash: currentView === DASHBOARD_VIEWS.TRASH });
  }, [fetchNotes, currentView]);

  // Refilter notes when selected tags change
  // Use a ref to track previous tag IDs and prevent infinite loop
  const prevSelectedTagIds = useRef<Set<string>>(new Set());
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip on initial mount - fetchNotes() is called separately
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevSelectedTagIds.current = new Set(selectedTagIds);
      return;
    }

    // Don't apply tag filters when viewing trash
    if (currentView === DASHBOARD_VIEWS.TRASH) {
      return;
    }

    // Use Set-based comparison to detect actual changes (order-independent)
    const currentSet = new Set(selectedTagIds);
    const prevSet = prevSelectedTagIds.current;

    // Check if sets are different (size or contents)
    const tagsChanged =
      currentSet.size !== prevSet.size ||
      Array.from(currentSet).some(id => !prevSet.has(id));

    if (tagsChanged) {
      // Store the current set for next comparison
      prevSelectedTagIds.current = currentSet;

      // When tag selection changes, reapply the filter
      if (selectedTagIds.length > 0) {
        // Filter by selected tags
        searchNotes('', { tagIds: selectedTagIds });
      } else {
        // No tags selected - show all notes
        fetchNotes();
      }
    }
  }, [selectedTagIds, searchNotes, fetchNotes, currentView]);

  // Detect mobile viewport and handle window resize with throttling
  useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const checkMobile = () => {
      // Only update state if component is still mounted
      if (!isMounted) return;

      // Use < MOBILE_BREAKPOINT (1024) to match Tailwind's lg: breakpoint behavior
      // lg: applies at 1024px and above, so mobile is anything below 1024
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      // Only update if state actually changed to prevent unnecessary rerenders
      setIsMobile(prev => prev !== mobile ? mobile : prev);
    };

    // Throttled resize handler to reduce event frequency
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, RESIZE_THROTTLE_MS);
    };

    // Initial check
    checkMobile();

    // Handle resize with throttling
    window.addEventListener('resize', handleResize);
    return () => {
      isMounted = false;
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
      {/* Mobile Header */}
      <header className="lg:hidden bg-gray-900 dark:bg-black border-b border-gray-700 dark:border-gray-800">
        <div className="px-4 py-3 flex justify-between items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-800 dark:hover:bg-gray-900 rounded transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-gray-300"
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
          <div className="flex items-center gap-2">
            <Image
              src="/logo-icon.svg"
              alt="ExpandNote"
              width={24}
              height={24}
              className="w-6 h-6 dark:hidden"
            />
            <Image
              src="/logo-icon-dark.svg"
              alt="ExpandNote"
              width={24}
              height={24}
              className="w-6 h-6 hidden dark:block"
            />
            <h1 className="text-lg font-semibold text-white">
              {currentView === DASHBOARD_VIEWS.ALL_NOTES ? 'All Notes' : 'Trash'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-800 dark:hover:bg-gray-900 rounded transition-colors"
              aria-label="Refresh notes"
            >
              <svg
                className="w-6 h-6 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={handleCreateNote}
              disabled={isCreatingNote}
              className="p-2 hover:bg-gray-800 dark:hover:bg-gray-900 rounded transition-colors"
              aria-label="New note"
            >
              <svg
                className="w-6 h-6 text-blue-400"
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
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* LEFT COLUMN: Navigation & Tags (Desktop always visible, Mobile slides in) */}
        <div
          className={`
            bg-gray-900 dark:bg-black border-r border-gray-700 dark:border-gray-800 flex flex-col flex-shrink-0
            transition-all duration-300 ease-in-out
            ${isMobile
              ? `${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`
              : 'w-64'
            }
          `}
          style={isMobile ? { height: `calc(100vh - ${MOBILE_HEADER_HEIGHT}px)` } : undefined}
          role={isMobile ? "dialog" : undefined}
          aria-modal={isMobile && sidebarOpen ? "true" : undefined}
        >
          {/* Logo */}
          <div className="px-4 py-6 border-b border-gray-700 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-icon.svg"
                alt="ExpandNote"
                width={32}
                height={32}
                className="w-8 h-8 dark:hidden"
              />
              <Image
                src="/logo-icon-dark.svg"
                alt="ExpandNote"
                width={32}
                height={32}
                className="w-8 h-8 hidden dark:block"
              />
              <span className="text-xl font-semibold text-white">ExpandNote</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="py-4">
            <button
              onClick={handleShowAllNotes}
              className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${
                currentView === DASHBOARD_VIEWS.ALL_NOTES
                  ? 'text-white bg-gray-800 dark:bg-gray-900 border-l-4 border-blue-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800 dark:hover:bg-gray-900 border-l-4 border-transparent'
              }`}
              aria-label="View all active notes"
              aria-pressed={currentView === DASHBOARD_VIEWS.ALL_NOTES}
            >
              <svg className={`w-5 h-5 ${currentView === DASHBOARD_VIEWS.ALL_NOTES ? 'text-blue-400' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
              </svg>
              <span className="font-medium">All Notes</span>
            </button>
            <button
              onClick={handleShowTrash}
              className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${
                currentView === DASHBOARD_VIEWS.TRASH
                  ? 'text-white bg-gray-800 dark:bg-gray-900 border-l-4 border-blue-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800 dark:hover:bg-gray-900 border-l-4 border-transparent'
              }`}
              aria-label="View deleted notes in trash"
              aria-pressed={currentView === DASHBOARD_VIEWS.TRASH}
            >
              <svg className={`w-5 h-5 ${currentView === DASHBOARD_VIEWS.TRASH ? 'text-blue-400' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <span className="font-medium">Trash</span>
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-400 hover:text-white hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
              </svg>
              <span className="font-medium">Settings</span>
            </button>
          </nav>

          {/* Tags Section */}
          <div className="flex-1 overflow-y-auto px-4 py-3 border-t border-gray-700 dark:border-gray-800">
            <TagFilter />
          </div>

          {/* User Info - Desktop Only */}
          <div className="hidden lg:block px-4 py-3 border-t border-gray-700 dark:border-gray-800">
            <div className="text-xs text-gray-400 truncate">{user.email}</div>
            <button
              onClick={handleSignOut}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* MIDDLE COLUMN: Note List (Desktop ~25%, Mobile full when no note selected) */}
        <div
          className={`
            bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col
            transition-all duration-300 ease-in-out
            ${isMobile ? (showEditor ? 'hidden' : 'flex-1 h-full') : 'w-96 flex-shrink-0 h-full'}
          `}
        >
          {/* Search and Create */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              {currentView !== DASHBOARD_VIEWS.TRASH && (
                <div className="flex-1">
                  <SearchBar onSearch={handleSearch} />
                </div>
              )}
              {currentView === DASHBOARD_VIEWS.TRASH && (
                <div className="flex-1 text-sm text-gray-500 dark:text-gray-400 px-3 py-2">
                  Search is not available in trash
                </div>
              )}
              <button
                onClick={handleRefresh}
                className="hidden lg:block p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Refresh Notes"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button
                onClick={handleCreateNote}
                disabled={isCreatingNote}
                className="hidden lg:block p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="New Note"
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
              </button>
            </div>
          </div>

          {/* Note List */}
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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

        {/* RIGHT COLUMN: Note Editor (Desktop ~60%, Mobile full when note selected) */}
        <div
          className={`
            bg-white dark:bg-gray-900 flex flex-col overflow-hidden
            ${isMobile ? (showEditor ? 'w-full h-full' : 'hidden') : 'flex-1 h-full'}
          `}
        >
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
            <div className="flex h-full items-center justify-center bg-white dark:bg-gray-900 p-8">
              <div className="text-center max-w-md">
                <svg
                  className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h2 className="text-lg font-medium text-gray-500 dark:text-gray-400">
                  {notes.length === 0 ? 'No notes yet' : 'Select a note to view'}
                </h2>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

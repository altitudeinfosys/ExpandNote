'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotes } from '@/hooks/useNotes';
import { useTags } from '@/hooks/useTags';
import { NoteEditor } from '@/components/NoteEditor';
import { SearchBar } from '@/components/SearchBar';

// Constants
const MOBILE_BREAKPOINT = 768;

// View types
type DashboardView = 'all-notes' | 'favorites' | 'trash';

const DASHBOARD_VIEWS = {
  ALL_NOTES: 'all-notes' as const,
  FAVORITES: 'favorites' as const,
  TRASH: 'trash' as const,
};

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

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
    tags,
  } = useTags();

  const updateNoteTags = useCallback(async (noteId: string, tagIds: string[]) => {
    const result = await updateNoteTagsOriginal(noteId, tagIds);
    await fetchNotes();
    return result;
  }, [updateNoteTagsOriginal, fetchNotes]);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;

  const [showEditor, setShowEditor] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [currentView, setCurrentView] = useState<DashboardView>(DASHBOARD_VIEWS.ALL_NOTES);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch notes on mount
  useEffect(() => {
    if (user && !authLoading) {
      fetchNotes({ showTrash: currentView === DASHBOARD_VIEWS.TRASH });
    }
  }, [user, authLoading, fetchNotes, currentView]);

  // Show editor when note selected
  useEffect(() => {
    setShowEditor(!!selectedNoteId);
  }, [selectedNoteId]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleCreateNote = useCallback(async () => {
    setIsCreatingNote(true);
    if (isMobile) setSidebarOpen(false);

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
      if (isMobile) setSidebarOpen(false);
    },
    [isMobile]
  );

  const handleCloseEditor = useCallback(() => {
    setSelectedNoteId(null);
    setShowEditor(false);
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
        await deleteNoteById(noteId);
        handleCloseEditor();
      } catch (error) {
        console.error('Failed to delete note:', error);
        alert('Failed to delete note. Please try again.');
      } finally {
        await fetchNotes({ showTrash: currentView === DASHBOARD_VIEWS.TRASH });
      }
    },
    [deleteNoteById, fetchNotes, handleCloseEditor, currentView]
  );

  const handleSearch = useCallback(
    (query: string) => {
      if (currentView === DASHBOARD_VIEWS.TRASH) return;
      searchNotes(query, {
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined
      });
    },
    [searchNotes, selectedTagIds, currentView]
  );

  const handleShowAllNotes = useCallback(() => {
    setCurrentView(DASHBOARD_VIEWS.ALL_NOTES);
    clearTagSelection();
    fetchNotes({ showTrash: false });
  }, [clearTagSelection, fetchNotes]);

  const handleShowTrash = useCallback(() => {
    setCurrentView(DASHBOARD_VIEWS.TRASH);
    clearTagSelection();
    fetchNotes({ showTrash: true });
  }, [clearTagSelection, fetchNotes]);

  const handleShowFavorites = useCallback(() => {
    setCurrentView(DASHBOARD_VIEWS.FAVORITES);
    clearTagSelection();
    fetchNotes({ showFavorites: true });
  }, [clearTagSelection, fetchNotes]);

  // Mobile detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[var(--foreground-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Extract first line as title
  const getFirstLine = (content: string) => {
    return content.split('\n')[0].slice(0, 60) || 'Untitled';
  };

  const getPreview = (content: string, title: string | null) => {
    const firstLine = content.split('\n')[0];
    const hasTitle = title || firstLine.length < 60;
    const previewStart = hasTitle ? content.indexOf('\n') + 1 : firstLine.length;
    return content.slice(previewStart, previewStart + 120).trim();
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {/* Mobile Header - Hide when editor is showing */}
      {isMobile && !showEditor && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--background-surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[var(--foreground)]">menu</span>
          </button>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">ExpandNote</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button
              onClick={handleCreateNote}
              disabled={isCreatingNote}
              className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-40' : 'relative'}
          ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          w-64 bg-[var(--background-surface)] border-r border-[var(--border)]
          flex flex-col transition-transform duration-300
          ${isMobile ? 'mt-[57px]' : ''}
        `}
      >
        {/* Logo (Desktop only) */}
        {!isMobile && (
          <div className="px-6 py-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">edit_note</span>
              </div>
              <span className="text-xl font-semibold text-[var(--foreground)]">ExpandNote</span>
            </div>
            <p className="text-xs text-[var(--foreground-secondary)] mt-1">AI Note-Taking</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <button
            onClick={handleShowAllNotes}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              ${currentView === DASHBOARD_VIEWS.ALL_NOTES
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--foreground)] hover:bg-[var(--background)]'
              }
            `}
          >
            <span className="material-symbols-outlined">description</span>
            <span className="font-medium">All Notes</span>
          </button>

          <button
            onClick={handleShowFavorites}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              ${currentView === DASHBOARD_VIEWS.FAVORITES
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--foreground)] hover:bg-[var(--background)]'
              }
            `}
          >
            <span className="material-symbols-outlined">star</span>
            <span className="font-medium">Favorites</span>
          </button>

          <button
            onClick={() => router.push('/settings?section=ai-profiles')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="font-medium">AI Profiles</span>
          </button>

          <button
            onClick={handleShowTrash}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              ${currentView === DASHBOARD_VIEWS.TRASH
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--foreground)] hover:bg-[var(--background)]'
              }
            `}
          >
            <span className="material-symbols-outlined">delete</span>
            <span className="font-medium">Trash</span>
          </button>

          {/* Tags Section */}
          {tags && tags.length > 0 && (
            <div className="pt-4 mt-4 border-t border-[var(--border)]">
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-[var(--foreground-secondary)] uppercase tracking-wider">Tags</h3>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {tags.slice(0, 10).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      if (selectedTagIds.includes(tag.id)) {
                        clearTagSelection();
                      } else {
                        searchNotes('', { tagIds: [tag.id] });
                      }
                    }}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm
                      ${selectedTagIds.includes(tag.id)
                        ? 'bg-[var(--ai-purple)]/10 text-[var(--ai-purple)]'
                        : 'text-[var(--foreground-secondary)] hover:bg-[var(--background)]'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined text-base">tag</span>
                    <span className="truncate">#{tag.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border)] mt-4">
            <button
              onClick={() => router.push('/settings')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="font-medium">Settings</span>
            </button>
          </div>
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)] truncate">{user.email}</p>
              <button
                onClick={handleSignOut}
                className="text-xs text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar (Desktop only) */}
        {!isMobile && (
          <div className="h-16 bg-[var(--background-surface)] border-b border-[var(--border)] px-6 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-[var(--foreground)]">
                {currentView === DASHBOARD_VIEWS.ALL_NOTES && 'All Notes'}
                {currentView === DASHBOARD_VIEWS.FAVORITES && 'Favorites'}
                {currentView === DASHBOARD_VIEWS.TRASH && 'Trash'}
              </h1>
              <span className="text-sm text-[var(--foreground-secondary)]">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span className="material-symbols-outlined text-xl">
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
              <button
                onClick={handleCreateNote}
                disabled={isCreatingNote}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors font-medium"
              >
                <span className="material-symbols-outlined text-xl">add</span>
                <span>New Note</span>
              </button>
            </div>
          </div>
        )}

        {/* Notes + Editor Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Note List */}
          <div
            className={`
              ${isMobile && showEditor ? 'hidden' : 'flex'}
              ${isMobile ? 'w-full mt-[57px]' : 'w-96'}
              flex-col bg-[var(--background-surface)] border-r border-[var(--border)]
              flex-shrink-0
            `}
          >
            {/* Search Bar */}
            {currentView !== DASHBOARD_VIEWS.TRASH && (
              <div className="p-4 border-b border-[var(--border)]">
                <SearchBar onSearch={handleSearch} />
              </div>
            )}

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 bg-[var(--background)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-[var(--foreground-secondary)] text-3xl">
                      description
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                    No notes yet
                  </h3>
                  <p className="text-[var(--foreground-secondary)] mb-4 text-sm">
                    Create your first note to get started
                  </p>
                  <button
                    onClick={handleCreateNote}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                  >
                    Create Note
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {notes.map((note) => {
                    const displayTitle = note.title || getFirstLine(note.content) || 'Untitled';
                    const preview = getPreview(note.content, note.title);
                    const timeAgo = formatTimeAgo(new Date(note.updated_at));
                    const isSelected = note.id === selectedNoteId;

                    return (
                      <button
                        key={note.id}
                        onClick={() => handleSelectNote(note.id)}
                        className={`
                          w-full text-left px-4 py-4 transition-colors
                          ${isSelected
                            ? 'bg-[var(--primary)]/10 border-l-4 border-[var(--primary)]'
                            : 'hover:bg-[var(--background)] border-l-4 border-transparent'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className={`font-semibold text-sm line-clamp-1 ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                            {displayTitle}
                          </h3>
                          <span className="text-xs text-[var(--foreground-secondary)] whitespace-nowrap">
                            {timeAgo}
                          </span>
                        </div>
                        {preview && (
                          <p className="text-xs text-[var(--foreground-secondary)] line-clamp-2">
                            {preview}
                          </p>
                        )}
                        {/* Tags */}
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {note.tags.slice(0, 3).map((tag: { id: string; name: string }) => (
                              <span
                                key={tag.id}
                                className="px-2 py-0.5 text-xs rounded-full bg-[var(--ai-purple)]/10 text-[var(--ai-purple)]"
                              >
                                #{tag.name}
                              </span>
                            ))}
                            {note.tags.length > 3 && (
                              <span className="px-2 py-0.5 text-xs text-[var(--foreground-secondary)]">
                                +{note.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Note Editor */}
          <div className={`
            flex-1 bg-[var(--background)]
            ${isMobile && !showEditor ? 'hidden' : 'flex flex-col'}
          `}>
            {showEditor && selectedNote ? (
              <div className="flex-1 w-full">
                <NoteEditor
                  note={selectedNote}
                  onSave={handleSaveNote}
                  onDelete={handleDeleteNote}
                  onClose={handleCloseEditor}
                  getTagsForNote={getTagsForNote}
                  updateNoteTags={updateNoteTags}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <span className="material-symbols-outlined text-[var(--foreground-secondary)] text-6xl mb-4 block">
                    description
                  </span>
                  <h2 className="text-lg font-medium text-[var(--foreground)] mb-2">
                    {notes.length === 0 ? 'No notes yet' : 'Select a note to view'}
                  </h2>
                  <p className="text-sm text-[var(--foreground-secondary)]">
                    {notes.length === 0
                      ? 'Create your first note to get started'
                      : 'Choose a note from the list to start editing'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 mt-[57px]"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

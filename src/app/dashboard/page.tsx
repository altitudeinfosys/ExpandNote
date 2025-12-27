'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotes } from '@/hooks/useNotes';
import { useTags } from '@/hooks/useTags';
import { useNotesStore } from '@/stores/notesStore';
import { NoteEditor } from '@/components/NoteEditor';
import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// Constants
const MOBILE_BREAKPOINT = 768;

// View types
type DashboardView = 'all-notes' | 'favorites' | 'archived' | 'trash';

const DASHBOARD_VIEWS = {
  ALL_NOTES: 'all-notes' as const,
  FAVORITES: 'favorites' as const,
  ARCHIVED: 'archived' as const,
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

  // Get direct store access for optimistic updates
  const { deleteNote: deleteNoteFromStore } = useNotesStore();

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch notes on initial mount only
  // View handlers control subsequent fetches explicitly to avoid double-fetching
  useEffect(() => {
    if (user && !authLoading) {
      fetchNotes(); // Initial fetch - no filters
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

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
        is_archived: false,
      });
      setSelectedNoteId(newNote.id);
      setShowEditor(true);
    } catch (error) {
      console.error('Failed to create note:', error);
      toast.error('Failed to create note. Please try again.');
    } finally {
      setIsCreatingNote(false);
    }
  }, [createNote, isMobile]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (currentView === DASHBOARD_VIEWS.TRASH) {
        await fetchNotes({ showTrash: true });
      } else if (currentView === DASHBOARD_VIEWS.ARCHIVED) {
        await fetchNotes({ showArchived: true });
      } else {
        await fetchNotes();
      }
    } catch (error) {
      console.error('Failed to refresh notes:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchNotes, currentView]);

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

    // Refetch notes when closing editor in Favorites view
    // This ensures unfavorited notes are removed from the list
    if (currentView === DASHBOARD_VIEWS.FAVORITES) {
      fetchNotes({ showFavorites: true });
    }
  }, [currentView, fetchNotes]);

  const handleSaveNote = useCallback(
    async (noteData: {
      title: string | null;
      content: string;
      is_favorite: boolean;
      is_archived: boolean;
    }) => {
      if (!selectedNote) return;

      // Check if favorite or archived status changed
      const favoriteChanged = noteData.is_favorite !== selectedNote.is_favorite;
      const archivedChanged = noteData.is_archived !== selectedNote.is_archived;

      // Optimistically remove note from list if:
      // 1. Archiving from non-archived view, OR
      // 2. Unarchiving from archived view
      // This provides instant UI feedback
      const shouldRemoveFromList = archivedChanged && (
        (noteData.is_archived && currentView !== DASHBOARD_VIEWS.ARCHIVED) ||
        (!noteData.is_archived && currentView === DASHBOARD_VIEWS.ARCHIVED)
      );

      if (shouldRemoveFromList) {
        // Optimistically remove from local state for instant UI update
        deleteNoteFromStore(selectedNote.id);
        handleCloseEditor();
      }

      try {
        await updateNoteById(selectedNote.id, noteData);

        // Refetch current view if favorite or archived status changed
        // Skip refetch if we optimistically removed the note (it's already gone from UI)
        if ((favoriteChanged || archivedChanged) && !shouldRemoveFromList) {
          switch (currentView) {
            case DASHBOARD_VIEWS.FAVORITES:
              await fetchNotes({ showFavorites: true });
              break;
            case DASHBOARD_VIEWS.ARCHIVED:
              await fetchNotes({ showArchived: true });
              break;
            case DASHBOARD_VIEWS.TRASH:
              await fetchNotes({ showTrash: true });
              break;
            default:
              await fetchNotes();
              break;
          }
        }
      } catch (error) {
        // If update failed and we did an optimistic update, refetch to restore correct state
        console.error('Failed to update note:', error);
        if (shouldRemoveFromList || favoriteChanged || archivedChanged) {
          switch (currentView) {
            case DASHBOARD_VIEWS.FAVORITES:
              await fetchNotes({ showFavorites: true });
              break;
            case DASHBOARD_VIEWS.ARCHIVED:
              await fetchNotes({ showArchived: true });
              break;
            case DASHBOARD_VIEWS.TRASH:
              await fetchNotes({ showTrash: true });
              break;
            default:
              await fetchNotes();
              break;
          }
        }
      }
    },
    [selectedNote, updateNoteById, currentView, fetchNotes, handleCloseEditor, deleteNoteFromStore]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      try {
        await deleteNoteById(noteId);
        handleCloseEditor();
      } catch (error) {
        console.error('Failed to delete note:', error);
        toast.error('Failed to delete note. Please try again.');
      } finally {
        if (currentView === DASHBOARD_VIEWS.TRASH) {
          await fetchNotes({ showTrash: true });
        } else if (currentView === DASHBOARD_VIEWS.ARCHIVED) {
          await fetchNotes({ showArchived: true });
        } else {
          await fetchNotes();
        }
      }
    },
    [deleteNoteById, fetchNotes, handleCloseEditor, currentView]
  );

  const handleSearch = useCallback(
    (query: string) => {
      if (currentView === DASHBOARD_VIEWS.TRASH) return;
      searchNotes(query, {
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        showArchived: currentView === DASHBOARD_VIEWS.ARCHIVED,
        showFavorites: currentView === DASHBOARD_VIEWS.FAVORITES,
      });
    },
    [searchNotes, selectedTagIds, currentView]
  );

  const handleShowAllNotes = useCallback(() => {
    setCurrentView(DASHBOARD_VIEWS.ALL_NOTES);
    clearTagSelection();
    fetchNotes();
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

  const handleShowArchived = useCallback(() => {
    setCurrentView(DASHBOARD_VIEWS.ARCHIVED);
    clearTagSelection();
    fetchNotes({ showArchived: true });
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
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
    <TooltipProvider>
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Header - Hide when editor is showing */}
      {isMobile && !showEditor && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background-surface border-b border-border px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="material-symbols-outlined">menu</span>
          </Button>
          <h1 className="text-lg font-semibold text-foreground">ExpandNote</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <span className="material-symbols-outlined">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <span className={`material-symbols-outlined ${isRefreshing ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </Button>
            <Button
              size="icon-sm"
              onClick={handleCreateNote}
              disabled={isCreatingNote}
            >
              <span className="material-symbols-outlined">add</span>
            </Button>
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
        <nav className="flex-1 px-3 py-4 space-y-1 flex flex-col overflow-hidden">
          <Button
            variant={currentView === DASHBOARD_VIEWS.ALL_NOTES ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={handleShowAllNotes}
          >
            <span className="material-symbols-outlined">description</span>
            <span className="font-medium">All Notes</span>
          </Button>

          <Button
            variant={currentView === DASHBOARD_VIEWS.FAVORITES ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={handleShowFavorites}
            aria-label="View favorite notes"
            aria-current={currentView === DASHBOARD_VIEWS.FAVORITES ? 'page' : undefined}
          >
            <span className="material-symbols-outlined" aria-hidden="true">star</span>
            <span className="font-medium">Favorites</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => router.push('/settings?section=ai-profiles')}
          >
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="font-medium">AI Profiles</span>
          </Button>

          <Button
            variant={currentView === DASHBOARD_VIEWS.ARCHIVED ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={handleShowArchived}
          >
            <span className="material-symbols-outlined">archive</span>
            <span className="font-medium">Archived</span>
          </Button>

          <Button
            variant={currentView === DASHBOARD_VIEWS.TRASH ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={handleShowTrash}
          >
            <span className="material-symbols-outlined">delete</span>
            <span className="font-medium">Trash</span>
          </Button>

          {/* Tags Section */}
          {tags && tags.length > 0 && (
            <div className="pt-4 mt-4 border-t border-border flex flex-col min-h-0 flex-1">
              <div className="px-3 mb-2 flex-shrink-0">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</h3>
              </div>
              <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
                {tags.map((tag) => (
                  <Button
                    key={tag.id}
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start gap-2 ${
                      selectedTagIds.includes(tag.id)
                        ? 'bg-ai-purple/10 text-ai-purple hover:bg-ai-purple/20'
                        : 'text-muted-foreground'
                    }`}
                    onClick={() => {
                      if (selectedTagIds.includes(tag.id)) {
                        clearTagSelection();
                      } else {
                        searchNotes('', {
                          tagIds: [tag.id],
                          showArchived: currentView === DASHBOARD_VIEWS.ARCHIVED,
                          showFavorites: currentView === DASHBOARD_VIEWS.FAVORITES,
                        });
                      }
                    }}
                  >
                    <span className="material-symbols-outlined text-base">tag</span>
                    <span className="truncate">#{tag.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border mt-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => router.push('/settings')}
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="font-medium">Settings</span>
            </Button>
          </div>
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
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
                {currentView === DASHBOARD_VIEWS.ARCHIVED && 'Archived'}
                {currentView === DASHBOARD_VIEWS.TRASH && 'Trash'}
              </h1>
              <span className="text-sm text-[var(--foreground-secondary)]">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <span className={`material-symbols-outlined text-xl ${isRefreshing ? 'animate-spin' : ''}`}>
                      refresh
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh notes</TooltipContent>
              </Tooltip>
              <Button
                onClick={handleCreateNote}
                disabled={isCreatingNote}
              >
                <span className="material-symbols-outlined text-xl">add</span>
                <span>New Note</span>
              </Button>
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
                <SearchBar key={currentView} onSearch={handleSearch} />
              </div>
            )}

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Spinner size="default" />
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
                  <Button onClick={handleCreateNote}>
                    Create Note
                  </Button>
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
                              <Badge
                                key={tag.id}
                                variant="secondary"
                                className="text-xs bg-ai-purple/10 text-ai-purple hover:bg-ai-purple/20"
                              >
                                #{tag.name}
                              </Badge>
                            ))}
                            {note.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{note.tags.length - 3}
                              </Badge>
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
    </TooltipProvider>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Note, Tag, AIProfile } from '@/types';
import { TagSelector } from './TagSelector';
import { formatDateTime } from '@/lib/utils/date';
import { AUTO_SAVE_DELAY_MS } from '@/lib/constants';
import toast from 'react-hot-toast';
import { VersionHistory, VersionPreview } from './VersionHistory';
import { shouldCreateVersion } from '@/lib/versioning/version-manager';
import { createClient } from '@/lib/supabase/client';
interface NoteEditorProps {
  note: Note | null;
  onSave: (noteData: {
    title: string | null;
    content: string;
    is_favorite: boolean;
    is_archived: boolean;
  }) => Promise<void>;
  onDelete?: (noteId: string) => Promise<void>;
  onClose: () => void;
  getTagsForNote?: (noteId: string) => Promise<Tag[]>;
  updateNoteTags?: (noteId: string, tagIds: string[]) => Promise<Tag[]>;
}

export function NoteEditor({ note, onSave, onDelete, onClose, getTagsForNote, updateNoteTags }: NoteEditorProps) {

  // Initialize with empty values - useEffect will set from note prop
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [aiProfiles, setAiProfiles] = useState<AIProfile[]>([]);
  const [executingProfileId, setExecutingProfileId] = useState<string | null>(null);
  const [executedProfileIds, setExecutedProfileIds] = useState<Set<string>>(new Set());
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<{ current: number; total: number } | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Ref for textarea to manage cursor position
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track if we've created the initial baseline version
  const baselineCreatedRef = useRef<Set<string>>(new Set());

  // Track save count per note to persist across remounts
  const saveCountRef = useRef<Map<string, number>>(new Map());

  // Cache last version content to avoid repeated DB queries
  const lastVersionContentRef = useRef<Map<string, string | null>>(new Map());

  // Reset state when note ID changes (not just when note object reference changes)
  useEffect(() => {
    let isMounted = true;

    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setIsFavorite(note.is_favorite || false);
      setIsArchived(note.is_archived || false);
      setLastSaved(new Date(note.updated_at));
      setHasUnsavedChanges(false);

      // Notes from API already include tags
      if (note.tags) {
        setSelectedTags(note.tags);
      } else if (getTagsForNote) {
        // Fallback: fetch tags if not included
        const fetchTags = async () => {
          try {
            const tags = await getTagsForNote(note.id);
            if (isMounted) {
              setSelectedTags(tags || []);
            }
          } catch (error) {
            if (isMounted) {
              console.error('Failed to fetch note tags:', error);
              setSelectedTags([]);
            }
          }
        };
        fetchTags();
      }
    } else {
      setTitle('');
      setContent('');
      setIsFavorite(false);
      setIsArchived(false);
      setLastSaved(null);
      setHasUnsavedChanges(false);
      setSelectedTags([]);
    }

    return () => {
      isMounted = false;
    };
  }, [note?.id, getTagsForNote]); // Only re-run when note ID changes, not note object

  // Track changes
  useEffect(() => {
    const hasChanges =
      title !== (note?.title || '') ||
      content !== (note?.content || '') ||
      isFavorite !== (note?.is_favorite || false) ||
      isArchived !== (note?.is_archived || false);
    setHasUnsavedChanges(hasChanges);
    // Note: We don't track tag changes as part of auto-save since they're saved separately
  }, [title, content, isFavorite, isArchived, note]);

  // Create baseline version when note is first opened
  useEffect(() => {
    const createBaselineVersion = async () => {
      if (!note || !note.id || !note.content) return;

      // Skip if we already created baseline for this note
      if (baselineCreatedRef.current.has(note.id)) return;

      try {
        const supabase = createClient();

        // Check if this note has any versions
        const { data: existingVersions } = await supabase
          .from('note_versions')
          .select('id')
          .eq('note_id', note.id)
          .limit(1);

        // If no versions exist, create baseline
        if (!existingVersions || existingVersions.length === 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Versioning] Creating baseline version for note:', note.id);
          }

          try {
            const response = await fetch(`/api/notes/${note.id}/versions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ trigger: 'manual' }),
            });

            if (response.ok) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[Versioning] Baseline version created');
              }
              baselineCreatedRef.current.add(note.id);
            } else if (response.status === 409 || response.status === 500) {
              // 409 Conflict or 500 from unique constraint violation
              // Another tab/device created the baseline (race condition)
              if (process.env.NODE_ENV === 'development') {
                console.log('[Versioning] Baseline version already exists (created concurrently)');
              }
              baselineCreatedRef.current.add(note.id);
            } else {
              // Unexpected error, log but don't fail
              if (process.env.NODE_ENV === 'development') {
                console.error('[Versioning] Failed to create baseline:', response.status);
              }
            }
          } catch (fetchError) {
            // Network error or other issue - silently fail
            if (process.env.NODE_ENV === 'development') {
              console.error('[Versioning] Network error creating baseline:', fetchError);
            }
          }
        } else {
          // Mark as already having versions
          baselineCreatedRef.current.add(note.id);
        }
      } catch (error) {
        console.error('Failed to create baseline version:', error);
      }
    };

    createBaselineVersion();
  }, [note?.id]);

  const handleSave = useCallback(async () => {
    if (!content.trim() && !title.trim()) {
      // Allow saving with just a title or just content, but not both empty
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim() || null,
        content: content.trim(),
        is_favorite: isFavorite,
        is_archived: isArchived,
      });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // Check if we should create a version using smart logic
      if (note) {
        // Get or initialize save counter for this note
        const currentSaveCount = saveCountRef.current.get(note.id) || 0;
        const newSaveCount = currentSaveCount + 1;
        saveCountRef.current.set(note.id, newSaveCount);
        try {
          const currentContent = content.trim();

          // Get cached last version content or fetch if not cached
          let previousContent: string | null = lastVersionContentRef.current.get(note.id) ?? null;

          if (previousContent === null && !lastVersionContentRef.current.has(note.id)) {
            // Not cached yet, fetch from database
            const supabase = createClient();
            const { data: lastVersion } = await supabase
              .from('note_versions')
              .select('content')
              .eq('note_id', note.id)
              .order('version_number', { ascending: false })
              .limit(1)
              .maybeSingle();

            previousContent = lastVersion?.content || null;
            lastVersionContentRef.current.set(note.id, previousContent);
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('[Versioning] Checking if should create version:', {
              previousContent: previousContent?.substring(0, 50),
              currentContent: currentContent.substring(0, 50),
              saveCount: newSaveCount,
              contentDiff: Math.abs(currentContent.length - (previousContent?.length || 0))
            });
          }

          // Use shouldCreateVersion to determine if version should be created
          const shouldCreate = shouldCreateVersion(currentContent, previousContent, 'auto_save', newSaveCount);

          if (process.env.NODE_ENV === 'development') {
            console.log('[Versioning] Should create version:', shouldCreate);
          }

          if (shouldCreate) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[Versioning] Creating version...');
            }
            const response = await fetch(`/api/notes/${note.id}/versions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ trigger: 'auto_save' }),
            });

            if (response.ok) {
              // Update cache with new version content
              lastVersionContentRef.current.set(note.id, currentContent);
              if (process.env.NODE_ENV === 'development') {
                console.log('[Versioning] Version created successfully');
              }
            } else if (process.env.NODE_ENV === 'development') {
              console.log('[Versioning] Version creation failed:', response.status);
            }
          }
        } catch (error) {
          console.error('Failed to check/create version:', error);
          // Don't fail the save if versioning fails
        }
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [title, content, isFavorite, onSave, note]);

  // Auto-save after delay
  useEffect(() => {
    if (!hasUnsavedChanges || !note) return;

    const timer = setTimeout(() => {
      handleSave();
    }, AUTO_SAVE_DELAY_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, note?.id, handleSave]); // Only depend on note ID and handleSave

  const handleDelete = useCallback(async () => {
    if (!note || !onDelete) return;

    const confirmed = confirm('Are you sure you want to delete this note?');
    if (!confirmed) return;

    try {
      await onDelete(note.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note. Please try again.');
    }
  }, [note, onDelete, onClose]);

  const toggleFavorite = useCallback(() => {
    setIsFavorite((prev) => !prev);
  }, []);

  const toggleArchive = useCallback(async () => {
    if (!note) return;

    const newArchivedState = !isArchived;
    setIsArchived(newArchivedState);

    // Save immediately when archiving/unarchiving
    try {
      await onSave({
        title: title.trim() || null,
        content: content.trim(),
        is_favorite: isFavorite,
        is_archived: newArchivedState,
      });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to archive/unarchive note:', error);
      // Revert the state if save failed
      setIsArchived(!newArchivedState);
    }
  }, [note, isArchived, title, content, isFavorite, onSave]);

  const handleTagsChange = useCallback(async (tags: Tag[]) => {
    if (!note || !updateNoteTags) return;

    // Optimistically update UI
    setSelectedTags(tags);

    try {
      const tagIds = tags.map(tag => tag.id);
      await updateNoteTags(note.id, tagIds);
    } catch (error) {
      if (error instanceof Error && !error.message.includes('Note not found')) {
        console.error('Failed to update note tags:', error);
        alert('Failed to update tags. Please try again.');
      }
    }
  }, [note, updateNoteTags]);

  // Fetch AI profiles that match the note's tags
  useEffect(() => {
    if (!note || selectedTags.length === 0) {
      setAiProfiles([]);
      return;
    }

    const fetchMatchingProfiles = async () => {
      try {
        const response = await fetch('/api/ai-profiles');
        if (!response.ok) {
          throw new Error('Failed to fetch AI profiles');
        }

        const allProfiles: AIProfile[] = await response.json();

        // Filter profiles that match any of the note's tags
        const tagIds = selectedTags.map(tag => tag.id);
        const matchingProfiles = allProfiles.filter(
          profile => profile.is_active && tagIds.includes(profile.tag_id)
        );

        setAiProfiles(matchingProfiles);
      } catch (error) {
        console.error('Failed to fetch AI profiles:', error);
        setAiProfiles([]);
      }
    };

    fetchMatchingProfiles();
  }, [note, selectedTags]);

  // Auto-execute automatic profiles when tags change (but only once per profile per note session)
  // NOTE: Disabled for now - automatic execution can be enabled by uncommenting this code
  // useEffect(() => {
  //   if (!note || aiProfiles.length === 0 || executingProfileId) return;

  //   const automaticProfiles = aiProfiles.filter(
  //     profile => profile.trigger_mode === 'automatic' && !executedProfileIds.has(profile.id)
  //   );

  //   if (automaticProfiles.length > 0) {
  //     const executeAutomatic = async () => {
  //       for (const profile of automaticProfiles) {
  //         try {
  //           await handleExecuteProfile(profile.id);
  //           // Mark as executed
  //           setExecutedProfileIds(prev => new Set(prev).add(profile.id));
  //         } catch (error) {
  //           console.error(`Auto-execution failed for profile ${profile.name}:`, error);
  //         }
  //       }
  //     };

  //     executeAutomatic();
  //   }
  // }, [aiProfiles, note, executingProfileId, executedProfileIds]);

  // Execute an AI profile
  const handleExecuteProfile = useCallback(async (profileId: string) => {
    if (!note || executingProfileId) return;

    setExecutingProfileId(profileId);
    const profile = aiProfiles.find(p => p.id === profileId);
    const profileName = profile?.name || 'AI Profile';

    try {
      // Create version BEFORE AI execution
      await fetch(`/api/notes/${note.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trigger: 'before_ai',
          aiProfileId: profileId
        }),
      });

      const response = await fetch(`/api/ai-profiles/${profileId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId: note.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute AI profile');
      }

      const result = await response.json();

      // Create version AFTER AI execution
      await fetch(`/api/notes/${note.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trigger: 'after_ai',
          aiProfileId: profileId
        }),
      });

      // Show success message
      toast.success(`${profileName} executed successfully`);

      // Handle different output behaviors
      if (result.outputBehavior === 'new_note') {
        // Optionally navigate to the new note
        toast.success('New note created!', {
          duration: 4000,
        });
      } else if (result.outputBehavior === 'append' || result.outputBehavior === 'replace') {
        // Refresh the note to show updated content
        toast.success('Note updated!', {
          duration: 3000,
        });
        // Force a refresh by triggering onClose and reopening
        // The parent component should handle this
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to execute AI profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to execute ${profileName}: ${errorMessage}`);
    } finally {
      setExecutingProfileId(null);
    }
  }, [note, aiProfiles, executingProfileId]);

  // Execute all AI profiles sequentially
  const handleExecuteAllProfiles = useCallback(async () => {
    if (!note || aiProfiles.length === 0 || isExecutingAll || executingProfileId) return;

    setIsExecutingAll(true);
    setExecutionProgress({ current: 0, total: aiProfiles.length });

    let successCount = 0;
    let failedCount = 0;

    // Create version BEFORE starting batch execution
    try {
      await fetch(`/api/notes/${note.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'before_ai', aiProfileId: 'batch' }),
      });
    } catch (error) {
      console.error('Failed to create pre-batch version:', error);
    }

    for (let i = 0; i < aiProfiles.length; i++) {
      const profile = aiProfiles[i];
      setExecutionProgress({ current: i + 1, total: aiProfiles.length });

      try {
        const response = await fetch(`/api/ai-profiles/${profile.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ noteId: note.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to execute AI profile');
        }

        successCount++;
      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`${profile.name} failed: ${errorMessage}`);
        console.error(`Failed to execute profile ${profile.name}:`, error);
      }
    }

    // Create version AFTER batch execution
    try {
      await fetch(`/api/notes/${note.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'after_ai', aiProfileId: 'batch' }),
      });
    } catch (error) {
      console.error('Failed to create post-batch version:', error);
    }

    setIsExecutingAll(false);
    setExecutionProgress(null);

    // Show summary toast
    if (failedCount === 0) {
      toast.success(`Executed ${successCount} AI profile${successCount > 1 ? 's' : ''} successfully`);
    } else {
      toast.error(`Completed ${successCount}/${aiProfiles.length} profiles (${failedCount} failed)`);
    }

    // Reload to show updated content
    if (successCount > 0) {
      window.location.reload();
    }
  }, [note, aiProfiles, isExecutingAll, executingProfileId]);

  // Copy note content to clipboard
  const handleCopy = useCallback(async () => {
    // Check if Clipboard API is available
    if (!navigator.clipboard) {
      toast.error('Clipboard not available. Please use HTTPS or try Ctrl+C');
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      toast.success('Note content copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      // Provide specific error messages based on error type
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Clipboard access denied. Please check browser permissions');
      } else {
        toast.error('Failed to copy content');
      }
    }
  }, [content]);

  // Paste from clipboard and append at cursor position
  const handlePaste = useCallback(async () => {
    // Check if Clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      toast.error('Clipboard not available. Please use HTTPS or try Ctrl+V');
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();

      // Check for empty clipboard
      if (!clipboardText) {
        toast.error('Clipboard is empty');
        return;
      }

      if (!textareaRef.current) {
        // Fallback: append to end if ref not available
        setContent(prev => prev + clipboardText);
        toast.success('Content pasted');
        return;
      }

      const textarea = textareaRef.current;
      const cursorPosition = textarea.selectionStart || content.length;
      const textBeforeCursor = content.substring(0, cursorPosition);
      const textAfterCursor = content.substring(cursorPosition);

      const newContent = textBeforeCursor + clipboardText + textAfterCursor;

      // Use flushSync to ensure DOM is updated before cursor positioning
      flushSync(() => {
        setContent(newContent);
      });

      // Now safely set cursor position after pasted text
      const newCursorPosition = cursorPosition + clipboardText.length;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      textarea.focus();

      toast.success('Content pasted');
    } catch (error) {
      console.error('Failed to paste:', error);
      // Provide specific error messages based on error type
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Clipboard access denied. Please check browser permissions');
      } else {
        toast.error('Failed to paste content');
      }
    }
  }, [content]);

  // View a specific version
  const handleViewVersion = useCallback((versionId: string) => {
    setSelectedVersionId(versionId);
  }, []);

  // Restore a version
  const handleRestoreVersion = useCallback(async (versionId: string) => {
    if (!note) return;

    const confirmed = confirm('Are you sure you want to restore this version? Your current changes will be saved as a new version.');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/notes/${note.id}/versions/${versionId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to restore version');
      }

      const result = await response.json();

      toast.success('Version restored successfully');
      setSelectedVersionId(null);
      setShowVersionHistory(false);

      // Update local state instead of full page reload
      if (result.note) {
        setTitle(result.note.title || '');
        setContent(result.note.content || '');
        setLastSaved(new Date(result.note.updated_at));
        setHasUnsavedChanges(false);

        // Clear version cache since we restored
        lastVersionContentRef.current.delete(note.id);

        // Fetch updated tags if available
        if (getTagsForNote) {
          const tags = await getTagsForNote(note.id);
          setSelectedTags(tags || []);
        }
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
      toast.error('Failed to restore version');
    }
  }, [note, getTagsForNote]);

  // Create a manual version
  const handleCreateManualVersion = useCallback(async () => {
    if (!note) return;

    try {
      const response = await fetch(`/api/notes/${note.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trigger: 'manual' }),
      });

      if (!response.ok) {
        throw new Error('Failed to create version');
      }

      toast.success('Version saved');
    } catch (error) {
      console.error('Failed to create version:', error);
      toast.error('Failed to save version');
    }
  }, [note]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--background-surface)]">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {/* Back Arrow on Mobile, X on Desktop */}
          <button
            onClick={onClose}
            className="p-2.5 text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors flex-shrink-0"
            aria-label="Back to notes"
          >
            {/* Back Arrow - Mobile */}
            <span className="material-symbols-outlined text-2xl md:hidden">arrow_back</span>
            {/* X Icon - Desktop */}
            <span className="material-symbols-outlined text-xl hidden md:block">close</span>
          </button>

          <button
            onClick={toggleFavorite}
            className={`p-2 rounded-lg transition-all flex-shrink-0 ${
              isFavorite
                ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)]'
            }`}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <span className={`material-symbols-outlined ${isFavorite ? 'fill' : ''}`}>
              {isFavorite ? 'star' : 'star_border'}
            </span>
          </button>

          <button
            onClick={toggleArchive}
            className={`p-2 rounded-lg transition-all flex-shrink-0 ${
              isArchived
                ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)]'
            }`}
            aria-label={isArchived ? 'Unarchive note' : 'Archive note'}
            title={isArchived ? 'Unarchive note' : 'Archive note'}
          >
            <span className="material-symbols-outlined">
              {isArchived ? 'unarchive' : 'archive'}
            </span>
          </button>

          <div className="flex items-center gap-2 text-xs md:text-sm text-[var(--foreground-secondary)] min-w-0">
            {isSaving && (
              <>
                <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-[var(--primary)] flex-shrink-0"></div>
                <span className="hidden md:inline">Saving...</span>
              </>
            )}
            {!isSaving && hasUnsavedChanges && <span className="hidden md:inline">Unsaved changes</span>}
            {!isSaving && !hasUnsavedChanges && lastSaved && (
              <>
                {/* Mobile: Show checkmark icon */}
                <span
                  className="material-symbols-outlined text-green-700 dark:text-green-400 text-lg md:hidden flex-shrink-0"
                  title="Saved"
                  role="status"
                  aria-label="Note saved successfully"
                >
                  check_circle
                </span>
                {/* Desktop: Show full timestamp */}
                <span className="truncate hidden md:inline">{formatDateTime(lastSaved)}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!content.trim()}
            className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Copy note content"
            title="Copy note content"
          >
            <span className="material-symbols-outlined text-lg">content_copy</span>
          </button>

          {/* Paste Button */}
          <button
            onClick={handlePaste}
            className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
            aria-label="Paste from clipboard"
            title="Paste from clipboard"
          >
            <span className="material-symbols-outlined text-lg">content_paste</span>
          </button>

          {/* Version History Button */}
          {note && (
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
              aria-label="Version history"
              title="Version history"
            >
              <span className="material-symbols-outlined text-lg">history</span>
            </button>
          )}

          {note && onDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              <span className="hidden md:inline">Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Title Input */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)] bg-[var(--background-surface)]">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title (optional)"
          className="w-full text-xl md:text-2xl font-bold bg-transparent border-none outline-none text-[var(--foreground)] placeholder-[var(--foreground-secondary)]"
        />
      </div>

      {/* Editor - Scrollable */}
      <div className="flex-1 overflow-auto px-4 py-3 bg-[var(--background)]">
        <textarea
          ref={textareaRef}
          key={note?.id || 'new-note'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start typing your note..."
          className="w-full min-h-[300px] md:min-h-[400px] p-4 font-mono text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--background-surface)] text-[var(--foreground)] resize-y"
        />
      </div>

      {/* Bottom Section - Fixed at bottom */}
      <div className="flex-shrink-0">
        {/* Tags Selector - Always visible */}
        {note && (
          <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--background-surface)]">
            <TagSelector
              selectedTags={selectedTags}
              onTagsChange={handleTagsChange}
              disabled={isSaving}
            />
          </div>
        )}

        {/* AI Profiles Section - Below tags */}
        {note && aiProfiles.length > 0 && (
          <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--background-surface)]">
            <div className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] mb-2">
              <span className="material-symbols-outlined text-base">bolt</span>
              <span className="font-medium">AI Actions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {aiProfiles.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => handleExecuteProfile(profile.id)}
                  disabled={executingProfileId !== null || isExecutingAll}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors
                    ${
                      executingProfileId === profile.id
                        ? 'bg-[var(--primary)] text-white cursor-wait'
                        : (executingProfileId || isExecutingAll)
                        ? 'bg-[var(--background)] text-[var(--foreground-secondary)] cursor-not-allowed'
                        : 'bg-[var(--primary)] hover:opacity-90 text-white cursor-pointer'
                    }
                  `}
                >
                  {executingProfileId === profile.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">play_arrow</span>
                      <span>{profile.name}</span>
                    </>
                  )}
                </button>
              ))}

              {/* Run All button - only show when 2+ profiles */}
              {aiProfiles.length >= 2 && (
                <button
                  onClick={handleExecuteAllProfiles}
                  disabled={executingProfileId !== null || isExecutingAll}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors
                    ${
                      isExecutingAll
                        ? 'bg-green-600 text-white cursor-wait'
                        : (executingProfileId || isExecutingAll)
                        ? 'bg-[var(--background)] text-[var(--foreground-secondary)] cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    }
                  `}
                >
                  {isExecutingAll ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>
                        {executionProgress
                          ? `Running ${executionProgress.current}/${executionProgress.total}...`
                          : 'Running...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">double_arrow</span>
                      <span>Run All ({aiProfiles.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Version History Panel */}
      {note && showVersionHistory && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-[var(--background-surface)] border-l border-[var(--border)] shadow-lg z-40">
          <VersionHistory
            noteId={note.id}
            onViewVersion={handleViewVersion}
            onRestoreVersion={handleRestoreVersion}
            onClose={() => setShowVersionHistory(false)}
          />
        </div>
      )}

      {/* Version Preview Modal */}
      {selectedVersionId && note && (
        <VersionPreview
          versionId={selectedVersionId}
          noteId={note.id}
          onClose={() => setSelectedVersionId(null)}
          onRestore={() => handleRestoreVersion(selectedVersionId)}
        />
      )}
    </div>
  );
}

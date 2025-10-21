'use client';

import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/types';
import { MarkdownEditor } from './MarkdownEditor';
import { formatDateTime } from '@/lib/utils/date';

interface NoteEditorProps {
  note: Note | null;
  onSave: (noteData: {
    title: string | null;
    content: string;
    is_favorite: boolean;
  }) => Promise<void>;
  onDelete?: (noteId: string) => Promise<void>;
  onClose: () => void;
}

export function NoteEditor({ note, onSave, onDelete, onClose }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [isFavorite, setIsFavorite] = useState(note?.is_favorite || false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(
    note ? new Date(note.updated_at) : null
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset state when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setIsFavorite(note.is_favorite || false);
      setLastSaved(new Date(note.updated_at));
      setHasUnsavedChanges(false);
    } else {
      setTitle('');
      setContent('');
      setIsFavorite(false);
      setLastSaved(null);
      setHasUnsavedChanges(false);
    }
  }, [note]); // Reset when note changes

  // Track changes
  useEffect(() => {
    const hasChanges =
      title !== (note?.title || '') ||
      content !== (note?.content || '') ||
      isFavorite !== (note?.is_favorite || false);
    setHasUnsavedChanges(hasChanges);
  }, [title, content, isFavorite, note]);

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim() || null,
        content: content.trim(),
        is_favorite: isFavorite,
      });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [title, content, isFavorite, onSave]);

  // Auto-save after 2 seconds of no changes
  useEffect(() => {
    if (!hasUnsavedChanges || !note) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, note, handleSave]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close editor"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <button
            onClick={toggleFavorite}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              className={`w-5 h-5 ${
                isFavorite
                  ? 'text-yellow-500 fill-current'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {isSaving && (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Saving...</span>
              </>
            )}
            {!isSaving && hasUnsavedChanges && <span>Unsaved changes</span>}
            {!isSaving && !hasUnsavedChanges && lastSaved && (
              <span>Saved {formatDateTime(lastSaved)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {note && onDelete && (
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Title Input */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title (optional)"
          className="w-full text-2xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900">
        <MarkdownEditor
          value={content}
          onChange={setContent}
          placeholder="Start typing your note..."
          autoFocus={!note}
        />
      </div>
    </div>
  );
}

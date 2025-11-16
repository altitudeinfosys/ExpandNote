'use client';

import { Note } from '@/types';
import { formatDistanceToNow } from '@/lib/utils/date';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  isLoading?: boolean;
}

export function NoteList({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  isLoading = false,
}: NoteListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400 dark:text-gray-500"
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No notes yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Create your first note to get started
        </p>
        <button
          onClick={onCreateNote}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Create Note
        </button>
      </div>
    );
  }

  return (
    <div>
      {notes.map((note) => (
        <NoteListItem
          key={note.id}
          note={note}
          isSelected={note.id === selectedNoteId}
          onClick={() => onSelectNote(note.id)}
        />
      ))}
    </div>
  );
}

interface NoteListItemProps {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
}

function NoteListItem({ note, isSelected, onClick }: NoteListItemProps) {
  // Extract first line as title if no title
  const displayTitle = note.title || getFirstLine(note.content) || 'Untitled';
  const preview = getPreview(note.content, note.title);
  const timeAgo = formatDistanceToNow(new Date(note.updated_at));

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-700 transition-colors ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3
          className={`font-semibold text-sm line-clamp-1 ${
            isSelected
              ? 'text-blue-700 dark:text-blue-300'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {note.is_favorite && (
            <span
              className="material-symbols-outlined fill text-yellow-500 text-base inline mr-1.5 -mt-0.5"
              aria-hidden="true"
            >
              star
            </span>
          )}
          {displayTitle}
        </h3>
      </div>

      {preview && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-1.5">
          {preview}
        </p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <span>{timeAgo}</span>
        {note.tags && note.tags.length > 0 && (
          <>
            <span>•</span>
            <div className="flex gap-1 flex-wrap">
              {note.tags.slice(0, 2).map((tag) => (
                <span key={tag.id} className="text-gray-500 dark:text-gray-400">
                  #{tag.name}
                </span>
              ))}
              {note.tags.length > 2 && (
                <span className="text-gray-400 dark:text-gray-500">
                  +{note.tags.length - 2}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </button>
  );
}

// Helper functions
function getFirstLine(content: string): string {
  const firstLine = content.split('\n')[0];
  return firstLine.replace(/^#+\s*/, '').trim(); // Remove markdown headers
}

function getPreview(content: string, title: string | null): string {
  // If we have a title, show content preview
  // Otherwise show second line (first line is used as title)
  let previewText = content;

  if (!title) {
    // Skip first line since it's used as title
    const lines = content.split('\n');
    previewText = lines.slice(1).join('\n');
  }

  // Remove markdown formatting for preview
  previewText = previewText
    .replace(/^#+\s*/gm, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .trim();

  return previewText.substring(0, 150);
}

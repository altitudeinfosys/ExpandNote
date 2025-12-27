'use client';

import { useState, useEffect } from 'react';
import { NoteVersion } from '@/types/version';
import { formatDateTime } from '@/lib/utils/date';

interface VersionPreviewProps {
  versionId: string;
  noteId: string;
  onClose: () => void;
  onRestore: () => void;
}

export function VersionPreview({ versionId, noteId, onClose, onRestore }: VersionPreviewProps) {
  const [version, setVersion] = useState<NoteVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersion();
  }, [versionId]);

  const fetchVersion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notes/${noteId}/versions/${versionId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch version');
      }

      const data = await response.json();
      setVersion(data);
    } catch (err) {
      console.error('Failed to fetch version:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !version) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[var(--background-surface)] rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-surface)] rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Version {version.version_number}
            </h2>
            <p className="text-sm text-[var(--foreground-secondary)]">
              {formatDateTime(new Date(version.created_at))}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {version.title && (
            <h1 className="text-2xl font-bold mb-4 text-[var(--foreground)]">
              {version.title}
            </h1>
          )}

          <div className="prose dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-mono text-sm bg-[var(--background)] p-4 rounded-lg">
              {version.content}
            </pre>
          </div>

          {version.tags && version.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {version.tags.map((tag: { id: string; name: string }) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-sm"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={onRestore}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Restore This Version
          </button>
        </div>
      </div>
    </div>
  );
}

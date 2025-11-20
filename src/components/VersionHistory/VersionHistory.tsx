'use client';

import { useState, useEffect } from 'react';
import { VersionListItem } from '@/types/version';
import { formatDateTime } from '@/lib/utils/date';

interface VersionHistoryProps {
  noteId: string;
  onViewVersion: (versionId: string) => void;
  onRestoreVersion: (versionId: string) => void;
  onClose: () => void;
}

export function VersionHistory({ noteId, onViewVersion, onRestoreVersion, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [noteId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notes/${noteId}/versions`);

      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }

      const data = await response.json();
      setVersions(data);
    } catch (err) {
      console.error('Failed to fetch versions:', err);
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'manual':
        return 'Manual save';
      case 'auto_save':
        return 'Auto-save';
      case 'before_ai':
        return 'Before AI';
      case 'after_ai':
        return 'After AI';
      default:
        return trigger;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} chars`;
    return `${(bytes / 1024).toFixed(1)}KB`;
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--foreground)]">Version History</h3>
          <button
            onClick={onClose}
            className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
            aria-label="Close version history"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--foreground)]">Version History</h3>
          <button
            onClick={onClose}
            className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
            aria-label="Close version history"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="p-4 text-center text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold text-[var(--foreground)]">Version History</h3>
          <button
            onClick={onClose}
            className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
            aria-label="Close version history"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center text-[var(--foreground-secondary)]">
          <div>
            <p>No version history yet</p>
            <p className="text-sm mt-2">Versions are created automatically when you edit this note</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">Version History</h3>
          <p className="text-xs text-[var(--foreground-secondary)] mt-1">
            {versions.length} {versions.length === 1 ? 'version' : 'versions'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
          aria-label="Close version history"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {versions.map((version) => (
          <div
            key={version.id}
            className="px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--background)] transition-colors cursor-pointer"
            onClick={() => onViewVersion(version.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--foreground)]">
                    v{version.version_number}
                  </span>
                  <span className="text-xs text-[var(--foreground-secondary)]">
                    {getTriggerLabel(version.snapshot_trigger)}
                  </span>
                </div>
                <div className="text-xs text-[var(--foreground-secondary)] mt-1">
                  {formatDateTime(new Date(version.created_at))}
                </div>
                <div className="text-xs text-[var(--foreground-secondary)] mt-1">
                  {formatSize(version.content_size)}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestoreVersion(version.id);
                }}
                className="px-3 py-1 text-xs text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded transition-colors"
              >
                Restore
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

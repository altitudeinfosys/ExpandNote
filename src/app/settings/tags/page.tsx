'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Tag, AIProfile } from '@/types';

interface TagWithMetadata extends Tag {
  note_count: number;
  ai_profile_count: number;
  ai_profile_names: string[];
}

export default function TagManagementPage() {
  const router = useRouter();
  const { theme: currentTheme, setTheme } = useTheme();
  const { user } = useAuth();
  const [tags, setTags] = useState<TagWithMetadata[]>([]);
  const [aiProfiles, setAiProfiles] = useState<AIProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch tags and AI profiles in parallel
      const [tagsRes, profilesRes] = await Promise.all([
        fetch('/api/tags'),
        fetch('/api/ai-profiles')
      ]);

      if (!tagsRes.ok) {
        throw new Error('Failed to fetch tags');
      }

      const tagsData = await tagsRes.json();
      const profilesData = profilesRes.ok ? await profilesRes.json() : [];

      // Fetch note counts for each tag
      const tagsWithMetadata = await Promise.all(
        (tagsData.data || []).map(async (tag: Tag) => {
          const tagDetailRes = await fetch(`/api/tags/${tag.id}`);
          const tagDetail = tagDetailRes.ok ? await tagDetailRes.json() : {};

          // Find AI profiles using this tag
          const linkedProfiles = profilesData.filter((p: AIProfile) => p.tag_id === tag.id);

          return {
            ...tag,
            note_count: tagDetail.data?.note_count || 0,
            ai_profile_count: linkedProfiles.length,
            ai_profile_names: linkedProfiles.map((p: AIProfile) => p.name)
          };
        })
      );

      setTags(tagsWithMetadata);
      setAiProfiles(profilesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load tags. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden">
      {/* Header */}
      <header className="bg-[var(--background-surface)] border-b border-[var(--border)]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings?section=app-settings')}
              className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Tag Management</h1>
          </div>

          <button
            onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
            title={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="material-symbols-outlined text-xl">
              {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-[var(--foreground-secondary)]">Loading tags...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="bg-[var(--background-surface)] rounded-xl border border-[var(--border)] p-4 sm:p-6">
            {/* Header with Create Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Your Tags</h2>
              <button
                onClick={() => {/* Will implement in next task */}}
                disabled={tags.length >= 100}
                className="px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
              >
                <span className="material-symbols-outlined text-lg sm:text-xl">add</span>
                <span>Create New Tag</span>
              </button>
            </div>

            {/* Tag List or Empty State */}
            {tags.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[var(--background)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[var(--foreground-secondary)] text-3xl">label</span>
                </div>
                <p className="text-[var(--foreground)] font-medium mb-2">No tags yet</p>
                <p className="text-sm text-[var(--foreground-secondary)]">Create your first tag to organize your notes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--background)] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-sm rounded-full bg-[var(--ai-purple)]/10 text-[var(--ai-purple)] font-medium">
                            #{tag.name}
                          </span>
                          {tag.ai_profile_count > 0 && (
                            <span className="text-xs text-[var(--foreground-secondary)] flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">auto_awesome</span>
                              <span>Linked to {tag.ai_profile_count} AI Profile{tag.ai_profile_count > 1 ? 's' : ''}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[var(--foreground-secondary)]">
                          Used in {tag.note_count} note{tag.note_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {/* Will implement in next task */}}
                          className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {/* Will implement in next task */}}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

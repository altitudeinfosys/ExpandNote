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
          <div>
            <p className="text-[var(--foreground)]">
              Loaded {tags.length} tags
            </p>
            {/* Tag list will go here */}
          </div>
        )}
      </div>
    </div>
  );
}

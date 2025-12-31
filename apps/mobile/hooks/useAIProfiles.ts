import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';
import type { AIProfile, Tag } from '@expandnote/shared/types';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'https://expand-note.vercel.app';

interface ExecuteResult {
  success: boolean;
  noteId: string;
  tokensUsed: number;
  outputBehavior: 'append' | 'replace' | 'new_note';
}

interface UseAIProfilesReturn {
  profiles: AIProfile[];
  isLoading: boolean;
  executeProfile: (profileId: string, noteId: string) => Promise<ExecuteResult>;
  executingProfileId: string | null;
  error: string | null;
}

export function useAIProfiles(selectedTags: Tag[]): UseAIProfilesReturn {
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [executingProfileId, setExecutingProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch AI profiles that match the note's tags
  useEffect(() => {
    if (selectedTags.length === 0) {
      setProfiles([]);
      return;
    }

    const fetchMatchingProfiles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const tagIds = selectedTags.map(tag => tag.id);

        // Fetch all active AI profiles for the user
        const { data: allProfiles, error: fetchError } = await supabase
          .from('ai_profiles')
          .select(`
            *,
            tag:tags(id, name)
          `)
          .eq('is_active', true);

        if (fetchError) {
          throw new Error('Failed to fetch AI profiles');
        }

        // Filter profiles that match any of the note's tags
        const matchingProfiles = (allProfiles || []).filter(
          (profile: AIProfile) => profile.tag_id && tagIds.includes(profile.tag_id)
        );

        setProfiles(matchingProfiles);
      } catch (err) {
        console.error('Failed to fetch AI profiles:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch AI profiles');
        setProfiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatchingProfiles();
  }, [selectedTags]);

  // Execute an AI profile
  const executeProfile = useCallback(async (profileId: string, noteId: string): Promise<ExecuteResult> => {
    if (executingProfileId) {
      throw new Error('Another profile is already executing');
    }

    setExecutingProfileId(profileId);
    setError(null);

    try {
      // Get the current session for auth
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/ai-profiles/${profileId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ noteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute AI profile');
      }

      return data as ExecuteResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute AI profile';
      setError(errorMessage);
      throw err;
    } finally {
      setExecutingProfileId(null);
    }
  }, [executingProfileId]);

  return {
    profiles,
    isLoading,
    executeProfile,
    executingProfileId,
    error,
  };
}

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AIProfile } from '@/types';

export function useAIProfiles() {
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        setLoading(true);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from('ai_profiles')
          .select('*, tags(*)')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        setProfiles(data || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, []);

  return { profiles, loading, error };
}

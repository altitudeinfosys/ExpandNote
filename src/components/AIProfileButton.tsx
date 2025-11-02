'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import type { AIProfile } from '@/types';

interface AIProfileButtonProps {
  profile: AIProfile;
  noteId: string;
  onSuccess: () => void;
}

export function AIProfileButton({
  profile,
  noteId,
  onSuccess,
}: AIProfileButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/profiles/${profile.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute AI profile');
      }

      // Show success toast
      toast.success(`AI profile "${profile.name}" executed successfully!`);
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(errorMessage);
      console.error('AI execution error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExecute}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <>
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          <span>Running {profile.name}...</span>
        </>
      ) : (
        <>
          <span>▶</span>
          <span>Run: {profile.name}</span>
        </>
      )}
    </button>
  );
}

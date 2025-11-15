'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Tag = {
  id: string;
  name: string;
};

const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
];

const CLAUDE_MODELS = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
];

const OPENROUTER_MODELS = [
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5' },
  { id: 'openai/gpt-5.1', name: 'GPT-5.1' },
  { id: 'openai/gpt-5.1-chat', name: 'GPT-5.1 Chat' },
  { id: 'openai/gpt-5-pro', name: 'GPT-5 Pro' },
  { id: 'google/gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash' },
  { id: 'google/gemini-2.5-flash-lite-preview-09-2025', name: 'Gemini 2.5 Flash Lite' },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', name: 'Llama 3.3 Nemotron 49B' },
  { id: 'mistralai/voxtral-small-24b-2507', name: 'Voxtral Small 24B' },
  { id: 'deepseek/deepseek-v3.2-exp', name: 'DeepSeek V3.2' },
  { id: 'qwen/qwen3-max', name: 'Qwen3 Max' },
  { id: 'qwen/qwen3-coder-plus', name: 'Qwen3 Coder Plus' },
];

export default function NewAIProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [tagId, setTagId] = useState('');
  const [aiProvider, setAiProvider] = useState<'openai' | 'claude' | 'openrouter'>('openai');
  const [model, setModel] = useState('gpt-4o');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPromptTemplate, setUserPromptTemplate] = useState('');
  const [triggerMode, setTriggerMode] = useState<'automatic' | 'manual'>('automatic');
  const [outputBehavior, setOutputBehavior] = useState<'append' | 'new_note' | 'replace'>('new_note');
  const [outputTitleTemplate, setOutputTitleTemplate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch tags
  useEffect(() => {
    if (user) {
      fetchTags();
    }
  }, [user]);

  // Update model when provider changes
  useEffect(() => {
    if (aiProvider === 'openai') {
      setModel('gpt-4o');
    } else if (aiProvider === 'claude') {
      setModel('claude-3-5-sonnet-20241022');
    } else if (aiProvider === 'openrouter') {
      setModel('anthropic/claude-sonnet-4.5');
    }
  }, [aiProvider]);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (response.ok) {
        const json = await response.json();
        const tagsData = json.data || json; // Handle both { data: [...] } and direct array
        setTags(Array.isArray(tagsData) ? tagsData : []);
      } else {
        setTags([]);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !tagId || !systemPrompt || !userPromptTemplate) {
      alert('Please fill in all required fields');
      return;
    }

    if (outputBehavior === 'new_note' && !outputTitleTemplate) {
      alert('Please provide a title template for new notes');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/ai-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          tag_id: tagId,
          ai_provider: aiProvider,
          model,
          system_prompt: systemPrompt,
          user_prompt_template: userPromptTemplate,
          trigger_mode: triggerMode,
          output_behavior: outputBehavior,
          output_title_template: outputBehavior === 'new_note' ? outputTitleTemplate : null,
          is_active: isActive,
        }),
      });

      if (response.ok) {
        router.push('/settings?section=ai-profiles');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create AI profile');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Error creating AI profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const availableModels =
    aiProvider === 'openai' ? OPENAI_MODELS :
    aiProvider === 'claude' ? CLAUDE_MODELS :
    OPENROUTER_MODELS;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings?section=ai-profiles')}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              ← Back to Settings
            </button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Create AI Profile</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            {/* Profile Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Profile Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., YouTube Video Summarizer"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Tag Trigger */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tag Trigger <span className="text-red-500">*</span>
              </label>
              <select
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a tag...</option>
                {tags.length === 0 ? (
                  <option value="" disabled>No tags available - create tags first</option>
                ) : (
                  tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      #{tag.name}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {tags.length === 0
                  ? 'Create some tags in the dashboard first, then come back to create AI profiles'
                  : 'This profile will run when notes are tagged with this tag'
                }
              </p>
            </div>

            {/* AI Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AI Provider <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center text-gray-900 dark:text-white">
                  <input
                    type="radio"
                    value="openai"
                    checked={aiProvider === 'openai'}
                    onChange={(e) => setAiProvider(e.target.value as 'openai')}
                    className="mr-2"
                  />
                  <span>OpenAI</span>
                </label>
                <label className="flex items-center text-gray-900 dark:text-white">
                  <input
                    type="radio"
                    value="claude"
                    checked={aiProvider === 'claude'}
                    onChange={(e) => setAiProvider(e.target.value as 'claude')}
                    className="mr-2"
                  />
                  <span>Claude</span>
                </label>
                <label className="flex items-center text-gray-900 dark:text-white">
                  <input
                    type="radio"
                    value="openrouter"
                    checked={aiProvider === 'openrouter'}
                    onChange={(e) => setAiProvider(e.target.value as 'openrouter')}
                    className="mr-2"
                  />
                  <span>OpenRouter</span>
                </label>
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model <span className="text-red-500">*</span>
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                System Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant that..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                required
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Context and instructions for the AI
              </p>
            </div>

            {/* User Prompt Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                User Prompt Template <span className="text-red-500">*</span>
              </label>
              <textarea
                value={userPromptTemplate}
                onChange={(e) => setUserPromptTemplate(e.target.value)}
                placeholder="Analyze this content: {note_content}"
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                required
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Available variables: {'{note_title}'}, {'{note_content}'}, {'{tags}'}
              </p>
            </div>

            {/* Trigger Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trigger Mode <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center text-gray-900 dark:text-white">
                  <input
                    type="radio"
                    value="automatic"
                    checked={triggerMode === 'automatic'}
                    onChange={(e) => setTriggerMode(e.target.value as 'automatic')}
                    className="mr-2"
                  />
                  <span>Automatic (runs when tag is added)</span>
                </label>
                <label className="flex items-center text-gray-900 dark:text-white">
                  <input
                    type="radio"
                    value="manual"
                    checked={triggerMode === 'manual'}
                    onChange={(e) => setTriggerMode(e.target.value as 'manual')}
                    className="mr-2"
                  />
                  <span>Manual (user clicks button)</span>
                </label>
              </div>
            </div>

            {/* Output Behavior */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Output Behavior <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center text-gray-900 dark:text-white">
                  <input
                    type="radio"
                    value="new_note"
                    checked={outputBehavior === 'new_note'}
                    onChange={(e) => setOutputBehavior(e.target.value as 'new_note')}
                    className="mr-2"
                  />
                  <span>Create new note</span>
                </label>
                <label className="flex items-center text-gray-900 dark:text-white">
                  <input
                    type="radio"
                    value="append"
                    checked={outputBehavior === 'append'}
                    onChange={(e) => setOutputBehavior(e.target.value as 'append')}
                    className="mr-2"
                  />
                  <span>Append to original note</span>
                </label>
                <label className="flex items-center text-gray-900 dark:text-white">
                  <input
                    type="radio"
                    value="replace"
                    checked={outputBehavior === 'replace'}
                    onChange={(e) => setOutputBehavior(e.target.value as 'replace')}
                    className="mr-2"
                  />
                  <span>Replace note content</span>
                </label>
              </div>
            </div>

            {/* Output Title Template (only for new_note) */}
            {outputBehavior === 'new_note' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Note Title Template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={outputTitleTemplate}
                  onChange={(e) => setOutputTitleTemplate(e.target.value)}
                  placeholder="Summary: {note_title}"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Template for the new note title. Use {'{note_title}'} for the original note title.
                </p>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mr-2 w-4 h-4"
              />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active (profile will run automatically)
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => router.push('/settings?section=ai-profiles')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

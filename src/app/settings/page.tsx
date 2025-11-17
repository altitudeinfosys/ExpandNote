'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

type UserSettings = {
  user_id: string;
  openai_api_key: string | null;
  claude_api_key: string | null;
  openrouter_api_key: string | null;
  default_ai_provider: 'openai' | 'claude' | 'openrouter';
  enable_auto_tagging: boolean;
  default_sort: string;
  theme: 'light' | 'dark';
};

type AIProfile = {
  id: string;
  name: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
  };
  ai_provider: 'openai' | 'claude';
  model: string;
  trigger_mode: 'automatic' | 'manual';
  output_behavior: 'append' | 'new_note' | 'replace';
  is_active: boolean;
};

function SettingsContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme: currentTheme, setTheme } = useTheme();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'account' | 'ai-config' | 'ai-profiles' | 'tags' | 'app-settings'>('account');

  // Handle section from URL query parameter
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && ['account', 'ai-config', 'ai-profiles', 'tags', 'app-settings'].includes(section)) {
      setActiveSection(section as 'account' | 'ai-config' | 'ai-profiles' | 'tags' | 'app-settings');
    }
  }, [searchParams]);

  // Form state for settings
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [defaultProvider, setDefaultProvider] = useState<'openai' | 'claude' | 'openrouter'>('openai');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch settings and profiles
  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchProfiles();
    }
  }, [user]);

  // Sync theme from database to context ONLY on initial load
  useEffect(() => {
    if (settings?.theme && !loading) {
      const dbTheme = settings.theme as 'light' | 'dark';
      if (dbTheme !== currentTheme) {
        setTheme(dbTheme);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setOpenaiKey(data.openai_api_key || '');
        setClaudeKey(data.claude_api_key || '');
        setOpenrouterKey(data.openrouter_api_key || '');
        setDefaultProvider(data.default_ai_provider || 'openai');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/ai-profiles');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openai_api_key: openaiKey || null,
          claude_api_key: claudeKey || null,
          openrouter_api_key: openrouterKey || null,
          default_ai_provider: defaultProvider,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const deleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this AI Profile?')) return;

    try {
      const response = await fetch(`/api/ai-profiles/${profileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProfiles(profiles.filter(p => p.id !== profileId));
      } else {
        alert('Failed to delete profile');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert('Error deleting profile');
    }
  };

  const toggleProfileActive = async (profileId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/ai-profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfiles(profiles.map(p => p.id === profileId ? updatedProfile : p));
      }
    } catch (error) {
      console.error('Error toggling profile:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[var(--foreground-secondary)]">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden">
      {/* Header */}
      <header className="bg-[var(--background-surface)] border-b border-[var(--border)]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Settings</h1>
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

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-[var(--background-surface)] rounded-xl border border-[var(--border)] p-1.5 sm:p-2">
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setActiveSection('account')}
                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors flex items-center gap-2 sm:gap-3 ${
                      activeSection === 'account'
                        ? 'bg-primary text-white'
                        : 'text-[var(--foreground)] hover:bg-[var(--background)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">person</span>
                    <span className="font-medium text-sm sm:text-base">Account</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('ai-config')}
                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors flex items-center gap-2 sm:gap-3 ${
                      activeSection === 'ai-config'
                        ? 'bg-primary text-white'
                        : 'text-[var(--foreground)] hover:bg-[var(--background)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">key</span>
                    <span className="font-medium text-sm sm:text-base">AI Configuration</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('ai-profiles')}
                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors flex items-center gap-2 sm:gap-3 ${
                      activeSection === 'ai-profiles'
                        ? 'bg-primary text-white'
                        : 'text-[var(--foreground)] hover:bg-[var(--background)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">auto_awesome</span>
                    <span className="font-medium text-sm sm:text-base">AI Profiles ({profiles.length})</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('tags')}
                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors flex items-center gap-2 sm:gap-3 ${
                      activeSection === 'tags'
                        ? 'bg-primary text-white'
                        : 'text-[var(--foreground)] hover:bg-[var(--background)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">label</span>
                    <span className="font-medium text-sm sm:text-base">Tags</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('app-settings')}
                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors flex items-center gap-2 sm:gap-3 ${
                      activeSection === 'app-settings'
                        ? 'bg-primary text-white'
                        : 'text-[var(--foreground)] hover:bg-[var(--background)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">tune</span>
                    <span className="font-medium text-sm sm:text-base">App Settings</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-[var(--background-surface)] rounded-xl border border-[var(--border)] p-4 sm:p-6">
              {/* Account Section */}
              {activeSection === 'account' && (
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">Account</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground-secondary)] cursor-not-allowed"
                      />
                    </div>
                    <div className="pt-4 border-t border-[var(--border)]">
                      <button
                        onClick={handleSignOut}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-xl">logout</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Configuration Section */}
              {activeSection === 'ai-config' && (
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">AI Configuration</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        OpenAI API Key
                      </label>
                      <input
                        type="password"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder={settings?.openai_api_key ? 'sk-...••••' : 'sk-...'}
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      />
                      <p className="mt-2 text-sm text-[var(--foreground-secondary)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">lock</span>
                        <span>Encrypted at rest with AES-256 • Never logged or shared</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Claude API Key
                      </label>
                      <input
                        type="password"
                        value={claudeKey}
                        onChange={(e) => setClaudeKey(e.target.value)}
                        placeholder={settings?.claude_api_key ? 'sk-ant-...••••' : 'sk-ant-...'}
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      />
                      <p className="mt-2 text-sm text-[var(--foreground-secondary)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">lock</span>
                        <span>Encrypted at rest with AES-256 • Never logged or shared</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        OpenRouter API Key
                      </label>
                      <input
                        type="password"
                        value={openrouterKey}
                        onChange={(e) => setOpenrouterKey(e.target.value)}
                        placeholder={settings?.openrouter_api_key ? 'sk-or-...••••' : 'sk-or-...'}
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      />
                      <p className="mt-2 text-sm text-[var(--foreground-secondary)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">info</span>
                        <span>
                          Get your API key from{' '}
                          <a
                            href="https://openrouter.ai/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            OpenRouter dashboard
                          </a>
                        </span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Default AI Provider
                      </label>
                      <select
                        value={defaultProvider}
                        onChange={(e) => setDefaultProvider(e.target.value as 'openai' | 'claude' | 'openrouter')}
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="claude">Claude</option>
                        <option value="openrouter">OpenRouter</option>
                      </select>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-xl">save</span>
                        <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Profiles Section */}
              {activeSection === 'ai-profiles' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">AI Profiles</h2>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => router.push('/settings/ai-logs')}
                        className="px-3 sm:px-4 py-2 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--background)] transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <span className="material-symbols-outlined text-lg sm:text-xl">history</span>
                        <span>Execution Logs</span>
                      </button>
                      <button
                        onClick={() => router.push('/settings/ai-profiles/new')}
                        className="px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
                      >
                        <span className="material-symbols-outlined text-lg sm:text-xl">add</span>
                        <span>Create New Profile</span>
                      </button>
                    </div>
                  </div>

                  {profiles.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-[var(--background)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-[var(--foreground-secondary)] text-3xl">auto_awesome</span>
                      </div>
                      <p className="text-[var(--foreground)] font-medium mb-2">No AI Profiles yet</p>
                      <p className="text-sm text-[var(--foreground-secondary)] mb-4">Create a profile to automate AI tasks when you tag notes</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {profiles.map((profile) => (
                        <div
                          key={profile.id}
                          className="border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--background)] transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="font-semibold text-[var(--foreground)]">{profile.name}</h3>
                                <span className="px-2 py-1 text-xs rounded-full bg-[var(--ai-purple)]/10 text-[var(--ai-purple)] font-medium">
                                  #{profile.tags.name}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  profile.is_active
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                  {profile.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-[var(--foreground-secondary)]">
                                <span>{profile.ai_provider === 'openai' ? 'OpenAI' : 'Claude'} - {profile.model}</span>
                                <span className="hidden sm:inline">•</span>
                                <span>Trigger: {profile.trigger_mode}</span>
                                <span className="hidden sm:inline">•</span>
                                <span>Output: {profile.output_behavior}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => toggleProfileActive(profile.id, profile.is_active)}
                                className="px-3 py-1.5 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
                              >
                                {profile.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => router.push(`/settings/ai-profiles/${profile.id}`)}
                                className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteProfile(profile.id)}
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

              {/* Tags Section */}
              {activeSection === 'tags' && (
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">Tag Management</h2>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[var(--foreground-secondary)] mb-6">
                        Manage all your tags in one place. View usage statistics, create new tags, edit existing ones, or delete tags you no longer need.
                      </p>
                      <button
                        onClick={() => router.push('/settings/tags')}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 font-medium"
                      >
                        <span className="material-symbols-outlined">label</span>
                        <span>Manage Tags</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* App Settings Section */}
              {activeSection === 'app-settings' && (
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">App Settings</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between py-4 border-b border-[var(--border)]">
                      <div>
                        <label className="font-medium text-[var(--foreground)]">Enable Auto-tagging</label>
                        <p className="text-sm text-[var(--foreground-secondary)] mt-1">AI suggests tags for new notes</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings?.enable_auto_tagging ?? true}
                        onChange={(e) => {
                          const newValue = e.target.checked;
                          fetch('/api/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ enable_auto_tagging: newValue }),
                          }).then(() => fetchSettings());
                        }}
                        className="w-5 h-5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Default Sort
                      </label>
                      <select
                        value={settings?.default_sort ?? 'modified_desc'}
                        onChange={(e) => {
                          fetch('/api/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ default_sort: e.target.value }),
                          }).then(() => fetchSettings());
                        }}
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      >
                        <option value="modified_desc">Last Modified</option>
                        <option value="created_desc">Recently Created</option>
                        <option value="alphabetical">Alphabetical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Theme
                      </label>
                      <select
                        value={currentTheme}
                        onChange={(e) => {
                          const newTheme = e.target.value as 'light' | 'dark';
                          setTheme(newTheme);
                          fetch('/api/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ theme: newTheme }),
                          }).catch((error) => {
                            console.error('Failed to save theme to database:', error);
                          });
                        }}
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[var(--foreground-secondary)]">Loading settings...</p>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

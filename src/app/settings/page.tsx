'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

type UserSettings = {
  user_id: string;
  openai_api_key: string | null;
  claude_api_key: string | null;
  default_ai_provider: 'openai' | 'claude';
  enable_auto_tagging: boolean;
  default_sort: string;
  theme: 'auto' | 'light' | 'dark';
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
  const [activeSection, setActiveSection] = useState<'account' | 'ai-config' | 'ai-profiles' | 'app-settings'>('account');

  // Handle section from URL query parameter
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && ['account', 'ai-config', 'ai-profiles', 'app-settings'].includes(section)) {
      setActiveSection(section as 'account' | 'ai-config' | 'ai-profiles' | 'app-settings');
    }
  }, [searchParams]);

  // Form state for settings
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [defaultProvider, setDefaultProvider] = useState<'openai' | 'claude'>('openai');

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

  // Sync theme from database to context ONLY on initial load (not when settings change)
  useEffect(() => {
    if (settings?.theme && !loading) {
      // Only sync if the DB theme differs from current context theme
      // This prevents overriding user's theme choice during the session
      const dbTheme = settings.theme as 'auto' | 'light' | 'dark';
      if (dbTheme !== currentTheme) {
        setTheme(dbTheme);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]); // Only run when loading completes, not when settings change

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setOpenaiKey(data.openai_api_key || '');
        setClaudeKey(data.claude_api_key || '');
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Loading settings...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => setActiveSection('account')}
                    className={`w-full text-left px-4 py-2 rounded-lg ${
                      activeSection === 'account'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Account
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('ai-config')}
                    className={`w-full text-left px-4 py-2 rounded-lg ${
                      activeSection === 'ai-config'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    AI Configuration
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('ai-profiles')}
                    className={`w-full text-left px-4 py-2 rounded-lg ${
                      activeSection === 'ai-profiles'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    AI Profiles ({profiles.length})
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSection('app-settings')}
                    className={`w-full text-left px-4 py-2 rounded-lg ${
                      activeSection === 'app-settings'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    App Settings
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              {/* Account Section */}
              {activeSection === 'account' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      />
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={handleSignOut}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Configuration Section */}
              {activeSection === 'ai-config' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AI Configuration</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        OpenAI API Key
                      </label>
                      <input
                        type="password"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Your OpenAI API key is encrypted and stored securely
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Claude API Key
                      </label>
                      <input
                        type="password"
                        value={claudeKey}
                        onChange={(e) => setClaudeKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Your Claude API key is encrypted and stored securely
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Default AI Provider
                      </label>
                      <select
                        value={defaultProvider}
                        onChange={(e) => setDefaultProvider(e.target.value as 'openai' | 'claude')}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="claude">Claude</option>
                      </select>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Profiles Section */}
              {activeSection === 'ai-profiles' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Profiles</h2>
                    <button
                      onClick={() => router.push('/settings/ai-profiles/new')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create New Profile
                    </button>
                  </div>

                  {profiles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <p className="mb-2">No AI Profiles yet</p>
                      <p className="text-sm">Create a profile to automate AI tasks when you tag notes</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {profiles.map((profile) => (
                        <div
                          key={profile.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-medium text-gray-900 dark:text-white">{profile.name}</h3>
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                  #{profile.tags.name}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded ${
                                  profile.is_active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {profile.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <span>{profile.ai_provider === 'openai' ? 'OpenAI' : 'Claude'} - {profile.model}</span>
                                <span>•</span>
                                <span>Trigger: {profile.trigger_mode}</span>
                                <span>•</span>
                                <span>Output: {profile.output_behavior}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleProfileActive(profile.id, profile.is_active)}
                                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                              >
                                {profile.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => router.push(`/settings/ai-profiles/${profile.id}`)}
                                className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteProfile(profile.id)}
                                className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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

              {/* App Settings Section */}
              {activeSection === 'app-settings' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">App Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <label className="font-medium text-gray-900 dark:text-white">Enable Auto-tagging</label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">AI suggests tags for new notes</p>
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="modified_desc">Last Modified</option>
                        <option value="created_desc">Recently Created</option>
                        <option value="alphabetical">Alphabetical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Theme
                      </label>
                      <select
                        value={currentTheme}
                        onChange={(e) => {
                          const newTheme = e.target.value as 'auto' | 'light' | 'dark';
                          // Update context immediately for instant UI feedback
                          setTheme(newTheme);
                          // Save to database in background (don't refetch to avoid race condition)
                          fetch('/api/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ theme: newTheme }),
                          }).catch((error) => {
                            console.error('Failed to save theme to database:', error);
                            // Could show a toast notification here
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="auto">Auto</option>
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Loading settings...</div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

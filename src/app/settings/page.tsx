'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type UserSettings = {
  user_id: string;
  openai_api_key: string | null;
  claude_api_key: string | null;
  openrouter_api_key: string | null;
  default_ai_provider: 'openai' | 'claude' | 'openrouter';
  enable_auto_tagging: boolean;
  default_sort: string;
  theme: 'light' | 'dark';
  email_to_note_enabled?: boolean;
  email_to_note_address?: string | null;
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
  const [activeSection, setActiveSection] = useState<'account' | 'ai-config' | 'ai-profiles' | 'tags' | 'email-to-note' | 'app-settings'>('account');

  // Handle section from URL query parameter
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && ['account', 'ai-config', 'ai-profiles', 'tags', 'email-to-note', 'app-settings'].includes(section)) {
      setActiveSection(section as 'account' | 'ai-config' | 'ai-profiles' | 'tags' | 'email-to-note' | 'app-settings');
    }
  }, [searchParams]);

  // Form state for settings
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [defaultProvider, setDefaultProvider] = useState<'openai' | 'claude' | 'openrouter'>('openai');

  // Email-to-note state
  const [emailToNoteEnabled, setEmailToNoteEnabled] = useState(false);
  const [emailToNoteAddress, setEmailToNoteAddress] = useState<string | null>(null);
  const [emailToNoteLoading, setEmailToNoteLoading] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

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
        setEmailToNoteEnabled(data.email_to_note_enabled || false);
        setEmailToNoteAddress(data.email_to_note_address || null);
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
        toast.success('Settings saved successfully!');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings');
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
        toast.success('Profile deleted successfully');
      } else {
        toast.error('Failed to delete profile');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('Error deleting profile');
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

  // Email-to-note functions
  const enableEmailToNote = async () => {
    setEmailToNoteLoading(true);
    try {
      const response = await fetch('/api/settings/email-to-note/enable', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setEmailToNoteEnabled(true);
        setEmailToNoteAddress(data.email_address);
        toast.success('Email-to-note enabled successfully!');
      } else {
        toast.error('Failed to enable email-to-note');
      }
    } catch (error) {
      console.error('Error enabling email-to-note:', error);
      toast.error('Error enabling email-to-note');
    } finally {
      setEmailToNoteLoading(false);
    }
  };

  const disableEmailToNote = async () => {
    if (!confirm('Are you sure you want to disable email-to-note? Your email address will be preserved for future use.')) return;

    setEmailToNoteLoading(true);
    try {
      const response = await fetch('/api/settings/email-to-note/disable', {
        method: 'POST',
      });

      if (response.ok) {
        setEmailToNoteEnabled(false);
        toast.success('Email-to-note disabled successfully!');
      } else {
        toast.error('Failed to disable email-to-note');
      }
    } catch (error) {
      console.error('Error disabling email-to-note:', error);
      toast.error('Error disabling email-to-note');
    } finally {
      setEmailToNoteLoading(false);
    }
  };

  const regenerateEmailAddress = async () => {
    if (!confirm('Are you sure you want to regenerate your email address? The old address will stop working immediately.')) return;

    setEmailToNoteLoading(true);
    try {
      const response = await fetch('/api/settings/email-to-note/regenerate', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setEmailToNoteAddress(data.email_address);
        toast.success('Email address regenerated successfully!');
      } else {
        toast.error('Failed to regenerate email address');
      }
    } catch (error) {
      console.error('Error regenerating email address:', error);
      toast.error('Error regenerating email address');
    } finally {
      setEmailToNoteLoading(false);
    }
  };

  const copyEmailAddress = async () => {
    if (!emailToNoteAddress) return;

    try {
      await navigator.clipboard.writeText(emailToNoteAddress);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy email address');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/dashboard')}
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to Dashboard</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Settings</h1>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                >
                  <span className="material-symbols-outlined text-xl">
                    {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-[var(--background-surface)] rounded-xl border border-[var(--border)] p-1.5 sm:p-2">
              <ul className="space-y-1">
                <li>
                  <Button
                    variant={activeSection === 'account' ? 'default' : 'ghost'}
                    onClick={() => setActiveSection('account')}
                    className="w-full justify-start gap-2 sm:gap-3"
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">person</span>
                    <span className="font-medium text-sm sm:text-base">Account</span>
                  </Button>
                </li>
                <li>
                  <Button
                    variant={activeSection === 'ai-config' ? 'default' : 'ghost'}
                    onClick={() => setActiveSection('ai-config')}
                    className="w-full justify-start gap-2 sm:gap-3"
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">key</span>
                    <span className="font-medium text-sm sm:text-base">AI Configuration</span>
                  </Button>
                </li>
                <li>
                  <Button
                    variant={activeSection === 'ai-profiles' ? 'default' : 'ghost'}
                    onClick={() => setActiveSection('ai-profiles')}
                    className="w-full justify-start gap-2 sm:gap-3"
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">auto_awesome</span>
                    <span className="font-medium text-sm sm:text-base">AI Profiles ({profiles.length})</span>
                  </Button>
                </li>
                <li>
                  <Button
                    variant={activeSection === 'tags' ? 'default' : 'ghost'}
                    onClick={() => setActiveSection('tags')}
                    className="w-full justify-start gap-2 sm:gap-3"
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">label</span>
                    <span className="font-medium text-sm sm:text-base">Tags</span>
                  </Button>
                </li>
                <li>
                  <Button
                    variant={activeSection === 'email-to-note' ? 'default' : 'ghost'}
                    onClick={() => setActiveSection('email-to-note')}
                    className="w-full justify-start gap-2 sm:gap-3"
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">email</span>
                    <span className="font-medium text-sm sm:text-base">Email to Note</span>
                  </Button>
                </li>
                <li>
                  <Button
                    variant={activeSection === 'app-settings' ? 'default' : 'ghost'}
                    onClick={() => setActiveSection('app-settings')}
                    className="w-full justify-start gap-2 sm:gap-3"
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">tune</span>
                    <span className="font-medium text-sm sm:text-base">App Settings</span>
                  </Button>
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
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="bg-[var(--background)] text-[var(--foreground-secondary)] cursor-not-allowed"
                      />
                    </div>
                    <div className="pt-4 border-t border-[var(--border)]">
                      <Button
                        variant="destructive"
                        onClick={handleSignOut}
                      >
                        <span className="material-symbols-outlined text-xl">logout</span>
                        <span>Sign Out</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Configuration Section */}
              {activeSection === 'ai-config' && (
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">AI Configuration</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="openai-key">OpenAI API Key</Label>
                      <Input
                        id="openai-key"
                        type="password"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder={settings?.openai_api_key ? 'sk-...••••' : 'sk-...'}
                      />
                      <p className="text-sm text-[var(--foreground-secondary)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">lock</span>
                        <span>Encrypted at rest with AES-256 • Never logged or shared</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="claude-key">Claude API Key</Label>
                      <Input
                        id="claude-key"
                        type="password"
                        value={claudeKey}
                        onChange={(e) => setClaudeKey(e.target.value)}
                        placeholder={settings?.claude_api_key ? 'sk-ant-...••••' : 'sk-ant-...'}
                      />
                      <p className="text-sm text-[var(--foreground-secondary)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">lock</span>
                        <span>Encrypted at rest with AES-256 • Never logged or shared</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
                      <Input
                        id="openrouter-key"
                        type="password"
                        value={openrouterKey}
                        onChange={(e) => setOpenrouterKey(e.target.value)}
                        placeholder={settings?.openrouter_api_key ? 'sk-or-...••••' : 'sk-or-...'}
                      />
                      <p className="text-sm text-[var(--foreground-secondary)] flex items-center gap-1">
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

                    <div className="space-y-2">
                      <Label>Default AI Provider</Label>
                      <Select
                        value={defaultProvider}
                        onValueChange={(value) => setDefaultProvider(value as 'openai' | 'claude' | 'openrouter')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="claude">Claude</SelectItem>
                          <SelectItem value="openrouter">OpenRouter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4">
                      <Button onClick={saveSettings} disabled={saving}>
                        <span className="material-symbols-outlined text-xl">save</span>
                        <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                      </Button>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/settings/ai-logs')}
                      >
                        <span className="material-symbols-outlined text-lg">history</span>
                        <span>Execution Logs</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => router.push('/settings/ai-profiles/new')}
                      >
                        <span className="material-symbols-outlined text-lg">add</span>
                        <span>Create New Profile</span>
                      </Button>
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
                                <Badge variant="secondary" className="bg-[var(--ai-purple)]/10 text-[var(--ai-purple)]">
                                  #{profile.tags.name}
                                </Badge>
                                <Badge variant={profile.is_active ? 'default' : 'secondary'} className={
                                  profile.is_active
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : ''
                                }>
                                  {profile.is_active ? 'Active' : 'Inactive'}
                                </Badge>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleProfileActive(profile.id, profile.is_active)}
                              >
                                {profile.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:bg-primary/10"
                                onClick={() => router.push(`/settings/ai-profiles/${profile.id}`)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => deleteProfile(profile.id)}
                              >
                                Delete
                              </Button>
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
                      <Button onClick={() => router.push('/settings/tags')}>
                        <span className="material-symbols-outlined">label</span>
                        <span>Manage Tags</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Email to Note Section */}
              {activeSection === 'email-to-note' && (
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">Email to Note</h2>
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex gap-3">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                        <div className="flex-1">
                          <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-1">How it works</h3>
                          <p className="text-sm text-blue-800 dark:text-blue-300">
                            Send an email to your unique address and it will automatically create a note.
                            Add #hashtags in the subject line to auto-tag your notes.
                          </p>
                        </div>
                      </div>
                    </div>

                    {!emailToNoteEnabled ? (
                      <div>
                        <p className="text-[var(--foreground-secondary)] mb-4">
                          Enable email-to-note to get a unique email address that creates notes automatically.
                        </p>
                        <Button onClick={enableEmailToNote} disabled={emailToNoteLoading}>
                          <span className="material-symbols-outlined">mail</span>
                          <span>{emailToNoteLoading ? 'Enabling...' : 'Enable Email to Note'}</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email-address">Your Email Address</Label>
                          <div className="flex gap-2">
                            <Input
                              id="email-address"
                              type="text"
                              value={emailToNoteAddress || ''}
                              readOnly
                              className="flex-1 font-mono text-sm"
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" onClick={copyEmailAddress}>
                                    <span className="material-symbols-outlined">
                                      {copiedToClipboard ? 'check' : 'content_copy'}
                                    </span>
                                    <span className="hidden sm:inline">{copiedToClipboard ? 'Copied!' : 'Copy'}</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy to clipboard</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <p className="text-sm text-[var(--foreground-secondary)]">
                            Send emails to this address to create notes automatically
                          </p>
                        </div>

                        <div className="pt-4 border-t border-[var(--border)] space-y-3">
                          <Button
                            variant="outline"
                            onClick={regenerateEmailAddress}
                            disabled={emailToNoteLoading}
                          >
                            <span className="material-symbols-outlined">refresh</span>
                            <span>{emailToNoteLoading ? 'Regenerating...' : 'Regenerate Email Address'}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={disableEmailToNote}
                            disabled={emailToNoteLoading}
                          >
                            <span className="material-symbols-outlined">block</span>
                            <span>{emailToNoteLoading ? 'Disabling...' : 'Disable Email to Note'}</span>
                          </Button>
                        </div>

                        <Card className="mt-6">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <span className="material-symbols-outlined">tips_and_updates</span>
                              <span>Usage Tips</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2 text-sm text-[var(--foreground-secondary)]">
                              <li className="flex gap-2">
                                <span>•</span>
                                <span>Email subject becomes the note title</span>
                              </li>
                              <li className="flex gap-2">
                                <span>•</span>
                                <span>Add #tags in the subject line (e.g., &quot;Meeting notes #work #important&quot;)</span>
                              </li>
                              <li className="flex gap-2">
                                <span>•</span>
                                <span>Email signatures are automatically removed</span>
                              </li>
                              <li className="flex gap-2">
                                <span>•</span>
                                <span>Maximum 5 tags per note</span>
                              </li>
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* App Settings Section */}
              {activeSection === 'app-settings' && (
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">App Settings</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Default Sort</Label>
                      <Select
                        value={settings?.default_sort ?? 'modified_desc'}
                        onValueChange={(value) => {
                          fetch('/api/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ default_sort: value }),
                          }).then(() => fetchSettings());
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sort order" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modified_desc">Last Modified</SelectItem>
                          <SelectItem value="created_desc">Recently Created</SelectItem>
                          <SelectItem value="alphabetical">Alphabetical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <Select
                        value={currentTheme}
                        onValueChange={(value) => {
                          const newTheme = value as 'light' | 'dark';
                          setTheme(newTheme);
                          fetch('/api/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ theme: newTheme }),
                          }).catch((error) => {
                            console.error('Failed to save theme to database:', error);
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
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
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-[var(--foreground-secondary)]">Loading settings...</p>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

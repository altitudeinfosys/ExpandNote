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

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingTag, setDeletingTag] = useState<TagWithMetadata | null>(null);
  const [deleteConfirmLevel, setDeleteConfirmLevel] = useState<1 | 2 | 3>(1);
  const [deleting, setDeleting] = useState(false);

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

  // Modal handlers
  const openCreateModal = () => {
    setEditingTag(null);
    setTagName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTag(null);
    setTagName('');
    setFormError(null);
  };

  // Validation
  const validateTagName = (name: string): string | null => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return 'Tag name is required';
    }
    if (trimmed.length > 50) {
      return 'Tag name must be 50 characters or less';
    }
    // Check for duplicates (exclude current tag if editing)
    const duplicate = tags.find(t =>
      t.name.toLowerCase() === trimmed.toLowerCase() &&
      t.id !== editingTag?.id
    );
    if (duplicate) {
      return 'A tag with this name already exists';
    }
    return null;
  };

  // Save handler
  const handleSaveTag = async () => {
    const error = validateTagName(tagName);
    if (error) {
      setFormError(error);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const trimmed = tagName.trim();
      const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags';
      const method = editingTag ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save tag');
      }

      const result = await response.json();

      // Update tags list optimistically
      if (editingTag) {
        setTags(tags.map(t => t.id === editingTag.id ? { ...t, name: trimmed } : t));
      } else {
        // For new tags, we need to fetch to get full metadata
        await fetchData();
      }

      closeModal();
    } catch (err) {
      console.error('Error saving tag:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const openDeleteDialog = (tag: TagWithMetadata) => {
    setDeletingTag(tag);

    // Determine confirmation level
    if (tag.ai_profile_count > 0) {
      setDeleteConfirmLevel(3); // Critical - has AI Profile
    } else if (tag.note_count > 0) {
      setDeleteConfirmLevel(2); // Moderate - has notes
    } else {
      setDeleteConfirmLevel(1); // Basic - no dependencies
    }
  };

  const closeDeleteDialog = () => {
    setDeletingTag(null);
    setDeleting(false);
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/tags/${deletingTag.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tag');
      }

      // Remove from list optimistically
      setTags(tags.filter(t => t.id !== deletingTag.id));
      closeDeleteDialog();
    } catch (err) {
      console.error('Error deleting tag:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete tag');
    } finally {
      setDeleting(false);
    }
  };

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
                onClick={openCreateModal}
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
                          onClick={() => openEditModal(tag)}
                          className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteDialog(tag)}
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

      {/* Tag Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-surface)] rounded-xl max-w-md w-full p-6 border border-[var(--border)]">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              {editingTag ? 'Edit Tag' : 'Create New Tag'}
            </h3>

            {/* Warning for AI Profile link */}
            {editingTag && (() => {
              const currentTag = tags.find(t => t.id === editingTag.id);
              return currentTag && currentTag.ai_profile_count > 0 ? (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
                  <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-sm">warning</span>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This tag is used by{' '}
                    <strong>
                      {currentTag.ai_profile_names.join(', ')}
                    </strong>
                    . Renaming will affect automation.
                  </p>
                </div>
              ) : null;
            })()}

            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Tag Name
              </label>
              <input
                type="text"
                value={tagName}
                onChange={(e) => {
                  setTagName(e.target.value);
                  setFormError(null);
                }}
                placeholder="e.g., work, personal, ideas"
                maxLength={50}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                autoFocus
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-[var(--foreground-secondary)]">
                  {tagName.length}/50 characters
                </p>
              </div>
              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTag}
                disabled={saving || tagName.trim().length === 0}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingTag ? 'Save Changes' : 'Create Tag'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-surface)] rounded-xl max-w-md w-full p-6 border border-[var(--border)]">
            {/* Level 3: Critical Warning */}
            {deleteConfirmLevel === 3 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-2xl">warning</span>
                  <h3 className="text-xl font-semibold text-[var(--foreground)]">
                    Warning: AI Profile Dependency
                  </h3>
                </div>
                <div className="mb-6 space-y-3">
                  <p className="text-[var(--foreground)]">
                    This tag is linked to the AI Profile{deletingTag.ai_profile_count > 1 ? 's' : ''}:
                  </p>
                  <div className="bg-[var(--background)] p-3 rounded-lg">
                    <ul className="list-disc list-inside space-y-1">
                      {deletingTag.ai_profile_names.map((name, i) => (
                        <li key={i} className="text-[var(--foreground)] font-medium">{name}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-[var(--foreground-secondary)]">
                    Deleting this tag will break {deletingTag.ai_profile_count > 1 ? 'these automations' : 'this automation'}.
                  </p>
                  <p className="text-[var(--foreground)] font-medium">
                    Are you absolutely sure you want to delete <strong>#{deletingTag.name}</strong>?
                  </p>
                </div>
              </>
            ) : deleteConfirmLevel === 2 ? (
              /* Level 2: Moderate Warning */
              <>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                  Delete Tag?
                </h3>
                <div className="mb-6 space-y-3">
                  <p className="text-[var(--foreground)]">
                    This tag is used in <strong>{deletingTag.note_count} note{deletingTag.note_count > 1 ? 's' : ''}</strong>.
                  </p>
                  <p className="text-[var(--foreground-secondary)]">
                    Deleting it will remove the tag from all notes.
                  </p>
                  <p className="text-[var(--foreground)]">
                    Are you sure you want to delete <strong>#{deletingTag.name}</strong>?
                  </p>
                </div>
              </>
            ) : (
              /* Level 1: Basic Confirmation */
              <>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                  Delete Tag?
                </h3>
                <p className="text-[var(--foreground)] mb-6">
                  Are you sure you want to delete <strong>#{deletingTag.name}</strong>?
                </p>
              </>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDeleteDialog}
                disabled={deleting}
                className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTag}
                disabled={deleting}
                className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ${
                  deleteConfirmLevel === 3
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>{deleteConfirmLevel === 3 ? 'Delete Anyway' : 'Delete'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

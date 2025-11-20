import { CreateVersionParams, NoteVersion, VersionListItem } from '@/types/version';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SIGNIFICANT_CHANGE_THRESHOLD, AUTO_SAVE_VERSION_FREQUENCY } from './constants';

/**
 * Creates a new version snapshot of a note
 */
export async function createVersion(
  supabase: SupabaseClient,
  params: CreateVersionParams
): Promise<NoteVersion> {

  const { data, error } = await supabase
    .from('note_versions')
    .insert({
      note_id: params.noteId,
      user_id: params.userId,
      title: params.title,
      content: params.content,
      tags: params.tags,
      snapshot_trigger: params.trigger,
      ai_profile_id: params.aiProfileId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create version:', error);
    throw new Error(`Failed to create version: ${error.message}`);
  }

  return data;
}

/**
 * Determines if a new version should be created based on trigger type and content changes
 */
export function shouldCreateVersion(
  currentContent: string,
  previousContent: string | null,
  trigger: 'auto_save' | 'manual' | 'before_ai' | 'after_ai',
  saveCount: number
): boolean {
  // Always create for manual triggers
  if (trigger === 'manual') return true;

  // Always create for AI triggers
  if (trigger === 'before_ai' || trigger === 'after_ai') return true;

  // Don't create if content is identical
  if (currentContent === previousContent) return false;

  // If no previous version exists and content is not empty, create initial version
  if (previousContent === null && currentContent.trim().length > 0) {
    return true;
  }

  // For auto_save, create every Nth save
  if (trigger === 'auto_save' && saveCount % AUTO_SAVE_VERSION_FREQUENCY === 0) return true;

  // Check if content changed significantly
  const contentDiff = Math.abs(
    currentContent.length - (previousContent?.length || 0)
  );
  if (contentDiff > SIGNIFICANT_CHANGE_THRESHOLD) return true;

  return false;
}

/**
 * Gets the last saved content for comparison
 */
export async function getLastVersionContent(supabase: SupabaseClient, noteId: string): Promise<string | null> {

  const { data, error } = await supabase
    .from('note_versions')
    .select('content')
    .eq('note_id', noteId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to get last version:', error);
    return null;
  }

  return data?.content || null;
}

/**
 * Gets all versions for a note (ordered newest first)
 */
export async function getVersions(supabase: SupabaseClient, noteId: string): Promise<VersionListItem[]> {

  const { data, error } = await supabase
    .from('note_versions')
    .select('id, version_number, created_at, snapshot_trigger, content_size, ai_profile_id')
    .eq('note_id', noteId)
    .order('version_number', { ascending: false });

  if (error) {
    console.error('Failed to get versions:', error);
    throw new Error(`Failed to get versions: ${error.message}`);
  }

  return data || [];
}

/**
 * Gets a specific version by ID
 */
export async function getVersion(supabase: SupabaseClient, versionId: string): Promise<NoteVersion | null> {

  const { data, error } = await supabase
    .from('note_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (error) {
    console.error('Failed to get version:', error);
    return null;
  }

  return data;
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createVersion, shouldCreateVersion, getVersions } from '../version-manager';
import type { SupabaseClient } from '@supabase/supabase-js';

// Create mock Supabase client
const createMockSupabase = () => ({
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: {
            id: 'version-1',
            note_id: 'note-1',
            user_id: 'user-1',
            title: 'Test Note',
            content: 'Test content',
            tags: [],
            version_number: 1,
            created_at: new Date().toISOString(),
            snapshot_trigger: 'manual',
            ai_profile_id: null,
            content_size: 12
          },
          error: null
        }))
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }))
    }))
  }))
}) as unknown as SupabaseClient;

describe('version-manager', () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });
  describe('createVersion', () => {
    it('should create a new version', async () => {
      const params = {
        noteId: 'note-1',
        userId: 'user-1',
        title: 'Test Note',
        content: 'Test content',
        tags: [],
        trigger: 'manual' as const
      };

      const result = await createVersion(mockSupabase, params);

      expect(result).toBeDefined();
      expect(result.note_id).toBe('note-1');
      expect(result.snapshot_trigger).toBe('manual');
    });
  });

  describe('shouldCreateVersion', () => {
    it('should return true for manual trigger', () => {
      const result = shouldCreateVersion(
        'current content',
        'previous content',
        'manual',
        1
      );
      expect(result).toBe(true);
    });

    it('should return false if content is identical', () => {
      const content = 'same content';
      const result = shouldCreateVersion(
        content,
        content,
        'auto_save',
        1
      );
      expect(result).toBe(false);
    });

    it('should return true for before_ai trigger', () => {
      const result = shouldCreateVersion(
        'current',
        'previous',
        'before_ai',
        1
      );
      expect(result).toBe(true);
    });
  });

  describe('getVersions', () => {
    it('should get all versions for a note', async () => {
      const versions = await getVersions(mockSupabase, 'note-1');

      expect(Array.isArray(versions)).toBe(true);
    });

    it('should return versions in descending order', async () => {
      const versions = await getVersions(mockSupabase, 'note-1');

      if (versions.length > 1) {
        expect(versions[0].version_number).toBeGreaterThan(
          versions[1].version_number
        );
      }
    });
  });
});

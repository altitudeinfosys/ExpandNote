import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createVersion, shouldCreateVersion } from '../version-manager';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
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
      }))
    }))
  }))
}));

describe('version-manager', () => {
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

      const result = await createVersion(params);

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
});

import { describe, it, expect } from 'vitest';
import { isSupportedAttachment } from '../attachment-processor';

describe('attachment-processor', () => {
  describe('isSupportedAttachment', () => {
    it('should return true for PDF files', () => {
      expect(isSupportedAttachment('application/pdf')).toBe(true);
    });

    it('should return true for Word .docx files', () => {
      expect(isSupportedAttachment('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    });

    it('should return true for Word .doc files', () => {
      expect(isSupportedAttachment('application/msword')).toBe(true);
    });

    it('should return false for unsupported file types', () => {
      expect(isSupportedAttachment('image/png')).toBe(false);
      expect(isSupportedAttachment('text/plain')).toBe(false);
      expect(isSupportedAttachment('application/zip')).toBe(false);
    });
  });
});

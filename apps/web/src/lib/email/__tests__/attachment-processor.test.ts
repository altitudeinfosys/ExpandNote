import { describe, it, expect } from 'vitest';
import { isSupportedAttachment, processAttachment, processAttachments } from '../attachment-processor';

describe('attachment-processor', () => {
  describe('isSupportedAttachment', () => {
    it('should return true for PDF files', () => {
      expect(isSupportedAttachment('application/pdf')).toBe(true);
    });

    it('should return true for Word .docx files', () => {
      expect(isSupportedAttachment('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    });

    it('should return false for legacy Word .doc files (not supported by mammoth)', () => {
      expect(isSupportedAttachment('application/msword')).toBe(false);
    });

    it('should return false for unsupported file types', () => {
      expect(isSupportedAttachment('image/png')).toBe(false);
      expect(isSupportedAttachment('text/plain')).toBe(false);
      expect(isSupportedAttachment('application/zip')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isSupportedAttachment('')).toBe(false);
    });
  });

  describe('processAttachment', () => {
    it('should return error for unsupported file type', async () => {
      const result = await processAttachment(
        'image.png',
        'image/png',
        Buffer.from('fake image data')
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported file type: image/png');
      expect(result.filename).toBe('image.png');
      expect(result.type).toBe('image/png');
    });

    it('should return error for legacy .doc files', async () => {
      const result = await processAttachment(
        'document.doc',
        'application/msword',
        Buffer.from('fake doc data')
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported file type: application/msword');
    });

    it('should handle invalid PDF buffer gracefully', async () => {
      const result = await processAttachment(
        'invalid.pdf',
        'application/pdf',
        Buffer.from('not a valid pdf')
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse PDF');
    });

    it('should handle invalid DOCX buffer gracefully', async () => {
      const result = await processAttachment(
        'invalid.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        Buffer.from('not a valid docx')
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse Word document');
    });

    it('should accept base64 string content for unsupported types', async () => {
      // Test base64 handling with unsupported type (doesn't trigger slow PDF parsing)
      const base64Content = Buffer.from('some content').toString('base64');

      const result = await processAttachment(
        'test.png',
        'image/png',
        base64Content
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported file type: image/png');
    });
  });

  describe('processAttachments', () => {
    it('should process multiple attachments', async () => {
      const attachments = [
        { filename: 'image.png', content_type: 'image/png', content: Buffer.from('fake') },
        { filename: 'doc.txt', content_type: 'text/plain', content: Buffer.from('fake') },
      ];

      const results = await processAttachments(attachments);

      expect(results).toHaveLength(2);
      expect(results[0].filename).toBe('image.png');
      expect(results[0].success).toBe(false);
      expect(results[1].filename).toBe('doc.txt');
      expect(results[1].success).toBe(false);
    });

    it('should return empty array for empty input', async () => {
      const results = await processAttachments([]);
      expect(results).toHaveLength(0);
    });

    it('should process attachments sequentially', async () => {
      const attachments = [
        { filename: 'first.png', content_type: 'image/png', content: Buffer.from('fake') },
        { filename: 'second.png', content_type: 'image/png', content: Buffer.from('fake') },
      ];

      const results = await processAttachments(attachments);

      // Both should be processed (even though they fail due to unsupported type)
      expect(results).toHaveLength(2);
      expect(results[0].filename).toBe('first.png');
      expect(results[1].filename).toBe('second.png');
    });
  });
});

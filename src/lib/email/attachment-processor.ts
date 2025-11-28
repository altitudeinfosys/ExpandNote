import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Supported attachment types for text extraction
 * Note: Only .docx is supported for Word documents (mammoth.js doesn't support legacy .doc format)
 */
export type SupportedAttachmentType = 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Processed attachment result
 */
export interface ProcessedAttachment {
  filename: string;
  content: string;
  type: string;
  success: boolean;
  error?: string;
}

/**
 * Check if attachment type is supported for text extraction
 */
export function isSupportedAttachment(contentType: string): boolean {
  const supportedTypes: SupportedAttachmentType[] = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx only
  ];
  return supportedTypes.includes(contentType as SupportedAttachmentType);
}

/**
 * Extract text from PDF buffer
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from Word document buffer (.docx)
 */
async function extractWordText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  } catch (error) {
    throw new Error(`Failed to parse Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process a single attachment and extract text content
 * @param attachment Attachment data from Resend API
 * @returns Processed attachment with extracted text
 */
export async function processAttachment(
  filename: string,
  contentType: string,
  content: string | Buffer
): Promise<ProcessedAttachment> {
  const result: ProcessedAttachment = {
    filename,
    content: '',
    type: contentType,
    success: false,
  };

  // Check if attachment type is supported
  if (!isSupportedAttachment(contentType)) {
    result.error = `Unsupported file type: ${contentType}`;
    return result;
  }

  try {
    // Convert content to Buffer if it's a base64 string
    const buffer = typeof content === 'string'
      ? Buffer.from(content, 'base64')
      : content;

    // Extract text based on content type
    if (contentType === 'application/pdf') {
      result.content = await extractPdfText(buffer);
    } else if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      result.content = await extractWordText(buffer);
    }

    // Check if we extracted any content
    if (!result.content) {
      result.error = 'No text content extracted from file';
      return result;
    }

    result.success = true;
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error processing attachment';
    return result;
  }
}

/**
 * Process multiple attachments from an email
 * @param attachments Array of attachments from Resend API
 * @returns Array of processed attachments
 */
export async function processAttachments(
  attachments: Array<{ filename: string; content_type: string; content: string | Buffer }>
): Promise<ProcessedAttachment[]> {
  const results: ProcessedAttachment[] = [];

  for (const attachment of attachments) {
    const result = await processAttachment(
      attachment.filename,
      attachment.content_type,
      attachment.content
    );
    results.push(result);
  }

  return results;
}

/**
 * Content sanitization utilities for AI-generated output
 *
 * Protects against potential XSS attacks and malicious content injection
 * in AI-generated text that gets inserted into notes.
 */

/**
 * Sanitize AI-generated content to remove potentially harmful HTML/JavaScript
 *
 * This is a simple implementation that removes the most common attack vectors:
 * - <script> tags and their content
 * - Inline event handlers (onclick, onload, etc.)
 * - javascript: protocol in links
 *
 * For more robust sanitization in production, consider using DOMPurify:
 * npm install isomorphic-dompurify
 *
 * @param content - The AI-generated content to sanitize
 * @returns Sanitized content safe for insertion into notes
 */
export function sanitizeAIOutput(content: string): string {
  if (!content) return '';

  let sanitized = content;

  // Remove script tags and their content (case-insensitive, multiline)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove inline event handlers (onclick, onload, onerror, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol from links and other attributes
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src="#"');

  // Remove data: URLs that could contain SVG with script
  sanitized = sanitized.replace(/(?:href|src)\s*=\s*["']data:text\/html[^"']*["']/gi, '');

  // Remove <iframe>, <object>, <embed> tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');

  return sanitized;
}

/**
 * Check if content contains potentially dangerous patterns
 * Useful for logging/monitoring without blocking content
 *
 * @param content - Content to check
 * @returns Array of detected security concerns
 */
export function detectSecurityConcerns(content: string): string[] {
  const concerns: string[] = [];

  if (/<script/i.test(content)) {
    concerns.push('Contains <script> tag');
  }

  if (/\bon\w+\s*=/i.test(content)) {
    concerns.push('Contains inline event handler');
  }

  if (/javascript:/i.test(content)) {
    concerns.push('Contains javascript: protocol');
  }

  if (/<iframe/i.test(content)) {
    concerns.push('Contains <iframe> tag');
  }

  if (/data:text\/html/i.test(content)) {
    concerns.push('Contains data: URL with HTML');
  }

  return concerns;
}

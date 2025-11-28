import { convert } from 'html-to-text';

/**
 * Parse email content, preferring plain text over HTML
 * @param text Plain text content from email
 * @param html HTML content from email
 * @returns Cleaned email content
 */
export function parseEmailContent(text?: string, html?: string): string {
  // Prefer plain text if available and not empty
  if (text && text.trim()) {
    return cleanEmailSignature(text);
  }

  // Fall back to converting HTML to text
  if (html && html.trim()) {
    const converted = convert(html, {
      wordwrap: 80,
      selectors: [
        { selector: 'a', options: { ignoreHref: false } },
        { selector: 'img', format: 'skip' }
      ]
    });
    return cleanEmailSignature(converted);
  }

  return '';
}

/**
 * Remove email signatures from content
 * Removes text after:
 * - Lines starting with "--"
 * - "Sent from my" phrases
 * @param text Email text content
 * @returns Content with signature removed
 */
export function cleanEmailSignature(text: string): string {
  const lines = text.split('\n');

  // Find signature markers
  const signatureIndex = lines.findIndex(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('--') ||
           line.toLowerCase().includes('sent from my');
  });

  // If signature found, return content before it
  if (signatureIndex > 0) {
    return lines.slice(0, signatureIndex).join('\n').trim();
  }

  return text.trim();
}

/**
 * Extract hashtags from email subject line
 * Supports formats like #tag, #tag-name, #tag_name, #tag123
 * Converts to lowercase and limits to 5 tags max
 * @param subject Email subject line
 * @returns Array of tag strings (without # prefix)
 */
export function extractTagsFromSubject(subject: string): string[] {
  if (!subject) return [];

  // Match hashtags: # followed by alphanumeric, dash, or underscore
  const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
  const matches = subject.matchAll(hashtagRegex);

  const tags: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const tag = match[1].toLowerCase();

    // Skip if tag is only special characters (after removing valid chars, nothing left)
    if (!tag || !/[a-z0-9]/.test(tag)) {
      continue;
    }

    // Skip duplicates
    if (seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    tags.push(tag);

    // Limit to 5 tags as per CLAUDE.md constraints
    if (tags.length >= 5) {
      break;
    }
  }

  return tags;
}

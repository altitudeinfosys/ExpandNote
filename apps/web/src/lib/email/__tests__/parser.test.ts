import { describe, it, expect } from 'vitest';
import { parseEmailContent, extractTagsFromSubject, cleanEmailSignature } from '../parser';

describe('parseEmailContent', () => {
  it('returns plain text when available', () => {
    const text = 'This is plain text content';
    const html = '<p>This is HTML content</p>';

    const result = parseEmailContent(text, html);

    expect(result).toBe('This is plain text content');
  });

  it('converts HTML to text when plain text is empty', () => {
    const text = '';
    const html = '<p>This is HTML content</p>';

    const result = parseEmailContent(text, html);

    expect(result).toContain('This is HTML content');
  });

  it('converts HTML to text when plain text is whitespace only', () => {
    const text = '   \n  \t  ';
    const html = '<p>This is HTML content</p>';

    const result = parseEmailContent(text, html);

    expect(result).toContain('This is HTML content');
  });

  it('returns empty string when both text and html are empty', () => {
    const result = parseEmailContent('', '');

    expect(result).toBe('');
  });

  it('returns empty string when both text and html are undefined', () => {
    const result = parseEmailContent(undefined, undefined);

    expect(result).toBe('');
  });

  it('handles HTML with links', () => {
    const html = '<p>Check out <a href="https://example.com">this link</a></p>';

    const result = parseEmailContent('', html);

    expect(result).toContain('this link');
    expect(result).toContain('https://example.com');
  });

  it('strips HTML images', () => {
    const html = '<p>Text before<img src="image.jpg" alt="An image"/>Text after</p>';

    const result = parseEmailContent('', html);

    expect(result).toContain('Text before');
    expect(result).toContain('Text after');
    expect(result).not.toContain('img');
    expect(result).not.toContain('image.jpg');
  });

  it('preserves line breaks in plain text', () => {
    const text = 'Line 1\nLine 2\nLine 3';

    const result = parseEmailContent(text, '');

    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
    expect(result).toContain('Line 3');
  });
});

describe('cleanEmailSignature', () => {
  it('removes signature starting with double dash', () => {
    const text = 'Email content\n\n--\nJohn Doe\njohn@example.com';

    const result = cleanEmailSignature(text);

    expect(result).toBe('Email content');
    expect(result).not.toContain('John Doe');
  });

  it('removes "Sent from my" signatures', () => {
    const text = 'Email content\n\nSent from my iPhone';

    const result = cleanEmailSignature(text);

    expect(result).toBe('Email content');
    expect(result).not.toContain('Sent from my iPhone');
  });

  it('removes "Sent from my" with different cases', () => {
    const text = 'Email content\n\nsent from my Android';

    const result = cleanEmailSignature(text);

    expect(result).toBe('Email content');
    expect(result).not.toContain('sent from my Android');
  });

  it('keeps content when no signature is present', () => {
    const text = 'Just regular email content';

    const result = cleanEmailSignature(text);

    expect(result).toBe('Just regular email content');
  });

  it('handles double dash in the middle of content', () => {
    const text = 'Content with -- double dash in middle\nMore content';

    const result = cleanEmailSignature(text);

    // Should NOT remove because -- is not at start of line
    expect(result).toContain('double dash');
  });

  it('removes signature at first occurrence of --', () => {
    const text = 'Email content\n--\nSignature part 1\n--\nSignature part 2';

    const result = cleanEmailSignature(text);

    expect(result).toBe('Email content');
    expect(result).not.toContain('Signature part');
  });
});

describe('extractTagsFromSubject', () => {
  it('extracts single hashtag from subject', () => {
    const subject = 'Meeting notes #work';

    const tags = extractTagsFromSubject(subject);

    expect(tags).toEqual(['work']);
  });

  it('extracts multiple hashtags from subject', () => {
    const subject = 'Project update #work #project-x #urgent';

    const tags = extractTagsFromSubject(subject);

    expect(tags).toEqual(['work', 'project-x', 'urgent']);
  });

  it('returns empty array when no hashtags present', () => {
    const subject = 'Regular email subject';

    const tags = extractTagsFromSubject(subject);

    expect(tags).toEqual([]);
  });

  it('handles hashtags with numbers', () => {
    const subject = 'Q4 review #q4 #2024';

    const tags = extractTagsFromSubject(subject);

    expect(tags).toEqual(['q4', '2024']);
  });

  it('handles hashtags with underscores', () => {
    const subject = 'Notes #meeting_notes #action_items';

    const tags = extractTagsFromSubject(subject);

    expect(tags).toEqual(['meeting_notes', 'action_items']);
  });

  it('converts hashtags to lowercase', () => {
    const subject = 'Important #URGENT #Project';

    const tags = extractTagsFromSubject(subject);

    expect(tags).toEqual(['urgent', 'project']);
  });

  it('removes duplicate hashtags', () => {
    const subject = 'Notes #work #project #work #project';

    const tags = extractTagsFromSubject(subject);

    expect(tags).toEqual(['work', 'project']);
  });

  it('ignores hashtags that are just special characters', () => {
    const subject = 'Email with ### and #---';

    const tags = extractTagsFromSubject(subject);

    expect(tags).toEqual([]);
  });

  it('handles hashtags at different positions', () => {
    const subject = '#start middle #middle end #end';

    const tags = extractTagsFromSubject(subject);

    expect(tags).toEqual(['start', 'middle', 'end']);
  });

  it('limits to 5 tags maximum', () => {
    const subject = 'Too many #tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7';

    const tags = extractTagsFromSubject(subject);

    expect(tags).toHaveLength(5);
    expect(tags).toEqual(['tag1', 'tag2', 'tag3', 'tag4', 'tag5']);
  });
});

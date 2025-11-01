import { describe, it, expect } from '@jest/globals';
import { substitutePromptVariables } from '../prompt-template';
import type { PromptVariables } from '../types';

describe('substitutePromptVariables', () => {
  const variables: PromptVariables = {
    note_title: 'My Video',
    note_content: 'This is a test transcript',
    tags: 'youtube, education',
  };

  it('should replace {note_title} variable', () => {
    const template = 'Title: {note_title}';
    const result = substitutePromptVariables(template, variables);
    expect(result).toBe('Title: My Video');
  });

  it('should replace {note_content} variable', () => {
    const template = 'Content: {note_content}';
    const result = substitutePromptVariables(template, variables);
    expect(result).toBe('Content: This is a test transcript');
  });

  it('should replace {tags} variable', () => {
    const template = 'Tags: {tags}';
    const result = substitutePromptVariables(template, variables);
    expect(result).toBe('Tags: youtube, education');
  });

  it('should replace multiple variables', () => {
    const template = 'Title: {note_title}\nContent: {note_content}\nTags: {tags}';
    const result = substitutePromptVariables(template, variables);
    expect(result).toBe('Title: My Video\nContent: This is a test transcript\nTags: youtube, education');
  });

  it('should handle missing variables gracefully', () => {
    const template = 'Title: {note_title}';
    const result = substitutePromptVariables(template, {
      note_title: '',
      note_content: '',
      tags: '',
    });
    expect(result).toBe('Title: ');
  });
});

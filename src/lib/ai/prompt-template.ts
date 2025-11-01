import type { PromptVariables } from './types';

/**
 * Substitutes variables in a prompt template.
 * Variables: {note_title}, {note_content}, {tags}
 */
export function substitutePromptVariables(
  template: string,
  variables: PromptVariables
): string {
  return template
    .replace(/{note_title}/g, variables.note_title)
    .replace(/{note_content}/g, variables.note_content)
    .replace(/{tags}/g, variables.tags);
}

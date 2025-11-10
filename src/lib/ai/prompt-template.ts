/**
 * Prompt template engine with variable substitution
 * Supports: {note_title}, {note_content}, {tags}
 */

export interface PromptVariables {
  note_title: string;
  note_content: string;
  tags: string[];
}

/**
 * Substitutes template variables in a prompt string
 * @param template - The prompt template with {variable} placeholders
 * @param variables - The values to substitute
 * @returns The processed prompt with variables replaced
 */
export function substitutePromptVariables(
  template: string,
  variables: PromptVariables
): string {
  let result = template;

  // Replace {note_title}
  result = result.replace(/{note_title}/g, variables.note_title || '');

  // Replace {note_content}
  result = result.replace(/{note_content}/g, variables.note_content || '');

  // Replace {tags} - join with commas
  const tagsString = variables.tags.length > 0
    ? variables.tags.map(tag => `#${tag}`).join(', ')
    : 'none';
  result = result.replace(/{tags}/g, tagsString);

  return result;
}

/**
 * Validates that a template doesn't contain unknown variables
 * @param template - The template to validate
 * @returns Array of unknown variable names, empty if valid
 */
export function validateTemplate(template: string): string[] {
  const knownVariables = ['note_title', 'note_content', 'tags'];
  const variablePattern = /{([^}]+)}/g;
  const unknownVariables: string[] = [];

  let match;
  while ((match = variablePattern.exec(template)) !== null) {
    const variableName = match[1];
    if (!knownVariables.includes(variableName)) {
      if (!unknownVariables.includes(variableName)) {
        unknownVariables.push(variableName);
      }
    }
  }

  return unknownVariables;
}

/**
 * Extracts all variables used in a template
 * @param template - The template to analyze
 * @returns Array of variable names found in the template
 */
export function extractVariables(template: string): string[] {
  const variablePattern = /{([^}]+)}/g;
  const variables: string[] = [];

  let match;
  while ((match = variablePattern.exec(template)) !== null) {
    const variableName = match[1];
    if (!variables.includes(variableName)) {
      variables.push(variableName);
    }
  }

  return variables;
}

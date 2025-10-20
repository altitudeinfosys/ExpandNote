/**
 * Shared validation utilities for authentication forms
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns true if email is valid format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validates password against all requirements
 * @param password - Password to validate
 * @returns Object with validation status and list of errors
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (/\s/.test(password)) {
    errors.push('Password cannot contain spaces');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Must contain at least one number');
  }

  if (!/[^a-zA-Z0-9\s]/.test(password)) {
    errors.push('Must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gets real-time password validation errors for display
 * Only returns errors for requirements that have been attempted
 * @param password - Password to validate
 * @returns Array of error messages for current password state
 */
export function getPasswordErrors(password: string): string[] {
  if (password.length === 0) {
    return [];
  }

  const errors: string[] = [];

  if (password.length > 0 && password.length < 8) {
    errors.push('At least 8 characters');
  }

  if (password.length > 0 && /\s/.test(password)) {
    errors.push('No spaces allowed');
  }

  if (password.length > 0 && !/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  }

  if (password.length > 0 && !/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  }

  if (password.length > 0 && !/\d/.test(password)) {
    errors.push('One number');
  }

  if (password.length > 0 && !/[^a-zA-Z0-9\s]/.test(password)) {
    errors.push('One special character');
  }

  return errors;
}

/**
 * Shared validation utilities for authentication forms
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Explicit set of allowed special characters for password validation
// Using a comprehensive list to show users what's accepted
export const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
// Simpler and more reliable - matches any non-alphanumeric character except spaces
// This is more permissive than the explicit list above, which is shown to users for guidance
export const SPECIAL_CHARS_REGEX = /[^a-zA-Z0-9\s]/;

// Password constraints
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128; // Prevent bcrypt DoS attacks

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

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
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

  if (!SPECIAL_CHARS_REGEX.test(password)) {
    errors.push(`Must contain at least one special character (${SPECIAL_CHARS})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gets password requirements status for real-time feedback display
 * @param password - Password to validate
 * @returns Array of requirement objects with met status
 */
export interface PasswordRequirement {
  text: string;
  met: boolean;
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      text: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      text: `No more than ${PASSWORD_MAX_LENGTH} characters`,
      met: password.length <= PASSWORD_MAX_LENGTH,
    },
    {
      text: 'No spaces',
      met: password.length === 0 || !/\s/.test(password),
    },
    {
      text: 'One uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      text: 'One lowercase letter (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      text: 'One number (0-9)',
      met: /\d/.test(password),
    },
    {
      text: `One special character (${SPECIAL_CHARS})`,
      met: SPECIAL_CHARS_REGEX.test(password),
    },
  ];
}

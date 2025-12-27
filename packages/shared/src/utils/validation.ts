/**
 * Validation utilities - shared between web and mobile
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Explicit set of allowed special characters for password validation
export const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
// Matches any non-alphanumeric character except spaces
export const SPECIAL_CHARS_REGEX = /[^a-zA-Z0-9\s]/;

// Password constraints
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validates password against all requirements
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

export interface PasswordRequirement {
  text: string;
  met: boolean;
}

/**
 * Gets password requirements status for real-time feedback display
 */
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

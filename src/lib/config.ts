/**
 * Configuration and environment variable validation
 * Ensures all required environment variables are present at runtime
 */

function getRequiredEnvVar(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please add it to your .env.local file or Vercel environment variables.\n` +
      `See VERCEL_DEPLOYMENT.md for setup instructions.`
    );
  }

  return value;
}

function validateEnvVars() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n` +
      missing.map(key => `  - ${key}`).join('\n') +
      `\n\nPlease add them to your .env.local file or Vercel environment variables.` +
      `\nSee VERCEL_DEPLOYMENT.md for setup instructions.`
    );
  }
}

// Validate on module load (skip during build phase)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  // Only validate during development, not during build
  // In production/build, validation happens at runtime when actually needed
  try {
    validateEnvVars();
  } catch (error) {
    // During build, env vars might not be available yet
    // Just log a warning instead of throwing
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.warn('Environment validation warning:', error);
    }
  }
}

export const config = {
  supabase: {
    url: getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  },
} as const;

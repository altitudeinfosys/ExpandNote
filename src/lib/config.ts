/**
 * Configuration and environment variable validation
 * Uses lazy evaluation to avoid module load errors
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

// Use getters for lazy evaluation - env vars accessed only when needed
export const config = {
  supabase: {
    get url() {
      return getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    },
    get anonKey() {
      return getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    },
  },
} as const;

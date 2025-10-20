/**
 * Configuration and environment variable validation
 *
 * IMPORTANT: For client-side code, Next.js inlines NEXT_PUBLIC_* env vars at build time.
 * We must reference process.env.VARIABLE_NAME directly (not destructured) for this to work.
 */

// Direct references to env vars - Next.js will inline these at build time
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate on module load
if (!SUPABASE_URL) {
  throw new Error(
    'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL\n' +
    'Please add it to your .env.local file or deployment environment variables.'
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
    'Please add it to your .env.local file or deployment environment variables.'
  );
}

export const config = {
  supabase: {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  },
} as const;

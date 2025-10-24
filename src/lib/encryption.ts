/**
 * API Key Encryption Utilities
 *
 * Provides functions to encrypt and decrypt API keys using PostgreSQL's pgcrypto
 * extension with AES-256 encryption.
 *
 * Security:
 * - Encryption key stored in environment variable (never committed to git)
 * - Keys encrypted at rest in database
 * - Decryption only happens server-side
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get the encryption key from environment
 * Throws error if not configured
 */
function getEncryptionKey(): string {
  const key = process.env.API_KEY_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'API_KEY_ENCRYPTION_KEY environment variable is not configured. ' +
      'Please set it to a secure random string (minimum 32 characters).'
    );
  }

  if (key.length < 32) {
    throw new Error(
      'API_KEY_ENCRYPTION_KEY must be at least 32 characters long for security.'
    );
  }

  return key;
}

/**
 * Encrypt an API key using PostgreSQL's pgcrypto
 *
 * @param apiKey - The plaintext API key to encrypt
 * @returns Encrypted key as base64 string, or null if input is null/empty
 */
export async function encryptApiKey(apiKey: string | null): Promise<string | null> {
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  try {
    const supabase = await createClient();
    const encryptionKey = getEncryptionKey();

    const { data, error } = await supabase
      .rpc('encrypt_api_key', {
        key_value: apiKey,
        encryption_key: encryptionKey
      });

    if (error) {
      console.error('Error encrypting API key:', error);
      throw new Error('Failed to encrypt API key');
    }

    return data as string;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt an API key using PostgreSQL's pgcrypto
 *
 * @param encryptedKey - The encrypted key (base64 string)
 * @returns Decrypted plaintext key, or null if input is null/empty or decryption fails
 */
export async function decryptApiKey(encryptedKey: string | null): Promise<string | null> {
  if (!encryptedKey || encryptedKey.trim() === '') {
    return null;
  }

  try {
    const supabase = await createClient();
    const encryptionKey = getEncryptionKey();

    const { data, error } = await supabase
      .rpc('decrypt_api_key', {
        encrypted_value: encryptedKey,
        encryption_key: encryptionKey
      });

    if (error) {
      console.error('Error decrypting API key:', error);
      // Return null instead of throwing - key might be corrupted
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return null instead of throwing to handle gracefully
    return null;
  }
}

/**
 * Mask an API key for display purposes
 * Shows first 3 and last 4 characters, masks the rest
 *
 * @param apiKey - The plaintext API key
 * @returns Masked version (e.g., "sk-...abc123")
 */
export function maskApiKey(apiKey: string | null): string {
  if (!apiKey || apiKey.length < 8) {
    return '';
  }

  const start = apiKey.substring(0, 3);
  const end = apiKey.substring(apiKey.length - 4);

  return `${start}...${end}`;
}

/**
 * Check if encryption is properly configured
 *
 * @returns true if encryption key is set and valid
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

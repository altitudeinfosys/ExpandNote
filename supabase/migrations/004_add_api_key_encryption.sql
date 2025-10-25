-- Migration: Add API Key Encryption
-- Description: Implements AES-256 encryption for OpenAI and Claude API keys
-- using PostgreSQL pgcrypto extension as per PRD security requirements

-- Enable pgcrypto extension for encryption/decryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns to user_settings table
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS openai_api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS claude_api_key_encrypted TEXT;

-- Create function to encrypt API keys
-- Uses AES-256 encryption with a configurable encryption key
-- The encryption key should be set via app.settings.encryption_key
CREATE OR REPLACE FUNCTION encrypt_api_key(key_value TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
DECLARE
  encrypted_bytes BYTEA;
BEGIN
  IF key_value IS NULL OR key_value = '' THEN
    RETURN NULL;
  END IF;

  -- Encrypt using AES-256
  encrypted_bytes := pgp_sym_encrypt(key_value, encryption_key, 'cipher-algo=aes256');

  -- Return as base64-encoded string for easier storage
  RETURN encode(encrypted_bytes, 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrypt API keys
-- Returns NULL if decryption fails or key is invalid
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_value TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
DECLARE
  encrypted_bytes BYTEA;
  decrypted_text TEXT;
BEGIN
  IF encrypted_value IS NULL OR encrypted_value = '' THEN
    RETURN NULL;
  END IF;

  -- Decode from base64
  encrypted_bytes := decode(encrypted_value, 'base64');

  -- Decrypt and return
  decrypted_text := pgp_sym_decrypt(encrypted_bytes, encryption_key);
  RETURN decrypted_text;

EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (wrong key, corrupted data, etc.)
    RAISE WARNING 'Failed to decrypt API key: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION encrypt_api_key(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_api_key(TEXT, TEXT) TO authenticated;

-- Migrate existing plaintext keys to encrypted format
-- NOTE: This will be handled by the API layer when keys are first accessed
-- to avoid issues with the encryption key not being available during migration

-- Add comments for documentation
COMMENT ON COLUMN user_settings.openai_api_key_encrypted IS 'Encrypted OpenAI API key using AES-256';
COMMENT ON COLUMN user_settings.claude_api_key_encrypted IS 'Encrypted Claude API key using AES-256';
COMMENT ON FUNCTION encrypt_api_key(TEXT, TEXT) IS 'Encrypts an API key using AES-256 encryption';
COMMENT ON FUNCTION decrypt_api_key(TEXT, TEXT) IS 'Decrypts an API key encrypted with encrypt_api_key()';

-- Note: The old plaintext columns (openai_api_key, claude_api_key) are kept
-- temporarily for backward compatibility. They will be dropped in a future migration
-- after verifying all keys are properly encrypted.

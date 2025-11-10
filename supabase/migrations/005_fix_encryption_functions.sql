-- Fix: Re-create encryption functions with proper parameter handling
-- Issue: Supabase RPC with named parameters requires specific handling

-- Drop existing functions first
DROP FUNCTION IF EXISTS encrypt_api_key(TEXT, TEXT);
DROP FUNCTION IF EXISTS decrypt_api_key(TEXT, TEXT);

-- Create function to encrypt API keys
-- Uses AES-256 encryption with a configurable encryption key
CREATE OR REPLACE FUNCTION public.encrypt_api_key(encryption_key TEXT, key_value TEXT)
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
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encryption_key TEXT, encrypted_value TEXT)
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
GRANT EXECUTE ON FUNCTION public.encrypt_api_key(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_api_key(TEXT, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.encrypt_api_key(TEXT, TEXT) IS 'Encrypts an API key using AES-256 encryption. Parameters: encryption_key, key_value';
COMMENT ON FUNCTION public.decrypt_api_key(TEXT, TEXT) IS 'Decrypts an API key encrypted with encrypt_api_key(). Parameters: encryption_key, encrypted_value';

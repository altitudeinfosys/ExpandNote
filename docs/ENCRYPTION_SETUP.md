# API Key Encryption Setup Guide

This guide explains how to set up and use the API key encryption system for ExpandNote.

## Overview

ExpandNote encrypts all user API keys (OpenAI and Claude) at rest using AES-256 encryption via PostgreSQL's pgcrypto extension. This ensures that even if the database is compromised, API keys remain secure.

## Initial Setup

### 1. Generate Encryption Key

Generate a secure random encryption key (32+ characters):

```bash
openssl rand -hex 32
```

### 2. Add to Environment

Add the encryption key to your `.env.local` file (NEVER commit this to git):

```bash
# .env.local
API_KEY_ENCRYPTION_KEY=your-generated-key-here
```

For production (Vercel), add the environment variable in:
- Vercel Dashboard → Your Project → Settings → Environment Variables

### 3. Run Database Migration

Apply the encryption migration to your Supabase database:

```bash
# If using Supabase CLI
npx supabase db push

# Or run the migration manually in Supabase SQL Editor
# File: supabase/migrations/004_add_api_key_encryption.sql
```

This migration:
- Enables the `pgcrypto` extension
- Adds encrypted columns (`openai_api_key_encrypted`, `claude_api_key_encrypted`)
- Creates encryption/decryption functions
- Grants necessary permissions

### 4. Verify Setup

Check that encryption is working:

1. Go to Settings → AI Configuration
2. Enter a test API key
3. Click "Save Settings"
4. Check Supabase database:
   ```sql
   SELECT
     openai_api_key_encrypted IS NOT NULL as openai_encrypted,
     claude_api_key_encrypted IS NOT NULL as claude_encrypted,
     openai_api_key IS NULL as openai_plaintext_cleared,
     claude_api_key IS NULL as claude_plaintext_cleared
   FROM user_settings
   LIMIT 1;
   ```

Expected result: encrypted columns should have data, plaintext columns should be NULL.

## How It Works

### Encryption Flow (Saving Keys)

1. User enters API key in Settings page
2. API route receives plaintext key
3. Backend calls `encryptApiKey()` function
4. PostgreSQL `pgcrypto` encrypts with AES-256
5. Encrypted string (base64) stored in database
6. Plaintext key is NEVER stored

### Decryption Flow (Reading Keys)

1. API route queries `user_settings` table
2. Backend calls `decryptApiKey()` for encrypted columns
3. PostgreSQL `pgcrypto` decrypts using encryption key
4. Plaintext key returned ONLY to authorized backend code
5. Frontend receives either:
   - Full plaintext (only when fetching for editing)
   - Masked version (`sk-...abc123`) after saving

### Legacy Key Migration

If plaintext keys exist in the database (from before encryption was implemented), they are automatically migrated:

1. On first GET request, detect plaintext keys
2. Encrypt them in background
3. Store encrypted version
4. Clear plaintext column

## Security Features

### ✅ Implemented

- **AES-256 Encryption**: Industry-standard encryption algorithm
- **Encryption at Rest**: Keys encrypted before storage
- **Secure Key Management**: Encryption key in environment variable
- **No Client-Side Decryption**: Keys only decrypted server-side
- **Automatic Migration**: Legacy plaintext keys upgraded automatically
- **RLS Policies**: Users can only access their own keys
- **Masked Display**: UI shows masked keys after saving

### 🔒 Best Practices

1. **Never Log Decrypted Keys**: Logging code masks keys
2. **Never Commit Encryption Key**: Key only in `.env.local` (gitignored)
3. **Rotate Keys Periodically**: Plan for key rotation (requires re-encryption)
4. **Limit Decryption**: Only decrypt when absolutely necessary
5. **Audit Access**: Monitor who accesses encryption functions

## API Usage

### Encrypt an API Key

```typescript
import { encryptApiKey } from '@/lib/encryption';

const encrypted = await encryptApiKey('sk-abc123...');
// Returns: base64-encoded encrypted string
```

### Decrypt an API Key

```typescript
import { decryptApiKey } from '@/lib/encryption';

const plaintext = await decryptApiKey(encryptedString);
// Returns: 'sk-abc123...' or null if decryption fails
```

### Mask an API Key

```typescript
import { maskApiKey } from '@/lib/encryption';

const masked = maskApiKey('sk-abc123xyz789');
// Returns: 'sk-...x789'
```

## Database Schema

### Columns

```sql
-- Encrypted columns (active)
openai_api_key_encrypted TEXT      -- Base64-encoded encrypted key
claude_api_key_encrypted TEXT      -- Base64-encoded encrypted key

-- Legacy columns (deprecated, kept for migration)
openai_api_key TEXT                -- Will be removed in future migration
claude_api_key TEXT                -- Will be removed in future migration
```

### Functions

```sql
-- Encrypt a plaintext key
encrypt_api_key(key_value TEXT, encryption_key TEXT) RETURNS TEXT

-- Decrypt an encrypted key
decrypt_api_key(encrypted_value TEXT, encryption_key TEXT) RETURNS TEXT
```

## Troubleshooting

### Error: "API_KEY_ENCRYPTION_KEY environment variable is not configured"

**Solution**: Add the encryption key to your `.env.local` file:
```bash
API_KEY_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### Error: "Failed to decrypt API key"

**Possible causes**:
1. Wrong encryption key in environment
2. Corrupted encrypted data
3. Key encrypted with different encryption key

**Solution**:
1. Verify `API_KEY_ENCRYPTION_KEY` is correct
2. Check database for corrupted data
3. Re-save the API key in Settings

### Keys Not Encrypting

**Check**:
1. Migration applied? Check `supabase/migrations/004_add_api_key_encryption.sql`
2. Extension enabled? Run `SELECT * FROM pg_extension WHERE extname = 'pgcrypto';`
3. Functions exist? Check `\df encrypt_api_key` in psql

## Key Rotation

If you need to rotate the encryption key:

1. **Generate new key**:
   ```bash
   openssl rand -hex 32
   ```

2. **Decrypt all keys with old key and re-encrypt with new key**:
   ```sql
   -- This is a complex operation - contact developers for assistance
   -- Requires reading all encrypted keys, decrypting with old key,
   -- re-encrypting with new key, and updating database
   ```

3. **Update environment variable** with new key

4. **Verify all keys still work**

⚠️ **Key rotation is a critical operation. Test thoroughly in staging first.**

## Performance

- **Encryption**: ~1-2ms per key
- **Decryption**: ~1-2ms per key
- **Impact**: Negligible for user-facing operations
- **Implementation**: Native PostgreSQL C functions (very fast)

## Compliance

This implementation helps meet:
- **GDPR**: User data encrypted at rest
- **SOC 2**: Encryption controls for sensitive data
- **PCI DSS**: Encryption of sensitive authentication data

## References

- [PostgreSQL pgcrypto Documentation](https://www.postgresql.org/docs/current/pgcrypto.html)
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [ExpandNote API Key Encryption Plan](./API_KEY_ENCRYPTION.md)

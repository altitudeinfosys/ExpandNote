# API Key Encryption Implementation Plan

## Overview
This document outlines the implementation plan for encrypting user API keys (OpenAI and Claude) at rest, as required by the PRD security specifications.

## Security Requirement
**From ExpandNote PRD:**
> "All user API keys encrypted at rest (AES-256)"

## Current State (SECURITY ISSUE)
- ❌ API keys stored in plaintext in `user_settings` table
- ❌ Keys are transmitted to/from API without encryption beyond HTTPS
- ⚠️ UI falsely claims "Your API key is encrypted and stored securely"

## Risk Assessment
**Severity:** CRITICAL
**Impact:** If database is compromised, all user API keys are exposed
**Likelihood:** Low (Supabase has good security), but impact is catastrophic
**Recommendation:** Must fix before production deployment

## Implementation Approaches

### Option 1: Database-Level Encryption with pgcrypto (Recommended)
Use PostgreSQL's `pgcrypto` extension for transparent encryption/decryption.

**Pros:**
- Encryption happens at database layer
- Automatic encryption/decryption with functions
- Keys never stored in plaintext
- Simple to implement

**Cons:**
- Encryption key must be stored securely (use Supabase Vault)
- Requires migration for existing data

**Implementation:**
```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store encryption key in Supabase Vault
-- (or use environment variable for self-hosted)
-- Vault key: 'api_key_encryption_key'

-- Modify user_settings table to use encrypted columns
ALTER TABLE user_settings
  ADD COLUMN openai_api_key_encrypted BYTEA,
  ADD COLUMN claude_api_key_encrypted BYTEA;

-- Create functions for encryption/decryption
CREATE OR REPLACE FUNCTION encrypt_api_key(key TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(
    key,
    current_setting('app.settings.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key BYTEA)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    encrypted_key,
    current_setting('app.settings.encryption_key')
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL; -- Return NULL if decryption fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**API Route Changes:**
```typescript
// src/app/api/settings/route.ts

// When saving keys
const { data, error } = await supabase
  .rpc('save_encrypted_api_keys', {
    p_openai_key: openai_api_key,
    p_claude_key: claude_api_key
  });

// When retrieving keys
const { data, error } = await supabase
  .rpc('get_decrypted_api_keys');
```

### Option 2: Application-Level Encryption
Encrypt keys in Node.js before storing in database.

**Pros:**
- More control over encryption implementation
- No database function dependencies
- Can use different encryption libraries

**Cons:**
- Encryption key management is complex
- Must be careful not to log decrypted keys
- More code to maintain

**Implementation:**
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY!; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encryptApiKey(key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(key, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return IV + authTag + encrypted data
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decryptApiKey(encrypted: string): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Option 3: Supabase Vault (Best for Production)
Use Supabase's built-in secrets management.

**Pros:**
- Purpose-built for storing secrets
- Automatic encryption with Supabase's master key
- RLS policies apply
- Audit logging available

**Cons:**
- Requires Supabase Pro plan
- More complex setup
- May have performance implications

**Implementation:**
```sql
-- Create secrets table using Vault
-- Each user's API keys stored as separate vault entries

-- Insert encrypted key
SELECT vault.create_secret(
  'openai-api-key-' || auth.uid()::text,
  'sk-...',
  'OpenAI API key for user'
);

-- Retrieve decrypted key
SELECT decrypted_secret
FROM vault.decrypted_secrets
WHERE name = 'openai-api-key-' || auth.uid()::text;
```

## Recommended Approach: Option 1 (pgcrypto)

### Rationale
1. **Balanced Approach:** Not too complex, not too simple
2. **Supabase Native:** Works well with Supabase's PostgreSQL
3. **Transparent:** Encryption/decryption in database layer
4. **Performant:** Native C implementation of crypto functions

## Implementation Steps

### Step 1: Enable pgcrypto Extension
```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Step 2: Add Encryption Key to Environment
```bash
# Generate a strong encryption key (do this once)
openssl rand -hex 32

# Add to .env.local (NEVER commit this)
API_KEY_ENCRYPTION_KEY=<generated-key>

# Add to Supabase Dashboard > Settings > Vault
# Or use Supabase configuration for self-hosted
```

### Step 3: Create Database Functions
Create SQL functions for encrypting/decrypting (see Option 1 code above).

### Step 4: Modify API Routes
Update `/api/settings` route to use encryption functions.

```typescript
// src/app/api/settings/route.ts

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  // Validate encryption key is configured
  if (!process.env.API_KEY_ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }

  // Store encrypted keys
  const updates: Record<string, unknown> = {};

  if (body.openai_api_key !== undefined) {
    // Call database function to encrypt
    const { data: encrypted } = await supabase.rpc('encrypt_api_key', {
      key_value: body.openai_api_key
    });
    updates.openai_api_key_encrypted = encrypted;
  }

  if (body.claude_api_key !== undefined) {
    const { data: encrypted } = await supabase.rpc('encrypt_api_key', {
      key_value: body.claude_api_key
    });
    updates.claude_api_key_encrypted = encrypted;
  }

  // Update database
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(updates)
    .select()
    .single();

  if (error) throw error;

  // Return without decrypted keys (security)
  return NextResponse.json({
    ...data,
    openai_api_key: data.openai_api_key_encrypted ? '••••••••' : null,
    claude_api_key: data.claude_api_key_encrypted ? '••••••••' : null
  });
}

export async function GET() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .single();

  // Decrypt keys server-side
  let openaiKey = null;
  let claudeKey = null;

  if (data?.openai_api_key_encrypted) {
    const { data: decrypted } = await supabase.rpc('decrypt_api_key', {
      encrypted_value: data.openai_api_key_encrypted
    });
    openaiKey = decrypted;
  }

  if (data?.claude_api_key_encrypted) {
    const { data: decrypted } = await supabase.rpc('decrypt_api_key', {
      encrypted_value: data.claude_api_key_encrypted
    });
    claudeKey = decrypted;
  }

  return NextResponse.json({
    ...data,
    openai_api_key: openaiKey,
    claude_api_key: claudeKey
  });
}
```

### Step 5: Migration for Existing Data
```sql
-- Migrate existing plaintext keys to encrypted
UPDATE user_settings
SET
  openai_api_key_encrypted = encrypt_api_key(openai_api_key),
  claude_api_key_encrypted = encrypt_api_key(claude_api_key)
WHERE openai_api_key IS NOT NULL OR claude_api_key IS NOT NULL;

-- Drop plaintext columns (after verifying migration)
-- ALTER TABLE user_settings
-- DROP COLUMN openai_api_key,
-- DROP COLUMN claude_api_key;
```

### Step 6: Update Database Schema
```sql
-- src/lib/supabase/migrations/XXXXX_encrypt_api_keys.sql

-- Add encrypted columns
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS openai_api_key_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS claude_api_key_encrypted BYTEA;

-- Create encryption functions (as shown in Option 1)

-- Migrate existing data
UPDATE user_settings
SET
  openai_api_key_encrypted = encrypt_api_key(openai_api_key)
WHERE openai_api_key IS NOT NULL;

UPDATE user_settings
SET
  claude_api_key_encrypted = encrypt_api_key(claude_api_key)
WHERE claude_api_key IS NOT NULL;

-- Drop plaintext columns
ALTER TABLE user_settings
  DROP COLUMN openai_api_key,
  DROP COLUMN claude_api_key;
```

### Step 7: Update UI
Update form to show masking/indication that keys are encrypted.

```typescript
// src/app/settings/page.tsx

// When displaying saved keys, show masked version
<input
  type="password"
  value={openaiKey || ''}
  onChange={(e) => setOpenaiKey(e.target.value)}
  placeholder={settings?.openai_api_key_encrypted ? '••••••••••••' : 'sk-...'}
  className="..."
/>
```

## Security Considerations

### Key Management
1. **Encryption Key Storage:**
   - NEVER commit encryption key to git
   - Use environment variables or Supabase Vault
   - Rotate keys periodically (requires re-encryption)

2. **Key Access:**
   - Only API routes should access decrypted keys
   - Never return decrypted keys to frontend unless explicitly requested
   - Consider returning masked keys by default (sk-...••••)

3. **Logging:**
   - Never log decrypted API keys
   - Log only masked versions for debugging
   - Audit access to decryption functions

### Additional Protections
1. **Rate Limiting:** Limit decryption calls to prevent brute force
2. **Audit Logging:** Track when keys are accessed/modified
3. **Key Rotation:** Allow users to rotate their encryption (re-encrypt with new key)
4. **Backup Security:** Ensure database backups are also encrypted

## Testing Plan

### Unit Tests
```typescript
describe('API Key Encryption', () => {
  it('should encrypt keys before storage', async () => {
    // Test encryption function
  });

  it('should decrypt keys for authorized users only', async () => {
    // Test RLS policies
  });

  it('should handle invalid encryption keys gracefully', async () => {
    // Test error handling
  });

  it('should mask keys in API responses', async () => {
    // Test response masking
  });
});
```

### Integration Tests
1. Save API key → Verify it's encrypted in database
2. Retrieve API key → Verify it's decrypted correctly
3. Unauthorized access → Verify RLS blocks access
4. Invalid key → Verify graceful error handling

## Performance Impact
- **Minimal:** pgcrypto is implemented in C, very fast
- **Encryption:** ~0.1-1ms per operation
- **Negligible** for user-facing operations

## Rollback Plan
If issues arise:
1. Keep old plaintext columns temporarily
2. Test encryption thoroughly before dropping
3. Can revert by dropping encrypted columns

## Timeline
- **Step 1-3:** 1 hour (setup database functions)
- **Step 4-5:** 2 hours (update API routes and test)
- **Step 6-7:** 1 hour (migration and UI updates)
- **Total:** 4-5 hours

## Status
- [ ] Decision made on approach
- [ ] pgcrypto extension enabled
- [ ] Encryption key generated and stored
- [ ] Database functions created
- [ ] API routes updated
- [ ] Migration created and tested
- [ ] UI updated
- [ ] Tests written
- [ ] Security review completed
- [ ] Documentation updated

## References
- [PostgreSQL pgcrypto Documentation](https://www.postgresql.org/docs/current/pgcrypto.html)
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)

## Conclusion
API key encryption is a **critical security requirement** that should be implemented before merging to production. The recommended approach using pgcrypto provides a good balance of security, performance, and implementation complexity.

**Recommendation: Implement now, not later.**

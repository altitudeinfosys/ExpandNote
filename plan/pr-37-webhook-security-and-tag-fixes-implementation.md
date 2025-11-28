# PR #37 - Webhook Security and Tag Association Fixes

## Review Summary

Claude reviewed PR #37 and identified **3 critical blockers** that must be fixed before merging:

1. **Security Vulnerability**: Missing webhook signature verification (CRITICAL)
2. **Broken Feature**: Tag extraction works but tags are never created/associated (CRITICAL)
3. **Missing Feature**: No idempotency handling - duplicate emails create duplicate notes (CRITICAL)

Additionally, there are medium and low priority issues to address.

## Analysis

The review feedback is **100% valid and appropriate** for our production codebase:

✅ **Webhook signature verification** is essential security - without it, anyone can forge requests
✅ **Tag association** is a broken feature - we extract tags from subject but never save them
✅ **Idempotency** is critical - Resend can deliver webhooks multiple times, creating duplicates

The suggestions align with:
- Security best practices (OWASP Webhook Security)
- Resend's official documentation
- Our existing database schema (note_tags table exists but isn't used)

## Implementation Plan

### CRITICAL FIX #1: Webhook Signature Verification

**Complexity:** Medium
**Effort:** 30 minutes
**Priority:** P0 (Security)

**Files to modify:**
- `src/app/api/email/webhook/route.ts`

**Tasks:**
1. Add `RESEND_WEBHOOK_SECRET` to environment configuration
   - Update `src/lib/config.ts` to include webhook secret
   - Add to `.env.local` and `.env.local.example`

2. Implement signature verification
   - Extract svix headers: `svix-id`, `svix-timestamp`, `svix-signature`
   - Use Resend SDK's `resend.webhooks.verify()` method
   - Return 401 if verification fails

3. Add error handling for missing/invalid signatures

**Code changes:**
```typescript
// In src/lib/config.ts
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

export const config = {
  // ...
  resend: {
    webhookSecret: RESEND_WEBHOOK_SECRET,
  },
}

// In src/app/api/email/webhook/route.ts
export async function POST(request: NextRequest) {
  // Verify webhook signature
  const signature = request.headers.get('svix-signature');
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');

  if (!signature || !svixId || !svixTimestamp) {
    return NextResponse.json(
      { error: 'Missing webhook signature headers' },
      { status: 401 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const payload = await request.text();

  try {
    resend.webhooks.verify({
      payload,
      headers: {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': signature,
      },
      webhookSecret: config.resend.webhookSecret!,
    });
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    );
  }

  const event = JSON.parse(payload);
  // ... rest of webhook logic
}
```

**Testing:**
- Test with valid Resend webhook signature
- Test with missing headers (should return 401)
- Test with invalid signature (should return 401)

---

### CRITICAL FIX #2: Tag Association Implementation

**Complexity:** Medium
**Effort:** 45 minutes
**Priority:** P0 (Broken Feature)

**Files to modify:**
- `src/app/api/email/webhook/route.ts`

**Tasks:**
1. After note creation, create tags and note_tags associations
2. Handle existing tags (don't duplicate)
3. Create new tags if they don't exist
4. Associate all tags with the note via note_tags table

**Code changes:**
```typescript
// After note is created successfully
if (createError) {
  // ... error handling
}

// Process tags extracted from subject
if (tags.length > 0) {
  // Get or create tags
  for (const tagName of tags) {
    // Check if tag exists for this user
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id')
      .eq('user_id', userSettings.user_id)
      .eq('name', tagName)
      .maybeSingle();

    let tagId: string;

    if (existingTag) {
      tagId = existingTag.id;
    } else {
      // Create new tag
      const { data: newTag, error: tagError } = await supabase
        .from('tags')
        .insert({
          user_id: userSettings.user_id,
          name: tagName,
        })
        .select('id')
        .single();

      if (tagError) {
        console.error(`Failed to create tag ${tagName}:`, tagError);
        continue; // Skip this tag but continue with others
      }

      tagId = newTag.id;
    }

    // Create note_tags association
    const { error: associationError } = await supabase
      .from('note_tags')
      .insert({
        note_id: note.id,
        tag_id: tagId,
      });

    if (associationError) {
      console.error(`Failed to associate tag ${tagName}:`, associationError);
    }
  }
}

return NextResponse.json({
  success: true,
  note_id: note.id,
  tags_created: tags.length,
  message: 'Note created successfully',
});
```

**Testing:**
- Send email with tags in subject: `Test note #work #important`
- Verify tags are created in `tags` table
- Verify associations created in `note_tags` table
- Verify existing tags are reused (not duplicated)
- Verify notes appear with correct tags in UI

---

### CRITICAL FIX #3: Idempotency Handling

**Complexity:** Low
**Effort:** 30 minutes
**Priority:** P0 (Prevent Duplicates)

**Files to modify:**
- Add new migration for `processed_emails` table
- `src/app/api/email/webhook/route.ts`

**Tasks:**
1. Create `processed_emails` table to track processed email_ids
2. Check if email_id already processed before creating note
3. Return success (200) if already processed (idempotent)

**Database migration:**
```sql
-- Create table to track processed emails for idempotency
CREATE TABLE IF NOT EXISTS processed_emails (
  email_id TEXT PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_processed_emails_note_id ON processed_emails(note_id);

-- Enable RLS
ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies (service role can access all)
CREATE POLICY "Service role can manage processed emails"
ON processed_emails FOR ALL
USING (true);
```

**Code changes:**
```typescript
// Early in the webhook handler, after event validation
const { email_id, from, to, subject } = event.data;

// Check if already processed (idempotency)
const { data: alreadyProcessed } = await supabase
  .from('processed_emails')
  .select('note_id')
  .eq('email_id', email_id)
  .maybeSingle();

if (alreadyProcessed) {
  console.log(`Email ${email_id} already processed, returning success`);
  return NextResponse.json({
    success: true,
    note_id: alreadyProcessed.note_id,
    message: 'Email already processed (idempotent)',
  });
}

// ... rest of processing logic ...

// After note is created successfully, record it
await supabase
  .from('processed_emails')
  .insert({
    email_id: email_id,
    note_id: note.id,
  });
```

**Testing:**
- Trigger webhook twice with same email_id
- Verify only one note is created
- Verify second request returns 200 with same note_id
- Verify processed_emails table has one entry

---

## Medium Priority Fixes

### 4. Add Structured Logging

**Complexity:** Low
**Effort:** 15 minutes

**Changes:**
- Add detailed logging for debugging
- Log all webhook events received
- Log all errors with context

### 5. Fix Token Casing Consistency

**Complexity:** Low
**Effort:** 10 minutes

**Changes:**
- Update `generate_email_token()` to always return lowercase
- Document token format in code comments

---

## Testing Requirements

### Unit Tests
- [ ] Test webhook signature verification (valid/invalid/missing)
- [ ] Test tag creation and association
- [ ] Test idempotency handling
- [ ] Test email parser with various formats

### Integration Tests
- [ ] End-to-end webhook flow with real Resend webhooks
- [ ] Verify notes created with correct content
- [ ] Verify tags extracted and associated correctly
- [ ] Verify duplicate prevention works

### Manual Testing
- [ ] Send email to user's address
- [ ] Verify note appears in UI
- [ ] Verify tags are applied
- [ ] Send duplicate - verify no duplicate note created
- [ ] Test with HTML email content
- [ ] Test with plain text email

---

## Environment Variables Needed

Add to `.env.local` and production (Vercel):

```bash
# NEW: Webhook signature secret (get from Resend webhook settings)
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Deployment Checklist

Before merging:
- [ ] All critical fixes implemented
- [ ] Tests passing
- [ ] Database migration applied
- [ ] Environment variables added
- [ ] Code review approved
- [ ] Tested on Vercel preview deployment

After merging:
- [ ] Apply database migration to production
- [ ] Add RESEND_WEBHOOK_SECRET to Vercel
- [ ] Verify webhook signature verification works in production
- [ ] Send test email and verify end-to-end flow

---

## Risks & Considerations

**Low Risk:**
- Changes are isolated to webhook endpoint
- Database migrations are idempotent
- Existing functionality not affected

**Mitigation:**
- Test thoroughly on preview deployment
- Monitor error logs after deployment
- Keep rollback plan ready

---

## Estimated Total Effort

**Critical Fixes:** 1.75 hours
**Medium Priority:** 0.5 hours
**Testing:** 1 hour
**Total:** ~3.25 hours

---

## Recommendation

**DO NOT MERGE PR #37** until these critical fixes are implemented. The current implementation:
- ❌ Is vulnerable to unauthorized webhook requests
- ❌ Has broken tag functionality
- ❌ Will create duplicate notes on webhook retries

**NEXT STEPS:**
1. Implement the 3 critical fixes above
2. Test thoroughly
3. Request re-review
4. Then merge to production

The architectural foundation is solid - these are important but straightforward fixes to make it production-ready.

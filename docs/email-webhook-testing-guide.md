# Email Webhook Testing Guide

## Overview

This document provides comprehensive manual testing procedures for the email-to-note webhook endpoint until automated tests are implemented.

**Endpoint:** `POST /api/email/webhook`
**Purpose:** Receives inbound emails from Resend and creates notes
**Status:** ⚠️ Automated tests pending - manual verification required

---

## Prerequisites

1. **Resend Account Setup:**
   - Domain verified in Resend
   - Inbound email configured
   - Webhook configured pointing to your deployment
   - Webhook secret configured

2. **Environment Variables:**
   ```bash
   RESEND_API_KEY=re_xxx
   RESEND_EMAIL_DOMAIN=expandnote.com
   RESEND_WEBHOOK_SECRET=whsec_xxx  # Required for production
   SUPABASE_SERVICE_ROLE_KEY=xxx
   ```

3. **User Setup:**
   - User account created
   - Email-to-note feature enabled
   - Email token generated

---

## Test Scenarios

### 1. Security Tests

#### 1.1 Valid Webhook Signature (Production)
**Purpose:** Verify signature verification works correctly

**Steps:**
1. Set `NODE_ENV=production`
2. Configure `RESEND_WEBHOOK_SECRET`
3. Send email to `u-{token}@expandnote.com`
4. Check webhook receives request

**Expected Result:**
- ✅ Webhook returns 200
- ✅ Note created successfully
- ✅ Logs show "Email processed successfully"

**Failure Indicators:**
- ❌ 401 Unauthorized
- ❌ "Invalid webhook signature" error

#### 1.2 Missing Webhook Secret (Production)
**Purpose:** Verify production deployment fails without secret

**Steps:**
1. Set `NODE_ENV=production`
2. Remove `RESEND_WEBHOOK_SECRET`
3. Restart server
4. Send webhook request

**Expected Result:**
- ✅ 500 Server Error
- ✅ Log: "RESEND_WEBHOOK_SECRET is required in production"

#### 1.3 Invalid Webhook Signature (Production)
**Purpose:** Verify forged webhooks are rejected

**Steps:**
1. Set `NODE_ENV=production`
2. Send webhook with modified signature header
3. Check response

**Expected Result:**
- ✅ 401 Unauthorized
- ✅ Log: "Webhook signature verification failed"

#### 1.4 Development Mode Without Secret
**Purpose:** Verify development mode allows testing

**Steps:**
1. Set `NODE_ENV=development`
2. Remove `RESEND_WEBHOOK_SECRET`
3. Send webhook request (can use curl/Postman)

**Expected Result:**
- ✅ 200 OK
- ✅ Warning log: "RESEND_WEBHOOK_SECRET not configured - skipping signature verification (DEVELOPMENT ONLY)"

---

### 2. Authentication Tests

#### 2.1 Invalid Token
**Purpose:** Verify invalid tokens are rejected

**Steps:**
1. Send email to `u-invalidtoken@expandnote.com`

**Expected Result:**
- ✅ 404 Not Found
- ✅ Error: "Email address not found"

#### 2.2 Feature Disabled
**Purpose:** Verify disabled feature is respected

**Steps:**
1. Disable email-to-note in user settings
2. Send email to valid address

**Expected Result:**
- ✅ 403 Forbidden
- ✅ Error: "Email-to-note feature not enabled for this user"

#### 2.3 Valid Token
**Purpose:** Verify successful authentication

**Steps:**
1. Send email to valid `u-{token}@expandnote.com`

**Expected Result:**
- ✅ 200 OK
- ✅ Note created

---

### 3. Email Processing Tests

#### 3.1 Email with Tags
**Purpose:** Verify tag extraction and association

**Email Details:**
- To: `u-{token}@expandnote.com`
- Subject: `Meeting notes #work #important`
- Body: Any text content

**Expected Result:**
- ✅ Note created with title "Meeting notes #work #important"
- ✅ Two tags created/associated: "work", "important"
- ✅ Response includes `tags_created: 2`

**Database Verification:**
```sql
-- Check note exists
SELECT * FROM notes WHERE title LIKE '%Meeting notes%';

-- Check tags created
SELECT * FROM tags WHERE name IN ('work', 'important');

-- Check associations
SELECT * FROM note_tags
WHERE note_id = '{note_id_from_above}';
```

#### 3.2 Email without Tags
**Purpose:** Verify handling of tagless emails

**Email Details:**
- Subject: `Simple note without tags`

**Expected Result:**
- ✅ Note created
- ✅ `tags_created: 0`
- ✅ No errors

#### 3.3 Email without Subject
**Purpose:** Verify default title handling

**Email Details:**
- Subject: (empty)
- Body: Test content

**Expected Result:**
- ✅ Note created with title "Note from email"

#### 3.4 Large Email Content
**Purpose:** Verify size limit enforcement

**Email Details:**
- Body: Content > MAX_CONTENT_SIZE_BYTES (1MB)

**Expected Result:**
- ✅ 413 Payload Too Large
- ✅ Error: "Email content too large. Maximum size: 1048576 bytes"

#### 3.5 HTML Email
**Purpose:** Verify HTML to text conversion

**Email Details:**
- HTML body with formatting, links, images

**Expected Result:**
- ✅ Note created
- ✅ HTML converted to clean text
- ✅ Links preserved in [text](url) format
- ✅ Email signature removed

#### 3.6 Plain Text Email
**Purpose:** Verify plain text processing

**Email Details:**
- Plain text only (no HTML)

**Expected Result:**
- ✅ Note created
- ✅ Content matches email text
- ✅ Email signature removed

---

### 4. Idempotency Tests

#### 4.1 Duplicate Webhook Events
**Purpose:** Verify duplicate email_id handling

**Steps:**
1. Send email and note `email_id` from webhook event
2. Manually trigger webhook again with same `email_id`

**Expected Result:**
- ✅ Second request returns 200
- ✅ Response: `message: "Email already processed (idempotent)"`
- ✅ Same `note_id` returned
- ✅ Only ONE note exists in database

**Database Verification:**
```sql
-- Check processed_emails table
SELECT * FROM processed_emails WHERE email_id = '{email_id}';

-- Verify only one note created
SELECT COUNT(*) FROM notes WHERE id = '{note_id}';
```

---

### 5. Race Condition Tests

#### 5.1 Concurrent Emails with Same New Tag
**Purpose:** Verify atomic tag creation

**Steps:**
1. Send two emails simultaneously (within 100ms):
   - Email 1: Subject `Test #newtag`
   - Email 2: Subject `Another #newtag`

**Expected Result:**
- ✅ Both notes created
- ✅ Only ONE "newtag" tag created
- ✅ Both notes associated with same tag
- ✅ No duplicate key errors in logs

**Database Verification:**
```sql
-- Should find exactly 1 tag
SELECT COUNT(*) FROM tags WHERE name = 'newtag';

-- Should find 2 note_tags associations
SELECT COUNT(*) FROM note_tags nt
JOIN tags t ON nt.tag_id = t.id
WHERE t.name = 'newtag';
```

#### 5.2 Concurrent Emails with Existing Tag
**Purpose:** Verify tag reuse works under load

**Steps:**
1. Create tag "existing" manually
2. Send two emails simultaneously with #existing

**Expected Result:**
- ✅ Both notes created
- ✅ Tag "existing" reused (not duplicated)
- ✅ Both notes associated with existing tag

---

### 6. Error Handling Tests

#### 6.1 Resend API Failure
**Purpose:** Verify graceful handling of external API errors

**Steps:**
1. Send webhook with invalid `email_id` (e.g., "invalid-uuid")

**Expected Result:**
- ✅ 500 Internal Server Error
- ✅ Error: "Failed to fetch email content"
- ✅ Log: "Error fetching email from Resend"

#### 6.2 Database Connection Error
**Purpose:** Verify handling of database failures

**Steps:**
1. Temporarily invalidate SUPABASE_SERVICE_ROLE_KEY
2. Send webhook

**Expected Result:**
- ✅ 500 Internal Server Error
- ✅ Appropriate error logged

#### 6.3 Partial Tag Creation Failure
**Purpose:** Verify system continues when tag creation fails

**Steps:**
1. Send email with subject `Test #validtag #invalid@tag`
2. Invalid tag should fail validation (if implemented)

**Expected Result:**
- ✅ Note created
- ✅ Valid tag created
- ✅ Invalid tag logged as error but doesn't block note creation
- ✅ Response indicates partial success

---

## Performance Tests

### 7.1 Multiple Tags Performance
**Purpose:** Verify performance with max tags (5)

**Email Details:**
- Subject: `Test #tag1 #tag2 #tag3 #tag4 #tag5`

**Expected Result:**
- ✅ All 5 tags created/associated
- ✅ Response time < 2 seconds

### 7.2 Large Email Processing
**Purpose:** Verify performance with large but valid emails

**Email Details:**
- Body: 500KB of text (under 1MB limit)

**Expected Result:**
- ✅ Note created
- ✅ Response time < 5 seconds

---

## Test Execution Checklist

### Pre-Deployment Testing

- [ ] Run security tests (1.1 - 1.4)
- [ ] Run authentication tests (2.1 - 2.3)
- [ ] Run email processing tests (3.1 - 3.6)
- [ ] Run idempotency tests (4.1)
- [ ] Run race condition tests (5.1 - 5.2)
- [ ] Run error handling tests (6.1 - 6.3)

### Production Verification

After deploying to production:

- [ ] Verify `NODE_ENV=production` is set
- [ ] Verify `RESEND_WEBHOOK_SECRET` is configured
- [ ] Send test email and verify end-to-end flow
- [ ] Check production logs for errors
- [ ] Verify webhook signature verification is working
- [ ] Monitor first 10 real emails for issues

---

## Manual Test Tools

### cURL Example (Development Mode)

```bash
curl -X POST http://localhost:3003/api/email/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.received",
    "created_at": "2025-11-27T00:00:00.000Z",
    "data": {
      "email_id": "test-123",
      "from": "test@example.com",
      "to": ["u-{your-token}@expandnote.com"],
      "subject": "Test email #test"
    }
  }'
```

**Note:** This only works in development mode (without signature verification)

### Resend Test Email

Send actual email via your mail client to:
```
u-{your-token}@expandnote.com
```

### Database Inspection Queries

```sql
-- Check recent notes
SELECT * FROM notes ORDER BY created_at DESC LIMIT 10;

-- Check recent tags
SELECT * FROM tags ORDER BY created_at DESC LIMIT 10;

-- Check note_tags associations
SELECT n.title, t.name
FROM notes n
JOIN note_tags nt ON n.id = nt.note_id
JOIN tags t ON nt.tag_id = t.tag_id
ORDER BY n.created_at DESC
LIMIT 20;

-- Check processed emails
SELECT * FROM processed_emails ORDER BY processed_at DESC LIMIT 10;
```

---

## Known Limitations

1. **No Automated Tests:** All testing is currently manual
2. **Webhook Retries:** Resend may retry failed webhooks - verify idempotency
3. **Rate Limiting:** No rate limiting implemented - monitor for abuse
4. **Transaction Safety:** Note/tag creation not atomic - monitor for orphaned notes

---

## Future Test Automation

**Priority:** High
**Recommended Framework:** Vitest with Supabase test database

**Required Test Infrastructure:**
- Mock Resend client
- Test Supabase database with automatic rollback
- Mock environment variables
- Webhook signature generation for test payloads

**Test File Location:** `src/app/api/email/webhook/__tests__/route.test.ts`

**Estimated Effort:** 4-6 hours

---

## Troubleshooting

### Webhook Not Receiving Events

1. Check Resend webhook configuration
2. Verify webhook URL is correct
3. Check ngrok/deployment logs
4. Verify domain in Resend matches `RESEND_EMAIL_DOMAIN`

### Signature Verification Failing

1. Verify `RESEND_WEBHOOK_SECRET` matches Resend dashboard
2. Check webhook secret format (should start with `whsec_`)
3. Verify Resend SDK version: `resend@6.3.0-canary.4`

### Tags Not Created

1. Check database for unique constraint violations
2. Verify tag extraction regex (should match #tagname)
3. Check `note_tags` table for associations

### Notes Not Appearing in UI

1. Verify RLS policies on notes table
2. Check user_id matches
3. Verify note content is not empty

---

## Support

For issues or questions:
1. Check application logs: `/tmp/dev.log` (local) or Vercel logs (production)
2. Check database state with SQL queries above
3. Review Resend webhook logs in Resend dashboard
4. Check this testing guide for expected behavior

---

**Last Updated:** 2025-11-27
**Next Review:** After automated tests are implemented

# Email-to-Note Implementation with Resend

**Issue:** #33 - Add notes through email
**Service:** Resend (already have account)
**Status:** Ready to implement

---

## Why Resend is Perfect for This

✅ **Already have account** - No new service needed
✅ **Just launched inbound** (Nov 2025) - Cutting edge feature
✅ **Stores emails** - Even if webhook is down
✅ **Attachments supported** - Download URLs provided
✅ **Webhook verification** - Built-in security
✅ **Great DX** - Clean API and SDK
✅ **Free tier** - Generous limits for testing

---

## Implementation Architecture

### User Email Address Options

**Option A: `.resend.app` domain (Quick Start)**
- Each user gets: `{user-token}@{team-id}.resend.app`
- Example: `u-abc123@cool-hedgehog.resend.app`
- **Pros:** No DNS setup, works immediately
- **Cons:** Less professional domain

**Option B: Custom subdomain (Production)**
- Each user gets: `{user-token}@notes.expandnote.com`
- Example: `u-abc123@notes.expandnote.com`
- **Pros:** Professional, branded
- **Cons:** Requires MX record setup

**Recommendation:** Start with Option A, migrate to Option B later

---

## Implementation Steps

### Phase 1: Database Setup

#### 1.1 Update user_settings table

```sql
-- Add email-to-note configuration
ALTER TABLE user_settings
  ADD COLUMN email_to_note_address TEXT UNIQUE,
  ADD COLUMN email_to_note_enabled BOOLEAN DEFAULT false,
  ADD COLUMN email_to_note_token TEXT UNIQUE;

-- Index for fast lookup
CREATE INDEX idx_user_settings_email_token ON user_settings(email_to_note_token);
```

#### 1.2 Migration file

Create: `supabase/migrations/20251121000001_add_email_to_note.sql`

```sql
-- Enable email-to-note feature
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS email_to_note_address TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email_to_note_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_to_note_token TEXT UNIQUE;

-- Index for quick lookup by token
CREATE INDEX IF NOT EXISTS idx_user_settings_email_token
  ON user_settings(email_to_note_token);

-- Function to generate unique token
CREATE OR REPLACE FUNCTION generate_email_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 12-character token
    token := encode(gen_random_bytes(9), 'hex');

    -- Check if token already exists
    SELECT EXISTS(
      SELECT 1 FROM user_settings WHERE email_to_note_token = token
    ) INTO exists;

    -- Exit loop if token is unique
    EXIT WHEN NOT exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;
```

---

### Phase 2: API Webhook Endpoint

#### 2.1 Install Resend SDK

```bash
npm install resend@6.3.0-canary.4
```

#### 2.2 Create webhook endpoint

Create: `src/app/api/email/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { parseEmailContent } from '@/lib/email/parser';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook authenticity
    const payload = await request.text();
    const headers = {
      'svix-id': request.headers.get('svix-id') || '',
      'svix-timestamp': request.headers.get('svix-timestamp') || '',
      'svix-signature': request.headers.get('svix-signature') || '',
    };

    // Verify webhook (throws error if invalid)
    const event = resend.webhooks.verify({
      payload,
      headers,
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
    });

    // 2. Process email.received events only
    if (event.type !== 'email.received') {
      return NextResponse.json({ received: true });
    }

    const emailEvent = event.data;

    // 3. Extract user token from "to" address
    // Expected format: u-{token}@domain.com
    const toAddress = Array.isArray(emailEvent.to)
      ? emailEvent.to[0]
      : emailEvent.to;

    const tokenMatch = toAddress.match(/^u-([a-z0-9]+)@/);
    if (!tokenMatch) {
      console.error('Invalid email format:', toAddress);
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const userToken = tokenMatch[1];

    // 4. Lookup user by token
    const supabase = await createClient();
    const { data: userSettings, error: lookupError } = await supabase
      .from('user_settings')
      .select('user_id, email_to_note_enabled')
      .eq('email_to_note_token', userToken)
      .single();

    if (lookupError || !userSettings || !userSettings.email_to_note_enabled) {
      console.error('User not found or feature disabled:', userToken);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 5. Fetch full email content from Resend
    const { data: email } = await resend.emails.receiving.get(emailEvent.email_id);

    if (!email) {
      console.error('Failed to fetch email content:', emailEvent.email_id);
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // 6. Parse email content
    const noteContent = parseEmailContent(email.text || '', email.html || '');
    const noteTitle = emailEvent.subject || 'Note from email';

    // 7. Extract tags from subject (optional)
    const tags = extractTags(emailEvent.subject);

    // 8. Create note in database
    const { data: note, error: createError } = await supabase
      .from('notes')
      .insert({
        user_id: userSettings.user_id,
        title: noteTitle,
        content: noteContent,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create note:', createError);
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    // 9. Add tags if any
    if (tags.length > 0) {
      // Get or create tags
      const { data: existingTags } = await supabase
        .from('tags')
        .select('id, name')
        .eq('user_id', userSettings.user_id)
        .in('name', tags);

      const existingTagNames = existingTags?.map(t => t.name) || [];
      const newTagNames = tags.filter(t => !existingTagNames.includes(t));

      // Create new tags
      if (newTagNames.length > 0) {
        await supabase
          .from('tags')
          .insert(
            newTagNames.map(name => ({
              name,
              user_id: userSettings.user_id,
            }))
          );
      }

      // Get all tag IDs
      const { data: allTags } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', userSettings.user_id)
        .in('name', tags);

      // Link tags to note
      if (allTags) {
        await supabase
          .from('note_tags')
          .insert(
            allTags.map(tag => ({
              note_id: note.id,
              tag_id: tag.id,
            }))
          );
      }
    }

    console.log('Note created successfully:', note.id);

    return NextResponse.json({
      success: true,
      noteId: note.id,
      title: noteTitle,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to extract hashtags from subject
function extractTags(subject: string): string[] {
  const tagRegex = /#([a-zA-Z0-9_-]+)/g;
  const matches = subject.matchAll(tagRegex);
  return Array.from(matches, m => m[1].toLowerCase());
}
```

---

### Phase 3: Email Parser Utility

Create: `src/lib/email/parser.ts`

```typescript
import { convert } from 'html-to-text';

/**
 * Parse email content, preferring plain text over HTML
 */
export function parseEmailContent(text: string, html?: string): string {
  // Prefer plain text if available and not empty
  if (text && text.trim()) {
    return cleanPlainText(text);
  }

  // Fall back to converting HTML to text
  if (html && html.trim()) {
    return convertHtmlToText(html);
  }

  return '';
}

/**
 * Clean plain text email content
 */
function cleanPlainText(text: string): string {
  const lines = text.split('\n');

  // Remove common email signatures
  const signaturePatterns = [
    /^--\s*$/,                    // Standard signature delimiter
    /^Sent from my/i,             // "Sent from my iPhone"
    /^Get Outlook for/i,          // Outlook mobile
    /^Enviado desde/i,            // Spanish mobile
    /^Von meinem/i,               // German mobile
  ];

  let endIndex = lines.length;

  // Find signature start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (signaturePatterns.some(pattern => pattern.test(line))) {
      endIndex = i;
      break;
    }
  }

  // Take content before signature
  const content = lines.slice(0, endIndex).join('\n').trim();

  return content;
}

/**
 * Convert HTML email to plain text
 */
function convertHtmlToText(html: string): string {
  return convert(html, {
    wordwrap: 80,
    selectors: [
      { selector: 'a', options: { ignoreHref: false } },
      { selector: 'img', format: 'skip' },
      { selector: 'table', format: 'dataTable' },
    ],
    preserveNewlines: true,
  });
}
```

Install dependency:
```bash
npm install html-to-text
npm install -D @types/html-to-text
```

---

### Phase 4: Settings UI

#### 4.1 Add to Settings page

Update: `src/app/settings/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [emailToNoteEnabled, setEmailToNoteEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: settings } = await supabase
      .from('user_settings')
      .select('email_to_note_enabled, email_to_note_address')
      .eq('user_id', user.id)
      .single();

    if (settings) {
      setEmailToNoteEnabled(settings.email_to_note_enabled || false);
      setEmailAddress(settings.email_to_note_address || '');
    }

    setLoading(false);
  };

  const enableEmailToNote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    // Call API to generate token and email address
    const response = await fetch('/api/settings/email-to-note/enable', {
      method: 'POST',
    });

    const data = await response.json();

    if (data.success) {
      setEmailAddress(data.emailAddress);
      setEmailToNoteEnabled(true);
    }

    setLoading(false);
  };

  const disableEmailToNote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    await supabase
      .from('user_settings')
      .update({ email_to_note_enabled: false })
      .eq('user_id', user.id);

    setEmailToNoteEnabled(false);
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(emailAddress);
    // Show toast notification
  };

  const regenerateAddress = async () => {
    if (!confirm('This will invalidate your old email address. Continue?')) {
      return;
    }

    setLoading(true);

    const response = await fetch('/api/settings/email-to-note/regenerate', {
      method: 'POST',
    });

    const data = await response.json();

    if (data.success) {
      setEmailAddress(data.emailAddress);
    }

    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Email to Note Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">Email to Note</h2>
        <p className="text-gray-600 mb-4">
          Create notes by sending emails to a unique address
        </p>

        {loading ? (
          <div>Loading...</div>
        ) : emailToNoteEnabled ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Email Address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={emailAddress}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded bg-gray-50"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={disableEmailToNote}
                className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50"
              >
                Disable
              </button>
              <button
                onClick={regenerateAddress}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Regenerate Address
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h3 className="font-medium mb-2">How to use:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Send email to your unique address</li>
                <li>Email subject becomes note title</li>
                <li>Email body becomes note content</li>
                <li>Add #tags in subject to auto-tag notes</li>
              </ul>
            </div>
          </div>
        ) : (
          <button
            onClick={enableEmailToNote}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Enable Email to Note
          </button>
        )}
      </div>
    </div>
  );
}
```

#### 4.2 API endpoints for settings

Create: `src/app/api/settings/email-to-note/enable/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate token using database function
    const { data: tokenData } = await supabase
      .rpc('generate_email_token')
      .single();

    const token = tokenData;

    // Get Resend domain (from env or use default .resend.app)
    const domain = process.env.RESEND_INBOUND_DOMAIN || 'your-id.resend.app';
    const emailAddress = `u-${token}@${domain}`;

    // Update user settings
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        email_to_note_token: token,
        email_to_note_address: emailAddress,
        email_to_note_enabled: true,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update settings:', updateError);
      return NextResponse.json({ error: 'Failed to enable feature' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      emailAddress,
    });

  } catch (error) {
    console.error('Enable email-to-note error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

Create: `src/app/api/settings/email-to-note/regenerate/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate new token
    const { data: tokenData } = await supabase
      .rpc('generate_email_token')
      .single();

    const token = tokenData;
    const domain = process.env.RESEND_INBOUND_DOMAIN || 'your-id.resend.app';
    const emailAddress = `u-${token}@${domain}`;

    // Update with new token
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        email_to_note_token: token,
        email_to_note_address: emailAddress,
      })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to regenerate' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      emailAddress,
    });

  } catch (error) {
    console.error('Regenerate error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

### Phase 5: Resend Configuration

#### 5.1 Environment Variables

Add to `.env.local`:

```bash
# Resend API Key (from resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Resend Webhook Secret (from resend.com/webhooks)
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Resend Inbound Domain (get from Resend dashboard)
RESEND_INBOUND_DOMAIN=your-id.resend.app
```

#### 5.2 Resend Dashboard Setup

1. **Get your inbound domain:**
   - Go to https://resend.com/emails
   - Click "Receiving" tab
   - Click three dots → "Inbound address"
   - Copy your domain (e.g., `abc123.resend.app`)

2. **Create webhook:**
   - Go to https://resend.com/webhooks
   - Click "Add Webhook"
   - URL: `https://expandnote.com/api/email/webhook`
   - Event: Select `email.received`
   - Click "Add"
   - Copy the webhook secret

3. **For local development:**
   - Use ngrok: `ngrok http 3003`
   - Or VS Code port forwarding
   - Update webhook URL to your ngrok URL

---

## Testing

### Local Testing (with ngrok)

1. Start ngrok:
```bash
ngrok http 3003
```

2. Update Resend webhook to ngrok URL:
```
https://abc123.ngrok.io/api/email/webhook
```

3. Enable email-to-note in settings

4. Send test email to your address

5. Check logs and database

### Production Testing

1. Deploy to Vercel

2. Update Resend webhook to production URL:
```
https://expandnote.com/api/email/webhook
```

3. Send test email

4. Verify note created

---

## Security Considerations

1. **Webhook Verification** ✅
   - Always verify with `resend.webhooks.verify()`
   - Prevents spoofed requests

2. **Rate Limiting**
   - Limit emails per user (100/day)
   - Track in database or use Vercel rate limiting

3. **Content Sanitization**
   - Strip HTML scripts
   - Validate content size (<1MB)

4. **Token Security**
   - Use cryptographically secure tokens
   - Allow regeneration
   - Unique per user

---

## Cost

**Resend Free Tier:**
- 3,000 emails/month
- 100 emails/day

**Estimated Usage (1000 users):**
- 5 emails/user/month = 5,000 emails
- Need paid plan (~$20/month for 50k emails)

**But for MVP/beta:**
- Free tier is perfect for testing

---

## Migration Plan

### MVP (Start Here)
1. ✅ Use `.resend.app` domain
2. ✅ Basic email→note conversion
3. ✅ Tag extraction from subject

### Production
1. Set up custom domain (`notes.expandnote.com`)
2. Add attachment support
3. Add email confirmation responses

---

## Next Steps

1. **Run migration** to add database columns
2. **Install Resend SDK** and dependencies
3. **Create webhook endpoint**
4. **Build settings UI**
5. **Configure Resend** (webhook + get domain)
6. **Test locally** with ngrok
7. **Deploy and test** in production

Want me to start implementing this? 🚀

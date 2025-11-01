# AI Profile Execution Engine - Design Document

**Date:** 2025-11-01
**Status:** Approved
**Scope:** Web-only (mobile/offline deferred)

## Overview

Implement the AI Profile execution engine to enable users to process note content through OpenAI or Anthropic models using tag-triggered AI profiles. This is the core differentiating feature of ExpandNote.

## User Flow

1. User creates/edits a note with content
2. User adds tag (e.g., #youtube, #summarize, #translate)
3. If tag is linked to an AI Profile, a "▶ Run: [Profile Name]" button appears
4. User clicks button → AI executes → result appends to note or creates new note
5. Execution is logged for token tracking and history

**Initial Implementation:** Manual trigger only (button click)
**Future Enhancement:** Automatic trigger when tag is added

## Architecture Components

### 1. AI Execution API
**Endpoint:** `POST /api/profiles/:id/execute`

**Request:**
```json
{
  "noteId": "uuid-123"
}
```

**Response:**
```json
{
  "success": true,
  "output_behavior": "append|new_note",
  "noteId": "uuid-456",  // original or new note ID
  "tokensUsed": 1234,
  "executionTimeMs": 2500
}
```

**Process Flow:**
1. Authenticate user via Supabase
2. Fetch AI profile + verify ownership
3. Fetch note + verify ownership
4. Fetch user settings to retrieve encrypted API keys
5. Decrypt API key based on profile.ai_provider
6. Generate prompts with variable substitution
7. Execute AI request via provider handler
8. Handle output based on profile.output_behavior
9. Log execution to ai_executions table
10. Return result to frontend

### 2. AI Provider Handlers

**Location:** `/src/lib/ai/`

**Files:**
- `openai.ts` - OpenAI integration (GPT-4, GPT-3.5)
- `anthropic.ts` - Anthropic integration (Claude 3.5, Claude 3)
- `prompt-template.ts` - Variable substitution engine
- `types.ts` - Shared interfaces

**Unified Interface:**
```typescript
interface AIExecutionRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  apiKey: string;
}

interface AIExecutionResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

async function executeAIRequest(
  provider: 'openai' | 'claude',
  request: AIExecutionRequest
): Promise<AIExecutionResponse>
```

### 3. Prompt Template System

**Variable Substitution:**
- `{note_title}` → note.title
- `{note_content}` → note.content
- `{tags}` → comma-separated list of tags

**Example:**
```
System: "You are a YouTube video summarizer"
User Template: "Summarize this video transcript: {note_content}"
Result: "Summarize this video transcript: [actual note content]"
```

### 4. Output Behaviors

**Append Mode:**
- Append AI response to existing note
- Format: `\n\n---\n\n[AI Response]`
- Update note via `PATCH /api/notes/:id`

**New Note Mode:**
- Create new note with AI response
- Generate title from `output_title_template`
  - Example: "Summary of {note_title}" → "Summary of My Video"
- Inherit tags from original note
- Create via `POST /api/notes`

### 5. Token Tracking & Logging

**Table:** `ai_executions`

**Logged Data:**
- profile_id, note_id, user_id
- ai_provider, model
- tokens_used (from AI API response)
- execution_time_ms (measured)
- status: "success" | "failed"
- error_message (if failed)
- created_at (timestamp)

### 6. UI Enhancement

**NoteEditor Component Changes:**
- Fetch all user's AI profiles on mount
- Match profiles to note's tags (profile.tag_id in note.tags)
- Render button for each match:
  ```
  ▶ Run: [Profile Name]
  ```
- Show loading state during execution
- Display success/error toast notifications
- Auto-refresh note (append mode) or navigate to new note

## Error Handling

| Error | Status Code | Message |
|-------|-------------|---------|
| Unauthenticated | 401 | "Authentication required" |
| Profile not found | 404 | "AI Profile not found" |
| Note not found | 404 | "Note not found" |
| Missing API key | 400 | "Please configure your [OpenAI/Claude] API key in settings" |
| Invalid API key | 401 | "Invalid API key. Please update in settings" |
| Rate limit exceeded | 429 | "Rate limit exceeded. Please try again later" |
| Token limit exceeded | 400 | "Content too large for this model" |
| AI API timeout | 500 | "Request timed out. Please try again" |
| Generic AI error | 500 | "AI execution failed: [error message]" |

**Retry Strategy:**
- 3 attempts with exponential backoff (1s, 2s, 4s)
- Only retry on transient errors (5xx, timeouts)
- Do not retry on 4xx errors (client errors)

## Dependencies

**New Packages:**
```bash
npm install openai @anthropic-ai/sdk
npm install tiktoken  # Token counting for OpenAI
```

**Existing Packages (Already Installed):**
- @supabase/supabase-js
- @supabase/ssr
- zustand (state management)

## Voice Transcription (Bonus Feature)

**Endpoint:** `POST /api/transcribe`

**Request:**
```typescript
FormData {
  audio: Blob  // WAV, MP3, or WebM audio file
}
```

**Response:**
```json
{
  "text": "Transcribed text here..."
}
```

**UI Component:**
- Voice button in NoteEditor toolbar (🎤)
- Browser MediaRecorder API captures audio
- Send audio blob to Whisper API
- Insert transcribed text at cursor position
- Loading state: "Recording..." → "Transcribing..."

## Security Considerations

1. **API Key Storage:**
   - Already encrypted at rest (AES-256) ✅
   - Decryption only happens server-side
   - Never sent to client

2. **Authorization:**
   - All endpoints verify user ownership
   - RLS policies on database enforce user isolation

3. **Rate Limiting:**
   - Rely on AI provider's rate limits initially
   - Future: Implement per-user rate limits

4. **Content Size Limits:**
   - Enforce max note size (already 1MB in schema)
   - Validate token count before API call

## Testing Strategy

1. **Unit Tests:**
   - Prompt template substitution
   - Token counting accuracy
   - Error handling logic

2. **Integration Tests:**
   - API endpoint with mocked AI responses
   - Database logging
   - Output behavior (append/new_note)

3. **Manual Testing:**
   - End-to-end flow with real OpenAI/Claude APIs
   - Test all models (GPT-4, Claude 3.5, etc.)
   - Verify token tracking accuracy
   - Test error scenarios (invalid key, rate limits)

## Implementation Phases

### Phase 1: Foundation (Day 1)
- Install dependencies (openai, @anthropic-ai/sdk)
- Create AI provider handlers (openai.ts, anthropic.ts)
- Implement prompt template engine
- Write unit tests

### Phase 2: Execution API (Day 1-2)
- Create /api/profiles/:id/execute endpoint
- Implement authentication & authorization
- Add error handling & logging
- Test with real AI APIs

### Phase 3: UI Integration (Day 2)
- Add AI profile buttons to NoteEditor
- Implement loading states
- Add toast notifications
- Handle navigation (new note mode)

### Phase 4: Voice Transcription (Day 2-3)
- Create /api/transcribe endpoint
- Add voice button to NoteEditor
- Implement MediaRecorder integration
- Test on multiple browsers

### Phase 5: Testing & Polish (Day 3)
- Manual end-to-end testing
- Fix bugs and edge cases
- Update UI/UX based on testing
- Build and deploy to Vercel

## Future Enhancements (Deferred)

- Automatic trigger mode (execute on tag add)
- Streaming AI responses (real-time token display)
- Background job queue for long-running tasks
- Advanced retry logic with dead letter queue
- Per-user rate limiting
- Token usage analytics dashboard
- Multiple AI profiles per tag
- AI profile marketplace/templates

## Success Metrics

- User can execute AI profiles successfully
- Token tracking is accurate (within 5%)
- Execution time < 10 seconds for typical requests
- Error rate < 5%
- Voice transcription accuracy > 95%

## Deployment Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Environment variables configured (OPENAI_API_KEY not needed - users provide their own)
- [ ] Database migrations applied (already done ✅)
- [ ] Build successful (`npm run build`)
- [ ] Manual testing on Vercel preview
- [ ] Deploy to production

---

**Approved By:** User
**Implementation Start:** 2025-11-01

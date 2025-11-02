# AI Profile Execution Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to execute AI profiles (OpenAI/Anthropic) on notes via manual button trigger, with token tracking and output handling (append/new note).

**Architecture:** REST API endpoint (`POST /api/profiles/:id/execute`) processes note content through AI provider handlers, logs execution to database, and applies output based on profile configuration. Frontend shows "Run AI Profile" buttons for tags with associated profiles.

**Tech Stack:** Next.js 15 App Router, OpenAI SDK, Anthropic SDK, Supabase (PostgreSQL + Auth), TypeScript

---

## Task 1: Install AI Provider Dependencies

**Files:**
- Modify: `package.json`
- Create: None

**Step 1: Install OpenAI and Anthropic SDKs**

Run:
```bash
npm install openai @anthropic-ai/sdk tiktoken
```

Expected: Packages installed successfully

**Step 2: Verify installation**

Run:
```bash
npm list openai @anthropic-ai/sdk tiktoken
```

Expected: Shows installed versions

**Step 3: Build to verify no breaking changes**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install AI provider SDKs (OpenAI, Anthropic, tiktoken)"
```

---

## Task 2: Create AI Types and Interfaces

**Files:**
- Create: `src/lib/ai/types.ts`

**Step 1: Create AI types file**

Create `src/lib/ai/types.ts`:

```typescript
export interface AIExecutionRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  apiKey: string;
}

export interface AIExecutionResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export interface PromptVariables {
  note_title: string;
  note_content: string;
  tags: string;
}

export class AIExecutionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AIExecutionError';
  }
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/types.ts
git commit -m "feat(ai): add AI execution types and interfaces"
```

---

## Task 3: Create Prompt Template Engine

**Files:**
- Create: `src/lib/ai/prompt-template.ts`
- Create: `src/lib/ai/__tests__/prompt-template.test.ts`

**Step 1: Write failing test for prompt template substitution**

Create `src/lib/ai/__tests__/prompt-template.test.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';
import { substitutePromptVariables } from '../prompt-template';
import type { PromptVariables } from '../types';

describe('substitutePromptVariables', () => {
  const variables: PromptVariables = {
    note_title: 'My Video',
    note_content: 'This is a test transcript',
    tags: 'youtube, education',
  };

  it('should replace {note_title} variable', () => {
    const template = 'Title: {note_title}';
    const result = substitutePromptVariables(template, variables);
    expect(result).toBe('Title: My Video');
  });

  it('should replace {note_content} variable', () => {
    const template = 'Content: {note_content}';
    const result = substitutePromptVariables(template, variables);
    expect(result).toBe('Content: This is a test transcript');
  });

  it('should replace {tags} variable', () => {
    const template = 'Tags: {tags}';
    const result = substitutePromptVariables(template, variables);
    expect(result).toBe('Tags: youtube, education');
  });

  it('should replace multiple variables', () => {
    const template = 'Title: {note_title}\nContent: {note_content}\nTags: {tags}';
    const result = substitutePromptVariables(template, variables);
    expect(result).toBe('Title: My Video\nContent: This is a test transcript\nTags: youtube, education');
  });

  it('should handle missing variables gracefully', () => {
    const template = 'Title: {note_title}';
    const result = substitutePromptVariables(template, {
      note_title: '',
      note_content: '',
      tags: '',
    });
    expect(result).toBe('Title: ');
  });
});
```

**Step 2: Install Jest if not already installed**

Check if Jest exists:
```bash
npm list jest
```

If not found, run:
```bash
npm install -D jest @jest/globals @types/jest ts-jest
```

**Step 3: Create jest.config.js if needed**

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

**Step 4: Run test to verify it fails**

Run:
```bash
npx jest src/lib/ai/__tests__/prompt-template.test.ts
```

Expected: FAIL with "Cannot find module '../prompt-template'"

**Step 5: Write minimal implementation**

Create `src/lib/ai/prompt-template.ts`:

```typescript
import type { PromptVariables } from './types';

/**
 * Substitutes variables in a prompt template.
 * Variables: {note_title}, {note_content}, {tags}
 */
export function substitutePromptVariables(
  template: string,
  variables: PromptVariables
): string {
  return template
    .replace(/{note_title}/g, variables.note_title)
    .replace(/{note_content}/g, variables.note_content)
    .replace(/{tags}/g, variables.tags);
}
```

**Step 6: Run test to verify it passes**

Run:
```bash
npx jest src/lib/ai/__tests__/prompt-template.test.ts
```

Expected: PASS (all 5 tests)

**Step 7: Commit**

```bash
git add src/lib/ai/prompt-template.ts src/lib/ai/__tests__/prompt-template.test.ts jest.config.js
git commit -m "feat(ai): add prompt template substitution with tests"
```

---

## Task 4: Create OpenAI Handler

**Files:**
- Create: `src/lib/ai/openai.ts`

**Step 1: Write OpenAI handler**

Create `src/lib/ai/openai.ts`:

```typescript
import OpenAI from 'openai';
import type { AIExecutionRequest, AIExecutionResponse } from './types';
import { AIExecutionError } from './types';

/**
 * Execute AI request using OpenAI API
 */
export async function executeOpenAI(
  request: AIExecutionRequest
): Promise<AIExecutionResponse> {
  try {
    const client = new OpenAI({
      apiKey: request.apiKey,
    });

    const completion = await client.chat.completions.create({
      model: request.model,
      messages: [
        {
          role: 'system',
          content: request.systemPrompt,
        },
        {
          role: 'user',
          content: request.userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      content,
      tokensUsed,
      model: completion.model,
    };
  } catch (error: any) {
    // Handle OpenAI-specific errors
    if (error.status === 401) {
      throw new AIExecutionError(
        'Invalid OpenAI API key',
        'INVALID_API_KEY',
        401
      );
    }
    if (error.status === 429) {
      throw new AIExecutionError(
        'OpenAI rate limit exceeded. Please try again later.',
        'RATE_LIMIT_EXCEEDED',
        429
      );
    }
    if (error.code === 'context_length_exceeded') {
      throw new AIExecutionError(
        'Content too large for this model',
        'TOKEN_LIMIT_EXCEEDED',
        400
      );
    }

    // Generic error
    throw new AIExecutionError(
      error.message || 'OpenAI API request failed',
      'AI_EXECUTION_FAILED',
      500
    );
  }
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/openai.ts
git commit -m "feat(ai): add OpenAI handler with error handling"
```

---

## Task 5: Create Anthropic Handler

**Files:**
- Create: `src/lib/ai/anthropic.ts`

**Step 1: Write Anthropic handler**

Create `src/lib/ai/anthropic.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { AIExecutionRequest, AIExecutionResponse } from './types';
import { AIExecutionError } from './types';

/**
 * Execute AI request using Anthropic Claude API
 */
export async function executeAnthropic(
  request: AIExecutionRequest
): Promise<AIExecutionResponse> {
  try {
    const client = new Anthropic({
      apiKey: request.apiKey,
    });

    const message = await client.messages.create({
      model: request.model,
      max_tokens: 4000,
      system: request.systemPrompt,
      messages: [
        {
          role: 'user',
          content: request.userPrompt,
        },
      ],
    });

    const content = message.content[0]?.type === 'text'
      ? message.content[0].text
      : '';

    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

    return {
      content,
      tokensUsed,
      model: message.model,
    };
  } catch (error: any) {
    // Handle Anthropic-specific errors
    if (error.status === 401) {
      throw new AIExecutionError(
        'Invalid Anthropic API key',
        'INVALID_API_KEY',
        401
      );
    }
    if (error.status === 429) {
      throw new AIExecutionError(
        'Anthropic rate limit exceeded. Please try again later.',
        'RATE_LIMIT_EXCEEDED',
        429
      );
    }
    if (error.type === 'invalid_request_error' && error.message?.includes('max_tokens')) {
      throw new AIExecutionError(
        'Content too large for this model',
        'TOKEN_LIMIT_EXCEEDED',
        400
      );
    }

    // Generic error
    throw new AIExecutionError(
      error.message || 'Anthropic API request failed',
      'AI_EXECUTION_FAILED',
      500
    );
  }
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/anthropic.ts
git commit -m "feat(ai): add Anthropic Claude handler with error handling"
```

---

## Task 6: Create Unified AI Executor

**Files:**
- Create: `src/lib/ai/executor.ts`

**Step 1: Write unified executor**

Create `src/lib/ai/executor.ts`:

```typescript
import type { AIProvider } from '@/types';
import type { AIExecutionRequest, AIExecutionResponse } from './types';
import { executeOpenAI } from './openai';
import { executeAnthropic } from './anthropic';
import { AIExecutionError } from './types';

/**
 * Execute AI request with the specified provider
 */
export async function executeAIRequest(
  provider: AIProvider,
  request: AIExecutionRequest
): Promise<AIExecutionResponse> {
  switch (provider) {
    case 'openai':
      return executeOpenAI(request);
    case 'claude':
      return executeAnthropic(request);
    default:
      throw new AIExecutionError(
        `Unsupported AI provider: ${provider}`,
        'INVALID_PROVIDER',
        400
      );
  }
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/executor.ts
git commit -m "feat(ai): add unified AI executor for multiple providers"
```

---

## Task 7: Create AI Profile Execution API Endpoint (Part 1: Setup)

**Files:**
- Create: `src/app/api/profiles/[id]/execute/route.ts`

**Step 1: Create API route structure**

Create `src/app/api/profiles/[id]/execute/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { noteId } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: 'noteId is required' },
        { status: 400 }
      );
    }

    // TODO: Fetch profile, note, settings
    // TODO: Execute AI request
    // TODO: Handle output
    // TODO: Log execution

    return NextResponse.json(
      {
        success: true,
        message: 'Endpoint created (implementation pending)'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('AI execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test endpoint manually**

Run dev server:
```bash
npm run dev
```

Test with curl (replace with real profile ID and note ID after creating):
```bash
curl -X POST http://localhost:3003/api/profiles/test-id/execute \
  -H "Content-Type: application/json" \
  -d '{"noteId":"test-note-id"}'
```

Expected: 401 Unauthorized (need auth)

**Step 3: Commit**

```bash
git add src/app/api/profiles/[id]/execute/route.ts
git commit -m "feat(api): add AI profile execution endpoint skeleton"
```

---

## Task 8: Implement Profile Execution API (Part 2: Fetch Data)

**Files:**
- Modify: `src/app/api/profiles/[id]/execute/route.ts`

**Step 1: Add data fetching logic**

Update `src/app/api/profiles/[id]/execute/route.ts` (replace TODO section):

```typescript
    // Fetch AI profile
    const { data: profile, error: profileError } = await supabase
      .from('ai_profiles')
      .select('*, tags(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'AI Profile not found' },
        { status: 404 }
      );
    }

    // Fetch note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('*, note_tags(tags(*))')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Fetch user settings for API keys
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('openai_api_key_encrypted, claude_api_key_encrypted')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'User settings not found. Please configure your API keys.' },
        { status: 400 }
      );
    }

    // Get appropriate API key based on provider
    const apiKeyField = profile.ai_provider === 'openai'
      ? 'openai_api_key_encrypted'
      : 'claude_api_key_encrypted';

    const encryptedApiKey = settings[apiKeyField];

    if (!encryptedApiKey) {
      return NextResponse.json(
        { error: `Please configure your ${profile.ai_provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key in settings` },
        { status: 400 }
      );
    }
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors (may have some unused variable warnings)

**Step 3: Commit**

```bash
git add src/app/api/profiles/[id]/execute/route.ts
git commit -m "feat(api): add data fetching for profile, note, and API keys"
```

---

## Task 9: Implement Profile Execution API (Part 3: Decrypt API Key)

**Files:**
- Modify: `src/app/api/profiles/[id]/execute/route.ts`
- Read: `src/lib/encryption.ts` (for reference)

**Step 1: Add decryption logic**

Update `src/app/api/profiles/[id]/execute/route.ts` (after API key check):

```typescript
    // Decrypt API key
    const { data: decryptedKeyResult, error: decryptError } = await supabase
      .rpc('decrypt_api_key', { encrypted_key: encryptedApiKey });

    if (decryptError || !decryptedKeyResult) {
      console.error('Decryption error:', decryptError);
      return NextResponse.json(
        { error: 'Failed to decrypt API key' },
        { status: 500 }
      );
    }

    const apiKey = decryptedKeyResult;
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/profiles/[id]/execute/route.ts
git commit -m "feat(api): add API key decryption"
```

---

## Task 10: Implement Profile Execution API (Part 4: Execute AI)

**Files:**
- Modify: `src/app/api/profiles/[id]/execute/route.ts`

**Step 1: Add AI execution logic**

Update `src/app/api/profiles/[id]/execute/route.ts` (after decryption):

```typescript
import { executeAIRequest } from '@/lib/ai/executor';
import { substitutePromptVariables } from '@/lib/ai/prompt-template';
import { AIExecutionError } from '@/lib/ai/types';
import type { PromptVariables } from '@/lib/ai/types';

// ... (in POST handler after decryption)

    // Prepare prompt variables
    const tags = note.note_tags?.map((nt: any) => nt.tags.name).join(', ') || '';
    const variables: PromptVariables = {
      note_title: note.title || '',
      note_content: note.content || '',
      tags,
    };

    // Substitute variables in prompts
    const systemPrompt = substitutePromptVariables(
      profile.system_prompt,
      variables
    );
    const userPrompt = substitutePromptVariables(
      profile.user_prompt_template,
      variables
    );

    // Execute AI request
    const startTime = Date.now();
    let aiResponse;

    try {
      aiResponse = await executeAIRequest(profile.ai_provider, {
        systemPrompt,
        userPrompt,
        model: profile.model,
        apiKey,
      });
    } catch (error) {
      if (error instanceof AIExecutionError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      throw error;
    }

    const executionTimeMs = Date.now() - startTime;
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/profiles/[id]/execute/route.ts
git commit -m "feat(api): add AI execution with prompt substitution"
```

---

## Task 11: Implement Profile Execution API (Part 5: Handle Output - Append)

**Files:**
- Modify: `src/app/api/profiles/[id]/execute/route.ts`

**Step 1: Add output handling for append mode**

Update `src/app/api/profiles/[id]/execute/route.ts` (after AI execution):

```typescript
    // Handle output based on output_behavior
    let resultNoteId = noteId;

    if (profile.output_behavior === 'append') {
      // Append AI response to existing note
      const updatedContent = `${note.content}\n\n---\n\n${aiResponse.content}`;

      const { error: updateError } = await supabase
        .from('notes')
        .update({
          content: updatedContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update note:', updateError);
        return NextResponse.json(
          { error: 'Failed to update note with AI response' },
          { status: 500 }
        );
      }
    }
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/profiles/[id]/execute/route.ts
git commit -m "feat(api): add append output behavior"
```

---

## Task 12: Implement Profile Execution API (Part 6: Handle Output - New Note)

**Files:**
- Modify: `src/app/api/profiles/[id]/execute/route.ts`

**Step 1: Add output handling for new_note mode**

Update `src/app/api/profiles/[id]/execute/route.ts` (add to output handling):

```typescript
    else if (profile.output_behavior === 'new_note') {
      // Create new note with AI response
      const newNoteTitle = substitutePromptVariables(
        profile.output_title_template || 'AI Response: {note_title}',
        variables
      );

      const { data: newNote, error: createError } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: newNoteTitle,
          content: aiResponse.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !newNote) {
        console.error('Failed to create new note:', createError);
        return NextResponse.json(
          { error: 'Failed to create new note' },
          { status: 500 }
        );
      }

      resultNoteId = newNote.id;

      // Copy tags from original note to new note
      if (note.note_tags && note.note_tags.length > 0) {
        const tagInserts = note.note_tags.map((nt: any) => ({
          note_id: newNote.id,
          tag_id: nt.tags.id,
        }));

        await supabase.from('note_tags').insert(tagInserts);
      }
    }
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/profiles/[id]/execute/route.ts
git commit -m "feat(api): add new_note output behavior with tag copying"
```

---

## Task 13: Implement Profile Execution API (Part 7: Log Execution)

**Files:**
- Modify: `src/app/api/profiles/[id]/execute/route.ts`

**Step 1: Add execution logging**

Update `src/app/api/profiles/[id]/execute/route.ts` (after output handling):

```typescript
    // Log execution to ai_executions table
    const { error: logError } = await supabase
      .from('ai_executions')
      .insert({
        user_id: user.id,
        profile_id: profile.id,
        note_id: noteId,
        ai_provider: profile.ai_provider,
        model: aiResponse.model,
        tokens_used: aiResponse.tokensUsed,
        execution_time_ms: executionTimeMs,
        status: 'success',
        created_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Failed to log execution:', logError);
      // Don't fail the request if logging fails
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        output_behavior: profile.output_behavior,
        noteId: resultNoteId,
        tokensUsed: aiResponse.tokensUsed,
        executionTimeMs,
      },
      { status: 200 }
    );
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/profiles/[id]/execute/route.ts
git commit -m "feat(api): add execution logging to ai_executions table"
```

---

## Task 14: Add Error Logging to API

**Files:**
- Modify: `src/app/api/profiles/[id]/execute/route.ts`

**Step 1: Update error handler to log failures**

Update the catch block in `src/app/api/profiles/[id]/execute/route.ts`:

```typescript
  } catch (error: any) {
    console.error('AI execution error:', error);

    // Log failed execution if we have profile/note IDs
    if (user && params.id && body?.noteId) {
      await supabase.from('ai_executions').insert({
        user_id: user.id,
        profile_id: params.id,
        note_id: body.noteId,
        ai_provider: error.provider || 'unknown',
        model: error.model || 'unknown',
        tokens_used: 0,
        execution_time_ms: 0,
        status: 'failed',
        error_message: error.message || 'Unknown error',
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.statusCode || 500 }
    );
  }
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Build to verify no errors**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/api/profiles/[id]/execute/route.ts
git commit -m "feat(api): add error logging for failed executions"
```

---

## Task 15: Add UI Hook to Fetch AI Profiles

**Files:**
- Create: `src/hooks/useAIProfiles.ts`

**Step 1: Create useAIProfiles hook**

Create `src/hooks/useAIProfiles.ts`:

```typescript
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AIProfile } from '@/types';

export function useAIProfiles() {
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        setLoading(true);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from('ai_profiles')
          .select('*, tags(*)')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        setProfiles(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, []);

  return { profiles, loading, error };
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useAIProfiles.ts
git commit -m "feat(hooks): add useAIProfiles hook for fetching AI profiles"
```

---

## Task 16: Add AI Profile Execute Button Component

**Files:**
- Create: `src/components/AIProfileButton.tsx`

**Step 1: Create AI profile button component**

Create `src/components/AIProfileButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import type { AIProfile } from '@/types';

interface AIProfileButtonProps {
  profile: AIProfile;
  noteId: string;
  onSuccess: () => void;
}

export function AIProfileButton({
  profile,
  noteId,
  onSuccess,
}: AIProfileButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/profiles/${profile.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute AI profile');
      }

      // Show success toast (you can use react-hot-toast here)
      console.log('AI execution successful:', data);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      console.error('AI execution error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleExecute}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            <span>Running {profile.name}...</span>
          </>
        ) : (
          <>
            <span>▶</span>
            <span>Run: {profile.name}</span>
          </>
        )}
      </button>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/components/AIProfileButton.tsx
git commit -m "feat(ui): add AI profile execution button component"
```

---

## Task 17: Integrate AI Profiles into NoteEditor

**Files:**
- Modify: `src/components/NoteEditor.tsx`

**Step 1: Add AI profiles to NoteEditor**

Read the current NoteEditor to understand structure:
```bash
head -100 src/components/NoteEditor.tsx
```

**Step 2: Add imports and hook**

Add to top of `src/components/NoteEditor.tsx`:

```typescript
import { useAIProfiles } from '@/hooks/useAIProfiles';
import { AIProfileButton } from './AIProfileButton';
```

Inside the component, add:

```typescript
  const { profiles } = useAIProfiles();

  // Find profiles that match note's tags
  const matchingProfiles = profiles.filter((profile) =>
    note.tags?.some((tag) => tag.id === profile.tag_id)
  );
```

**Step 3: Add AI profile section to UI**

Add this section after the markdown editor and before the button row:

```typescript
        {/* AI Profile Actions */}
        {matchingProfiles.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              AI Actions
            </h3>
            <div className="flex flex-col gap-2">
              {matchingProfiles.map((profile) => (
                <AIProfileButton
                  key={profile.id}
                  profile={profile}
                  noteId={note.id}
                  onSuccess={() => {
                    // Reload note to see AI response
                    onSave();
                  }}
                />
              ))}
            </div>
          </div>
        )}
```

**Step 4: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 5: Test manually**

Run dev server:
```bash
npm run dev
```

Navigate to a note with tags and verify AI profile buttons appear.

**Step 6: Commit**

```bash
git add src/components/NoteEditor.tsx
git commit -m "feat(ui): integrate AI profile buttons into NoteEditor"
```

---

## Task 18: Add Toast Notifications

**Files:**
- Modify: `src/components/AIProfileButton.tsx`
- Verify: `package.json` has `react-hot-toast`

**Step 1: Check if react-hot-toast is installed**

Run:
```bash
npm list react-hot-toast
```

Expected: Should be installed (already in dependencies)

**Step 2: Add toast to AIProfileButton**

Update `src/components/AIProfileButton.tsx`:

```typescript
import toast from 'react-hot-toast';

// In handleExecute after successful response:
      toast.success(`AI profile "${profile.name}" executed successfully!`);
      onSuccess();

// In catch block:
      toast.error(err.message);
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/components/AIProfileButton.tsx
git commit -m "feat(ui): add toast notifications for AI profile execution"
```

---

## Task 19: Add Replace Output Behavior

**Files:**
- Modify: `src/app/api/profiles/[id]/execute/route.ts`

**Step 1: Add replace mode to output handling**

Update `src/app/api/profiles/[id]/execute/route.ts` output section:

```typescript
    else if (profile.output_behavior === 'replace') {
      // Replace note content with AI response
      const { error: updateError } = await supabase
        .from('notes')
        .update({
          content: aiResponse.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update note:', updateError);
        return NextResponse.json(
          { error: 'Failed to replace note content' },
          { status: 500 }
        );
      }
    }
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/profiles/[id]/execute/route.ts
git commit -m "feat(api): add replace output behavior"
```

---

## Task 20: Build and Test

**Files:**
- None (testing phase)

**Step 1: Run full build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors (warnings OK)

**Step 2: Start production build**

Run:
```bash
npm run start
```

Expected: Server starts on port 3000

**Step 3: Manual testing checklist**

Test these scenarios:
1. Create an AI profile in settings with a tag (e.g., #test)
2. Add OpenAI or Anthropic API key in settings
3. Create a note with content
4. Add the tag (#test) to the note
5. Verify "Run: [Profile Name]" button appears
6. Click button and verify:
   - Loading state shows
   - Success toast appears
   - Content is appended/new note created based on config
7. Check ai_executions table for logged execution
8. Test error scenarios (invalid API key, empty content, etc.)

**Step 4: Commit any fixes from testing**

If bugs found, fix and commit:
```bash
git add .
git commit -m "fix: resolve [issue description]"
```

---

## Task 21: Create README for AI Features

**Files:**
- Create: `docs/ai-profiles-usage.md`

**Step 1: Create usage documentation**

Create `docs/ai-profiles-usage.md`:

```markdown
# AI Profiles Usage Guide

## Overview

AI Profiles allow you to automatically or manually execute AI prompts on your notes using OpenAI or Anthropic Claude.

## Setup

1. **Add API Keys**
   - Go to Settings > AI Configuration
   - Add your OpenAI API key (starts with `sk-`)
   - Or add your Anthropic API key (starts with `sk-ant-`)
   - Keys are encrypted and stored securely

2. **Create AI Profile**
   - Go to Settings > AI Profiles
   - Click "Create New Profile"
   - Fill in:
     - Name: Descriptive name (e.g., "YouTube Summarizer")
     - Tag: Which tag triggers this profile (e.g., #youtube)
     - AI Provider: OpenAI or Claude
     - Model: Select model (GPT-4, Claude 3.5, etc.)
     - System Prompt: AI behavior (e.g., "You are a helpful summarizer")
     - User Prompt: What to do with note (e.g., "Summarize: {note_content}")
     - Trigger Mode: Manual (click button)
     - Output: Append or create new note

## Usage

1. **Create or open a note**
2. **Add content** you want AI to process
3. **Add the tag** associated with your AI profile (e.g., #youtube)
4. **Click "▶ Run: [Profile Name]"** button
5. **Wait** for AI to process (loading indicator shows)
6. **Result** appears based on output behavior:
   - Append: AI response added to note
   - New Note: New note created with AI response

## Prompt Variables

Use these variables in your prompts:
- `{note_title}` - Replaced with note title
- `{note_content}` - Replaced with note content
- `{tags}` - Replaced with comma-separated tags

Example:
```
Summarize this YouTube transcript:

Title: {note_title}
Content: {note_content}
```

## Token Costs

Each execution logs tokens used:
- Check Settings > AI Profiles > View Executions
- OpenAI: ~$0.03 per 1K tokens (GPT-4)
- Anthropic: ~$0.015 per 1K tokens (Claude 3.5)

## Troubleshooting

- **"Invalid API key"**: Check your API key in settings
- **"Rate limit exceeded"**: Wait and try again
- **"Content too large"**: Reduce note size or use cheaper model
- **Button not showing**: Verify tag matches profile and profile is active
```

**Step 2: Commit**

```bash
git add docs/ai-profiles-usage.md
git commit -m "docs: add AI profiles usage guide"
```

---

## Task 22: Final Build and Cleanup

**Files:**
- All

**Step 1: Run final build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 2: Check git status**

Run:
```bash
git status
```

Expected: Working directory clean (all changes committed)

**Step 3: View commit history**

Run:
```bash
git log --oneline -10
```

Expected: See all commits from this implementation

**Step 4: Push branch**

Run:
```bash
git push -u origin feature/ai-profile-execution
```

Expected: Branch pushed to remote

---

## Testing Checklist

- [ ] OpenAI execution works with append mode
- [ ] OpenAI execution works with new_note mode
- [ ] Anthropic execution works with append mode
- [ ] Anthropic execution works with new_note mode
- [ ] Replace mode works correctly
- [ ] Invalid API key shows proper error
- [ ] Missing API key shows proper error
- [ ] Rate limit error handled gracefully
- [ ] Token tracking logged correctly
- [ ] Execution time tracked correctly
- [ ] Failed executions logged with error message
- [ ] UI shows loading state during execution
- [ ] UI shows success toast after completion
- [ ] UI shows error toast on failure
- [ ] Multiple AI profiles can exist for different tags
- [ ] Button only shows when note has matching tag
- [ ] Prompt variables substitute correctly
- [ ] New notes inherit tags from original note
- [ ] Build completes without errors

---

## Future Enhancements (Not in This Plan)

- Automatic trigger mode (execute on tag add)
- Streaming AI responses
- Background job queue for long-running tasks
- Voice transcription integration
- AI execution history UI
- Token usage analytics dashboard
- Retry logic for failed executions
- Multiple profiles per tag with selection UI

---

## Success Criteria

✅ User can create AI profiles in settings
✅ User can add API keys (encrypted storage)
✅ User can execute AI profiles via button in note editor
✅ AI responses append to note or create new note
✅ Executions are logged to database with token tracking
✅ Error handling provides clear feedback
✅ Build completes without errors
✅ Documentation explains usage

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { executeAIRequest } from '@/lib/ai/executor';
import { substitutePromptVariables } from '@/lib/ai/prompt-template';
import { AIExecutionError } from '@/lib/ai/types';
import type { PromptVariables } from '@/lib/ai/types';
import type { User } from '@supabase/supabase-js';

interface RequestBody {
  noteId: string;
}

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

function getEncryptionKey(): string {
  const key = process.env.API_KEY_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('API_KEY_ENCRYPTION_KEY environment variable is not configured.');
  }
  if (key.length < 32) {
    throw new Error('API_KEY_ENCRYPTION_KEY must be at least 32 characters long.');
  }
  return key;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const supabase = await createClient();
  let user: User | null = null;
  let body: RequestBody | null = null;
  const { id: profileId } = await params;

  try {
    // Check authentication
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    user = authUser;

    // Parse request body
    body = await request.json();

    if (!body || !body.noteId) {
      return NextResponse.json(
        { error: 'noteId is required' },
        { status: 400 }
      );
    }

    const { noteId } = body;

    // Task 8: Fetch Data
    // Fetch AI profile
    const { data: profile, error: profileError } = await supabase
      .from('ai_profiles')
      .select('*, tags(*)')
      .eq('id', profileId)
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

    // Task 9: Decrypt API Key
    const encryptionKey = getEncryptionKey();
    const { data: decryptedKeyResult, error: decryptError } = await supabase
      .rpc('decrypt_api_key', {
        encrypted_value: encryptedApiKey,
        encryption_key: encryptionKey
      });

    if (decryptError || !decryptedKeyResult) {
      console.error('Decryption error:', decryptError);
      return NextResponse.json(
        { error: 'Failed to decrypt API key' },
        { status: 500 }
      );
    }

    const apiKey = decryptedKeyResult;

    // Task 10: Execute AI
    // Prepare prompt variables
    const tags = note.note_tags?.map((nt: { tags: { name: string } }) => nt.tags.name).join(', ') || '';
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
        // Task 14: Log failed execution
        await supabase.from('ai_executions').insert({
          user_id: user.id,
          profile_id: profileId,
          note_id: noteId,
          ai_provider: profile.ai_provider,
          model: profile.model,
          tokens_used: 0,
          execution_time_ms: Date.now() - startTime,
          status: 'failed',
          error_message: error.message,
          created_at: new Date().toISOString(),
        });

        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      throw error;
    }

    const executionTimeMs = Date.now() - startTime;

    // Task 11, 12: Handle Output
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
    } else if (profile.output_behavior === 'new_note') {
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
        const tagInserts = note.note_tags.map((nt: { tags: { id: string } }) => ({
          note_id: newNote.id,
          tag_id: nt.tags.id,
        }));

        await supabase.from('note_tags').insert(tagInserts);
      }
    } else if (profile.output_behavior === 'replace') {
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

    // Task 13: Log Execution
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
  } catch (error) {
    const err = error as { message?: string; statusCode?: number };
    console.error('AI execution error:', error);

    // Task 14: Log failed execution if we have profile/note IDs
    if (user && profileId && body?.noteId) {
      await supabase.from('ai_executions').insert({
        user_id: user.id,
        profile_id: profileId,
        note_id: body.noteId,
        ai_provider: 'openai', // Default since we don't have profile data
        model: 'unknown',
        tokens_used: 0,
        execution_time_ms: 0,
        status: 'failed',
        error_message: err.message || 'Unknown error',
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: err.statusCode || 500 }
    );
  }
}

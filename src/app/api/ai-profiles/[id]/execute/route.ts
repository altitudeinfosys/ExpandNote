import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { executeOpenAI } from '@/lib/ai/openai';
import { executeAnthropic } from '@/lib/ai/anthropic';
import { substitutePromptVariables } from '@/lib/ai/prompt-template';
import { decryptApiKey } from '@/lib/encryption';
import { AIProviderError, MODEL_TOKEN_LIMITS } from '@/lib/ai/types';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeAIOutput } from '@/lib/sanitize';
import type { AIProvider, OutputBehavior } from '@/types';

interface ExecuteRequestBody {
  noteId: string;
}

/**
 * POST /api/ai-profiles/:id/execute
 * Execute an AI profile on a specific note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: profileId } = await params;

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit (10 requests per minute per user)
    if (!checkRateLimit(user.id, 10, 60000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body: ExecuteRequestBody = await request.json();
    const { noteId } = body;

    if (!noteId) {
      return NextResponse.json({ error: 'noteId is required' }, { status: 400 });
    }

    // Fetch AI profile
    const { data: profile, error: profileError } = await supabase
      .from('ai_profiles')
      .select(`
        *,
        tags (
          id,
          name
        )
      `)
      .eq('id', profileId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'AI profile not found' }, { status: 404 });
    }

    // Check if profile is active
    if (!profile.is_active) {
      return NextResponse.json({ error: 'AI profile is not active' }, { status: 400 });
    }

    // Validate profile configuration
    if (!profile.ai_provider || !profile.model) {
      return NextResponse.json(
        { error: 'AI profile is missing provider or model configuration' },
        { status: 400 }
      );
    }

    if (!profile.system_prompt && !profile.user_prompt_template) {
      return NextResponse.json(
        { error: 'AI profile must have at least a system prompt or user prompt template' },
        { status: 400 }
      );
    }

    // Fetch note with tags
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select(`
        *,
        note_tags!inner (
          tags (
            id,
            name
          )
        )
      `)
      .eq('id', noteId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Extract tag names from the nested structure
    const tagNames = note.note_tags?.map((nt: { tags: { name: string } }) => nt.tags.name) || [];

    // Get user's API keys (encrypted)
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('openai_api_key_encrypted, claude_api_key_encrypted')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'User settings not found. Please configure your API keys in settings.' },
        { status: 400 }
      );
    }

    // Get the appropriate API key based on provider
    const provider = profile.ai_provider as AIProvider;
    let encryptedApiKey: string | null = null;

    if (provider === 'openai') {
      encryptedApiKey = settings.openai_api_key_encrypted;
    } else if (provider === 'claude') {
      encryptedApiKey = settings.claude_api_key_encrypted;
    }

    if (!encryptedApiKey) {
      return NextResponse.json(
        { error: `${provider === 'openai' ? 'OpenAI' : 'Claude'} API key not configured. Please add it in settings.` },
        { status: 400 }
      );
    }

    // Decrypt API key using encryption library
    const apiKey = await decryptApiKey(encryptedApiKey);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Failed to decrypt API key. It may be corrupted or invalid.' },
        { status: 500 }
      );
    }

    // Prepare prompt variables
    const promptVariables = {
      note_title: note.title || 'Untitled',
      note_content: note.content || '',
      tags: tagNames,
    };

    // Substitute variables in prompts
    const systemPrompt = substitutePromptVariables(
      profile.system_prompt || '',
      promptVariables
    );
    const userPrompt = substitutePromptVariables(
      profile.user_prompt_template || '',
      promptVariables
    );

    // Validate content size (estimate tokens: ~4 chars per token)
    const estimatedTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
    const modelLimit = MODEL_TOKEN_LIMITS[profile.model as keyof typeof MODEL_TOKEN_LIMITS];

    if (modelLimit && estimatedTokens > modelLimit * 0.7) {
      return NextResponse.json(
        {
          error: `Content too large for ${profile.model}. Estimated ${estimatedTokens} tokens, limit is ${Math.floor(modelLimit * 0.7)} tokens (70% of ${modelLimit} to reserve space for output).`,
        },
        { status: 400 }
      );
    }

    // Execute AI request
    let aiResponse: string;
    let tokensUsed = 0;

    try {
      // Execute AI based on provider
      if (provider === 'openai') {
        const response = await executeOpenAI({
          systemPrompt,
          userPrompt,
          model: profile.model,
          apiKey,
        });
        aiResponse = response.content;
        tokensUsed = response.tokensUsed;
      } else if (provider === 'claude') {
        const response = await executeAnthropic({
          systemPrompt,
          userPrompt,
          model: profile.model,
          apiKey,
        });
        aiResponse = response.content;
        tokensUsed = response.tokensUsed;
      } else {
        return NextResponse.json(
          { error: 'Unsupported AI provider' },
          { status: 400 }
        );
      }

      // Sanitize AI response to prevent XSS attacks
      const sanitizedResponse = sanitizeAIOutput(aiResponse);

      // Handle output behavior
      const outputBehavior = profile.output_behavior as OutputBehavior;
      let resultNoteId = noteId;

      if (outputBehavior === 'append') {
        // Append AI response to existing note
        const newContent = note.content + '\n\n' + sanitizedResponse;
        const { error: updateError } = await supabase
          .from('notes')
          .update({
            content: newContent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', noteId)
          .eq('user_id', user.id);

        if (updateError) {
          throw new Error('Failed to update note with AI response');
        }
      } else if (outputBehavior === 'replace') {
        // Replace note content with AI response
        const { error: updateError } = await supabase
          .from('notes')
          .update({
            content: sanitizedResponse,
            updated_at: new Date().toISOString(),
          })
          .eq('id', noteId)
          .eq('user_id', user.id);

        if (updateError) {
          throw new Error('Failed to replace note content');
        }
      } else if (outputBehavior === 'new_note') {
        // Create a new note with AI response
        const newNoteTitle = profile.output_title_template
          ? substitutePromptVariables(profile.output_title_template, promptVariables)
          : `${note.title || 'Untitled'} - AI Output`;

        const { data: newNote, error: createError } = await supabase
          .from('notes')
          .insert({
            user_id: user.id,
            title: newNoteTitle,
            content: sanitizedResponse,
          })
          .select()
          .single();

        if (createError || !newNote) {
          throw new Error('Failed to create new note');
        }

        resultNoteId = newNote.id;

        // Copy tags from original note to new note
        if (tagNames.length > 0) {
          const { data: tags } = await supabase
            .from('tags')
            .select('id, name')
            .eq('user_id', user.id)
            .in('name', tagNames);

          if (tags && tags.length > 0) {
            const noteTags = tags.map(tag => ({
              note_id: newNote.id,
              tag_id: tag.id,
            }));

            await supabase.from('note_tags').insert(noteTags);
          }
        }
      }

      // Log successful execution
      await supabase.from('ai_executions').insert({
        user_id: user.id,
        profile_id: profileId,
        note_id: noteId,
        ai_provider: provider,
        model: profile.model,
        status: 'success',
        tokens_used: tokensUsed,
      });

      return NextResponse.json({
        success: true,
        noteId: resultNoteId,
        tokensUsed,
        outputBehavior,
      });
    } catch (error) {
      // Log failed execution
      let errorMessage = 'Unknown error';
      let errorCode: string | undefined;

      if (error instanceof AIProviderError) {
        errorMessage = error.message;
        errorCode = error.code;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      await supabase.from('ai_executions').insert({
        user_id: user.id,
        profile_id: profileId,
        note_id: noteId,
        ai_provider: provider,
        model: profile.model,
        status: 'failed',
        error_message: errorMessage,
      });

      console.error('AI execution failed:', error);
      return NextResponse.json(
        {
          error: errorMessage,
          code: errorCode,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/ai-profiles/:id/execute:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

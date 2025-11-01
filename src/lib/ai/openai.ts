import OpenAI from 'openai';
import type { AIExecutionRequest, AIExecutionResponse } from './types';
import { AIExecutionError } from './types';

/**
 * Execute AI request using OpenAI API
 */
export async function executeOpenAI(
  request: AIExecutionRequest
): Promise<AIExecutionResponse> {
  // Input validation
  if (!request.apiKey || request.apiKey.trim() === '') {
    throw new AIExecutionError(
      'OpenAI API key is required',
      'INVALID_API_KEY',
      400
    );
  }
  if (!request.model || request.model.trim() === '') {
    throw new AIExecutionError(
      'Model is required',
      'INVALID_MODEL',
      400
    );
  }

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

    // Handle empty content
    if (!content || content.trim() === '') {
      throw new AIExecutionError(
        'OpenAI returned empty response',
        'EMPTY_RESPONSE',
        500
      );
    }

    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      content,
      tokensUsed,
      model: completion.model,
    };
  } catch (error: unknown) {
    // Handle OpenAI-specific errors
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const statusError = error as { status: number };
      if (statusError.status === 401) {
        throw new AIExecutionError(
          'Invalid OpenAI API key',
          'INVALID_API_KEY',
          401
        );
      }
      if (statusError.status === 429) {
        throw new AIExecutionError(
          'OpenAI rate limit exceeded. Please try again later.',
          'RATE_LIMIT_EXCEEDED',
          429
        );
      }
    }
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const codeError = error as { code: string };
      if (codeError.code === 'context_length_exceeded') {
        throw new AIExecutionError(
          'Content too large for this model',
          'TOKEN_LIMIT_EXCEEDED',
          400
        );
      }
    }

    // Generic error
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : 'OpenAI API request failed';

    throw new AIExecutionError(
      message,
      'AI_EXECUTION_FAILED',
      500
    );
  }
}

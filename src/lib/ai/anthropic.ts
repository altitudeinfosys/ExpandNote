import Anthropic from '@anthropic-ai/sdk';
import type { AIExecutionRequest, AIExecutionResponse } from './types';
import { AIExecutionError } from './types';

/**
 * Execute AI request using Anthropic Claude API
 */
export async function executeAnthropic(
  request: AIExecutionRequest
): Promise<AIExecutionResponse> {
  // Input validation
  if (!request.apiKey || request.apiKey.trim() === '') {
    throw new AIExecutionError(
      'Anthropic API key is required',
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

    // Handle empty content
    if (!content || content.trim() === '') {
      throw new AIExecutionError(
        'Anthropic returned empty response',
        'EMPTY_RESPONSE',
        500
      );
    }

    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

    return {
      content,
      tokensUsed,
      model: message.model,
    };
  } catch (error: unknown) {
    // Handle Anthropic-specific errors
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const statusError = error as { status: number };
      if (statusError.status === 401) {
        throw new AIExecutionError(
          'Invalid Anthropic API key',
          'INVALID_API_KEY',
          401
        );
      }
      if (statusError.status === 429) {
        throw new AIExecutionError(
          'Anthropic rate limit exceeded. Please try again later.',
          'RATE_LIMIT_EXCEEDED',
          429
        );
      }
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error
    ) {
      const typeError = error as { type: string; message: string };
      if (
        typeError.type === 'invalid_request_error' &&
        typeError.message?.includes('max_tokens')
      ) {
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
        : 'Anthropic API request failed';

    throw new AIExecutionError(
      message,
      'AI_EXECUTION_FAILED',
      500
    );
  }
}

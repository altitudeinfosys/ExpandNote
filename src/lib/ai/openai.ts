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

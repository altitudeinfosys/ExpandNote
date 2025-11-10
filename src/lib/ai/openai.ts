/**
 * OpenAI GPT integration handler
 */

import OpenAI from 'openai';
import { AIExecutionRequest, AIExecutionResponse, AIProviderError } from './types';

/**
 * Execute an AI request using OpenAI's GPT models
 * @param request - The execution request with prompts and configuration
 * @returns The AI response with content and token usage
 * @throws AIProviderError on API errors
 */
export async function executeOpenAI(
  request: AIExecutionRequest
): Promise<AIExecutionResponse> {
  try {
    // Validate API key format
    if (!request.apiKey || request.apiKey.trim() === '') {
      throw new AIProviderError('OpenAI API key is empty or invalid', {
        provider: 'openai',
        code: 'INVALID_API_KEY',
      });
    }

    // Initialize OpenAI client with user's API key
    const client = new OpenAI({
      apiKey: request.apiKey,
    });

    // Construct messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: request.systemPrompt,
      },
      {
        role: 'user',
        content: request.userPrompt,
      },
    ];

    // Call OpenAI Chat Completions API
    const completion = await client.chat.completions.create({
      model: request.model,
      messages,
      temperature: 0.7,
      max_tokens: 4000, // Reasonable default for note content
    });

    // Extract response content
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new AIProviderError('OpenAI returned empty response', {
        provider: 'openai',
        code: 'EMPTY_RESPONSE',
      });
    }

    // Get token usage
    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      content,
      tokensUsed,
      model: request.model,
    };
  } catch (error) {
    // Handle OpenAI-specific errors
    if (error instanceof OpenAI.APIError) {
      throw new AIProviderError(
        `OpenAI API Error: ${error.message}`,
        {
          provider: 'openai',
          code: error.code || 'API_ERROR',
          statusCode: error.status,
        }
      );
    }

    // Handle general errors
    if (error instanceof Error) {
      throw new AIProviderError(
        `OpenAI execution failed: ${error.message}`,
        {
          provider: 'openai',
        }
      );
    }

    // Unknown error
    throw new AIProviderError('Unknown error during OpenAI execution', {
      provider: 'openai',
    });
  }
}

/**
 * Estimate token count for a text string
 * Useful for pre-validation and cost estimation
 * @param text - The text to count tokens for
 * @param model - The model to use for tokenization
 * @returns Approximate token count
 */
export function estimateTokens(text: string, model: string): number {
  // Simple estimation: 1 token ≈ 4 characters for English text
  // This is a rough approximation but avoids tiktoken dependency issues in serverless
  return Math.ceil(text.length / 4);
}

/**
 * Validate if the model name is a supported OpenAI model
 * @param model - The model identifier
 * @returns True if the model is supported
 */
export function isSupportedOpenAIModel(model: string): boolean {
  const supportedModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
  ];

  return supportedModels.includes(model);
}

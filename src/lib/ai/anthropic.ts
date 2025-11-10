/**
 * Anthropic Claude integration handler
 */

import Anthropic from '@anthropic-ai/sdk';
import { AIExecutionRequest, AIExecutionResponse, AIProviderError } from './types';

/**
 * Execute an AI request using Anthropic's Claude models
 * @param request - The execution request with prompts and configuration
 * @returns The AI response with content and token usage
 * @throws AIProviderError on API errors
 */
export async function executeAnthropic(
  request: AIExecutionRequest
): Promise<AIExecutionResponse> {
  try {
    // Initialize Anthropic client with user's API key
    const client = new Anthropic({
      apiKey: request.apiKey,
    });

    // Call Anthropic Messages API
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
      temperature: 0.7,
    });

    // Extract response content
    const contentBlock = message.content[0];
    if (!contentBlock || contentBlock.type !== 'text') {
      throw new AIProviderError('Anthropic returned empty or invalid response', {
        provider: 'anthropic',
        code: 'EMPTY_RESPONSE',
      });
    }

    const content = contentBlock.text;

    // Calculate total tokens used
    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

    return {
      content,
      tokensUsed,
      model: request.model,
    };
  } catch (error) {
    // Handle Anthropic-specific errors
    if (error instanceof Anthropic.APIError) {
      throw new AIProviderError(
        `Anthropic API Error: ${error.message}`,
        {
          provider: 'anthropic',
          code: error.error?.type || 'API_ERROR',
          statusCode: error.status,
        }
      );
    }

    // Handle general errors
    if (error instanceof Error) {
      throw new AIProviderError(
        `Anthropic execution failed: ${error.message}`,
        {
          provider: 'anthropic',
        }
      );
    }

    // Unknown error
    throw new AIProviderError('Unknown error during Anthropic execution', {
      provider: 'anthropic',
    });
  }
}

/**
 * Estimate token count for Claude models
 * Claude uses a similar tokenization to GPT models
 * @param text - The text to count tokens for
 * @returns Approximate token count
 */
export function estimateClaudeTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  // This is an approximation; actual tokenization may vary
  return Math.ceil(text.length / 4);
}

/**
 * Validate if the model name is a supported Claude model
 * @param model - The model identifier
 * @returns True if the model is supported
 */
export function isSupportedClaudeModel(model: string): boolean {
  const supportedModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

  return supportedModels.includes(model);
}

/**
 * Get the maximum token limit for a Claude model
 * @param model - The model identifier
 * @returns Maximum output tokens allowed
 */
export function getClaudeMaxTokens(model: string): number {
  // All Claude 3 models support up to 4096 output tokens
  // But we can request higher context windows for input
  if (model.startsWith('claude-3')) {
    return 4096;
  }

  // Default conservative limit
  return 4000;
}

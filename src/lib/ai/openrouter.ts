/**
 * OpenRouter integration handler
 * OpenRouter provides unified access to multiple AI models through an OpenAI-compatible API
 */

import OpenAI from 'openai';
import { AIExecutionRequest, AIExecutionResponse, AIProviderError } from './types';

/**
 * Sanitize text to ensure it only contains valid ASCII characters
 * Replaces common problematic characters with their ASCII equivalents
 * @param text - The text to sanitize
 * @returns Sanitized text safe for API transmission
 */
function sanitizeText(text: string): string {
  return text
    // Replace smart quotes with regular quotes
    .replace(/[\u201C\u201D]/g, '"')  // " and "
    .replace(/[\u2018\u2019]/g, "'")  // ' and '
    // Replace ellipsis with three periods
    .replace(/\u2026/g, '...')  // …
    // Replace em dash and en dash with regular dash
    .replace(/[\u2013\u2014]/g, '-')  // – and —
    // Remove any remaining non-ASCII characters
    .replace(/[^\x00-\x7F]/g, '');
}

/**
 * Available OpenRouter models with their display names
 * Used for model selection dropdowns in UI components
 * Updated: 2025-01 with current OpenRouter model IDs
 */
export const OPENROUTER_MODELS = [
  // Anthropic models via OpenRouter
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5' },
  // OpenAI models via OpenRouter
  { id: 'openai/gpt-5.1', name: 'GPT-5.1' },
  { id: 'openai/gpt-5.1-chat', name: 'GPT-5.1 Chat' },
  { id: 'openai/gpt-5-pro', name: 'GPT-5 Pro' },
  { id: 'openai/o3-deep-research', name: 'o3 Deep Research' },
  { id: 'openai/o4-mini-deep-research', name: 'o4 Mini Deep Research' },
  // Google Gemini models
  { id: 'google/gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash' },
  { id: 'google/gemini-2.5-flash-lite-preview-09-2025', name: 'Gemini 2.5 Flash Lite' },
  { id: 'google/gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image' },
  // Meta Llama models
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', name: 'Llama 3.3 Nemotron 49B' },
  // Mistral models
  { id: 'mistralai/voxtral-small-24b-2507', name: 'Voxtral Small 24B' },
  // DeepSeek models
  { id: 'deepseek/deepseek-v3.2-exp', name: 'DeepSeek V3.2' },
  { id: 'deepseek/deepseek-v3.1-terminus', name: 'DeepSeek V3.1 Terminus' },
  // Qwen models
  { id: 'qwen/qwen3-max', name: 'Qwen3 Max' },
  { id: 'qwen/qwen3-coder-plus', name: 'Qwen3 Coder Plus' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct', name: 'Qwen3 Next 80B' },
  { id: 'qwen/qwen-plus-2025-07-28', name: 'Qwen Plus' },
] as const;

/**
 * Execute an AI request using OpenRouter's unified API
 * OpenRouter supports models from OpenAI, Anthropic, Meta, Google, and more
 * @param request - The execution request with prompts and configuration
 * @returns The AI response with content and token usage
 * @throws AIProviderError on API errors
 */
export async function executeOpenRouter(
  request: AIExecutionRequest
): Promise<AIExecutionResponse> {
  try {
    // Validate API key format
    if (!request.apiKey || request.apiKey.trim() === '') {
      throw new AIProviderError('OpenRouter API key is empty or invalid', {
        provider: 'openrouter',
        code: 'INVALID_API_KEY',
      });
    }

    // Sanitize API key and prompts to remove non-ASCII characters
    const sanitizedApiKey = sanitizeText(request.apiKey.trim());
    const sanitizedSystemPrompt = sanitizeText(request.systemPrompt);
    const sanitizedUserPrompt = sanitizeText(request.userPrompt);

    // Check if API key is still valid after sanitization
    if (!sanitizedApiKey || sanitizedApiKey === '') {
      console.error('OpenRouter API key validation failed:', {
        originalLength: request.apiKey.length,
        sanitizedLength: sanitizedApiKey.length,
        originalKey: request.apiKey.substring(0, 10) + '...',
      });
      throw new AIProviderError('OpenRouter API key is invalid or contains too many special characters. Please re-enter your API key from OpenRouter dashboard.', {
        provider: 'openrouter',
        code: 'INVALID_API_KEY',
      });
    }

    // Log API key info for debugging (first 10 chars only)
    console.log('OpenRouter API key validation:', {
      originalLength: request.apiKey.length,
      sanitizedLength: sanitizedApiKey.length,
      prefix: sanitizedApiKey.substring(0, 10),
    });

    // Initialize OpenAI client with OpenRouter configuration
    // OpenRouter uses an OpenAI-compatible API
    const client = new OpenAI({
      apiKey: sanitizedApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://expandnote.app', // Optional: for rankings on openrouter.ai
        'X-Title': 'ExpandNote', // Optional: shows in logs on openrouter.ai
      },
    });

    // Construct messages array with sanitized prompts
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: sanitizedSystemPrompt,
      },
      {
        role: 'user',
        content: sanitizedUserPrompt,
      },
    ];

    // Call OpenRouter Chat Completions API
    const completion = await client.chat.completions.create({
      model: request.model,
      messages,
      temperature: 0.7,
      max_tokens: 4000, // Reasonable default for note content
    });

    // Extract response content
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new AIProviderError('OpenRouter returned empty response', {
        provider: 'openrouter',
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
    // Handle OpenAI-compatible API errors (OpenRouter uses same error format)
    if (error instanceof OpenAI.APIError) {
      throw new AIProviderError(
        `OpenRouter API Error: ${error.message}`,
        {
          provider: 'openrouter',
          code: error.code || 'API_ERROR',
          statusCode: error.status,
        }
      );
    }

    // Handle general errors
    if (error instanceof Error) {
      throw new AIProviderError(
        `OpenRouter execution failed: ${error.message}`,
        {
          provider: 'openrouter',
        }
      );
    }

    // Unknown error
    throw new AIProviderError('Unknown error during OpenRouter execution', {
      provider: 'openrouter',
    });
  }
}

/**
 * Estimate token count for a text string
 * Useful for pre-validation and cost estimation
 * @param text - The text to count tokens for
 * @returns Approximate token count
 */
export function estimateOpenRouterTokens(text: string): number {
  // Simple estimation: 1 token ≈ 4 characters for English text
  // This is a rough approximation but avoids tokenization library dependencies
  return Math.ceil(text.length / 4);
}

/**
 * Validate if the model name is a supported OpenRouter model
 * @param model - The model identifier (e.g., "anthropic/claude-3.5-sonnet")
 * @returns True if the model is supported
 */
export function isSupportedOpenRouterModel(model: string): boolean {
  return OPENROUTER_MODELS.some(m => m.id === model);
}

/**
 * Get the maximum token limit for an OpenRouter model
 * @param model - The model identifier
 * @returns Maximum output tokens allowed
 */
export function getOpenRouterMaxTokens(model: string): number {
  // Model-specific max tokens based on known limits
  const maxTokensMap: Record<string, number> = {
    // Anthropic models
    'anthropic/claude-sonnet-4.5': 8192,
    'anthropic/claude-haiku-4.5': 8192,
    // OpenAI models
    'openai/gpt-5.1': 16384,
    'openai/gpt-5.1-chat': 16384,
    'openai/gpt-5-pro': 16384,
    'openai/o3-deep-research': 32768,
    'openai/o4-mini-deep-research': 16384,
    // Google Gemini models
    'google/gemini-2.5-flash-preview-09-2025': 8192,
    'google/gemini-2.5-flash-lite-preview-09-2025': 8192,
    'google/gemini-2.5-flash-image': 8192,
    // Meta Llama models
    'nvidia/llama-3.3-nemotron-super-49b-v1.5': 8192,
    // Mistral models
    'mistralai/voxtral-small-24b-2507': 8192,
    // DeepSeek models
    'deepseek/deepseek-v3.2-exp': 8192,
    'deepseek/deepseek-v3.1-terminus': 8192,
    // Qwen models
    'qwen/qwen3-max': 8192,
    'qwen/qwen3-coder-plus': 8192,
    'qwen/qwen3-next-80b-a3b-instruct': 8192,
    'qwen/qwen-plus-2025-07-28': 8192,
  };

  // Return specific limit if known, otherwise default to 4000
  return maxTokensMap[model] || 4000;
}

/**
 * Get a user-friendly display name for an OpenRouter model
 * @param model - The model identifier (e.g., "anthropic/claude-3.5-sonnet")
 * @returns Human-readable model name
 */
export function getOpenRouterModelDisplayName(model: string): string {
  // Use the OPENROUTER_MODELS constant for display names
  const found = OPENROUTER_MODELS.find(m => m.id === model);
  return found ? found.name : model;
}

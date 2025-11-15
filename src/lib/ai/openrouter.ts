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
 */
export const OPENROUTER_MODELS = [
  // Anthropic models via OpenRouter
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
  // OpenAI models via OpenRouter
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'openai/gpt-4', name: 'GPT-4' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  // Meta Llama models
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
  // Google Gemini models
  { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5' },
  // Mistral models
  { id: 'mistralai/mistral-large', name: 'Mistral Large' },
  { id: 'mistralai/mistral-medium', name: 'Mistral Medium' },
  { id: 'mistralai/mistral-small', name: 'Mistral Small' },
  // DeepSeek models
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
  // Qwen models
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B' },
  { id: 'qwen/qwen-2.5-32b-instruct', name: 'Qwen 2.5 32B' },
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
      throw new AIProviderError('OpenRouter API key contains invalid characters. Please check for smart quotes, ellipsis, or other special characters.', {
        provider: 'openrouter',
        code: 'INVALID_API_KEY',
      });
    }

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
    // Anthropic models - all support up to 4096 output tokens
    'anthropic/claude-3.5-sonnet': 4096,
    'anthropic/claude-3.5-haiku': 4096,
    'anthropic/claude-3-opus': 4096,
    'anthropic/claude-3-sonnet': 4096,
    'anthropic/claude-3-haiku': 4096,
    // OpenAI models
    'openai/gpt-4o': 4096,
    'openai/gpt-4o-mini': 4096,
    'openai/gpt-4-turbo': 4096,
    'openai/gpt-4': 8192,
    'openai/gpt-3.5-turbo': 4096,
    // Meta Llama models
    'meta-llama/llama-3.3-70b-instruct': 8192,
    'meta-llama/llama-3.1-405b-instruct': 8192,
    'meta-llama/llama-3.1-70b-instruct': 8192,
    'meta-llama/llama-3.1-8b-instruct': 8192,
    // Google Gemini models
    'google/gemini-2.0-flash-exp': 8192,
    'google/gemini-pro-1.5': 8192,
    'google/gemini-flash-1.5': 8192,
    // Mistral models
    'mistralai/mistral-large': 8192,
    'mistralai/mistral-medium': 8192,
    'mistralai/mistral-small': 8192,
    // DeepSeek models
    'deepseek/deepseek-chat': 4096,
    // Qwen models
    'qwen/qwen-2.5-72b-instruct': 8192,
    'qwen/qwen-2.5-32b-instruct': 8192,
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
  const displayNames: Record<string, string> = {
    'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
    'anthropic/claude-3.5-haiku': 'Claude 3.5 Haiku',
    'anthropic/claude-3-opus': 'Claude 3 Opus',
    'anthropic/claude-3-sonnet': 'Claude 3 Sonnet',
    'anthropic/claude-3-haiku': 'Claude 3 Haiku',
    'openai/gpt-4o': 'GPT-4o',
    'openai/gpt-4o-mini': 'GPT-4o Mini',
    'openai/gpt-4-turbo': 'GPT-4 Turbo',
    'openai/gpt-4': 'GPT-4',
    'openai/gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3 70B',
    'meta-llama/llama-3.1-405b-instruct': 'Llama 3.1 405B',
    'meta-llama/llama-3.1-70b-instruct': 'Llama 3.1 70B',
    'meta-llama/llama-3.1-8b-instruct': 'Llama 3.1 8B',
    'google/gemini-2.0-flash-exp': 'Gemini 2.0 Flash',
    'google/gemini-pro-1.5': 'Gemini Pro 1.5',
    'google/gemini-flash-1.5': 'Gemini Flash 1.5',
    'mistralai/mistral-large': 'Mistral Large',
    'mistralai/mistral-medium': 'Mistral Medium',
    'mistralai/mistral-small': 'Mistral Small',
    'deepseek/deepseek-chat': 'DeepSeek Chat',
    'qwen/qwen-2.5-72b-instruct': 'Qwen 2.5 72B',
    'qwen/qwen-2.5-32b-instruct': 'Qwen 2.5 32B',
  };

  return displayNames[model] || model;
}

/**
 * OpenRouter integration handler
 * OpenRouter provides unified access to multiple AI models through an OpenAI-compatible API
 */

import OpenAI from 'openai';
import { AIExecutionRequest, AIExecutionResponse, AIProviderError } from './types';

/**
 * Normalize text by replacing problematic smart quotes and dashes
 * Preserves Unicode characters (emoji, international text, etc.)
 * @param text - The text to normalize
 * @returns Normalized text with smart quotes replaced
 */
function normalizeText(text: string): string {
  return text
    // Replace smart quotes with regular quotes
    .replace(/[\u201C\u201D]/g, '"')  // " and "
    .replace(/[\u2018\u2019]/g, "'")  // ' and '
    // Replace ellipsis with three periods
    .replace(/\u2026/g, '...')  // …
    // Replace em dash and en dash with regular dash
    .replace(/[\u2013\u2014]/g, '-');  // – and —
    // Note: Unicode characters (emoji, CJK, accents) are preserved
}

/**
 * Available OpenRouter models with their display names
 * Used for model selection dropdowns in UI components
 * Updated: 2025-11 with verified OpenRouter model IDs
 */
export const OPENROUTER_MODELS = [
  // Anthropic models via OpenRouter
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },

  // OpenAI models via OpenRouter
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },

  // Google Gemini models
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },

  // Meta Llama models
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },

  // Mistral models
  { id: 'mistralai/mistral-large', name: 'Mistral Large' },
  { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B' },

  // DeepSeek models
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
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

    // Get API key (no sanitization - API keys are alphanumeric)
    const apiKey = request.apiKey.trim();

    // Normalize prompts (replace smart quotes, preserve Unicode)
    const normalizedSystemPrompt = normalizeText(request.systemPrompt);
    const normalizedUserPrompt = normalizeText(request.userPrompt);

    // Initialize OpenAI client with OpenRouter configuration
    // OpenRouter uses an OpenAI-compatible API
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://expandnote.app', // Optional: for rankings on openrouter.ai
        'X-Title': 'ExpandNote', // Optional: shows in logs on openrouter.ai
      },
    });

    // Construct messages array with normalized prompts
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: normalizedSystemPrompt,
      },
      {
        role: 'user',
        content: normalizedUserPrompt,
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
    // Anthropic models - 200K context, 8K output
    'anthropic/claude-3.5-sonnet': 8192,
    'anthropic/claude-3-opus': 4096,
    'anthropic/claude-3-haiku': 4096,

    // OpenAI models
    'openai/gpt-4o': 16384,
    'openai/gpt-4o-mini': 16384,
    'openai/gpt-4-turbo': 4096,

    // Google Gemini models
    'google/gemini-pro-1.5': 8192,
    'google/gemini-2.5-pro': 8192,
    'google/gemini-2.5-flash': 8192,

    // Meta Llama models
    'meta-llama/llama-3.1-405b-instruct': 4096,
    'meta-llama/llama-3.1-70b-instruct': 4096,
    'meta-llama/llama-3.1-8b-instruct': 4096,

    // Mistral models
    'mistralai/mistral-large': 8192,
    'mistralai/mixtral-8x7b-instruct': 4096,

    // DeepSeek models
    'deepseek/deepseek-chat': 8192,
    'deepseek/deepseek-r1': 8192,
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

/**
 * Shared types for AI execution engine
 */

/**
 * Token limits for supported AI models
 * These are approximate context window sizes - reserve 30% for output
 */
export const MODEL_TOKEN_LIMITS = {
  // OpenAI models
  'gpt-4': 8192,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'gpt-3.5-turbo': 16385,
  // Anthropic models
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  // OpenRouter models (updated 2025-11 with verified models)
  'anthropic/claude-3.5-sonnet': 200000,
  'anthropic/claude-3-opus': 200000,
  'anthropic/claude-3-haiku': 200000,
  'openai/gpt-4o': 128000,
  'openai/gpt-4o-mini': 128000,
  'openai/gpt-4-turbo': 128000,
  'google/gemini-pro-1.5': 1000000,
  'google/gemini-2.5-pro': 1000000,
  'google/gemini-2.5-flash': 1000000,
  'meta-llama/llama-3.1-405b-instruct': 131072,
  'meta-llama/llama-3.1-70b-instruct': 131072,
  'meta-llama/llama-3.1-8b-instruct': 131072,
  'mistralai/mistral-large': 32768,
  'mistralai/mixtral-8x7b-instruct': 32768,
  'deepseek/deepseek-chat': 64000,
  'deepseek/deepseek-r1': 64000,
  // xAI Grok models
  'x-ai/grok-2-1212': 131072,
  'x-ai/grok-2-vision-1212': 32768,
  'x-ai/grok-3-beta': 131072,
} as const;

export type AIModel = keyof typeof MODEL_TOKEN_LIMITS;

export interface AIExecutionRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  apiKey: string;
}

export interface AIExecutionResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export interface AIExecutionError extends Error {
  code?: string;
  statusCode?: number;
  provider?: 'openai' | 'anthropic' | 'openrouter';
}

export class AIProviderError extends Error implements AIExecutionError {
  code?: string;
  statusCode?: number;
  provider?: 'openai' | 'anthropic' | 'openrouter';

  constructor(
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
      provider?: 'openai' | 'anthropic' | 'openrouter';
    }
  ) {
    super(message);
    this.name = 'AIProviderError';
    this.code = options?.code;
    this.statusCode = options?.statusCode;
    this.provider = options?.provider;
  }
}

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
  // OpenRouter models
  'anthropic/claude-3.5-sonnet': 200000,
  'anthropic/claude-3.5-haiku': 200000,
  'openai/gpt-4o': 128000,
  'openai/gpt-4o-mini': 128000,
  'openai/gpt-4-turbo': 128000,
  'meta-llama/llama-3.3-70b-instruct': 128000,
  'meta-llama/llama-3.1-405b-instruct': 128000,
  'google/gemini-2.0-flash-exp': 32000,
  'google/gemini-pro-1.5': 128000,
  'mistralai/mistral-large': 128000,
  'deepseek/deepseek-chat': 64000,
  'qwen/qwen-2.5-72b-instruct': 128000,
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

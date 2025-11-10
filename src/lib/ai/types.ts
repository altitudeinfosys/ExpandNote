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
  provider?: 'openai' | 'anthropic';
}

export class AIProviderError extends Error implements AIExecutionError {
  code?: string;
  statusCode?: number;
  provider?: 'openai' | 'anthropic';

  constructor(
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
      provider?: 'openai' | 'anthropic';
    }
  ) {
    super(message);
    this.name = 'AIProviderError';
    this.code = options?.code;
    this.statusCode = options?.statusCode;
    this.provider = options?.provider;
  }
}

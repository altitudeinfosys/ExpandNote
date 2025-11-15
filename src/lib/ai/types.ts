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
  // OpenRouter models (updated 2025-01)
  'anthropic/claude-sonnet-4.5': 200000,
  'anthropic/claude-haiku-4.5': 200000,
  'openai/gpt-5.1': 200000,
  'openai/gpt-5.1-chat': 200000,
  'openai/gpt-5-pro': 200000,
  'openai/o3-deep-research': 200000,
  'openai/o4-mini-deep-research': 128000,
  'google/gemini-2.5-flash-preview-09-2025': 128000,
  'google/gemini-2.5-flash-lite-preview-09-2025': 128000,
  'google/gemini-2.5-flash-image': 128000,
  'nvidia/llama-3.3-nemotron-super-49b-v1.5': 128000,
  'mistralai/voxtral-small-24b-2507': 128000,
  'deepseek/deepseek-v3.2-exp': 128000,
  'deepseek/deepseek-v3.1-terminus': 128000,
  'qwen/qwen3-max': 128000,
  'qwen/qwen3-coder-plus': 128000,
  'qwen/qwen3-next-80b-a3b-instruct': 128000,
  'qwen/qwen-plus-2025-07-28': 128000,
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

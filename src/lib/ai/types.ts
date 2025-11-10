/**
 * Shared types for AI execution engine
 */

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

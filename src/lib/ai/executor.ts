import type { AIProvider } from '@/types';
import type { AIExecutionRequest, AIExecutionResponse } from './types';
import { executeOpenAI } from './openai';
import { executeAnthropic } from './anthropic';
import { AIExecutionError } from './types';

/**
 * Execute AI request with the specified provider
 */
export async function executeAIRequest(
  provider: AIProvider,
  request: AIExecutionRequest
): Promise<AIExecutionResponse> {
  switch (provider) {
    case 'openai':
      return executeOpenAI(request);
    case 'claude':
      return executeAnthropic(request);
    default:
      throw new AIExecutionError(
        `Unsupported AI provider: ${provider}`,
        'INVALID_PROVIDER',
        400
      );
  }
}

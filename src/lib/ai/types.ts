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

export interface PromptVariables {
  note_title: string;
  note_content: string;
  tags: string;
}

export class AIExecutionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AIExecutionError';
  }
}

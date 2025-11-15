# OpenRouter Integration Design

## Overview

This document outlines the design and implementation of OpenRouter integration into ExpandNote. OpenRouter is a service that provides unified access to multiple AI models through a consistent API, including models from OpenAI, Anthropic, Google, Meta, Mistral, and others.

## Motivation

Integrating OpenRouter into ExpandNote offers several key benefits:

1. **Model Diversity**: Users gain access to dozens of AI models beyond just OpenAI and Claude.
2. **Cost Optimization**: OpenRouter can route requests to the most cost-effective provider.
3. **Reliability**: Provides fallback options if a specific provider is experiencing issues.
4. **Unified API**: Simplifies integration by using a standardized OpenAI-compatible API.

## Implementation Details

### 1. Database Schema Changes

Added OpenRouter support to the database schema:

```sql
-- Add openrouter to ai_provider constraint in ai_profiles table
ALTER TABLE ai_profiles
  DROP CONSTRAINT ai_profiles_ai_provider_check;

ALTER TABLE ai_profiles
  ADD CONSTRAINT ai_profiles_ai_provider_check
  CHECK (ai_provider IN ('openai', 'claude', 'openrouter'));

-- Add openrouter to default_ai_provider constraint in user_settings table
ALTER TABLE user_settings
  DROP CONSTRAINT user_settings_default_ai_provider_check;

ALTER TABLE user_settings
  ADD CONSTRAINT user_settings_default_ai_provider_check
  CHECK (default_ai_provider IN ('openai', 'claude', 'openrouter'));

-- Add OpenRouter API key storage column
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS openrouter_api_key_encrypted TEXT;
```

### 2. Core Implementation

Created a dedicated OpenRouter integration module (`src/lib/ai/openrouter.ts`) with the following functionality:

- Model definitions for various providers (Anthropic, OpenAI, Meta, Google, Mistral, etc.)
- API integration using the OpenAI SDK with custom base URL and headers
- Error handling specific to OpenRouter responses
- Token usage tracking and management
- Helper utilities for model validation and configuration

### 3. User Interface Updates

Modified the AI Profile creation and editing interfaces to include OpenRouter:

- Added OpenRouter as a provider option in the radio button selection
- Populated model dropdown with available OpenRouter models
- Added informational tooltips about OpenRouter capabilities
- Updated validation to handle OpenRouter-specific model formats

### 4. Settings Integration

Updated the settings page to allow users to:

- Enter and store their OpenRouter API key
- Select OpenRouter as their default AI provider
- View information about OpenRouter benefits

## Security Considerations

- OpenRouter API keys are encrypted at rest using the same AES-256 encryption used for other API keys
- All API calls are made server-side to prevent key exposure
- Rate limiting is applied to prevent abuse of the API

## Performance Optimization

- Token counting is performed using a lightweight estimation to avoid additional dependencies
- Model information is cached to avoid repeated API calls
- Timeout handling ensures responsive UX even if API calls are slow

## Testing Strategy

1. **Unit Testing**: Test the OpenRouter execution function with mocked API responses
2. **Integration Testing**: Test the full execution flow from UI to API call and response
3. **Error Handling**: Verify proper error messages for various failure scenarios
4. **Cross-model Testing**: Verify compatibility with various model types

## Future Improvements

1. **Model Filtering**: Allow users to filter available models by provider or capabilities
2. **Smart Routing**: Implement automatic model selection based on content or task type
3. **Response Streaming**: Add support for streaming responses for compatible models
4. **Usage Analytics**: Track model usage and performance metrics
5. **Advanced Parameters**: Expose more fine-grained control over temperature, top_p, and other parameters

## Conclusion

This integration significantly expands ExpandNote's AI capabilities, offering users more choice and flexibility in how they leverage AI for their note-taking workflow. The implementation maintains the application's commitment to security, performance, and user experience while opening up new possibilities for AI-powered note enhancement.
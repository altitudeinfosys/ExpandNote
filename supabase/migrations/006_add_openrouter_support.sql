-- Add openrouter to ai_provider constraint in ai_profiles table
ALTER TABLE ai_profiles
  DROP CONSTRAINT IF EXISTS ai_profiles_ai_provider_check;

ALTER TABLE ai_profiles
  ADD CONSTRAINT ai_profiles_ai_provider_check
  CHECK (ai_provider IN ('openai', 'claude', 'openrouter'));

-- Add openrouter to default_ai_provider constraint in user_settings table
ALTER TABLE user_settings
  DROP CONSTRAINT IF EXISTS user_settings_default_ai_provider_check;

ALTER TABLE user_settings
  ADD CONSTRAINT user_settings_default_ai_provider_check
  CHECK (default_ai_provider IN ('openai', 'claude', 'openrouter'));

-- Add OpenRouter API key storage column
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS openrouter_api_key_encrypted TEXT;

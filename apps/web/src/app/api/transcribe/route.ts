import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { decryptApiKey } from '@/lib/encryption';
import OpenAI from 'openai';

/**
 * POST /api/transcribe
 * Transcribe audio using OpenAI Whisper API
 * Requires user to have OpenAI API key configured in settings
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user settings to retrieve OpenAI API key
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('openai_api_key, openai_api_key_encrypted')
      .eq('user_id', user.id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching user settings:', settingsError);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Decrypt API key
    let apiKey: string | null = null;
    if (settings?.openai_api_key_encrypted) {
      apiKey = await decryptApiKey(settings.openai_api_key_encrypted);
    } else if (settings?.openai_api_key) {
      // Legacy plaintext key
      apiKey = settings.openai_api_key;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add your API key in Settings.' },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('file');

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB for Whisper API)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    // Convert Blob to File for OpenAI API
    const file = new File([audioFile], 'audio.m4a', { type: audioFile.type || 'audio/m4a' });

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'text',
      language: 'en', // Can be made configurable in future
    });

    return NextResponse.json({ text: transcription });
  } catch (error) {
    console.error('Error in POST /api/transcribe:', error);

    // Handle OpenAI-specific errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key. Please check your API key in Settings.' },
          { status: 400 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'OpenAI rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

import { useState, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

export type RecordingStatus = 'idle' | 'recording' | 'processing';

interface UseVoiceRecordingResult {
  status: RecordingStatus;
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
  error: string | null;
}

export function useVoiceRecording(): UseVoiceRecordingResult {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const getApiUrl = useCallback(() => {
    const extra = Constants.expoConfig?.extra;
    return extra?.supabaseUrl?.replace('/auth/v1', '').replace('supabase.co', 'vercel.app') || '';
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request permissions
      const { status: permissionStatus } = await Audio.requestPermissionsAsync();
      if (permissionStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant microphone access to use voice input.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Start recording with high quality settings for speech
      const { recording } = await Audio.Recording.createAsync(
        {
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 64000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 64000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 64000,
          },
        },
        undefined,
        100 // Update every 100ms
      );

      recordingRef.current = recording;
      setStatus('recording');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording. Please try again.');
      setStatus('idle');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) {
      return null;
    }

    try {
      setStatus('processing');

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (!uri) {
        throw new Error('No recording URI available');
      }

      // Send to transcription API
      const transcription = await transcribeAudio(uri);
      setStatus('idle');
      return transcription;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError('Failed to process recording. Please try again.');
      setStatus('idle');
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (err) {
        console.error('Error canceling recording:', err);
      }
      recordingRef.current = null;
    }
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    isRecording: status === 'recording',
    isProcessing: status === 'processing',
    startRecording,
    stopRecording,
    cancelRecording,
    error,
  };
}

async function transcribeAudio(uri: string): Promise<string> {
  // Read the file and create form data
  const response = await fetch(uri);
  const blob = await response.blob();

  const formData = new FormData();
  formData.append('file', {
    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob);

  // Get API URL from environment
  const extra = Constants.expoConfig?.extra;
  const apiBaseUrl = extra?.apiUrl || 'https://expand-note.vercel.app';

  // Call transcription API
  const transcriptionResponse = await fetch(`${apiBaseUrl}/api/transcribe`, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!transcriptionResponse.ok) {
    const errorData = await transcriptionResponse.json().catch(() => ({}));
    throw new Error(errorData.error || 'Transcription failed');
  }

  const data = await transcriptionResponse.json();
  return data.text || '';
}

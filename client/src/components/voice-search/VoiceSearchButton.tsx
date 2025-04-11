import { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { voiceService, RecordingState } from '../../services/voice-service';
import { voiceRecognitionService, SearchParams } from '../../services/voice-recognition-service';

interface VoiceSearchButtonProps {
  onSearchResult: (text: string, searchParams: SearchParams) => void;
}

export function VoiceSearchButton({ onSearchResult }: VoiceSearchButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize voice service on component mount
  useEffect(() => {
    const initializeVoiceService = async () => {
      try {
        const initialized = await voiceService.initialize();
        setIsInitialized(initialized);
        if (!initialized) {
          setError('Could not access microphone. Please check permissions.');
        }
      } catch (err) {
        setError('Error initializing voice service: ' + (err as Error).message);
        console.error('Voice service initialization error:', err);
      }
    };

    initializeVoiceService();

    // Cleanup on unmount
    return () => {
      voiceService.cleanup();
    };
  }, []);

  const handleClick = async () => {
    try {
      if (recordingState === 'idle') {
        // Start recording
        setError(null);
        voiceService.startRecording(setRecordingState);
      } else if (recordingState === 'recording') {
        // Stop recording and process audio
        setRecordingState('processing');
        const audioBlob = await voiceService.stopRecording();
        const audioBase64 = await voiceService.audioToBase64(audioBlob);
        
        // Send to transcription service
        const result = await voiceRecognitionService.transcribeAudio(audioBase64);
        
        if (result) {
          onSearchResult(result.text, result.searchParams);
        } else {
          setError('Could not transcribe audio. Please try again.');
        }
        
        setRecordingState('idle');
      }
    } catch (err) {
      setError('Error: ' + (err as Error).message);
      console.error('Voice recording error:', err);
      setRecordingState('idle');
    }
  };

  // Get button appearance based on recording state
  const getButtonAppearance = () => {
    switch (recordingState) {
      case 'recording':
        return {
          icon: <Mic className="h-5 w-5" />,
          text: 'Recording...',
          className: 'bg-red-500 hover:bg-red-600 text-white',
        };
      case 'processing':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin" />,
          text: 'Processing...',
          className: 'bg-blue-500 hover:bg-blue-500 text-white cursor-wait',
        };
      default:
        return {
          icon: <Mic className="h-5 w-5" />,
          text: 'Search by Voice',
          className: 'bg-primary hover:bg-primary/90 text-white',
        };
    }
  };

  const buttonAppearance = getButtonAppearance();

  return (
    <div className="voice-search-button flex flex-col items-center">
      <button
        onClick={handleClick}
        disabled={!isInitialized || recordingState === 'processing'}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${buttonAppearance.className} ${
          !isInitialized ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {buttonAppearance.icon}
        <span>{buttonAppearance.text}</span>
      </button>
      
      {error && (
        <div className="text-red-500 text-sm mt-2">
          {error}
        </div>
      )}
      
      {!isInitialized && !error && (
        <div className="text-gray-500 text-sm mt-2">
          Initializing microphone...
        </div>
      )}
    </div>
  );
}
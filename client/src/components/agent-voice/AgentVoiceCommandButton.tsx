import { useState, useEffect, useCallback } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpeechRecognitionService, RecordingState, isSpeechRecognitionAvailable } from '../../services/agent-voice-command-service';

interface AgentVoiceCommandButtonProps {
  onStateChange: (state: RecordingState, text?: string) => void;
  className?: string;
}

export function AgentVoiceCommandButton({ 
  onStateChange,
  className = ''
}: AgentVoiceCommandButtonProps) {
  const [state, setState] = useState<RecordingState>(RecordingState.INACTIVE);
  const [recognitionService, setRecognitionService] = useState<SpeechRecognitionService | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  // Initialize speech recognition
  useEffect(() => {
    // Check if speech recognition is available
    if (!isSpeechRecognitionAvailable()) {
      setIsSupported(false);
      return;
    }
    
    // Create the recognition service
    const recognition = new SpeechRecognitionService({
      continuous: false,
      interimResults: true
    });
    
    // Set up event handlers
    recognition.onResult((text) => {
      if (text) {
        onStateChange(RecordingState.LISTENING, text);
      }
    });
    
    recognition.onError((error) => {
      console.error('Speech recognition error:', error);
      setState(RecordingState.ERROR);
      onStateChange(RecordingState.ERROR);
    });
    
    recognition.onEnd(() => {
      setState(RecordingState.INACTIVE);
      // The final text will be processed by the parent component
    });
    
    setRecognitionService(recognition);
    
    // Clean up on unmount
    return () => {
      if (recognition && recognition.isActive()) {
        recognition.stop();
      }
    };
  }, [onStateChange]);
  
  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (!recognitionService) return;
    
    if (state === RecordingState.INACTIVE) {
      // Start recording
      setState(RecordingState.LISTENING);
      onStateChange(RecordingState.LISTENING);
      recognitionService.start();
    } else if (state === RecordingState.LISTENING) {
      // Stop recording
      setState(RecordingState.INACTIVE);
      const finalText = recognitionService.getTranscript();
      onStateChange(RecordingState.INACTIVE, finalText);
      recognitionService.stop();
    }
  }, [recognitionService, state, onStateChange]);
  
  // Button appearance based on state
  let buttonAppearance = {
    variant: 'default' as const,
    children: <Mic className="h-5 w-5" />,
    disabled: false,
    'aria-label': 'Record voice command'
  };
  
  if (!isSupported) {
    buttonAppearance.disabled = true;
    buttonAppearance.variant = 'destructive';
    buttonAppearance['aria-label'] = 'Voice commands not supported in this browser';
  } else if (state === RecordingState.LISTENING) {
    buttonAppearance.variant = 'destructive';
    buttonAppearance.children = <Mic className="h-5 w-5 animate-pulse" />;
    buttonAppearance['aria-label'] = 'Stop recording';
  } else if (state === RecordingState.PROCESSING) {
    buttonAppearance.disabled = true;
    buttonAppearance.children = <Loader2 className="h-5 w-5 animate-spin" />;
    buttonAppearance['aria-label'] = 'Processing voice command';
  } else if (state === RecordingState.ERROR) {
    buttonAppearance.variant = 'destructive';
    buttonAppearance['aria-label'] = 'Error recording voice command. Click to try again';
  }
  
  return (
    <Button
      onClick={toggleRecording}
      variant={buttonAppearance.variant}
      size="icon"
      disabled={buttonAppearance.disabled}
      className={`rounded-full w-12 h-12 ${className}`}
      aria-label={buttonAppearance['aria-label']}
      title={buttonAppearance['aria-label']}
    >
      {buttonAppearance.children}
    </Button>
  );
}
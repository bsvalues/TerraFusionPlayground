import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Loader2 } from 'lucide-react';
import { agentVoiceCommandService, RecordingState, VoiceCommandResult } from '../../services/agent-voice-command-service';

interface AgentVoiceCommandButtonProps {
  onCommandResult: (result: VoiceCommandResult) => void;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
  label?: string;
  showState?: boolean;
}

export function AgentVoiceCommandButton({
  onCommandResult,
  className = '',
  variant = 'default',
  size = 'default',
  label = 'Agent Voice Command',
  showState = true
}: AgentVoiceCommandButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize microphone access on mount
  useEffect(() => {
    const initialize = async () => {
      const success = await agentVoiceCommandService.initialize();
      setIsInitialized(success);
      
      if (!success) {
        console.error('Failed to initialize voice command service');
      }
    };
    
    initialize();
    
    // Cleanup on unmount
    return () => {
      agentVoiceCommandService.cleanup();
    };
  }, []);
  
  const startRecording = async () => {
    if (!isInitialized) {
      const success = await agentVoiceCommandService.initialize();
      setIsInitialized(success);
      
      if (!success) {
        console.error('Failed to initialize voice command service');
        return;
      }
    }
    
    // Custom wrapper around the service's startRecording that captures the result
    const originalOnCommandResult = agentVoiceCommandService.onCommandResult;
    
    // @ts-ignore - we're replacing a protected method with our own implementation
    agentVoiceCommandService.onCommandResult = (result: VoiceCommandResult) => {
      onCommandResult(result);
      
      // Restore original handler
      // @ts-ignore
      agentVoiceCommandService.onCommandResult = originalOnCommandResult;
    };
    
    agentVoiceCommandService.startRecording(setRecordingState);
  };
  
  const stopRecording = () => {
    agentVoiceCommandService.stopRecording();
  };
  
  const handleClick = () => {
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
  };
  
  // Determine button appearance based on state
  let buttonContent;
  
  if (recordingState === 'processing') {
    buttonContent = (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {showState && <span>Processing...</span>}
      </>
    );
  } else if (recordingState === 'recording') {
    buttonContent = (
      <>
        <StopCircle className="h-4 w-4 mr-2" />
        {showState && <span>Stop</span>}
      </>
    );
  } else {
    buttonContent = (
      <>
        <Mic className="h-4 w-4 mr-2" />
        {showState && <span>{label}</span>}
      </>
    );
  }
  
  return (
    <Button
      onClick={handleClick}
      variant={recordingState === 'recording' ? 'destructive' : variant}
      size={size}
      className={`flex items-center gap-1 ${className}`}
      disabled={recordingState === 'processing' || !isInitialized}
      aria-label={recordingState === 'recording' ? 'Stop recording' : 'Start recording'}
    >
      {buttonContent}
    </Button>
  );
}
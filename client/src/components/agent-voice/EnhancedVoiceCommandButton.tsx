/**
 * Enhanced Voice Command Button
 * 
 * This component handles voice recording and processing for the enhanced voice command system.
 * It provides visual feedback about the recording state and sends the captured audio for processing.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  RecordingState, 
  VoiceCommandResult,
  startRecording,
  stopRecording
} from '@/services/agent-voice-command-service';
import { useToast } from '@/hooks/use-toast';

interface EnhancedVoiceCommandButtonProps {
  recordingState: RecordingState;
  setRecordingState: React.Dispatch<React.SetStateAction<RecordingState>>;
  onCommand: (command: string) => Promise<VoiceCommandResult>;
  isProcessing: boolean;
  userId: number;
  contextId?: string;
  className?: string;
}

export function EnhancedVoiceCommandButton({
  recordingState,
  setRecordingState,
  onCommand,
  isProcessing,
  userId,
  contextId = 'global',
  className = ''
}: EnhancedVoiceCommandButtonProps) {
  const [transcript, setTranscript] = useState<string>('');
  const [isMicAvailable, setIsMicAvailable] = useState<boolean>(true);
  const { toast } = useToast();
  
  // Check for microphone availability
  useEffect(() => {
    const checkMicrophone = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMicrophone = devices.some(device => device.kind === 'audioinput');
        setIsMicAvailable(hasMicrophone);
        
        if (!hasMicrophone) {
          toast({
            title: 'No microphone detected',
            description: 'Please connect a microphone to use voice commands',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Error checking for microphone:', error);
        setIsMicAvailable(false);
        toast({
          title: 'Microphone access error',
          description: 'Could not access your microphone. Please check permissions.',
          variant: 'destructive'
        });
      }
    };
    
    checkMicrophone();
  }, []);
  
  // Handle start recording
  const handleStartRecording = () => {
    if (!isMicAvailable) {
      toast({
        title: 'No microphone detected',
        description: 'Please connect a microphone to use voice commands',
        variant: 'destructive'
      });
      return;
    }
    
    if (recordingState !== RecordingState.INACTIVE) return;
    
    setRecordingState(RecordingState.RECORDING);
    setTranscript('');
    
    // Start the recording process
    startRecording(
      // On result callback
      (text) => {
        setTranscript(text);
      },
      // On error callback
      (error) => {
        console.error('Speech recognition error:', error);
        setRecordingState(RecordingState.ERROR);
        toast({
          title: 'Recording Error',
          description: 'An error occurred while recording your voice',
          variant: 'destructive'
        });
      },
      // On end callback
      () => {
        // Only process if we have a transcript and we're still in recording state
        // (to prevent processing after an error)
        if (transcript && recordingState === RecordingState.RECORDING) {
          setRecordingState(RecordingState.PROCESSING);
          handleCommandProcessing(transcript);
        } else if (recordingState === RecordingState.RECORDING) {
          setRecordingState(RecordingState.INACTIVE);
        }
      }
    );
  };
  
  // Handle stop recording
  const handleStopRecording = () => {
    if (recordingState !== RecordingState.RECORDING) return;
    
    const currentTranscript = stopRecording();
    
    if (currentTranscript) {
      setTranscript(currentTranscript);
      setRecordingState(RecordingState.PROCESSING);
      handleCommandProcessing(currentTranscript);
    } else {
      setRecordingState(RecordingState.INACTIVE);
    }
  };
  
  // Process the command
  const handleCommandProcessing = async (text: string) => {
    try {
      await onCommand(text);
    } catch (error) {
      console.error('Error processing command:', error);
      toast({
        title: 'Processing Error',
        description: 'An error occurred while processing your command',
        variant: 'destructive'
      });
    } finally {
      // The parent component will set the recording state to INACTIVE
      // after processing is complete
    }
  };
  
  // Button states
  const getButtonAppearance = () => {
    switch (recordingState) {
      case RecordingState.RECORDING:
        return {
          variant: 'destructive' as const,
          icon: <MicOff className="h-5 w-5" />,
          text: 'Stop',
          tooltip: 'Stop recording',
          action: handleStopRecording,
          className: 'animate-pulse'
        };
      case RecordingState.PROCESSING:
        return {
          variant: 'outline' as const,
          icon: <Loader2 className="h-5 w-5 animate-spin" />,
          text: 'Processing...',
          tooltip: 'Processing your command',
          action: () => {},
          className: ''
        };
      case RecordingState.ERROR:
        return {
          variant: 'destructive' as const,
          icon: <MicOff className="h-5 w-5" />,
          text: 'Error',
          tooltip: 'An error occurred. Click to try again',
          action: () => setRecordingState(RecordingState.INACTIVE),
          className: ''
        };
      default:
        return {
          variant: 'default' as const,
          icon: <Mic className="h-5 w-5" />,
          text: 'Speak',
          tooltip: 'Start voice command',
          action: handleStartRecording,
          className: isMicAvailable ? '' : 'opacity-50 cursor-not-allowed'
        };
    }
  };
  
  const buttonAppearance = getButtonAppearance();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={buttonAppearance.variant}
            onClick={buttonAppearance.action}
            disabled={!isMicAvailable || isProcessing}
            className={`${className} ${buttonAppearance.className}`}
            aria-label={buttonAppearance.tooltip}
          >
            {buttonAppearance.icon}
            <span className="ml-2">{buttonAppearance.text}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{buttonAppearance.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
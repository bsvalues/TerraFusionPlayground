/**
 * Enhanced Voice Command Button
 * 
 * This component extends the original voice command button with:
 * - Better error handling
 * - Confidence scoring visualization
 * - Shortcut support
 * - Contextual help
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, AlertTriangle, Loader2 } from "lucide-react";
import { 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent 
} from "@/components/ui/tooltip";
import { 
  startRecording, 
  stopRecording, 
  RecordingState 
} from '@/services/agent-voice-command-service';
import { 
  processEnhancedAudioCommand, 
  EnhancedVoiceCommandContext 
} from '@/services/enhanced-voice-command-service';
import { useToast } from '@/hooks/use-toast';

export interface EnhancedVoiceCommandButtonProps {
  userId?: number;
  onRecordingStateChange?: (state: RecordingState) => void;
  onTranscriptChange?: (transcript: string) => void;
  onResult?: (result: any) => void;
  contextId?: string;
  className?: string;
  showTooltip?: boolean;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'link' | 'destructive';
  size?: 'icon' | 'default' | 'sm' | 'lg';
  pulseAnimation?: boolean;
  disabled?: boolean;
  sessionId?: string;
}

export function EnhancedVoiceCommandButton({
  userId = 1,
  onRecordingStateChange,
  onTranscriptChange,
  onResult,
  contextId,
  className = '',
  showTooltip = true,
  variant = 'outline',
  size = 'icon',
  pulseAnimation = true,
  disabled = false,
  sessionId
}: EnhancedVoiceCommandButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.INACTIVE);
  const [errorState, setErrorState] = useState<boolean>(false);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const { toast } = useToast();
  const sessionIdRef = useRef<string>(sessionId || crypto.randomUUID());
  
  // Effect to pass recording state changes up
  useEffect(() => {
    if (onRecordingStateChange) {
      onRecordingStateChange(recordingState);
    }
  }, [recordingState, onRecordingStateChange]);
  
  // Effect to reset confidence score when inactive
  useEffect(() => {
    if (recordingState === RecordingState.INACTIVE) {
      setConfidenceScore(null);
    }
  }, [recordingState]);
  
  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (disabled) return;
    
    try {
      if (recordingState === RecordingState.INACTIVE) {
        setRecordingState(RecordingState.RECORDING);
        setErrorState(false);
        
        const stream = await startRecording();
        if (!stream) {
          throw new Error('Failed to start recording');
        }
      } else if (recordingState === RecordingState.RECORDING) {
        setRecordingState(RecordingState.PROCESSING);
        
        // Get audio data
        const audioData = await stopRecording();
        if (!audioData) {
          throw new Error('No audio data received');
        }
        
        // Process the audio command with the enhanced API
        const context: EnhancedVoiceCommandContext = {
          userId,
          sessionId: sessionIdRef.current,
          contextId,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
          }
        };
        
        const result = await processEnhancedAudioCommand(audioData, context);
        
        // Update transcript if a handler is provided
        if (onTranscriptChange && result.command) {
          onTranscriptChange(result.command);
        }
        
        // Update confidence score if available
        if (result.confidenceScore !== undefined) {
          setConfidenceScore(result.confidenceScore);
        }
        
        // Call onResult handler if provided
        if (onResult) {
          onResult(result);
        }
        
        // Show toast message for errors
        if (!result.successful) {
          setErrorState(true);
          toast({
            title: "Command Failed",
            description: result.error || "Failed to process voice command",
            variant: "destructive"
          });
        }
        
        // Return to inactive state
        setRecordingState(RecordingState.INACTIVE);
      }
    } catch (error) {
      console.error('Error in voice command:', error);
      setErrorState(true);
      setRecordingState(RecordingState.INACTIVE);
      
      toast({
        title: "Voice Command Error",
        description: error.message || "An error occurred with voice commands",
        variant: "destructive"
      });
    }
  }, [recordingState, userId, contextId, onTranscriptChange, onResult, disabled, toast]);
  
  // Calculate button styles based on state
  const getButtonVariant = () => {
    if (errorState) return 'destructive';
    if (recordingState === RecordingState.RECORDING) return 'default';
    return variant;
  };
  
  // Get button icon based on state
  const getButtonIcon = () => {
    if (recordingState === RecordingState.RECORDING) {
      return <MicOff className="h-5 w-5" />;
    }
    if (recordingState === RecordingState.PROCESSING) {
      return <Loader2 className="h-5 w-5 animate-spin" />;
    }
    if (errorState) {
      return <AlertTriangle className="h-5 w-5" />;
    }
    return <Mic className="h-5 w-5" />;
  };
  
  // Get tooltip text based on state
  const getTooltipText = () => {
    if (recordingState === RecordingState.RECORDING) {
      return "Click to stop recording";
    }
    if (recordingState === RecordingState.PROCESSING) {
      return "Processing voice command...";
    }
    if (errorState) {
      return "Error processing voice command";
    }
    return "Click to speak a voice command";
  };
  
  // Get animation class based on state and settings
  const getAnimationClass = () => {
    if (!pulseAnimation) return '';
    if (recordingState === RecordingState.RECORDING) {
      return 'animate-pulse';
    }
    return '';
  };
  
  // Get confidence score indicator
  const getConfidenceIndicator = () => {
    if (confidenceScore === null) return null;
    
    // Determine color based on confidence score
    let color = 'bg-red-500';
    if (confidenceScore >= 0.7) color = 'bg-green-500';
    else if (confidenceScore >= 0.4) color = 'bg-yellow-500';
    
    return (
      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full ring-1 ring-white" 
           style={{ background: color }} />
    );
  };

  return (
    <div className={`relative ${className}`}>
      {showTooltip ? (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant={getButtonVariant()}
              size={size}
              onClick={toggleRecording}
              disabled={recordingState === RecordingState.PROCESSING || disabled}
              aria-label="Voice Command"
              className={getAnimationClass()}
              data-recording={recordingState === RecordingState.RECORDING}
              data-error={errorState}
            >
              {getButtonIcon()}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant={getButtonVariant()}
          size={size}
          onClick={toggleRecording}
          disabled={recordingState === RecordingState.PROCESSING || disabled}
          aria-label="Voice Command"
          className={getAnimationClass()}
          data-recording={recordingState === RecordingState.RECORDING}
          data-error={errorState}
        >
          {getButtonIcon()}
        </Button>
      )}
      
      {getConfidenceIndicator()}
    </div>
  );
}
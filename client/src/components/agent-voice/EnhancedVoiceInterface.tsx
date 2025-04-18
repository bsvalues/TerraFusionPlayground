/**
 * Enhanced Voice Interface
 * 
 * This component integrates the enhanced voice command button and results components,
 * providing a complete voice command interface with all the enhanced features:
 * - Analytics tracking
 * - Shortcut support
 * - Error handling
 * - Contextual help
 * - Domain-specific commands
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EnhancedVoiceCommandButton } from './EnhancedVoiceCommandButton';
import { EnhancedVoiceCommandResults } from './EnhancedVoiceCommandResults';
import { RecordingState } from '@/services/agent-voice-command-service';
import { 
  EnhancedVoiceCommandResult, 
  processEnhancedCommand,
  EnhancedVoiceCommandContext,
  getUserShortcuts,
  getContextualHelp
} from '@/services/enhanced-voice-command-service';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export interface EnhancedVoiceInterfaceProps {
  userId?: number;
  onResult?: (result: EnhancedVoiceCommandResult) => void;
  contextId?: string;
  className?: string;
  buttonVariant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'link' | 'destructive';
  buttonSize?: 'icon' | 'default' | 'sm' | 'lg';
  buttonClassName?: string;
  resultsClassName?: string;
  disabled?: boolean;
  floatingButton?: boolean;
  includeShortcuts?: boolean;
  includeAnalytics?: boolean;
  includeContextualHelp?: boolean;
}

export function EnhancedVoiceInterface({
  userId = 1,
  onResult,
  contextId,
  className = '',
  buttonVariant = 'outline',
  buttonSize = 'icon',
  buttonClassName = '',
  resultsClassName = '',
  disabled = false,
  floatingButton = false,
  includeShortcuts = true,
  includeAnalytics = true,
  includeContextualHelp = true
}: EnhancedVoiceInterfaceProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.INACTIVE);
  const [transcript, setTranscript] = useState<string>('');
  const [lastResult, setLastResult] = useState<EnhancedVoiceCommandResult | null>(null);
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [helpContent, setHelpContent] = useState<any[]>([]);
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const { toast } = useToast();
  
  // Load user shortcuts
  useEffect(() => {
    if (includeShortcuts) {
      getUserShortcuts(userId)
        .then(shortcuts => {
          setShortcuts(shortcuts);
        })
        .catch(error => {
          console.error('Error loading shortcuts:', error);
        });
    }
  }, [userId, includeShortcuts]);
  
  // Load contextual help
  useEffect(() => {
    if (includeContextualHelp && contextId) {
      getContextualHelp(contextId)
        .then(helpContent => {
          setHelpContent(helpContent);
        })
        .catch(error => {
          console.error('Error loading contextual help:', error);
        });
    }
  }, [contextId, includeContextualHelp]);
  
  // Handle recording state changes
  const handleRecordingStateChange = useCallback((state: RecordingState) => {
    setRecordingState(state);
  }, []);
  
  // Handle transcript changes
  const handleTranscriptChange = useCallback((text: string) => {
    setTranscript(text);
  }, []);
  
  // Handle voice command results
  const handleResult = useCallback((result: EnhancedVoiceCommandResult) => {
    setLastResult(result);
    
    // Pass result to parent component if provided
    if (onResult) {
      onResult(result);
    }
  }, [onResult]);
  
  // Handle command selection from suggestions or history
  const handleCommandSelected = useCallback(async (command: string) => {
    try {
      // Clear previous result and transcript
      setTranscript(command);
      setLastResult(null);
      
      // Process the command
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
      
      const result = await processEnhancedCommand(command, context);
      
      // Update state with result
      handleResult(result);
      
      // Show toast for errors
      if (!result.successful) {
        toast({
          title: "Command Failed",
          description: result.error || "Failed to process command",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing selected command:', error);
      
      toast({
        title: "Command Error",
        description: error.message || "Failed to process command",
        variant: "destructive"
      });
    }
  }, [userId, contextId, handleResult, toast]);
  
  // Render the button
  const renderButton = () => (
    <EnhancedVoiceCommandButton
      userId={userId}
      onRecordingStateChange={handleRecordingStateChange}
      onTranscriptChange={handleTranscriptChange}
      onResult={handleResult}
      contextId={contextId}
      variant={buttonVariant}
      size={buttonSize}
      className={buttonClassName}
      disabled={disabled}
      sessionId={sessionIdRef.current}
    />
  );
  
  // Render the results panel
  const renderResults = () => (
    <EnhancedVoiceCommandResults
      result={lastResult}
      recordingState={recordingState}
      transcript={transcript}
      className={resultsClassName}
      showCommandHistory={true}
      maxHistory={5}
      onCommandSelected={handleCommandSelected}
      showHelpContent={includeContextualHelp}
    />
  );
  
  // If floating button is enabled, return just the button with a fixed position
  if (floatingButton) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        {renderButton()}
      </div>
    );
  }
  
  // Otherwise, return the full interface
  return (
    <div className={`enhanced-voice-interface ${className}`}>
      {renderResults()}
    </div>
  );
}
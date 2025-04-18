/**
 * Enhanced Voice Interface
 * 
 * This component serves as an improved version of the AgentVoiceInterface component.
 * It coordinates:
 * - The voice command button for recording audio
 * - The results display for showing voice command responses
 * - Optional shortcut expansion
 * - Optional analytics tracking
 * - Optional contextual help
 */

import { useState, useEffect } from 'react';
import { 
  RecordingState, 
  VoiceCommandContext,
  VoiceCommandResult,
  processVoiceCommand
} from '@/services/agent-voice-command-service';
import { EnhancedVoiceCommandButton } from './EnhancedVoiceCommandButton';
import { EnhancedVoiceCommandResults } from './EnhancedVoiceCommandResults';
import { expandShortcuts } from '@/services/enhanced-voice-command-service';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface EnhancedVoiceInterfaceProps {
  userId: number;
  agentId?: string;
  contextId?: string;
  includeShortcuts?: boolean;
  includeAnalytics?: boolean;
  includeContextualHelp?: boolean;
  className?: string;
}

export function EnhancedVoiceInterface({
  userId,
  agentId,
  contextId = 'global',
  includeShortcuts = false,
  includeAnalytics = false,
  includeContextualHelp = false,
  className = ''
}: EnhancedVoiceInterfaceProps) {
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.INACTIVE);
  const [transcript, setTranscript] = useState<string>('');
  
  // Results state
  const [results, setResults] = useState<VoiceCommandResult[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>(uuidv4());
  
  // Command suggestions
  const [commandSuggestions, setCommandSuggestions] = useState<string[]>([]);
  
  const { toast } = useToast();
  
  // Reset session ID when context changes
  useEffect(() => {
    setSessionId(uuidv4());
  }, [contextId]);
  
  // Process voice command
  const processCommand = async (command: string) => {
    if (!command.trim()) {
      setRecordingState(RecordingState.INACTIVE);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Expand shortcuts if enabled
      let processedCommand = command;
      if (includeShortcuts) {
        try {
          processedCommand = await expandShortcuts(command, userId);
        } catch (error) {
          console.error('Error expanding shortcuts:', error);
          // Continue with original command if expansion fails
        }
      }
      
      // Create context with enhanced features
      const context: VoiceCommandContext = {
        agentId,
        userId,
        sessionId,
        contextId,
        recentCommands: results.map(r => r.command).slice(-5),
        recentResults: results.slice(-5)
      };
      
      // Process the command
      const result = await processVoiceCommand(processedCommand, context);
      
      // Add to results
      setResults(prev => [...prev, result]);
      
      // Clear suggestions
      setCommandSuggestions([]);
      
      // Display toast for unsuccessful commands
      if (!result.successful) {
        toast({
          title: 'Command Error',
          description: result.error || 'Command could not be processed',
          variant: 'destructive'
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error processing command:', error);
      const errorResult: VoiceCommandResult = {
        command,
        processed: false,
        successful: false,
        error: error instanceof Error ? error.message : 'Unknown error processing command',
        timestamp: Date.now()
      };
      
      setResults(prev => [...prev, errorResult]);
      
      toast({
        title: 'Processing Error',
        description: 'Failed to process voice command',
        variant: 'destructive'
      });
      
      return errorResult;
    } finally {
      setIsProcessing(false);
      setRecordingState(RecordingState.INACTIVE);
    }
  };
  
  // Handle command from button
  const handleCommand = async (command: string) => {
    setTranscript(command);
    return processCommand(command);
  };
  
  // Handle suggested command selection
  const handleSuggestionSelected = (suggestion: string) => {
    processCommand(suggestion);
  };
  
  // Handle manual command submission (from results component)
  const handleManualCommand = (command: string) => {
    setTranscript(command);
    processCommand(command);
  };
  
  // Clear results history
  const clearResults = () => {
    setResults([]);
    setSessionId(uuidv4());
  };
  
  return (
    <div className={className}>
      <EnhancedVoiceCommandButton
        recordingState={recordingState}
        setRecordingState={setRecordingState}
        onCommand={handleCommand}
        isProcessing={isProcessing}
        userId={userId}
        contextId={contextId}
      />
      
      <EnhancedVoiceCommandResults
        results={results}
        onClear={clearResults}
        isProcessing={isProcessing}
        recordingState={recordingState}
        currentTranscript={transcript}
        suggestions={commandSuggestions}
        onSuggestionSelected={handleSuggestionSelected}
        onCommandSubmit={handleManualCommand}
        showHelp={includeContextualHelp}
        contextId={contextId}
      />
    </div>
  );
}
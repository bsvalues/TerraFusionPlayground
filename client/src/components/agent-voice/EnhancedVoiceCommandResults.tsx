/**
 * Enhanced Voice Command Results
 * 
 * This component extends the original voice command results with:
 * - Better error visualization
 * - Suggestions
 * - Alternative commands
 * - Contextual help
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { EnhancedVoiceCommandResult, VoiceCommandHelpContent } from '@/services/enhanced-voice-command-service';
import { RecordingState } from '@/services/agent-voice-command-service';
import { Mic, AlertTriangle, CheckCircle, HelpCircle, Copy, Redo } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

export interface EnhancedVoiceCommandResultsProps {
  result?: EnhancedVoiceCommandResult | null;
  recordingState?: RecordingState;
  transcript?: string;
  className?: string;
  showCommandHistory?: boolean;
  maxHistory?: number;
  onCommandSelected?: (command: string) => void;
  showHelpContent?: boolean;
}

export function EnhancedVoiceCommandResults({
  result,
  recordingState = RecordingState.INACTIVE,
  transcript = '',
  className = '',
  showCommandHistory = true,
  maxHistory = 5,
  onCommandSelected,
  showHelpContent = true
}: EnhancedVoiceCommandResultsProps) {
  const [commandHistory, setCommandHistory] = useState<EnhancedVoiceCommandResult[]>([]);
  const { toast } = useToast();
  
  // Update command history when a new result comes in
  useEffect(() => {
    if (result && result.processed) {
      setCommandHistory(prev => {
        // Check if this result is already in history to avoid duplicates
        const isDuplicate = prev.some(item => 
          item.timestamp === result.timestamp && 
          item.command === result.command
        );
        
        if (isDuplicate) return prev;
        
        // Add to history and limit to maxHistory
        return [result, ...prev].slice(0, maxHistory);
      });
    }
  }, [result, maxHistory]);
  
  // Copy a command to clipboard
  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    toast({
      title: "Command Copied",
      description: "Command copied to clipboard",
      duration: 2000
    });
  };
  
  // Use a suggested/alternative command
  const useCommand = (command: string) => {
    if (onCommandSelected) {
      onCommandSelected(command);
    } else {
      // If no callback provided, just copy to clipboard
      copyCommand(command);
    }
  };
  
  // Get content for current state
  const getContent = () => {
    // If recording
    if (recordingState === RecordingState.RECORDING) {
      return (
        <div className="flex flex-col items-center justify-center py-4">
          <Mic className="h-8 w-8 text-primary animate-pulse" />
          <p className="mt-2 text-muted-foreground">Listening...</p>
          {transcript && (
            <div className="mt-4 p-2 bg-muted rounded-md w-full">
              <p className="italic text-sm">{transcript}</p>
            </div>
          )}
        </div>
      );
    }
    
    // If processing
    if (recordingState === RecordingState.PROCESSING) {
      return (
        <div className="flex flex-col items-center justify-center py-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="mt-2 text-muted-foreground">Processing command...</p>
          {transcript && (
            <div className="mt-4 p-2 bg-muted rounded-md w-full">
              <p className="italic text-sm">{transcript}</p>
            </div>
          )}
        </div>
      );
    }
    
    // If we have a result
    if (result) {
      return (
        <div className="space-y-4">
          {/* Command */}
          <div className="flex items-center justify-between p-2 bg-muted rounded-md">
            <p className="font-medium text-sm">{result.command}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyCommand(result.command)}
              title="Copy command"
              className="h-7 w-7 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Response or error */}
          {result.successful ? (
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p>{result.response}</p>
                {result.data && (
                  <div className="mt-2">
                    {typeof result.data === 'object' ? (
                      <pre className="text-xs p-2 bg-muted rounded-md overflow-auto max-h-32">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm">{String(result.data)}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {result.error || "Failed to process command"}
                
                {/* Suggestions */}
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-sm">Suggestions:</p>
                    <ul className="list-disc list-inside text-sm mt-1">
                      {result.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Alternative commands */}
          {!result.successful && result.alternativeCommands && result.alternativeCommands.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Try one of these commands instead:</p>
              <div className="flex flex-wrap gap-2">
                {result.alternativeCommands.map((cmd, i) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-muted flex items-center gap-1 py-1"
                    onClick={() => useCommand(cmd)}
                  >
                    <span>{cmd}</span>
                    <Redo className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Help content if enabled and available */}
          {showHelpContent && result.helpContent && result.helpContent.length > 0 && (
            <div className="mt-4 border rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium">Help</h4>
              </div>
              
              {renderHelpContent(result.helpContent[0])}
            </div>
          )}
        </div>
      );
    }
    
    // Default empty state
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <Mic className="h-10 w-10 mb-3 opacity-30" />
        <p>Click the microphone button and speak a command</p>
        <p className="text-sm mt-1">Try saying "Show available commands" for help</p>
      </div>
    );
  };
  
  // Render help content
  const renderHelpContent = (helpContent: VoiceCommandHelpContent) => {
    return (
      <div className="text-sm space-y-2">
        <h5 className="font-semibold">{helpContent.title}</h5>
        <p>{helpContent.description}</p>
        
        {helpContent.examplePhrases && helpContent.examplePhrases.length > 0 && (
          <div>
            <p className="font-medium">Example phrases:</p>
            <ul className="list-disc list-inside">
              {helpContent.examplePhrases.slice(0, 3).map((phrase, i) => (
                <li key={i} className="cursor-pointer hover:text-blue-500" onClick={() => useCommand(phrase)}>
                  {phrase}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {helpContent.parameters && Object.keys(helpContent.parameters).length > 0 && (
          <div>
            <p className="font-medium">Parameters:</p>
            <ul className="list-disc list-inside">
              {Object.entries(helpContent.parameters).map(([param, desc], i) => (
                <li key={i}>
                  <span className="font-mono">{param}</span>: {desc}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  // Render command history
  const renderCommandHistory = () => {
    if (!showCommandHistory || commandHistory.length === 0) {
      return null;
    }
    
    return (
      <div className="mt-4 pt-4 border-t">
        <h3 className="text-sm font-semibold mb-2">Recent Commands</h3>
        <div className="space-y-2">
          {commandHistory.map((historyItem, index) => (
            index === 0 && historyItem === result ? null : (
              <div key={historyItem.timestamp || index} className="flex items-start text-sm">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => useCommand(historyItem.command)}
                  className="h-6 w-6 p-0 mr-2"
                >
                  <Redo className="h-3.5 w-3.5" />
                </Button>
                <div className="flex-1">
                  <p className="font-medium">{historyItem.command}</p>
                  <p className="text-xs text-muted-foreground">
                    {historyItem.successful ? (
                      <span className="text-green-500">Successful</span>
                    ) : (
                      <span className="text-red-500">Failed</span>
                    )}
                    {historyItem.timestamp && (
                      <span className="ml-2">
                        {new Date(historyItem.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Mic className="h-5 w-5 mr-2" />
          Voice Commands
        </CardTitle>
      </CardHeader>
      <CardContent>
        {getContent()}
      </CardContent>
      {renderCommandHistory() && (
        <CardFooter className="pt-0">
          {renderCommandHistory()}
        </CardFooter>
      )}
    </Card>
  );
}
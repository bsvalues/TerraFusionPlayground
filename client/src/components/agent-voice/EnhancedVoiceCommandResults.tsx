/**
 * Enhanced Voice Command Results
 * 
 * This component displays voice command results with enhanced features:
 * - Command history
 * - Error handling with suggestions
 * - Command corrections
 * - Contextual help
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  RecordingState, 
  VoiceCommandResult,
  executeVoiceCommandAction
} from '@/services/agent-voice-command-service';
import { 
  getCommandCorrections,
  getContextualHelp,
  type VoiceCommandHelpContent
} from '@/services/enhanced-voice-command-service';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Trash2, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Send, 
  Clock, 
  Info, 
  Command, 
  ChevronDown, 
  ChevronUp, 
  Copy,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface EnhancedVoiceCommandResultsProps {
  results: VoiceCommandResult[];
  onClear: () => void;
  isProcessing: boolean;
  recordingState: RecordingState;
  currentTranscript: string;
  suggestions: string[];
  onSuggestionSelected: (suggestion: string) => void;
  onCommandSubmit: (command: string) => void;
  showHelp?: boolean;
  contextId?: string;
  className?: string;
}

export function EnhancedVoiceCommandResults({
  results,
  onClear,
  isProcessing,
  recordingState,
  currentTranscript,
  suggestions,
  onSuggestionSelected,
  onCommandSubmit,
  showHelp = false,
  contextId = 'global',
  className = ''
}: EnhancedVoiceCommandResultsProps) {
  // State
  const [activeTab, setActiveTab] = useState<string>('results');
  const [manualCommand, setManualCommand] = useState<string>('');
  const [correction, setCorrection] = useState<string[]>([]);
  const [helpContent, setHelpContent] = useState<VoiceCommandHelpContent[]>([]);
  const [isHelpLoading, setIsHelpLoading] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(true);
  
  const { toast } = useToast();
  
  // Filter results to show only last 10
  const displayResults = useMemo(() => 
    results.slice(-10).reverse(), 
    [results]
  );
  
  // Load corrections when a command fails
  useEffect(() => {
    const loadCorrections = async () => {
      if (results.length === 0) return;
      
      const lastResult = results[results.length - 1];
      
      if (!lastResult.successful && lastResult.command) {
        try {
          const corrections = await getCommandCorrections(lastResult.command, contextId);
          setCorrection(corrections);
        } catch (error) {
          console.error('Error getting corrections:', error);
          // Silently fail, corrections are optional
        }
      } else {
        // Clear corrections if last command was successful
        setCorrection([]);
      }
    };
    
    loadCorrections();
  }, [results, contextId]);
  
  // Load help content if enabled
  useEffect(() => {
    const loadHelp = async () => {
      if (!showHelp) return;
      
      setIsHelpLoading(true);
      
      try {
        const help = await getContextualHelp(contextId);
        setHelpContent(help);
      } catch (error) {
        console.error('Error loading help content:', error);
        // Silently fail, help is optional
      } finally {
        setIsHelpLoading(false);
      }
    };
    
    loadHelp();
  }, [showHelp, contextId]);
  
  // Handle manual command submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualCommand.trim()) return;
    
    onCommandSubmit(manualCommand);
    setManualCommand('');
  };
  
  // Copy command to clipboard
  const copyCommand = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          title: 'Copied',
          description: 'Command copied to clipboard'
        });
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'Failed to copy to clipboard',
          variant: 'destructive'
        });
      });
  };
  
  // Execute action from result
  const handleExecuteAction = (result: VoiceCommandResult, actionIndex: number) => {
    if (!result.actions || actionIndex >= result.actions.length) return;
    
    executeVoiceCommandAction(result.actions[actionIndex]);
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp), 'hh:mm:ss a');
  };
  
  // Render suggestion buttons
  const renderSuggestions = () => {
    if (suggestions.length === 0 && correction.length === 0) return null;
    
    const allSuggestions = [...suggestions, ...correction];
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        <p className="w-full text-sm font-medium text-muted-foreground mb-1">
          {correction.length > 0 
            ? 'Did you mean:' 
            : 'Suggested commands:'}
        </p>
        {allSuggestions.map((suggestion, i) => (
          <Button 
            key={i}
            variant="outline" 
            size="sm" 
            onClick={() => onSuggestionSelected(suggestion)}
            className="flex items-center text-xs"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {suggestion}
          </Button>
        ))}
      </div>
    );
  };
  
  // Render loading state
  const renderLoading = () => {
    if (isProcessing || recordingState === RecordingState.PROCESSING) {
      return (
        <div className="flex items-center p-4 text-muted-foreground animate-pulse">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Processing command...</span>
        </div>
      );
    }
    
    if (recordingState === RecordingState.RECORDING) {
      return (
        <div className="flex items-center p-4 text-primary animate-pulse">
          <Mic className="h-4 w-4 mr-2" />
          <span>Listening: {currentTranscript}</span>
        </div>
      );
    }
    
    return null;
  };
  
  // Render transcript input
  const renderTranscriptInput = () => (
    <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
      <Input
        placeholder="Type a command manually..."
        value={manualCommand}
        onChange={(e) => setManualCommand(e.target.value)}
        className="flex-1"
        disabled={isProcessing || recordingState !== RecordingState.INACTIVE}
      />
      <Button 
        type="submit" 
        size="icon"
        disabled={isProcessing || recordingState !== RecordingState.INACTIVE || !manualCommand.trim()}
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
  
  // Render command history
  const renderHistory = () => {
    if (displayResults.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          <p>No commands yet. Try saying something!</p>
        </div>
      );
    }
    
    return (
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-3 p-1">
          {displayResults.map((result, index) => (
            <Card key={index} className={`shadow-sm ${!result.successful ? 'border-destructive' : ''}`}>
              <CardHeader className="p-3 pb-0">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    {result.successful ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mr-2" />
                    )}
                    <div>
                      <p className="text-sm font-medium leading-none">{result.command}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatTimestamp(result.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyCommand(result.command)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy command</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {result.error ? (
                  <div className="bg-destructive/10 p-2 rounded-md text-sm">
                    <span className="font-medium">Error: </span>
                    {result.error}
                  </div>
                ) : result.response ? (
                  <div className="text-sm">{result.response}</div>
                ) : null}
                
                {result.actions && result.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.actions.map((action, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant="secondary"
                        onClick={() => handleExecuteAction(result, i)}
                        className="text-xs"
                      >
                        <Command className="h-3 w-3 mr-1" />
                        {action.type}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  };
  
  // Render help content
  const renderHelp = () => {
    if (isHelpLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Loading help content...</span>
        </div>
      );
    }
    
    if (!showHelp || helpContent.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No help content available for this context.</p>
        </div>
      );
    }
    
    return (
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-4 p-1">
          {helpContent.map((help) => (
            <Collapsible key={help.id} className="border rounded-md">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-3 font-medium">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">
                    {help.commandType}
                  </Badge>
                  <span>{help.title}</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="p-3 pt-0 text-sm space-y-2">
                <p>{help.description}</p>
                
                {help.examplePhrases.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Example phrases:</p>
                    <ul className="list-disc list-inside">
                      {help.examplePhrases.map((phrase, i) => (
                        <li key={i}>
                          "{phrase}"
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-1"
                            onClick={() => onCommandSubmit(phrase)}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {help.parameters && Object.keys(help.parameters).length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Parameters:</p>
                    <ul className="list-disc list-inside">
                      {Object.entries(help.parameters).map(([key, desc], i) => (
                        <li key={i}>
                          <span className="font-semibold">{key}</span> - {desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {help.responseExample && (
                  <div>
                    <p className="font-medium mb-1">Response example:</p>
                    <div className="bg-muted p-2 rounded-md">
                      {help.responseExample}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    );
  };
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CardTitle className="text-lg">Voice Commands</CardTitle>
            {displayResults.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {displayResults.length} {displayResults.length === 1 ? 'command' : 'commands'}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {displayResults.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowHistory(!showHistory)}
                aria-label={showHistory ? 'Hide history' : 'Show history'}
              >
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
            
            {displayResults.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClear}
                className="text-destructive"
                aria-label="Clear history"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Ask questions or give commands using your voice
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {renderLoading()}
        {renderSuggestions()}
        
        {showHelp && (
          <Tabs defaultValue="results" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="help">Help</TabsTrigger>
            </TabsList>
            <TabsContent value="results">
              {showHistory && renderHistory()}
            </TabsContent>
            <TabsContent value="help">
              {renderHelp()}
            </TabsContent>
          </Tabs>
        )}
        
        {!showHelp && showHistory && renderHistory()}
      </CardContent>
      
      <CardFooter>
        {renderTranscriptInput()}
      </CardFooter>
    </Card>
  );
}
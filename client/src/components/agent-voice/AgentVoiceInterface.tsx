import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, MessageSquare, Bot, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AgentVoiceCommandButton } from './AgentVoiceCommandButton';
import { AgentVoiceCommandResults } from './AgentVoiceCommandResults';
import { VoiceCommandResult, agentVoiceCommandService } from '../../services/agent-voice-command-service';

interface AgentVoiceInterfaceProps {
  className?: string;
  title?: string;
  description?: string;
  agentId?: string;
  subject?: string;
  examples?: string[];
  showInputField?: boolean;
  emptyStateMessage?: string;
  onCommandExecuted?: (result: VoiceCommandResult) => void;
}

export function AgentVoiceInterface({
  className = '',
  title = 'Agent Voice Interface',
  description = 'Speak or type commands to interact with AI agents',
  agentId,
  subject,
  examples = [
    'Show me the status of all agents',
    'Ask property intelligence agent about downtown properties',
    'Tell the data agent to update property BC001',
    'List all available commands',
  ],
  showInputField = true,
  emptyStateMessage = 'No command results yet. Try speaking or typing a command.',
  onCommandExecuted
}: AgentVoiceInterfaceProps) {
  const [textCommand, setTextCommand] = useState<string>('');
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const [isTextProcessing, setIsTextProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Optional context override based on props
  const contextOverride = {
    ...(agentId ? { agentId } : {}),
    ...(subject ? { subject } : {})
  };
  
  // Helper for handling command results
  const handleCommandResult = (result: VoiceCommandResult) => {
    setLastResult(result);
    
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
    }
    
    // Call external handler if provided
    if (onCommandExecuted) {
      onCommandExecuted(result);
    }
  };
  
  // Process a text command
  const processTextCommand = async () => {
    if (!textCommand.trim()) {
      return;
    }
    
    setIsTextProcessing(true);
    setError(null);
    
    try {
      const result = await agentVoiceCommandService.processTextCommand(textCommand, contextOverride);
      
      if (result) {
        handleCommandResult(result);
      } else {
        setError('Failed to process command. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing your command');
    } finally {
      setIsTextProcessing(false);
      setTextCommand('');
    }
  };
  
  // Retry a command with the given text
  const retryCommand = async (text: string) => {
    setIsTextProcessing(true);
    setError(null);
    
    try {
      const result = await agentVoiceCommandService.processTextCommand(text, contextOverride);
      
      if (result) {
        handleCommandResult(result);
      } else {
        setError('Failed to process command. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing your command');
    } finally {
      setIsTextProcessing(false);
    }
  };
  
  // Clear the last result
  const clearResult = () => {
    setLastResult(null);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processTextCommand();
  };
  
  return (
    <Card className={`w-full agent-voice-interface ${className}`}>
      <CardHeader className="px-6">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-6 pb-2 space-y-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {showInputField && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={textCommand}
              onChange={(e) => setTextCommand(e.target.value)}
              placeholder="Type a command..."
              disabled={isTextProcessing}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isTextProcessing || !textCommand.trim()}
              variant="secondary"
            >
              {isTextProcessing ? 
                <RefreshCcw className="h-4 w-4 animate-spin" /> : 
                <MessageSquare className="h-4 w-4" />
              }
            </Button>
            
            <AgentVoiceCommandButton
              onCommandResult={handleCommandResult}
              showState={false}
              size="default"
            />
          </form>
        )}
        
        {!showInputField && (
          <div className="flex justify-center">
            <AgentVoiceCommandButton
              onCommandResult={handleCommandResult}
              label="Voice Command"
              size="lg"
            />
          </div>
        )}
        
        {!lastResult && examples && examples.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Example commands:</h4>
            <div className="grid grid-cols-1 gap-2">
              {examples.map((example, index) => (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start text-left h-auto py-2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setTextCommand(example);
                          // Optional: auto-submit
                          // setTimeout(() => processTextCommand(), 100);
                        }}
                      >
                        {example}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to use this example</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}
        
        {lastResult ? (
          <AgentVoiceCommandResults
            result={lastResult}
            onClear={clearResult}
            onRetry={retryCommand}
            className="mt-4"
          />
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            {emptyStateMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
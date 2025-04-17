import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Bot, Mic, Clock, Target, Repeat, X, ClipboardCopy, CheckCircle2 } from 'lucide-react';
import { VoiceCommandResult, agentVoiceCommandService } from '../../services/agent-voice-command-service';

interface AgentVoiceCommandResultsProps {
  result: VoiceCommandResult;
  onClear: () => void;
  onRetry?: (text: string) => void;
  className?: string;
}

export function AgentVoiceCommandResults({
  result,
  onClear,
  onRetry,
  className = ''
}: AgentVoiceCommandResultsProps) {
  const [activeTab, setActiveTab] = useState<string>('command');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  const { command, response, error, transcribedText, context } = result;
  
  // Helper to format the timestamp
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString();
    } catch (e) {
      return timeString;
    }
  };
  
  // Format command type for display
  const getCommandTypeDisplay = (type: string) => {
    switch (type) {
      case 'QUERY':
        return { label: 'Query', color: 'bg-blue-500' };
      case 'TASK':
        return { label: 'Task', color: 'bg-green-500' };
      case 'STATUS':
        return { label: 'Status', color: 'bg-purple-500' };
      case 'ANALYZE':
        return { label: 'Analyze', color: 'bg-indigo-500' };
      case 'CREATE':
        return { label: 'Create', color: 'bg-emerald-500' };
      case 'UPDATE':
        return { label: 'Update', color: 'bg-amber-500' };
      case 'DELETE':
        return { label: 'Delete', color: 'bg-red-500' };
      case 'LIST':
        return { label: 'List', color: 'bg-cyan-500' };
      case 'HELP':
        return { label: 'Help', color: 'bg-teal-500' };
      case 'UNKNOWN':
      default:
        return { label: 'Unknown', color: 'bg-gray-500' };
    }
  };
  
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      (err) => console.error('Could not copy text: ', err)
    );
  };
  
  const handleRetry = () => {
    if (onRetry && transcribedText) {
      onRetry(transcribedText);
    }
  };
  
  const commandTypeStyle = getCommandTypeDisplay(command.type);
  
  return (
    <Card className={`agent-voice-result w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent Command
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${commandTypeStyle.color} text-white`}>
              {commandTypeStyle.label}
            </Badge>
            
            <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {transcribedText && (
          <CardDescription className="text-base mt-2 flex flex-wrap gap-2 items-center">
            <span className="flex items-center gap-1">
              <Mic className="h-3.5 w-3.5" />
              {transcribedText}
            </span>
            
            {context.lastCommandTime && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(context.lastCommandTime)}
              </span>
            )}
          </CardDescription>
        )}
      </CardHeader>
      
      <Separator />
      
      <Tabs defaultValue="command" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="command">Command</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
        </TabsList>
        
        <TabsContent value="command" className="p-4 space-y-3">
          {command.agentId && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Agent:</span>
              <Badge variant="outline" className="w-fit">{command.agentId}</Badge>
            </div>
          )}
          
          {command.subject && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Subject:</span>
              <Badge variant="secondary" className="w-fit">{command.subject}</Badge>
            </div>
          )}
          
          {command.parameters && Object.keys(command.parameters).length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Parameters:</span>
              <div className="bg-muted rounded-md p-2">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(command.parameters, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                className="mr-2"
                disabled={!transcribedText}
              >
                <Repeat className="h-3.5 w-3.5 mr-1" />
                Retry
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleCopyText(JSON.stringify(command, null, 2))}
            >
              {copySuccess ? (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5 mr-1" />
              )}
              Copy
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="response" className="p-4 space-y-3">
          {error ? (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Error</h4>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          ) : response ? (
            <div className="bg-muted rounded-md p-3">
              <pre className="text-sm whitespace-pre-wrap">
                {typeof response === 'object' 
                  ? JSON.stringify(response, null, 2)
                  : response}
              </pre>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              No response data available
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleCopyText(
                typeof response === 'object' 
                  ? JSON.stringify(response, null, 2)
                  : response?.toString() || 'No response'
              )}
              disabled={!response && !error}
            >
              {copySuccess ? (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5 mr-1" />
              )}
              Copy
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="context" className="p-4 space-y-3">
          {context.agentId && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Active Agent:</span>
              <Badge variant="outline" className="w-fit">{context.agentId}</Badge>
            </div>
          )}
          
          {context.subject && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Current Subject:</span>
              <Badge variant="secondary" className="w-fit">{context.subject}</Badge>
            </div>
          )}
          
          {context.activeContext && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Active Context:</span>
              <Badge variant="secondary" className="w-fit">{context.activeContext}</Badge>
            </div>
          )}
          
          {context.previousCommands && context.previousCommands.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Previous Commands:</span>
              <div className="bg-muted rounded-md p-2 max-h-40 overflow-y-auto">
                <ul className="text-xs space-y-2">
                  {context.previousCommands.slice().reverse().map((cmd, idx) => (
                    <li key={idx} className="border-b border-border pb-1 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">
                          {cmd.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {cmd.agentId || 'No agent'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs truncate">{cmd.original}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          <div className="flex justify-between mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (context.sessionId) {
                  agentVoiceCommandService.clearContext();
                  onClear();
                }
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear Context
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleCopyText(JSON.stringify(context, null, 2))}
            >
              {copySuccess ? (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5 mr-1" />
              )}
              Copy
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
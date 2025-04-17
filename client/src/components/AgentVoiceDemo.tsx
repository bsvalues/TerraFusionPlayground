import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { AgentVoiceInterface } from './agent-voice';
import { VoiceCommandResult } from '../services/agent-voice-command-service';

export function AgentVoiceDemo() {
  const [lastCommand, setLastCommand] = useState<VoiceCommandResult | null>(null);
  
  const handleCommandExecuted = (result: VoiceCommandResult) => {
    console.log('Command executed:', result);
    setLastCommand(result);
    
    // Here you would typically perform actions based on the command result
    // For example, if it's a navigation command, you might change routes
  };
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Agent Voice Command Demo</CardTitle>
          <CardDescription>
            Try interacting with the agent system using natural language voice commands.
            Click the microphone button to speak or type your commands directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <AgentVoiceInterface
              title="TaxI_AI Agent Voice Control"
              description="Control and interact with agents using voice commands"
              examples={[
                "What's the status of all agents?",
                "Ask property intelligence agent about property values in downtown",
                "Tell the data management agent to update property BC001",
                "List all available commands",
                "Show me help for agent commands"
              ]}
              onCommandExecuted={handleCommandExecuted}
            />
          </div>
          
          <div className="text-sm text-muted-foreground mt-8">
            <h3 className="font-medium text-base mb-2">Voice Command Tips:</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Start with an action verb (ask, tell, show, list, get)</li>
              <li>Be specific about which agent you want to interact with</li>
              <li>For complex tasks, break them down into multiple commands</li>
              <li>The system maintains context between commands, so you can refer to previous subjects</li>
              <li>Say "help" or "list commands" to see available options</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      {lastCommand && (
        <Card>
          <CardHeader>
            <CardTitle>Debug: Last Command Details</CardTitle>
            <CardDescription>
              Technical details of the last executed command (for demonstration purposes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md overflow-auto max-h-80">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(lastCommand, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
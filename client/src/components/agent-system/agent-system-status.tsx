/**
 * Agent System Status Component
 * 
 * Displays the current status of the agent system WebSocket connection
 * and provides controls for connecting/disconnecting.
 */

import { useAgentWebSocket } from '@/hooks/use-agent-websocket';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { Loader2, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AgentSystemStatusProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function AgentSystemStatus({
  className = '',
  variant = 'default'
}: AgentSystemStatusProps) {
  const { connectionStatus, connect, disconnect } = useAgentWebSocket({
    autoConnect: true,
    showToasts: true
  });
  
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [agentCount, setAgentCount] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Update the last message time when receiving messages
  useEffect(() => {
    const unsubscribe = useAgentWebSocket().on('*', () => {
      setLastMessageTime(new Date());
    });
    
    return () => unsubscribe();
  }, []);

  // Fetch active agent count
  useEffect(() => {
    const fetchAgentCount = async () => {
      try {
        const response = await fetch('/api/ai-agents');
        if (response.ok) {
          const agents = await response.json();
          setAgentCount(agents.length);
        }
      } catch (error) {
        console.error('Error fetching agent count:', error);
      }
    };

    fetchAgentCount();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchAgentCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <WifiOff className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const formatTimestamp = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  // Compact variant just shows an icon with tooltip
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`relative cursor-help ${className}`}>
              <div className={`h-3 w-3 rounded-full ${getStatusColor()}`}></div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-semibold">Agent System: {getStatusText()}</p>
              <p>Active Agents: {agentCount}</p>
              <p>Last activity: {formatTimestamp(lastMessageTime)}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default expanded view
  return (
    <div 
      className={`border rounded-md p-3 ${className} ${isExpanded ? 'w-64' : 'w-auto'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${getStatusColor()}`}></div>
          <h3 className="text-sm font-medium">Agent System</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {getStatusIcon()}
          <span className="ml-1">{getStatusText()}</span>
        </Badge>
      </div>

      {isExpanded && (
        <>
          <div className="text-xs text-muted-foreground mb-3">
            <div className="flex justify-between">
              <span>Active Agents:</span>
              <span className="font-semibold">{agentCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Activity:</span>
              <span>{formatTimestamp(lastMessageTime)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {connectionStatus === 'connected' || connectionStatus === 'connecting' ? (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs" 
                onClick={() => disconnect()}
                disabled={connectionStatus === 'connecting'}
              >
                Disconnect
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="default" 
                className="w-full text-xs" 
                onClick={() => connect()}
              >
                Connect
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
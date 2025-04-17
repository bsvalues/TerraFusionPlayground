
import React, { useEffect } from 'react';
import { agentSocketIOService } from '@/services/agent-socketio-service';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CircleSlash, WifiOff, Wifi } from 'lucide-react';

export const ConnectionStatusMonitor: React.FC = () => {
  const [status, setStatus] = React.useState(agentSocketIOService.getConnectionStatus());
  const [isUsingFallback, setIsUsingFallback] = React.useState(agentSocketIOService.isUsingFallback());
  const [retryCount, setRetryCount] = React.useState(0);

  useEffect(() => {
    const unsubscribe = agentSocketIOService.onConnectionStatusChange((newStatus) => {
      setStatus(newStatus);
      setIsUsingFallback(agentSocketIOService.isUsingFallback());
      if (newStatus === 'errored') {
        setRetryCount(prev => prev + 1);
      } else if (newStatus === 'connected') {
        setRetryCount(0);
      }
    });

    // Initial connection attempt
    agentSocketIOService.connect();

    return () => {
      unsubscribe();
      agentSocketIOService.disconnect();
    };
  }, []);

  if (status === 'connected' && !isUsingFallback) {
    return null;
  }

  return (
    <Alert variant={status === 'errored' ? 'destructive' : 'default'}>
      <AlertTitle className="flex items-center gap-2">
        {status === 'errored' ? <CircleSlash className="h-4 w-4" /> : 
         isUsingFallback ? <WifiOff className="h-4 w-4" /> : 
         <Wifi className="h-4 w-4" />}
        Connection Status
        <Badge variant={status === 'errored' ? 'destructive' : 'default'}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </AlertTitle>
      <AlertDescription>
        {isUsingFallback ? 
          'Using fallback REST API mode - functionality remains available with slightly higher latency.' :
          status === 'errored' ? 
          `Connection error detected - attempting to reconnect (Attempt ${retryCount})` : 
          status === 'connecting' ?
          'Establishing connection...' :
          status === 'connected' ?
          'Connected successfully' :
          'Connection status unknown'}
      </AlertDescription>
    </Alert>
  );
};

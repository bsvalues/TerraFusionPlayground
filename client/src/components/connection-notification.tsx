import React, { useEffect, useState } from 'react';
import { AlertCircle, Info, WifiOff, Router } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAgentSocketIO } from '@/hooks/use-agent-socketio';
import { ConnectionStatus } from '@/services/agent-socketio-service';

export function ConnectionNotification() {
  const { connectionStatus, isPolling } = useAgentSocketIO();
  const [showNotification, setShowNotification] = useState(false);
  
  // Show notification when using fallback
  useEffect(() => {
    // Show notification when using fallback polling or when in error state
    if (isPolling || connectionStatus === ConnectionStatus.ERRORED) {
      setShowNotification(true);
    } else if (connectionStatus === ConnectionStatus.CONNECTED && !isPolling) {
      // Hide notification when connection is restored
      setShowNotification(false);
    }
  }, [connectionStatus, isPolling]);
  
  // Keep notification visible for 30 seconds
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    if (showNotification) {
      timer = setTimeout(() => {
        setShowNotification(false);
      }, 30000); // 30 seconds
      
      return () => clearTimeout(timer);
    }
  }, [showNotification]);
  
  if (!showNotification) {
    return null;
  }
  
  return (
    <Alert variant="default" className="fixed bottom-4 right-4 w-auto max-w-md z-50 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
      <div className="flex items-start">
        <Router className="h-5 w-5 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="ml-3">
          <AlertTitle className="font-medium text-blue-800 dark:text-blue-200">
            Using API Fallback
          </AlertTitle>
          <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
            WebSocket connection unavailable. Using REST API fallback mode for communication. 
            The system remains fully functional with slightly higher latency.
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
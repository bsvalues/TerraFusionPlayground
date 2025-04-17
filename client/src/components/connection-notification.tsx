import React, { useEffect, useState } from 'react';
import { AlertCircle, Info, WifiOff, Router, RefreshCcw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAgentSocketIO } from '@/hooks/use-agent-socketio';
import { ConnectionStatus } from '@/services/agent-socketio-service';
import { Button } from '@/components/ui/button';

export function ConnectionNotification() {
  const { connectionStatus, isPolling, connect } = useAgentSocketIO();
  const [showNotification, setShowNotification] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
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
      }, 60000); // 60 seconds
      
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  // Handle manual reconnection attempt
  const handleReconnect = async () => {
    setReconnectAttempt(prev => prev + 1);
    try {
      await connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };
  
  if (!showNotification) {
    return null;
  }
  
  return (
    <Alert variant="default" className="fixed bottom-4 right-4 w-auto max-w-md z-50 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200 shadow-lg">
      <div className="flex items-start">
        {connectionStatus === ConnectionStatus.ERRORED ? (
          <AlertCircle className="h-5 w-5 mt-0.5 text-red-600 dark:text-red-400" />
        ) : (
          <Router className="h-5 w-5 mt-0.5 text-blue-600 dark:text-blue-400" />
        )}
        <div className="ml-3 flex-1">
          <AlertTitle className="font-medium text-blue-800 dark:text-blue-200">
            {connectionStatus === ConnectionStatus.ERRORED 
              ? 'Connection Error' 
              : 'Using API Fallback'}
          </AlertTitle>
          <AlertDescription className="text-sm text-blue-700 dark:text-blue-300 mb-2">
            {connectionStatus === ConnectionStatus.ERRORED 
              ? 'Unable to connect to the server. The system is using a fallback method. Your data is secure.' 
              : 'WebSocket connection unavailable. Using secure REST API fallback mode. All functionality remains available with minimal latency impact.'}
          </AlertDescription>
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReconnect}
              className="mt-1 text-xs bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-800"
            >
              <RefreshCcw className="h-3 w-3 mr-1" />
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
}
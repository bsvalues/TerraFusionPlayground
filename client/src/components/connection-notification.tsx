import React, { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { ConnectionStatus, TransportType } from './connection-status-badge';

export interface ConnectionNotificationProps {
  /**
   * Current connection status
   */
  status: ConnectionStatus;
  
  /**
   * Transport method being used
   */
  transport: TransportType;
  
  /**
   * Whether to show a toast notification when status changes
   * @default true
   */
  showToast?: boolean;
  
  /**
   * Whether to show a toast when fallback to polling occurs
   * @default true
   */
  showFallbackNotification?: boolean;
  
  /**
   * Whether to show reconnection attempts
   * @default true
   */
  showReconnectionAttempts?: boolean;
  
  /**
   * Number of reconnection attempts
   */
  reconnectCount?: number;
  
  /**
   * Function to manually attempt reconnection
   */
  onReconnect?: () => void;
  
  /**
   * Custom toast duration in milliseconds
   * @default 5000 (5 seconds)
   */
  toastDuration?: number;
}

/**
 * A component that shows connection status notifications
 * 
 * This component uses the toast system to display notifications
 * when connection status changes, helping users understand
 * what's happening with their connection to the server.
 */
export const ConnectionNotification: React.FC<ConnectionNotificationProps> = ({
  status,
  transport,
  showToast = true,
  showFallbackNotification = true,
  showReconnectionAttempts = true,
  reconnectCount = 0,
  onReconnect,
  toastDuration = 5000
}) => {
  const { toast } = useToast();
  const [prevStatus, setPrevStatus] = useState<ConnectionStatus>(status);
  const [prevTransport, setPrevTransport] = useState<TransportType>(transport);
  const [hasShownFallbackNotification, setHasShownFallbackNotification] = useState(false);
  
  useEffect(() => {
    // Handle status change notifications
    if (showToast && status !== prevStatus) {
      switch (status) {
        case 'connected':
          toast({
            title: "Connected",
            description: `Successfully connected to the server via ${transport === 'websocket' ? 'WebSocket' : 'HTTP polling'}.`,
            variant: "default",
            duration: toastDuration,
          });
          break;
        case 'connecting':
          // Only show if we're coming from disconnected or error, not on initial load
          if (prevStatus === 'disconnected' || prevStatus === 'error') {
            toast({
              title: "Reconnecting...",
              description: "Attempting to re-establish connection to the server.",
              // Use default variant as secondary is not available in the toast component
              duration: toastDuration,
            });
          }
          break;
        case 'disconnected':
          toast({
            title: "Disconnected",
            description: "Connection to the server has been lost. Retrying...",
            variant: "destructive",
            duration: toastDuration,
            action: onReconnect ? (
              <ToastAction altText="Try again" onClick={onReconnect}>
                Reconnect
              </ToastAction>
            ) : undefined,
          });
          break;
        case 'error':
          toast({
            title: "Connection Error",
            description: "Failed to connect to the server. Check your network connection.",
            variant: "destructive",
            duration: toastDuration,
            action: onReconnect ? (
              <ToastAction altText="Try again" onClick={onReconnect}>
                Retry
              </ToastAction>
            ) : undefined,
          });
          break;
      }
      
      setPrevStatus(status);
    }
    
    // Handle transport fallback notification
    if (showFallbackNotification && 
        transport !== prevTransport && 
        transport === 'polling' && 
        !hasShownFallbackNotification) {
      toast({
        title: "WebSocket Unavailable",
        description: "Using HTTP polling fallback. Some real-time features may be limited.",
        // Using default variant since warning is not available
        duration: 7000,
      });
      
      setHasShownFallbackNotification(true);
    }
    
    setPrevTransport(transport);
  }, [status, transport, showToast, showFallbackNotification, prevStatus, 
      prevTransport, hasShownFallbackNotification, toast, toastDuration, onReconnect]);
  
  // Show reconnection attempts notification
  useEffect(() => {
    if (showReconnectionAttempts && 
        reconnectCount > 0 && 
        (status === 'connecting' || status === 'disconnected')) {
      
      // Only show every 3 attempts to not overwhelm the user
      if (reconnectCount % 3 === 0) {
        toast({
          title: "Connection Unstable",
          description: `Made ${reconnectCount} attempt${reconnectCount !== 1 ? 's' : ''} to reconnect. Still trying...`,
          // Using default variant since warning is not available
          duration: toastDuration,
        });
      }
    }
  }, [reconnectCount, showReconnectionAttempts, status, toast, toastDuration]);
  
  return <Toaster />;
};

export default ConnectionNotification;
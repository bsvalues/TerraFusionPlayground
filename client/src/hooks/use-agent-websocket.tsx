/**
 * Agent WebSocket Hook
 * 
 * This hook provides a React interface for the agent WebSocket service,
 * allowing components to easily connect to agents, send messages, and
 * receive real-time updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { agentWebSocketService } from '@/services/agent-websocket-service';
import { useToast } from '@/hooks/use-toast';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type MessageHandler = (message: any) => void;

interface UseAgentWebSocketProps {
  autoConnect?: boolean;
  showToasts?: boolean;
}

interface UseAgentWebSocketResult {
  connectionStatus: ConnectionStatus;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sendAgentMessage: (recipientId: string, message: any) => Promise<string>;
  sendActionRequest: (targetAgent: string, action: string, params?: any) => Promise<string>;
  on: (type: string, handler: MessageHandler) => () => void;
  off: (type: string, handler: MessageHandler) => void;
}

/**
 * Hook for interacting with agent WebSocket service
 */
export function useAgentWebSocket({
  autoConnect = true,
  showToasts = false,
}: UseAgentWebSocketProps = {}): UseAgentWebSocketResult {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    agentWebSocketService.getConnectionStatus()
  );
  const { toast } = useToast();

  // Connect to the WebSocket server
  const connect = useCallback(async (): Promise<boolean> => {
    try {
      return await agentWebSocketService.connect();
    } catch (error) {
      console.error('Error connecting to agent WebSocket:', error);
      if (showToasts) {
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to agent system. Some features may be unavailable.',
          variant: 'destructive',
        });
      }
      return false;
    }
  }, [showToasts, toast]);

  // Disconnect from the WebSocket server
  const disconnect = useCallback((): void => {
    agentWebSocketService.disconnect();
  }, []);

  // Send a message to an agent
  const sendAgentMessage = useCallback(
    async (recipientId: string, message: any): Promise<string> => {
      try {
        return await agentWebSocketService.sendAgentMessage(recipientId, message);
      } catch (error) {
        console.error('Error sending agent message:', error);
        if (showToasts) {
          toast({
            title: 'Message Error',
            description: 'Failed to send message to agent. Please try again.',
            variant: 'destructive',
          });
        }
        throw error;
      }
    },
    [showToasts, toast]
  );

  // Send an action request to an agent
  const sendActionRequest = useCallback(
    async (targetAgent: string, action: string, params: any = {}): Promise<string> => {
      try {
        return await agentWebSocketService.sendActionRequest(targetAgent, action, params);
      } catch (error) {
        console.error('Error sending action request:', error);
        if (showToasts) {
          toast({
            title: 'Action Error',
            description: `Failed to request action "${action}" from agent. Please try again.`,
            variant: 'destructive',
          });
        }
        throw error;
      }
    },
    [showToasts, toast]
  );

  // Register a handler for a specific message type
  const on = useCallback(
    (type: string, handler: MessageHandler): (() => void) => {
      return agentWebSocketService.on(type, handler);
    },
    []
  );

  // Remove a handler for a specific message type
  const off = useCallback(
    (type: string, handler: MessageHandler): void => {
      agentWebSocketService.off(type, handler);
    },
    []
  );

  // Set up connection status listener and auto-connect
  useEffect(() => {
    // Listen for connection status changes
    const unsubscribe = agentWebSocketService.onConnectionStatusChange(setConnectionStatus);

    // Auto-connect if enabled
    if (autoConnect) {
      connect().catch(error => {
        console.error('Auto-connect failed:', error);
      });
    }

    // Listen for notification messages and show toasts
    let notificationUnsubscribe: (() => void) | null = null;
    
    if (showToasts) {
      notificationUnsubscribe = agentWebSocketService.on('notification', (message) => {
        if (message.level && message.title && message.message) {
          toast({
            title: message.title,
            description: message.message,
            variant: message.level === 'error' ? 'destructive' : 
                     message.level === 'warning' ? 'warning' : 'default',
          });
        }
      });
    }

    // Clean up event listeners on unmount
    return () => {
      unsubscribe();
      if (notificationUnsubscribe) {
        notificationUnsubscribe();
      }
    };
  }, [autoConnect, connect, showToasts, toast]);

  return {
    connectionStatus,
    connect,
    disconnect,
    sendAgentMessage,
    sendActionRequest,
    on,
    off,
  };
}
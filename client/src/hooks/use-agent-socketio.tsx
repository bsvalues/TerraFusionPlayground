/**
 * Agent Socket.IO Hook
 * 
 * This hook provides access to the agent Socket.IO service for React components.
 * It allows components to connect to the agent system, send messages, and 
 * receive real-time updates.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { agentSocketIOService, ConnectionStatus } from '../services/agent-socketio-service';

/**
 * Hook to use agent Socket.IO service
 * 
 * @returns Socket.IO service hook interface
 */
export function useAgentSocketIO() {
  const [isConnected, setIsConnected] = useState(agentSocketIOService.isConnected());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    agentSocketIOService.getConnectionStatus()
  );
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  
  // Connect to agent system
  const connect = useCallback(async () => {
    try {
      await agentSocketIOService.connect();
      return true;
    } catch (error) {
      console.error('Error connecting to agent system:', error);
      return false;
    }
  }, []);
  
  // Disconnect from agent system
  const disconnect = useCallback(() => {
    agentSocketIOService.disconnect();
  }, []);
  
  // Send message to agent
  const sendAgentMessage = useCallback(async (recipientId: string, message: any) => {
    try {
      return await agentSocketIOService.sendAgentMessage(recipientId, message);
    } catch (error) {
      console.error('Error sending agent message:', error);
      throw error;
    }
  }, []);
  
  // Send action request
  const sendActionRequest = useCallback(async (targetAgent: string, action: string, params: any = {}) => {
    try {
      return await agentSocketIOService.sendActionRequest(targetAgent, action, params);
    } catch (error) {
      console.error('Error sending action request:', error);
      throw error;
    }
  }, []);
  
  // Add event listener
  const addEventListener = useCallback((eventName: string, listener: (data: any) => void) => {
    agentSocketIOService.on(eventName, listener);
    
    // Return removal function
    return () => {
      agentSocketIOService.off(eventName, listener);
    };
  }, []);
  
  // Remove event listener
  const removeEventListener = useCallback((eventName: string, listener: (data: any) => void) => {
    agentSocketIOService.off(eventName, listener);
  }, []);
  
  // Effect to set up connection status listener
  useEffect(() => {
    // Listen for connection status changes
    const removeListener = agentSocketIOService.onConnectionStatusChange((status) => {
      setConnectionStatus(status);
      setIsConnected(status === ConnectionStatus.CONNECTED);
    });
    
    // Handle generic message event
    const messageHandler = (message: any) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    };
    
    agentSocketIOService.on('message', messageHandler);
    
    // Clean up
    return () => {
      removeListener();
      agentSocketIOService.off('message', messageHandler);
    };
  }, []);
  
  // Return values and functions
  return useMemo(() => ({
    isConnected,
    connectionStatus,
    isPolling: agentSocketIOService.isUsingFallback(),
    clientId: agentSocketIOService.getClientId(),
    lastMessage,
    messages,
    connect,
    disconnect,
    sendAgentMessage,
    sendActionRequest,
    addEventListener,
    removeEventListener,
    // Also export the connection status enum values
    connectionStatuses: ConnectionStatus
  }), [
    isConnected,
    connectionStatus,
    lastMessage,
    messages,
    connect,
    disconnect,
    sendAgentMessage,
    sendActionRequest,
    addEventListener,
    removeEventListener
  ]);
}

/**
 * Connection status indicator component for the agent Socket.IO service
 */
export function ConnectionStatusIndicator({ className = '' }: { className?: string }) {
  const { connectionStatus, connectionStatuses } = useAgentSocketIO();
  
  // Determine status color and text
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return { color: 'bg-green-500', text: 'Connected' };
      case ConnectionStatus.CONNECTING:
        return { color: 'bg-yellow-500', text: 'Connecting' };
      case ConnectionStatus.DISCONNECTED:
        return { color: 'bg-gray-500', text: 'Disconnected' };
      case ConnectionStatus.ERRORED:
        return { color: 'bg-red-500', text: 'Error' };
      default:
        return { color: 'bg-gray-500', text: 'Unknown' };
    }
  };
  
  const { color, text } = getStatusInfo();
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-xs">{text}</span>
    </div>
  );
}
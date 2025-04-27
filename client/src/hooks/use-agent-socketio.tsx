/**
 * Agent Socket.IO Hook
 * 
 * This hook provides access to the agent Socket.IO service for React components.
 * It allows components to connect to the agent system, send messages, and 
 * receive real-time updates.
 * 
 * Enhanced with connection metrics tracking and resilient connectivity features.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { agentSocketIOService, ConnectionStatus } from '../services/agent-socketio-service';
import { connectionMetricsService, ConnectionMetrics } from '../services/connection-metrics';

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
  const [isPolling, setIsPolling] = useState(agentSocketIOService.isUsingFallback());
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics>(
    connectionMetricsService.getMetrics()
  );
  
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
      
      // Also update polling status, as it often changes with connection status
      setIsPolling(agentSocketIOService.isUsingFallback());
      
      // Record status change in metrics
      connectionMetricsService.recordStatusChange(status);
      setConnectionMetrics(connectionMetricsService.getMetrics());
    });
    
    // Handle generic message event
    const messageHandler = (message: any) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
      
      // Check for fallback mode notifications
      if (message.type === 'notification' && 
          message.message && 
          message.message.includes('fallback')) {
        setIsPolling(agentSocketIOService.isUsingFallback());
        
        // Record fallback activation in metrics
        connectionMetricsService.recordFallbackActivated();
        setConnectionMetrics(connectionMetricsService.getMetrics());
      }
    };
    
    agentSocketIOService.on('message', messageHandler);
    
    // Set up periodic polling status check
    const pollingStatusInterval = setInterval(() => {
      const currentPollingStatus = agentSocketIOService.isUsingFallback();
      if (currentPollingStatus !== isPolling) {
        setIsPolling(currentPollingStatus);
        
        // Record fallback status change in metrics
        if (currentPollingStatus) {
          connectionMetricsService.recordFallbackActivated();
        } else {
          connectionMetricsService.recordFallbackDeactivated();
        }
        setConnectionMetrics(connectionMetricsService.getMetrics());
      }
    }, 2000);
    
    // Set up periodic metrics refresh
    const metricsRefreshInterval = setInterval(() => {
      setConnectionMetrics(connectionMetricsService.getMetrics());
    }, 5000);
    
    // Clean up
    return () => {
      removeListener();
      agentSocketIOService.off('message', messageHandler);
      clearInterval(pollingStatusInterval);
      clearInterval(metricsRefreshInterval);
    };
  }, [isPolling]);
  
  // Return values and functions
  return useMemo(() => ({
    isConnected,
    connectionStatus,
    isPolling,
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
    connectionStatuses: ConnectionStatus,
    // Connection metrics data for monitoring
    connectionMetrics
  }), [
    isConnected,
    connectionStatus,
    isPolling,
    lastMessage,
    messages,
    connect,
    disconnect,
    sendAgentMessage,
    sendActionRequest,
    addEventListener,
    removeEventListener,
    connectionMetrics
  ]);
}

/**
 * Connection status indicator component for the agent Socket.IO service
 * Provides enhanced visual feedback about connection state
 */
export function ConnectionStatusIndicator({ 
  className = '',
  showDetails = false,
  variant = 'default'
}: { 
  className?: string,
  showDetails?: boolean,
  variant?: 'default' | 'compact' | 'expanded' 
}) {
  const { connectionStatus, connectionStatuses, isPolling, connectionMetrics } = useAgentSocketIO();
  
  // Determine status color and text
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return { 
          color: 'bg-green-500', 
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
          bgColor: 'bg-green-50',
          text: 'Connected',
          icon: '✓',
          animate: false
        };
      case ConnectionStatus.CONNECTING:
        return { 
          color: 'bg-yellow-500', 
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200',
          bgColor: 'bg-yellow-50',
          text: 'Connecting',
          icon: '⟳',
          animate: true
        };
      case ConnectionStatus.DISCONNECTED:
        return { 
          color: 'bg-gray-500', 
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          bgColor: 'bg-gray-50',
          text: 'Disconnected',
          icon: '⚠',
          animate: false
        };
      case ConnectionStatus.ERRORED:
        return { 
          color: 'bg-red-500', 
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          bgColor: 'bg-red-50',
          text: 'Error',
          icon: '!',
          animate: false
        };
      default:
        return { 
          color: 'bg-gray-500', 
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          bgColor: 'bg-gray-50',
          text: 'Unknown',
          icon: '?',
          animate: false
        };
    }
  };
  
  const { color, textColor, borderColor, bgColor, text, icon, animate } = getStatusInfo();
  
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center ${className}`} title={`${text}${isPolling ? ' (Fallback Mode)' : ''}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${color} ${animate ? 'animate-pulse' : ''}`} />
      </div>
    );
  }
  
  if (variant === 'expanded') {
    return (
      <div className={`${className} ${borderColor} ${bgColor} border rounded-md p-2 flex flex-col`}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${color} ${animate ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-medium ${textColor}`}>
            {text}
            {isPolling && <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-[10px]">Fallback</span>}
          </span>
        </div>
        
        {showDetails && connectionMetrics && (
          <div className="text-[10px] text-gray-500 mt-1 pl-5">
            <div>Reconnections: {connectionMetrics.totalReconnectAttempts}</div>
            <div>Fallback activations: {connectionMetrics.totalFallbackActivations}</div>
            <div>Last event: {
              connectionMetrics.connectionEvents.length > 0 
                ? new Date(connectionMetrics.connectionEvents[connectionMetrics.connectionEvents.length - 1].timestamp).toLocaleTimeString() 
                : 'None'
            }</div>
          </div>
        )}
      </div>
    );
  }
  
  // Default variant
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-3 h-3 rounded-full ${color} ${animate ? 'animate-pulse' : ''}`} />
      <span className={`text-xs ${textColor}`}>
        {text}
        {isPolling && (
          <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-[10px]">
            Fallback Mode
          </span>
        )}
      </span>
    </div>
  );
}
import { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectionStatus, TransportType } from '@/components/connection-status-badge';
import { ConnectionMetrics } from '@/components/connection-health-metrics';

interface UseWebSocketOptions {
  /**
   * URL for the WebSocket connection
   */
  url: string;
  
  /**
   * Initial connection status
   * @default 'disconnected'
   */
  initialStatus?: ConnectionStatus;
  
  /**
   * Maximum number of reconnection attempts
   * @default 5
   */
  maxReconnectAttempts?: number;
  
  /**
   * Reconnection delay in milliseconds (will be increased exponentially)
   * @default 1000
   */
  reconnectDelay?: number;
  
  /**
   * Automatically try to reconnect on disconnect
   * @default true
   */
  autoReconnect?: boolean;
  
  /**
   * Protocol to be used (e.g., 'v1.0.0')
   */
  protocols?: string | string[];
  
  /**
   * Callback when a message is received
   */
  onMessage?: (event: MessageEvent) => void;
  
  /**
   * Callback when connection is opened
   */
  onOpen?: (event: Event) => void;
  
  /**
   * Callback when connection is closed
   */
  onClose?: (event: CloseEvent) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (event: Event) => void;
}

interface UseWebSocketResult {
  /**
   * Current connection status
   */
  status: ConnectionStatus;
  
  /**
   * WebSocket instance (if available)
   */
  socket: WebSocket | null;
  
  /**
   * Send a message through the WebSocket
   */
  sendMessage: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
  
  /**
   * Force a reconnection attempt
   */
  reconnect: () => void;
  
  /**
   * Manually disconnect the WebSocket
   */
  disconnect: () => void;
  
  /**
   * Connection metrics
   */
  metrics: ConnectionMetrics;
  
  /**
   * Type of transport being used
   */
  transport: TransportType;
}

/**
 * Custom hook for managing WebSocket connections.
 * 
 * This hook provides a managed WebSocket connection with automatic
 * reconnection, metrics tracking, and status management.
 */
export const useAgentWebSocket = (options: UseWebSocketOptions): UseWebSocketResult => {
  const {
    url,
    initialStatus = 'disconnected',
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    autoReconnect = true,
    protocols,
    onMessage,
    onOpen,
    onClose,
    onError
  } = options;
  
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [transport, setTransport] = useState<TransportType>('websocket');
  
  // Metrics
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    latency: 0,
    uptime: 0,
    messageCount: 0,
    reconnectCount: 0,
    lastMessageTime: null,
    failedAttempts: 0,
    transportType: 'websocket'
  });
  
  // Track connection start time
  const connectionStartTime = useRef<Date | null>(null);
  
  // Track ping/pong for latency calculation
  const lastPingTime = useRef<number>(0);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      // Close existing socket if any
      if (socket) {
        socket.close();
      }
      
      setStatus('connecting');
      
      // Create new WebSocket
      const newSocket = protocols 
        ? new WebSocket(url, protocols) 
        : new WebSocket(url);
      
      newSocket.onopen = (event) => {
        setStatus('connected');
        reconnectAttempts.current = 0;
        connectionStartTime.current = new Date();
        setTransport('websocket');
        
        // Start ping interval for latency measurement
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }
        
        pingInterval.current = setInterval(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            lastPingTime.current = Date.now();
            newSocket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
        
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          latency: 0,
          uptime: 100,
          transportType: 'websocket'
        }));
        
        // Call user callback
        if (onOpen) {
          onOpen(event);
        }
      };
      
      newSocket.onclose = (event) => {
        setStatus('disconnected');
        connectionStartTime.current = null;
        
        // Clear ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }
        
        // Call user callback
        if (onClose) {
          onClose(event);
        }
        
        // Attempt to reconnect if auto-reconnect is enabled
        if (autoReconnect && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts.current);
          reconnectAttempts.current++;
          
          // Update metrics
          setMetrics(prev => ({
            ...prev,
            reconnectCount: prev.reconnectCount + 1,
            uptime: 0
          }));
          
          if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
          }
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setStatus('error');
          
          // Update metrics
          setMetrics(prev => ({
            ...prev,
            failedAttempts: prev.failedAttempts + 1,
            uptime: 0
          }));
        }
      };
      
      newSocket.onerror = (event) => {
        // We don't set status here as the onclose will be called after this
        
        // Call user callback
        if (onError) {
          onError(event);
        }
        
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          failedAttempts: prev.failedAttempts + 1
        }));
      };
      
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong messages for latency calculation
          if (data.type === 'pong') {
            const latency = Date.now() - lastPingTime.current;
            setMetrics(prev => ({
              ...prev,
              latency
            }));
          }
        } catch (e) {
          // Not JSON or doesn't have type field, ignore
        }
        
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          messageCount: prev.messageCount + 1,
          lastMessageTime: new Date()
        }));
        
        // Call user callback
        if (onMessage) {
          onMessage(event);
        }
      };
      
      setSocket(newSocket);
    } catch (error) {
      setStatus('error');
      console.error('Error connecting to WebSocket:', error);
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        failedAttempts: prev.failedAttempts + 1,
        uptime: 0
      }));
    }
  }, [url, protocols, socket, autoReconnect, maxReconnectAttempts, reconnectDelay, onOpen, onClose, onMessage, onError]);
  
  // Send message
  const sendMessage = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
      return true;
    }
    return false;
  }, [socket]);
  
  // Manual reconnect
  const reconnect = useCallback(() => {
    // Reset reconnect attempts to give full reconnection attempts
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);
  
  // Manual disconnect
  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
    }
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    
    setStatus('disconnected');
    setSocket(null);
  }, [socket]);
  
  // Connect on mount
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      if (socket) {
        socket.close();
      }
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }
    };
  }, [connect, url]); // Only re-run if url changes
  
  // Calculate uptime
  useEffect(() => {
    if (status === 'connected' && connectionStartTime.current) {
      const calculateUptime = () => {
        if (!connectionStartTime.current) return;
        
        const now = new Date();
        const uptimeMs = now.getTime() - connectionStartTime.current.getTime();
        
        // For demo purposes, we'll use a max uptime of 1 hour to make the percentage meaningful
        const maxUptimeMs = 60 * 60 * 1000; // 1 hour
        const uptimePercentage = Math.min(100, (uptimeMs / maxUptimeMs) * 100);
        
        setMetrics(prev => ({
          ...prev,
          uptime: Math.round(uptimePercentage)
        }));
      };
      
      // Calculate immediately and then every minute
      calculateUptime();
      const uptimeInterval = setInterval(calculateUptime, 60000);
      
      return () => clearInterval(uptimeInterval);
    }
  }, [status]);
  
  return {
    status,
    socket,
    sendMessage,
    reconnect,
    disconnect,
    metrics,
    transport
  };
};

export default useAgentWebSocket;
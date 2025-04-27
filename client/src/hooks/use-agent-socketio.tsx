import { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectionStatus, TransportType } from '@/components/connection-status-badge';
import { ConnectionMetrics } from '@/components/connection-health-metrics';
import { io, Socket } from 'socket.io-client';

interface UseSocketIOOptions {
  /**
   * URL for the Socket.IO connection
   */
  url: string;
  
  /**
   * Path for the Socket.IO connection
   * @default "/socket.io"
   */
  path?: string;
  
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
   * Reconnection delay in milliseconds
   * @default 1000
   */
  reconnectDelay?: number;
  
  /**
   * Automatically try to reconnect on disconnect
   * @default true
   */
  autoReconnect?: boolean;
  
  /**
   * Events to listen for
   * @example [{ name: 'message', handler: (data) => console.log(data) }]
   */
  events?: Array<{ name: string, handler: (data: any) => void }>;
  
  /**
   * Namespace to connect to
   * @default "/"
   */
  namespace?: string;
  
  /**
   * Callback when connection is established
   */
  onConnect?: (socket: Socket) => void;
  
  /**
   * Callback when connection is lost
   */
  onDisconnect?: (reason: string) => void;
  
  /**
   * Callback when a reconnection attempt is made
   */
  onReconnectAttempt?: (attempt: number) => void;
  
  /**
   * Callback when reconnection is successful
   */
  onReconnect?: (attempt: number) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
  
  /**
   * Additional Socket.IO options
   */
  socketOptions?: any;
}

interface UseSocketIOResult {
  /**
   * Current connection status
   */
  status: ConnectionStatus;
  
  /**
   * Socket.IO instance (if available)
   */
  socket: Socket | null;
  
  /**
   * Send a message through Socket.IO
   */
  emit: (event: string, data: any) => void;
  
  /**
   * Force a reconnection attempt
   */
  reconnect: () => void;
  
  /**
   * Manually disconnect
   */
  disconnect: () => void;
  
  /**
   * Connection metrics
   */
  metrics: ConnectionMetrics;
  
  /**
   * Type of transport being used (websocket or polling)
   */
  transport: TransportType;
}

/**
 * Custom hook for managing Socket.IO connections.
 * 
 * This hook provides a managed Socket.IO connection with automatic
 * reconnection, metrics tracking, and status management. It detects
 * when Socket.IO falls back to polling and updates the transport type.
 */
export const useAgentSocketIO = (options: UseSocketIOOptions): UseSocketIOResult => {
  const {
    url,
    path = '/socket.io',
    initialStatus = 'disconnected',
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    autoReconnect = true,
    events = [],
    namespace = '/',
    onConnect,
    onDisconnect,
    onReconnectAttempt,
    onReconnect,
    onError,
    socketOptions = {}
  } = options;
  
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [transport, setTransport] = useState<TransportType>('websocket');
  const reconnectAttempts = useRef(0);
  
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
  
  // Initialize Socket.IO connection
  const initSocket = useCallback(() => {
    try {
      setStatus('connecting');
      
      // Close existing socket if any
      if (socket) {
        socket.disconnect();
      }
      
      // Create Socket.IO instance
      const socketInstance = io(`${url}${namespace}`, {
        path,
        reconnection: autoReconnect,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: reconnectDelay,
        timeout: 10000,
        ...socketOptions
      });
      
      // Connect event
      socketInstance.on('connect', () => {
        setStatus('connected');
        reconnectAttempts.current = 0;
        connectionStartTime.current = new Date();
        
        // Determine transport type
        const currentTransport = socketInstance.io.engine.transport.name as 'websocket' | 'polling';
        setTransport(currentTransport === 'websocket' ? 'websocket' : 'polling');
        
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          uptime: 100,
          transportType: currentTransport === 'websocket' ? 'websocket' : 'polling'
        }));
        
        // Start ping interval for latency measurement
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }
        
        pingInterval.current = setInterval(() => {
          lastPingTime.current = Date.now();
          socketInstance.emit('ping');
        }, 30000); // Ping every 30 seconds
        
        if (onConnect) {
          onConnect(socketInstance);
        }
      });
      
      // Transport change event
      socketInstance.io.engine.on('upgrade', (transport) => {
        const newTransport = transport.name as 'websocket' | 'polling';
        setTransport(newTransport === 'websocket' ? 'websocket' : 'polling');
        
        setMetrics(prev => ({
          ...prev,
          transportType: newTransport === 'websocket' ? 'websocket' : 'polling'
        }));
      });
      
      // Disconnect event
      socketInstance.on('disconnect', (reason) => {
        setStatus('disconnected');
        connectionStartTime.current = null;
        
        // Clear ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }
        
        if (onDisconnect) {
          onDisconnect(reason);
        }
      });
      
      // Reconnect attempt event
      socketInstance.io.on('reconnect_attempt', (attempt) => {
        setStatus('connecting');
        reconnectAttempts.current = attempt;
        
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          reconnectCount: prev.reconnectCount + 1
        }));
        
        if (onReconnectAttempt) {
          onReconnectAttempt(attempt);
        }
      });
      
      // Reconnect event
      socketInstance.io.on('reconnect', (attempt) => {
        setStatus('connected');
        connectionStartTime.current = new Date();
        
        if (onReconnect) {
          onReconnect(attempt);
        }
      });
      
      // Reconnect error event
      socketInstance.io.on('reconnect_error', (error) => {
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          failedAttempts: prev.failedAttempts + 1
        }));
        
        if (onError) {
          onError(error);
        }
      });
      
      // Reconnect failed event
      socketInstance.io.on('reconnect_failed', () => {
        setStatus('error');
        
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          failedAttempts: prev.failedAttempts + 1,
          uptime: 0
        }));
      });
      
      // Error event
      socketInstance.on('error', (error) => {
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          failedAttempts: prev.failedAttempts + 1
        }));
        
        if (onError) {
          onError(error);
        }
      });
      
      // Listen for pong event for latency calculation
      socketInstance.on('pong', () => {
        const latency = Date.now() - lastPingTime.current;
        
        setMetrics(prev => ({
          ...prev,
          latency
        }));
      });
      
      // Register custom event listeners
      events.forEach(({ name, handler }) => {
        socketInstance.on(name, (data) => {
          // Update metrics for any message received
          setMetrics(prev => ({
            ...prev,
            messageCount: prev.messageCount + 1,
            lastMessageTime: new Date()
          }));
          
          handler(data);
        });
      });
      
      setSocket(socketInstance);
    } catch (error) {
      setStatus('error');
      console.error('Error initializing Socket.IO:', error);
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        failedAttempts: prev.failedAttempts + 1,
        uptime: 0
      }));
      
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }, [
    url, namespace, path, socketOptions, autoReconnect, maxReconnectAttempts, 
    reconnectDelay, events, socket, onConnect, onDisconnect, onReconnectAttempt, 
    onReconnect, onError
  ]);
  
  // Emit event
  const emit = useCallback((event: string, data: any) => {
    if (socket && socket.connected) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }, [socket]);
  
  // Manual reconnect
  const reconnect = useCallback(() => {
    if (socket) {
      socket.connect();
    } else {
      initSocket();
    }
  }, [socket, initSocket]);
  
  // Manual disconnect
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    
    setStatus('disconnected');
  }, [socket]);
  
  // Initialize on mount
  useEffect(() => {
    initSocket();
    
    // Clean up on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
      
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
      }
    };
  }, [initSocket]);
  
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
    emit,
    reconnect,
    disconnect,
    metrics,
    transport
  };
};

export default useAgentSocketIO;
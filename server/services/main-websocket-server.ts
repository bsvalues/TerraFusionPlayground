/**
 * Main WebSocket Server Service
 * 
 * This service provides a robust WebSocket server implementation for the main /ws endpoint.
 * It includes features like:
 * - Connection tracking and management
 * - Heartbeat mechanism to keep connections alive
 * - Proper error handling for all client interactions
 * - Fallback mechanisms for unreliable connections
 * - Metrics collection for monitoring
 */

import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { metricsService } from './prometheus-metrics-service';
import { logger } from '../utils/logger';

/**
 * Interface for WebSocket client with additional metadata
 */
interface EnhancedWebSocket extends WebSocket {
  clientId: string;
  clientIp: string | string[];
  connectionTime: number;
  lastActivity: number;
  isAlive: boolean;
  userAgent?: string;
  origin?: string;
  retryCount?: Record<string, number>;
  lastPingTime?: number;
  pongReceived?: boolean;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
}

/**
 * Main WebSocket Server Service class
 */
export class MainWebSocketServer {
  private static instance: MainWebSocketServer;
  private wss: WebSocketServer | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private clients: Map<string, EnhancedWebSocket> = new Map();
  private connectionCount: number = 0;
  private messageCount: number = 0;
  private errorCount: number = 0;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MainWebSocketServer {
    if (!MainWebSocketServer.instance) {
      MainWebSocketServer.instance = new MainWebSocketServer();
    }
    return MainWebSocketServer.instance;
  }
  
  /**
   * Initialize the WebSocket server on the given HTTP server
   * 
   * @param server HTTP server to attach to
   */
  public initialize(server: Server): void {
    try {
      logger.info('[WebSocket Server] Initializing main WebSocket server on path: /ws');
      
      // Initialize the WebSocket server with options for better reliability
      this.wss = new WebSocketServer({
        server,
        path: '/ws',
        clientTracking: true,
        // Disable perMessageDeflate to avoid issues with proxies
        perMessageDeflate: false,
        // Explicitly set timeouts for better reliability in Replit environment
        maxPayload: 5 * 1024 * 1024, // 5MB max payload
        // Add verification handler
        verifyClient: this.verifyClient.bind(this)
      });
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Start heartbeat interval
      this.startHeartbeat();
      
      logger.info('[WebSocket Server] Main WebSocket server initialized successfully');
    } catch (error) {
      logger.error('[WebSocket Server] Failed to initialize WebSocket server:', error);
      // Record error metric
      metricsService.incrementCounter('websocket_initialization_errors_total', {
        error_type: error?.name || 'Unknown',
        error_message: error?.message || 'No message'
      });
    }
  }
  
  /**
   * Set up WebSocket server event handlers
   */
  private setupEventHandlers(): void {
    if (!this.wss) {
      return;
    }
    
    // Handle new connections
    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Handle server errors
    this.wss.on('error', (error) => {
      logger.error('[WebSocket Server] Server error:', error);
      this.errorCount++;
      
      // Record error metric
      metricsService.incrementCounter('websocket_server_errors_total', {
        error_type: error?.name || 'Unknown',
        error_message: error?.message || 'No message'
      });
    });
    
    // Handle server close
    this.wss.on('close', () => {
      logger.info('[WebSocket Server] Server closing');
      this.stopHeartbeat();
    });
    
    // Handle listening event 
    this.wss.on('listening', () => {
      logger.info('[WebSocket Server] Server listening for connections');
    });
  }
  
  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: any): void {
    try {
      // Generate client ID and enhance the WebSocket instance
      const clientId = `client_${uuidv4()}`;
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const enhancedWs = ws as EnhancedWebSocket;
      
      // Set client metadata
      enhancedWs.clientId = clientId;
      enhancedWs.clientIp = clientIp;
      enhancedWs.connectionTime = Date.now();
      enhancedWs.lastActivity = Date.now();
      enhancedWs.isAlive = true;
      enhancedWs.userAgent = req.headers['user-agent'];
      enhancedWs.origin = req.headers.origin;
      enhancedWs.messagesSent = 0;
      enhancedWs.messagesReceived = 0;
      enhancedWs.errors = 0;
      
      // Add client to the map
      this.clients.set(clientId, enhancedWs);
      this.connectionCount++;
      
      // Record connection metric
      metricsService.incrementCounter('websocket_connections_total', {
        client_id: clientId,
        client_ip: Array.isArray(clientIp) ? clientIp[0] : clientIp,
        origin: enhancedWs.origin || 'unknown'
      });
      
      logger.info(`[WebSocket Server] Client ${clientId} connected from ${clientIp}`);
      
      // Set up event handlers for this connection
      this.setupClientEventHandlers(enhancedWs);
      
      // Send welcome message
      this.sendWelcomeMessage(enhancedWs);
    } catch (error) {
      logger.error('[WebSocket Server] Error handling new connection:', error);
      this.errorCount++;
      
      // Record error metric
      metricsService.incrementCounter('websocket_connection_errors_total', {
        error_type: error?.name || 'Unknown',
        error_message: error?.message || 'No message'
      });
    }
  }
  
  /**
   * Set up event handlers for a specific client
   */
  private setupClientEventHandlers(ws: EnhancedWebSocket): void {
    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        // Parse message
        const message = data.toString();
        ws.messagesReceived++;
        ws.lastActivity = Date.now();
        this.messageCount++;
        
        // Record message metric
        metricsService.incrementCounter('websocket_messages_received_total', {
          client_id: ws.clientId
        });
        
        // Try to parse as JSON
        let parsedMessage: any;
        try {
          parsedMessage = JSON.parse(message);
          
          // Handle different message types
          if (parsedMessage.type === 'ping') {
            // Respond to client ping
            this.safelySendMessage(ws, {
              type: 'pong',
              timestamp: new Date().toISOString(),
              id: parsedMessage.id
            });
          } else if (parsedMessage.type === 'echo') {
            // Echo message back
            this.safelySendMessage(ws, {
              type: 'echo',
              originalMessage: parsedMessage,
              timestamp: new Date().toISOString()
            });
          } else {
            // Handle generic message - log but don't take action
            logger.debug(`[WebSocket Server] Received message from ${ws.clientId}:`, parsedMessage);
          }
        } catch (parseError) {
          // Not JSON, might be a raw string
          logger.debug(`[WebSocket Server] Received non-JSON message from ${ws.clientId}: ${message}`);
          
          // Echo back non-JSON messages as well
          this.safelySendMessage(ws, {
            type: 'echo',
            originalMessage: message,
            timestamp: new Date().toISOString(),
            format: 'string'
          });
        }
      } catch (error) {
        // Record message processing error
        ws.errors++;
        logger.error(`[WebSocket Server] Error processing message from ${ws.clientId}:`, error);
        
        // Record error metric
        metricsService.incrementCounter('websocket_message_errors_total', {
          client_id: ws.clientId,
          error_type: error?.name || 'Unknown',
          error_message: error?.message || 'No message'
        });
      }
    });
    
    // Handle connection close
    ws.on('close', (code, reason) => {
      logger.info(`[WebSocket Server] Client ${ws.clientId} disconnected. Code: ${code}, Reason: ${reason}`);
      
      // Record close metric
      metricsService.incrementCounter('websocket_disconnections_total', {
        client_id: ws.clientId,
        code: code.toString(),
        reason: reason.toString() || 'No reason'
      });
      
      // Clean up client
      this.clients.delete(ws.clientId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      ws.errors++;
      logger.error(`[WebSocket Server] Error with client ${ws.clientId}:`, error);
      
      // Record error metric
      metricsService.incrementCounter('websocket_client_errors_total', {
        client_id: ws.clientId,
        error_type: error?.name || 'Unknown',
        error_message: error?.message || 'No message'
      });
    });
    
    // Handle pong messages (response to our ping)
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.pongReceived = true;
      ws.lastActivity = Date.now();
      logger.debug(`[WebSocket Server] Received pong from ${ws.clientId}`);
    });
  }
  
  /**
   * Client verification handler
   */
  private verifyClient(info: any, callback: (result: boolean, code?: number, message?: string) => void): boolean {
    try {
      // Log verification attempt
      logger.debug('[WebSocket Server] Verifying client connection', {
        origin: info.origin,
        secured: info.secure
      });
      
      // Origin check (can be customized based on environment)
      // In production, this should be more restrictive
      const originAllowed = true;
      
      if (callback) {
        callback(originAllowed, originAllowed ? 200 : 403, 
          originAllowed ? 'Connection authorized' : 'Unauthorized origin');
      }
      
      return originAllowed;
    } catch (error) {
      logger.error('[WebSocket Server] Error in verifyClient:', error);
      if (callback) {
        callback(false, 500, 'Internal Server Error');
      }
      return false;
    }
  }
  
  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    const HEARTBEAT_INTERVAL = 30000; // 30 seconds
    
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      
      logger.debug(`[WebSocket Server] Running heartbeat. Active clients: ${this.clients.size}`);
      
      // Check all clients
      this.clients.forEach((ws, clientId) => {
        // If no pong was received since last ping, terminate connection
        if (ws.isAlive === false) {
          logger.info(`[WebSocket Server] Terminating inactive client ${clientId}`);
          
          // Record termination metric
          metricsService.incrementCounter('websocket_terminations_total', {
            client_id: clientId,
            reason: 'heartbeat_timeout'
          });
          
          // Terminate connection
          ws.terminate();
          this.clients.delete(clientId);
          return;
        }
        
        // Mark as not alive until pong is received
        ws.isAlive = false;
        ws.lastPingTime = Date.now();
        ws.pongReceived = false;
        
        // Send ping
        try {
          ws.ping();
        } catch (error) {
          logger.error(`[WebSocket Server] Error sending ping to ${clientId}:`, error);
          ws.errors++;
          
          // Record error metric
          metricsService.incrementCounter('websocket_ping_errors_total', {
            client_id: clientId,
            error_type: error?.name || 'Unknown',
            error_message: error?.message || 'No message'
          });
          
          // Terminate connection on ping error
          try {
            ws.terminate();
            this.clients.delete(clientId);
          } catch (terminateError) {
            logger.error(`[WebSocket Server] Error terminating client ${clientId}:`, terminateError);
          }
        }
      });
      
      // Update metrics
      metricsService.setGauge('websocket_active_connections', this.clients.size);
      metricsService.setGauge('websocket_total_messages', this.messageCount);
      metricsService.setGauge('websocket_total_errors', this.errorCount);
    }, HEARTBEAT_INTERVAL);
    
    logger.info(`[WebSocket Server] Heartbeat started with interval of ${HEARTBEAT_INTERVAL}ms`);
  }
  
  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('[WebSocket Server] Heartbeat stopped');
    }
  }
  
  /**
   * Send welcome message to newly connected client
   */
  private sendWelcomeMessage(ws: EnhancedWebSocket): void {
    this.safelySendMessage(ws, {
      type: 'welcome',
      message: 'Connected to TerraFusion WebSocket Server',
      timestamp: new Date().toISOString(),
      clientId: ws.clientId,
      serverInfo: {
        heartbeatInterval: 30000,
        connectionTime: new Date().toISOString(),
        server: 'TerraFusion WebSocket Server',
        version: '1.0.0'
      }
    });
  }
  
  /**
   * Send message to a connected client with robust error handling
   */
  public safelySendMessage(
    ws: EnhancedWebSocket,
    message: any,
    options: {
      priority?: 'high' | 'normal' | 'low',
      retry?: boolean,
      maxRetries?: number,
      retryDelay?: number,
      traceId?: string
    } = {}
  ): boolean {
    try {
      // Handle connection state
      if (ws.readyState !== WebSocket.OPEN) {
        const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
        const stateString = states[ws.readyState] || 'UNKNOWN';
        
        logger.debug(`[WebSocket Server] Cannot send message, connection not open (state: ${stateString}). Client: ${ws.clientId}`);
        return false;
      }
      
      // Prepare message
      if (typeof message !== 'string') {
        // Add metadata to help with debugging
        message._metadata = {
          serverTimestamp: new Date().toISOString(),
          clientId: ws.clientId
        };
      }
      
      const messageData = typeof message === 'string' ? message : JSON.stringify(message);
      
      // Send message
      ws.send(messageData, (error) => {
        if (error) {
          ws.errors++;
          logger.error(`[WebSocket Server] Error sending message to ${ws.clientId}:`, error);
          
          // Record error metric
          metricsService.incrementCounter('websocket_send_errors_total', {
            client_id: ws.clientId,
            error_type: error?.name || 'Unknown',
            error_message: error?.message || 'No message'
          });
          
          return false;
        }
        
        // Message sent successfully
        ws.messagesSent++;
        ws.lastActivity = Date.now();
        
        // Record metric
        metricsService.incrementCounter('websocket_messages_sent_total', {
          client_id: ws.clientId
        });
        
        return true;
      });
      
      return true;
    } catch (error) {
      ws.errors++;
      logger.error(`[WebSocket Server] Unexpected error sending message to ${ws.clientId}:`, error);
      
      // Record error metric
      metricsService.incrementCounter('websocket_unexpected_send_errors_total', {
        client_id: ws.clientId,
        error_type: error?.name || 'Unknown',
        error_message: error?.message || 'No message'
      });
      
      return false;
    }
  }
  
  /**
   * Broadcast message to all connected clients
   */
  public broadcastMessage(message: any, excludeClientId?: string): number {
    let successCount = 0;
    
    this.clients.forEach((ws, clientId) => {
      // Skip the excluded client if specified
      if (excludeClientId && clientId === excludeClientId) {
        return;
      }
      
      if (this.safelySendMessage(ws, message)) {
        successCount++;
      }
    });
    
    // Record broadcast metric
    metricsService.incrementCounter('websocket_broadcasts_total', {
      recipients: this.clients.size.toString(),
      success_count: successCount.toString()
    });
    
    return successCount;
  }
  
  /**
   * Get connection statistics
   */
  public getStats(): any {
    return {
      activeConnections: this.clients.size,
      totalMessages: this.messageCount,
      totalErrors: this.errorCount,
      clients: Array.from(this.clients.entries()).map(([clientId, ws]) => ({
        clientId,
        clientIp: ws.clientIp,
        connectionTime: new Date(ws.connectionTime).toISOString(),
        lastActivity: new Date(ws.lastActivity).toISOString(),
        messagesSent: ws.messagesSent,
        messagesReceived: ws.messagesReceived,
        errors: ws.errors,
        origin: ws.origin || 'unknown',
        userAgent: ws.userAgent || 'unknown'
      }))
    };
  }
  
  /**
   * Shutdown the WebSocket server
   */
  public shutdown(): void {
    logger.info('[WebSocket Server] Shutting down WebSocket server');
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Close all connections
    this.clients.forEach((ws, clientId) => {
      try {
        ws.close(1000, 'Server shutting down');
      } catch (error) {
        logger.error(`[WebSocket Server] Error closing connection to ${clientId}:`, error);
      }
    });
    
    // Clear clients
    this.clients.clear();
    
    // Close server
    if (this.wss) {
      try {
        this.wss.close();
        logger.info('[WebSocket Server] WebSocket server closed');
      } catch (error) {
        logger.error('[WebSocket Server] Error closing WebSocket server:', error);
      }
      this.wss = null;
    }
  }
}

// Export singleton instance
export const mainWebSocketServer = MainWebSocketServer.getInstance();
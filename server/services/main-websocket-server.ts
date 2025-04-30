/**
 * MainWebSocketServer
 * 
 * A robust, centralized WebSocket server implementation that handles all WebSocket connections
 * with enhanced error handling, reconnection strategies, and fallback mechanisms.
 * 
 * Features:
 * - Connection pooling and tracking
 * - Heartbeat mechanism for detecting dead connections
 * - Comprehensive error handling and logging
 * - Built-in metrics recording
 * - Automatic recovery from network issues
 * - Connection state management
 * 
 * This class follows the singleton pattern to ensure a single instance across the application.
 */

import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { metricsService } from './prometheus-metrics-service';

// Define connection states for better tracking
enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

// Client information interface
interface WebSocketClient {
  ws: WebSocket;
  id: string;
  ip: string | string[] | undefined;
  connectedAt: number;
  lastActivity: number;
  isAlive: boolean;
  state: ConnectionState;
  userAgent?: string;
  metadata: Record<string, any>;
  messagesReceived: number;
  messagesSent: number;
  reconnects: number;
}

class MainWebSocketServer {
  private static instance: MainWebSocketServer;
  private wss: WebSocketServer | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private path: string = '/ws';
  private initialized: boolean = false;

  // Private constructor for singleton pattern
  private constructor() {}

  // Get the singleton instance
  public static getInstance(): MainWebSocketServer {
    if (!MainWebSocketServer.instance) {
      MainWebSocketServer.instance = new MainWebSocketServer();
    }
    return MainWebSocketServer.instance;
  }

  /**
   * Initialize the WebSocket server with the HTTP server
   * @param httpServer The HTTP server to attach the WebSocket server to
   * @param options Optional configuration options
   */
  public initialize(httpServer: HttpServer, options: {
    path?: string,
    heartbeatIntervalMs?: number
  } = {}): void {
    if (this.initialized) {
      logger.warn('[MainWebSocketServer] Server already initialized');
      return;
    }

    // Set options
    this.path = options.path || '/ws';
    const heartbeatIntervalMs = options.heartbeatIntervalMs || 30000; // 30 seconds default

    logger.info(`[MainWebSocketServer] Initializing on path: ${this.path}`);

    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: httpServer,
      path: this.path,
      clientTracking: true,
      perMessageDeflate: false, // Disable for better compatibility with proxies
      maxPayload: 5 * 1024 * 1024, // 5MB max payload
      handshakeTimeout: 60000, // 60 seconds handshake timeout
      verifyClient: this.verifyClient.bind(this)
    });

    // Set up event handlers
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));
    this.wss.on('close', this.handleServerClose.bind(this));

    // Start heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, heartbeatIntervalMs);

    this.initialized = true;
    logger.info('[MainWebSocketServer] Initialization complete');

    // Record metric for server start
    metricsService.incrementCounter('websocket_server_starts_total', {
      path: this.path
    });
  }

  /**
   * Verify client connection before accepting
   */
  private verifyClient(
    info: { origin: string; secure: boolean; req: any },
    callback: (result: boolean, code?: number, message?: string) => void
  ): void {
    try {
      logger.debug('[MainWebSocketServer] Verifying client connection', {
        origin: info.origin,
        path: info.req.url,
        headers: info.req.headers
      });

      // Accept all connections in development mode
      // In production, implement proper origin validation
      const originAllowed = true;

      // Record metrics about connection attempts
      metricsService.incrementCounter('websocket_connection_attempts_total', {
        origin: info.origin,
        path: info.req.url,
        allowed: String(originAllowed)
      });

      if (callback) {
        callback(
          originAllowed,
          originAllowed ? 200 : 403,
          originAllowed ? 'Connection authorized' : 'Unauthorized origin'
        );
      }
    } catch (error) {
      logger.error('[MainWebSocketServer] Error in verifyClient', { error });
      if (callback) {
        callback(false, 500, 'Internal server error');
      }
    }
  }

  /**
   * Handle new WebSocket connections
   */
  private handleConnection(ws: WebSocket, req: any): void {
    try {
      // Generate unique client ID
      const clientId = `client_${Date.now()}_${randomUUID().substring(0, 8)}`;
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      
      logger.info(`[MainWebSocketServer] Client ${clientId} connected from ${clientIp}`);
      
      // Create client record
      const client: WebSocketClient = {
        ws,
        id: clientId,
        ip: clientIp,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        isAlive: true,
        state: ConnectionState.CONNECTED,
        userAgent: req.headers['user-agent'],
        metadata: {
          headers: req.headers,
          url: req.url
        },
        messagesReceived: 0,
        messagesSent: 0,
        reconnects: 0
      };
      
      // Store client
      this.clients.set(clientId, client);
      
      // Set up client event handlers
      ws.on('message', (message) => this.handleMessage(clientId, message));
      ws.on('pong', () => this.handlePong(clientId));
      ws.on('error', (error) => this.handleClientError(clientId, error));
      ws.on('close', (code, reason) => this.handleClientClose(clientId, code, reason));
      
      // Send welcome message
      this.send(clientId, {
        type: 'system',
        event: 'connected',
        timestamp: new Date().toISOString(),
        clientId,
        message: 'Connected to TerraFusion WebSocket Server',
        config: {
          heartbeatInterval: 30000,
          reconnectStrategy: {
            initialDelay: 1000,
            maxDelay: 30000,
            multiplier: 1.5,
            maxAttempts: 10
          }
        }
      });
      
      // Record connection metric
      metricsService.incrementCounter('websocket_connections_total', {
        path: this.path,
        client_id: clientId
      });
      
      // Also update gauge for current connections
      metricsService.setGauge('websocket_connections_current', this.clients.size, {
        path: this.path
      });
    } catch (error) {
      logger.error('[MainWebSocketServer] Error handling connection', { error });
    }
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(clientId: string, message: WebSocket.Data): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      // Update activity timestamp
      client.lastActivity = Date.now();
      client.messagesReceived++;
      
      // Parse message
      let parsedMessage: any;
      let messageStr = '';
      
      try {
        messageStr = message.toString();
        parsedMessage = JSON.parse(messageStr);
      } catch (error) {
        logger.warn(`[MainWebSocketServer] Invalid message format from ${clientId}`, {
          message: messageStr.length > 100 ? messageStr.substring(0, 100) + '...' : messageStr
        });
        
        // Send parse error response
        this.send(clientId, {
          type: 'error',
          error: 'invalid_format',
          message: 'Message must be valid JSON',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Handle different message types
      switch (parsedMessage.type) {
        case 'ping':
          this.handlePingMessage(clientId, parsedMessage);
          break;
          
        case 'message':
          // Echo message back for testing
          this.send(clientId, {
            type: 'message',
            echo: true,
            content: parsedMessage.content,
            originalMessage: parsedMessage,
            timestamp: new Date().toISOString()
          });
          break;
          
        default:
          // Handle standard echo
          this.send(clientId, {
            type: 'echo',
            originalMessage: parsedMessage,
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      logger.error(`[MainWebSocketServer] Error handling message from ${clientId}`, { error });
    }
  }

  /**
   * Handle ping messages from clients
   */
  private handlePingMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // Calculate latency if client sent timestamp
    const latency = message.timestamp ? Date.now() - message.timestamp : null;
    
    // Respond with pong
    this.send(clientId, {
      type: 'pong',
      timestamp: Date.now(),
      latency,
      clientId
    });
    
    // Record metric
    if (latency) {
      metricsService.recordHistogram('websocket_ping_latency_ms', latency, {
        client_id: clientId
      });
    }
  }

  /**
   * Handle pong responses from clients
   */
  private handlePong(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.isAlive = true;
    client.lastActivity = Date.now();
    
    logger.debug(`[MainWebSocketServer] Received pong from ${clientId}`);
  }

  /**
   * Handle client errors
   */
  private handleClientError(clientId: string, error: Error): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    logger.error(`[MainWebSocketServer] Error from client ${clientId}`, { error });
    
    client.state = ConnectionState.ERROR;
    
    // Record error metric
    metricsService.incrementCounter('websocket_client_errors_total', {
      client_id: clientId,
      error_type: error.name,
      error_message: error.message
    });
  }

  /**
   * Handle client disconnections
   */
  private handleClientClose(clientId: string, code: number, reason: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const duration = Date.now() - client.connectedAt;
    
    logger.info(`[MainWebSocketServer] Client ${clientId} disconnected`, {
      code,
      reason: reason || 'No reason provided',
      duration_ms: duration
    });
    
    // Clean up client
    this.clients.delete(clientId);
    
    // Record metrics
    metricsService.incrementCounter('websocket_disconnections_total', {
      client_id: clientId,
      code: String(code),
      reason: reason || 'No reason provided' 
    });
    
    // Update connection gauge
    metricsService.setGauge('websocket_connections_current', this.clients.size, {
      path: this.path
    });
    
    // Record connection duration
    metricsService.recordHistogram('websocket_connection_duration_seconds', duration / 1000, {
      client_id: clientId
    });
  }

  /**
   * Handle server-level errors
   */
  private handleServerError(error: Error): void {
    logger.error('[MainWebSocketServer] Server error', { error });
    
    // Record server error metric
    metricsService.incrementCounter('websocket_server_errors_total', {
      error_type: error.name,
      error_message: error.message
    });
  }

  /**
   * Handle server shutdown
   */
  private handleServerClose(): void {
    logger.info('[MainWebSocketServer] Server closed');
    
    // Clean up
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Disconnect all clients
    this.clients.forEach((client, clientId) => {
      try {
        client.state = ConnectionState.DISCONNECTING;
        client.ws.terminate();
        this.clients.delete(clientId);
      } catch (error) {
        logger.error(`[MainWebSocketServer] Error disconnecting client ${clientId}`, { error });
      }
    });
    
    this.initialized = false;
  }

  /**
   * Check all client heartbeats and terminate dead connections
   */
  private checkHeartbeats(): void {
    logger.debug(`[MainWebSocketServer] Checking heartbeats for ${this.clients.size} clients`);
    
    const now = Date.now();
    let deadConnections = 0;
    
    this.clients.forEach((client, clientId) => {
      try {
        // Check if connection is dead (no activity for 90 seconds)
        const idleTime = now - client.lastActivity;
        if (idleTime > 90000) {
          logger.info(`[MainWebSocketServer] Terminating dead connection ${clientId} (idle: ${idleTime}ms)`);
          client.ws.terminate();
          this.clients.delete(clientId);
          deadConnections++;
          return;
        }
        
        // Mark as not alive until we get a pong
        client.isAlive = false;
        
        // Send ping
        client.ws.ping();
      } catch (error) {
        logger.error(`[MainWebSocketServer] Error in heartbeat for ${clientId}`, { error });
        
        // Clean up broken connections
        try {
          client.ws.terminate();
          this.clients.delete(clientId);
          deadConnections++;
        } catch {}
      }
    });
    
    if (deadConnections > 0) {
      logger.info(`[MainWebSocketServer] Terminated ${deadConnections} dead connections`);
      
      // Update connections gauge
      metricsService.setGauge('websocket_connections_current', this.clients.size, {
        path: this.path
      });
    }
  }

  /**
   * Send a message to a specific client
   */
  public send(clientId: string, message: any): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      logger.warn(`[MainWebSocketServer] Cannot send message: client ${clientId} not found`);
      return false;
    }
    
    try {
      // Check if connection is active
      if (client.ws.readyState !== WebSocket.OPEN) {
        logger.warn(`[MainWebSocketServer] Cannot send message: client ${clientId} not in OPEN state (${client.ws.readyState})`);
        return false;
      }
      
      // Convert message to JSON string if needed
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      
      // Send the message
      client.ws.send(messageStr);
      
      // Update stats
      client.messagesSent++;
      client.lastActivity = Date.now();
      
      return true;
    } catch (error) {
      logger.error(`[MainWebSocketServer] Error sending message to ${clientId}`, { error });
      
      // Record error metric
      metricsService.incrementCounter('websocket_message_errors_total', {
        client_id: clientId,
        error_type: error instanceof Error ? error.name : 'Unknown',
        error_message: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  public broadcast(message: any, filter?: (client: WebSocketClient) => boolean): number {
    if (!this.initialized || !this.wss) {
      logger.warn('[MainWebSocketServer] Cannot broadcast: server not initialized');
      return 0;
    }
    
    let sentCount = 0;
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    this.clients.forEach((client, clientId) => {
      try {
        // Apply filter if provided
        if (filter && !filter(client)) {
          return;
        }
        
        // Only send to open connections
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(messageStr);
          client.messagesSent++;
          sentCount++;
        }
      } catch (error) {
        logger.error(`[MainWebSocketServer] Error broadcasting to ${clientId}`, { error });
      }
    });
    
    logger.debug(`[MainWebSocketServer] Broadcast message to ${sentCount} clients`);
    return sentCount;
  }

  /**
   * Get statistics about the WebSocket server
   */
  public getStats(): any {
    return {
      initialized: this.initialized,
      clients: this.clients.size,
      path: this.path,
      uptimeMs: this.initialized ? Date.now() - (this.clients.size > 0 ? 
        Math.min(...Array.from(this.clients.values()).map(c => c.connectedAt)) : 
        Date.now()) : 0,
      messagesSent: Array.from(this.clients.values()).reduce((sum, client) => sum + client.messagesSent, 0),
      messagesReceived: Array.from(this.clients.values()).reduce((sum, client) => sum + client.messagesReceived, 0)
    };
  }

  /**
   * Shutdown the server
   */
  public shutdown(): void {
    if (!this.initialized || !this.wss) {
      return;
    }
    
    logger.info('[MainWebSocketServer] Shutting down');
    
    // Clean up heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Close all connections
    this.clients.forEach((client, clientId) => {
      try {
        client.state = ConnectionState.DISCONNECTING;
        client.ws.close(1000, 'Server shutting down');
      } catch (error) {
        logger.error(`[MainWebSocketServer] Error closing connection to ${clientId}`, { error });
      }
    });
    
    // Close server
    this.wss.close();
    this.wss = null;
    this.initialized = false;
    
    logger.info('[MainWebSocketServer] Shutdown complete');
  }
}

// Export singleton instance
export const mainWebSocketServer = MainWebSocketServer.getInstance();
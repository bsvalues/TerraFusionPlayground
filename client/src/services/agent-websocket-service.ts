/**
 * Agent WebSocket Service - Client Side
 * 
 * This service provides WebSocket communication for the frontend to interact with agents.
 * It establishes a connection to the server-side WebSocket service and provides an API
 * for sending messages, receiving notifications, and handling agent updates.
 */

type MessageHandler = (message: any) => void;
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Client types for WebSocket connections
 */
export enum ClientType {
  FRONTEND = 'frontend',
  AGENT = 'agent',
  EXTENSION = 'extension'
}

export class AgentWebSocketService {
  private static instance: AgentWebSocketService;
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private clientId: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // Start with 2 seconds
  private pingInterval: number | null = null;
  private statusHandlers: Set<(status: ConnectionStatus) => void> = new Set();
  private pendingMessages: Array<{ type: string, payload: any }> = [];

  /**
   * Create a new agent WebSocket service (private constructor for singleton)
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): AgentWebSocketService {
    if (!AgentWebSocketService.instance) {
      AgentWebSocketService.instance = new AgentWebSocketService();
    }
    return AgentWebSocketService.instance;
  }

  /**
   * Initialize the WebSocket connection
   */
  public connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket connection already established or in progress');
        resolve(true);
        return;
      }

      this.updateConnectionStatus('connecting');
      
      // Determine WebSocket URL (handle both HTTP and HTTPS)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Special handling for Replit environments
      const host = window.location.hostname;
      let baseUrl;
      
      // Use relative path for Replit deployments - this is critical for WebSocket connections
      if (host.endsWith('.replit.dev') || host.endsWith('.repl.co')) {
        baseUrl = `${protocol}//${window.location.host}`;
      } else {
        // Use IP address for local development 
        baseUrl = `${protocol}//${window.location.hostname}:${window.location.port || (protocol === 'wss:' ? '443' : '80')}`;
      }
      
      // Primary WebSocket path
      const wsUrl = `${baseUrl}/api/agents/ws`;
      
      // Enhanced debug logging for WebSocket connection
      console.log(`[Agent WebSocket] Connecting to: ${wsUrl}`);
      console.log(`[Agent WebSocket] Browser URL: ${window.location.href}`);
      console.log(`[Agent WebSocket] Environment: ${host.endsWith('.replit.dev') ? 'Replit' : 'Local'}`);
      
      try {
        this.socket = new WebSocket(wsUrl);
        
        // Add console logs for WebSocket events for debugging
        console.log(`[Agent WebSocket] WebSocket object created`);
        
        // Set a timeout for connection - if not successful within 5 seconds, 
        // we'll treat this as a failed connection through this path
        this.connectionTimeout = setTimeout(() => {
          if (this.connectionStatus !== 'connected') {
            console.log('[Agent WebSocket] Connection timeout reached');
            this.socket?.close();
          }
        }, 5000);
        
        // Setup event handlers
        this.socket.onopen = (event) => {
          console.log(`[Agent WebSocket] Connection opened`, event);
          this.handleSocketOpen(resolve);
        };
        
        this.socket.onmessage = (event) => {
          console.log(`[Agent WebSocket] Message received`, event.data?.substring?.(0, 100) || event.data);
          this.handleSocketMessage(event);
        };
        
        this.socket.onclose = (event) => {
          console.log(`[Agent WebSocket] Connection closed: code=${event.code}, reason=${event.reason}`);
          this.handleSocketClose(event, reject);
        };
        
        this.socket.onerror = (error) => {
          console.error('[Agent WebSocket] Connection error:', error);
          this.handleSocketError(error, reject);
        };
      } catch (error) {
        console.error('[Agent WebSocket] Error creating connection:', error);
        this.updateConnectionStatus('error');
        reject(error);
      }
    });
  }

  /**
   * Handle WebSocket open event
   */
  private handleSocketOpen(resolve: (value: boolean) => void): void {
    console.log('Agent WebSocket connection established');
    this.updateConnectionStatus('connected');
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000; // Reset reconnect delay
    
    // Start ping interval to keep connection alive
    this.startPingInterval();
    
    // Send authentication message
    this.sendAuthMessage()
      .then(() => {
        // Once authenticated, send any pending messages
        this.sendPendingMessages();
        resolve(true);
      })
      .catch((error) => {
        console.error('Authentication failed:', error);
        this.updateConnectionStatus('error');
        resolve(false);
      });
  }

  /**
   * Handle WebSocket message event
   */
  private handleSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      console.debug('Received WebSocket message:', message);
      
      // Handle connection acknowledgment
      if (message.type === 'connection_established') {
        this.clientId = message.clientId;
        console.log(`Connection established with client ID: ${this.clientId}`);
      }
      
      // Handle authentication response
      if (message.type === 'auth_success') {
        console.log('Authentication successful:', message);
      } else if (message.type === 'auth_failed') {
        console.error('Authentication failed:', message);
      }
      
      // Dispatch the message to registered handlers
      this.dispatchMessage(message);
    } catch (error) {
      console.error('Error handling WebSocket message:', error, event.data);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleSocketClose(event: CloseEvent, reject: (reason: any) => void): void {
    console.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
    this.stopPingInterval();
    this.updateConnectionStatus('disconnected');
    
    // Attempt to reconnect if not a clean close
    if (event.code !== 1000 && event.code !== 1001) {
      this.attemptReconnect();
    }
    
    reject(new Error(`WebSocket connection closed: ${event.code} - ${event.reason}`));
  }

  /**
   * Handle WebSocket error event
   */
  private handleSocketError(error: Event, reject: (reason: any) => void): void {
    console.error('WebSocket error:', error);
    this.updateConnectionStatus('error');
    reject(error);
  }

  /**
   * Send authentication message
   */
  private async sendAuthMessage(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      try {
        // Setup a one-time handler for authentication response
        const authHandler = (message: any) => {
          if (message.type === 'auth_success') {
            this.off('auth_success', authHandler);
            this.off('auth_failed', authErrorHandler);
            resolve();
          }
        };
        
        const authErrorHandler = (message: any) => {
          if (message.type === 'auth_failed') {
            this.off('auth_success', authHandler);
            this.off('auth_failed', authErrorHandler);
            reject(new Error(message.message || 'Authentication failed'));
          }
        };
        
        this.on('auth_success', authHandler);
        this.on('auth_failed', authErrorHandler);
        
        // Send the authentication message
        const authMessage = {
          type: 'auth',
          clientType: ClientType.FRONTEND,
          clientId: this.clientId
        };
        
        this.socket.send(JSON.stringify(authMessage));
        console.log('Sent authentication message');
      } catch (error) {
        console.error('Error sending authentication message:', error);
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached, giving up');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1));
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.socket?.readyState === WebSocket.CLOSED) {
        console.log('Attempting reconnection...');
        this.connect()
          .then(success => {
            if (success) {
              console.log('Reconnection successful');
            } else {
              console.log('Reconnection failed');
            }
          })
          .catch(error => {
            console.error('Error during reconnection:', error);
          });
      }
    }, delay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval(); // Clear any existing interval
    
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop the ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Send a message to an agent
   * 
   * @param recipientId Agent ID to send the message to
   * @param message Message payload
   * @returns Promise that resolves when the message is acknowledged
   */
  public sendAgentMessage(recipientId: string, message: any): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected, queueing message');
        this.pendingMessages.push({ 
          type: 'agent_message', 
          payload: { 
            message: {
              recipientId,
              ...message
            }
          }
        });
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      try {
        // Create a handler for message acknowledgment
        const ackHandler = (response: any) => {
          if (response.type === 'message_sent' && response.originalMessage?.recipientId === recipientId) {
            this.off('message_sent', ackHandler);
            this.off('error', errorHandler);
            resolve(response.messageId);
          }
        };
        
        const errorHandler = (response: any) => {
          if (response.type === 'error' && response.code === 'MESSAGE_SEND_FAILED') {
            this.off('message_sent', ackHandler);
            this.off('error', errorHandler);
            reject(new Error(response.message));
          }
        };
        
        this.on('message_sent', ackHandler);
        this.on('error', errorHandler);
        
        // Send the message
        const messageToSend = {
          type: 'agent_message',
          message: {
            recipientId,
            ...message
          }
        };
        
        this.socket.send(JSON.stringify(messageToSend));
      } catch (error) {
        console.error('Error sending agent message:', error);
        reject(error);
      }
    });
  }

  /**
   * Send an action request to an agent
   * 
   * @param targetAgent Agent ID to send the action to
   * @param action Action to perform
   * @param params Parameters for the action
   * @returns Promise that resolves when the action is acknowledged
   */
  public sendActionRequest(targetAgent: string, action: string, params: any = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected, queueing action request');
        this.pendingMessages.push({ 
          type: 'action', 
          payload: { 
            targetAgent,
            action,
            params
          }
        });
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      try {
        // Create a handler for action acknowledgment
        const ackHandler = (response: any) => {
          if (
            response.type === 'action_sent' && 
            response.targetAgent === targetAgent && 
            response.action === action
          ) {
            this.off('action_sent', ackHandler);
            this.off('error', errorHandler);
            resolve(response.messageId);
          }
        };
        
        const errorHandler = (response: any) => {
          if (response.type === 'error' && response.code === 'ACTION_SEND_FAILED') {
            this.off('action_sent', ackHandler);
            this.off('error', errorHandler);
            reject(new Error(response.message));
          }
        };
        
        this.on('action_sent', ackHandler);
        this.on('error', errorHandler);
        
        // Send the action request
        const actionRequest = {
          type: 'action',
          targetAgent,
          action,
          params
        };
        
        this.socket.send(JSON.stringify(actionRequest));
      } catch (error) {
        console.error('Error sending action request:', error);
        reject(error);
      }
    });
  }

  /**
   * Send pending messages after reconnection
   */
  private sendPendingMessages(): void {
    if (this.pendingMessages.length === 0) {
      return;
    }
    
    console.log(`Sending ${this.pendingMessages.length} pending messages`);
    
    // Copy and clear pending messages
    const messages = [...this.pendingMessages];
    this.pendingMessages = [];
    
    // Send each message
    messages.forEach(({ type, payload }) => {
      if (type === 'agent_message') {
        this.sendAgentMessage(payload.message.recipientId, payload.message)
          .catch(error => console.error('Error sending pending agent message:', error));
      } else if (type === 'action') {
        this.sendActionRequest(payload.targetAgent, payload.action, payload.params)
          .catch(error => console.error('Error sending pending action request:', error));
      }
    });
  }

  /**
   * Register a handler for a specific message type
   * 
   * @param type Message type to listen for
   * @param handler Handler function to call when a message of this type is received
   * @returns Unsubscribe function
   */
  public on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)?.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.off(type, handler);
    };
  }

  /**
   * Remove a handler for a specific message type
   * 
   * @param type Message type
   * @param handler Handler function to remove
   */
  public off(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Dispatch a message to registered handlers
   * 
   * @param message Message to dispatch
   */
  private dispatchMessage(message: any): void {
    if (!message.type) {
      console.warn('Received message without type:', message);
      return;
    }
    
    // Get handlers for this message type
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in message handler for ${message.type}:`, error);
        }
      });
    }
    
    // Also dispatch to wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in wildcard message handler:`, error);
        }
      });
    }
  }

  /**
   * Update connection status and notify handlers
   * 
   * @param status New connection status
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      
      // Notify status handlers
      this.statusHandlers.forEach(handler => {
        try {
          handler(status);
        } catch (error) {
          console.error('Error in connection status handler:', error);
        }
      });
    }
  }

  /**
   * Register a connection status handler
   * 
   * @param handler Handler function to call when connection status changes
   * @returns Unsubscribe function
   */
  public onConnectionStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusHandlers.add(handler);
    
    // Call handler immediately with current status
    handler(this.connectionStatus);
    
    // Return unsubscribe function
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Close the WebSocket connection
   */
  public disconnect(): void {
    this.stopPingInterval();
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnected');
      this.socket = null;
    }
    
    this.updateConnectionStatus('disconnected');
  }
}

// Export singleton instance
export const agentWebSocketService = AgentWebSocketService.getInstance();
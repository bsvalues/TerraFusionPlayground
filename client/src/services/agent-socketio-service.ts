/**
 * Agent Socket.IO Service
 * 
 * This service provides Socket.IO communication for the agent system,
 * allowing real-time communication between the frontend and backend agents.
 * This replaces the raw WebSocket implementation with Socket.IO for better
 * reliability, especially in the Replit environment which has issues with
 * raw WebSockets.
 */

import { io, Socket } from 'socket.io-client';

/**
 * Simple browser-compatible EventEmitter implementation
 * This replaces Node's EventEmitter with a browser-compatible version
 */
class BrowserEventEmitter {
  private events: Map<string, Array<(data: any) => void>> = new Map();
  
  public on(event: string, listener: (data: any) => void): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    const listeners = this.events.get(event)!;
    listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.off(event, listener);
    };
  }
  
  public off(event: string, listener: (data: any) => void): void {
    if (!this.events.has(event)) {
      return;
    }
    
    const listeners = this.events.get(event)!;
    const index = listeners.indexOf(listener);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    
    // If no more listeners, remove the event
    if (listeners.length === 0) {
      this.events.delete(event);
    }
  }
  
  public emit(event: string, data: any): void {
    if (!this.events.has(event)) {
      return;
    }
    
    const listeners = this.events.get(event)!;
    
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    }
  }
  
  public removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

/**
 * Client type for agent communication
 */
export enum ClientType {
  FRONTEND = 'frontend',
  AGENT = 'agent',
  EXTENSION = 'extension'
}

/**
 * Connection status for agent communication
 */
export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERRORED = 'errored'
}

/**
 * Agent Socket.IO Service
 * Provides Socket.IO-based real-time communication with the agent system
 */
export class AgentSocketIOService extends BrowserEventEmitter {
  private socket: Socket | null = null;
  private clientId: string;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingFrequency: number = 3000; // 3 seconds
  private pendingMessages: any[] = [];
  private usingFallback: boolean = false;
  private statusChangeListeners: ((status: ConnectionStatus) => void)[] = [];
  private connectPromise: Promise<boolean> | null = null;
  private connectResolve: ((success: boolean) => void) | null = null;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private reconnectDelay: number = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  
  /**
   * Create a new agent Socket.IO service
   * 
   * @param options Configuration options
   */
  constructor(options: {
    clientId?: string;
    pollingFrequency?: number;
    maxReconnectAttempts?: number;
  } = {}) {
    super();
    this.clientId = options.clientId || `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    if (options.pollingFrequency) {
      this.pollingFrequency = options.pollingFrequency;
    }
    
    if (options.maxReconnectAttempts) {
      this.maxReconnectAttempts = options.maxReconnectAttempts;
    }
  }
  
  /**
   * Connect to the agent system
   * 
   * @returns Promise that resolves when connected
   */
  public connect(): Promise<boolean> {
    // If we already have a pending connect promise, return it
    if (this.connectPromise) {
      return this.connectPromise;
    }
    
    // Create a new connect promise
    this.connectPromise = new Promise((resolve) => {
      this.connectResolve = resolve;
      
      try {
        // Update connection status
        this.updateConnectionStatus(ConnectionStatus.CONNECTING);
        
        // Determine the Socket.IO URL
        const protocol = window.location.protocol === 'https:' ? 'https://' : 'http://';
        const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const host = window.location.host;
        const path = '/api/agents/socket.io';
        
        // Log connection attempt
        console.log(`[Agent SocketIO] Attempting to connect to: ${protocol}${host} with path ${path}`);
        
        // Create Socket.IO instance
        this.socket = io(protocol + host, {
          path: path,
          transports: ['websocket', 'polling'], // Try WebSocket first, then fall back to polling
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 10000, // Max 10 seconds between attempts
          timeout: 10000, // Connection timeout
          autoConnect: true
        });
        
        // Set up event handlers
        this.setupEventHandlers(this.socket);
        
        // Start fallback polling mechanism
        this.startPolling();
      } catch (error) {
        console.error('Error connecting to agent Socket.IO:', error);
        this.initFallbackPolling();
        this.connectResolve?.(false);
        this.connectPromise = null;
        this.connectResolve = null;
      }
    });
    
    return this.connectPromise;
  }
  
  /**
   * Set up Socket.IO event handlers
   * 
   * @param socket Socket.IO socket
   */
  private setupEventHandlers(socket: Socket) {
    // Handle connection
    socket.on('connect', () => {
      console.log('[Agent SocketIO] Connected');
      this.updateConnectionStatus(ConnectionStatus.CONNECTED);
      
      // Stop fallback polling
      this.stopPolling();
      
      // Stop using fallback
      this.usingFallback = false;
      
      // Reset reconnect attempts
      this.reconnectAttempts = 0;
      
      // Authenticate
      this.sendAuthMessage()
        .then(() => {
          // Send any pending messages
          this.sendPendingMessages();
          
          // Resolve connect promise if still pending
          if (this.connectResolve) {
            this.connectResolve(true);
            this.connectPromise = null;
            this.connectResolve = null;
          }
          
          // Start ping interval
          this.startPingInterval();
        })
        .catch((error) => {
          console.error('Authentication failed:', error);
          
          // Mark as disconnected
          this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
          
          // Using fallback
          this.initFallbackPolling();
          
          // Resolve connect promise if still pending
          if (this.connectResolve) {
            this.connectResolve(false);
            this.connectPromise = null;
            this.connectResolve = null;
          }
        });
    });
    
    // Handle connection error
    socket.on('connect_error', (error) => {
      console.error('[Agent SocketIO] Connection error:', error);
      
      // Update connection status
      this.updateConnectionStatus(ConnectionStatus.ERRORED);
      
      // Increment reconnect attempts
      this.reconnectAttempts++;
      
      // If max reconnect attempts reached, give up and use fallback
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('[Agent SocketIO] Maximum reconnect attempts reached, using fallback');
        this.socket?.disconnect();
        this.initFallbackPolling();
        
        // Resolve connect promise if still pending
        if (this.connectResolve) {
          this.connectResolve(false);
          this.connectPromise = null;
          this.connectResolve = null;
        }
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Agent SocketIO] Disconnected: ${reason}`);
      
      // Update connection status
      this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
      
      // Stop ping interval
      this.stopPingInterval();
      
      // If not closed cleanly, try to reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Use fallback
        this.initFallbackPolling();
      }
    });
    
    // Handle socket.io reconnect
    socket.io.on('reconnect', (attemptNumber) => {
      console.log(`[Agent SocketIO] Reconnected after ${attemptNumber} attempts`);
    });
    
    // Handle socket.io reconnect attempt
    socket.io.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Agent SocketIO] Reconnect attempt ${attemptNumber}`);
    });
    
    // Handle reconnect error
    socket.io.on('reconnect_error', (error) => {
      console.error('[Agent SocketIO] Reconnect error:', error);
    });
    
    // Handle reconnect failed
    socket.io.on('reconnect_failed', () => {
      console.error('[Agent SocketIO] Failed to reconnect after max attempts');
      this.initFallbackPolling();
    });
    
    // Handle connection established
    socket.on('connection_established', (data) => {
      console.log(`[Agent SocketIO] Connection established: ${data.clientId}`);
      
      // If server assigned a different client ID
      if (data.clientId && data.clientId !== this.clientId) {
        this.clientId = data.clientId;
        console.log(`[Agent SocketIO] Using server-assigned client ID: ${this.clientId}`);
      }
    });
    
    // Handle auth success
    socket.on('auth_success', (data) => {
      console.log('[Agent SocketIO] Authentication successful');
      this.dispatchMessage({
        type: 'auth_success',
        clientId: data.clientId || this.clientId,
        timestamp: Date.now()
      });
    });
    
    // Handle auth failed
    socket.on('auth_failed', (data) => {
      console.error('[Agent SocketIO] Authentication failed:', data.message);
      this.dispatchMessage({
        type: 'auth_failed',
        error: data.message || 'Authentication failed',
        timestamp: Date.now()
      });
    });
    
    // Handle agent coordination
    socket.on('agent_coordination', (data) => {
      this.dispatchMessage({
        type: 'agent_coordination',
        message: data
      });
    });
    
    // Handle agent activity
    socket.on('agent_activity', (data) => {
      this.dispatchMessage({
        type: 'agent_activity',
        message: data
      });
    });
    
    // Handle agent capability
    socket.on('agent_capability', (data) => {
      this.dispatchMessage({
        type: 'agent_capability',
        message: data
      });
    });
    
    // Handle message sent acknowledgment
    socket.on('message_sent', (data) => {
      this.dispatchMessage({
        type: 'message_sent',
        messageId: data.messageId,
        originalMessage: data.originalMessage,
        timestamp: Date.now()
      });
    });
    
    // Handle action sent acknowledgment
    socket.on('action_sent', (data) => {
      this.dispatchMessage({
        type: 'action_sent',
        messageId: data.messageId,
        action: data.action,
        targetAgent: data.targetAgent,
        timestamp: Date.now()
      });
    });
    
    // Handle error
    socket.on('error', (data) => {
      console.error('[Agent SocketIO] Error from server:', data);
      this.dispatchMessage({
        type: 'error',
        message: data.message,
        code: data.code,
        details: data.details,
        timestamp: Date.now()
      });
    });
    
    // Handle notification
    socket.on('notification', (data) => {
      this.dispatchMessage(data);
    });
    
    // Handle pong (response to ping)
    socket.on('pong', (data) => {
      // No need to do anything, this is just to keep the connection alive
    });
  }
  
  /**
   * Update connection status and notify listeners
   * 
   * @param status New connection status
   */
  private updateConnectionStatus(status: ConnectionStatus) {
    if (this.connectionStatus === status) {
      return;
    }
    
    this.connectionStatus = status;
    
    // Notify status change listeners
    this.statusChangeListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
    
    // For error status, emit a notification message
    if (status === ConnectionStatus.ERRORED) {
      this.dispatchMessage({
        type: 'notification',
        title: 'Connection error',
        message: 'Error connecting to agent system. Some features may be unavailable.',
        level: 'error',
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Dispatch a message to event listeners
   * 
   * @param message Message to dispatch
   */
  private dispatchMessage(message: any) {
    if (message.type) {
      this.emit(message.type, message);
    }
    
    // Also emit generic message event
    this.emit('message', message);
  }
  
  /**
   * Initialize fallback polling mechanism
   */
  private initFallbackPolling() {
    if (this.usingFallback) {
      console.log('Already using polling fallback, not initializing again');
      return;
    }
    
    console.log('Initializing polling fallback mechanism');
    this.usingFallback = true;
    
    // Try to authenticate via REST API
    this.authenticateViaRest()
      .then(() => {
        // Start polling if not already
        this.startPolling();
      })
      .catch((error) => {
        console.error('Failed to authenticate via REST API:', error);
        
        // Set connection status to errored
        this.updateConnectionStatus(ConnectionStatus.ERRORED);
      });
  }
  
  /**
   * Start polling for messages
   */
  private startPolling() {
    // Already polling, stop first
    this.stopPolling();
    
    console.log(`[Agent UI] Setting up polling with connection status: ${this.connectionStatus}`);
    
    // Start new polling interval
    this.pollingInterval = setInterval(() => {
      this.pollForMessages();
    }, this.pollingFrequency);
    
    // Poll immediately
    this.pollForMessages();
  }
  
  /**
   * Stop polling for messages
   */
  private stopPolling() {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  /**
   * Poll for messages using REST API instead of Socket.IO
   */
  private async pollForMessages(): Promise<void> {
    try {
      // Only log polling attempts when debugging is needed
      if (this.connectionStatus === ConnectionStatus.CONNECTING) {
        console.log('[Agent UI] Polling for data (connection: ' + this.connectionStatus + ')');
      }
      
      // Determine API endpoint - either regular or Socket.IO
      const endpoint = this.usingFallback ? 
        `/api/agents/socketio/messages/pending?clientId=${this.clientId}` : 
        `/api/agents/messages/pending?clientId=${this.clientId}`;
      
      // Use the REST API to fetch any pending messages
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to poll for messages: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.messages && Array.isArray(data.messages)) {
          // Process each message as if it came from Socket.IO
          data.messages.forEach((messageData: any) => {
            if (messageData.event && messageData.data) {
              // Handle structured message with event type
              this.dispatchMessage(messageData.data);
            } else {
              // Handle direct message
              this.dispatchMessage(messageData);
            }
          });
          
          // If we received any messages, update connection status to reflect it's working
          if (data.messages.length > 0 && this.connectionStatus !== ConnectionStatus.CONNECTED) {
            this.updateConnectionStatus(ConnectionStatus.CONNECTED);
          }
        }
        
        // Successfully polled, so connection is at least functional at HTTP level
        if (this.connectionStatus === ConnectionStatus.DISCONNECTED || this.connectionStatus === ConnectionStatus.ERRORED) {
          this.updateConnectionStatus(ConnectionStatus.CONNECTING);
          
          // Notify the user that polling is working
          this.dispatchMessage({
            type: 'notification',
            title: 'Connection status',
            message: 'Using REST fallback for communication (Socket.IO/WebSockets unavailable)',
            level: 'info',
            timestamp: Date.now()
          });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      // Only log errors occasionally to avoid flooding console
      if (Math.random() < 0.1) { // Log roughly 10% of errors
        console.error('Error polling for messages:', error);
      }
      
      // If polling fails repeatedly, mark as errored, but don't flood UI with notifications
      if (this.connectionStatus !== ConnectionStatus.ERRORED) {
        this.updateConnectionStatus(ConnectionStatus.ERRORED);
      }
    }
  }
  
  /**
   * Authenticate via REST API when Socket.IO is not available
   */
  private async authenticateViaRest(): Promise<void> {
    try {
      console.log('Authenticating via REST API');
      
      // Determine API endpoint - either regular or Socket.IO
      const endpoint = this.usingFallback ? 
        '/api/agents/socketio/auth' : 
        '/api/agents/auth';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientType: ClientType.FRONTEND,
          clientId: this.clientId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.clientId = data.clientId || 'rest-fallback-client';
        console.log(`REST authentication successful, client ID: ${this.clientId}`);
        
        // Simulate authentication success message
        this.dispatchMessage({
          type: 'auth_success',
          clientId: this.clientId,
          timestamp: Date.now()
        });
        
        return;
      } else {
        throw new Error(data.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Error authenticating via REST:', error);
      
      // Simulate authentication failure message
      this.dispatchMessage({
        type: 'auth_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
      
      throw error;
    }
  }
  
  /**
   * Send authentication message
   */
  private async sendAuthMessage(): Promise<void> {
    return new Promise((resolve, reject) => {
      // If using fallback, authenticate via REST API
      if (this.usingFallback) {
        this.authenticateViaRest()
          .then(() => resolve())
          .catch((error: Error) => reject(error));
        return;
      }
      
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket.IO not connected'));
        return;
      }
      
      try {
        // Send auth event with callback
        this.socket.emit('auth', {
          clientType: ClientType.FRONTEND,
          clientId: this.clientId
        }, (response: any) => {
          if (response.success) {
            // If server sent a new client ID, use it
            if (response.clientId) {
              this.clientId = response.clientId;
            }
            resolve();
          } else {
            reject(new Error(response.message || 'Authentication failed'));
          }
        });
      } catch (error) {
        console.error('Error sending authentication message:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval(); // Clear any existing interval
    
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, 30000) as unknown as NodeJS.Timeout; // Send ping every 30 seconds
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
      // If using fallback, send via REST API instead
      if (this.usingFallback) {
        this.sendAgentMessageViaRest(recipientId, message)
          .then(messageId => resolve(messageId))
          .catch((error: Error) => reject(error));
        return;
      }
      
      if (!this.socket || !this.socket.connected) {
        console.log('Socket.IO not connected, queueing message');
        this.pendingMessages.push({ 
          type: 'agent_message', 
          payload: { 
            message: {
              recipientId,
              ...message
            }
          }
        });
        reject(new Error('Socket.IO not connected'));
        return;
      }
      
      try {
        // Send agent_message event with callback
        this.socket.emit('agent_message', {
          message: {
            recipientId,
            ...message
          }
        }, (response: any) => {
          if (response.success) {
            resolve(response.messageId);
          } else {
            reject(new Error(response.message || 'Failed to send message'));
          }
        });
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
      // If using fallback, send via REST API instead
      if (this.usingFallback) {
        this.sendActionRequestViaRest(targetAgent, action, params)
          .then((messageId: string) => resolve(messageId))
          .catch((error: Error) => reject(error));
        return;
      }
      
      if (!this.socket || !this.socket.connected) {
        console.log('Socket.IO not connected, queueing action request');
        this.pendingMessages.push({ 
          type: 'action', 
          payload: { 
            targetAgent,
            action,
            params
          }
        });
        reject(new Error('Socket.IO not connected'));
        return;
      }
      
      try {
        // Send action event with callback
        this.socket.emit('action', {
          targetAgent,
          action,
          params
        }, (response: any) => {
          if (response.success) {
            resolve(response.messageId);
          } else {
            reject(new Error(response.message || 'Failed to send action'));
          }
        });
      } catch (error) {
        console.error('Error sending action request:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Send an agent message via REST API
   * 
   * @param recipientId Agent ID to send the message to
   * @param message Message payload
   * @returns Promise that resolves when the message is acknowledged
   */
  private async sendAgentMessageViaRest(recipientId: string, message: any): Promise<string> {
    try {
      console.log(`Sending agent message via REST API to ${recipientId}`);
      
      // Determine API endpoint - either regular or Socket.IO
      const endpoint = this.usingFallback ? 
        '/api/agents/socketio/message' : 
        '/api/agents/message';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId,
          message,
          clientId: this.clientId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message via REST: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Simulate message sent
        this.dispatchMessage({
          type: 'message_sent',
          messageId: data.messageId || `rest-${Date.now()}`,
          originalMessage: {
            recipientId,
            ...message
          },
          timestamp: Date.now()
        });
        
        return data.messageId || `rest-${Date.now()}`;
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending agent message via REST:', error);
      throw error;
    }
  }
  
  /**
   * Send an action request via REST API
   * 
   * @param targetAgent Agent ID to send the action to
   * @param action Action to perform
   * @param params Parameters for the action
   * @returns Promise that resolves when the action is acknowledged
   */
  private async sendActionRequestViaRest(targetAgent: string, action: string, params: any = {}): Promise<string> {
    try {
      console.log(`Sending action request via REST API to ${targetAgent}: ${action}`);
      
      // Determine API endpoint - either regular or Socket.IO
      const endpoint = this.usingFallback ? 
        '/api/agents/socketio/action' : 
        '/api/agents/action';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetAgent,
          action,
          params,
          clientId: this.clientId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send action via REST: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Simulate action sent
        this.dispatchMessage({
          type: 'action_sent',
          messageId: data.messageId || `rest-action-${Date.now()}`,
          targetAgent,
          action,
          params,
          timestamp: Date.now()
        });
        
        return data.messageId || `rest-action-${Date.now()}`;
      } else {
        throw new Error(data.message || 'Failed to send action');
      }
    } catch (error) {
      console.error('Error sending action request via REST:', error);
      throw error;
    }
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
   * Add a listener for connection status changes
   * 
   * @param listener Function to call when status changes
   * @returns Function to remove the listener
   */
  public onConnectionStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusChangeListeners.push(listener);
    
    // Call listener immediately with current status
    listener(this.connectionStatus);
    
    // Return function to remove listener
    return () => {
      const index = this.statusChangeListeners.indexOf(listener);
      if (index !== -1) {
        this.statusChangeListeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Get current connection status
   * 
   * @returns Current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
  
  /**
   * Disconnect from the agent system
   */
  public disconnect(): void {
    // Stop polling
    this.stopPolling();
    
    // Stop ping interval
    this.stopPingInterval();
    
    // Disconnect socket if connected
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Update connection status
    this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
  }
  
  /**
   * Check if connected to the agent system
   * 
   * @returns True if connected
   */
  public isConnected(): boolean {
    return this.connectionStatus === ConnectionStatus.CONNECTED;
  }
  
  /**
   * Get client ID
   * 
   * @returns Client ID
   */
  public getClientId(): string {
    return this.clientId;
  }
}

// Export singleton instance
export const agentSocketIOService = new AgentSocketIOService();
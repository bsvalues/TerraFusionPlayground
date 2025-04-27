/**
 * WebSocket Connection Manager
 * 
 * Provides WebSocket connectivity with auto-reconnect and SSE fallback
 * 
 * Features:
 * - Auto-connect to WebSocket on initialization
 * - Auto-reconnect with exponential backoff if connection fails
 * - SSE fallback with continued WebSocket reconnection attempts
 * - Connection status UI updates with color-coded indicators
 */

class ConnectionManager {
  constructor(options = {}) {
    // Configuration
    this.config = {
      wsPath: options.wsPath || '/ws',
      ssePath: options.ssePath || '/api/events',
      initialReconnectDelay: options.initialReconnectDelay || 1000,
      maxReconnectDelay: options.maxReconnectDelay || 30000,
      reconnectBackoffFactor: options.reconnectBackoffFactor || 2,
      autoConnect: options.autoConnect !== false,
      debug: options.debug || false
    };
    
    // DOM Elements
    this.elements = {
      statusIndicator: document.getElementById(options.statusIndicatorId || 'status-indicator'),
      connectionStatus: document.getElementById(options.connectionStatusId || 'connection-status'),
      connectionDetails: document.getElementById(options.connectionDetailsId || 'connection-details'),
      messageLog: document.getElementById(options.messageLogId || 'message-log'),
      messageInput: document.getElementById(options.messageInputId || 'message-input'),
      sendButton: document.getElementById(options.sendButtonId || 'send-button'),
      connectButton: document.getElementById(options.connectButtonId || 'connect-button'),
      disconnectButton: document.getElementById(options.disconnectButtonId || 'disconnect-button'),
      connectSSEButton: document.getElementById(options.connectSSEButtonId || 'connect-sse-button'),
      sentCount: document.getElementById(options.sentCountId || 'sent-count'),
      receivedCount: document.getElementById(options.receivedCountId || 'received-count'),
      connectionAttempts: document.getElementById(options.connectionAttemptsId || 'connection-attempts'),
      reconnectionCount: document.getElementById(options.reconnectionCountId || 'reconnection-count')
    };
    
    // Check if all required elements exist
    const requiredElements = ['statusIndicator', 'connectionStatus'];
    for (const element of requiredElements) {
      if (!this.elements[element]) {
        console.error(`Required element not found: ${element}`);
      }
    }
    
    // Connection state
    this.socket = null;
    this.eventSource = null;
    this.messageCounter = { sent: 0, received: 0, attempts: 0, reconnects: 0 };
    this.clientId = null;
    this.connectionMode = null;
    this.reconnectInterval = null;
    this.reconnectAttempt = 0;
    
    // Bind event handlers for DOM elements
    this.bindEvents();
    
    // Auto-connect if configured
    if (this.config.autoConnect) {
      this.log('Auto-connecting to WebSocket...');
      this.connectWebSocket();
    }
  }
  
  /**
   * Bind event handlers to DOM elements
   */
  bindEvents() {
    if (this.elements.connectButton) {
      this.elements.connectButton.addEventListener('click', () => this.connectWebSocket());
    }
    
    if (this.elements.connectSSEButton) {
      this.elements.connectSSEButton.addEventListener('click', () => this.connectSSE());
    }
    
    if (this.elements.disconnectButton) {
      this.elements.disconnectButton.addEventListener('click', () => this.disconnect());
    }
    
    if (this.elements.sendButton && this.elements.messageInput) {
      const sendMessage = () => {
        const message = this.elements.messageInput.value.trim();
        if (message) {
          this.sendMessage(message);
          this.elements.messageInput.value = '';
        }
      };
      
      this.elements.sendButton.addEventListener('click', sendMessage);
      this.elements.messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          sendMessage();
        }
      });
    }
  }
  
  /**
   * Update the connection status UI
   */
  updateConnectionStatus(connected, mode, details = '') {
    // Reset all classes
    if (this.elements.statusIndicator) {
      this.elements.statusIndicator.classList.remove('connected', 'disconnected', 'reconnecting');
    }
    
    if (connected) {
      // Set connected state
      if (this.elements.statusIndicator) {
        this.elements.statusIndicator.classList.add('connected');
        const statusIcon = this.elements.statusIndicator.querySelector('.status-icon');
        if (statusIcon) statusIcon.textContent = '🟢';
      }
      
      if (this.elements.connectionStatus) {
        this.elements.connectionStatus.textContent = `Connected (${mode})`;
      }
      
      if (this.elements.messageInput) this.elements.messageInput.disabled = false;
      if (this.elements.sendButton) this.elements.sendButton.disabled = false;
      if (this.elements.disconnectButton) this.elements.disconnectButton.disabled = false;
      if (this.elements.connectButton) this.elements.connectButton.disabled = true;
      if (this.elements.connectSSEButton) this.elements.connectSSEButton.disabled = true;
      
      this.connectionMode = mode;
    } else if (this.reconnectInterval) {
      // Set reconnecting state
      if (this.elements.statusIndicator) {
        this.elements.statusIndicator.classList.add('reconnecting');
        const statusIcon = this.elements.statusIndicator.querySelector('.status-icon');
        if (statusIcon) statusIcon.textContent = '🟡';
      }
      
      if (this.elements.connectionStatus) {
        this.elements.connectionStatus.textContent = 'Reconnecting...';
      }
      
      if (this.elements.messageInput) this.elements.messageInput.disabled = true;
      if (this.elements.sendButton) this.elements.sendButton.disabled = true;
      if (this.elements.disconnectButton) this.elements.disconnectButton.disabled = false;
      if (this.elements.connectButton) this.elements.connectButton.disabled = false;
      if (this.elements.connectSSEButton) this.elements.connectSSEButton.disabled = false;
      
      this.connectionMode = null;
    } else {
      // Set disconnected state
      if (this.elements.statusIndicator) {
        this.elements.statusIndicator.classList.add('disconnected');
        const statusIcon = this.elements.statusIndicator.querySelector('.status-icon');
        if (statusIcon) statusIcon.textContent = '🔴';
      }
      
      if (this.elements.connectionStatus) {
        this.elements.connectionStatus.textContent = 'Disconnected';
      }
      
      if (this.elements.messageInput) this.elements.messageInput.disabled = true;
      if (this.elements.sendButton) this.elements.sendButton.disabled = true;
      if (this.elements.disconnectButton) this.elements.disconnectButton.disabled = true;
      if (this.elements.connectButton) this.elements.connectButton.disabled = false;
      if (this.elements.connectSSEButton) this.elements.connectSSEButton.disabled = false;
      
      this.connectionMode = null;
    }
    
    if (this.elements.connectionDetails) {
      this.elements.connectionDetails.textContent = details;
    }
  }
  
  /**
   * Add a message to the log
   */
  addMessageToLog(message, type, direction = null) {
    if (!this.elements.messageLog) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    // Create badge based on message type/direction
    const badge = document.createElement('span');
    badge.className = `badge ${direction || type}`;
    
    if (direction === 'sent') {
      badge.textContent = 'SENT';
      this.messageCounter.sent++;
      if (this.elements.sentCount) {
        this.elements.sentCount.textContent = this.messageCounter.sent;
      }
    } else if (direction === 'received') {
      badge.textContent = 'RECEIVED';
      this.messageCounter.received++;
      if (this.elements.receivedCount) {
        this.elements.receivedCount.textContent = this.messageCounter.received;
      }
    } else if (type === 'ping') {
      badge.textContent = 'PING';
    } else if (type === 'info') {
      badge.textContent = 'INFO';
    } else if (type === 'error') {
      badge.textContent = 'ERROR';
    }
    
    // Create timestamp
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    
    // Message content
    let content;
    if (typeof message === 'object') {
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(message, null, 2);
      content = pre;
    } else {
      content = document.createTextNode(message);
    }
    
    // Assemble message div
    messageDiv.appendChild(badge);
    messageDiv.appendChild(document.createTextNode(' '));
    messageDiv.appendChild(timestamp);
    messageDiv.appendChild(document.createElement('br'));
    messageDiv.appendChild(content);
    
    this.elements.messageLog.appendChild(messageDiv);
    this.elements.messageLog.scrollTop = this.elements.messageLog.scrollHeight;
  }
  
  /**
   * Connect to WebSocket
   */
  connectWebSocket() {
    if (this.socket) {
      this.socket.close();
    }
    
    this.messageCounter.attempts++;
    if (this.elements.connectionAttempts) {
      this.elements.connectionAttempts.textContent = this.messageCounter.attempts;
    }
    
    try {
      // Use correct WebSocket protocol based on page protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}${this.config.wsPath}`;
      
      this.addMessageToLog(`Attempting to connect to WebSocket: ${wsUrl}`, 'info');
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = (event) => {
        this.updateConnectionStatus(true, 'WebSocket', `Connected to ${wsUrl}`);
        this.addMessageToLog('WebSocket connection established', 'info');
        
        // Reset reconnect attempt counter and clear interval
        this.reconnectAttempt = 0;
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
        
        // If we were previously using SSE, close it
        if (this.eventSource) {
          this.addMessageToLog('WebSocket reconnected, closing SSE fallback', 'info');
          this.eventSource.close();
          this.eventSource = null;
        }
        
        // Call onopen callback if provided
        if (typeof this.config.onopen === 'function') {
          this.config.onopen(event);
        }
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle ping messages differently
          if (data.type === 'ping' || data.type === 'heartbeat') {
            this.log('Heartbeat received:', data);
            // Don't add heartbeats to the message log to avoid spam
          } else {
            this.addMessageToLog(data, 'received', 'received');
            
            // Call onmessage callback if provided
            if (typeof this.config.onmessage === 'function') {
              this.config.onmessage(data);
            }
          }
        } catch (error) {
          this.addMessageToLog(`Received raw message: ${event.data}`, 'received', 'received');
          
          // Call onmessage callback if provided
          if (typeof this.config.onmessage === 'function') {
            this.config.onmessage(event.data);
          }
        }
      };
      
      this.socket.onerror = (error) => {
        this.addMessageToLog(`WebSocket error: ${error.message || 'Unknown error'}`, 'error');
        
        // Call onerror callback if provided
        if (typeof this.config.onerror === 'function') {
          this.config.onerror(error);
        }
        
        this.fallbackToSSE();
      };
      
      this.socket.onclose = (event) => {
        this.updateConnectionStatus(false);
        
        if (event.wasClean) {
          this.addMessageToLog(`WebSocket closed cleanly, code=${event.code}, reason=${event.reason}`, 'info');
        } else {
          this.addMessageToLog('WebSocket connection died', 'error');
          
          // Only auto-fallback to SSE if we're not already connected via SSE
          if (this.connectionMode !== 'SSE') {
            this.fallbackToSSE();
          } else if (!this.reconnectInterval) {
            // If already on SSE but no reconnect scheduled, schedule WebSocket reconnect
            this.scheduleWebSocketReconnect();
          }
        }
        
        // Call onclose callback if provided
        if (typeof this.config.onclose === 'function') {
          this.config.onclose(event);
        }
      };
    } catch (error) {
      this.addMessageToLog(`WebSocket connection error: ${error.message}`, 'error');
      this.fallbackToSSE();
    }
  }
  
  /**
   * Connect to SSE
   */
  connectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.messageCounter.attempts++;
    if (this.elements.connectionAttempts) {
      this.elements.connectionAttempts.textContent = this.messageCounter.attempts;
    }
    
    try {
      this.clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const sseUrl = `${this.config.ssePath}?clientId=${this.clientId}`;
      
      this.addMessageToLog(`Attempting to connect to SSE: ${sseUrl}`, 'info');
      this.eventSource = new EventSource(sseUrl);
      
      this.eventSource.onopen = (event) => {
        this.updateConnectionStatus(true, 'SSE', `Connected to ${sseUrl}`);
        this.addMessageToLog('SSE connection established', 'info');
        this.messageCounter.reconnects++;
        if (this.elements.reconnectionCount) {
          this.elements.reconnectionCount.textContent = this.messageCounter.reconnects;
        }
        
        // Call onopen callback if provided
        if (typeof this.config.sseOnopen === 'function') {
          this.config.sseOnopen(event);
        }
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Record the client ID if provided
          if (data.clientId) {
            this.clientId = data.clientId;
            if (this.elements.connectionDetails) {
              this.elements.connectionDetails.textContent = `Using SSE with client ID: ${this.clientId}`;
            }
          }
          
          // Handle heartbeat messages differently
          if (data.type === 'heartbeat') {
            this.log('Heartbeat received:', data);
            // Don't add heartbeats to the message log to avoid spam
          } else {
            this.addMessageToLog(data, 'received', 'received');
            
            // Call onmessage callback if provided
            if (typeof this.config.sseOnmessage === 'function') {
              this.config.sseOnmessage(data);
            }
          }
        } catch (error) {
          this.addMessageToLog(`Received raw SSE message: ${event.data}`, 'received', 'received');
          
          // Call onmessage callback if provided
          if (typeof this.config.sseOnmessage === 'function') {
            this.config.sseOnmessage(event.data);
          }
        }
      };
      
      this.eventSource.onerror = (error) => {
        this.addMessageToLog(`SSE error: ${error.message || 'Unknown error'}`, 'error');
        this.eventSource.close();
        this.updateConnectionStatus(false);
        
        // Call onerror callback if provided
        if (typeof this.config.sseOnerror === 'function') {
          this.config.sseOnerror(error);
        }
      };
    } catch (error) {
      this.addMessageToLog(`SSE connection error: ${error.message}`, 'error');
      this.updateConnectionStatus(false);
    }
  }
  
  /**
   * Calculate reconnect delay with exponential backoff
   */
  calculateReconnectDelay() {
    // Exponential backoff with a maximum delay
    const delay = Math.min(
      this.config.initialReconnectDelay * Math.pow(this.config.reconnectBackoffFactor, this.reconnectAttempt),
      this.config.maxReconnectDelay
    );
    this.reconnectAttempt++;
    return delay;
  }
  
  /**
   * Schedule WebSocket reconnection
   */
  scheduleWebSocketReconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
    
    const delay = this.calculateReconnectDelay();
    this.addMessageToLog(`Scheduling WebSocket reconnect in ${delay/1000} seconds (attempt ${this.reconnectAttempt})`, 'info');
    
    // Update UI to show reconnecting state
    this.updateConnectionStatus(false);
    
    this.reconnectInterval = setInterval(() => {
      if (this.connectionMode !== 'WebSocket') {
        this.addMessageToLog('Attempting to reconnect WebSocket...', 'info');
        this.connectWebSocket();
      } else {
        // Clear interval if we're already connected via WebSocket
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
        this.reconnectAttempt = 0;
      }
    }, delay);
  }
  
  /**
   * Fall back to SSE when WebSocket fails
   */
  fallbackToSSE() {
    this.addMessageToLog('WebSocket failed, falling back to SSE', 'info');
    this.messageCounter.reconnects++;
    if (this.elements.reconnectionCount) {
      this.elements.reconnectionCount.textContent = this.messageCounter.reconnects;
    }
    this.connectSSE();
    
    // Schedule WebSocket reconnection attempts
    this.scheduleWebSocketReconnect();
  }
  
  /**
   * Send a message through the current connection
   */
  sendMessage(message) {
    if (typeof message === 'string') {
      message = { message };
    }
    
    // Add client ID and timestamp if not present
    if (!message.clientId) {
      message.clientId = this.clientId;
    }
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }
    
    if (this.connectionMode === 'WebSocket' && this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Send via WebSocket
      const data = {
        action: 'echo',
        ...message
      };
      
      this.socket.send(JSON.stringify(data));
      this.addMessageToLog(data, 'sent', 'sent');
      return true;
    } else if (this.connectionMode === 'SSE' && this.clientId) {
      // Send via HTTP POST to SSE endpoint
      const data = {
        type: 'message',
        ...message
      };
      
      fetch('/api/events/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(result => {
        this.addMessageToLog(data, 'sent', 'sent');
        this.log('Message sent via SSE API:', result);
      })
      .catch(error => {
        this.addMessageToLog(`Error sending message: ${error.message}`, 'error');
      });
      return true;
    } else {
      this.addMessageToLog('Cannot send message - no active connection', 'error');
      return false;
    }
  }
  
  /**
   * Disconnect from all connections
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    this.updateConnectionStatus(false);
    this.addMessageToLog('Disconnected by user', 'info');
  }
  
  /**
   * Get the current connection state
   */
  getState() {
    return {
      connected: this.connectionMode !== null,
      connectionMode: this.connectionMode,
      reconnecting: this.reconnectInterval !== null,
      reconnectAttempt: this.reconnectAttempt,
      clientId: this.clientId,
      messageCounter: { ...this.messageCounter },
      webSocketState: this.socket ? this.socket.readyState : null,
      sseConnected: this.eventSource !== null
    };
  }
  
  /**
   * Log debug messages if debug is enabled
   */
  log(...args) {
    if (this.config.debug) {
      console.log(...args);
    }
  }
}

// Add to window if in browser context
if (typeof window !== 'undefined') {
  window.ConnectionManager = ConnectionManager;
}

// Export for ES modules
export default ConnectionManager;
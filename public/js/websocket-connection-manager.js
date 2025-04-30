/**
 * Enhanced WebSocket Connection Manager
 * 
 * A robust utility for managing WebSocket connections with:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/ping mechanism to detect dead connections
 * - Event-based API
 * - Connection state tracking
 * - Fallback mechanisms (HTTP polling, SSE)
 * - Comprehensive error handling
 */

class WebSocketConnectionManager {
  /**
   * Create a WebSocket connection manager
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    // Configuration with defaults
    this.config = {
      url: options.url || this._getDefaultWebSocketUrl('/ws'),
      autoReconnect: options.autoReconnect !== undefined ? options.autoReconnect : true,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      reconnectInterval: options.reconnectInterval || 1000,
      reconnectBackoffMultiplier: options.reconnectBackoffMultiplier || 1.5,
      pingInterval: options.pingInterval || 30000,
      pingTimeout: options.pingTimeout || 5000,
      connectionTimeout: options.connectionTimeout || 10000,
      debug: options.debug || false,
      protocols: options.protocols || [],
      fallbackOptions: {
        useHttpFallback: options.fallbackOptions?.useHttpFallback !== undefined ? 
          options.fallbackOptions.useHttpFallback : true,
        useSseFallback: options.fallbackOptions?.useSseFallback !== undefined ? 
          options.fallbackOptions.useSseFallback : true,
        httpFallbackUrl: options.fallbackOptions?.httpFallbackUrl || '/api/ws-fallback/send',
        sseUrl: options.fallbackOptions?.sseUrl || '/api/events'
      }
    };

    // Internal state
    this.socket = null;
    this.state = {
      connectionState: 'disconnected', // 'connecting', 'connected', 'disconnecting', 'disconnected', 'reconnecting', 'error', 'using_fallback'
      reconnecting: false,
      reconnectAttempts: 0,
      lastMessageTime: null,
      lastPingTime: null,
      latencies: [],
      pingSentTime: null,
      fallbackActive: false,
      fallbackType: null, // 'http' or 'sse'
      sseSource: null,
      clientId: `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    };

    // Timers
    this.timers = {
      pingInterval: null,
      reconnectTimeout: null,
      connectionTimeout: null,
      pingTimeout: null
    };

    // Event listeners
    this.eventListeners = {
      open: [],
      close: [],
      error: [],
      message: [],
      reconnecting: [],
      reconnected: [],
      reconnect_failed: [],
      ping: [],
      pong: [],
      fallback_activated: [],
      state_change: []
    };

    // Bind methods to ensure correct 'this' context
    this._handleOpen = this._handleOpen.bind(this);
    this._handleClose = this._handleClose.bind(this);
    this._handleError = this._handleError.bind(this);
    this._handleMessage = this._handleMessage.bind(this);
    this._ping = this._ping.bind(this);
    this._reconnect = this._reconnect.bind(this);
    this._activateFallback = this._activateFallback.bind(this);

    // Statistics
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      reconnects: 0,
      errors: 0,
      pings: 0,
      pongs: 0,
      averageLatency: 0,
      currentLatency: 0,
      connectionCount: 0,
      connected: false
    };

    // Automatically connect if URL is provided
    if (this.config.url) {
      this.connect();
    }
  }

  /**
   * Connect to the WebSocket server
   * @param {string} url Optional URL to connect to (overrides constructor URL)
   * @param {Array} protocols Optional WebSocket protocols
   * @returns {WebSocketConnectionManager} this instance for chaining
   */
  connect(url, protocols) {
    // Clean up any existing connection
    this.disconnect();

    // Update URL if provided
    if (url) {
      this.config.url = url;
    }

    // Update protocols if provided
    if (protocols) {
      this.config.protocols = protocols;
    }

    // Notify state change
    this._changeState('connecting');

    try {
      // Create WebSocket connection
      this.socket = this.config.protocols.length > 0 
        ? new WebSocket(this.config.url, this.config.protocols)
        : new WebSocket(this.config.url);

      // Set up event handlers
      this.socket.addEventListener('open', this._handleOpen);
      this.socket.addEventListener('close', this._handleClose);
      this.socket.addEventListener('error', this._handleError);
      this.socket.addEventListener('message', this._handleMessage);

      // Set connection timeout
      this.timers.connectionTimeout = setTimeout(() => {
        if (this.state.connectionState !== 'connected') {
          this._logDebug('Connection timeout');
          this.socket.close();
          this._handleError(new Error('Connection timeout'));
        }
      }, this.config.connectionTimeout);
    } catch (error) {
      this._handleError(error);
    }

    return this;
  }

  /**
   * Disconnect from the WebSocket server
   * @param {number} code Close code
   * @param {string} reason Close reason
   * @returns {WebSocketConnectionManager} this instance for chaining
   */
  disconnect(code, reason) {
    this._changeState('disconnecting');
    
    // Clear all timers
    this._clearTimers();

    // Close the socket if it exists
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      try {
        this.socket.close(code, reason);
      } catch (error) {
        this._logDebug('Error closing socket:', error);
      }
    }

    // Clean up SSE fallback if active
    if (this.state.fallbackActive && this.state.fallbackType === 'sse' && this.state.sseSource) {
      try {
        this.state.sseSource.close();
        this.state.sseSource = null;
      } catch (error) {
        this._logDebug('Error closing SSE connection:', error);
      }
    }

    this.state.reconnecting = false;
    this.state.fallbackActive = false;
    this.state.fallbackType = null;
    this.socket = null;
    this.stats.connected = false;

    return this;
  }

  /**
   * Send a message to the server
   * @param {string|object} data Data to send
   * @returns {boolean} Whether the message was sent
   */
  send(data) {
    // Format the message if it's an object
    const message = typeof data === 'object' ? JSON.stringify(data) : data;

    // If connected via WebSocket, send directly
    if (this.isConnected()) {
      try {
        this.socket.send(message);
        this.stats.messagesSent++;
        this._logDebug('Message sent:', message);
        return true;
      } catch (error) {
        this._logDebug('Error sending message:', error);
        this._handleError(error);
        
        // Try fallback if available
        if (this.config.fallbackOptions.useHttpFallback) {
          return this._sendViaHttpFallback(message);
        }
        return false;
      }
    } 
    // If using fallback, send via HTTP
    else if (this.state.fallbackActive) {
      return this._sendViaHttpFallback(message);
    }
    // Not connected at all
    else {
      this._logDebug('Cannot send message, not connected');
      return false;
    }
  }

  /**
   * Send a message via HTTP fallback
   * @param {string} message Message to send
   * @returns {boolean} Whether the message was sent
   * @private
   */
  _sendViaHttpFallback(message) {
    if (!this.config.fallbackOptions.useHttpFallback) {
      return false;
    }

    try {
      fetch(this.config.fallbackOptions.httpFallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          clientId: this.state.clientId,
          timestamp: new Date().toISOString()
        })
      })
      .then(response => response.json())
      .then(data => {
        this._logDebug('HTTP fallback response:', data);
        // Simulate a message event for consistency
        this._emitEvent('message', {
          data: JSON.stringify(data),
          type: 'message',
          via: 'http_fallback'
        });
        this.stats.messagesSent++;
        return true;
      })
      .catch(error => {
        this._logDebug('HTTP fallback error:', error);
        return false;
      });
      
      return true;
    } catch (error) {
      this._logDebug('Error using HTTP fallback:', error);
      return false;
    }
  }

  /**
   * Register an event listener
   * @param {string} event Event name
   * @param {Function} callback Callback function
   * @returns {WebSocketConnectionManager} this instance for chaining
   */
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    } else {
      this._logDebug(`Unknown event: ${event}`);
    }
    return this;
  }

  /**
   * Remove an event listener
   * @param {string} event Event name
   * @param {Function} callback Callback function to remove
   * @returns {WebSocketConnectionManager} this instance for chaining
   */
  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
    return this;
  }

  /**
   * Check if the WebSocket is connected
   * @returns {boolean} Whether the WebSocket is connected
   */
  isConnected() {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get the current connection state
   * @returns {string} Current connection state
   */
  getState() {
    return this.state.connectionState;
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Send a ping to measure latency
   * @returns {boolean} Whether the ping was sent
   */
  ping() {
    if (!this.isConnected()) {
      return false;
    }

    try {
      this.state.pingSentTime = Date.now();
      const pingMessage = JSON.stringify({
        type: 'ping',
        timestamp: this.state.pingSentTime
      });
      this.socket.send(pingMessage);
      this.stats.pings++;
      this._emitEvent('ping', { timestamp: this.state.pingSentTime });
      
      // Set ping timeout
      this.timers.pingTimeout = setTimeout(() => {
        if (this.state.pingSentTime) {
          this._logDebug('Ping timeout');
          this._handleError(new Error('Ping timeout'));
        }
      }, this.config.pingTimeout);
      
      return true;
    } catch (error) {
      this._logDebug('Error sending ping:', error);
      return false;
    }
  }

  /**
   * Handle WebSocket open event
   * @param {Event} event Open event
   * @private
   */
  _handleOpen(event) {
    clearTimeout(this.timers.connectionTimeout);
    
    this.state.reconnecting = false;
    this.state.reconnectAttempts = 0;
    this.stats.connectionCount++;
    this.stats.connected = true;
    
    // Set up ping interval
    this._setupPingInterval();
    
    // Emit events
    this._changeState('connected');
    this._emitEvent('open', event);
    
    if (this.state.reconnecting) {
      this._emitEvent('reconnected', event);
    }

    this._logDebug('WebSocket connected');
  }

  /**
   * Handle WebSocket close event
   * @param {CloseEvent} event Close event
   * @private
   */
  _handleClose(event) {
    this._logDebug(`WebSocket closed: ${event.code} - ${event.reason || 'No reason provided'}`);
    
    clearTimeout(this.timers.connectionTimeout);
    this._clearTimers();
    
    this.stats.connected = false;
    
    // Check if we should attempt to reconnect
    if (this.config.autoReconnect && !this.state.reconnecting && this.state.connectionState !== 'disconnecting') {
      this._reconnect();
      return;
    }
    
    this._changeState('disconnected');
    this._emitEvent('close', event);
  }

  /**
   * Handle WebSocket error event
   * @param {Event|Error} error Error event or Error object
   * @private
   */
  _handleError(error) {
    this.stats.errors++;
    this._logDebug('WebSocket error:', error);
    
    // Emit error event
    this._emitEvent('error', error);
    this._changeState('error');
    
    // If not connected and not already trying to reconnect, try to reconnect
    if (this.config.autoReconnect && !this.isConnected() && !this.state.reconnecting) {
      this._reconnect();
    }
    // If we have exhausted reconnection attempts, try fallback
    else if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this._activateFallback();
    }
  }

  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event Message event
   * @private
   */
  _handleMessage(event) {
    this.state.lastMessageTime = Date.now();
    this.stats.messagesReceived++;
    
    try {
      // Try to parse as JSON
      const data = JSON.parse(event.data);
      
      // Check if it's a pong response to our ping
      if (data.type === 'pong' && this.state.pingSentTime) {
        this._handlePong(data);
        return;
      }
      
      // Emit message event with parsed data
      this._emitEvent('message', { 
        data: data, 
        original: event, 
        rawData: event.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Not JSON, emit the raw data
      this._emitEvent('message', { 
        data: event.data, 
        original: event,
        rawData: event.data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle pong message from server
   * @param {Object} data Pong message data
   * @private
   */
  _handlePong(data) {
    clearTimeout(this.timers.pingTimeout);
    
    const now = Date.now();
    const sentTime = this.state.pingSentTime;
    this.state.pingSentTime = null;
    
    if (sentTime) {
      const latency = now - sentTime;
      this.state.latencies.push(latency);
      this.stats.pongs++;
      this.stats.currentLatency = latency;
      
      // Calculate average latency (max 50 samples)
      if (this.state.latencies.length > 50) {
        this.state.latencies.shift();
      }
      
      const sum = this.state.latencies.reduce((sum, value) => sum + value, 0);
      this.stats.averageLatency = Math.round(sum / this.state.latencies.length);
      
      this._emitEvent('pong', { 
        latency,
        timestamp: now,
        sentTime,
        data
      });
    }
  }

  /**
   * Set up ping interval
   * @private
   */
  _setupPingInterval() {
    this._clearTimer('pingInterval');
    
    if (this.config.pingInterval > 0) {
      this.timers.pingInterval = setInterval(this._ping, this.config.pingInterval);
    }
  }

  /**
   * Send a ping message
   * @private
   */
  _ping() {
    this.ping();
  }

  /**
   * Attempt to reconnect to the WebSocket server
   * @private
   */
  _reconnect() {
    // If already reconnecting or reached max attempts, don't try again
    if (
      this.state.reconnecting || 
      this.state.reconnectAttempts >= this.config.maxReconnectAttempts ||
      this.state.connectionState === 'disconnecting'
    ) {
      // If max attempts reached and we should use fallback, activate it
      if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
        this._emitEvent('reconnect_failed', { attempts: this.state.reconnectAttempts });
        if (this.config.fallbackOptions.useHttpFallback || this.config.fallbackOptions.useSseFallback) {
          this._activateFallback();
        }
      }
      return;
    }
    
    this.state.reconnecting = true;
    this.state.reconnectAttempts++;
    this.stats.reconnects++;
    
    // Calculate backoff delay: base * (multiplier ^ attempts)
    const delay = Math.min(
      30000, // Maximum 30 seconds
      this.config.reconnectInterval * Math.pow(this.config.reconnectBackoffMultiplier, this.state.reconnectAttempts - 1)
    );
    
    this._changeState('reconnecting');
    this._emitEvent('reconnecting', { 
      attempt: this.state.reconnectAttempts,
      max: this.config.maxReconnectAttempts,
      delay
    });
    
    this._logDebug(`Attempting to reconnect in ${delay}ms (attempt ${this.state.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
    // Set timeout for reconnection
    this._clearTimer('reconnectTimeout');
    this.timers.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Activate fallback communication methods
   * @private
   */
  _activateFallback() {
    // If already using fallback, don't activate again
    if (this.state.fallbackActive) {
      return;
    }

    this._logDebug('Activating fallback communication');
    
    // First try SSE if enabled
    if (this.config.fallbackOptions.useSseFallback) {
      this._activateSseFallback();
    } 
    // Otherwise use HTTP fallback
    else if (this.config.fallbackOptions.useHttpFallback) {
      this.state.fallbackActive = true;
      this.state.fallbackType = 'http';
      this._changeState('using_fallback');
      this._emitEvent('fallback_activated', { type: 'http' });
    }
  }

  /**
   * Activate Server-Sent Events (SSE) fallback
   * @private
   */
  _activateSseFallback() {
    try {
      const url = new URL(this.config.fallbackOptions.sseUrl, window.location.href);
      url.searchParams.append('clientId', this.state.clientId);
      
      const eventSource = new EventSource(url.toString());
      
      eventSource.onopen = () => {
        this._logDebug('SSE fallback connected');
        this.state.fallbackActive = true;
        this.state.fallbackType = 'sse';
        this.state.sseSource = eventSource;
        this._changeState('using_fallback');
        this._emitEvent('fallback_activated', { type: 'sse' });
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._emitEvent('message', { 
            data,
            original: event,
            rawData: event.data,
            timestamp: new Date().toISOString(),
            via: 'sse_fallback'
          });
        } catch (error) {
          this._logDebug('Error parsing SSE message:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        this._logDebug('SSE fallback error:', error);
        
        if (this.state.fallbackType === 'sse') {
          // Close SSE connection
          eventSource.close();
          this.state.sseSource = null;
          
          // Fall back to HTTP polling if needed
          if (this.config.fallbackOptions.useHttpFallback) {
            this.state.fallbackActive = true;
            this.state.fallbackType = 'http';
            this._emitEvent('fallback_activated', { type: 'http' });
          } else {
            this.state.fallbackActive = false;
            this.state.fallbackType = null;
            this._changeState('disconnected');
          }
        }
      };
    } catch (error) {
      this._logDebug('Error activating SSE fallback:', error);
      
      // Fall back to HTTP polling if needed
      if (this.config.fallbackOptions.useHttpFallback) {
        this.state.fallbackActive = true;
        this.state.fallbackType = 'http';
        this._emitEvent('fallback_activated', { type: 'http' });
      }
    }
  }

  /**
   * Change connection state and emit event
   * @param {string} newState New connection state
   * @private
   */
  _changeState(newState) {
    const oldState = this.state.connectionState;
    this.state.connectionState = newState;
    
    this._emitEvent('state_change', { 
      oldState, 
      newState,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} event Event name
   * @param {*} data Event data
   * @private
   */
  _emitEvent(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} event handler:`, error);
        }
      });
    }
  }

  /**
   * Clear all active timers
   * @private
   */
  _clearTimers() {
    Object.keys(this.timers).forEach(timer => {
      this._clearTimer(timer);
    });
  }

  /**
   * Clear a specific timer
   * @param {string} timerName Name of timer to clear
   * @private
   */
  _clearTimer(timerName) {
    if (this.timers[timerName]) {
      clearTimeout(this.timers[timerName]);
      clearInterval(this.timers[timerName]);
      this.timers[timerName] = null;
    }
  }

  /**
   * Get the default WebSocket URL based on current location
   * @param {string} path Path to append to the URL
   * @returns {string} WebSocket URL
   * @private
   */
  _getDefaultWebSocketUrl(path) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${path}`;
  }

  /**
   * Log debug messages if debug is enabled
   * @param {...*} args Arguments to log
   * @private
   */
  _logDebug(...args) {
    if (this.config.debug) {
      console.log(`[WebSocketManager]`, ...args);
    }
  }
}

// Make available globally
window.WebSocketConnectionManager = WebSocketConnectionManager;
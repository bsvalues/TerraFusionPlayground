/**
 * Connection Manager Tests
 * 
 * Tests WebSocket connection logic with auto-reconnect and SSE fallback
 */

// Mock WebSocket and EventSource globals
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;
    
    // Callbacks
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    
    // Spy properties
    this.sentMessages = [];
    
    // Auto-connect by default (can be overridden in tests)
    setTimeout(() => this.mockConnect(), 0);
  }
  
  mockConnect() {
    this.readyState = this.OPEN;
    if (this.onopen) this.onopen({ target: this });
  }
  
  mockDisconnect(wasClean = true, code = 1000, reason = 'Normal closure') {
    this.readyState = this.CLOSED;
    if (this.onclose) this.onclose({ 
      target: this,
      wasClean,
      code,
      reason
    });
  }
  
  mockError(message = 'WebSocket error') {
    if (this.onerror) this.onerror({ 
      target: this,
      message
    });
  }
  
  mockReceiveMessage(data) {
    if (this.onmessage) this.onmessage({
      target: this,
      data: typeof data === 'object' ? JSON.stringify(data) : data
    });
  }
  
  send(data) {
    this.sentMessages.push(data);
  }
  
  close() {
    this.readyState = this.CLOSING;
    setTimeout(() => {
      this.readyState = this.CLOSED;
      if (this.onclose) this.onclose({
        target: this,
        wasClean: true,
        code: 1000,
        reason: 'Normal closure'
      });
    }, 0);
  }
}

class MockEventSource {
  constructor(url) {
    this.url = url;
    
    // Callbacks
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    
    // Spy properties
    this.closed = false;
    
    // Auto-connect by default (can be overridden in tests)
    setTimeout(() => this.mockConnect(), 0);
  }
  
  mockConnect() {
    if (this.onopen) this.onopen({ target: this });
  }
  
  mockReceiveMessage(data) {
    if (this.onmessage) this.onmessage({
      target: this,
      data: typeof data === 'object' ? JSON.stringify(data) : data
    });
  }
  
  mockError(message = 'EventSource error') {
    if (this.onerror) this.onerror({ 
      target: this,
      message
    });
  }
  
  close() {
    this.closed = true;
  }
}

// Mock DOM elements for UI indicators
const createMockDom = () => {
  // Create mock DOM elements
  document.body.innerHTML = `
    <div id="status-indicator" class="status-indicator disconnected">
      <span class="status-icon">🔴</span>
      <span id="connection-status">Disconnected</span>
    </div>
    <div id="connection-details"></div>
    <div id="message-log"></div>
    <input id="message-input" disabled />
    <button id="send-button" disabled>Send</button>
    <button id="connect-button">Connect</button>
    <button id="disconnect-button" disabled>Disconnect</button>
    <button id="connect-sse-button">Use SSE</button>
    <div id="connection-metrics">
      <div class="metric">Messages sent: <span id="sent-count">0</span></div>
      <div class="metric">Messages received: <span id="received-count">0</span></div>
      <div class="metric">Connection attempts: <span id="connection-attempts">0</span></div>
      <div class="metric">Reconnections: <span id="reconnection-count">0</span></div>
    </div>
  `;
  
  // Return references to DOM elements
  return {
    statusIndicator: document.getElementById('status-indicator'),
    connectionStatus: document.getElementById('connection-status'),
    connectionDetails: document.getElementById('connection-details'),
    messageLog: document.getElementById('message-log'),
    messageInput: document.getElementById('message-input'),
    sendButton: document.getElementById('send-button'),
    connectButton: document.getElementById('connect-button'),
    disconnectButton: document.getElementById('disconnect-button'),
    connectSSEButton: document.getElementById('connect-sse-button'),
    sentCount: document.getElementById('sent-count'),
    receivedCount: document.getElementById('received-count'),
    connectionAttempts: document.getElementById('connection-attempts'),
    reconnectionCount: document.getElementById('reconnection-count')
  };
};

// Setup and teardown functions
const setupConnectionScript = () => {
  // Load script with connection logic
  document.body.innerHTML += '<script id="connection-script" src="/websocket-test.js"></script>';
};

describe('Connection Manager', () => {
  let originalWebSocket;
  let originalEventSource;
  let originalSetInterval;
  let originalClearInterval;
  let originalSetTimeout;
  let originalClearTimeout;
  let mockWebSocketInstances = [];
  let mockEventSourceInstances = [];
  let intervals = [];
  let timeouts = [];
  let domElements;
  
  beforeAll(() => {
    // Store original globals
    originalWebSocket = global.WebSocket;
    originalEventSource = global.EventSource;
    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;
    originalSetTimeout = global.setTimeout;
    originalClearTimeout = global.clearTimeout;
    
    // Mock setInterval/setTimeout for controlling time
    global.setInterval = jest.fn((callback, delay) => {
      const id = intervals.length;
      intervals.push({ callback, delay, id });
      return id;
    });
    
    global.clearInterval = jest.fn(id => {
      if (intervals[id]) {
        intervals[id].cleared = true;
      }
    });
    
    global.setTimeout = jest.fn((callback, delay) => {
      const id = timeouts.length;
      timeouts.push({ callback, delay, id });
      return id;
    });
    
    global.clearTimeout = jest.fn(id => {
      if (timeouts[id]) {
        timeouts[id].cleared = true;
      }
    });
    
    // Mock WebSocket
    global.WebSocket = jest.fn(url => {
      const instance = new MockWebSocket(url);
      mockWebSocketInstances.push(instance);
      return instance;
    });
    
    // Add WebSocket constants
    global.WebSocket.CONNECTING = 0;
    global.WebSocket.OPEN = 1;
    global.WebSocket.CLOSING = 2;
    global.WebSocket.CLOSED = 3;
    
    // Mock EventSource
    global.EventSource = jest.fn(url => {
      const instance = new MockEventSource(url);
      mockEventSourceInstances.push(instance);
      return instance;
    });
  });
  
  afterAll(() => {
    // Restore original globals
    global.WebSocket = originalWebSocket;
    global.EventSource = originalEventSource;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  });
  
  beforeEach(() => {
    // Reset mocks and counters
    jest.clearAllMocks();
    mockWebSocketInstances = [];
    mockEventSourceInstances = [];
    intervals = [];
    timeouts = [];
    
    // Setup DOM and load connection script
    domElements = createMockDom();
  });
  
  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });
  
  /**
   * Helper to advance timers and run pending timeouts/intervals
   */
  const advanceTimers = (ms) => {
    // Process timeouts that should trigger
    timeouts.forEach((timeout, id) => {
      if (!timeout.cleared && timeout.delay <= ms) {
        timeout.callback();
        timeout.cleared = true;
      }
    });
    
    // Process intervals that should trigger (possibly multiple times)
    intervals.forEach((interval, id) => {
      if (!interval.cleared) {
        const iterations = Math.floor(ms / interval.delay);
        for (let i = 0; i < iterations; i++) {
          interval.callback();
        }
      }
    });
  };
  
  /**
   * Helper to run the connection script logic
   */
  /**
   * Helper to create and initialize a ConnectionManager for testing
   */
  const createConnectionManager = () => {
    // Import the ConnectionManager class 
    // In a real test setup, we would properly import the module 
    window.setupConnection = () => {
      // DOM Elements
      const statusIndicator = document.getElementById('status-indicator');
      const connectionStatus = document.getElementById('connection-status');
      const connectionDetails = document.getElementById('connection-details');
      const messageInput = document.getElementById('message-input');
      const sendButton = document.getElementById('send-button');
      const connectButton = document.getElementById('connect-button');
      const disconnectButton = document.getElementById('disconnect-button');
      const connectSSEButton = document.getElementById('connect-sse-button');
      const messageLog = document.getElementById('message-log');
      const sentCount = document.getElementById('sent-count');
      const receivedCount = document.getElementById('received-count');
      const connectionAttempts = document.getElementById('connection-attempts');
      const reconnectionCount = document.getElementById('reconnection-count');
      
      // Variables
      let socket = null;
      let eventSource = null;
      let messageCounter = { sent: 0, received: 0, attempts: 0, reconnects: 0 };
      let clientId = null;
      let connectionMode = null;
      let reconnectInterval = null;
      let reconnectAttempt = 0;
      let maxReconnectDelay = 30000; // 30 seconds max
      
      // Utility functions
      function updateConnectionStatus(connected, mode, details = '') {
        // Reset all classes
        statusIndicator.classList.remove('connected', 'disconnected', 'reconnecting');
        
        if (connected) {
          // Set connected state
          statusIndicator.classList.add('connected');
          const statusIcon = statusIndicator.querySelector('.status-icon');
          statusIcon.textContent = '🟢';
          connectionStatus.textContent = `Connected (${mode})`;
          messageInput.disabled = false;
          sendButton.disabled = false;
          disconnectButton.disabled = false;
          connectButton.disabled = true;
          connectSSEButton.disabled = true;
          connectionMode = mode;
        } else if (reconnectInterval) {
          // Set reconnecting state
          statusIndicator.classList.add('reconnecting');
          const statusIcon = statusIndicator.querySelector('.status-icon');
          statusIcon.textContent = '🟡';
          connectionStatus.textContent = 'Reconnecting...';
          messageInput.disabled = true;
          sendButton.disabled = true;
          disconnectButton.disabled = false;
          connectButton.disabled = false;
          connectSSEButton.disabled = false;
          connectionMode = null;
        } else {
          // Set disconnected state
          statusIndicator.classList.add('disconnected');
          const statusIcon = statusIndicator.querySelector('.status-icon');
          statusIcon.textContent = '🔴';
          connectionStatus.textContent = 'Disconnected';
          messageInput.disabled = true;
          sendButton.disabled = true;
          disconnectButton.disabled = true;
          connectButton.disabled = false;
          connectSSEButton.disabled = false;
          connectionMode = null;
        }
        connectionDetails.textContent = details;
      }
      
      function addMessageToLog(message, type, direction = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageLog.appendChild(messageDiv);
      }
      
      // Connection functions
      function connectWebSocket() {
        if (socket) {
          socket.close();
        }
        
        messageCounter.attempts++;
        connectionAttempts.textContent = messageCounter.attempts;
        
        try {
          const wsUrl = `ws://localhost/ws`;
          
          addMessageToLog(`Attempting to connect to WebSocket: ${wsUrl}`, 'info');
          socket = new WebSocket(wsUrl);
          
          socket.onopen = function() {
            updateConnectionStatus(true, 'WebSocket', `Connected to ${wsUrl}`);
            addMessageToLog('WebSocket connection established', 'info');
            
            // Reset reconnect attempt counter and clear interval
            reconnectAttempt = 0;
            if (reconnectInterval) {
              clearInterval(reconnectInterval);
              reconnectInterval = null;
            }
            
            // If we were previously using SSE, close it
            if (eventSource) {
              addMessageToLog('WebSocket reconnected, closing SSE fallback', 'info');
              eventSource.close();
              eventSource = null;
            }
          };
          
          socket.onmessage = function(event) {
            try {
              const data = JSON.parse(event.data);
              addMessageToLog(data, 'received', 'received');
            } catch (error) {
              addMessageToLog(`Received raw message: ${event.data}`, 'received', 'received');
            }
          };
          
          socket.onerror = function(error) {
            addMessageToLog(`WebSocket error: ${error.message || 'Unknown error'}`, 'error');
            fallbackToSSE();
          };
          
          socket.onclose = function(event) {
            updateConnectionStatus(false);
            
            if (event.wasClean) {
              addMessageToLog(`WebSocket closed cleanly, code=${event.code}, reason=${event.reason}`, 'info');
            } else {
              addMessageToLog('WebSocket connection died', 'error');
              
              // Only auto-fallback to SSE if we're not already connected via SSE
              if (connectionMode !== 'SSE') {
                fallbackToSSE();
              } else if (!reconnectInterval) {
                // If already on SSE but no reconnect scheduled, schedule WebSocket reconnect
                scheduleWebSocketReconnect();
              }
            }
          };
        } catch (error) {
          addMessageToLog(`WebSocket connection error: ${error.message}`, 'error');
          fallbackToSSE();
        }
      }
      
      function connectSSE() {
        if (eventSource) {
          eventSource.close();
        }
        
        if (socket) {
          socket.close();
          socket = null;
        }
        
        messageCounter.attempts++;
        connectionAttempts.textContent = messageCounter.attempts;
        
        try {
          clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
          const sseUrl = `/api/events?clientId=${clientId}`;
          
          addMessageToLog(`Attempting to connect to SSE: ${sseUrl}`, 'info');
          eventSource = new EventSource(sseUrl);
          
          eventSource.onopen = function() {
            updateConnectionStatus(true, 'SSE', `Connected to ${sseUrl}`);
            addMessageToLog('SSE connection established', 'info');
            messageCounter.reconnects++;
            reconnectionCount.textContent = messageCounter.reconnects;
          };
          
          eventSource.onmessage = function(event) {
            try {
              const data = JSON.parse(event.data);
              addMessageToLog(data, 'received', 'received');
            } catch (error) {
              addMessageToLog(`Received raw SSE message: ${event.data}`, 'received', 'received');
            }
          };
          
          eventSource.onerror = function(error) {
            addMessageToLog(`SSE error: ${error.message || 'Unknown error'}`, 'error');
            eventSource.close();
            updateConnectionStatus(false);
          };
        } catch (error) {
          addMessageToLog(`SSE connection error: ${error.message}`, 'error');
          updateConnectionStatus(false);
        }
      }
      
      function calculateReconnectDelay() {
        // Exponential backoff with a maximum delay of maxReconnectDelay
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), maxReconnectDelay);
        reconnectAttempt++;
        return delay;
      }
      
      function scheduleWebSocketReconnect() {
        if (reconnectInterval) {
          clearInterval(reconnectInterval);
        }
        
        const delay = calculateReconnectDelay();
        addMessageToLog(`Scheduling WebSocket reconnect in ${delay/1000} seconds (attempt ${reconnectAttempt})`, 'info');
        
        // Update UI to show reconnecting state
        updateConnectionStatus(false);
        
        reconnectInterval = setInterval(() => {
          if (connectionMode !== 'WebSocket') {
            addMessageToLog('Attempting to reconnect WebSocket...', 'info');
            connectWebSocket();
          } else {
            // Clear interval if we're already connected via WebSocket
            clearInterval(reconnectInterval);
            reconnectInterval = null;
            reconnectAttempt = 0;
          }
        }, delay);
      }
      
      function fallbackToSSE() {
        addMessageToLog('WebSocket failed, falling back to SSE', 'info');
        messageCounter.reconnects++;
        reconnectionCount.textContent = messageCounter.reconnects;
        connectSSE();
        
        // Schedule WebSocket reconnection attempts
        scheduleWebSocketReconnect();
      }
      
      // Event Listeners
      connectButton.addEventListener('click', connectWebSocket);
      connectSSEButton.addEventListener('click', connectSSE);
      
      disconnectButton.addEventListener('click', function() {
        if (socket) {
          socket.close();
          socket = null;
        }
        
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        updateConnectionStatus(false);
        addMessageToLog('Disconnected by user', 'info');
      });
      
      // Initialize page
      addMessageToLog('WebSocket Test Page loaded', 'info');
      
      // Expose functions for testing
      return {
        connectWebSocket,
        connectSSE,
        fallbackToSSE,
        scheduleWebSocketReconnect,
        calculateReconnectDelay,
        updateConnectionStatus,
        getState: () => ({
          socket,
          eventSource,
          messageCounter,
          clientId,
          connectionMode,
          reconnectInterval,
          reconnectAttempt,
          maxReconnectDelay
        })
      };
    };
    
    // Return the connection manager functions
    return window.setupConnection();
  };
  
  // Tests
  test('should initially show disconnected state', () => {
    const connectionManager = loadAndInitConnectionScript();
    
    expect(domElements.statusIndicator.classList.contains('disconnected')).toBe(true);
    expect(domElements.statusIndicator.querySelector('.status-icon').textContent).toBe('🔴');
    expect(domElements.connectionStatus.textContent).toBe('Disconnected');
  });
  
  test('should connect to WebSocket successfully', () => {
    const connectionManager = loadAndInitConnectionScript();
    
    // Trigger connection
    connectionManager.connectWebSocket();
    
    // Get latest WebSocket instance
    const ws = mockWebSocketInstances[mockWebSocketInstances.length - 1];
    
    // Simulate successful connection
    ws.mockConnect();
    
    // Assert status is updated
    expect(domElements.statusIndicator.classList.contains('connected')).toBe(true);
    expect(domElements.statusIndicator.classList.contains('disconnected')).toBe(false);
    expect(domElements.statusIndicator.querySelector('.status-icon').textContent).toBe('🟢');
    expect(domElements.connectionStatus.textContent).toBe('Connected (WebSocket)');
    
    // Assert input and buttons are updated
    expect(domElements.messageInput.disabled).toBe(false);
    expect(domElements.sendButton.disabled).toBe(false);
    expect(domElements.disconnectButton.disabled).toBe(false);
    expect(domElements.connectButton.disabled).toBe(true);
    expect(domElements.connectSSEButton.disabled).toBe(true);
  });
  
  test('should fallback to SSE when WebSocket fails', () => {
    const connectionManager = loadAndInitConnectionScript();
    
    // Trigger connection
    connectionManager.connectWebSocket();
    
    // Get latest WebSocket instance
    const ws = mockWebSocketInstances[mockWebSocketInstances.length - 1];
    
    // Simulate error and close
    ws.mockError('Connection failed');
    ws.mockDisconnect(false, 1006, 'Abnormal closure');
    
    // Assert SSE connection is attempted
    expect(mockEventSourceInstances.length).toBe(1);
    
    // Get latest EventSource instance
    const es = mockEventSourceInstances[mockEventSourceInstances.length - 1];
    
    // Simulate successful SSE connection
    es.mockConnect();
    
    // Assert status is updated
    expect(domElements.statusIndicator.classList.contains('connected')).toBe(true);
    expect(domElements.statusIndicator.classList.contains('disconnected')).toBe(false);
    expect(domElements.statusIndicator.querySelector('.status-icon').textContent).toBe('🟢');
    expect(domElements.connectionStatus.textContent).toBe('Connected (SSE)');
  });
  
  test('should show reconnecting state during WebSocket reconnection attempts', () => {
    const connectionManager = loadAndInitConnectionScript();
    
    // Trigger connection
    connectionManager.connectWebSocket();
    
    // Get latest WebSocket instance
    const ws = mockWebSocketInstances[mockWebSocketInstances.length - 1];
    
    // Simulate error and close
    ws.mockError('Connection failed');
    ws.mockDisconnect(false, 1006, 'Abnormal closure');
    
    // Assert SSE connection is attempted and successful
    const es = mockEventSourceInstances[mockEventSourceInstances.length - 1];
    es.mockConnect();
    
    // Get the reconnect interval delay
    const reconnectDelay = connectionManager.calculateReconnectDelay();
    
    // Advance time just before the reconnect would happen
    advanceTimers(reconnectDelay - 10);
    
    // Assert we're in reconnecting state
    expect(domElements.statusIndicator.classList.contains('reconnecting')).toBe(true);
    expect(domElements.statusIndicator.querySelector('.status-icon').textContent).toBe('🟡');
    expect(domElements.connectionStatus.textContent).toBe('Reconnecting...');
    
    // Complete the timer
    advanceTimers(20); // 10 ms more to trigger the interval
    
    // Assert a new WebSocket connection attempt is made
    expect(mockWebSocketInstances.length).toBe(2);
  });
  
  test('should use exponential backoff for reconnection attempts', () => {
    const connectionManager = loadAndInitConnectionScript();
    
    // Set the initial reconnect attempt value
    connectionManager.getState().reconnectAttempt = 0;
    
    // Calculate delays for each attempt
    const delay1 = connectionManager.calculateReconnectDelay(); // 1000ms (2^0 * 1000)
    const delay2 = connectionManager.calculateReconnectDelay(); // 2000ms (2^1 * 1000)
    const delay3 = connectionManager.calculateReconnectDelay(); // 4000ms (2^2 * 1000)
    const delay4 = connectionManager.calculateReconnectDelay(); // 8000ms (2^3 * 1000)
    
    // Assert exponential increase
    expect(delay1).toBe(1000);
    expect(delay2).toBe(2000);
    expect(delay3).toBe(4000);
    expect(delay4).toBe(8000);
  });
  
  test('should cancel reconnection attempts when WebSocket reconnects', () => {
    const connectionManager = loadAndInitConnectionScript();
    
    // Trigger connection
    connectionManager.connectWebSocket();
    
    // Get latest WebSocket instance
    const ws = mockWebSocketInstances[mockWebSocketInstances.length - 1];
    
    // Simulate error and close
    ws.mockError('Connection failed');
    ws.mockDisconnect(false, 1006, 'Abnormal closure');
    
    // Get SSE connection
    const es = mockEventSourceInstances[mockEventSourceInstances.length - 1];
    es.mockConnect();
    
    // Ensure reconnect is scheduled
    const state = connectionManager.getState();
    expect(state.reconnectInterval).not.toBeNull();
    
    // Advance time to trigger the first reconnect attempt
    advanceTimers(1000);
    
    // Get the new WebSocket instance
    const ws2 = mockWebSocketInstances[mockWebSocketInstances.length - 1];
    
    // Simulate successful connection
    ws2.mockConnect();
    
    // Assert reconnect interval is cleared
    const updatedState = connectionManager.getState();
    expect(updatedState.reconnectInterval).toBeNull();
    expect(updatedState.reconnectAttempt).toBe(0);
    
    // Assert SSE connection is closed
    expect(es.closed).toBe(true);
  });
  
  test('should disconnect cleanly when user clicks disconnect button', () => {
    const connectionManager = loadAndInitConnectionScript();
    
    // Trigger connection
    connectionManager.connectWebSocket();
    
    // Get latest WebSocket instance
    const ws = mockWebSocketInstances[mockWebSocketInstances.length - 1];
    ws.mockConnect();
    
    // Simulate user clicking disconnect button
    domElements.disconnectButton.click();
    
    // Assert status is updated
    expect(domElements.statusIndicator.classList.contains('disconnected')).toBe(true);
    expect(domElements.statusIndicator.querySelector('.status-icon').textContent).toBe('🔴');
    expect(domElements.connectionStatus.textContent).toBe('Disconnected');
    
    // Assert WebSocket is closed
    expect(ws.readyState).toBe(ws.CLOSING);
  });
});
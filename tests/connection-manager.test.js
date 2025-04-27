/**
 * Connection Manager Tests
 * 
 * Tests for the WebSocket Connection Manager with focus on:
 * 1. Backoff algorithm verification
 * 2. WebSocket to SSE fallback transitions
 * 3. UI state indicator transitions
 * 4. "Early success" cancellation during backoff
 */

// Mock WebSocket, EventSource and DOM elements
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  OPEN: 1, // WebSocket.OPEN constant
  readyState: 0, // initially connecting
  onopen: null,
  onclose: null,
  onerror: null,
  onmessage: null
}));

global.EventSource = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  onopen: null,
  onerror: null,
  onmessage: null
}));

// Mock DOM elements
const mockDomElements = () => {
  const elements = {
    statusIndicator: {
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      },
      querySelector: jest.fn().mockReturnValue({
        textContent: ''
      })
    },
    connectionStatus: {
      textContent: ''
    },
    connectionDetails: {
      textContent: ''
    },
    messageLog: {
      appendChild: jest.fn(),
      scrollTop: 0,
      scrollHeight: 100
    },
    messageInput: {
      value: '',
      disabled: false
    },
    sendButton: {
      disabled: false,
      addEventListener: jest.fn()
    },
    connectButton: {
      disabled: false,
      addEventListener: jest.fn()
    },
    disconnectButton: {
      disabled: false,
      addEventListener: jest.fn()
    },
    connectSSEButton: {
      disabled: false,
      addEventListener: jest.fn()
    },
    sentCount: {
      textContent: '0'
    },
    receivedCount: {
      textContent: '0'
    },
    connectionAttempts: {
      textContent: '0'
    },
    reconnectionCount: {
      textContent: '0'
    }
  };

  // Setup document.getElementById to return our mock elements
  global.document = {
    getElementById: jest.fn(id => {
      // Map from ID to element
      const elementMapping = {
        'status-indicator': elements.statusIndicator,
        'connection-status': elements.connectionStatus,
        'connection-details': elements.connectionDetails,
        'message-log': elements.messageLog,
        'message-input': elements.messageInput,
        'send-button': elements.sendButton,
        'connect-button': elements.connectButton,
        'disconnect-button': elements.disconnectButton,
        'connect-sse-button': elements.connectSSEButton,
        'sent-count': elements.sentCount,
        'received-count': elements.receivedCount,
        'connection-attempts': elements.connectionAttempts,
        'reconnection-count': elements.reconnectionCount
      };
      
      return elementMapping[id] || null;
    }),
    createElement: jest.fn(type => {
      // Simple mock for created elements
      return {
        className: '',
        textContent: '',
        appendChild: jest.fn()
      };
    }),
    createTextNode: jest.fn(text => ({ text }))
  };

  // Setup window.location for WebSocket URL construction
  global.window = {
    location: {
      protocol: 'https:',
      host: 'example.com'
    }
  };

  return elements;
};

// Import the ConnectionManager
// Note: In a real test, you'd use proper module imports
const ConnectionManager = require('../public/websocket-connection.js');

describe('ConnectionManager', () => {
  let connectionManager;
  let mockElements;
  
  beforeEach(() => {
    jest.useFakeTimers();
    
    // Reset WebSocket mock
    global.WebSocket.mockClear();
    global.EventSource.mockClear();
    
    // Setup DOM mocks
    mockElements = mockDomElements();
    
    // Create ConnectionManager with test configuration
    connectionManager = new ConnectionManager({
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      reconnectBackoffFactor: 2,
      autoConnect: false, // Don't auto-connect in tests
      debug: true
    });
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  describe('Backoff Algorithm', () => {
    test('should calculate correct backoff delays', () => {
      // Directly test the backoff calculation
      connectionManager.reconnectAttempt = 0;
      expect(connectionManager.calculateReconnectDelay()).toBe(1000); // 1s
      
      connectionManager.reconnectAttempt = 1;
      expect(connectionManager.calculateReconnectDelay()).toBe(2000); // 2s
      
      connectionManager.reconnectAttempt = 2;
      expect(connectionManager.calculateReconnectDelay()).toBe(4000); // 4s
      
      connectionManager.reconnectAttempt = 3;
      expect(connectionManager.calculateReconnectDelay()).toBe(8000); // 8s
      
      connectionManager.reconnectAttempt = 4;
      expect(connectionManager.calculateReconnectDelay()).toBe(16000); // 16s
      
      // Test max delay capping
      connectionManager.reconnectAttempt = 10; // This would be 1024s without the cap
      expect(connectionManager.calculateReconnectDelay()).toBe(30000); // Capped at 30s
    });
    
    test('should schedule reconnects with increasing delays', () => {
      // Setup initial state
      connectionManager.reconnectAttempt = 0;
      
      // Trigger first reconnect
      connectionManager.scheduleWebSocketReconnect();
      
      // Advance timer by exactly 1000ms (first delay)
      jest.advanceTimersByTime(1000);
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      
      // Simulate connection failure
      const firstSocket = global.WebSocket.mock.instances[0];
      firstSocket.onclose({ wasClean: false });
      
      // Should have scheduled second reconnect
      expect(connectionManager.reconnectAttempt).toBe(1);
      
      // Advance timer by another 2000ms (second delay)
      jest.advanceTimersByTime(2000);
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
      
      // Simulate another failure
      const secondSocket = global.WebSocket.mock.instances[1];
      secondSocket.onclose({ wasClean: false });
      
      // Should have scheduled third reconnect
      expect(connectionManager.reconnectAttempt).toBe(2);
      
      // Advance timer by another 4000ms (third delay)
      jest.advanceTimersByTime(4000);
      expect(global.WebSocket).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('WebSocket to SSE Fallback', () => {
    test('should fallback to SSE when WebSocket fails', () => {
      // Connect the WebSocket
      connectionManager.connectWebSocket();
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      
      // Simulate WebSocket error
      const socket = global.WebSocket.mock.instances[0];
      socket.onerror({ message: 'Connection failed' });
      
      // Should have initialized EventSource
      expect(global.EventSource).toHaveBeenCalledTimes(1);
      
      // Verify that connection status was updated
      expect(mockElements.connectionStatus.textContent).toBe('Disconnected');
    });
    
    test('should retry WebSocket while connected via SSE', () => {
      // Connect and fail WebSocket
      connectionManager.connectWebSocket();
      const socket = global.WebSocket.mock.instances[0];
      socket.onerror({ message: 'Connection failed' });
      
      // Connect SSE successfully
      const eventSource = global.EventSource.mock.instances[0];
      eventSource.onopen();
      
      // Verify that connection mode is SSE
      expect(connectionManager.connectionMode).toBe('SSE');
      
      // Advance timer to trigger WebSocket reconnect
      jest.advanceTimersByTime(1000);
      
      // Verify that a new WebSocket attempt was made
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('UI State Transitions', () => {
    test('should update UI for connected state', () => {
      // Connect successfully
      connectionManager.connectWebSocket();
      const socket = global.WebSocket.mock.instances[0];
      socket.onopen();
      
      // Verify UI updates
      expect(mockElements.statusIndicator.classList.add).toHaveBeenCalledWith('connected');
      expect(mockElements.statusIndicator.querySelector().textContent).toBe('🟢');
      expect(mockElements.connectionStatus.textContent).toBe('Connected (WebSocket)');
      
      // Verify button states
      expect(mockElements.messageInput.disabled).toBe(false);
      expect(mockElements.sendButton.disabled).toBe(false);
      expect(mockElements.disconnectButton.disabled).toBe(false);
      expect(mockElements.connectButton.disabled).toBe(true);
      expect(mockElements.connectSSEButton.disabled).toBe(true);
    });
    
    test('should update UI for reconnecting state', () => {
      // Connect and then fail connection
      connectionManager.connectWebSocket();
      const socket = global.WebSocket.mock.instances[0];
      socket.onclose({ wasClean: false });
      
      // Verify UI updates for reconnecting state
      expect(mockElements.statusIndicator.classList.add).toHaveBeenCalledWith('reconnecting');
      expect(mockElements.statusIndicator.querySelector().textContent).toBe('🟡');
      expect(mockElements.connectionStatus.textContent).toBe('Reconnecting...');
      
      // Verify button states
      expect(mockElements.messageInput.disabled).toBe(true);
      expect(mockElements.sendButton.disabled).toBe(true);
      expect(mockElements.disconnectButton.disabled).toBe(false);
      expect(mockElements.connectButton.disabled).toBe(false);
      expect(mockElements.connectSSEButton.disabled).toBe(false);
    });
    
    test('should update UI for disconnected state', () => {
      // Connect and then disconnect cleanly
      connectionManager.connectWebSocket();
      const socket = global.WebSocket.mock.instances[0];
      socket.onopen();
      connectionManager.disconnect();
      
      // Verify UI updates for disconnected state
      expect(mockElements.statusIndicator.classList.add).toHaveBeenCalledWith('disconnected');
      expect(mockElements.statusIndicator.querySelector().textContent).toBe('🔴');
      expect(mockElements.connectionStatus.textContent).toBe('Disconnected');
      
      // Verify button states
      expect(mockElements.messageInput.disabled).toBe(true);
      expect(mockElements.sendButton.disabled).toBe(true);
      expect(mockElements.disconnectButton.disabled).toBe(true);
      expect(mockElements.connectButton.disabled).toBe(false);
      expect(mockElements.connectSSEButton.disabled).toBe(false);
    });
  });
  
  describe('Early Success Cancellation', () => {
    test('should cancel reconnect timer on successful connection', () => {
      // Start with failed connection that schedules reconnect
      connectionManager.connectWebSocket();
      const firstSocket = global.WebSocket.mock.instances[0];
      firstSocket.onclose({ wasClean: false });
      
      // Verify reconnect is scheduled
      expect(connectionManager.reconnectInterval).not.toBeNull();
      
      // Manually connect again before timer expires
      connectionManager.connectWebSocket();
      const secondSocket = global.WebSocket.mock.instances[1];
      secondSocket.onopen();
      
      // Verify reconnect timer was cleared
      expect(connectionManager.reconnectInterval).toBeNull();
      expect(connectionManager.reconnectAttempt).toBe(0);
    });
    
    test('should close SSE connection when WebSocket succeeds', () => {
      // Connect, fail WebSocket, connect SSE
      connectionManager.connectWebSocket();
      const socket = global.WebSocket.mock.instances[0];
      socket.onerror({ message: 'Connection failed' });
      
      // Connect SSE successfully
      const eventSource = global.EventSource.mock.instances[0];
      eventSource.onopen();
      
      // Verify that connection mode is SSE
      expect(connectionManager.connectionMode).toBe('SSE');
      
      // Simulate WebSocket reconnect success after SSE fallback
      jest.advanceTimersByTime(1000);
      const secondSocket = global.WebSocket.mock.instances[1];
      secondSocket.onopen();
      
      // Verify that EventSource was closed
      expect(eventSource.close).toHaveBeenCalled();
      
      // Verify that connection mode switched to WebSocket
      expect(connectionManager.connectionMode).toBe('WebSocket');
    });
  });
});
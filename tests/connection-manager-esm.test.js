/**
 * Connection Manager ESM Tests
 * 
 * Tests for the WebSocket Connection Manager with focus on:
 * 1. Backoff algorithm verification
 * 2. WebSocket to SSE fallback transitions
 * 3. UI state indicator transitions
 * 4. "Early success" cancellation during backoff
 */

// Import the ConnectionManager class using dynamic import
let ConnectionManager;

// Mock DOM elements for testing UI interaction
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

  // Reset document.getElementById mock to return our mock elements
  document.getElementById.mockImplementation(id => {
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
  });

  return elements;
};

// Mock implementation of WebSocket for testing
const mockWebSocket = () => {
  // Reset the WebSocket constructor
  const mockSocketInstance = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 0, // CONNECTING
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
  };
  
  // Create a spy for WebSocket constructor
  global.WebSocket = jest.fn().mockImplementation(() => mockSocketInstance);
  
  // Add static OPEN constant that is used in code
  global.WebSocket.OPEN = 1;
  
  return mockSocketInstance;
};

// Mock implementation of EventSource for testing
const mockEventSource = () => {
  // Reset the EventSource constructor
  const mockEventSourceInstance = {
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 0, // CONNECTING
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2
  };
  
  // Create a spy for EventSource constructor
  global.EventSource = jest.fn().mockImplementation(() => mockEventSourceInstance);
  
  return mockEventSourceInstance;
};

// Setup and teardown for all tests
beforeAll(async () => {
  // Dynamically import the ConnectionManager - this works with ESM
  const module = await import('../public/websocket-connection.js');
  ConnectionManager = module.default || module.ConnectionManager;
});

// Individual test setup and teardown
describe('ConnectionManager', () => {
  let connectionManager;
  let mockElements;
  let mockSocket;
  let mockSse;
  
  beforeEach(() => {
    // Setup fake timers
    jest.useFakeTimers();
    
    // Setup DOM mocks
    mockElements = mockDomElements();
    
    // Setup WebSocket and EventSource mocks
    mockSocket = mockWebSocket();
    mockSse = mockEventSource();
    
    // Create ConnectionManager with test configuration
    connectionManager = new ConnectionManager({
      initialReconnectDelay: 1000, // 1s initial delay
      maxReconnectDelay: 30000, // 30s max delay
      reconnectBackoffFactor: 2, // double the delay each time
      autoConnect: false, // Don't auto-connect in tests
      debug: true // Enable debug logging
    });
  });
  
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });
  
  /**
   * Test Suite 1: Backoff Algorithm
   * 
   * Tests that the exponential backoff algorithm correctly calculates delays
   * and that reconnection attempts are scheduled with the right timing.
   */
  describe('Backoff Algorithm', () => {
    test('should calculate correct backoff delays', () => {
      // Directly test the backoff calculation
      connectionManager.reconnectAttempt = 0;
      expect(connectionManager.calculateReconnectDelay()).toBe(1000); // 1s
      expect(connectionManager.reconnectAttempt).toBe(1); // Incremented after calculation
      
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
      // Mock setInterval to capture delay and callback
      const originalSetInterval = global.setInterval;
      const mockSetIntervalFn = jest.fn().mockImplementation((callback, delay) => {
        return { callback, delay, id: Math.random() };
      });
      global.setInterval = mockSetIntervalFn;
      
      // Reset reconnect attempt counter
      connectionManager.reconnectAttempt = 0;
      
      // First reconnect schedule
      connectionManager.scheduleWebSocketReconnect();
      
      // Check it used the right delay (1000ms)
      expect(mockSetIntervalFn).toHaveBeenCalledTimes(1);
      expect(mockSetIntervalFn.mock.calls[0][1]).toBe(1000);
      
      // Store the reconnect interval for first attempt
      const firstInterval = connectionManager.reconnectInterval;
      
      // Simulate a call to the interval callback which would trigger another connection
      firstInterval.callback();
      
      // Now simulate a connection failure which would trigger a second reconnect
      mockSocket.onclose?.({ wasClean: false });
      
      // The reconnect attempt should be updated
      expect(connectionManager.reconnectAttempt).toBe(1);
      
      // Second reconnect schedule
      connectionManager.scheduleWebSocketReconnect();
      
      // Check it used the right delay (2000ms)
      expect(mockSetIntervalFn).toHaveBeenCalledTimes(2);
      expect(mockSetIntervalFn.mock.calls[1][1]).toBe(2000);
      
      // Restore original setInterval
      global.setInterval = originalSetInterval;
    });
  });
  
  /**
   * Test Suite 2: WebSocket to SSE Fallback
   * 
   * Tests that the system properly falls back to Server-Sent Events (SSE)
   * when WebSocket connections fail, and attempts to reconnect WebSocket
   * in the background.
   */
  describe('WebSocket to SSE Fallback', () => {
    test('should fallback to SSE when WebSocket fails', () => {
      // Spy on fallbackToSSE method
      const fallbackSpy = jest.spyOn(connectionManager, 'fallbackToSSE');
      
      // Connect the WebSocket
      connectionManager.connectWebSocket();
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      
      // Simulate WebSocket error
      mockSocket.onerror?.({ message: 'Connection failed' });
      
      // Should have called fallbackToSSE
      expect(fallbackSpy).toHaveBeenCalledTimes(1);
      
      // Should have initialized EventSource
      expect(global.EventSource).toHaveBeenCalledTimes(1);
      
      // Restore spy
      fallbackSpy.mockRestore();
    });
    
    test('should retry WebSocket while connected via SSE', () => {
      // Connect and fail WebSocket
      connectionManager.connectWebSocket();
      mockSocket.onerror?.({ message: 'Connection failed' });
      
      // Connect SSE successfully
      mockSse.onopen?.();
      
      // Verify that connection mode is SSE
      expect(connectionManager.connectionMode).toBe('SSE');
      
      // Mock setInterval to capture and immediately execute callback
      const originalSetInterval = global.setInterval;
      global.setInterval = jest.fn().mockImplementation((callback, delay) => {
        // Simulate time passing
        setTimeout(callback, 0);
        return { callback, delay, id: Math.random() };
      });
      
      // Trigger reconnect
      connectionManager.scheduleWebSocketReconnect();
      
      // Force timers to advance
      jest.runAllTimers();
      
      // Verify that a new WebSocket attempt was made
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
      
      // Restore original setInterval
      global.setInterval = originalSetInterval;
    });
  });
  
  /**
   * Test Suite 3: UI State Transitions
   * 
   * Tests that the UI correctly updates its state indications
   * for connected, reconnecting, and disconnected states.
   */
  describe('UI State Transitions', () => {
    test('should update UI for connected state', () => {
      // Connect successfully
      connectionManager.connectWebSocket();
      mockSocket.onopen?.();
      
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
      mockSocket.onclose?.({ wasClean: false });
      
      // Force reconnect interval to be set
      connectionManager.reconnectInterval = setInterval(() => {}, 1000);
      connectionManager.updateConnectionStatus(false);
      
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
      mockSocket.onopen?.();
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
  
  /**
   * Test Suite 4: Early Success Cancellation
   * 
   * Tests that reconnect attempts are properly cancelled when a connection
   * succeeds early, and that fallback connections are closed when primary
   * connections succeed.
   */
  describe('Early Success Cancellation', () => {
    test('should cancel reconnect timer on successful connection', () => {
      // Mock clearInterval to verify it's called
      const originalClearInterval = global.clearInterval;
      const mockClearInterval = jest.fn();
      global.clearInterval = mockClearInterval;
      
      // Start with failed connection that schedules reconnect
      connectionManager.connectWebSocket();
      mockSocket.onclose?.({ wasClean: false });
      
      // Simulate a reconnect interval being set
      connectionManager.reconnectInterval = 12345;
      connectionManager.reconnectAttempt = 2;
      
      // Manually connect again and simulate success
      connectionManager.connectWebSocket();
      
      // Get the new socket instance
      const newSocket = WebSocket.mock.results[1].value;
      newSocket.onopen?.();
      
      // Verify reconnect timer was cleared
      expect(mockClearInterval).toHaveBeenCalledWith(12345);
      expect(connectionManager.reconnectInterval).toBeNull();
      expect(connectionManager.reconnectAttempt).toBe(0);
      
      // Restore original clearInterval
      global.clearInterval = originalClearInterval;
    });
    
    test('should close SSE connection when WebSocket succeeds', () => {
      // Connect, fail WebSocket, connect SSE
      connectionManager.connectWebSocket();
      mockSocket.onerror?.({ message: 'Connection failed' });
      
      // Connect SSE successfully
      mockSse.onopen?.();
      
      // Verify that connection mode is SSE
      expect(connectionManager.connectionMode).toBe('SSE');
      
      // Store the EventSource instance
      connectionManager.eventSource = mockSse;
      
      // Simulate WebSocket reconnect success after SSE fallback
      connectionManager.connectWebSocket();
      const newSocket = WebSocket.mock.results[1].value;
      newSocket.onopen?.();
      
      // Verify that EventSource was closed
      expect(mockSse.close).toHaveBeenCalled();
      
      // Verify that connection mode switched to WebSocket
      expect(connectionManager.connectionMode).toBe('WebSocket');
    });
  });
});
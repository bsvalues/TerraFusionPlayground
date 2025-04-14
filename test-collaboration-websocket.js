/**
 * Collaboration WebSocket Test Client
 * 
 * This script tests the WebSocket connection for collaborative workflows.
 * It establishes a connection to the server and demonstrates:
 * 1. Joining and leaving a collaboration session
 * 2. Sending and receiving cursor position updates
 * 3. Sending and receiving edit operations
 * 4. Handling disconnection and reconnection
 */

// Initialize WebSocket connection
function connectWebSocket() {
  // Determine protocol (ws or wss) based on current location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Create WebSocket URL with the proper protocol and host
  const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port}/ws/collaboration`;
  
  console.log(`Connecting to WebSocket at ${wsUrl}`);
  const socket = new WebSocket(wsUrl);
  
  // Connection opened
  socket.addEventListener('open', (event) => {
    console.log('Connected to collaboration WebSocket server');
    
    // Join a test session
    const joinMessage = {
      type: 'join_session',
      sessionId: 'test-session-1',
      userId: 1,
      userName: 'Test User',
      timestamp: Date.now(),
      payload: {
        role: 'editor'
      }
    };
    
    socket.send(JSON.stringify(joinMessage));
    console.log('Sent join session message', joinMessage);
    
    // Send cursor position after a delay
    setTimeout(() => {
      const cursorMessage = {
        type: 'cursor_position',
        sessionId: 'test-session-1',
        userId: 1,
        userName: 'Test User',
        timestamp: Date.now(),
        payload: {
          x: 120,
          y: 250,
          section: 'property-details'
        }
      };
      
      socket.send(JSON.stringify(cursorMessage));
      console.log('Sent cursor position message', cursorMessage);
    }, 2000);
    
    // Send an edit operation after a delay
    setTimeout(() => {
      const editMessage = {
        type: 'edit_operation',
        sessionId: 'test-session-1',
        userId: 1,
        userName: 'Test User',
        timestamp: Date.now(),
        payload: {
          operation: 'insert',
          path: 'property.description',
          value: 'Updated property description',
          revision: 1
        }
      };
      
      socket.send(JSON.stringify(editMessage));
      console.log('Sent edit operation message', editMessage);
    }, 4000);
    
    // Leave the session after a delay
    setTimeout(() => {
      const leaveMessage = {
        type: 'leave_session',
        sessionId: 'test-session-1',
        userId: 1,
        userName: 'Test User',
        timestamp: Date.now()
      };
      
      socket.send(JSON.stringify(leaveMessage));
      console.log('Sent leave session message', leaveMessage);
      
      // Close the connection after a brief delay
      setTimeout(() => {
        socket.close();
        console.log('WebSocket connection closed');
      }, 1000);
    }, 6000);
  });
  
  // Listen for messages
  socket.addEventListener('message', (event) => {
    console.log('Message from server:', event.data);
    try {
      const message = JSON.parse(event.data);
      console.log('Parsed message:', message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  // Connection closed
  socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
    // Attempt to reconnect after a delay
    if (event.code !== 1000) { // Normal closure
      console.log('Will attempt to reconnect in 5 seconds...');
      setTimeout(connectWebSocket, 5000);
    }
  });
  
  // Connection error
  socket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
  });
  
  return socket;
}

// Start the WebSocket connection if running in browser
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('Page loaded, connecting to WebSocket...');
    connectWebSocket();
  });
}

// For Node.js environment (running as script)
if (typeof module !== 'undefined' && module.exports) {
  console.log('Running in Node.js environment');
  // When running in Node.js, create a WebSocket client
  const WebSocket = require('ws');
  const socket = new WebSocket('ws://localhost:3000/ws/collaboration');
  
  socket.on('open', function open() {
    console.log('Connected to WebSocket server');
    
    // Join a test session
    const joinMessage = {
      type: 'join_session',
      sessionId: 'test-session-1',
      userId: 1,
      userName: 'Test User',
      timestamp: Date.now(),
      payload: {
        role: 'editor'
      }
    };
    
    socket.send(JSON.stringify(joinMessage));
    console.log('Sent join session message');
    
    // Continue with test messages...
    // Similar to browser implementation but using Node.js WebSocket API
  });
  
  socket.on('message', function incoming(data) {
    console.log('Received:', data);
  });
  
  socket.on('close', function close() {
    console.log('Disconnected from WebSocket server');
  });
  
  socket.on('error', function error(err) {
    console.error('WebSocket error:', err);
  });
}
/**
 * WebSocket test script using ESM imports
 * 
 * This script tests the WebSocket connection to the server
 * using ES Modules syntax instead of CommonJS
 */

import { WebSocket } from 'ws';

console.log('Running in ESM environment');

// Determine the port based on environment or use default
const port = process.env.PORT || 3000;
console.log(`Using port ${port}`);

// Print debug information
console.log('WS module loaded: true');
console.log('WebSocket.OPEN value:', WebSocket.OPEN);
console.log('WebSocket ReadyState Values:', {
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSING: WebSocket.CLOSING,
  CLOSED: WebSocket.CLOSED
});

// Create WebSocket connection
console.log(`Creating WebSocket connection to ws://localhost:${port}/ws/collaboration`);
const socket = new WebSocket(`ws://localhost:${port}/ws/collaboration`);

console.log('WebSocket client created, type:', typeof socket);
console.log('Socket object keys:', Object.keys(socket));
console.log('Initial ready state:', socket.readyState);
console.log('Waiting for connection events...');

socket.on('open', () => {
  console.log('SUCCESS: Connected to WebSocket server');
  
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
  
  console.log('Sending join session message:', JSON.stringify(joinMessage, null, 2));
  socket.send(JSON.stringify(joinMessage));
  console.log('Join session message sent successfully');
  
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
    
    console.log('Sending cursor position message:', JSON.stringify(cursorMessage, null, 2));
    socket.send(JSON.stringify(cursorMessage));
    console.log('Cursor position message sent successfully');
  }, 2000);
  
  // Leave the session after a delay
  setTimeout(() => {
    const leaveMessage = {
      type: 'leave_session',
      sessionId: 'test-session-1',
      userId: 1,
      userName: 'Test User',
      timestamp: Date.now()
    };
    
    console.log('Sending leave session message:', JSON.stringify(leaveMessage, null, 2));
    socket.send(JSON.stringify(leaveMessage));
    console.log('Leave session message sent successfully');
    
    // Close socket after another delay
    setTimeout(() => {
      console.log('Closing WebSocket connection...');
      socket.close();
    }, 1000);
  }, 5000);
});

socket.on('message', (data) => {
  console.log('Received message from server:');
  try {
    const jsonData = JSON.parse(data.toString());
    console.log(JSON.stringify(jsonData, null, 2));
  } catch (e) {
    console.log('Raw message (not JSON):', data.toString());
  }
});

socket.on('close', (code, reason) => {
  console.log(`WebSocket connection closed: Code=${code}, Reason="${reason || 'No reason provided'}"`);
});

socket.on('error', (err) => {
  console.error('WebSocket error occurred:');
  console.error(err.toString());
  console.error('Error details:', JSON.stringify({
    code: err.code,
    message: err.message,
    stack: err.stack
  }, null, 2));
});

// Keep the process running for a bit to complete the test
setTimeout(() => {
  console.log('Test complete, exiting process.');
  process.exit(0);
}, 10000);
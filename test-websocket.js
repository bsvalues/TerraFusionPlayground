// Test WebSocket client for notifications
import WebSocket from 'ws';

// Connect to the WebSocket server
const ws = new WebSocket('ws://localhost:5000');

console.log('Connecting to WebSocket server...');

// Handle connection open
ws.on('open', function open() {
  console.log('Connected to WebSocket server');
  
  // Send authentication message
  const authMessage = {
    type: 'auth',
    userId: '1'
  };
  
  ws.send(JSON.stringify(authMessage));
  console.log('Sent authentication message for user ID 1');
});

// Handle incoming messages
ws.on('message', function incoming(data) {
  const message = JSON.parse(data);
  console.log('Received message:', message);
});

// Handle errors
ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

// Handle connection close
ws.on('close', function close() {
  console.log('Disconnected from WebSocket server');
});

// Keep the process running
console.log('WebSocket client is running. Press Ctrl+C to exit.');
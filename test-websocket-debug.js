/**
 * WebSocket Connection Debugging Script
 * 
 * This script tests various WebSocket connection paths to diagnose connection issues.
 */

import { WebSocket } from 'ws';
import http from 'http';

// Test different WebSocket endpoints
const endpoints = [
  '/ws',                      // Simple WebSocket server
  '/api/agents/ws',           // Agent WebSocket service
  '/ws/agent-health',         // Agent Health WebSocket service
  '/api/agents/socket.io',    // Agent Socket.IO service (note: Socket.IO has different handshake)
  '/ws/collaboration',        // Collaboration WebSocket service
  '/ws/team-collaboration'    // Team collaboration WebSocket service
];

// Get the WebSocket server URL
const getWebSocketUrl = (path) => {
  // Use localhost for testing
  const host = 'localhost:5000';
  return `ws://${host}${path}`;
};

// Test each endpoint
endpoints.forEach(endpoint => {
  try {
    console.log(`Testing connection to ${endpoint}...`);
    const ws = new WebSocket(getWebSocketUrl(endpoint));
    
    ws.on('open', () => {
      console.log(`✅ Successfully connected to ${endpoint}`);
      
      // Send a test message
      const testMessage = {
        type: 'test',
        message: 'This is a test message',
        timestamp: new Date().toISOString()
      };
      
      ws.send(JSON.stringify(testMessage));
      console.log(`Sent test message to ${endpoint}`);
    });
    
    ws.on('message', (data) => {
      console.log(`Received message from ${endpoint}:`, data.toString());
      
      // Close the connection after receiving a message
      ws.close();
    });
    
    ws.on('error', (error) => {
      console.error(`❌ Error connecting to ${endpoint}:`, error.message);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`Connection to ${endpoint} closed with code ${code} and reason: ${reason || 'No reason provided'}`);
    });
  } catch (error) {
    console.error(`❌ Failed to initialize connection to ${endpoint}:`, error.message);
  }
});

// Additional test: Socket.IO via HTTP polling fallback
console.log('\nTesting Socket.IO HTTP polling fallback:');
try {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/agents/socket.io/?EIO=4&transport=polling',
    method: 'GET'
  };
  
  const req = http.request(options, (res) => {
    console.log(`Socket.IO polling response status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Socket.IO polling response:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
    });
  });
  
  req.on('error', (error) => {
    console.error('Socket.IO polling error:', error.message);
  });
  
  req.end();
} catch (error) {
  console.error('Failed to test Socket.IO polling:', error.message);
}
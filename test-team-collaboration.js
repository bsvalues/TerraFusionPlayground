/**
 * Team Collaboration WebSocket Test Client
 * 
 * This script tests the WebSocket collaboration functionality for team agents.
 * It connects to the WebSocket server and allows sending/receiving messages
 * between the AI team members.
 */

import { WebSocket } from 'ws';
import http from 'http';

console.log('Running in ESM environment - Team Collaboration Test');

// Get server details
const PORT = process.env.PORT || 5000;
const WS_PATH = '/ws/collaboration';

console.log(`Using port ${PORT}`);

// First verify HTTP server is running
console.log(`Checking if HTTP server is running on port ${PORT}...`);

// Create HTTP request to verify server is up
const httpRequest = http.request({
  hostname: 'localhost',
  port: PORT,
  path: '/api/health',
  method: 'GET'
});

httpRequest.on('error', (error) => {
  console.error(`HTTP connection error: ${error.message}`);
  console.error('Server may not be running. Please verify server is running.');
  process.exit(1);
});

httpRequest.on('response', (response) => {
  console.log(`HTTP server responded with status: ${response.statusCode}`);
  
  // Continue with WebSocket connection after validating HTTP server
  connectWebSocket();
});

httpRequest.end();

// Print debug information
console.log('WS module loaded:', !!WebSocket);
console.log('WebSocket.OPEN value:', WebSocket.OPEN);

// Connect to the collaboration WebSocket
function connectWebSocket() {
  // Create WebSocket URL
  const wsUrl = `ws://localhost:${PORT}${WS_PATH}`;
  console.log(`Connecting to WebSocket at ${wsUrl}`);
  
  // Create WebSocket connection with options
  const socket = new WebSocket(wsUrl, {
    headers: {
      'User-Agent': 'TeamCollaborationTestClient',
      'X-Test-Client': 'true'
    },
    handshakeTimeout: 5000 // 5 seconds timeout for handshake
  });
  
  console.log('WebSocket client created, ready state:', socket.readyState);
  
  // Set up event handlers
  socket.on('open', () => {
    console.log('SUCCESS: WebSocket connection established');
    
    // Send a join session message first
    const joinMessage = {
      type: 'join_session',
      sessionId: 'team-session-1',
      userId: 999,
      userName: 'Test Client',
      timestamp: Date.now(),
      payload: {
        role: 'external-tester'
      }
    };
    
    console.log('Sending join session message:', JSON.stringify(joinMessage, null, 2));
    socket.send(JSON.stringify(joinMessage));
    console.log('Join session message sent successfully');
    
    // Send a team message after a delay
    setTimeout(() => {
      const teamMessage = {
        type: 'TEAM_MESSAGE',
        from: 'test-client',
        to: 'all',
        content: 'Hello team! This is a test message from the collaboration client.',
        timestamp: new Date().toISOString()
      };
      
      console.log('Sending team message:', JSON.stringify(teamMessage, null, 2));
      socket.send(JSON.stringify(teamMessage));
      console.log('Team message sent successfully');
    }, 2000);
    
    // Send a task assignment example after a delay
    setTimeout(() => {
      const taskMessage = {
        type: 'TASK_ASSIGNMENT',
        from: 'test-client',
        to: 'frontend-developer',
        taskId: 'task-' + Date.now(),
        title: 'Update Dashboard UI Components',
        description: 'Enhance the property dashboard with new visualization components for assessments.',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      console.log('Sending task assignment:', JSON.stringify(taskMessage, null, 2));
      socket.send(JSON.stringify(taskMessage));
      console.log('Task assignment sent successfully');
    }, 4000);
    
    // Leave the session after a longer delay
    setTimeout(() => {
      const leaveMessage = {
        type: 'leave_session',
        sessionId: 'team-session-1',
        userId: 999,
        userName: 'Test Client',
        timestamp: Date.now()
      };
      
      console.log('Sending leave session message:', JSON.stringify(leaveMessage, null, 2));
      socket.send(JSON.stringify(leaveMessage));
      console.log('Leave session message sent successfully');
      
      // Close socket after another delay
      setTimeout(() => {
        console.log('Closing WebSocket connection...');
        socket.close();
        
        // Exit the process after everything is done
        setTimeout(() => {
          console.log('Test complete, exiting process.');
          process.exit(0);
        }, 1000);
      }, 1000);
    }, 8000);
  });
  
  socket.on('message', (data) => {
    console.log('Received message from server:');
    try {
      const jsonData = JSON.parse(data.toString());
      console.log(JSON.stringify(jsonData, null, 2));
      
      // Handle different message types
      switch (jsonData.type) {
        case 'TEAM_MESSAGE':
          console.log(`\n[${jsonData.from}]: ${jsonData.content}`);
          break;
        case 'TASK_UPDATE':
          console.log(`\nTask Update: ${jsonData.title} - ${jsonData.status}`);
          break;
        case 'AGENT_STATUS':
          console.log(`\nAgent Status Update: ${jsonData.agentId} is now ${jsonData.status}`);
          break;
        default:
          console.log('\nReceived message of type:', jsonData.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      console.log('Raw message data:', data.toString());
    }
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
  
  socket.on('close', (code, reason) => {
    console.log(`WebSocket closed: Code=${code}, Reason="${reason || 'No reason provided'}"`);
  });
}
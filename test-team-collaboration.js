/**
 * Team Collaboration WebSocket Test Client
 * 
 * This script tests the WebSocket collaboration functionality for team agents.
 * It connects to the WebSocket server and allows sending/receiving messages
 * between the AI team members.
 * 
 * UPDATED: Now fetches real collaboration session data from the API
 * before connecting to ensure proper authentication.
 */

import { WebSocket } from 'ws';
import http from 'http';

console.log('Running in ESM environment - Team Collaboration Test');

// Get server details
const PORT = process.env.PORT || 5000;
const WS_PATH = '/ws/collaboration';
const API_BASE = `http://localhost:${PORT}/api`;

console.log(`Using port ${PORT}`);

// Helper function to make HTTP requests and parse JSON response
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (err) {
          console.error('Error parsing JSON response:', err);
          reject(err);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });
    
    req.end();
  });
}

// Function to fetch team collaboration data
async function fetchTeamData() {
  console.log('Fetching team data from API...');
  
  try {
    // Fetch collaboration sessions
    const sessions = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/team-agents/collaboration-sessions',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    console.log(`Found ${sessions.length} collaboration sessions`);
    
    // Fetch team members
    const members = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/team-agents/members',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    console.log(`Found ${members.length} team members`);
    
    return {
      sessions,
      members,
      // Use first session and first member for testing
      activeSession: sessions[0],
      activeMember: members[0]
    };
  } catch (error) {
    console.error('Error fetching team data:', error);
    throw error;
  }
}

// Main function to orchestrate the test
async function runTest() {
  try {
    // First fetch team data
    const teamData = await fetchTeamData();
    console.log('Team data fetched successfully');
    console.log('Active session:', teamData.activeSession.id);
    console.log('Active member:', teamData.activeMember.name, '(ID:', teamData.activeMember.id, ')');
    
    // Now connect to WebSocket with real data
    connectWebSocket(teamData);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Print debug information
console.log('WS module loaded:', !!WebSocket);
console.log('WebSocket.OPEN value:', WebSocket.OPEN);

// Connect to the collaboration WebSocket
function connectWebSocket(teamData) {
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
    
    // Send a join session message first using real data
    const joinMessage = {
      type: 'join_session',
      sessionId: teamData.activeSession.id,
      userId: teamData.activeMember.id,
      userName: teamData.activeMember.name,
      timestamp: Date.now(),
      payload: {
        role: teamData.activeMember.role
      }
    };
    
    console.log('Sending join session message:', JSON.stringify(joinMessage, null, 2));
    socket.send(JSON.stringify(joinMessage));
    console.log('Join session message sent successfully');
    
    // Send a team message after a delay
    setTimeout(() => {
      const teamMessage = {
        type: 'comment',
        sessionId: teamData.activeSession.id,
        userId: teamData.activeMember.id,
        userName: teamData.activeMember.name,
        timestamp: Date.now(),
        payload: {
          comment: 'Hello team! This is a test message from the collaboration client.',
          position: { section: 'general' }
        }
      };
      
      console.log('Sending team message:', JSON.stringify(teamMessage, null, 2));
      socket.send(JSON.stringify(teamMessage));
      console.log('Team message sent successfully');
    }, 2000);
    
    // Send a cursor position update after a delay
    setTimeout(() => {
      const cursorMessage = {
        type: 'cursor_position',
        sessionId: teamData.activeSession.id,
        userId: teamData.activeMember.id,
        userName: teamData.activeMember.name,
        timestamp: Date.now(),
        payload: {
          position: {
            x: 100,
            y: 200,
            section: 'code-editor'
          }
        }
      };
      
      console.log('Sending cursor position:', JSON.stringify(cursorMessage, null, 2));
      socket.send(JSON.stringify(cursorMessage));
      console.log('Cursor position sent successfully');
    }, 4000);
    
    // Leave the session after a longer delay
    setTimeout(() => {
      const leaveMessage = {
        type: 'leave_session',
        sessionId: teamData.activeSession.id,
        userId: teamData.activeMember.id,
        userName: teamData.activeMember.name,
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
    console.log('\n----- Received message from server: -----');
    try {
      const jsonData = JSON.parse(data.toString());
      console.log(JSON.stringify(jsonData, null, 2));
      
      // Handle different message types based on the WebSocket protocol
      if (jsonData.type) {
        console.log(`\nReceived message of type: ${jsonData.type}`);
        
        // Additional handling for specific message types
        switch (jsonData.type) {
          case 'USER_JOINED':
            console.log(`User ${jsonData.userName} (ID: ${jsonData.userId}) joined the session`);
            break;
          case 'USER_LEFT':
            console.log(`User ${jsonData.userName} (ID: ${jsonData.userId}) left the session`);
            break;
          case 'COMMENT':
            console.log(`Comment from ${jsonData.userName}: ${jsonData.payload?.comment}`);
            break;
          case 'CURSOR_POSITION':
            console.log(`Cursor update from ${jsonData.userName} at position:`, jsonData.payload?.position);
            break;
          case 'EDIT_OPERATION':
            console.log(`Edit operation from ${jsonData.userName}:`, jsonData.payload?.operation);
            break;
          case 'ERROR':
            console.error(`Error from server: ${jsonData.payload?.message || 'Unknown error'}`);
            break;
        }
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

// Start the test
runTest().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
/**
 * WebSocket CORS Middleware
 * 
 * This module handles CORS for WebSocket connections, allowing clients
 * to connect to the WebSocket server from different origins.
 */

import { IncomingMessage } from 'http';
import { Socket } from 'net';

export function verifyWebSocketRequest(request: IncomingMessage, socket: Socket, head: Buffer): boolean {
  // Handle CORS for WebSocket connections
  const origin = request.headers.origin || '';
  
  // Allow connections from any origin
  // In production, you might want to restrict this to trusted origins
  const allowedOrigins = ['*'];
  
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    // Set CORS headers for WebSocket upgrade
    if (request.headers.origin) {
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${request.headers['sec-websocket-key']}\r\n` +
        `Access-Control-Allow-Origin: ${origin}\r\n` +
        'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n' +
        'Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization\r\n' +
        'Access-Control-Allow-Credentials: true\r\n\r\n'
      );
    }
    
    return true;
  }
  
  // Reject connections from non-allowed origins
  return false;
}
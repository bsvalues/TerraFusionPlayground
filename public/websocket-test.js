/**
 * WebSocket Test Page Script
 */
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the connection manager
  const connectionManager = new ConnectionManager({
    wsPath: '/ws',
    ssePath: '/api/events',
    initialReconnectDelay: 1000,
    maxReconnectDelay: 30000,
    reconnectBackoffFactor: 2,
    autoConnect: true,
    debug: true
  });
  
  // Log initialization
  connectionManager.addMessageToLog('WebSocket Test Page loaded', 'info');
  
  // Store reference in window for debugging
  window.connectionManager = connectionManager;
});
import React, { useState, useEffect, useRef } from 'react';

/**
 * WebSocket Test Component
 * 
 * This component tests WebSocket connectivity with the server by:
 * 1. Establishing a connection
 * 2. Sending test messages
 * 3. Displaying received messages
 */
const WebSocketTest: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const socket = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  // Connect to WebSocket server
  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, []);
  
  const connect = () => {
    try {
      setConnectionStatus('connecting');
      // Use the appropriate protocol based on the current connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      addMessage(`Connecting to ${wsUrl}...`);
      addMessage(`Tip: If direct WebSocket connection fails, the application will use Socket.IO with polling fallback.`);
      
      let connectionTimer = setTimeout(() => {
        if (socket.current?.readyState !== WebSocket.OPEN) {
          addMessage('Connection taking longer than expected. May fall back to HTTP polling...');
        }
      }, 2000);
      
      socket.current = new WebSocket(wsUrl);
      
      socket.current.onopen = () => {
        setConnected(true);
        setConnectionStatus('connected');
        addMessage('WebSocket connection established successfully');
        // Add more detailed information
        addMessage(`Connected to: ${wsUrl}`);
      };
      
      socket.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          addMessage(`Received: ${JSON.stringify(message, null, 2)}`);
        } catch (error) {
          // Enhanced error handling for non-JSON responses
          try {
            // Check if starts with HTML - this could indicate we're getting a webpage instead of a proper WebSocket response
            if (event.data.toString().trim().startsWith('<')) {
              addMessage(`ERROR: Received HTML instead of WebSocket data. This typically means the WebSocket endpoint is incorrect or not available.`);
              addMessage(`Raw data: ${event.data.toString().substring(0, 100)}...`);
            } else {
              addMessage(`Received non-JSON message: ${event.data}`);
            }
          } catch (parseError) {
            addMessage(`Failed to parse message: ${error}`);
          }
        }
      };
      
      socket.current.onclose = (event) => {
        setConnected(false);
        setConnectionStatus('disconnected');
        
        // More helpful messaging based on close code
        let closeReason = '';
        switch (event.code) {
          case 1000:
            closeReason = 'Normal closure';
            break;
          case 1001:
            closeReason = 'Endpoint going away (server shutdown)';
            break;
          case 1002:
            closeReason = 'Protocol error';
            break;
          case 1003:
            closeReason = 'Unsupported data';
            break;
          case 1006:
            closeReason = 'Abnormal closure (connection lost)';
            break;
          case 1007:
            closeReason = 'Invalid frame payload data';
            break;
          case 1008:
            closeReason = 'Policy violation';
            break;
          case 1009:
            closeReason = 'Message too big';
            break;
          case 1010:
            closeReason = 'Missing extension';
            break;
          case 1011:
            closeReason = 'Internal server error';
            break;
          case 1012:
            closeReason = 'Service restart';
            break;
          case 1013:
            closeReason = 'Try again later';
            break;
          case 1014:
            closeReason = 'Bad gateway';
            break;
          case 1015:
            closeReason = 'TLS handshake failure';
            break;
          default:
            closeReason = `Unknown (${event.code})`;
        }
        
        addMessage(`WebSocket connection closed: ${closeReason}${event.reason ? ` - ${event.reason}` : ''}`);
        
        // Provide reconnection guidance
        addMessage('You can try reconnecting by clicking the Connect button.');
      };
      
      socket.current.onerror = (error) => {
        setConnectionStatus('error');
        
        // Enhanced error information
        addMessage(`WebSocket error occurred: ${error}`);
        addMessage('Common causes: incorrect WebSocket URL, server not running, network issues, or CORS restrictions');
        
        // Suggestion for fallback mode
        addMessage('Recommendation: The application should fall back to HTTP polling if WebSocket connection fails');
      };
    } catch (error) {
      setConnectionStatus('error');
      addMessage(`Error connecting to WebSocket: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const disconnect = () => {
    if (socket.current) {
      socket.current.close();
      addMessage('Disconnected from WebSocket server');
    }
  };
  
  const sendMessage = () => {
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'message',
        content: inputMessage,
        timestamp: new Date().toISOString()
      };
      
      socket.current.send(JSON.stringify(message));
      addMessage(`Sent: ${JSON.stringify(message, null, 2)}`);
      setInputMessage('');
    } else {
      addMessage('Cannot send message: WebSocket is not connected');
    }
  };
  
  const sendPing = () => {
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'ping',
        timestamp: Date.now()
      };
      
      socket.current.send(JSON.stringify(message));
      addMessage(`Sent ping: ${JSON.stringify(message, null, 2)}`);
    } else {
      addMessage('Cannot send ping: WebSocket is not connected');
    }
  };
  
  const addMessage = (message: string) => {
    setMessages(prev => [...prev, message]);
  };
  
  const clearMessages = () => {
    setMessages([]);
  };
  
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-emerald-500';
      case 'connecting': return 'text-amber-500';
      case 'disconnected': return 'text-slate-500';
      case 'error': return 'text-rose-500';
      default: return 'text-slate-500';
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">WebSocket Test</h1>
      
      <div className="flex items-center mb-4">
        <span className="mr-2">Status:</span>
        <span className={`font-bold ${getStatusColor()}`}>
          {connectionStatus.toUpperCase()}
        </span>
      </div>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={connect}
          disabled={connected}
          className="px-4 py-2 bg-teal-600 text-white rounded disabled:opacity-50"
        >
          Connect
        </button>
        
        <button
          onClick={disconnect}
          disabled={!connected}
          className="px-4 py-2 bg-rose-600 text-white rounded disabled:opacity-50"
        >
          Disconnect
        </button>
        
        <button
          onClick={sendPing}
          disabled={!connected}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Send Ping
        </button>
        
        <button
          onClick={clearMessages}
          className="px-4 py-2 bg-slate-600 text-white rounded"
        >
          Clear Messages
        </button>
      </div>
      
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message to send..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded"
          />
          
          <button
            onClick={sendMessage}
            disabled={!connected || !inputMessage.trim()}
            className="px-4 py-2 bg-teal-600 text-white rounded disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
      
      <div className="border border-slate-300 rounded p-4 h-96 overflow-y-auto bg-slate-50">
        <h2 className="text-lg font-semibold mb-2">Message Log</h2>
        {messages.length === 0 ? (
          <p className="text-slate-500">No messages yet</p>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => (
              <pre key={index} className="whitespace-pre-wrap bg-white p-2 rounded border border-slate-200 text-sm">
                {message}
              </pre>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebSocketTest;
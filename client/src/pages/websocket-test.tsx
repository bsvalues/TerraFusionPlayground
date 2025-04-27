import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle, RefreshCw, WifiOff } from "lucide-react";

/**
 * WebSocket Test Component
 * 
 * This component tests WebSocket connectivity with the server by:
 * 1. Establishing a connection via raw WebSocket and Socket.IO
 * 2. Sending test messages through both connection types
 * 3. Displaying received messages and connection status
 * 4. Demonstrating fallback behavior when WebSocket fails
 */
const WebSocketTest: React.FC = () => {
  // Native WebSocket state
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const socket = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  // Socket.IO state
  const [socketIOConnected, setSocketIOConnected] = useState(false);
  const [socketIOMessages, setSocketIOMessages] = useState<string[]>([]);
  const [socketIOInputMessage, setSocketIOInputMessage] = useState('');
  const socketIO = useRef<Socket | null>(null);
  const [socketIOStatus, setSocketIOStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [usingPolling, setUsingPolling] = useState(false);
  
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
  
  // Socket.IO connection handling
  const connectSocketIO = () => {
    try {
      setSocketIOStatus('connecting');
      
      addSocketIOMessage(`Initializing Socket.IO connection...`);
      
      // Initialize Socket.IO connection
      const socketUrl = window.location.origin;
      const path = '/api/agents/socket.io';
      
      addSocketIOMessage(`Connecting to ${socketUrl} with path: ${path}`);
      
      // Create Socket.IO instance
      socketIO.current = io(socketUrl, {
        path: path,
        transports: ['websocket', 'polling'], // Try WebSocket first, then fall back to polling
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });
      
      // Connection event handlers
      socketIO.current.on('connect', () => {
        setSocketIOConnected(true);
        setSocketIOStatus('connected');
        addSocketIOMessage(`Socket.IO connection established successfully`);
        addSocketIOMessage(`Connection ID: ${socketIO.current?.id}`);
        
        // Check transport type
        const transport = socketIO.current?.io?.engine?.transport?.name;
        setUsingPolling(transport === 'polling');
        addSocketIOMessage(`Transport method: ${transport}`);
      });
      
      socketIO.current.on('connect_error', (error) => {
        setSocketIOStatus('error');
        addSocketIOMessage(`Socket.IO connection error: ${error.message}`);
      });
      
      socketIO.current.on('disconnect', (reason) => {
        setSocketIOConnected(false);
        setSocketIOStatus('disconnected');
        addSocketIOMessage(`Socket.IO disconnected: ${reason}`);
      });
      
      socketIO.current.on('reconnect_attempt', (attemptNumber) => {
        addSocketIOMessage(`Socket.IO reconnection attempt ${attemptNumber}...`);
      });
      
      socketIO.current.on('reconnect', (attemptNumber) => {
        setSocketIOConnected(true);
        setSocketIOStatus('connected');
        addSocketIOMessage(`Socket.IO reconnected after ${attemptNumber} attempts`);
        
        // Check if reconnected with polling fallback
        const transport = socketIO.current?.io?.engine?.transport?.name;
        setUsingPolling(transport === 'polling');
        addSocketIOMessage(`Reconnected using transport: ${transport}`);
      });
      
      // Listen for messages
      socketIO.current.on('message', (data) => {
        addSocketIOMessage(`Received message: ${JSON.stringify(data, null, 2)}`);
      });
      
      // Listen for echo response
      socketIO.current.on('echo', (data) => {
        addSocketIOMessage(`Received echo: ${JSON.stringify(data, null, 2)}`);
      });
      
    } catch (error) {
      setSocketIOStatus('error');
      addSocketIOMessage(`Error initializing Socket.IO: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const disconnectSocketIO = () => {
    if (socketIO.current) {
      socketIO.current.disconnect();
      addSocketIOMessage('Disconnected from Socket.IO server');
    }
  };
  
  const sendSocketIOMessage = () => {
    if (socketIO.current && socketIOConnected) {
      const message = {
        type: 'message',
        content: socketIOInputMessage,
        timestamp: new Date().toISOString()
      };
      
      socketIO.current.emit('message', message);
      addSocketIOMessage(`Sent: ${JSON.stringify(message, null, 2)}`);
      setSocketIOInputMessage('');
    } else {
      addSocketIOMessage('Cannot send message: Socket.IO is not connected');
    }
  };
  
  const sendSocketIOPing = () => {
    if (socketIO.current && socketIOConnected) {
      const message = {
        type: 'ping',
        timestamp: Date.now()
      };
      
      socketIO.current.emit('ping', message);
      addSocketIOMessage(`Sent ping: ${JSON.stringify(message, null, 2)}`);
    } else {
      addSocketIOMessage('Cannot send ping: Socket.IO is not connected');
    }
  };
  
  const addSocketIOMessage = (message: string) => {
    setSocketIOMessages(prev => [...prev, message]);
  };
  
  const clearSocketIOMessages = () => {
    setSocketIOMessages([]);
  };
  
  const getSocketIOStatusColor = () => {
    switch (socketIOStatus) {
      case 'connected': return 'text-emerald-500';
      case 'connecting': return 'text-amber-500';
      case 'disconnected': return 'text-slate-500';
      case 'error': return 'text-rose-500';
      default: return 'text-slate-500';
    }
  };
  
  // Cleanup Socket.IO on unmount
  useEffect(() => {
    return () => {
      if (socketIO.current) {
        socketIO.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Real-time Connection Testing</h1>
      <p className="text-sm text-gray-600 mb-6">
        Compare direct WebSocket connections with Socket.IO (which provides automatic fallback to HTTP polling)
      </p>
      
      <Tabs defaultValue="websocket" className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="websocket">
            Native WebSocket
            <Badge variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'error' ? 'destructive' : 'secondary'} 
              className="ml-2">
              {connectionStatus}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="socketio">
            Socket.IO
            <Badge variant={socketIOStatus === 'connected' ? 'default' : socketIOStatus === 'error' ? 'destructive' : 'secondary'} 
              className="ml-2">
              {socketIOStatus}
            </Badge>
            {usingPolling && socketIOConnected && (
              <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-800 border-yellow-200">
                Polling
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="websocket">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span>WebSocket Connection</span>
                <span className={`ml-2 inline-flex h-3 w-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                  connectionStatus === 'error' ? 'bg-red-500' : 
                  'bg-gray-500'
                }`} />
              </CardTitle>
              <CardDescription>
                Direct WebSocket connection using the native WebSocket API
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  Clear Log
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
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="socketio">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span>Socket.IO Connection</span>
                <span className={`ml-2 inline-flex h-3 w-3 rounded-full ${
                  socketIOStatus === 'connected' ? 'bg-green-500' : 
                  socketIOStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                  socketIOStatus === 'error' ? 'bg-red-500' : 
                  'bg-gray-500'
                }`} />
                {usingPolling && socketIOConnected && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800 border border-yellow-200">
                    Using Polling Fallback
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Socket.IO connection with automatic fallback to HTTP polling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={connectSocketIO}
                  disabled={socketIOConnected}
                  className="px-4 py-2 bg-teal-600 text-white rounded disabled:opacity-50"
                >
                  Connect
                </button>
                
                <button
                  onClick={disconnectSocketIO}
                  disabled={!socketIOConnected}
                  className="px-4 py-2 bg-rose-600 text-white rounded disabled:opacity-50"
                >
                  Disconnect
                </button>
                
                <button
                  onClick={sendSocketIOPing}
                  disabled={!socketIOConnected}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  Send Ping
                </button>
                
                <button
                  onClick={clearSocketIOMessages}
                  className="px-4 py-2 bg-slate-600 text-white rounded"
                >
                  Clear Log
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={socketIOInputMessage}
                    onChange={(e) => setSocketIOInputMessage(e.target.value)}
                    placeholder="Type a message to send..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded"
                  />
                  
                  <button
                    onClick={sendSocketIOMessage}
                    disabled={!socketIOConnected || !socketIOInputMessage.trim()}
                    className="px-4 py-2 bg-teal-600 text-white rounded disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
              
              <div className="border border-slate-300 rounded p-4 h-96 overflow-y-auto bg-slate-50">
                <h2 className="text-lg font-semibold mb-2">Message Log</h2>
                {socketIOMessages.length === 0 ? (
                  <p className="text-slate-500">No messages yet</p>
                ) : (
                  <div className="space-y-2">
                    {socketIOMessages.map((message, index) => (
                      <pre key={index} className="whitespace-pre-wrap bg-white p-2 rounded border border-slate-200 text-sm">
                        {message}
                      </pre>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Connection Testing Guide</h3>
        <ul className="list-disc list-inside space-y-2 text-blue-700">
          <li>The <strong>Native WebSocket</strong> tab demonstrates direct WebSocket connections which may fail in certain environments</li>
          <li>The <strong>Socket.IO</strong> tab shows the more robust approach with automatic fallback to HTTP polling when WebSockets aren't available</li>
          <li>Both provide the same functionality but Socket.IO handles connection failures more gracefully</li>
          <li>Note that Socket.IO will display a "Polling" indicator when it falls back to HTTP long-polling mode</li>
        </ul>
      </div>
    </div>
  );
};

export default WebSocketTest;
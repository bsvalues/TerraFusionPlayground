import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConnectionStatusBadge } from '@/components/connection-status-badge';
import { RobustWebSocketManager, ConnectionState, TransportType, MessagePriority } from '@/services/robust-websocket-manager';

/**
 * Robust WebSocket Test Page
 * 
 * This page demonstrates the enhanced WebSocket manager with improved reliability,
 * reconnection handling, and error recovery capabilities.
 */
export const RobustWebSocketTest: React.FC = () => {
  // WebSocket manager instance
  const wsManagerRef = useRef<RobustWebSocketManager | null>(null);
  
  // State hooks
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transportType, setTransportType] = useState<TransportType>(TransportType.UNKNOWN);
  const [message, setMessage] = useState('');
  const [latency, setLatency] = useState<number>(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [messagesSent, setMessagesSent] = useState(0);
  const [messagesReceived, setMessagesReceived] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<{type: 'sent' | 'received', content: string, timestamp: Date}[]>([]);

  // Initialize WebSocket manager
  useEffect(() => {
    // Create WebSocket manager instance
    wsManagerRef.current = new RobustWebSocketManager({
      url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
      autoReconnect: true,
      maxReconnectAttempts: 10,
      reconnectInterval: 1000,
      fallbackPolling: true,
      debug: true
    });
    
    // Set up event handlers
    const wsManager = wsManagerRef.current;
    
    // Connection state change handler
    wsManager.on('state_change', (data: any) => {
      setConnectionState(data.state);
      setTransportType(data.transportType);
      
      if (data.state === ConnectionState.CONNECTED) {
        setConnected(true);
        setError(null);
      } else if (data.state === ConnectionState.DISCONNECTED || data.state === ConnectionState.ERROR) {
        setConnected(false);
      }
    });
    
    // Error handler
    wsManager.on('error', (error: any) => {
      setError(`Connection error: ${error.message || 'Unknown error'}`);
    });
    
    // Message handler
    wsManager.on('message', (data: any) => {
      try {
        // Handle different message types
        if (typeof data === 'string') {
          try {
            const parsedData = JSON.parse(data);
            addMessage('received', JSON.stringify(parsedData, null, 2));
          } catch {
            addMessage('received', data);
          }
        } else {
          addMessage('received', JSON.stringify(data, null, 2));
        }
        
        // Update stats
        setMessagesReceived(prev => prev + 1);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });
    
    // Pong handler for latency
    wsManager.on('pong', (data: any) => {
      if (data && data.latency) {
        setLatency(data.latency);
      }
    });
    
    // Reconnect handler
    wsManager.on('reconnect', (data: any) => {
      setReconnectAttempts(data.attempt || 0);
    });
    
    // Update stats periodically
    const updateStatsInterval = setInterval(() => {
      if (wsManager) {
        const stats = wsManager.getStats();
        setLatency(stats.averageLatency);
        setMessagesSent(stats.messagesSent);
        setMessagesReceived(stats.messagesReceived);
        setReconnectAttempts(stats.reconnectAttempts);
      }
    }, 1000);
    
    // Clean up on unmount
    return () => {
      clearInterval(updateStatsInterval);
      
      if (wsManager) {
        wsManager.disconnect();
      }
    };
  }, []);
  
  // Add message to the list
  const addMessage = (type: 'sent' | 'received', content: string) => {
    setMessages(prev => [
      ...prev,
      {
        type,
        content,
        timestamp: new Date()
      }
    ].slice(-50)); // Keep only the last 50 messages
  };
  
  // Send message
  const sendMessage = () => {
    if (!message.trim() || !wsManagerRef.current) return;
    
    try {
      // Create message object
      const messageObj = {
        type: 'message',
        content: message,
        timestamp: Date.now()
      };
      
      // Send message
      wsManagerRef.current.send(messageObj, {
        priority: MessagePriority.NORMAL
      });
      
      // Add to messages list
      addMessage('sent', JSON.stringify(messageObj, null, 2));
      
      // Update sent count
      setMessagesSent(prev => prev + 1);
      
      // Clear input
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError(`Failed to send message: ${(error as Error).message}`);
    }
  };
  
  // Connect
  const connect = () => {
    if (wsManagerRef.current) {
      wsManagerRef.current.connect();
    }
  };
  
  // Disconnect
  const disconnect = () => {
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
    }
  };
  
  // Send ping
  const sendPing = () => {
    if (wsManagerRef.current) {
      const pingMessage = {
        type: 'ping',
        timestamp: Date.now()
      };
      
      wsManagerRef.current.send(pingMessage);
      addMessage('sent', JSON.stringify(pingMessage, null, 2));
    }
  };
  
  // Get badge color based on connection state
  const getBadgeVariant = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'default';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'secondary';
      case ConnectionState.USING_FALLBACK:
        return 'warning';
      case ConnectionState.ERROR:
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Robust WebSocket Test</h1>
        <p className="text-gray-500 mb-4">
          Testing enhanced WebSocket communication with improved reliability and error handling
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                WebSocket Controls
                <Badge className="ml-auto" variant={getBadgeVariant()}>
                  {connectionState}
                </Badge>
              </CardTitle>
              <CardDescription>
                Connect and send messages to the WebSocket server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Button 
                    onClick={connect}
                    disabled={connected || connectionState === ConnectionState.CONNECTING}
                    className="w-full"
                  >
                    Connect
                  </Button>
                  <Button 
                    onClick={disconnect}
                    disabled={!connected}
                    variant="destructive"
                    className="w-full"
                  >
                    Disconnect
                  </Button>
                </div>
                
                <Separator className="my-2" />
                
                <div className="flex space-x-2">
                  <Input 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={!connected}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') sendMessage();
                    }}
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!connected || !message.trim()}
                    variant="secondary"
                  >
                    Send
                  </Button>
                </div>
                
                <div className="flex space-x-2 mt-2">
                  <Button 
                    onClick={sendPing}
                    disabled={!connected}
                    variant="outline"
                    className="w-full"
                  >
                    Send Ping
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-gray-500 mt-4 space-y-1">
                <p><span className="font-semibold">Status:</span> {connectionState}</p>
                <p><span className="font-semibold">Transport:</span> {transportType}</p>
                <p><span className="font-semibold">Latency:</span> {latency > 0 ? `${latency}ms` : 'N/A'}</p>
                <p><span className="font-semibold">Reconnect Attempts:</span> {reconnectAttempts}</p>
                <p><span className="font-semibold">Messages Sent:</span> {messagesSent}</p>
                <p><span className="font-semibold">Messages Received:</span> {messagesReceived}</p>
              </div>
              
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Messages */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-xl">WebSocket Messages</CardTitle>
              <CardDescription>
                Real-time messages between client and server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] overflow-y-auto border rounded-md p-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No messages yet. Connect to the WebSocket server and send a message.
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`my-2 p-3 rounded-md ${
                        msg.type === 'sent' 
                          ? 'bg-blue-50 ml-12 border-l-4 border-blue-400' 
                          : 'bg-gray-100 mr-12 border-l-4 border-gray-400'
                      }`}
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {msg.timestamp.toLocaleTimeString()} - {msg.type === 'sent' ? 'Sent' : 'Received'}
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words font-mono">
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RobustWebSocketTest;
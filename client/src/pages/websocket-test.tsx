import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ConnectionStatusBadge } from '@/components/connection-status-badge';
import { ConnectionHealthMetrics } from '@/components/connection-health-metrics';
import { ConnectionStatus, TransportType } from '@/components/connection-status-badge';
import { useAgentWebSocket } from '@/hooks/use-agent-websocket';
import { useAgentSocketIO } from '@/hooks/use-agent-socketio';

/**
 * WebSocket Test Page
 * 
 * This page provides a way to test WebSocket connections with both
 * native WebSockets and Socket.IO. It includes controls for both 
 * connection types, and displays status, messages, and metrics.
 */
export const WebSocketTest: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('websocket');
  
  // Message state
  const [wsMessage, setWsMessage] = useState('');
  const [socketioMessage, setSocketioMessage] = useState('');
  const [receivedMessages, setReceivedMessages] = useState<{
    time: Date, 
    content: string, 
    type: 'received' | 'sent',
    connectionType: 'websocket' | 'socketio'
  }[]>([]);
  
  // Setup WebSocket connection using our hook
  const { 
    status: wsStatus,
    transport: wsTransport,
    metrics: wsMetrics,
    send: wsSend,
    reconnect: wsReconnect,
    close: wsClose
  } = useAgentWebSocket({
    autoReconnect: true,
    maxReconnectAttempts: 5,
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Add message to received messages
        addMessage({
          time: new Date(),
          content: JSON.stringify(data, null, 2),
          type: 'received',
          connectionType: 'websocket'
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        
        // Still add raw message to list
        addMessage({
          time: new Date(),
          content: typeof event.data === 'string' ? event.data : 'Binary data received',
          type: 'received',
          connectionType: 'websocket'
        });
      }
    }
  });
  
  // Setup Socket.IO connection using our hook
  const { 
    status: socketioStatus,
    transport: socketioTransport,
    metrics: socketioMetrics,
    send: socketioSend,
    reconnect: socketioReconnect,
    close: socketioClose
  } = useAgentSocketIO({
    url: `${window.location.origin}/socket.io`,
    autoReconnect: true,
    events: [
      {
        name: 'message',
        handler: (data) => {
          addMessage({
            time: new Date(),
            content: JSON.stringify(data, null, 2),
            type: 'received',
            connectionType: 'socketio'
          });
        }
      },
      {
        name: 'pong',
        handler: (data) => {
          addMessage({
            time: new Date(),
            content: JSON.stringify(data, null, 2),
            type: 'received',
            connectionType: 'socketio'
          });
        }
      }
    ]
  });
  
  // Send WebSocket message
  const sendWebSocketMessage = () => {
    if (!wsMessage.trim()) return;
    
    const messageObj = {
      type: 'message',
      content: wsMessage,
      timestamp: Date.now()
    };
    
    const success = wsSend(messageObj);
    
    if (success) {
      // Add sent message to the list
      addMessage({
        time: new Date(),
        content: JSON.stringify(messageObj, null, 2),
        type: 'sent',
        connectionType: 'websocket'
      });
      
      // Clear input
      setWsMessage('');
    }
  };
  
  // Send Socket.IO message
  const sendSocketIOMessage = () => {
    if (!socketioMessage.trim()) return;
    
    const messageObj = {
      content: socketioMessage,
      timestamp: Date.now()
    };
    
    const success = socketioSend('message', messageObj);
    
    if (success) {
      // Add sent message to the list
      addMessage({
        time: new Date(),
        content: JSON.stringify(messageObj, null, 2),
        type: 'sent',
        connectionType: 'socketio'
      });
      
      // Clear input
      setSocketioMessage('');
    }
  };
  
  // Add message to the list
  const addMessage = (message: {
    time: Date, 
    content: string, 
    type: 'received' | 'sent',
    connectionType: 'websocket' | 'socketio'
  }) => {
    setReceivedMessages(prev => [...prev, message].slice(-50)); // Keep last 50 messages
  };
  
  // Filter messages by connection type
  const filteredMessages = receivedMessages.filter(
    message => message.connectionType === activeTab
  );
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Connection Testing</h1>
        <p className="text-gray-500 mb-4">
          This page allows you to test different connection types and view real-time connection information.
        </p>
        
        <Tabs defaultValue="websocket" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="websocket" className="flex items-center justify-center">
              WebSocket
              <Badge variant={wsStatus === 'connected' ? 'default' : 'secondary'} className="ml-2">
                {wsStatus === 'connected' ? 'Connected' : wsStatus}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="socketio" className="flex items-center justify-center">
              Socket.IO
              <Badge variant={socketioStatus === 'connected' ? 'default' : 'secondary'} className="ml-2">
                {socketioStatus === 'connected' ? 'Connected' : socketioStatus}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="websocket" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column - Controls */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      WebSocket Controls
                      <ConnectionStatusBadge 
                        status={wsStatus} 
                        transport={wsTransport} 
                        className="ml-auto"
                      />
                    </CardTitle>
                    <CardDescription>
                      Connect and send messages to the WebSocket server
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <Button 
                          onClick={wsReconnect}
                          disabled={wsStatus === 'connected' || wsStatus === 'connecting'}
                          className="w-full"
                        >
                          Connect
                        </Button>
                        <Button 
                          onClick={wsClose}
                          disabled={wsStatus !== 'connected'}
                          variant="destructive"
                          className="w-full"
                        >
                          Disconnect
                        </Button>
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="flex space-x-2">
                        <Input 
                          value={wsMessage}
                          onChange={(e) => setWsMessage(e.target.value)}
                          placeholder="Type a message..."
                          disabled={wsStatus !== 'connected'}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') sendWebSocketMessage();
                          }}
                        />
                        <Button 
                          onClick={sendWebSocketMessage}
                          disabled={wsStatus !== 'connected' || !wsMessage.trim()}
                          variant="secondary"
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 mt-2">
                      <p>Status: {wsStatus}</p>
                      <p>Transport: {wsTransport}</p>
                      <p>Messages: {wsMetrics.messageCount}</p>
                      <p>Latency: {wsMetrics.latency > 0 ? `${wsMetrics.latency}ms` : 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <ConnectionHealthMetrics 
                  status={wsStatus}
                  metrics={wsMetrics}
                />
              </div>
              
              {/* Middle and right columns - Message log */}
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
                      {filteredMessages.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                          No messages yet. Connect to the WebSocket server and send a message.
                        </div>
                      ) : (
                        filteredMessages.map((message, index) => (
                          <div 
                            key={index} 
                            className={`my-2 p-3 rounded-md ${
                              message.type === 'sent' 
                                ? 'bg-blue-50 ml-12 border-l-4 border-blue-400' 
                                : 'bg-gray-100 mr-12 border-l-4 border-gray-400'
                            }`}
                          >
                            <div className="text-xs text-gray-500 mb-1">
                              {message.time.toLocaleTimeString()} - {message.type === 'sent' ? 'Sent' : 'Received'}
                            </div>
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="socketio" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column - Controls */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      Socket.IO Controls
                      <ConnectionStatusBadge 
                        status={socketioStatus} 
                        transport={socketioTransport} 
                        className="ml-auto"
                      />
                    </CardTitle>
                    <CardDescription>
                      Connect and send messages to the Socket.IO server
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <Button 
                          onClick={socketioReconnect}
                          disabled={socketioStatus === 'connected' || socketioStatus === 'connecting'}
                          className="w-full"
                        >
                          Connect
                        </Button>
                        <Button 
                          onClick={socketioClose}
                          disabled={socketioStatus !== 'connected'}
                          variant="destructive"
                          className="w-full"
                        >
                          Disconnect
                        </Button>
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="flex space-x-2">
                        <Input 
                          value={socketioMessage}
                          onChange={(e) => setSocketioMessage(e.target.value)}
                          placeholder="Type a message..."
                          disabled={socketioStatus !== 'connected'}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') sendSocketIOMessage();
                          }}
                        />
                        <Button 
                          onClick={sendSocketIOMessage}
                          disabled={socketioStatus !== 'connected' || !socketioMessage.trim()}
                          variant="secondary"
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 mt-2">
                      <p>Status: {socketioStatus}</p>
                      <p>Transport: {socketioTransport}</p>
                      <p>Messages: {socketioMetrics.messageCount}</p>
                      <p>Latency: {socketioMetrics.latency > 0 ? `${socketioMetrics.latency}ms` : 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <ConnectionHealthMetrics 
                  status={socketioStatus}
                  metrics={socketioMetrics}
                />
              </div>
              
              {/* Middle and right columns - Message log */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-xl">Socket.IO Messages</CardTitle>
                    <CardDescription>
                      Real-time messages between client and server
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[500px] overflow-y-auto border rounded-md p-4 bg-gray-50">
                      {filteredMessages.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                          No messages yet. Connect to the Socket.IO server and send a message.
                        </div>
                      ) : (
                        filteredMessages.map((message, index) => (
                          <div 
                            key={index} 
                            className={`my-2 p-3 rounded-md ${
                              message.type === 'sent' 
                                ? 'bg-blue-50 ml-12 border-l-4 border-blue-400' 
                                : 'bg-gray-100 mr-12 border-l-4 border-gray-400'
                            }`}
                          >
                            <div className="text-xs text-gray-500 mb-1">
                              {message.time.toLocaleTimeString()} - {message.type === 'sent' ? 'Sent' : 'Received'}
                            </div>
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WebSocketTest;
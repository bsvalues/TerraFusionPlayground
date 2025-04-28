import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ConnectionStatusBadge } from '@/components/connection-status-badge';
import { ConnectionHealthMetrics } from '@/components/connection-health-metrics';
import { ConnectionStatus, TransportType } from '@/components/connection-status-badge';

/**
 * WebSocket Test Page
 * 
 * This page provides a way to test WebSocket connections with both
 * native WebSockets and Socket.IO. It includes controls for both 
 * connection types, and displays status, messages, and metrics.
 */
export const WebSocketTest: React.FC = () => {
  // State for WebSocket
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>('disconnected');
  const [wsTransport] = useState<TransportType>('websocket');
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [wsMessage, setWsMessage] = useState('');
  const [receivedMessages, setReceivedMessages] = useState<{time: Date, content: string, type: 'received' | 'sent'}[]>([]);
  
  // WebSocket metrics
  const [wsMetrics, setWsMetrics] = useState({
    latency: 0,
    uptime: 0,
    messageCount: 0,
    reconnectCount: 0,
    lastMessageTime: null as Date | null,
    failedAttempts: 0,
    transportType: 'websocket' as TransportType
  });
  
  // Connect to WebSocket
  const connectWebSocket = () => {
    try {
      setWsStatus('connecting');
      
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Attempting to connect to WebSocket server at ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        setWsStatus('connected');
        setWsConnection(ws);
        
        // Update metrics
        setWsMetrics(prev => ({
          ...prev,
          uptime: 100,
          reconnectCount: prev.reconnectCount,
          failedAttempts: 0
        }));
        
        // Send initial ping to measure latency
        sendPing(ws);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // Handle ping response for latency calculation
          if (data.type === 'pong' && data.originalTimestamp) {
            const latency = Date.now() - data.originalTimestamp;
            setWsMetrics(prev => ({
              ...prev,
              latency,
              messageCount: prev.messageCount + 1,
              lastMessageTime: new Date()
            }));
          }
          
          // Add message to received messages
          addMessage({
            time: new Date(),
            content: JSON.stringify(data),
            type: 'received'
          });
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
          
          // Still add raw message to list
          addMessage({
            time: new Date(),
            content: typeof event.data === 'string' ? event.data : 'Binary data received',
            type: 'received'
          });
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsStatus('error');
        
        // Update metrics
        setWsMetrics(prev => ({
          ...prev,
          uptime: 0,
          failedAttempts: prev.failedAttempts + 1
        }));
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setWsStatus('disconnected');
        setWsConnection(null);
        
        // Update metrics
        setWsMetrics(prev => ({
          ...prev,
          uptime: 0
        }));
      };
      
      return ws;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setWsStatus('error');
      
      // Update metrics
      setWsMetrics(prev => ({
        ...prev,
        uptime: 0,
        failedAttempts: prev.failedAttempts + 1
      }));
      
      return null;
    }
  };
  
  // Disconnect WebSocket
  const disconnectWebSocket = () => {
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
      setWsStatus('disconnected');
    }
  };
  
  // Send a message via WebSocket
  const sendWebSocketMessage = () => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }
    
    if (!wsMessage.trim()) return;
    
    const messageObj = {
      type: 'message',
      content: wsMessage,
      timestamp: Date.now()
    };
    
    wsConnection.send(JSON.stringify(messageObj));
    
    // Add sent message to the list
    addMessage({
      time: new Date(),
      content: JSON.stringify(messageObj),
      type: 'sent'
    });
    
    // Update metrics
    setWsMetrics(prev => ({
      ...prev,
      messageCount: prev.messageCount + 1
    }));
    
    // Clear input
    setWsMessage('');
  };
  
  // Send ping to measure latency
  const sendPing = (ws: WebSocket) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    const ping = {
      type: 'ping',
      timestamp: Date.now()
    };
    
    ws.send(JSON.stringify(ping));
  };
  
  // Add message to the list
  const addMessage = (message: {time: Date, content: string, type: 'received' | 'sent'}) => {
    setReceivedMessages(prev => [...prev, message].slice(-50)); // Keep last 50 messages
  };
  
  // Ping every 30 seconds to update latency
  useEffect(() => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) return;
    
    const intervalId = setInterval(() => {
      sendPing(wsConnection);
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [wsConnection]);
  
  // Return active status
  const getActiveStatus = (): ConnectionStatus => {
    return wsStatus;
  };
  
  // Return active transport
  const getActiveTransport = (): TransportType => {
    return wsTransport;
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">WebSocket Testing</h1>
        <p className="text-gray-500">
          This page allows you to test WebSocket connections and view real-time connection information.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                Connection Controls
                <ConnectionStatusBadge 
                  status={getActiveStatus()} 
                  transport={getActiveTransport()} 
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
                    onClick={connectWebSocket}
                    disabled={wsStatus === 'connected' || wsStatus === 'connecting'}
                    className="w-full"
                  >
                    Connect
                  </Button>
                  <Button 
                    onClick={disconnectWebSocket}
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
        
        {/* Middle and right columns - Message log and additional info */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-xl">Message Log</CardTitle>
              <CardDescription>
                Real-time messages between client and server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] overflow-y-auto border rounded-md p-4 bg-gray-50">
                {receivedMessages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No messages yet. Connect to the WebSocket server and send a message.
                  </div>
                ) : (
                  receivedMessages.map((message, index) => (
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
    </div>
  );
};

export default WebSocketTest;
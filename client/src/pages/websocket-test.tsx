import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoIcon, AlertTriangle, RefreshCw, Send } from "lucide-react";
import ConnectionStatusBadge from "@/components/connection-status-badge";
import ConnectionHealthMetrics from "@/components/connection-health-metrics";
import ConnectionNotification from "@/components/connection-notification";
import { useAgentWebSocket } from "@/hooks/use-agent-websocket";
import { useAgentSocketIO } from "@/hooks/use-agent-socketio";
import { ConnectionStatus, TransportType } from "@/components/connection-status-badge";

/**
 * WebSocket Test Page
 * 
 * This page provides a way to test WebSocket connections with both
 * native WebSockets and Socket.IO. It includes controls for both 
 * connection types, and displays status, messages, and metrics.
 */
const WebSocketTestPage: React.FC = () => {
  // Common state
  const [activeTab, setActiveTab] = useState("websocket");
  const [serverUrl, setServerUrl] = useState(window.location.origin);
  const [socketIoPath, setSocketIoPath] = useState("/socket.io");
  const [messageInput, setMessageInput] = useState("");
  const [receivedMessages, setReceivedMessages] = useState<{time: Date, content: string, type: 'received' | 'sent'}[]>([]);
  
  // WebSocket state
  const [wsPath, setWsPath] = useState("/ws");
  
  // Socket.IO state
  const [namespace, setNamespace] = useState("/");
  const [event, setEvent] = useState("message");
  
  // WebSocket connection
  const wsUrl = `${serverUrl.replace(/^http/, 'ws')}${wsPath}`;
  const { 
    status: wsStatus, 
    socket: wsSocket, 
    sendMessage: wsSendMessage,
    reconnect: wsReconnect,
    metrics: wsMetrics,
    transport: wsTransport
  } = useAgentWebSocket({
    url: wsUrl,
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        addMessage({
          time: new Date(),
          content: JSON.stringify(data, null, 2),
          type: 'received'
        });
      } catch (e) {
        // If it's not JSON, display as plain text
        addMessage({
          time: new Date(),
          content: event.data,
          type: 'received'
        });
      }
    }
  });
  
  // Socket.IO connection
  const { 
    status: socketIoStatus, 
    socket: socketIoSocket,
    emit: socketIoEmit,
    reconnect: socketIoReconnect,
    metrics: socketIoMetrics,
    transport: socketIoTransport
  } = useAgentSocketIO({
    url: serverUrl,
    path: socketIoPath,
    namespace,
    events: [
      { 
        name: 'message', 
        handler: (data) => {
          addMessage({
            time: new Date(),
            content: typeof data === 'object' ? JSON.stringify(data, null, 2) : data.toString(),
            type: 'received'
          });
        }
      }
    ]
  });
  
  // Helper to add a message to the list
  const addMessage = (message: {time: Date, content: string, type: 'received' | 'sent'}) => {
    setReceivedMessages(prev => [...prev, message].slice(-100)); // Keep only latest 100 messages
  };
  
  // Send message via WebSocket
  const handleSendWsMessage = () => {
    if (wsSocket && messageInput.trim()) {
      try {
        // Try to parse as JSON, but send as string if it fails
        const jsonMessage = JSON.parse(messageInput);
        wsSendMessage(JSON.stringify(jsonMessage));
        addMessage({
          time: new Date(),
          content: JSON.stringify(jsonMessage, null, 2),
          type: 'sent'
        });
      } catch (e) {
        // Send as plain text
        wsSendMessage(messageInput);
        addMessage({
          time: new Date(),
          content: messageInput,
          type: 'sent'
        });
      }
      setMessageInput("");
    }
  };
  
  // Send message via Socket.IO
  const handleSendSocketIoMessage = () => {
    if (socketIoSocket && messageInput.trim()) {
      try {
        // Try to parse as JSON
        const jsonMessage = JSON.parse(messageInput);
        socketIoEmit(event, jsonMessage);
        addMessage({
          time: new Date(),
          content: `${event}: ${JSON.stringify(jsonMessage, null, 2)}`,
          type: 'sent'
        });
      } catch (e) {
        // Send as plain text
        socketIoEmit(event, messageInput);
        addMessage({
          time: new Date(),
          content: `${event}: ${messageInput}`,
          type: 'sent'
        });
      }
      setMessageInput("");
    }
  };
  
  // Get the active status and transport based on tab
  const getActiveStatus = (): ConnectionStatus => {
    return activeTab === "websocket" ? wsStatus : socketIoStatus;
  };
  
  const getActiveTransport = (): TransportType => {
    return activeTab === "websocket" ? wsTransport : socketIoTransport;
  };
  
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">WebSocket Connection Test</h1>
      
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Connection Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Connection Settings</CardTitle>
              <CardDescription>Configure your WebSocket or Socket.IO connection</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="websocket" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="websocket">
                    WebSocket
                    <ConnectionStatusBadge 
                      status={wsStatus} 
                      transport={wsTransport}
                      showText={false}
                      size="sm"
                      className="ml-2"
                    />
                  </TabsTrigger>
                  <TabsTrigger value="socketio">
                    Socket.IO
                    <ConnectionStatusBadge 
                      status={socketIoStatus} 
                      transport={socketIoTransport}
                      showText={false}
                      size="sm"
                      className="ml-2"
                    />
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="websocket" className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Server URL</label>
                      <Input 
                        value={serverUrl} 
                        onChange={(e) => setServerUrl(e.target.value)} 
                        placeholder="Server URL (e.g. http://localhost:3000)"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Will be converted to WebSocket URL (ws:// or wss://)
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-1 block">WebSocket Path</label>
                      <Input 
                        value={wsPath} 
                        onChange={(e) => setWsPath(e.target.value)} 
                        placeholder="WebSocket path (e.g. /ws)"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">Connection Status: </span>
                        <ConnectionStatusBadge status={wsStatus} transport={wsTransport} />
                      </div>
                      <Button 
                        onClick={wsReconnect}
                        disabled={wsStatus === 'connected'}
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reconnect
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="socketio" className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Server URL</label>
                      <Input 
                        value={serverUrl} 
                        onChange={(e) => setServerUrl(e.target.value)} 
                        placeholder="Server URL (e.g. http://localhost:3000)"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Socket.IO Path</label>
                        <Input 
                          value={socketIoPath} 
                          onChange={(e) => setSocketIoPath(e.target.value)} 
                          placeholder="Socket.IO path (e.g. /socket.io)"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1 block">Namespace</label>
                        <Input 
                          value={namespace} 
                          onChange={(e) => setNamespace(e.target.value)} 
                          placeholder="Namespace (e.g. /)"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-1 block">Event Name</label>
                      <Input 
                        value={event} 
                        onChange={(e) => setEvent(e.target.value)} 
                        placeholder="Event name (e.g. message)"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">Connection Status: </span>
                        <ConnectionStatusBadge status={socketIoStatus} transport={socketIoTransport} />
                      </div>
                      <Button 
                        onClick={socketIoReconnect}
                        disabled={socketIoStatus === 'connected'}
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reconnect
                      </Button>
                    </div>
                    
                    {socketIoTransport === 'polling' && (
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Using HTTP Polling</AlertTitle>
                        <AlertDescription>
                          Socket.IO is currently using HTTP long polling instead of WebSockets. 
                          This may impact performance for real-time communication.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Message Exchange */}
          <Card>
            <CardHeader>
              <CardTitle>Message Exchange</CardTitle>
              <CardDescription>Send and receive messages through the active connection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Message</label>
                <Textarea 
                  value={messageInput} 
                  onChange={(e) => setMessageInput(e.target.value)} 
                  placeholder={`Enter message (plain text or JSON) to send via ${activeTab === "websocket" ? "WebSocket" : "Socket.IO"}`}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={activeTab === "websocket" ? handleSendWsMessage : handleSendSocketIoMessage}
                  disabled={(activeTab === "websocket" && wsStatus !== 'connected') || 
                            (activeTab === "socketio" && socketIoStatus !== 'connected') ||
                            !messageInput.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Messages</label>
                <Card className="border border-gray-200">
                  <ScrollArea className="h-[300px] w-full rounded-md">
                    <div className="p-4 space-y-3">
                      {receivedMessages.length === 0 ? (
                        <div className="text-center text-muted-foreground p-4">
                          <InfoIcon className="h-5 w-5 mx-auto mb-2" />
                          <p>No messages yet. Connect and send a message to start.</p>
                        </div>
                      ) : (
                        receivedMessages.map((msg, i) => (
                          <div key={i} className={`p-3 rounded-md ${msg.type === 'received' ? 'bg-gray-50' : 'bg-blue-50'}`}>
                            <div className="flex justify-between mb-1">
                              <Badge variant={msg.type === 'received' ? 'outline' : 'default'}>
                                {msg.type === 'received' ? 'Received' : 'Sent'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {msg.time.toLocaleTimeString()}
                              </span>
                            </div>
                            <pre className="text-xs whitespace-pre-wrap overflow-auto">{msg.content}</pre>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Connection Metrics */}
        <div className="space-y-6">
          <ConnectionHealthMetrics 
            status={getActiveStatus()} 
            metrics={activeTab === "websocket" ? wsMetrics : socketIoMetrics}
            title={`${activeTab === "websocket" ? "WebSocket" : "Socket.IO"} Health`}
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Connection Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">WebSocket Testing</h3>
                <p className="text-sm text-muted-foreground">
                  Test native WebSocket connections with automatic reconnection, metrics, and message exchange.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Socket.IO Testing</h3>
                <p className="text-sm text-muted-foreground">
                  Test Socket.IO connections with automatic fallback to HTTP long polling if WebSockets are unavailable.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Connection States</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <ConnectionStatusBadge status="connected" />
                    <p className="text-xs text-muted-foreground mt-1">Successfully connected</p>
                  </div>
                  <div>
                    <ConnectionStatusBadge status="connecting" />
                    <p className="text-xs text-muted-foreground mt-1">Connection in progress</p>
                  </div>
                  <div>
                    <ConnectionStatusBadge status="disconnected" />
                    <p className="text-xs text-muted-foreground mt-1">Not connected</p>
                  </div>
                  <div>
                    <ConnectionStatusBadge status="error" />
                    <p className="text-xs text-muted-foreground mt-1">Connection failed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <ConnectionNotification 
        status={getActiveStatus()}
        transport={getActiveTransport()}
        reconnectCount={activeTab === "websocket" ? wsMetrics.reconnectCount : socketIoMetrics.reconnectCount}
        onReconnect={activeTab === "websocket" ? wsReconnect : socketIoReconnect}
      />
    </div>
  );
};

export default WebSocketTestPage;
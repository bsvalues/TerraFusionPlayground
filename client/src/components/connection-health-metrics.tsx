/**
 * Connection Health Metrics Component
 * 
 * This component displays connection health metrics for the agent system.
 * It shows information about connection status, fallback activations,
 * reconnect attempts, and errors to help with monitoring and debugging.
 */

import React from 'react';
import { useAgentSocketIO } from '@/hooks/use-agent-socketio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Server, 
  ShieldAlert, 
  Wifi, 
  WifiOff 
} from 'lucide-react';

export function ConnectionHealthMetrics({ className = '' }: { className?: string }) {
  const { connectionMetrics, connectionStatus, isPolling } = useAgentSocketIO();
  
  // Format a timestamp to a readable date/time
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  // Format milliseconds to a readable duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };
  
  // If no metrics exist yet
  if (!connectionMetrics) {
    return (
      <Card className={`${className} bg-slate-50 dark:bg-slate-900`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Connection Monitoring</CardTitle>
          <CardDescription>
            Collecting metrics...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className={`${className} bg-slate-50 dark:bg-slate-900`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Connection Health Metrics</CardTitle>
          <Badge variant={isPolling ? "secondary" : "default"}>
            {isPolling ? "Fallback Mode" : "WebSocket Mode"}
          </Badge>
        </div>
        <CardDescription>
          Real-time connection monitoring and diagnostics
        </CardDescription>
      </CardHeader>
      <CardContent className="text-xs">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Reconnect Attempts:</span>
              <span className="font-medium">{connectionMetrics.totalReconnectAttempts}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">Fallback Activations:</span>
              <span className="font-medium">{connectionMetrics.totalFallbackActivations}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Avg. Reconnect Time:</span>
              <span className="font-medium">
                {connectionMetrics.averageReconnectTime > 0
                  ? formatDuration(connectionMetrics.averageReconnectTime)
                  : 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-muted-foreground">Error Count:</span>
              <span className="font-medium">{connectionMetrics.totalErrors}</span>
            </div>
          </div>
          
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              <span className="text-muted-foreground">Last Status Change:</span>
              <span className="font-medium">
                {formatTimestamp(connectionMetrics.lastStatusChange)}
              </span>
            </div>
          </div>
          
          {connectionMetrics.connectionEvents.length > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center mb-1">
                <Server className="h-4 w-4 text-violet-500 mr-2" />
                <span className="text-muted-foreground">Recent Events:</span>
              </div>
              <div className="max-h-24 overflow-y-auto text-2xs pl-6 space-y-1">
                {connectionMetrics.connectionEvents.slice(0, 5).map((event, i) => (
                  <div key={i} className="flex items-start">
                    <span className="text-xs opacity-60 mr-1">•</span>
                    <span className="opacity-70">{formatTimestamp(event.timestamp)}</span>
                    <span className="mx-1">-</span>
                    <span className={`font-medium ${getEventTypeColor(event.type)}`}>
                      {formatEventType(event.type)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to get color for event type
function getEventTypeColor(type: string): string {
  switch (type) {
    case 'status_change':
      return 'text-blue-600 dark:text-blue-400';
    case 'fallback_activated':
      return 'text-amber-600 dark:text-amber-400';
    case 'fallback_deactivated':
      return 'text-green-600 dark:text-green-400';
    case 'reconnect_attempt':
      return 'text-indigo-600 dark:text-indigo-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

// Helper to format event type for display
function formatEventType(type: string): string {
  switch (type) {
    case 'status_change':
      return 'Status Change';
    case 'fallback_activated':
      return 'Fallback Activated';
    case 'fallback_deactivated':
      return 'Fallback Deactivated';
    case 'reconnect_attempt':
      return 'Reconnect Attempt';
    case 'error':
      return 'Error';
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}
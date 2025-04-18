/**
 * Hook for tracking AI agent activity
 * 
 * Provides real-time information about active AI agents and their current tasks.
 * Uses WebSocket for live updates and fallbacks to polling for older browsers.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';
import { AITask } from '@/components/ui/ai-pulse-indicator';

export interface AgentActivity {
  activeAgents: string[];
  currentTasks: string[];
  recentTasks: AITask[];
  allTasks: AITask[];
  loading: boolean;
  error: Error | null;
  refreshTasks: () => Promise<void>;
}

export function useAgentActivity(): AgentActivity {
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [currentTasks, setCurrentTasks] = useState<string[]>([]);
  const [allTasks, setAllTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  
  // Function to fetch agent tasks
  const fetchAgentTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would fetch from the API
      // For now, use placeholder data
      const response = await fetch('/api/agent-tasks');
      
      if (!response.ok) {
        throw new Error('Failed to fetch agent tasks');
      }
      
      const data = await response.json();
      setAllTasks(data);
      
      // Extract active agents and current tasks
      const running = data.filter((task: AITask) => task.status === 'running');
      setActiveAgents([...new Set(running.map((task: AITask) => task.agentName))]);
      setCurrentTasks(running.map((task: AITask) => task.taskName));
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching agent tasks:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, []);
  
  // Function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      // Only connect if browser supports WebSockets
      if (typeof WebSocket === 'undefined') {
        console.warn('WebSocket not supported, falling back to polling');
        return;
      }
      
      // Close existing connection if any
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      
      // Determine WebSocket URL (use same host but ws/wss protocol)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/agent-activity`;
      
      // Create new WebSocket connection
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Agent activity WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'activity_update') {
            // Update active agents and tasks
            setActiveAgents(data.activeAgents || []);
            setCurrentTasks(data.currentTasks || []);
          } else if (data.type === 'task_update') {
            // Update a specific task
            setAllTasks(prev => {
              // Find and update the task if it exists
              const exists = prev.some(task => task.id === data.task.id);
              
              if (exists) {
                return prev.map(task => 
                  task.id === data.task.id ? data.task : task
                );
              } else {
                // Add the new task
                return [data.task, ...prev];
              }
            });
            
            // Show notification for new tasks if needed
            if (data.task.status === 'running' && data.isNew) {
              toast({
                title: "New AI Task",
                description: `${data.task.agentName} started: ${data.task.taskName}`,
                variant: "default",
              });
            }
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Lost connection to AI agents. Retrying...",
          variant: "destructive",
        });
      };
      
      ws.onclose = () => {
        console.log('Agent activity WebSocket closed');
        // Attempt to reconnect after a delay
        setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Error setting up WebSocket:', err);
    }
  }, [toast]);
  
  // Refresh tasks manually
  const refreshTasks = useCallback(async () => {
    await fetchAgentTasks();
  }, [fetchAgentTasks]);
  
  // Initial fetch and WebSocket setup
  useEffect(() => {
    // Fetch initial data
    fetchAgentTasks();
    
    // Set up WebSocket connection
    connectWebSocket();
    
    // Fallback polling for browsers without WebSocket or if WebSocket fails
    const pollingInterval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchAgentTasks();
      }
    }, 10000); // Poll every 10 seconds if WebSocket is not available
    
    // Cleanup on unmount
    return () => {
      clearInterval(pollingInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchAgentTasks, connectWebSocket]);
  
  // Filter recent tasks (completed tasks from the last hour)
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  const recentTasks = allTasks
    .filter(task => task.status !== 'running' && new Date(task.startTime) > oneHourAgo)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  
  return {
    activeAgents,
    currentTasks,
    recentTasks,
    allTasks,
    loading,
    error,
    refreshTasks
  };
}
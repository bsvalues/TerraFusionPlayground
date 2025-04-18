/**
 * AI Pulse Indicator
 * 
 * A component that shows a visual indicator when AI agents are actively
 * working on tasks. Provides transparency into backend AI processing.
 */

import React, { useState, useEffect } from 'react';
import { Brain, Activity, X } from 'lucide-react';
import { Button } from './button';
import { useToast } from '@/hooks/use-toast';

export interface AITask {
  id: string;
  agentName: string;
  taskName: string;
  startTime: Date;
  status: 'running' | 'complete' | 'error';
  progress?: number; // 0-100
  detail?: string;
}

export interface AIPulseIndicatorProps {
  tasks?: AITask[];
  className?: string;
  expanded?: boolean;
  maxDisplayedTasks?: number;
  variant?: 'default' | 'subtle' | 'minimal';
  onViewAllTasks?: () => void;
}

export function AIPulseIndicator({
  tasks = [],
  className = '',
  expanded: initialExpanded = false,
  maxDisplayedTasks = 3,
  variant = 'default',
  onViewAllTasks
}: AIPulseIndicatorProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [pulseSize, setPulseSize] = useState(1);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Pulse effect when agents are working
  useEffect(() => {
    if (tasks.length > 0 && tasks.some(task => task.status === 'running')) {
      const interval = setInterval(() => {
        setPulseSize(size => size === 1 ? 1.2 : 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setPulseSize(1);
    }
  }, [tasks]);
  
  // Collapse after 5 seconds of inactivity if no running tasks
  useEffect(() => {
    if (expanded && tasks.every(task => task.status !== 'running')) {
      const timeout = setTimeout(() => {
        setExpanded(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [expanded, tasks]);
  
  // Show toast on task completion
  useEffect(() => {
    const completedTask = tasks.find(task => task.status === 'complete' && !task.notified);
    if (completedTask) {
      toast({
        title: "AI Task Complete",
        description: `${completedTask.agentName} completed: ${completedTask.taskName}`,
        variant: "default",
      });
      
      // Mark as notified (this is mock implementation, real app would track this on the server)
      completedTask.notified = true;
    }
    
    const errorTask = tasks.find(task => task.status === 'error' && !task.notified);
    if (errorTask) {
      toast({
        title: "AI Task Error",
        description: `${errorTask.agentName} encountered an error: ${errorTask.taskName}`,
        variant: "destructive",
      });
      
      // Mark as notified
      errorTask.notified = true;
    }
  }, [tasks, toast]);
  
  const activeTasks = tasks.filter(task => task.status === 'running');
  const recentTasks = tasks.filter(task => task.status !== 'running').slice(0, maxDisplayedTasks);
  const displayedTasks = [...activeTasks, ...recentTasks].slice(0, maxDisplayedTasks);
  const totalTasks = tasks.length;
  const hiddenTasks = Math.max(0, totalTasks - maxDisplayedTasks);
  
  // Determine appropriate status icon and color
  const getStatusIcon = (status: AITask['status']) => {
    switch (status) {
      case 'running':
        return <Activity className="h-3 w-3 text-blue-500 animate-pulse" />;
      case 'complete':
        return <div className="h-3 w-3 rounded-full bg-green-500" />;
      case 'error':
        return <div className="h-3 w-3 rounded-full bg-red-500" />;
      default:
        return null;
    }
  };
  
  if (variant === 'minimal') {
    return (
      <div 
        className={`fixed z-50 bottom-4 right-4 ${className}`}
        onClick={() => setExpanded(!expanded)}
      >
        {activeTasks.length > 0 ? (
          <div 
            className="transition-transform duration-500 ease-in-out flex items-center justify-center h-10 w-10 rounded-full bg-primary shadow-lg cursor-pointer"
            style={{ transform: `scale(${pulseSize})` }}
          >
            <Brain className="h-5 w-5 text-white" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-semibold">
              {activeTasks.length}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 shadow-lg cursor-pointer">
            <Brain className="h-5 w-5 text-gray-700" />
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`fixed z-50 bottom-4 right-4 ${className}`}>
      <div className={`bg-card border rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${expanded ? 'max-w-sm' : 'max-w-[48px]'}`}>
        <div className="flex">
          <div 
            className="flex items-center justify-center h-12 w-12 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div 
              className="transition-transform duration-500 ease-in-out"
              style={{ transform: `scale(${pulseSize})` }}
            >
              <Brain className={`h-6 w-6 ${activeTasks.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
          </div>
          
          {expanded && (
            <>
              <div className="flex-1 p-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">AI Assistant</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0" 
                    onClick={() => setExpanded(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        
        {expanded && (
          <div className="px-3 pb-3">
            {displayedTasks.length > 0 ? (
              <div className="space-y-2">
                {displayedTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="bg-accent rounded p-2 text-xs space-y-1"
                    onClick={() => setShowDetail(task.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{task.agentName}</div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(task.status)}
                        <span className="text-[10px] uppercase font-semibold tracking-wider">
                          {task.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground">{task.taskName}</div>
                    
                    {task.progress !== undefined && (
                      <div className="w-full bg-secondary h-1 rounded-full">
                        <div 
                          className="bg-primary h-1 rounded-full" 
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                    
                    {showDetail === task.id && task.detail && (
                      <div className="mt-2 p-2 bg-muted rounded text-[10px]">
                        {task.detail}
                      </div>
                    )}
                  </div>
                ))}
                
                {hiddenTasks > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={onViewAllTasks}
                  >
                    View {hiddenTasks} more tasks...
                  </Button>
                )}
              </div>
            ) : (
              <div className="py-2 text-xs text-muted-foreground">
                No AI tasks currently running.
              </div>
            )}
            
            {activeTasks.length > 0 && (
              <div className="flex gap-2 items-center mt-3 px-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>
                  {activeTasks.length} AI task{activeTasks.length > 1 ? 's' : ''} running in the background
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
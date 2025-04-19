/**
 * Developer Productivity Tracker Widget
 * 
 * Quick widget for tracking developer energy levels and productivity
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BatteryFull, BatteryMedium, BatteryLow, LineChart, Clock, CheckCircle, XCircle, Code } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import EnergyLevelSelector from './energy-level-selector';
import FocusLevelSelector from './focus-level-selector';
import ActivitySessionTracker from './activity-session-tracker';
import ProductivityStats from './productivity-stats';

/**
 * Main productivity tracker widget component
 */
const ProductivityTrackerWidget = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('today');
  
  // Fetch today's productivity metrics
  const { 
    data: todayMetrics, 
    isLoading: isLoadingMetrics,
    error: metricsError
  } = useQuery({
    queryKey: ['/api/productivity/today'],
    queryFn: async () => {
      const response = await fetch('/api/productivity/today');
      if (!response.ok) {
        throw new Error('Failed to fetch productivity metrics');
      }
      return await response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });
  
  // Fetch active sessions
  const {
    data: activeSessions = [],
    isLoading: isLoadingActiveSessions,
  } = useQuery({
    queryKey: ['/api/productivity/sessions/active'],
    queryFn: async () => {
      const response = await fetch('/api/productivity/sessions/active');
      if (!response.ok) {
        throw new Error('Failed to fetch active sessions');
      }
      return await response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Update energy level mutation
  const updateEnergyLevelMutation = useMutation({
    mutationFn: async (energyLevel: string) => {
      const response = await fetch('/api/productivity/today', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ energyLevel }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update energy level');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/productivity/today'] });
      toast({
        title: 'Energy level updated',
        description: 'Your energy level has been updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to update energy level',
        description: 'There was an error updating your energy level',
        variant: 'destructive',
      });
    },
  });
  
  // Update focus level mutation
  const updateFocusLevelMutation = useMutation({
    mutationFn: async (focusLevel: string) => {
      const response = await fetch('/api/productivity/today', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ focusLevel }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update focus level');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/productivity/today'] });
      toast({
        title: 'Focus level updated',
        description: 'Your focus level has been updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to update focus level',
        description: 'There was an error updating your focus level',
        variant: 'destructive',
      });
    },
  });
  
  // Handle errors
  useEffect(() => {
    if (metricsError) {
      toast({
        title: 'Error fetching productivity data',
        description: 'There was an error fetching your productivity metrics',
        variant: 'destructive',
      });
    }
  }, [metricsError, toast]);
  
  // Handle energy level change
  const handleEnergyLevelChange = (level: string) => {
    updateEnergyLevelMutation.mutate(level);
  };
  
  // Handle focus level change
  const handleFocusLevelChange = (level: string) => {
    updateFocusLevelMutation.mutate(level);
  };
  
  if (isLoadingMetrics) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading Developer Productivity Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Loading your productivity data...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-md mx-auto shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <LineChart className="mr-2 h-5 w-5 text-primary" />
          Developer Productivity Tracker
        </CardTitle>
        <CardDescription>
          Track your energy level, focus, and productivity
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today" className="space-y-4">
            {todayMetrics && (
              <>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <h3 className="text-sm font-medium">Energy Level</h3>
                      <Badge variant={
                        todayMetrics.energyLevel === 'HIGH' ? 'default' : 
                        todayMetrics.energyLevel === 'MEDIUM' ? 'outline' : 'secondary'
                      }>
                        {todayMetrics.energyLevel}
                      </Badge>
                    </div>
                    <EnergyLevelSelector 
                      currentLevel={todayMetrics.energyLevel}
                      onLevelChange={handleEnergyLevelChange}
                      isUpdating={updateEnergyLevelMutation.isPending}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <h3 className="text-sm font-medium">Focus Level</h3>
                      <Badge variant={
                        todayMetrics.focusLevel === 'DEEP' ? 'default' : 
                        todayMetrics.focusLevel === 'MODERATE' ? 'outline' : 
                        todayMetrics.focusLevel === 'SHALLOW' ? 'secondary' : 'destructive'
                      }>
                        {todayMetrics.focusLevel}
                      </Badge>
                    </div>
                    <FocusLevelSelector 
                      currentLevel={todayMetrics.focusLevel}
                      onLevelChange={handleFocusLevelChange}
                      isUpdating={updateFocusLevelMutation.isPending}
                    />
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between mb-2">
                      <h3 className="text-sm font-medium">Today's Progress</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Productive Hours
                        </span>
                        <span>{Number(todayMetrics.productiveHours).toFixed(1)} hrs</span>
                      </div>
                      <Progress value={Math.min(Number(todayMetrics.productiveHours) / 8 * 100, 100)} />
                      
                      <div className="flex justify-between text-xs mt-3">
                        <span className="flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed Tasks
                        </span>
                        <span>{todayMetrics.completedTasks}</span>
                      </div>
                      <Progress value={Math.min(todayMetrics.completedTasks / 10 * 100, 100)} />
                      
                      <div className="flex justify-between text-xs mt-3">
                        <span className="flex items-center">
                          <Code className="h-3 w-3 mr-1" />
                          Code Lines
                        </span>
                        <span>{todayMetrics.codeLines}</span>
                      </div>
                      <Progress value={Math.min(todayMetrics.codeLines / 500 * 100, 100)} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="sessions">
            <ActivitySessionTracker activeSessions={activeSessions} isLoading={isLoadingActiveSessions} />
          </TabsContent>
          
          <TabsContent value="stats">
            <ProductivityStats />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <div className="flex items-center space-x-2">
          <Switch id="auto-track" />
          <Label htmlFor="auto-track" className="text-xs">Auto-track coding sessions</Label>
        </div>
        <Button size="sm" variant="outline">
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductivityTrackerWidget;
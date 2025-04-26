import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { PerformanceBudgets, PerformanceAlerts } from '@/components/monitoring/PerformanceBudgets';

interface WebVital {
  id: string;
  name: string;
  value: number;
  delta: number;
  rating: string;
  navigationType: string;
  url: string;
  timestamp: string;
  deviceType?: string;
  tags?: Record<string, any>;
}

export default function WebVitalsTestPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSimulatingLoad, setIsSimulatingLoad] = useState(false);
  const queryClient = useQueryClient();
  
  // Query to fetch web vitals data
  const { data: webVitalsData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/analytics/web-vitals'],
    refetchOnWindowFocus: false,
  });
  
  // Query to fetch web vitals alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/analytics/web-vitals/alerts'],
    refetchOnWindowFocus: false,
  });
  
  // Mutation to acknowledge an alert
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => 
      apiRequest(`/api/analytics/web-vitals/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        body: { acknowledgedBy: 'test-user' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/web-vitals/alerts'] });
    },
  });
  
  // Handle alert acknowledgement
  const handleAcknowledgeAlert = (alertId: string) => {
    acknowledgeMutation.mutate(alertId);
  };
  
  // Simulate a layout shift for CLS testing
  const simulateLayoutShift = () => {
    const body = document.body;
    const div = document.createElement('div');
    div.style.height = '500px';
    div.style.width = '100%';
    div.style.backgroundColor = '#f0f0f0';
    div.style.transition = 'all 0.3s ease';
    div.innerHTML = '<h2>Layout Shift Simulation</h2><p>This element is inserted to cause a layout shift and generate CLS metrics.</p>';
    
    body.insertBefore(div, body.firstChild);
    
    setTimeout(() => {
      div.style.height = '200px';
      setTimeout(() => {
        body.removeChild(div);
      }, 2000);
    }, 1000);
  };
  
  // Simulate a heavy load for LCP and FID testing
  const simulateHeavyLoad = () => {
    setIsSimulatingLoad(true);
    
    // Create and append a bunch of elements to slow down the page
    const container = document.createElement('div');
    container.id = 'load-simulation-container';
    document.body.appendChild(container);
    
    // Create a lot of elements to simulate load
    for (let i = 0; i < 1000; i++) {
      const el = document.createElement('div');
      el.style.width = '10px';
      el.style.height = '10px';
      el.style.backgroundColor = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
      el.style.margin = '2px';
      el.style.display = 'inline-block';
      container.appendChild(el);
      
      // Force layout recalculation
      el.getBoundingClientRect();
    }
    
    // Block the main thread for a short time
    const startTime = Date.now();
    while (Date.now() - startTime < 500) {
      // Busy wait to block the main thread
    }
    
    setTimeout(() => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      setIsSimulatingLoad(false);
    }, 3000);
  };
  
  // Simulate multiple user interactions to generate INP metrics
  const simulateInteractions = () => {
    const simulateClick = () => {
      const div = document.createElement('div');
      div.style.width = '50px';
      div.style.height = '50px';
      div.style.backgroundColor = 'blue';
      div.style.position = 'fixed';
      div.style.top = `${Math.random() * window.innerHeight}px`;
      div.style.left = `${Math.random() * window.innerWidth}px`;
      div.style.zIndex = '1000';
      div.style.borderRadius = '50%';
      
      document.body.appendChild(div);
      
      // Force a layout calculation by accessing offsetHeight
      div.offsetHeight;
      
      // Simulate processing delay
      const startTime = Date.now();
      while (Date.now() - startTime < 100) {
        // Busy wait to block the main thread
      }
      
      // Remove the element
      setTimeout(() => {
        if (div.parentNode) {
          div.parentNode.removeChild(div);
        }
      }, 500);
    };
    
    // Simulate 5 interactions with delays
    simulateClick();
    setTimeout(simulateClick, 1000);
    setTimeout(simulateClick, 2000);
    setTimeout(simulateClick, 3000);
    setTimeout(simulateClick, 4000);
  };
  
  const getMetricStatusColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'text-green-600';
      case 'needs-improvement':
        return 'text-amber-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  const formatMetricValue = (name: string, value: number) => {
    if (name === 'CLS') {
      return value.toFixed(3);
    } else {
      return `${value.toFixed(0)} ms`;
    }
  };
  
  const getMetricDescription = (name: string) => {
    switch (name) {
      case 'CLS':
        return 'Cumulative Layout Shift - Measures visual stability';
      case 'FID':
        return 'First Input Delay - Measures interactivity';
      case 'FCP':
        return 'First Contentful Paint - Measures loading performance';
      case 'LCP':
        return 'Largest Contentful Paint - Measures loading performance';
      case 'TTFB':
        return 'Time to First Byte - Measures server response time';
      case 'INP':
        return 'Interaction to Next Paint - Measures responsiveness';
      default:
        return '';
    }
  };
  
  const renderMetricSummary = (metrics: WebVital[]) => {
    // Group metrics by name
    const metricsByName: Record<string, WebVital[]> = {};
    
    metrics.forEach(metric => {
      if (!metricsByName[metric.name]) {
        metricsByName[metric.name] = [];
      }
      metricsByName[metric.name].push(metric);
    });
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(metricsByName).map(([name, metrics]) => {
          const latestMetric = metrics[0];
          const avgValue = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
          
          return (
            <Card key={name} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span>{name}</span>
                  <span className={getMetricStatusColor(latestMetric.rating)}>
                    {formatMetricValue(name, avgValue)}
                  </span>
                </CardTitle>
                <CardDescription>{getMetricDescription(name)}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm">
                  Last recorded: <span className={getMetricStatusColor(latestMetric.rating)}>
                    {formatMetricValue(name, latestMetric.value)}
                  </span>
                </p>
                <p className="text-sm">
                  Samples: {metrics.length}
                </p>
              </CardContent>
              <CardFooter className="pt-2">
                <p className="text-xs text-gray-500">
                  {new Date(latestMetric.timestamp).toLocaleString()}
                </p>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  };
  
  const renderMetricDetails = (metrics: WebVital[]) => {
    // Sort by timestamp, newest first
    const sortedMetrics = [...metrics].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Metric</th>
              <th className="p-2 text-left">Value</th>
              <th className="p-2 text-left">Rating</th>
              <th className="p-2 text-left">Device</th>
              <th className="p-2 text-left">Timestamp</th>
              <th className="p-2 text-left">URL</th>
            </tr>
          </thead>
          <tbody>
            {sortedMetrics.map((metric) => (
              <tr key={metric.id} className="border-t border-gray-200">
                <td className="p-2">{metric.name}</td>
                <td className="p-2">{formatMetricValue(metric.name, metric.value)}</td>
                <td className={`p-2 ${getMetricStatusColor(metric.rating)}`}>{metric.rating}</td>
                <td className="p-2">{metric.deviceType || 'unknown'}</td>
                <td className="p-2">{new Date(metric.timestamp).toLocaleString()}</td>
                <td className="p-2 truncate max-w-xs" title={metric.url}>
                  {new URL(metric.url).pathname}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Web Vitals Monitoring Test</h1>
      <p className="mb-6">
        This page allows you to test and visualize the Web Vitals metrics being captured by the TerraFusion platform.
        You can simulate different types of performance issues to see how they affect the metrics.
      </p>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <Button 
          onClick={simulateLayoutShift}
          variant="outline"
        >
          Simulate Layout Shift (CLS)
        </Button>
        
        <Button 
          onClick={simulateHeavyLoad} 
          variant="outline"
          disabled={isSimulatingLoad}
        >
          {isSimulatingLoad ? 'Simulating...' : 'Simulate Heavy Load (LCP/FID)'}
        </Button>
        
        <Button 
          onClick={simulateInteractions}
          variant="outline"
        >
          Simulate Interactions (INP)
        </Button>
        
        <Button 
          onClick={() => {
            window.location.reload();
          }} 
          variant="outline"
        >
          Reload Page (All Metrics)
        </Button>
        
        <Button 
          onClick={() => refetch()} 
          variant="default"
        >
          Refresh Data
        </Button>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Raw Data</TabsTrigger>
          <TabsTrigger value="budgets">Performance Budgets</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="pt-4">
          {isLoading ? (
            <p>Loading metrics data...</p>
          ) : error ? (
            <p className="text-red-500">Error loading metrics: {(error as Error).message}</p>
          ) : !webVitalsData || !Array.isArray(webVitalsData) || webVitalsData.length === 0 ? (
            <p>No metrics data available yet. Try reloading the page or simulating events.</p>
          ) : (
            renderMetricSummary(webVitalsData)
          )}
        </TabsContent>
        
        <TabsContent value="details" className="pt-4">
          {isLoading ? (
            <p>Loading metrics data...</p>
          ) : error ? (
            <p className="text-red-500">Error loading metrics: {(error as Error).message}</p>
          ) : !webVitalsData || !Array.isArray(webVitalsData) || webVitalsData.length === 0 ? (
            <p>No metrics data available yet. Try reloading the page or simulating events.</p>
          ) : (
            renderMetricDetails(webVitalsData)
          )}
        </TabsContent>
        
        <TabsContent value="budgets" className="pt-4">
          {isLoading ? (
            <p>Loading metrics data...</p>
          ) : error ? (
            <p className="text-red-500">Error loading metrics: {(error as Error).message}</p>
          ) : !webVitalsData || !Array.isArray(webVitalsData) || webVitalsData.length === 0 ? (
            <p>No metrics data available yet. Try reloading the page or simulating events.</p>
          ) : (
            <PerformanceBudgets metrics={webVitalsData} selectedCategory="critical" />
          )}
        </TabsContent>
        
        <TabsContent value="alerts" className="pt-4">
          {alertsLoading ? (
            <p>Loading alerts data...</p>
          ) : (
            <PerformanceAlerts 
              alerts={alertsData?.alerts || []} 
              onAcknowledge={handleAcknowledgeAlert} 
            />
          )}
        </TabsContent>
      </Tabs>
      
      <Separator className="my-8" />
      
      <div className="bg-gray-50 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">About Web Vitals</h2>
        <p className="mb-2">
          Core Web Vitals are a set of specific metrics that Google considers important for user experience:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>LCP (Largest Contentful Paint)</strong>: Measures loading performance. Good: ≤ 2.5s</li>
          <li><strong>FID (First Input Delay)</strong>: Measures interactivity. Good: ≤ 100ms</li>
          <li><strong>CLS (Cumulative Layout Shift)</strong>: Measures visual stability. Good: ≤ 0.1</li>
          <li><strong>INP (Interaction to Next Paint)</strong>: Measures responsiveness. Good: ≤ 200ms</li>
          <li><strong>FCP (First Contentful Paint)</strong>: Measures when content first appears. Good: ≤ 1.8s</li>
          <li><strong>TTFB (Time To First Byte)</strong>: Measures server response time. Good: ≤ 800ms</li>
        </ul>
      </div>
    </div>
  );
}
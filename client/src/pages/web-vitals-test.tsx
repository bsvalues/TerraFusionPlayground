import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  rating: string;
  timestamp: string;
}

interface WebVitalsSummary {
  metricName: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
}

export default function WebVitalsTestPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [metricsLoaded, setMetricsLoaded] = useState(false);
  const [lastTestTime, setLastTestTime] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<WebVitalsMetric[]>([]);
  const [summary, setSummary] = useState<WebVitalsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendTestSuccess, setSendTestSuccess] = useState(false);
  
  // Fetch metrics on page load
  useEffect(() => {
    fetchMetrics();
  }, []);
  
  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analytics/web-vitals?limit=20');
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.metrics);
        setMetricsLoaded(data.metrics.length > 0);
      } else {
        setError(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(`Failed to fetch metrics: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchSummary = async (metricName: string = 'LCP') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/analytics/web-vitals/summary?metricName=${metricName}`);
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.summary);
      } else {
        setError(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(`Failed to fetch summary: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const sendTestMetric = async () => {
    setIsLoading(true);
    setError(null);
    setSendTestSuccess(false);
    
    try {
      const testMetric = {
        name: 'TEST_METRIC',
        value: Math.random() * 1000,
        delta: 0,
        rating: 'good',
        navigationType: 'navigate',
        url: window.location.href,
        userAgent: navigator.userAgent,
        tags: { test: true, timestamp: Date.now() }
      };
      
      const response = await fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMetric),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSendTestSuccess(true);
        setLastTestTime(new Date().toLocaleTimeString());
        
        // Refresh metrics list after a short delay
        setTimeout(() => {
          fetchMetrics();
        }, 1000);
      } else {
        setError(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(`Failed to send test metric: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Web Vitals Monitoring Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Send Test Metric</CardTitle>
            <CardDescription>Send a test metric to verify the collection pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={sendTestMetric} 
              disabled={isLoading}
              className="w-full mb-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : 'Send Test Metric'}
            </Button>
            
            {sendTestSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>
                  Test metric sent successfully at {lastTestTime}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Metrics Status</CardTitle>
            <CardDescription>Current status of Web Vitals collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Collection Status:</span>
                <span className={`rounded-full px-2 py-1 text-xs ${metricsLoaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {metricsLoaded ? 'Active' : 'No Data'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Metrics Count:</span>
                <span>{metrics.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Last Refresh:</span>
                <span>{lastTestTime || 'Never'}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={fetchMetrics} 
              disabled={isLoading}
              className="w-full"
            >
              Refresh Metrics
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Performance metrics summary</CardDescription>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Metric:</span>
                  <span>{summary.metricName}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Average:</span>
                  <span>{summary.avg.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Median:</span>
                  <span>{summary.median.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Range:</span>
                  <span>{summary.min.toFixed(0)} - {summary.max.toFixed(0)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                ) : (
                  'No summary data available'
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => fetchSummary('LCP')} 
              disabled={isLoading}
              className="w-full"
            >
              Get LCP Summary
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="recent">
        <TabsList className="mb-4">
          <TabsTrigger value="recent">Recent Metrics</TabsTrigger>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Web Vitals Metrics</CardTitle>
              <CardDescription>
                The most recent web vitals metrics collected from real users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : metrics.length > 0 ? (
                <div className="overflow-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">Metric</th>
                        <th className="text-left py-3 px-4">Value</th>
                        <th className="text-left py-3 px-4">Rating</th>
                        <th className="text-left py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((metric) => (
                        <tr key={metric.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{metric.name}</td>
                          <td className="py-3 px-4">{metric.value.toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <span 
                              className={`rounded-full px-2 py-1 text-xs ${
                                metric.rating === 'good' 
                                  ? 'bg-green-100 text-green-800' 
                                  : metric.rating === 'needs-improvement'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {metric.rating}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            {new Date(metric.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No metrics found. Try sending a test metric or navigating around the application.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="vitals">
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>
                Information about Core Web Vitals and performance benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Largest Contentful Paint (LCP)</h3>
                  <p className="text-gray-500">
                    Measures loading performance. To provide a good user experience, aim for LCP to occur within 2.5 seconds of when the page first starts loading.
                  </p>
                  <div className="flex gap-2">
                    <span className="inline-block bg-green-100 text-green-800 rounded-full px-2 py-1 text-xs">Good: &lt; 2.5s</span>
                    <span className="inline-block bg-yellow-100 text-yellow-800 rounded-full px-2 py-1 text-xs">Needs Improvement: 2.5s - 4s</span>
                    <span className="inline-block bg-red-100 text-red-800 rounded-full px-2 py-1 text-xs">Poor: &gt; 4s</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fetchSummary('LCP')}>View LCP Data</Button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">First Input Delay (FID)</h3>
                  <p className="text-gray-500">
                    Measures interactivity. To provide a good user experience, pages should have a FID of 100 milliseconds or less.
                  </p>
                  <div className="flex gap-2">
                    <span className="inline-block bg-green-100 text-green-800 rounded-full px-2 py-1 text-xs">Good: &lt; 100ms</span>
                    <span className="inline-block bg-yellow-100 text-yellow-800 rounded-full px-2 py-1 text-xs">Needs Improvement: 100ms - 300ms</span>
                    <span className="inline-block bg-red-100 text-red-800 rounded-full px-2 py-1 text-xs">Poor: &gt; 300ms</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fetchSummary('FID')}>View FID Data</Button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Cumulative Layout Shift (CLS)</h3>
                  <p className="text-gray-500">
                    Measures visual stability. To provide a good user experience, pages should maintain a CLS of 0.1 or less.
                  </p>
                  <div className="flex gap-2">
                    <span className="inline-block bg-green-100 text-green-800 rounded-full px-2 py-1 text-xs">Good: &lt; 0.1</span>
                    <span className="inline-block bg-yellow-100 text-yellow-800 rounded-full px-2 py-1 text-xs">Needs Improvement: 0.1 - 0.25</span>
                    <span className="inline-block bg-red-100 text-red-800 rounded-full px-2 py-1 text-xs">Poor: &gt; 0.25</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fetchSummary('CLS')}>View CLS Data</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useEffect, useRef } from 'react';
import { onCLS, onFID, onFCP, onLCP, onTTFB, Metric, ReportHandler } from 'web-vitals';

interface RealUserMonitoringProps {
  // Debug mode for development purposes
  debug?: boolean;
  
  // Report URL for sending metrics (uses default API endpoint if not specified)
  reportUrl?: string;
  
  // Additional tags to include with all metrics
  tags?: Record<string, string | number | boolean>;
  
  // Whether to include device information such as browser, OS, screen size, etc.
  includeDeviceInfo?: boolean;
  
  // Whether to include percentiles with metrics for comparison
  includePercentiles?: boolean;
  
  // Interval for sending batched reports in milliseconds (default: 10000ms / 10s)
  reportInterval?: number;
}

const DEFAULT_REPORT_INTERVAL = 10000; // 10 seconds

/**
 * RealUserMonitoring - Component for collecting and reporting Web Vitals metrics
 * 
 * This component captures Core Web Vitals and other performance metrics
 * using the web-vitals library, and reports them to the specified endpoint.
 * 
 * Metrics collected:
 * - CLS (Cumulative Layout Shift)
 * - FID (First Input Delay)
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - TTFB (Time to First Byte)
 * 
 * Usage:
 * <RealUserMonitoring
 *   debug={process.env.NODE_ENV === 'development'}
 *   tags={{ app: 'my-app', version: '1.0.0' }}
 *   includeDeviceInfo={true}
 * />
 */
export function RealUserMonitoring({
  debug = false,
  reportUrl = '/api/analytics/web-vitals/batch',
  tags = {},
  includeDeviceInfo = true,
  includePercentiles = true,
  reportInterval = DEFAULT_REPORT_INTERVAL,
}: RealUserMonitoringProps) {
  // Store metrics in a queue for batched reporting
  const metricsQueue = useRef<Metric[]>([]);
  
  // Timer reference for batched reporting
  const reportTimerRef = useRef<number | null>(null);
  
  /**
   * Get device and browser information
   */
  function getDeviceInfo(): Record<string, string | number | boolean> {
    const info: Record<string, string | number | boolean> = {};
    
    // Browser information
    info.userAgent = navigator.userAgent;
    
    // Screen information
    info.screenWidth = window.screen.width;
    info.screenHeight = window.screen.height;
    info.devicePixelRatio = window.devicePixelRatio;
    info.innerWidth = window.innerWidth;
    info.innerHeight = window.innerHeight;
    
    // Connection information
    const connection = (navigator as any).connection;
    if (connection) {
      info.connectionType = connection.type;
      info.effectiveConnectionType = connection.effectiveType;
      info.downlink = connection.downlink;
      info.rtt = connection.rtt;
      info.saveData = connection.saveData;
    }
    
    // Device type estimation
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    
    if (isTablet) {
      info.deviceType = 'tablet';
    } else if (isMobile) {
      info.deviceType = 'mobile';
    } else {
      info.deviceType = 'desktop';
    }
    
    return info;
  }
  
  /**
   * Calculate percentiles for comparison
   * These are baseline values from Google's Core Web Vitals recommendations
   */
  function calculatePercentiles(metric: Metric): Record<string, Record<string, number>> {
    const percentiles: Record<string, Record<string, number>> = {};
    
    // Standard percentile thresholds for Core Web Vitals
    if (metric.name === 'CLS') {
      percentiles[metric.name] = {
        good: 0.1,        // Good threshold
        needsImprovement: 0.25,  // Needs improvement threshold
        p75: 0.15         // Typical p75 value
      };
    } else if (metric.name === 'FID') {
      percentiles[metric.name] = {
        good: 100,        // Good threshold (ms)
        needsImprovement: 300,   // Needs improvement threshold (ms)
        p75: 150          // Typical p75 value (ms)
      };
    } else if (metric.name === 'LCP') {
      percentiles[metric.name] = {
        good: 2500,       // Good threshold (ms)
        needsImprovement: 4000,  // Needs improvement threshold (ms)
        p75: 3000         // Typical p75 value (ms)
      };
    } else if (metric.name === 'FCP') {
      percentiles[metric.name] = {
        good: 1800,       // Good threshold (ms)
        needsImprovement: 3000,  // Needs improvement threshold (ms)
        p75: 2200         // Typical p75 value (ms)
      };
    } else if (metric.name === 'TTFB') {
      percentiles[metric.name] = {
        good: 800,        // Good threshold (ms)
        needsImprovement: 1800,  // Needs improvement threshold (ms)
        p75: 1200         // Typical p75 value (ms)
      };
    }
    
    return percentiles;
  }
  
  /**
   * Determine performance rating based on metric value and name
   */
  function calculateRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    switch (name) {
      case 'CLS':
        return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
      case 'FID':
        return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
      case 'LCP':
        return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
      case 'FCP':
        return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
      case 'TTFB':
        return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
      default:
        return 'needs-improvement';
    }
  }
  
  /**
   * Send the batched metrics to the server
   */
  const sendBatchedReport = () => {
    if (metricsQueue.current.length === 0) {
      return;
    }
    
    const deviceInfo = includeDeviceInfo ? getDeviceInfo() : undefined;
    
    // Calculate percentiles for comparison if needed
    let percentiles;
    if (includePercentiles) {
      percentiles = {};
      metricsQueue.current.forEach(metric => {
        const metricPercentiles = calculatePercentiles(metric);
        Object.assign(percentiles as any, metricPercentiles);
      });
    }
    
    // Prepare the metrics for reporting
    const metricsToReport = metricsQueue.current.map(metric => ({
      id: Math.random().toString(36).substring(2, 15),
      name: metric.name,
      value: metric.value,
      delta: metric.delta,
      rating: calculateRating(metric.name, metric.value),
      navigationType: metric.navigationType,
      url: window.location.href,
      userAgent: navigator.userAgent,
      deviceType: deviceInfo?.deviceType,
      connectionType: (deviceInfo as any)?.connectionType,
      effectiveConnectionType: (deviceInfo as any)?.effectiveConnectionType,
      timestamp: new Date().toISOString(),
      tags,
    }));
    
    // Create the report payload
    const reportPayload = {
      metrics: metricsToReport,
      deviceInfo,
      percentiles,
      tags,
    };
    
    // Log in debug mode
    if (debug) {
      console.log('Web Vitals Report:', reportPayload);
    }
    
    // Send the report to the server
    fetch(reportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportPayload),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(() => {
        // Clear the queue after successful reporting
        metricsQueue.current = [];
        
        if (debug) {
          console.log('Web Vitals metrics reported successfully');
        }
      })
      .catch(error => {
        if (debug) {
          console.error('Error reporting Web Vitals metrics:', error);
        }
      });
  };
  
  /**
   * Handle a single metric
   */
  const handleMetric: ReportHandler = (metric) => {
    // Add the metric to the queue
    metricsQueue.current.push(metric);
    
    // Log in debug mode
    if (debug) {
      console.log(`Web Vital: ${metric.name}`, metric);
    }
    
    // If there's no active timer, start one for batched reporting
    if (reportTimerRef.current === null) {
      reportTimerRef.current = window.setTimeout(() => {
        sendBatchedReport();
        reportTimerRef.current = null;
      }, reportInterval);
    }
  };
  
  // Set up metrics collection
  useEffect(() => {
    // Collect Core Web Vitals and other metrics
    onCLS(handleMetric);
    onFID(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
    
    // When component unmounts, send any remaining metrics
    return () => {
      if (reportTimerRef.current) {
        clearTimeout(reportTimerRef.current);
        reportTimerRef.current = null;
      }
      
      if (metricsQueue.current.length > 0) {
        sendBatchedReport();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // This component doesn't render anything
  return null;
}

export default RealUserMonitoring;
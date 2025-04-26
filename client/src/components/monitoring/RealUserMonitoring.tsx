import { useEffect, useRef } from 'react';
import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, Metric, ReportHandler } from 'web-vitals';

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
  
  // Maximum number of metrics to include in a single batch (default: 50)
  maxBatchSize?: number;
  
  // Whether to enable retries for failed requests (default: true)
  enableRetries?: boolean;
  
  // Maximum number of retry attempts for failed requests (default: 3)
  maxRetryAttempts?: number;
  
  // Whether to collect metrics on beforeunload event (default: true)
  collectOnBeforeUnload?: boolean;
  
  // User role information (e.g., 'assessor', 'public', 'admin')
  userRole?: string;
  
  // The current build version, useful for correlating metrics with releases
  buildVersion?: string;
  
  // Feature flag states to correlate performance with enabled features
  featureFlags?: Record<string, boolean>;
  
  // Sampling rate for high-traffic pages (default: 1.0 = 100%)
  samplingRate?: number;
}

// Default values for configuration
const DEFAULT_REPORT_INTERVAL = 10000; // 10 seconds
const DEFAULT_MAX_BATCH_SIZE = 50; // 50 metrics per batch
const DEFAULT_MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_SAMPLING_RATE = 1.0; // 100% by default

/**
 * RealUserMonitoring - Component for collecting and reporting Web Vitals metrics
 * 
 * This enhanced component captures Core Web Vitals and other performance metrics
 * using the web-vitals library, and reports them to the specified endpoint with
 * advanced features like batching, retries, sampling, and beforeunload handling.
 * 
 * Metrics collected:
 * - CLS (Cumulative Layout Shift)
 * - FID (First Input Delay)
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 * 
 * Features:
 * - Configurable batch size and reporting frequency
 * - Automatic retries with exponential backoff for failed requests
 * - sendBeacon support for more reliable metrics during page unload
 * - Sampling for high-traffic pages
 * - Enrichment with contextual metadata (role, version, feature flags)
 * - Offline support with automatic retry when connection is restored
 * 
 * Usage:
 * <RealUserMonitoring
 *   debug={process.env.NODE_ENV === 'development'}
 *   tags={{ app: 'terrafusion', version: '1.0.0' }}
 *   includeDeviceInfo={true}
 *   reportInterval={10000}
 *   maxBatchSize={50}
 *   enableRetries={true}
 *   collectOnBeforeUnload={true}
 *   userRole="assessor"
 *   buildVersion="1.2.0"
 *   featureFlags={{ offlineSync: true, newUI: false }}
 *   samplingRate={1.0}
 * />
 */
export function RealUserMonitoring({
  debug = false,
  reportUrl = '/api/web-vitals/batch',
  tags = {},
  includeDeviceInfo = true,
  includePercentiles = true,
  reportInterval = DEFAULT_REPORT_INTERVAL,
  maxBatchSize = DEFAULT_MAX_BATCH_SIZE,
  enableRetries = true,
  maxRetryAttempts = DEFAULT_MAX_RETRY_ATTEMPTS,
  collectOnBeforeUnload = true,
  userRole,
  buildVersion,
  featureFlags,
  samplingRate = DEFAULT_SAMPLING_RATE,
}: RealUserMonitoringProps) {
  // Store metrics in a queue for batched reporting
  const metricsQueue = useRef<Metric[]>([]);
  
  // Timer reference for batched reporting
  const reportTimerRef = useRef<number | null>(null);
  
  // Reference to track retry attempts
  const retryAttemptsRef = useRef<Record<string, number>>({});
  
  // Reference to hold metrics that failed to send for retry
  const pendingRetriesRef = useRef<any[]>([]);
  
  // Generate a unique batch ID for tracking retries
  const generateBatchId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  
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
   * Implements exponential backoff algorithm for retries
   * @param attempt - The current retry attempt number (starting at 0)
   * @returns Delay in milliseconds
   */
  const calculateBackoffDelay = (attempt: number): number => {
    // Base delay of 1000ms (1 second)
    const baseDelay = 1000;
    // Maximum delay capped at 30 seconds
    const maxDelay = 30000;
    // Calculate exponential backoff: 2^attempt * baseDelay with jitter
    const exponentialDelay = Math.pow(2, attempt) * baseDelay;
    // Add a small random jitter (±10%) to prevent synchronized retries
    const jitter = 0.1 * exponentialDelay * (Math.random() * 2 - 1);
    
    // Cap the delay at maxDelay
    return Math.min(exponentialDelay + jitter, maxDelay);
  };
  
  /**
   * Send a batch of metrics with retry capabilities
   * @param payload - The metric data to send
   * @param batchId - Unique identifier for this batch (for retry tracking)
   * @param attemptNumber - The current attempt number (for exponential backoff)
   */
  const sendMetricsBatch = (
    payload: any, 
    batchId: string = generateBatchId(), 
    attemptNumber: number = 0
  ) => {
    // Log in debug mode
    if (debug) {
      console.log(`Web Vitals Report (Batch ${batchId}, Attempt ${attemptNumber + 1}):`, payload);
    }
    
    // Send the report to the server
    fetch(reportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(() => {
        // Success! Clear any tracking for this batch
        if (retryAttemptsRef.current[batchId]) {
          delete retryAttemptsRef.current[batchId];
        }
        
        if (debug) {
          console.log(`Web Vitals metrics reported successfully (Batch ${batchId})`);
        }
      })
      .catch(error => {
        if (debug) {
          console.error(`Error reporting Web Vitals metrics (Batch ${batchId}, Attempt ${attemptNumber + 1}):`, error);
        }
        
        // Implement retry logic if enabled
        if (enableRetries && attemptNumber < maxRetryAttempts) {
          retryAttemptsRef.current[batchId] = attemptNumber + 1;
          
          // Calculate backoff delay
          const delay = calculateBackoffDelay(attemptNumber);
          
          if (debug) {
            console.log(`Retrying batch ${batchId} in ${delay}ms (Attempt ${attemptNumber + 2}/${maxRetryAttempts + 1})`);
          }
          
          // Schedule retry with exponential backoff
          setTimeout(() => {
            sendMetricsBatch(payload, batchId, attemptNumber + 1);
          }, delay);
        } else if (enableRetries) {
          // Max retries exceeded, store for later retry
          if (debug) {
            console.warn(`Max retry attempts (${maxRetryAttempts}) reached for batch ${batchId}`);
          }
          
          // Store for potential later retry when connectivity is restored
          pendingRetriesRef.current.push({
            payload,
            batchId,
            timestamp: Date.now()
          });
          
          // Remove from tracking
          delete retryAttemptsRef.current[batchId];
        }
      });
  };
  
  /**
   * Send the batched metrics to the server
   */
  const sendBatchedReport = () => {
    if (metricsQueue.current.length === 0) {
      return;
    }
    
    // Apply sampling if configured (random number between 0-1 must be less than samplingRate)
    if (samplingRate < 1.0 && Math.random() > samplingRate) {
      if (debug) {
        console.log(`Sampling skipped sending metrics (rate: ${samplingRate})`);
      }
      // Clear the queue but don't send data
      metricsQueue.current = [];
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
    
    // Get path from URL for aggregation purposes
    const url = window.location.href;
    const urlPath = new URL(url).pathname;
    
    // Prepare additional context
    const currentTime = new Date().toISOString();
    const isOnline = navigator.onLine;
    const route = urlPath;
    
    // Enrich tags with additional contextual data
    const enrichedTags = {
      ...tags,
      userRole: userRole || 'unknown',
      buildVersion: buildVersion || 'unknown',
      route,
      isOnline,
      ...featureFlags,
    };
    
    // Process in batches if over the maximum batch size
    const metricBatches: Metric[][] = [];
    
    // Split the queue into batches based on maxBatchSize
    for (let i = 0; i < metricsQueue.current.length; i += maxBatchSize) {
      metricBatches.push(metricsQueue.current.slice(i, i + maxBatchSize));
    }
    
    // Process each batch
    metricBatches.forEach(batchMetrics => {
      // Prepare the metrics for reporting
      const metricsToReport = batchMetrics.map(metric => ({
        id: Math.random().toString(36).substring(2, 15),
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: calculateRating(metric.name, metric.value),
        navigationType: metric.navigationType,
        url,
        userAgent: navigator.userAgent,
        deviceType: deviceInfo?.deviceType,
        connectionType: (deviceInfo as any)?.connectionType,
        effectiveConnectionType: (deviceInfo as any)?.effectiveConnectionType,
        timestamp: currentTime,
        tags: enrichedTags,
      }));
      
      // Create the report payload
      const reportPayload = {
        metrics: metricsToReport,
        deviceInfo,
        percentiles,
        tags: enrichedTags,
      };
      
      // Send this batch
      sendMetricsBatch(reportPayload);
    });
    
    // Clear the queue after processing all batches
    metricsQueue.current = [];
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
  
  /**
   * Try to resend any failed batches that were stored for later
   */
  const retryPendingBatches = () => {
    if (pendingRetriesRef.current.length === 0) {
      return;
    }
    
    if (debug) {
      console.log(`Attempting to retry ${pendingRetriesRef.current.length} pending batches`);
    }
    
    // Try to resend each pending batch
    const stillPending = [];
    
    pendingRetriesRef.current.forEach(pendingBatch => {
      // Only retry if we're online
      if (navigator.onLine) {
        // Generate a new batch ID for this retry
        const newBatchId = generateBatchId();
        sendMetricsBatch(pendingBatch.payload, newBatchId, 0);
      } else {
        // Keep in pending list if offline
        stillPending.push(pendingBatch);
      }
    });
    
    // Update the pending retries list
    pendingRetriesRef.current = stillPending;
  };
  
  /**
   * Handle beforeunload event to send any queued metrics
   */
  const handleBeforeUnload = () => {
    // Cancel any pending timer
    if (reportTimerRef.current) {
      clearTimeout(reportTimerRef.current);
      reportTimerRef.current = null;
    }
    
    // Send any queued metrics synchronously
    if (metricsQueue.current.length > 0) {
      if (debug) {
        console.log('Sending metrics on beforeunload');
      }
      
      // Use navigator.sendBeacon if available for more reliable delivery during page unload
      if (navigator.sendBeacon && reportUrl) {
        const deviceInfo = includeDeviceInfo ? getDeviceInfo() : undefined;
        
        // Get path from URL for aggregation purposes
        const url = window.location.href;
        const urlPath = new URL(url).pathname;
        
        // Prepare additional context
        const currentTime = new Date().toISOString();
        const isOnline = navigator.onLine;
        const route = urlPath;
        
        // Enrich tags with additional contextual data
        const enrichedTags = {
          ...tags,
          userRole: userRole || 'unknown',
          buildVersion: buildVersion || 'unknown',
          route,
          isOnline,
          event: 'beforeunload',
          ...featureFlags,
        };
        
        // Prepare the metrics for reporting
        const metricsToReport = metricsQueue.current.map(metric => ({
          id: Math.random().toString(36).substring(2, 15),
          name: metric.name,
          value: metric.value,
          delta: metric.delta,
          rating: calculateRating(metric.name, metric.value),
          navigationType: metric.navigationType,
          url,
          userAgent: navigator.userAgent,
          deviceType: deviceInfo?.deviceType,
          connectionType: (deviceInfo as any)?.connectionType,
          effectiveConnectionType: (deviceInfo as any)?.effectiveConnectionType,
          timestamp: currentTime,
          tags: enrichedTags,
        }));
        
        // Create the report payload
        const reportPayload = {
          metrics: metricsToReport,
          deviceInfo,
          tags: enrichedTags,
        };
        
        // Use sendBeacon for more reliable delivery during page unload
        const blob = new Blob([JSON.stringify(reportPayload)], { type: 'application/json' });
        navigator.sendBeacon(reportUrl, blob);
      } else {
        // Fall back to normal send if sendBeacon is not available
        sendBatchedReport();
      }
      
      // Clear the queue
      metricsQueue.current = [];
    }
  };
  
  /**
   * Handle online/offline events
   */
  const handleOnline = () => {
    if (debug) {
      console.log('Connection restored. Retrying pending batches.');
    }
    retryPendingBatches();
  };
  
  // Set up metrics collection
  useEffect(() => {
    // Collect Core Web Vitals and other metrics
    onCLS(handleMetric);
    onFID(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric); // Include Interaction to Next Paint
    
    // Set up beforeunload event listener if enabled
    if (collectOnBeforeUnload) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    // Set up online event listener for retry mechanism
    if (enableRetries) {
      window.addEventListener('online', handleOnline);
    }
    
    // Attempt to retry any pending batches on mount if we're online
    if (enableRetries && navigator.onLine && pendingRetriesRef.current.length > 0) {
      retryPendingBatches();
    }
    
    // Clean up when component unmounts
    return () => {
      if (reportTimerRef.current) {
        clearTimeout(reportTimerRef.current);
        reportTimerRef.current = null;
      }
      
      if (metricsQueue.current.length > 0) {
        sendBatchedReport();
      }
      
      // Remove event listeners
      if (collectOnBeforeUnload) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
      
      if (enableRetries) {
        window.removeEventListener('online', handleOnline);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // This component doesn't render anything
  return null;
}

export default RealUserMonitoring;
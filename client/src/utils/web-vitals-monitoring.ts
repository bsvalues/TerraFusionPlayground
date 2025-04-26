/**
 * Web Vitals Monitoring
 * 
 * Tracks and reports Core Web Vitals metrics to understand real user performance.
 * Collects LCP (Largest Contentful Paint), FID (First Input Delay),
 * CLS (Cumulative Layout Shift), TTFB (Time to First Byte), and FCP (First Contentful Paint).
 * 
 * Usage:
 * - Import and call initWebVitalsReporting() in your main App component or entry point
 * - Metrics will be automatically collected and reported to the configured endpoint
 * - View collected metrics in your dashboard or analytics tool
 */

import { 
  onLCP, 
  onFID, 
  onCLS, 
  onTTFB, 
  onFCP,
  type Metric,
  type ReportHandler,
  type CLSMetric,
  type FCPMetric,
  type FIDMetric,
  type LCPMetric,
  type TTFBMetric
} from 'web-vitals';

// Collection of the last reported metric values
const lastMetrics: Record<string, number> = {};

// Queue of metrics to be sent
const metricsQueue: Array<{
  name: string;
  value: number;
  delta: number;
  id: string;
  timestamp: number;
  navigationType?: string;
  rating?: 'good' | 'needs-improvement' | 'poor';
}> = [];

// Configuration
interface WebVitalsConfig {
  // Report URL to send metrics to
  reportUrl?: string;
  
  // Whether to log metrics to console
  debug?: boolean;
  
  // Callback for collected metrics
  onReport?: ReportHandler;
  
  // Whether to include percentiles (p75, p95) in reports
  includePercentiles?: boolean;
  
  // How often to report metrics in milliseconds
  reportInterval?: number;
  
  // Whether to include browser and device information
  includeDeviceInfo?: boolean;
  
  // Additional tags to include with metrics
  tags?: Record<string, string>;
}

// Default configuration
const defaultConfig: WebVitalsConfig = {
  reportUrl: '/api/analytics/web-vitals',
  debug: false,
  includePercentiles: true,
  reportInterval: 10000, // 10 seconds
  includeDeviceInfo: true,
  tags: {}
};

// Current configuration
let config: WebVitalsConfig = { ...defaultConfig };

// Report timer
let reportTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Get device information
 * 
 * @returns Device and browser information
 */
function getDeviceInfo(): Record<string, string> {
  if (!config.includeDeviceInfo) {
    return {};
  }
  
  return {
    userAgent: navigator.userAgent,
    deviceType: getDeviceType(),
    screenSize: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    connection: getConnectionInfo(),
    browser: getBrowserInfo(),
  };
}

/**
 * Get device type
 * 
 * @returns Device type (mobile, tablet, desktop)
 */
function getDeviceType(): string {
  const ua = navigator.userAgent;
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  
  return 'desktop';
}

/**
 * Get connection information
 * 
 * @returns Connection information or 'unknown'
 */
function getConnectionInfo(): string {
  const connection = (navigator as any).connection;
  
  if (!connection) {
    return 'unknown';
  }
  
  return connection.effectiveType || 'unknown';
}

/**
 * Get browser information
 * 
 * @returns Browser name and version
 */
function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  let browser = 'unknown';
  
  if (ua.indexOf('Chrome') > -1) {
    browser = 'Chrome';
  } else if (ua.indexOf('Safari') > -1) {
    browser = 'Safari';
  } else if (ua.indexOf('Firefox') > -1) {
    browser = 'Firefox';
  } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) {
    browser = 'IE';
  } else if (ua.indexOf('Edge') > -1) {
    browser = 'Edge';
  }
  
  return browser;
}

/**
 * Standard metric handler
 * 
 * @param metric Web Vitals metric
 */
function handleMetric(metric: Metric): void {
  // Store the metric
  lastMetrics[metric.name] = metric.value;
  
  // Add to queue
  metricsQueue.push({
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    id: metric.id,
    timestamp: Date.now(),
    navigationType: (metric as any).navigationType,
    rating: getMetricRating(metric)
  });
  
  // Log if debug mode is enabled
  if (config.debug) {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}`, metric);
  }
  
  // Call custom report handler if provided
  if (config.onReport) {
    config.onReport(metric);
  }
}

/**
 * Get metric rating (good, needs-improvement, poor)
 * 
 * @param metric Web Vitals metric
 * @returns Rating or undefined
 */
function getMetricRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' | undefined {
  // LCP thresholds
  if (isLCP(metric)) {
    if (metric.value <= 2500) return 'good';
    if (metric.value <= 4000) return 'needs-improvement';
    return 'poor';
  }
  
  // FID thresholds
  if (isFID(metric)) {
    if (metric.value <= 100) return 'good';
    if (metric.value <= 300) return 'needs-improvement';
    return 'poor';
  }
  
  // CLS thresholds
  if (isCLS(metric)) {
    if (metric.value <= 0.1) return 'good';
    if (metric.value <= 0.25) return 'needs-improvement';
    return 'poor';
  }
  
  // TTFB thresholds
  if (isTTFB(metric)) {
    if (metric.value <= 800) return 'good';
    if (metric.value <= 1800) return 'needs-improvement';
    return 'poor';
  }
  
  // FCP thresholds
  if (isFCP(metric)) {
    if (metric.value <= 1800) return 'good';
    if (metric.value <= 3000) return 'needs-improvement';
    return 'poor';
  }
  
  return undefined;
}

/**
 * Type guards for metrics
 */
function isLCP(metric: Metric): metric is LCPMetric {
  return metric.name === 'LCP';
}

function isFID(metric: Metric): metric is FIDMetric {
  return metric.name === 'FID';
}

function isCLS(metric: Metric): metric is CLSMetric {
  return metric.name === 'CLS';
}

function isTTFB(metric: Metric): metric is TTFBMetric {
  return metric.name === 'TTFB';
}

function isFCP(metric: Metric): metric is FCPMetric {
  return metric.name === 'FCP';
}

/**
 * Send metrics to reporting endpoint
 */
async function sendMetrics(): Promise<void> {
  // Skip if no metrics to send or no report URL
  if (metricsQueue.length === 0 || !config.reportUrl) {
    return;
  }
  
  // Create a copy of the queue and clear it
  const metrics = [...metricsQueue];
  metricsQueue.length = 0;
  
  try {
    // Calculate percentiles if enabled
    const percentiles: Record<string, Record<string, number>> = {};
    
    if (config.includePercentiles) {
      // Group metrics by name
      const metricsByName: Record<string, number[]> = {};
      
      for (const metric of metrics) {
        if (!metricsByName[metric.name]) {
          metricsByName[metric.name] = [];
        }
        
        metricsByName[metric.name].push(metric.value);
      }
      
      // Calculate percentiles for each metric
      for (const [name, values] of Object.entries(metricsByName)) {
        if (values.length > 0) {
          const sorted = [...values].sort((a, b) => a - b);
          
          percentiles[name] = {
            p50: calculatePercentile(sorted, 0.5),
            p75: calculatePercentile(sorted, 0.75),
            p95: calculatePercentile(sorted, 0.95),
            p99: calculatePercentile(sorted, 0.99),
          };
        }
      }
    }
    
    // Prepare payload
    const payload = {
      timestamp: Date.now(),
      url: window.location.href,
      metrics,
      percentiles: config.includePercentiles ? percentiles : undefined,
      deviceInfo: config.includeDeviceInfo ? getDeviceInfo() : undefined,
      tags: config.tags
    };
    
    // Send metrics
    const response = await fetch(config.reportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      // Use keepalive to ensure the request completes even if the page is unloading
      keepalive: true
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send metrics: ${response.status} ${response.statusText}`);
    }
    
    if (config.debug) {
      console.log('[Web Vitals] Metrics sent successfully', payload);
    }
  } catch (error) {
    if (config.debug) {
      console.error('[Web Vitals] Failed to send metrics', error);
    }
    
    // Re-queue metrics for next attempt
    metricsQueue.push(...metrics);
  }
}

/**
 * Calculate percentile
 * 
 * @param sortedValues Sorted array of values
 * @param percentile Percentile (0-1)
 * @returns Percentile value
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }
  
  if (sortedValues.length === 1) {
    return sortedValues[0];
  }
  
  const index = Math.max(0, Math.min(Math.floor(percentile * sortedValues.length), sortedValues.length - 1));
  return sortedValues[index];
}

/**
 * Start metrics reporting
 */
function startReporting(): void {
  if (reportTimer) {
    return;
  }
  
  reportTimer = setInterval(() => {
    sendMetrics();
  }, config.reportInterval);
  
  // Ensure metrics are sent when the page is unloaded
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      sendMetrics();
    }
  });
  
  // Also send metrics when the page is unloaded
  window.addEventListener('unload', () => {
    sendMetrics();
  });
}

/**
 * Stop metrics reporting
 */
function stopReporting(): void {
  if (reportTimer) {
    clearInterval(reportTimer);
    reportTimer = null;
  }
}

/**
 * Initialize Web Vitals reporting
 * 
 * @param customConfig Custom configuration
 */
export function initWebVitalsReporting(customConfig: WebVitalsConfig = {}): void {
  // Merge configurations
  config = { ...defaultConfig, ...customConfig };
  
  // Register metric handlers
  onLCP(handleMetric);
  onFID(handleMetric);
  onCLS(handleMetric);
  onTTFB(handleMetric);
  onFCP(handleMetric);
  
  // Start reporting
  startReporting();
  
  if (config.debug) {
    console.log('[Web Vitals] Monitoring initialized', config);
  }
}

/**
 * Get the last reported metrics
 * 
 * @returns Last reported metrics
 */
export function getLastMetrics(): Record<string, number> {
  return { ...lastMetrics };
}

/**
 * Check if Web Vitals are good
 * 
 * @returns Whether all Web Vitals are good
 */
export function areWebVitalsGood(): boolean {
  const lcp = lastMetrics['LCP'] || 0;
  const fid = lastMetrics['FID'] || 0;
  const cls = lastMetrics['CLS'] || 0;
  
  return lcp <= 2500 && fid <= 100 && cls <= 0.1;
}

/**
 * Get Web Vitals summary
 * 
 * @returns Web Vitals summary
 */
export function getWebVitalsSummary(): {
  lcp: { value: number; rating: string };
  fid: { value: number; rating: string };
  cls: { value: number; rating: string };
  ttfb: { value: number; rating: string };
  fcp: { value: number; rating: string };
} {
  return {
    lcp: {
      value: lastMetrics['LCP'] || 0,
      rating: getMetricRating({ name: 'LCP', value: lastMetrics['LCP'] || 0, delta: 0, id: '' }) || 'unknown'
    },
    fid: {
      value: lastMetrics['FID'] || 0,
      rating: getMetricRating({ name: 'FID', value: lastMetrics['FID'] || 0, delta: 0, id: '' }) || 'unknown'
    },
    cls: {
      value: lastMetrics['CLS'] || 0,
      rating: getMetricRating({ name: 'CLS', value: lastMetrics['CLS'] || 0, delta: 0, id: '' }) || 'unknown'
    },
    ttfb: {
      value: lastMetrics['TTFB'] || 0,
      rating: getMetricRating({ name: 'TTFB', value: lastMetrics['TTFB'] || 0, delta: 0, id: '' }) || 'unknown'
    },
    fcp: {
      value: lastMetrics['FCP'] || 0,
      rating: getMetricRating({ name: 'FCP', value: lastMetrics['FCP'] || 0, delta: 0, id: '' }) || 'unknown'
    }
  };
}
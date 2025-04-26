/**
 * Real User Monitoring Component
 * 
 * This component initializes web vitals tracking and integrates the performance monitoring
 * into the application. It should be included high in the component tree, preferably in App.tsx.
 */

import React, { useEffect } from 'react';
import { initWebVitalsReporting, getWebVitalsSummary } from '../../utils/web-vitals-monitoring';

// Props for the RealUserMonitoring component
interface RealUserMonitoringProps {
  // Whether to enable debug mode
  debug?: boolean;
  
  // Optional tags to include with metrics
  tags?: Record<string, string>;
  
  // Optional custom endpoint URL
  reportUrl?: string;
  
  // Whether to show a dashboard for debug purposes
  showDebugDashboard?: boolean;
}

/**
 * RealUserMonitoring Component
 * 
 * This component initializes web vitals tracking and integrates the performance monitoring
 * into the application. It should be included high in the component tree.
 */
export const RealUserMonitoring: React.FC<RealUserMonitoringProps> = ({
  debug = false,
  tags = {},
  reportUrl = '/api/analytics/web-vitals',
  showDebugDashboard = false
}) => {
  // Initialize web vitals reporting
  useEffect(() => {
    // Add user and session IDs as tags
    const enhancedTags = {
      ...tags,
      // Add unique session ID if not provided
      sessionId: tags.sessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      // Get user ID from local storage or generate one
      userId: tags.userId || localStorage.getItem('userId') || `user-${Math.random().toString(36).substring(2, 9)}`
    };

    // Store userId for future visits
    if (!localStorage.getItem('userId') && enhancedTags.userId) {
      localStorage.setItem('userId', enhancedTags.userId);
    }

    // Initialize web vitals reporting
    initWebVitalsReporting({
      debug,
      reportUrl,
      tags: enhancedTags,
      includeDeviceInfo: true,
      includePercentiles: true,
      reportInterval: 10000 // 10 seconds
    });

    if (debug) {
      console.log('[RUM] Real User Monitoring initialized with tags:', enhancedTags);
    }
  }, [debug, tags, reportUrl]);

  // Render the debug dashboard if enabled
  if (showDebugDashboard) {
    return <PerformanceDashboard />;
  }

  // Render nothing - this is a utility component
  return null;
};

/**
 * Simple Performance Dashboard Component for debugging
 */
const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = React.useState(getWebVitalsSummary());
  
  useEffect(() => {
    // Update metrics every 5 seconds
    const interval = setInterval(() => {
      setMetrics(getWebVitalsSummary());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'needs-improvement':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50 w-80 opacity-90 hover:opacity-100 transition-opacity">
      <h3 className="text-sm font-semibold mb-2 flex justify-between">
        <span>Performance Metrics</span>
        <span className="text-xs text-gray-500">Real-time</span>
      </h3>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span>LCP:</span>
          <div className="flex items-center space-x-2">
            <span>{metrics.lcp.value.toFixed(0)}ms</span>
            <span className={`px-2 py-0.5 rounded ${getRatingColor(metrics.lcp.rating)}`}>
              {metrics.lcp.rating}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span>FID:</span>
          <div className="flex items-center space-x-2">
            <span>{metrics.fid.value.toFixed(0)}ms</span>
            <span className={`px-2 py-0.5 rounded ${getRatingColor(metrics.fid.rating)}`}>
              {metrics.fid.rating}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span>CLS:</span>
          <div className="flex items-center space-x-2">
            <span>{metrics.cls.value.toFixed(3)}</span>
            <span className={`px-2 py-0.5 rounded ${getRatingColor(metrics.cls.rating)}`}>
              {metrics.cls.rating}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span>TTFB:</span>
          <div className="flex items-center space-x-2">
            <span>{metrics.ttfb.value.toFixed(0)}ms</span>
            <span className={`px-2 py-0.5 rounded ${getRatingColor(metrics.ttfb.rating)}`}>
              {metrics.ttfb.rating}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span>FCP:</span>
          <div className="flex items-center space-x-2">
            <span>{metrics.fcp.value.toFixed(0)}ms</span>
            <span className={`px-2 py-0.5 rounded ${getRatingColor(metrics.fcp.rating)}`}>
              {metrics.fcp.rating}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
        See full report in browser console (debug mode)
      </div>
    </div>
  );
};
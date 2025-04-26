/**
 * Performance Monitoring Utilities for Mobile
 * 
 * Tools for monitoring and measuring React Native component performance,
 * especially during CRDT synchronization and conflict resolution.
 */

import React, { Profiler, ProfilerOnRenderCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Performance metrics
interface PerformanceMetrics {
  componentId: string;
  actualDuration: number;
  baseDuration: number;
  timestamp: number;
  phase: 'mount' | 'update';
}

// Dictionary of metrics by component ID
const metricsHistory: Record<string, PerformanceMetrics[]> = {};

// AsyncStorage key for performance metrics
const METRICS_STORAGE_KEY = '@terrafusion:performance_metrics';

// Max history items to keep per component
const MAX_HISTORY = 50;

/**
 * Log performance metrics to the console
 * 
 * @param metrics Performance metrics
 */
export function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  console.log(`[Performance] ${metrics.componentId} ${metrics.phase}: actual=${metrics.actualDuration.toFixed(2)}ms, base=${metrics.baseDuration.toFixed(2)}ms`);
}

/**
 * Store performance metrics
 * 
 * @param metrics Performance metrics
 */
export function storePerformanceMetrics(metrics: PerformanceMetrics): void {
  if (!metricsHistory[metrics.componentId]) {
    metricsHistory[metrics.componentId] = [];
  }
  
  metricsHistory[metrics.componentId].push(metrics);
  
  // Keep history size limited
  if (metricsHistory[metrics.componentId].length > MAX_HISTORY) {
    metricsHistory[metrics.componentId].shift();
  }
  
  // Persist metrics to AsyncStorage (debounced)
  persistMetricsDebounced();
}

// Debounce timer for persisting metrics
let persistTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Persist metrics to AsyncStorage with debouncing
 */
function persistMetricsDebounced(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  
  persistTimer = setTimeout(() => {
    persistMetrics();
  }, 5000); // Wait 5 seconds before persisting
}

/**
 * Persist metrics to AsyncStorage
 */
async function persistMetrics(): Promise<void> {
  try {
    await AsyncStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metricsHistory));
    console.log('[Performance] Metrics persisted to AsyncStorage');
  } catch (error) {
    console.error('[Performance] Failed to persist metrics:', error);
  }
}

/**
 * Load metrics from AsyncStorage
 */
export async function loadMetrics(): Promise<void> {
  try {
    const storedMetrics = await AsyncStorage.getItem(METRICS_STORAGE_KEY);
    
    if (storedMetrics) {
      const parsedMetrics = JSON.parse(storedMetrics);
      
      // Merge with current metrics
      Object.keys(parsedMetrics).forEach(key => {
        metricsHistory[key] = parsedMetrics[key];
      });
      
      console.log('[Performance] Loaded metrics from AsyncStorage');
    }
  } catch (error) {
    console.error('[Performance] Failed to load metrics:', error);
  }
}

/**
 * Get performance metrics for a component
 * 
 * @param componentId Component ID
 * @returns Performance metrics history
 */
export function getPerformanceMetrics(componentId: string): PerformanceMetrics[] {
  return metricsHistory[componentId] || [];
}

/**
 * Get the average performance metrics for a component
 * 
 * @param componentId Component ID
 * @returns Average performance metrics
 */
export function getAveragePerformanceMetrics(componentId: string): { avgActualDuration: number; avgBaseDuration: number } {
  const metrics = getPerformanceMetrics(componentId);
  
  if (metrics.length === 0) {
    return { avgActualDuration: 0, avgBaseDuration: 0 };
  }
  
  const totalActual = metrics.reduce((sum, m) => sum + m.actualDuration, 0);
  const totalBase = metrics.reduce((sum, m) => sum + m.baseDuration, 0);
  
  return {
    avgActualDuration: totalActual / metrics.length,
    avgBaseDuration: totalBase / metrics.length
  };
}

/**
 * Clear performance metrics
 * 
 * @param componentId Optional component ID to clear. If not provided, clears all metrics.
 */
export async function clearPerformanceMetrics(componentId?: string): Promise<void> {
  if (componentId) {
    delete metricsHistory[componentId];
  } else {
    Object.keys(metricsHistory).forEach(id => {
      delete metricsHistory[id];
    });
  }
  
  try {
    if (componentId) {
      // Load, modify and save if clearing just one component
      const stored = await AsyncStorage.getItem(METRICS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        delete parsed[componentId];
        await AsyncStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(parsed));
      }
    } else {
      // Clear all metrics
      await AsyncStorage.removeItem(METRICS_STORAGE_KEY);
    }
    
    console.log(`[Performance] Cleared metrics${componentId ? ` for ${componentId}` : ''}`);
  } catch (error) {
    console.error('[Performance] Failed to clear metrics:', error);
  }
}

/**
 * Standard profiler callback
 */
export const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  const metrics: PerformanceMetrics = {
    componentId: id,
    actualDuration,
    baseDuration,
    timestamp: Date.now(),
    phase: phase === 'mount' ? 'mount' : 'update'
  };
  
  storePerformanceMetrics(metrics);
};

/**
 * Performance profiler component
 */
export const PerformanceProfiler: React.FC<{
  id: string;
  children: React.ReactNode;
  log?: boolean;
}> = ({ id, children, log = false }) => {
  const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    const metrics: PerformanceMetrics = {
      componentId: id,
      actualDuration,
      baseDuration,
      timestamp: Date.now(),
      phase: phase === 'mount' ? 'mount' : 'update'
    };
    
    storePerformanceMetrics(metrics);
    
    if (log) {
      logPerformanceMetrics(metrics);
    }
  };
  
  return (
    <Profiler id={id} onRender={onRender}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </Profiler>
  );
};

/**
 * Hook to measure and log render duration
 * 
 * @param componentName Name of the component
 * @param options Options
 */
export function useRenderProfiling(
  componentName: string,
  options: { log?: boolean } = {}
): void {
  const { log = false } = options;
  const renderStart = useRef<number>(0);
  const renderCount = useRef<number>(0);
  
  useEffect(() => {
    const duration = performance.now() - renderStart.current;
    renderCount.current += 1;
    
    const metrics: PerformanceMetrics = {
      componentId: componentName,
      actualDuration: duration,
      baseDuration: duration, // We don't have baseDuration in hooks
      timestamp: Date.now(),
      phase: renderCount.current === 1 ? 'mount' : 'update'
    };
    
    storePerformanceMetrics(metrics);
    
    if (log) {
      logPerformanceMetrics(metrics);
    }
  });
  
  // Reset the timer before each render
  renderStart.current = performance.now();
}

/**
 * Export a downloadable performance report
 */
export function getPerformanceReport(): string {
  const report = {
    timestamp: new Date().toISOString(),
    metrics: metricsHistory,
    summary: Object.keys(metricsHistory).map(componentId => {
      const { avgActualDuration, avgBaseDuration } = getAveragePerformanceMetrics(componentId);
      return {
        componentId,
        sampleCount: metricsHistory[componentId].length,
        avgActualDuration,
        avgBaseDuration
      };
    })
  };
  
  return JSON.stringify(report, null, 2);
}

// Initialize by loading metrics
loadMetrics();
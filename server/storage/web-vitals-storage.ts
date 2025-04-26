/**
 * Web Vitals Storage Implementation
 * 
 * Provides storage methods for Web Vitals data, including raw metrics,
 * aggregated metrics, performance budgets, and alerts.
 */

import { 
  webVitalsMetrics, WebVitalsMetric, InsertWebVitalsMetric,
  webVitalsReports, WebVitalsReport, InsertWebVitalsReport,
  webVitalsAggregates, WebVitalsAggregate, InsertWebVitalsAggregate,
  webVitalsBudgets, WebVitalsBudget, InsertWebVitalsBudget,
  webVitalsAlerts, WebVitalsAlert, InsertWebVitalsAlert 
} from "@shared/web-vitals-schema";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// Time range in milliseconds
const TIME_RANGES = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

/**
 * Store a Web Vitals report in the database
 * 
 * @param db Database connection
 * @param report Web Vitals report
 */
export async function storeWebVitalsReport(db: NodePgDatabase<any>, report: any): Promise<void> {
  console.log('Storing Web Vitals report:', report.url, report.metrics.length, 'metrics');
  
  try {
    // Save the report
    await db.insert(webVitalsReports).values({
      timestamp: new Date(report.timestamp),
      url: report.url,
      metrics: report.metrics,
      percentiles: report.percentiles || null,
      deviceInfo: report.deviceInfo || null,
      tags: report.tags || null
    });
    
    // Also insert individual metrics for detailed analysis
    const metricsToInsert: InsertWebVitalsMetric[] = report.metrics.map((metric: any) => ({
      name: metric.name,
      value: metric.value,
      delta: metric.delta,
      metricId: metric.id,
      timestamp: new Date(metric.timestamp),
      navigationType: metric.navigationType || null,
      rating: metric.rating || null,
      url: report.url,
      userId: (report.tags && report.tags.userId) || null,
      sessionId: (report.tags && report.tags.sessionId) || null,
      deviceType: report.deviceInfo?.deviceType || null,
      browser: report.deviceInfo?.browser || null,
      connection: report.deviceInfo?.connection || null,
      deviceInfo: report.deviceInfo || null,
      tags: report.tags || null
    }));
    
    // Insert metrics in batches to avoid too large queries
    const batchSize = 50;
    for (let i = 0; i < metricsToInsert.length; i += batchSize) {
      const batch = metricsToInsert.slice(i, i + batchSize);
      await db.insert(webVitalsMetrics).values(batch);
    }
    
    // Update the report as processed
    await db.update(webVitalsReports)
      .set({ processed: true })
      .where(and(
        eq(webVitalsReports.url, report.url),
        eq(webVitalsReports.timestamp, new Date(report.timestamp))
      ));
      
    // Trigger aggregation for the new metrics
    await aggregateWebVitalsMetrics(db);
    
    // Check for budget violations
    await checkPerformanceBudgets(db);
    
  } catch (error) {
    console.error('Error storing Web Vitals report:', error);
    throw error;
  }
}

/**
 * Store a single Web Vitals metric
 * 
 * @param db Database connection
 * @param metric Web Vitals metric
 */
export async function storeWebVitalsMetric(db: NodePgDatabase<any>, metric: any): Promise<void> {
  console.log('Storing Web Vitals metric:', metric.name, metric.value);
  
  try {
    await db.insert(webVitalsMetrics).values({
      name: metric.name,
      value: metric.value,
      delta: metric.delta,
      metricId: metric.id,
      timestamp: new Date(metric.timestamp),
      navigationType: metric.navigationType || null,
      rating: metric.rating || null,
      url: metric.url,
      userId: metric.userId || null,
      sessionId: metric.sessionId || null,
      deviceType: metric.deviceType || null,
      browser: metric.browser || null,
      connection: metric.connection || null,
      deviceInfo: metric.deviceInfo || null,
      tags: metric.tags || null
    });
  } catch (error) {
    console.error('Error storing Web Vitals metric:', error);
    throw error;
  }
}

/**
 * Get Web Vitals metrics based on time range and optional filters
 * 
 * @param db Database connection
 * @param timeRange Time range (1h, 24h, 7d, 30d, 90d)
 * @param metricName Optional metric name filter
 * @param limit Optional limit of results
 * @returns Array of Web Vitals metrics
 */
export async function getWebVitalsMetrics(
  db: NodePgDatabase<any>,
  timeRange: string,
  metricName?: string,
  limit: number = 100
): Promise<WebVitalsMetric[]> {
  const timeRangeMs = TIME_RANGES[timeRange as keyof typeof TIME_RANGES] || TIME_RANGES['24h'];
  const startTime = new Date(Date.now() - timeRangeMs);
  
  try {
    let query = db.select()
      .from(webVitalsMetrics)
      .where(gte(webVitalsMetrics.timestamp, startTime))
      .orderBy(desc(webVitalsMetrics.timestamp))
      .limit(limit);
    
    if (metricName) {
      query = query.where(eq(webVitalsMetrics.name, metricName));
    }
    
    return await query;
  } catch (error) {
    console.error('Error fetching Web Vitals metrics:', error);
    throw error;
  }
}

/**
 * Get Web Vitals summary with percentiles and distribution
 * 
 * @param db Database connection
 * @param timeRange Time range (1h, 24h, 7d, 30d, 90d)
 * @returns Summary of Web Vitals metrics
 */
export async function getWebVitalsSummary(
  db: NodePgDatabase<any>,
  timeRange: string
): Promise<{
  lcp: { p50: number; p75: number; p95: number; good: number; needsImprovement: number; poor: number };
  fid: { p50: number; p75: number; p95: number; good: number; needsImprovement: number; poor: number };
  cls: { p50: number; p75: number; p95: number; good: number; needsImprovement: number; poor: number };
  ttfb: { p50: number; p75: number; p95: number; good: number; needsImprovement: number; poor: number };
  fcp: { p50: number; p75: number; p95: number; good: number; needsImprovement: number; poor: number };
}> {
  const timeRangeMs = TIME_RANGES[timeRange as keyof typeof TIME_RANGES] || TIME_RANGES['24h'];
  const startTime = new Date(Date.now() - timeRangeMs);
  
  try {
    // Get aggregates for each metric
    const lcpAggregates = await getMetricAggregates(db, 'LCP', startTime);
    const fidAggregates = await getMetricAggregates(db, 'FID', startTime);
    const clsAggregates = await getMetricAggregates(db, 'CLS', startTime);
    const ttfbAggregates = await getMetricAggregates(db, 'TTFB', startTime);
    const fcpAggregates = await getMetricAggregates(db, 'FCP', startTime);
    
    // Get distributions for each metric
    const lcpDistribution = await getMetricDistribution(db, 'LCP', startTime);
    const fidDistribution = await getMetricDistribution(db, 'FID', startTime);
    const clsDistribution = await getMetricDistribution(db, 'CLS', startTime);
    const ttfbDistribution = await getMetricDistribution(db, 'TTFB', startTime);
    const fcpDistribution = await getMetricDistribution(db, 'FCP', startTime);
    
    return {
      lcp: {
        p50: lcpAggregates.p50 || 0,
        p75: lcpAggregates.p75 || 0,
        p95: lcpAggregates.p95 || 0,
        good: lcpDistribution.good || 0,
        needsImprovement: lcpDistribution.needsImprovement || 0,
        poor: lcpDistribution.poor || 0
      },
      fid: {
        p50: fidAggregates.p50 || 0,
        p75: fidAggregates.p75 || 0,
        p95: fidAggregates.p95 || 0,
        good: fidDistribution.good || 0,
        needsImprovement: fidDistribution.needsImprovement || 0,
        poor: fidDistribution.poor || 0
      },
      cls: {
        p50: clsAggregates.p50 || 0,
        p75: clsAggregates.p75 || 0,
        p95: clsAggregates.p95 || 0,
        good: clsDistribution.good || 0,
        needsImprovement: clsDistribution.needsImprovement || 0,
        poor: clsDistribution.poor || 0
      },
      ttfb: {
        p50: ttfbAggregates.p50 || 0,
        p75: ttfbAggregates.p75 || 0,
        p95: ttfbAggregates.p95 || 0,
        good: ttfbDistribution.good || 0,
        needsImprovement: ttfbDistribution.needsImprovement || 0,
        poor: ttfbDistribution.poor || 0
      },
      fcp: {
        p50: fcpAggregates.p50 || 0,
        p75: fcpAggregates.p75 || 0,
        p95: fcpAggregates.p95 || 0,
        good: fcpDistribution.good || 0,
        needsImprovement: fcpDistribution.needsImprovement || 0,
        poor: fcpDistribution.poor || 0
      }
    };
  } catch (error) {
    console.error('Error fetching Web Vitals summary:', error);
    throw error;
  }
}

/**
 * Get percentiles for a specific metric
 * 
 * @param db Database connection
 * @param metricName Metric name
 * @param startTime Start time for filtering
 * @returns Percentiles (p50, p75, p95)
 */
async function getMetricAggregates(
  db: NodePgDatabase<any>,
  metricName: string,
  startTime: Date
): Promise<{ p50: number; p75: number; p95: number }> {
  // First check if we have aggregates
  const aggregates = await db.select()
    .from(webVitalsAggregates)
    .where(and(
      eq(webVitalsAggregates.metricName, metricName),
      gte(webVitalsAggregates.startTime, startTime)
    ))
    .orderBy(desc(webVitalsAggregates.startTime))
    .limit(1);
  
  if (aggregates.length > 0) {
    const aggregate = aggregates[0];
    return {
      p50: Number(aggregate.p50),
      p75: Number(aggregate.p75),
      p95: Number(aggregate.p95)
    };
  }
  
  // If no aggregates, calculate directly from metrics
  const result = await db.select({
    p50: sql`percentile_cont(0.5) within group (order by ${webVitalsMetrics.value})`,
    p75: sql`percentile_cont(0.75) within group (order by ${webVitalsMetrics.value})`,
    p95: sql`percentile_cont(0.95) within group (order by ${webVitalsMetrics.value})`
  })
  .from(webVitalsMetrics)
  .where(and(
    eq(webVitalsMetrics.name, metricName),
    gte(webVitalsMetrics.timestamp, startTime)
  ));
  
  return result.length > 0 ? {
    p50: Number(result[0].p50 || 0),
    p75: Number(result[0].p75 || 0),
    p95: Number(result[0].p95 || 0)
  } : { p50: 0, p75: 0, p95: 0 };
}

/**
 * Get distribution for a specific metric (good, needs improvement, poor)
 * 
 * @param db Database connection
 * @param metricName Metric name
 * @param startTime Start time for filtering
 * @returns Distribution counts
 */
async function getMetricDistribution(
  db: NodePgDatabase<any>,
  metricName: string,
  startTime: Date
): Promise<{ good: number; needsImprovement: number; poor: number }> {
  const result = await db.select({
    rating: webVitalsMetrics.rating,
    count: sql`count(*)`.as('count')
  })
  .from(webVitalsMetrics)
  .where(and(
    eq(webVitalsMetrics.name, metricName),
    gte(webVitalsMetrics.timestamp, startTime)
  ))
  .groupBy(webVitalsMetrics.rating);
  
  const distribution = {
    good: 0,
    needsImprovement: 0,
    poor: 0
  };
  
  result.forEach(r => {
    if (r.rating === 'good') distribution.good = Number(r.count);
    if (r.rating === 'needs-improvement') distribution.needsImprovement = Number(r.count);
    if (r.rating === 'poor') distribution.poor = Number(r.count);
  });
  
  return distribution;
}

/**
 * Get Web Vitals aggregates for charting and analysis
 * 
 * @param db Database connection
 * @param timeRange Time range (1h, 24h, 7d, 30d, 90d)
 * @param metricName Optional metric name filter
 * @param urlPattern Optional URL pattern filter
 * @returns Array of Web Vitals aggregates
 */
export async function getWebVitalsAggregates(
  db: NodePgDatabase<any>,
  timeRange: string,
  metricName?: string,
  urlPattern?: string
): Promise<WebVitalsAggregate[]> {
  const timeRangeMs = TIME_RANGES[timeRange as keyof typeof TIME_RANGES] || TIME_RANGES['24h'];
  const startTime = new Date(Date.now() - timeRangeMs);
  
  try {
    let query = db.select()
      .from(webVitalsAggregates)
      .where(gte(webVitalsAggregates.startTime, startTime))
      .orderBy(webVitalsAggregates.startTime);
    
    if (metricName) {
      query = query.where(eq(webVitalsAggregates.metricName, metricName));
    }
    
    if (urlPattern) {
      query = query.where(eq(webVitalsAggregates.urlPattern, urlPattern));
    }
    
    return await query;
  } catch (error) {
    console.error('Error fetching Web Vitals aggregates:', error);
    throw error;
  }
}

/**
 * Create a Web Vitals performance budget
 * 
 * @param db Database connection
 * @param budget Performance budget
 * @returns Created performance budget
 */
export async function createWebVitalsPerformanceBudget(
  db: NodePgDatabase<any>,
  budget: InsertWebVitalsBudget
): Promise<WebVitalsBudget> {
  try {
    const result = await db.insert(webVitalsBudgets)
      .values({
        metricName: budget.metricName,
        urlPattern: budget.urlPattern,
        device: budget.device,
        budget: budget.budget,
        severity: budget.severity,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return result[0];
  } catch (error) {
    console.error('Error creating Web Vitals performance budget:', error);
    throw error;
  }
}

/**
 * Get Web Vitals performance budgets
 * 
 * @param db Database connection
 * @returns Array of performance budgets
 */
export async function getWebVitalsPerformanceBudgets(
  db: NodePgDatabase<any>
): Promise<WebVitalsBudget[]> {
  try {
    return await db.select().from(webVitalsBudgets);
  } catch (error) {
    console.error('Error fetching Web Vitals performance budgets:', error);
    throw error;
  }
}

/**
 * Get Web Vitals alerts based on time range and acknowledgement status
 * 
 * @param db Database connection
 * @param timeRange Time range (1h, 24h, 7d, 30d, 90d)
 * @param acknowledged Optional filter by acknowledgement status
 * @returns Array of Web Vitals alerts
 */
export async function getWebVitalsAlerts(
  db: NodePgDatabase<any>,
  timeRange: string,
  acknowledged?: boolean
): Promise<WebVitalsAlert[]> {
  const timeRangeMs = TIME_RANGES[timeRange as keyof typeof TIME_RANGES] || TIME_RANGES['24h'];
  const startTime = new Date(Date.now() - timeRangeMs);
  
  try {
    let query = db.select()
      .from(webVitalsAlerts)
      .where(gte(webVitalsAlerts.timestamp, startTime))
      .orderBy(desc(webVitalsAlerts.timestamp));
    
    if (acknowledged !== undefined) {
      query = query.where(eq(webVitalsAlerts.acknowledged, acknowledged));
    }
    
    return await query;
  } catch (error) {
    console.error('Error fetching Web Vitals alerts:', error);
    throw error;
  }
}

/**
 * Acknowledge a Web Vitals alert
 * 
 * @param db Database connection
 * @param id Alert ID
 * @param userId User ID of the acknowledger
 */
export async function acknowledgeWebVitalsAlert(
  db: NodePgDatabase<any>,
  id: number,
  userId: string
): Promise<void> {
  try {
    await db.update(webVitalsAlerts)
      .set({
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date()
      })
      .where(eq(webVitalsAlerts.id, id));
  } catch (error) {
    console.error('Error acknowledging Web Vitals alert:', error);
    throw error;
  }
}

/**
 * Aggregate Web Vitals metrics into hourly aggregates
 * This is typically called after storing a batch of metrics
 * 
 * @param db Database connection
 */
async function aggregateWebVitalsMetrics(db: NodePgDatabase<any>): Promise<void> {
  try {
    // Get the latest aggregate time for each metric and URL pattern
    const latestAggregates = await db.select({
      metricName: webVitalsAggregates.metricName,
      urlPattern: webVitalsAggregates.urlPattern,
      latestEndTime: sql`max(${webVitalsAggregates.endTime})`.as('latest_end_time')
    })
    .from(webVitalsAggregates)
    .groupBy(webVitalsAggregates.metricName, webVitalsAggregates.urlPattern);
    
    // For each metric, create hourly aggregates
    const now = new Date();
    
    // Get distinct metrics and URL patterns
    const metrics = await db.select({
      name: webVitalsMetrics.name,
      url: sql`regexp_replace(${webVitalsMetrics.url}, '^(https?://[^/]+/[^/]+).*', '\1')`.as('url_pattern')
    })
    .from(webVitalsMetrics)
    .groupBy(webVitalsMetrics.name, sql`regexp_replace(${webVitalsMetrics.url}, '^(https?://[^/]+/[^/]+).*', '\1')`);
    
    for (const metric of metrics) {
      // Find the latest aggregate for this metric and URL pattern
      const latestAggregate = latestAggregates.find(
        a => a.metricName === metric.name && a.urlPattern === metric.url
      );
      
      // If there's a latest aggregate, start from its end time
      // Otherwise, start from 24 hours ago
      const startTime = latestAggregate?.latestEndTime || new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Create hourly aggregates from startTime to now
      const hourlyIntervals = [];
      let currentStart = new Date(startTime);
      
      while (currentStart < now) {
        const currentEnd = new Date(currentStart.getTime() + 60 * 60 * 1000);
        
        if (currentEnd > now) {
          break; // Don't create partial hours
        }
        
        hourlyIntervals.push({
          startTime: currentStart,
          endTime: currentEnd
        });
        
        currentStart = currentEnd;
      }
      
      // For each hourly interval, create an aggregate
      for (const interval of hourlyIntervals) {
        // Get metrics for this interval
        const metricValues = await db.select({
          value: webVitalsMetrics.value,
          device: webVitalsMetrics.deviceType,
          connection: webVitalsMetrics.connection
        })
        .from(webVitalsMetrics)
        .where(and(
          eq(webVitalsMetrics.name, metric.name),
          sql`regexp_replace(${webVitalsMetrics.url}, '^(https?://[^/]+/[^/]+).*', '\1') = ${metric.url}`,
          gte(webVitalsMetrics.timestamp, interval.startTime),
          lt(webVitalsMetrics.timestamp, interval.endTime)
        ));
        
        if (metricValues.length === 0) {
          continue; // No metrics for this interval
        }
        
        // Calculate aggregates
        const values = metricValues.map(m => Number(m.value));
        values.sort((a, b) => a - b);
        
        const count = values.length;
        const min = values[0];
        const max = values[values.length - 1];
        const avg = values.reduce((a, b) => a + b, 0) / count;
        const p50 = values[Math.floor(0.5 * count)];
        const p75 = values[Math.floor(0.75 * count)];
        const p95 = values[Math.floor(0.95 * count)];
        const p99 = values[Math.floor(0.99 * count)] || max;
        
        // Get most common device and connection
        const deviceCounts: Record<string, number> = {};
        const connectionCounts: Record<string, number> = {};
        
        metricValues.forEach(m => {
          if (m.device) {
            deviceCounts[m.device] = (deviceCounts[m.device] || 0) + 1;
          }
          if (m.connection) {
            connectionCounts[m.connection] = (connectionCounts[m.connection] || 0) + 1;
          }
        });
        
        let topDevice = null;
        let topDeviceCount = 0;
        
        for (const [device, count] of Object.entries(deviceCounts)) {
          if (count > topDeviceCount) {
            topDevice = device;
            topDeviceCount = count;
          }
        }
        
        let topConnection = null;
        let topConnectionCount = 0;
        
        for (const [connection, count] of Object.entries(connectionCounts)) {
          if (connection && connection !== 'unknown' && count > topConnectionCount) {
            topConnection = connection;
            topConnectionCount = count;
          }
        }
        
        // Create aggregate
        await db.insert(webVitalsAggregates).values({
          metricName: metric.name,
          startTime: interval.startTime,
          endTime: interval.endTime,
          urlPattern: metric.url,
          device: topDevice,
          connection: topConnection,
          count,
          p50,
          p75,
          p95,
          p99,
          min,
          max,
          avg
        });
      }
    }
  } catch (error) {
    console.error('Error aggregating Web Vitals metrics:', error);
  }
}

/**
 * Check for performance budget violations and create alerts
 * 
 * @param db Database connection
 */
async function checkPerformanceBudgets(db: NodePgDatabase<any>): Promise<void> {
  try {
    // Get all budgets
    const budgets = await db.select().from(webVitalsBudgets);
    
    // For each budget, check recent metrics
    for (const budget of budgets) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Get p95 for this metric and URL pattern in the last day
      const result = await db.select({
        p95: sql`percentile_cont(0.95) within group (order by ${webVitalsMetrics.value})`
      })
      .from(webVitalsMetrics)
      .where(and(
        eq(webVitalsMetrics.name, budget.metricName),
        gte(webVitalsMetrics.timestamp, oneDayAgo),
        sql`${webVitalsMetrics.url} ~ ${budget.urlPattern}`
      ));
      
      if (result.length === 0 || !result[0].p95) {
        continue; // No metrics for this budget
      }
      
      const p95Value = Number(result[0].p95);
      
      // If p95 exceeds budget, create an alert
      if (p95Value > Number(budget.budget)) {
        // Check if we already have an unacknowledged alert for this budget
        const existingAlerts = await db.select()
          .from(webVitalsAlerts)
          .where(and(
            eq(webVitalsAlerts.metricName, budget.metricName),
            eq(webVitalsAlerts.urlPattern, budget.urlPattern),
            eq(webVitalsAlerts.acknowledged, false)
          ));
        
        if (existingAlerts.length === 0) {
          // Create a new alert
          await db.insert(webVitalsAlerts).values({
            metricName: budget.metricName,
            urlPattern: budget.urlPattern,
            device: budget.device,
            budget: Number(budget.budget),
            actual: p95Value,
            severity: budget.severity,
            timestamp: new Date(),
            acknowledged: false
          });
          
          console.log(`Created Web Vitals alert: ${budget.metricName} ${budget.urlPattern} p95=${p95Value} budget=${budget.budget}`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking performance budgets:', error);
  }
}
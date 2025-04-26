/**
 * Web Vitals Routes
 * 
 * Endpoints for collecting and analyzing Web Vitals metrics
 * from real users for performance monitoring.
 */
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { randomUUID } from 'crypto';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { 
  webVitalsMetrics, 
  webVitalsReports, 
  webVitalsAggregates, 
  webVitalsBudgets, 
  webVitalsAlerts,
  insertWebVitalsMetricsSchema,
  insertWebVitalsReportsSchema,
  insertWebVitalsAggregatesSchema,
  insertWebVitalsBudgetsSchema,
  insertWebVitalsAlertsSchema
} from '../../shared/web-vitals-schema';

const router = Router();

/**
 * POST /api/analytics/web-vitals
 * Store a single web vitals metric
 */
router.post('/web-vitals', async (req: Request, res: Response) => {
  try {
    const data = insertWebVitalsMetricsSchema.parse({
      ...req.body,
      id: randomUUID(),
    });
    
    await storage.db.insert(webVitalsMetrics).values(data);
    
    res.status(201).json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error storing web vitals metric:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to store web vitals metric',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/analytics/web-vitals/batch
 * Store a batch of web vitals metrics
 */
router.post('/web-vitals/batch', async (req: Request, res: Response) => {
  try {
    const { metrics, deviceInfo, percentiles, tags } = req.body;
    
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No metrics provided or invalid format' 
      });
    }
    
    // Create a report record
    const reportId = randomUUID();
    const report = {
      id: reportId,
      url: metrics[0]?.url || '',
      metrics: metrics,
      device_info: deviceInfo, // Convert camelCase to snake_case for DB
      percentiles,
      tags
    };
    
    await storage.db.insert(webVitalsReports).values(report);
    
    // Insert individual metrics with field names matching schema
    const metricsToInsert = metrics.map((metric: any) => ({
      id: randomUUID(),
      name: metric.name,
      value: metric.value,
      delta: metric.delta || 0,
      rating: metric.rating,
      navigation_type: metric.navigationType, // Convert camelCase to snake_case for DB
      url: metric.url,
      user_agent: metric.userAgent, // Convert camelCase to snake_case for DB
      device_type: metric.deviceType, // Convert camelCase to snake_case for DB
      connection_type: metric.connectionType, // Convert camelCase to snake_case for DB
      effective_connection_type: metric.effectiveConnectionType, // Convert camelCase to snake_case for DB
      user_id: metric.userId, // Convert camelCase to snake_case for DB
      session_id: metric.sessionId, // Convert camelCase to snake_case for DB
      tags: metric.tags
    }));
    
    if (metricsToInsert.length > 0) {
      await storage.db.insert(webVitalsMetrics).values(metricsToInsert);
    }
    
    res.status(201).json({ 
      success: true, 
      reportId,
      metricsCount: metricsToInsert.length 
    });
  } catch (error) {
    console.error('Error storing web vitals batch:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to store web vitals batch',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/analytics/web-vitals
 * Get web vitals metrics
 */
router.get('/web-vitals', async (req: Request, res: Response) => {
  try {
    const { 
      metricName, 
      startDate, 
      endDate, 
      limit = 100,
      url,
      deviceType 
    } = req.query;
    
    let query = storage.db.select().from(webVitalsMetrics);
    
    // Apply filters
    if (metricName) {
      query = query.where(eq(webVitalsMetrics.name, metricName as string));
    }
    
    if (startDate) {
      query = query.where(gte(webVitalsMetrics.timestamp, new Date(startDate as string)));
    }
    
    if (endDate) {
      query = query.where(lte(webVitalsMetrics.timestamp, new Date(endDate as string)));
    }
    
    if (url) {
      query = query.where(eq(webVitalsMetrics.url, url as string));
    }
    
    if (deviceType) {
      query = query.where(eq(webVitalsMetrics.device_type, deviceType as string));
    }
    
    // Order by timestamp desc
    query = query.orderBy(webVitalsMetrics.timestamp).limit(Number(limit));
    
    const metrics = await query;
    
    res.json({ 
      success: true, 
      count: metrics.length,
      metrics
    });
  } catch (error) {
    console.error('Error retrieving web vitals metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve web vitals metrics' 
    });
  }
});

/**
 * GET /api/analytics/web-vitals/summary
 * Get web vitals summary with percentiles and distribution
 */
router.get('/web-vitals/summary', async (req: Request, res: Response) => {
  try {
    const { 
      metricName = 'LCP', 
      startDate, 
      endDate, 
      url,
      deviceType 
    } = req.query;
    
    // Build conditions array for query
    const conditions = [];
    
    if (metricName) {
      conditions.push(eq(webVitalsMetrics.name, metricName as string));
    }
    
    if (startDate) {
      conditions.push(gte(webVitalsMetrics.timestamp, new Date(startDate as string)));
    }
    
    if (endDate) {
      conditions.push(lte(webVitalsMetrics.timestamp, new Date(endDate as string)));
    }
    
    if (url) {
      conditions.push(eq(webVitalsMetrics.url, url as string));
    }
    
    if (deviceType) {
      conditions.push(eq(webVitalsMetrics.device_type, deviceType as string));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get metrics
    const metrics = await storage.db.select().from(webVitalsMetrics)
      .where(whereClause)
      .orderBy(webVitalsMetrics.timestamp);
    
    if (metrics.length === 0) {
      return res.json({ 
        success: true, 
        count: 0,
        summary: null,
        percentiles: null,
        distribution: null
      });
    }
    
    // Calculate percentiles
    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const total = values.reduce((sum, value) => sum + value, 0);
    const count = values.length;
    const avg = total / count;
    const median = count % 2 === 0 
      ? (values[count/2 - 1] + values[count/2]) / 2 
      : values[Math.floor(count/2)];
    
    // Calculate percentiles
    const p75Index = Math.floor(count * 0.75);
    const p90Index = Math.floor(count * 0.9);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);
    
    const p75 = values[p75Index];
    const p90 = values[p90Index];
    const p95 = values[p95Index];
    const p99 = values[p99Index];
    
    // Calculate distribution (good, needs improvement, poor)
    const distribution = {
      good: 0,
      needsImprovement: 0,
      poor: 0
    };
    
    metrics.forEach(metric => {
      if (metric.rating === 'good') {
        distribution.good++;
      } else if (metric.rating === 'needs-improvement') {
        distribution.needsImprovement++;
      } else if (metric.rating === 'poor') {
        distribution.poor++;
      }
    });
    
    const summary = {
      metricName,
      count,
      min: values[0],
      max: values[values.length - 1],
      avg,
      median
    };
    
    const percentiles = {
      p75,
      p90,
      p95,
      p99
    };
    
    // Calculate distribution percentages
    const distributionPercentages = {
      good: Math.round((distribution.good / count) * 100),
      needsImprovement: Math.round((distribution.needsImprovement / count) * 100),
      poor: Math.round((distribution.poor / count) * 100),
      raw: distribution
    };
    
    res.json({ 
      success: true, 
      count,
      summary,
      percentiles,
      distribution: distributionPercentages
    });
  } catch (error) {
    console.error('Error generating web vitals summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate web vitals summary' 
    });
  }
});

/**
 * GET /api/analytics/web-vitals/aggregates
 * Get web vitals aggregates for charting and analysis
 */
router.get('/web-vitals/aggregates', async (req: Request, res: Response) => {
  try {
    const { 
      metricName, 
      startDate, 
      endDate, 
      urlPattern,
      deviceType 
    } = req.query;
    
    let query = storage.db.select().from(webVitalsAggregates);
    
    // Apply filters
    if (metricName) {
      query = query.where(eq(webVitalsAggregates.metricName, metricName as string));
    }
    
    if (startDate) {
      query = query.where(gte(webVitalsAggregates.timestamp, new Date(startDate as string)));
    }
    
    if (endDate) {
      query = query.where(lte(webVitalsAggregates.timestamp, new Date(endDate as string)));
    }
    
    if (urlPattern) {
      query = query.where(eq(webVitalsAggregates.urlPattern, urlPattern as string));
    }
    
    if (deviceType) {
      query = query.where(eq(webVitalsAggregates.device_type, deviceType as string));
    }
    
    // Order by timestamp
    query = query.orderBy(webVitalsAggregates.timestamp);
    
    const aggregates = await query;
    
    res.json({ 
      success: true, 
      count: aggregates.length,
      aggregates
    });
  } catch (error) {
    console.error('Error retrieving web vitals aggregates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve web vitals aggregates' 
    });
  }
});

/**
 * POST /api/analytics/web-vitals/budgets
 * Create a web vitals performance budget
 */
router.post('/web-vitals/budgets', async (req: Request, res: Response) => {
  try {
    const data = insertWebVitalsBudgetsSchema.parse({
      ...req.body,
      id: randomUUID(),
    });
    
    await storage.db.insert(webVitalsBudgets).values(data);
    
    res.status(201).json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error creating web vitals budget:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create web vitals budget' 
    });
  }
});

/**
 * GET /api/analytics/web-vitals/budgets
 * Get web vitals performance budgets
 */
router.get('/web-vitals/budgets', async (req: Request, res: Response) => {
  try {
    const { metricName, urlPattern, active } = req.query;
    
    let query = storage.db.select().from(webVitalsBudgets);
    
    // Apply filters
    if (metricName) {
      query = query.where(eq(webVitalsBudgets.metricName, metricName as string));
    }
    
    if (urlPattern) {
      query = query.where(eq(webVitalsBudgets.urlPattern, urlPattern as string));
    }
    
    if (active !== undefined) {
      query = query.where(eq(webVitalsBudgets.active, active === 'true'));
    }
    
    const budgets = await query;
    
    res.json({ 
      success: true, 
      count: budgets.length,
      budgets
    });
  } catch (error) {
    console.error('Error retrieving web vitals budgets:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve web vitals budgets' 
    });
  }
});

/**
 * GET /api/analytics/web-vitals/alerts
 * Get web vitals alerts
 */
router.get('/web-vitals/alerts', async (req: Request, res: Response) => {
  try {
    const { acknowledged, startDate, endDate } = req.query;
    
    let query = storage.db.select().from(webVitalsAlerts);
    
    // Apply filters
    if (acknowledged !== undefined) {
      query = query.where(eq(webVitalsAlerts.acknowledged, acknowledged === 'true'));
    }
    
    if (startDate) {
      query = query.where(gte(webVitalsAlerts.detectedAt, new Date(startDate as string)));
    }
    
    if (endDate) {
      query = query.where(lte(webVitalsAlerts.detectedAt, new Date(endDate as string)));
    }
    
    // Order by detected date desc (newest first)
    query = query.orderBy(webVitalsAlerts.detectedAt);
    
    const alerts = await query;
    
    res.json({ 
      success: true, 
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error retrieving web vitals alerts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve web vitals alerts' 
    });
  }
});

/**
 * POST /api/analytics/web-vitals/alerts/:id/acknowledge
 * Acknowledge a web vitals alert
 */
router.post('/web-vitals/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;
    
    await storage.db.update(webVitalsAlerts)
      .set({
        acknowledged: true,
        acknowledgedBy: acknowledgedBy || 'system',
        acknowledgedAt: new Date(),
      })
      .where(eq(webVitalsAlerts.id, id));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error acknowledging web vitals alert:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to acknowledge web vitals alert' 
    });
  }
});

export default router;
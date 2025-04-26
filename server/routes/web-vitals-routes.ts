/**
 * Web Vitals API Routes
 * 
 * Routes for collecting and retrieving Web Vitals performance metrics.
 */

import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { extendStorageWithWebVitals } from '../storage-web-vitals';

// Extend storage with Web Vitals methods
const webVitalsStorage = extendStorageWithWebVitals(storage);

// Create router
const router = express.Router();

// Web Vitals metric schema
const webVitalsMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  delta: z.number(),
  id: z.string(),
  timestamp: z.number(),
  navigationType: z.string().optional(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional()
});

// Web Vitals report schema
const webVitalsReportSchema = z.object({
  timestamp: z.number(),
  url: z.string(),
  metrics: z.array(webVitalsMetricSchema),
  percentiles: z.record(z.any()).optional(),
  deviceInfo: z.record(z.any()).optional(),
  tags: z.record(z.string()).optional()
});

/**
 * POST /web-vitals
 * 
 * Collect Web Vitals metrics from client.
 */
router.post('/web-vitals', async (req, res) => {
  try {
    // Validate request body
    const report = webVitalsReportSchema.parse(req.body);
    
    // Store metrics
    await webVitalsStorage.storeWebVitalsReport(report);
    
    // Respond with success
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error collecting Web Vitals metrics:', error);
    
    // Respond with error
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /web-vitals/metric
 * 
 * Collect a single Web Vitals metric from client.
 */
router.post('/web-vitals/metric', async (req, res) => {
  try {
    // Validate request body
    const metric = webVitalsMetricSchema.parse(req.body);
    
    // Store metric
    await webVitalsStorage.storeWebVitalsMetric(metric);
    
    // Respond with success
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error collecting Web Vitals metric:', error);
    
    // Respond with error
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /web-vitals
 * 
 * Get Web Vitals metrics.
 */
router.get('/web-vitals', async (req, res) => {
  try {
    // Parse query parameters
    const timeRange = (req.query.timeRange as string) || '24h';
    const metricName = req.query.metric as string;
    const limit = parseInt((req.query.limit as string) || '100', 10);
    
    // Get metrics
    const metrics = await webVitalsStorage.getWebVitalsMetrics(timeRange, metricName, limit);
    
    // Respond with metrics
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error retrieving Web Vitals metrics:', error);
    
    // Respond with error
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /web-vitals/summary
 * 
 * Get Web Vitals summary.
 */
router.get('/web-vitals/summary', async (req, res) => {
  try {
    // Parse query parameters
    const timeRange = (req.query.timeRange as string) || '24h';
    
    // Get summary
    const summary = await webVitalsStorage.getWebVitalsSummary(timeRange);
    
    // Respond with summary
    res.status(200).json(summary);
  } catch (error) {
    console.error('Error retrieving Web Vitals summary:', error);
    
    // Respond with error
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /web-vitals/aggregates
 * 
 * Get Web Vitals aggregates.
 */
router.get('/web-vitals/aggregates', async (req, res) => {
  try {
    // Parse query parameters
    const timeRange = (req.query.timeRange as string) || '24h';
    const metricName = req.query.metric as string;
    const urlPattern = req.query.urlPattern as string;
    
    // Get aggregates
    const aggregates = await webVitalsStorage.getWebVitalsAggregates(timeRange, metricName, urlPattern);
    
    // Respond with aggregates
    res.status(200).json(aggregates);
  } catch (error) {
    console.error('Error retrieving Web Vitals aggregates:', error);
    
    // Respond with error
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /web-vitals/budgets
 * 
 * Get Web Vitals performance budgets.
 */
router.get('/web-vitals/budgets', async (req, res) => {
  try {
    // Get budgets
    const budgets = await webVitalsStorage.getWebVitalsPerformanceBudgets();
    
    // Respond with budgets
    res.status(200).json(budgets);
  } catch (error) {
    console.error('Error retrieving Web Vitals performance budgets:', error);
    
    // Respond with error
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /web-vitals/budgets
 * 
 * Create a Web Vitals performance budget.
 */
router.post('/web-vitals/budgets', async (req, res) => {
  try {
    // Create budget
    const budget = await webVitalsStorage.createWebVitalsPerformanceBudget(req.body);
    
    // Respond with budget
    res.status(201).json(budget);
  } catch (error) {
    console.error('Error creating Web Vitals performance budget:', error);
    
    // Respond with error
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /web-vitals/alerts
 * 
 * Get Web Vitals alerts.
 */
router.get('/web-vitals/alerts', async (req, res) => {
  try {
    // Parse query parameters
    const timeRange = (req.query.timeRange as string) || '24h';
    const acknowledged = req.query.acknowledged === 'true';
    
    // Get alerts
    const alerts = await webVitalsStorage.getWebVitalsAlerts(timeRange, acknowledged);
    
    // Respond with alerts
    res.status(200).json(alerts);
  } catch (error) {
    console.error('Error retrieving Web Vitals alerts:', error);
    
    // Respond with error
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /web-vitals/alerts/:id/acknowledge
 * 
 * Acknowledge a Web Vitals alert.
 */
router.put('/web-vitals/alerts/:id/acknowledge', async (req, res) => {
  try {
    // Parse parameters
    const id = parseInt(req.params.id, 10);
    const { userId } = req.body;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }
    
    // Acknowledge alert
    await webVitalsStorage.acknowledgeWebVitalsAlert(id, userId);
    
    // Respond with success
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error acknowledging Web Vitals alert:', error);
    
    // Respond with error
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
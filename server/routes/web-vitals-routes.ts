/**
 * Web Vitals Routes
 * 
 * This file implements API endpoints for handling web vitals metrics,
 * including saving metrics, retrieving reports, and managing performance alerts.
 */

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { IStorage } from '../storage';
import { WebVitalsAlertService } from '../services/web-vitals-alert-service';
import { 
  insertWebVitalsMetricsSchema, 
  insertWebVitalsReportsSchema 
} from '../../shared/web-vitals-schema';

export function registerWebVitalsRoutes(router: Router, storage: IStorage) {
  const alertService = new WebVitalsAlertService(storage);
  
  // Save web vitals metrics (batch)
  router.post('/api/web-vitals/metrics/batch', async (req, res) => {
    try {
      const metricsArray = req.body;
      
      if (!Array.isArray(metricsArray)) {
        return res.status(400).json({ error: 'Expected an array of metrics' });
      }
      
      // Create a report to track this batch
      const reportId = uuidv4();
      const now = new Date();
      
      await storage.saveWebVitalsReport({
        id: reportId,
        timestamp: now,
        batchSize: metricsArray.length,
        source: req.headers['user-agent'] || 'unknown',
        processed: false
      });
      
      // Process and save each metric
      const savedMetrics = [];
      
      for (const metricData of metricsArray) {
        try {
          // Add report ID and timestamp to each metric
          const metricWithReportId = {
            ...metricData,
            reportId,
            timestamp: metricData.timestamp || now.toISOString()
          };
          
          // Validate with zod schema before saving
          const validatedMetric = insertWebVitalsMetricsSchema.parse(metricWithReportId);
          await storage.saveWebVitalsMetric(validatedMetric);
          savedMetrics.push(validatedMetric);
        } catch (err) {
          console.error('Error processing metric:', err);
          // Continue with other metrics even if one fails
        }
      }
      
      // Update the report as processed
      // In a real implementation, this might be done asynchronously
      // or through a background job
      
      // Trigger anomaly detection
      alertService.detectAnomalies().catch(err => {
        console.error('Error running anomaly detection:', err);
      });
      
      return res.status(200).json({
        success: true,
        reportId,
        savedCount: savedMetrics.length,
        totalCount: metricsArray.length
      });
    } catch (error) {
      console.error('Error saving web vitals metrics:', error);
      return res.status(500).json({ error: 'Failed to save metrics' });
    }
  });
  
  // Get recent metrics with filtering
  router.get('/api/web-vitals/metrics', async (req, res) => {
    try {
      const { 
        startDate, 
        endDate, 
        metricName, 
        url, 
        deviceType,
        limit = '100'
      } = req.query;
      
      // Convert string date parameters to Date objects
      const startDateObj = startDate ? new Date(startDate as string) : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      
      const metrics = await storage.getWebVitalsMetrics({
        startDate: startDateObj,
        endDate: endDateObj,
        metricName: metricName as string,
        url: url as string,
        deviceType: deviceType as string,
        limit: parseInt(limit as string, 10)
      });
      
      return res.status(200).json(metrics);
    } catch (error) {
      console.error('Error retrieving web vitals metrics:', error);
      return res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  });
  
  // Get active alerts
  router.get('/api/web-vitals/alerts', async (req, res) => {
    try {
      const { acknowledged } = req.query;
      
      let acknowlegedFilter: boolean | undefined = undefined;
      if (acknowledged === 'true') acknowlegedFilter = true;
      if (acknowledged === 'false') acknowlegedFilter = false;
      
      const alerts = await storage.getWebVitalsAlerts({
        acknowledged: acknowlegedFilter
      });
      
      return res.status(200).json(alerts);
    } catch (error) {
      console.error('Error retrieving web vitals alerts:', error);
      return res.status(500).json({ error: 'Failed to retrieve alerts' });
    }
  });
  
  // Acknowledge an alert
  router.post('/api/web-vitals/alerts/:alertId/acknowledge', async (req, res) => {
    try {
      const { alertId } = req.params;
      const { acknowledgedBy } = req.body;
      
      if (!acknowledgedBy) {
        return res.status(400).json({ error: 'acknowledgedBy is required' });
      }
      
      const success = await alertService.acknowledgeAlert(alertId, acknowledgedBy);
      
      if (success) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(404).json({ error: 'Alert not found or could not be acknowledged' });
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  });
  
  // Get performance budgets
  router.get('/api/web-vitals/budgets', async (req, res) => {
    try {
      const { metricName, urlPattern, active } = req.query;
      
      let activeFilter: boolean | undefined = undefined;
      if (active === 'true') activeFilter = true;
      if (active === 'false') activeFilter = false;
      
      const budgets = await storage.getWebVitalsBudgets({
        metricName: metricName as string,
        urlPattern: urlPattern as string,
        active: activeFilter
      });
      
      return res.status(200).json(budgets);
    } catch (error) {
      console.error('Error retrieving web vitals budgets:', error);
      return res.status(500).json({ error: 'Failed to retrieve budgets' });
    }
  });
  
  return router;
}
/**
 * Agent Health Monitoring Routes
 * 
 * These routes provide API endpoints for accessing agent health metrics
 * and monitoring data for the interactive agent health dashboard.
 */

import { Router } from 'express';
import { agentHealthMonitoringService } from '../services/agent-health-monitoring-service';
import { IStorage } from '../storage';
import { AgentSystem } from '../services/agent-system';
import { logger } from '../utils/logger';
import { AgentHealthStatus, AgentPerformanceMetricType } from '@shared/schema';

export function createAgentHealthRoutes(storage: IStorage, agentSystem: AgentSystem) {
  const router = Router();

  // Initialize health monitoring service if not already initialized
  // This ensures the service is running when the routes are accessed
  if (!agentHealthMonitoringService.isInitialized) {
    agentHealthMonitoringService.initialize(storage, agentSystem);
  }

  /**
   * Get health status for all agents
   */
  router.get('/', async (req, res) => {
    try {
      const result = await getAllAgentHealth(storage);
      res.json(result);
    } catch (error) {
      logger.error(`Error getting all agent health data: ${error instanceof Error ? error.message : String(error)}`);
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agent health data'
      });
    }
  });

  /**
   * Get health dashboard statistics
   */
  router.get('/statistics', async (req, res) => {
    try {
      const stats = await agentHealthMonitoringService.getHealthStatistics();
      res.json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      logger.error(`Error getting health statistics: ${error instanceof Error ? error.message : String(error)}`);
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve health statistics'
      });
    }
  });

  /**
   * Get health status for a specific agent
   */
  router.get('/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      
      const healthData = await getAgentHealth(storage, agentId);
      
      if (!healthData) {
        return res.status(404).json({
          success: false,
          error: `Agent health data not found for ID: ${agentId}`
        });
      }
      
      res.json({
        success: true,
        health: healthData
      });
    } catch (error) {
      logger.error(`Error getting health data for agent ${req.params.agentId}: ${error instanceof Error ? error.message : String(error)}`);
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agent health data'
      });
    }
  });

  /**
   * Get historical performance metrics for an agent
   */
  router.get('/:agentId/metrics', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { metricType, timeframe, limit } = req.query;
      
      const metrics = await storage.getAgentPerformanceMetrics(
        agentId,
        metricType ? String(metricType) : undefined,
        timeframe ? String(timeframe) : 'hourly',
        limit ? parseInt(String(limit)) : 24
      );
      
      res.json({
        success: true,
        metrics,
        count: metrics.length
      });
    } catch (error) {
      logger.error({
        component: 'AgentHealthRoutes',
        message: `Error getting performance metrics for agent ${req.params.agentId}`,
        agentId: req.params.agentId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agent performance metrics'
      });
    }
  });

  /**
   * Manually trigger a health check for all agents
   */
  router.post('/check', async (req, res) => {
    try {
      await agentHealthMonitoringService.performHealthCheck();
      
      res.json({
        success: true,
        message: 'Manual health check triggered successfully'
      });
    } catch (error) {
      logger.error({
        component: 'AgentHealthRoutes',
        message: 'Error triggering manual health check',
        error: error instanceof Error ? error.message : String(error)
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to trigger health check'
      });
    }
  });

  return router;
}

/**
 * Helper function to get all agent health data
 * This provides a fallback implementation if the storage method isn't fully implemented yet
 */
async function getAllAgentHealth(storage: IStorage): Promise<any[]> {
  try {
    // First try to use the storage method if it exists
    if (typeof storage.getAllAgentHealth === 'function') {
      return await storage.getAllAgentHealth();
    }
    
    // If not, fallback to the monitoring service
    return await agentHealthMonitoringService.getAllAgentHealth();
  } catch (error) {
    logger.error({
      component: 'AgentHealthRoutes',
      message: 'Error in getAllAgentHealth fallback',
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return empty array as last resort
    return [];
  }
}

/**
 * Helper function to get health data for a specific agent
 * This provides a fallback implementation if the storage method isn't fully implemented yet
 */
async function getAgentHealth(storage: IStorage, agentId: string): Promise<any | null> {
  try {
    // First try to use the storage method if it exists
    if (typeof storage.getAgentHealthByAgentId === 'function') {
      return await storage.getAgentHealthByAgentId(agentId);
    }
    
    // If not, fallback to the monitoring service
    return await agentHealthMonitoringService.getAgentHealth(agentId);
  } catch (error) {
    logger.error({
      component: 'AgentHealthRoutes',
      message: `Error in getAgentHealth fallback for agent ${agentId}`,
      agentId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return null as last resort
    return null;
  }
}
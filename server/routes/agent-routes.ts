/**
 * Agent System API Routes
 * 
 * This file contains routes for interacting with the MCP Agent system,
 * allowing agents to be controlled, monitored, and accessed via API endpoints.
 */

import { Router } from 'express';
import { AgentSystem } from '../services/agent-system';
import { authenticate } from '../middleware/auth';

export function createAgentRoutes(agentSystem: AgentSystem) {
  const router = Router();
  
  // Apply authentication middleware to all agent routes
  router.use(authenticate);
  
  /**
   * Get system status
   */
  router.get('/status', async (req, res) => {
    try {
      const status = agentSystem.getSystemStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting agent system status:', error);
      res.status(500).json({ error: 'Failed to get system status' });
    }
  });
  
  /**
   * Initialize the agent system
   */
  router.post('/initialize', async (req, res) => {
    try {
      await agentSystem.initialize();
      res.json({ success: true, message: 'Agent system initialized successfully' });
    } catch (error) {
      console.error('Error initializing agent system:', error);
      res.status(500).json({ error: 'Failed to initialize agent system' });
    }
  });
  
  /**
   * Start all agents
   */
  router.post('/start', async (req, res) => {
    try {
      await agentSystem.startAllAgents();
      res.json({ success: true, message: 'All agents started successfully' });
    } catch (error) {
      console.error('Error starting agents:', error);
      res.status(500).json({ error: 'Failed to start agents' });
    }
  });
  
  /**
   * Stop all agents
   */
  router.post('/stop', async (req, res) => {
    try {
      await agentSystem.stopAllAgents();
      res.json({ success: true, message: 'All agents stopped successfully' });
    } catch (error) {
      console.error('Error stopping agents:', error);
      res.status(500).json({ error: 'Failed to stop agents' });
    }
  });
  
  /**
   * Execute a capability on an agent
   */
  router.post('/execute/:agentName/:capabilityName', async (req, res) => {
    try {
      const { agentName, capabilityName } = req.params;
      const parameters = req.body.parameters || {};
      
      const result = await agentSystem.executeCapability(agentName, capabilityName, parameters);
      res.json(result);
    } catch (error) {
      console.error(`Error executing capability:`, error);
      res.status(500).json({ error: 'Failed to execute capability', details: error.message });
    }
  });
  
  /**
   * Property Assessment Agent - Analyze Property
   */
  router.post('/property-assessment/analyze/:propertyId', async (req, res) => {
    try {
      const { propertyId } = req.params;
      
      const result = await agentSystem.executeCapability('property_assessment', 'analyzeProperty', {
        propertyId
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error analyzing property:', error);
      res.status(500).json({ error: 'Failed to analyze property', details: error.message });
    }
  });
  
  /**
   * Property Assessment Agent - Generate Property Story
   */
  router.post('/property-assessment/story/:propertyId', async (req, res) => {
    try {
      const { propertyId } = req.params;
      const options = req.body.options || {};
      
      const result = await agentSystem.executeCapability('property_assessment', 'generatePropertyStory', {
        propertyId,
        options
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error generating property story:', error);
      res.status(500).json({ error: 'Failed to generate property story', details: error.message });
    }
  });
  
  /**
   * Property Assessment Agent - Find Comparable Properties
   */
  router.post('/property-assessment/comparables/:propertyId', async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { count, radius } = req.body;
      
      const result = await agentSystem.executeCapability('property_assessment', 'findComparableProperties', {
        propertyId,
        count,
        radius
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error finding comparable properties:', error);
      res.status(500).json({ error: 'Failed to find comparable properties', details: error.message });
    }
  });
  
  /**
   * Property Assessment Agent - Calculate Property Value
   */
  router.post('/property-assessment/value/:propertyId', async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { useComparables } = req.body;
      
      const result = await agentSystem.executeCapability('property_assessment', 'calculatePropertyValue', {
        propertyId,
        useComparables
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error calculating property value:', error);
      res.status(500).json({ error: 'Failed to calculate property value', details: error.message });
    }
  });
  
  /**
   * Property Assessment Agent - Analyze Property Trends
   */
  router.post('/property-assessment/trends/:propertyId', async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { timeframe } = req.body;
      
      const result = await agentSystem.executeCapability('property_assessment', 'analyzePropertyTrends', {
        propertyId,
        timeframe
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error analyzing property trends:', error);
      res.status(500).json({ error: 'Failed to analyze property trends', details: error.message });
    }
  });
  
  /**
   * Data Ingestion Agent - Import From FTP
   */
  router.post('/data-ingestion/import-from-ftp', async (req, res) => {
    try {
      const { remotePath, dataType } = req.body;
      
      if (!remotePath || !dataType) {
        return res.status(400).json({ error: 'Remote path and data type are required' });
      }
      
      const result = await agentSystem.executeCapability('data_ingestion', 'importFromFTP', {
        remotePath,
        dataType
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error importing from FTP:', error);
      res.status(500).json({ error: 'Failed to import from FTP', details: error.message });
    }
  });
  
  /**
   * Data Ingestion Agent - Validate Import Data
   */
  router.post('/data-ingestion/validate-import/:importId', async (req, res) => {
    try {
      const { importId } = req.params;
      
      const result = await agentSystem.executeCapability('data_ingestion', 'validateImportData', {
        importId
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error validating import data:', error);
      res.status(500).json({ error: 'Failed to validate import data', details: error.message });
    }
  });
  
  /**
   * Data Ingestion Agent - Load Validated Data
   */
  router.post('/data-ingestion/load-data/:importId', async (req, res) => {
    try {
      const { importId } = req.params;
      const options = req.body.options || {};
      
      const result = await agentSystem.executeCapability('data_ingestion', 'loadValidatedData', {
        importId,
        options
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error loading validated data:', error);
      res.status(500).json({ error: 'Failed to load validated data', details: error.message });
    }
  });
  
  /**
   * Data Ingestion Agent - Export To FTP
   */
  router.post('/data-ingestion/export-to-ftp', async (req, res) => {
    try {
      const { dataType, filter, remotePath } = req.body;
      
      if (!dataType) {
        return res.status(400).json({ error: 'Data type is required' });
      }
      
      const result = await agentSystem.executeCapability('data_ingestion', 'exportToFTP', {
        dataType,
        filter: filter || {},
        remotePath
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error exporting to FTP:', error);
      res.status(500).json({ error: 'Failed to export to FTP', details: error.message });
    }
  });
  
  /**
   * Reporting Agent - Create Report
   */
  router.post('/reporting/reports', async (req, res) => {
    try {
      const { name, description, type, query } = req.body;
      
      if (!name || !description || !type || !query) {
        return res.status(400).json({ error: 'Name, description, type, and query are required' });
      }
      
      const result = await agentSystem.executeCapability('reporting', 'createReport', {
        name,
        description,
        type,
        query
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error creating report:', error);
      res.status(500).json({ error: 'Failed to create report', details: error.message });
    }
  });
  
  /**
   * Reporting Agent - Run Report
   */
  router.post('/reporting/reports/:reportId/run', async (req, res) => {
    try {
      const { reportId } = req.params;
      const parameters = req.body.parameters || {};
      
      const result = await agentSystem.executeCapability('reporting', 'runReport', {
        reportId,
        parameters
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error running report:', error);
      res.status(500).json({ error: 'Failed to run report', details: error.message });
    }
  });
  
  /**
   * Reporting Agent - List Reports
   */
  router.get('/reporting/reports', async (req, res) => {
    try {
      const result = await agentSystem.executeCapability('reporting', 'listReports', {});
      res.json(result);
    } catch (error) {
      console.error('Error listing reports:', error);
      res.status(500).json({ error: 'Failed to list reports', details: error.message });
    }
  });
  
  /**
   * Reporting Agent - Get Report History
   */
  router.get('/reporting/reports/:reportId/history', async (req, res) => {
    try {
      const { reportId } = req.params;
      
      const result = await agentSystem.executeCapability('reporting', 'getReportHistory', {
        reportId
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error getting report history:', error);
      res.status(500).json({ error: 'Failed to get report history', details: error.message });
    }
  });
  
  /**
   * Reporting Agent - Schedule Report
   */
  router.post('/reporting/reports/:reportId/schedule', async (req, res) => {
    try {
      const { reportId } = req.params;
      const { schedule, recipients } = req.body;
      
      if (!schedule) {
        return res.status(400).json({ error: 'Schedule is required' });
      }
      
      const result = await agentSystem.executeCapability('reporting', 'scheduleReport', {
        reportId,
        schedule,
        recipients
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error scheduling report:', error);
      res.status(500).json({ error: 'Failed to schedule report', details: error.message });
    }
  });
  
  /**
   * Get MCP Tool Execution Logs
   */
  router.get('/tool-execution-logs', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      // Access logs via storage
      const logs = await agentSystem.storage.getMCPToolExecutionLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error('Error retrieving MCP tool execution logs:', error);
      res.status(500).json({ error: 'Failed to retrieve tool execution logs', details: error.message });
    }
  });
  
  /**
   * Create a test MCP Tool Execution Log (for testing only)
   */
  router.post('/test/create-tool-log', async (req, res) => {
    try {
      // Create a test tool execution log
      const now = new Date();
      const testLog = {
        toolName: 'test.tool',
        requestId: `test-${Date.now()}`,
        agentId: 1, // Data Management Agent
        userId: req.user?.userId || null,
        parameters: { 
          test: true,
          description: 'This is a test log entry'
        },
        status: 'success',
        result: { message: 'Test operation completed successfully' },
        error: null,
        startTime: new Date(now.getTime() - 1000), // 1 second ago
        endTime: now
      };
      
      const log = await agentSystem.storage.createMCPToolExecutionLog(testLog);
      res.json(log);
    } catch (error) {
      console.error('Error creating test tool execution log:', error);
      res.status(500).json({ error: 'Failed to create test log', details: error.message });
    }
  });
  
  return router;
}
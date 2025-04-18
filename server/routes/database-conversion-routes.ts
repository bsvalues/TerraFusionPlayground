/**
 * Database Conversion Routes
 * 
 * This file contains all the API routes for the database conversion functionality.
 */

import { Express } from 'express';
import { z } from 'zod';
import { DatabaseConversionService } from '../services/database-conversion';

/**
 * Register database conversion routes
 */
export function registerDatabaseConversionRoutes(app: Express, databaseConversionService: DatabaseConversionService) {
  // Get all conversion projects
  app.get('/api/database-conversion/projects', async (req, res) => {
    try {
      const projects = await databaseConversionService.getConversionProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error getting conversion projects:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get a specific conversion project
  app.get('/api/database-conversion/projects/:id', async (req, res) => {
    try {
      const project = await databaseConversionService.getConversionProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      console.error(`Error getting conversion project ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new conversion project
  app.post('/api/database-conversion/projects', async (req, res) => {
    try {
      // Validate request body
      const schema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sourceConfig: z.object({
          type: z.string().optional(),
          connectionString: z.string().optional(),
          host: z.string().optional(),
          port: z.number().optional(),
          database: z.string().optional(),
          schema: z.string().optional(),
          username: z.string().optional(),
          password: z.string().optional(),
          options: z.record(z.any()).optional(),
          filePath: z.string().optional()
        }),
        targetConfig: z.object({
          type: z.string().optional(),
          connectionString: z.string().optional(),
          host: z.string().optional(),
          port: z.number().optional(),
          database: z.string().optional(),
          schema: z.string().optional(),
          username: z.string().optional(),
          password: z.string().optional(),
          options: z.record(z.any()).optional(),
          filePath: z.string().optional()
        })
      });

      const validatedData = schema.parse(req.body);

      const project = await databaseConversionService.createConversionProject(
        validatedData.name,
        validatedData.description || '',
        validatedData.sourceConfig,
        validatedData.targetConfig
      );

      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating conversion project:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Analyze a database
  app.post('/api/database-conversion/projects/:id/analyze', async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Check if project exists
      const project = await databaseConversionService.getConversionProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const analysis = await databaseConversionService.analyzeDatabase(projectId);
      res.json({ success: true, analysis });
    } catch (error) {
      console.error(`Error analyzing database for project ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate migration plan
  app.post('/api/database-conversion/projects/:id/generate-plan', async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Check if project exists
      const project = await databaseConversionService.getConversionProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Validate request body
      const schema = z.object({
        customInstructions: z.string().optional()
      });

      const validatedData = schema.parse(req.body);
      
      const plan = await databaseConversionService.generateMigrationPlan(
        projectId,
        validatedData.customInstructions
      );
      
      res.json({ success: true, plan });
    } catch (error) {
      console.error(`Error generating migration plan for project ${req.params.id}:`, error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Generate SQL script
  app.post('/api/database-conversion/projects/:id/generate-script', async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Check if project exists
      const project = await databaseConversionService.getConversionProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const script = await databaseConversionService.generateMigrationScript(projectId);
      res.json({ success: true, script });
    } catch (error) {
      console.error(`Error generating migration script for project ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Execute migration
  app.post('/api/database-conversion/projects/:id/execute', async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Check if project exists
      const project = await databaseConversionService.getConversionProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Validate request body
      const schema = z.object({
        options: z.object({
          schemaOnly: z.boolean().optional(),
          batchSize: z.number().optional(),
          truncateBeforeLoad: z.boolean().optional(),
          disableConstraintsDuringLoad: z.boolean().optional(),
          createIndexesAfterDataLoad: z.boolean().optional(),
          skipValidation: z.boolean().optional(),
          includeTables: z.array(z.string()).optional(),
          excludeTables: z.array(z.string()).optional()
        }).optional()
      });

      const validatedData = schema.parse(req.body);
      
      const result = await databaseConversionService.executeMigration(
        projectId,
        validatedData.options
      );
      
      res.json({ success: true, result });
    } catch (error) {
      console.error(`Error executing migration for project ${req.params.id}:`, error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Create compatibility layer
  app.post('/api/database-conversion/projects/:id/compatibility', async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Check if project exists
      const project = await databaseConversionService.getConversionProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const result = await databaseConversionService.createCompatibilityLayer(projectId);
      res.json({ success: true, result });
    } catch (error) {
      console.error(`Error creating compatibility layer for project ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get schema insights
  app.get('/api/database-conversion/projects/:id/schema-insights', async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Check if project exists
      const project = await databaseConversionService.getConversionProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get insights through the agent
      const insights = await databaseConversionService.estimateMigrationComplexity(projectId);
      res.json({ success: true, insights });
    } catch (error) {
      console.error(`Error getting schema insights for project ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get connection templates
  app.get('/api/database-conversion/templates', async (req, res) => {
    try {
      const isPublic = req.query.isPublic === 'true' ? true : 
                       req.query.isPublic === 'false' ? false : undefined;
                       
      const templates = await databaseConversionService.getConnectionTemplates(isPublic);
      res.json(templates);
    } catch (error) {
      console.error('Error getting connection templates:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a connection template
  app.post('/api/database-conversion/templates', async (req, res) => {
    try {
      // Validate request body
      const schema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        databaseType: z.string().min(1),
        connectionConfig: z.object({
          type: z.string().optional(),
          connectionString: z.string().optional(),
          host: z.string().optional(),
          port: z.number().optional(),
          database: z.string().optional(),
          schema: z.string().optional(),
          username: z.string().optional(),
          password: z.string().optional(),
          options: z.record(z.any()).optional(),
          filePath: z.string().optional()
        }),
        isPublic: z.boolean().optional(),
        createdBy: z.number().optional()
      });

      const validatedData = schema.parse(req.body);

      const template = await databaseConversionService.createConnectionTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating connection template:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  console.log('Database conversion routes registered');
}
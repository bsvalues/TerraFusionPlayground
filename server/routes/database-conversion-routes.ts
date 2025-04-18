/**
 * Database Conversion Routes
 * 
 * This file contains all the API routes for the database conversion functionality.
 */

import { Express, Request, Response } from 'express';
import { DatabaseConversionService } from '../services/database-conversion';
import { z } from 'zod';

/**
 * Register database conversion routes
 */
export function registerDatabaseConversionRoutes(app: Express, databaseConversionService: DatabaseConversionService) {
  // Validate token for all DB conversion API routes
  app.use('/api/database-conversion/*', (req, res, next) => {
    // The authentication middleware would go here
    // For now, just continue to the next middleware
    next();
  });

  // Get all conversion projects
  app.get('/api/database-conversion/projects', async (req: Request, res: Response) => {
    try {
      const projects = await databaseConversionService.getConversionProjects();
      return res.status(200).json(projects);
    } catch (error) {
      console.error('Error fetching conversion projects:', error);
      return res.status(500).json({ error: 'Failed to fetch conversion projects' });
    }
  });

  // Get a specific conversion project
  app.get('/api/database-conversion/projects/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const project = await databaseConversionService.getConversionProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(200).json(project);
    } catch (error) {
      console.error('Error fetching conversion project:', error);
      return res.status(500).json({ error: 'Failed to fetch conversion project' });
    }
  });

  // Create a new conversion project
  app.post('/api/database-conversion/projects', async (req: Request, res: Response) => {
    try {
      const projectSchema = z.object({
        name: z.string().min(1, "Name is required"),
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
          filePath: z.string().optional(),
        }).refine(data => {
          // Ensure at least connection string or host/db is provided
          return !!(data.connectionString || (data.host && data.database));
        }, {
          message: "Either connectionString or host and database must be provided"
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
          filePath: z.string().optional(),
        }).refine(data => {
          // Ensure at least connection string or host/db is provided
          return !!(data.connectionString || (data.host && data.database));
        }, {
          message: "Either connectionString or host and database must be provided"
        }),
      });

      const validatedData = projectSchema.parse(req.body);
      
      const project = await databaseConversionService.createConversionProject(
        validatedData.name,
        validatedData.description || '',
        validatedData.sourceConfig,
        validatedData.targetConfig
      );
      
      return res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid project data', details: error.errors });
      }
      
      console.error('Error creating conversion project:', error);
      return res.status(500).json({ error: 'Failed to create conversion project' });
    }
  });

  // Update an existing conversion project
  app.patch('/api/database-conversion/projects/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const project = await databaseConversionService.getConversionProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const updatedProject = await databaseConversionService.updateConversionProject(id, req.body);
      return res.status(200).json(updatedProject);
    } catch (error) {
      console.error('Error updating conversion project:', error);
      return res.status(500).json({ error: 'Failed to update conversion project' });
    }
  });

  // Delete a conversion project
  app.delete('/api/database-conversion/projects/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const deleted = await databaseConversionService.deleteConversionProject(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting conversion project:', error);
      return res.status(500).json({ error: 'Failed to delete conversion project' });
    }
  });

  // Get connection templates
  app.get('/api/database-conversion/templates', async (req: Request, res: Response) => {
    try {
      const isPublic = req.query.isPublic === 'true';
      const templates = await databaseConversionService.getConnectionTemplates(isPublic);
      return res.status(200).json(templates);
    } catch (error) {
      console.error('Error fetching connection templates:', error);
      return res.status(500).json({ error: 'Failed to fetch connection templates' });
    }
  });

  // Create a connection template
  app.post('/api/database-conversion/templates', async (req: Request, res: Response) => {
    try {
      const templateSchema = z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        databaseType: z.string().min(1, "Database type is required"),
        connectionConfig: z.record(z.any()).min(1, "Connection configuration is required"),
        isPublic: z.boolean().optional(),
        createdBy: z.number().int().min(1, "Creator ID is required"),
      });

      const validatedData = templateSchema.parse(req.body);
      const template = await databaseConversionService.createConnectionTemplate(validatedData);
      
      return res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid template data', details: error.errors });
      }
      
      console.error('Error creating connection template:', error);
      return res.status(500).json({ error: 'Failed to create connection template' });
    }
  });

  // Analyze database schema
  app.post('/api/database-conversion/projects/:id/analyze', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const project = await databaseConversionService.getConversionProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const analysisResult = await databaseConversionService.analyzeDatabase(id);
      return res.status(200).json(analysisResult);
    } catch (error) {
      console.error('Error analyzing database schema:', error);
      return res.status(500).json({ error: 'Failed to analyze database schema' });
    }
  });

  // Generate migration plan
  app.post('/api/database-conversion/projects/:id/plan', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { customInstructions } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const project = await databaseConversionService.getConversionProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const migrationPlan = await databaseConversionService.generateMigrationPlan(id, customInstructions);
      return res.status(200).json(migrationPlan);
    } catch (error) {
      console.error('Error generating migration plan:', error);
      return res.status(500).json({ error: 'Failed to generate migration plan' });
    }
  });

  // Generate migration script
  app.post('/api/database-conversion/projects/:id/script', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const project = await databaseConversionService.getConversionProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const migrationScript = await databaseConversionService.generateMigrationScript(id);
      return res.status(200).json(migrationScript);
    } catch (error) {
      console.error('Error generating migration script:', error);
      return res.status(500).json({ error: 'Failed to generate migration script' });
    }
  });

  // Execute migration
  app.post('/api/database-conversion/projects/:id/migrate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const options = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const project = await databaseConversionService.getConversionProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const migrationResult = await databaseConversionService.executeMigration(id, options);
      return res.status(200).json(migrationResult);
    } catch (error) {
      console.error('Error executing migration:', error);
      return res.status(500).json({ error: 'Failed to execute migration' });
    }
  });

  // Create compatibility layer
  app.post('/api/database-conversion/projects/:id/compatibility', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const project = await databaseConversionService.getConversionProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const compatibilityResult = await databaseConversionService.createCompatibilityLayer(id);
      return res.status(200).json(compatibilityResult);
    } catch (error) {
      console.error('Error creating compatibility layer:', error);
      return res.status(500).json({ error: 'Failed to create compatibility layer' });
    }
  });

  // Estimate migration complexity
  app.get('/api/database-conversion/projects/:id/complexity', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const project = await databaseConversionService.getConversionProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const complexityEstimate = await databaseConversionService.estimateMigrationComplexity(id);
      return res.status(200).json(complexityEstimate);
    } catch (error) {
      console.error('Error estimating migration complexity:', error);
      return res.status(500).json({ error: 'Failed to estimate migration complexity' });
    }
  });
}
import { Router, Express } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { DatabaseConversionService } from '../services/database-conversion';
import { databaseConversionProjects, connectionTemplates, schemaMappings, conversionLogs, compatibilityLayers } from '@shared/schema';
import { createInsertSchema } from 'drizzle-zod';
import { randomUUID } from 'crypto';

// Zod validation schemas
const insertProjectSchema = createInsertSchema(databaseConversionProjects);
const insertConnectionTemplateSchema = createInsertSchema(connectionTemplates);
const insertSchemaMappingSchema = createInsertSchema(schemaMappings);
const insertConversionLogSchema = createInsertSchema(conversionLogs);
const insertCompatibilityLayerSchema = createInsertSchema(compatibilityLayers);

// Project ID parameter validation
const projectIdParamSchema = z.object({
  projectId: z.string().uuid()
});

// Resource ID parameter validation
const resourceIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const databaseConversionRouter = Router();

// Project endpoints
databaseConversionRouter.post('/projects', async (req, res) => {
  try {
    const projectData = req.body;
    
    // Generate UUID if not provided
    if (!projectData.projectId) {
      projectData.projectId = randomUUID();
    }
    
    const validatedData = insertProjectSchema.parse(projectData);
    const project = await storage.createConversionProject(validatedData);
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating conversion project:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid project data' });
  }
});

databaseConversionRouter.get('/projects', async (req, res) => {
  try {
    const projects = await storage.getConversionProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching conversion projects:', error);
    res.status(500).json({ error: 'Failed to fetch conversion projects' });
  }
});

databaseConversionRouter.get('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = projectIdParamSchema.parse(req.params);
    const project = await storage.getConversionProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Conversion project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error fetching conversion project:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid project ID' });
  }
});

databaseConversionRouter.patch('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = projectIdParamSchema.parse(req.params);
    const updateData = req.body;
    
    const project = await storage.updateConversionProject(projectId, updateData);
    
    if (!project) {
      return res.status(404).json({ error: 'Conversion project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error updating conversion project:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid update data' });
  }
});

databaseConversionRouter.delete('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = projectIdParamSchema.parse(req.params);
    const success = await storage.deleteConversionProject(projectId);
    
    if (!success) {
      return res.status(404).json({ error: 'Conversion project not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting conversion project:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid project ID' });
  }
});

// Connection Templates endpoints
databaseConversionRouter.post('/connection-templates', async (req, res) => {
  try {
    const templateData = req.body;
    const validatedData = insertConnectionTemplateSchema.parse(templateData);
    const template = await storage.createConnectionTemplate(validatedData);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating connection template:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid template data' });
  }
});

databaseConversionRouter.get('/connection-templates', async (req, res) => {
  try {
    const isPublic = req.query.isPublic === 'true' ? true : 
                    req.query.isPublic === 'false' ? false : 
                    undefined;
    
    const templates = await storage.getConnectionTemplates(isPublic);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching connection templates:', error);
    res.status(500).json({ error: 'Failed to fetch connection templates' });
  }
});

databaseConversionRouter.get('/connection-templates/:id', async (req, res) => {
  try {
    const { id } = resourceIdParamSchema.parse(req.params);
    const template = await storage.getConnectionTemplate(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Connection template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching connection template:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid template ID' });
  }
});

databaseConversionRouter.patch('/connection-templates/:id', async (req, res) => {
  try {
    const { id } = resourceIdParamSchema.parse(req.params);
    const updateData = req.body;
    
    const template = await storage.updateConnectionTemplate(id, updateData);
    
    if (!template) {
      return res.status(404).json({ error: 'Connection template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error updating connection template:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid update data' });
  }
});

databaseConversionRouter.delete('/connection-templates/:id', async (req, res) => {
  try {
    const { id } = resourceIdParamSchema.parse(req.params);
    const success = await storage.deleteConnectionTemplate(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Connection template not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting connection template:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid template ID' });
  }
});

// Schema Mappings endpoints
databaseConversionRouter.post('/schema-mappings', async (req, res) => {
  try {
    const mappingData = req.body;
    const validatedData = insertSchemaMappingSchema.parse(mappingData);
    const mapping = await storage.createSchemaMapping(validatedData);
    res.status(201).json(mapping);
  } catch (error) {
    console.error('Error creating schema mapping:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid mapping data' });
  }
});

databaseConversionRouter.get('/schema-mappings', async (req, res) => {
  try {
    const sourceType = req.query.sourceType as string | undefined;
    const targetType = req.query.targetType as string | undefined;
    
    const mappings = await storage.getSchemaMappings(sourceType, targetType);
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching schema mappings:', error);
    res.status(500).json({ error: 'Failed to fetch schema mappings' });
  }
});

databaseConversionRouter.get('/schema-mappings/:id', async (req, res) => {
  try {
    const { id } = resourceIdParamSchema.parse(req.params);
    const mapping = await storage.getSchemaMapping(id);
    
    if (!mapping) {
      return res.status(404).json({ error: 'Schema mapping not found' });
    }
    
    res.json(mapping);
  } catch (error) {
    console.error('Error fetching schema mapping:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid mapping ID' });
  }
});

databaseConversionRouter.patch('/schema-mappings/:id', async (req, res) => {
  try {
    const { id } = resourceIdParamSchema.parse(req.params);
    const updateData = req.body;
    
    const mapping = await storage.updateSchemaMapping(id, updateData);
    
    if (!mapping) {
      return res.status(404).json({ error: 'Schema mapping not found' });
    }
    
    res.json(mapping);
  } catch (error) {
    console.error('Error updating schema mapping:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid update data' });
  }
});

databaseConversionRouter.delete('/schema-mappings/:id', async (req, res) => {
  try {
    const { id } = resourceIdParamSchema.parse(req.params);
    const success = await storage.deleteSchemaMapping(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Schema mapping not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting schema mapping:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid mapping ID' });
  }
});

// Conversion Logs endpoints
databaseConversionRouter.post('/conversion-logs', async (req, res) => {
  try {
    const logData = req.body;
    const validatedData = insertConversionLogSchema.parse(logData);
    const log = await storage.createConversionLog(validatedData);
    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating conversion log:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid log data' });
  }
});

databaseConversionRouter.get('/conversion-logs/:projectId', async (req, res) => {
  try {
    const { projectId } = projectIdParamSchema.parse({ projectId: req.params.projectId });
    const logs = await storage.getConversionLogs(projectId);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching conversion logs:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid project ID' });
  }
});

// Compatibility Layer endpoints
databaseConversionRouter.post('/compatibility-layers', async (req, res) => {
  try {
    const layerData = req.body;
    const validatedData = insertCompatibilityLayerSchema.parse(layerData);
    const layer = await storage.createCompatibilityLayer(validatedData);
    res.status(201).json(layer);
  } catch (error) {
    console.error('Error creating compatibility layer:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid layer data' });
  }
});

databaseConversionRouter.get('/compatibility-layers/:projectId', async (req, res) => {
  try {
    const { projectId } = projectIdParamSchema.parse({ projectId: req.params.projectId });
    const layers = await storage.getCompatibilityLayersByProject(projectId);
    res.json(layers);
  } catch (error) {
    console.error('Error fetching compatibility layers:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid project ID' });
  }
});

databaseConversionRouter.get('/compatibility-layers/single/:id', async (req, res) => {
  try {
    const { id } = resourceIdParamSchema.parse(req.params);
    const layer = await storage.getCompatibilityLayer(id);
    
    if (!layer) {
      return res.status(404).json({ error: 'Compatibility layer not found' });
    }
    
    res.json(layer);
  } catch (error) {
    console.error('Error fetching compatibility layer:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid layer ID' });
  }
});

databaseConversionRouter.patch('/compatibility-layers/:id', async (req, res) => {
  try {
    const { id } = resourceIdParamSchema.parse(req.params);
    const updateData = req.body;
    
    const layer = await storage.updateCompatibilityLayer(id, updateData);
    
    if (!layer) {
      return res.status(404).json({ error: 'Compatibility layer not found' });
    }
    
    res.json(layer);
  } catch (error) {
    console.error('Error updating compatibility layer:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid update data' });
  }
});

export default databaseConversionRouter;

/**
 * Register database conversion routes with the Express application
 * 
 * @param app Express application
 * @param databaseConversionService Database conversion service instance
 */
export function registerDatabaseConversionRoutes(app: Express, databaseConversionService: DatabaseConversionService): void {
  // Operation endpoints that use the service directly
  
  // Analyze schema endpoint
  app.post('/api/database-conversion/analyze-schema', async (req, res) => {
    try {
      const { connectionString, databaseType } = req.body;
      
      if (!connectionString || !databaseType) {
        return res.status(400).json({ error: 'Connection string and database type are required' });
      }
      
      const schema = await databaseConversionService.analyzeSchema(connectionString, databaseType);
      res.json(schema);
    } catch (error) {
      console.error('Error analyzing database schema:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to analyze schema' });
    }
  });
  
  // Test connection endpoint
  app.post('/api/database-conversion/test-connection', async (req, res) => {
    try {
      const { connectionString, databaseType } = req.body;
      
      if (!connectionString || !databaseType) {
        return res.status(400).json({ error: 'Connection string and database type are required' });
      }
      
      const result = await databaseConversionService.testConnection(connectionString, databaseType);
      res.json(result);
    } catch (error) {
      console.error('Error testing database connection:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to test connection' });
    }
  });
  
  // Start conversion process endpoint
  app.post('/api/database-conversion/start', async (req, res) => {
    try {
      const { projectId } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const result = await databaseConversionService.startConversion(projectId);
      res.json(result);
    } catch (error) {
      console.error('Error starting conversion process:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to start conversion' });
    }
  });
  
  // Get conversion status endpoint
  app.get('/api/database-conversion/status/:projectId', async (req, res) => {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const status = await databaseConversionService.getConversionStatus(projectId);
      res.json(status);
    } catch (error) {
      console.error('Error fetching conversion status:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get conversion status' });
    }
  });
  
  // Generate compatibility layer endpoint
  app.post('/api/database-conversion/generate-compatibility', async (req, res) => {
    try {
      const { projectId, options } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const layer = await databaseConversionService.generateCompatibilityLayer(projectId, options);
      res.json(layer);
    } catch (error) {
      console.error('Error generating compatibility layer:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate compatibility layer' });
    }
  });
  
  // Database type info endpoint
  app.get('/api/database-conversion/database-types', async (req, res) => {
    try {
      const databaseTypes = await databaseConversionService.getSupportedDatabaseTypes();
      res.json(databaseTypes);
    } catch (error) {
      console.error('Error fetching supported database types:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch database types' });
    }
  });
  
  // Register the router for the CRUD operations
  app.use('/api/database-conversion', databaseConversionRouter);
}
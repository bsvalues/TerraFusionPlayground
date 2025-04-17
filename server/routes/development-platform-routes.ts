import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { 
  ProjectManager, 
  FileManager, 
  PreviewEngine, 
  AICodeAssistant 
} from '../services/development';
import {
  insertDevelopmentProjectSchema,
  insertProjectFileSchema,
  insertProjectTemplateSchema,
  insertProjectVersionSchema,
  ProjectStatus
} from '../../shared/schema';

/**
 * Development Platform Routes
 * 
 * API endpoints for the TaxI_AI Development Platform
 * Provides functionality for managing projects, files, previews, and AI code generation
 */
export function createDevelopmentPlatformRoutes() {
  const router = Router();
  
  // Initialize services
  const projectManager = new ProjectManager(storage);
  const fileManager = new FileManager(storage);
  const previewEngine = new PreviewEngine(storage);
  const aiCodeAssistant = new AICodeAssistant(storage);
  
  // Project routes
  
  /**
   * Get all projects
   * 
   * Optionally filter by user ID or status
   */
  router.get('/projects', async (req, res) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      const status = req.query.status as ProjectStatus | undefined;
      
      const result = await projectManager.listProjects(userId, status);
      
      if (result.success) {
        res.json(result.projects || []);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });
  
  /**
   * Get project by ID
   */
  router.get('/projects/:id', async (req, res) => {
    try {
      const projectId = req.params.id;
      
      const result = await projectManager.getProject(projectId);
      
      if (result.success && result.project) {
        res.json(result.project);
      } else if (!result.success) {
        res.status(500).json({ error: result.message });
      } else {
        res.status(404).json({ error: 'Project not found' });
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });
  
  /**
   * Create a new project
   */
  router.post('/projects', async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertDevelopmentProjectSchema.parse(req.body);
      
      // Get user ID from session or token
      const userId = req.body.userId || 1; // Default for testing - replace with actual auth
      
      const result = await projectManager.createProject(validatedData, userId);
      
      if (result.success && result.project) {
        res.status(201).json(result.project);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
      }
    }
  });
  
  /**
   * Update a project
   */
  router.patch('/projects/:id', async (req, res) => {
    try {
      const projectId = req.params.id;
      const updateData = req.body;
      
      const result = await projectManager.updateProject(projectId, updateData);
      
      if (result.success && result.project) {
        res.json(result.project);
      } else if (!result.success) {
        res.status(500).json({ error: result.message });
      } else {
        res.status(404).json({ error: 'Project not found' });
      }
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });
  
  /**
   * Delete a project
   */
  router.delete('/projects/:id', async (req, res) => {
    try {
      const projectId = req.params.id;
      
      const result = await projectManager.deleteProject(projectId);
      
      if (result.success) {
        res.status(204).send();
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });
  
  // Project file routes
  
  /**
   * Get all files for a project
   */
  router.get('/projects/:projectId/files', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      
      const result = await fileManager.getProjectFiles(projectId);
      
      if (result.success) {
        res.json(result.files || []);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error fetching project files:', error);
      res.status(500).json({ error: 'Failed to fetch project files' });
    }
  });
  
  /**
   * Get file by path
   */
  router.get('/projects/:projectId/files/:path(*)', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const filePath = req.params.path;
      
      const result = await fileManager.getFile(projectId, filePath);
      
      if (result.success && result.file) {
        res.json(result.file);
      } else if (!result.success) {
        res.status(500).json({ error: result.message });
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } catch (error) {
      console.error('Error fetching file:', error);
      res.status(500).json({ error: 'Failed to fetch file' });
    }
  });
  
  /**
   * Create a new file
   */
  router.post('/projects/:projectId/files', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      
      // Validate request body
      const validatedData = insertProjectFileSchema.parse({
        ...req.body,
        projectId
      });
      
      // Get user ID from session or token
      const userId = req.body.userId || 1; // Default for testing - replace with actual auth
      
      const result = await fileManager.createFile(validatedData, userId);
      
      if (result.success && result.file) {
        res.status(201).json(result.file);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error creating file:', error);
        res.status(500).json({ error: 'Failed to create file' });
      }
    }
  });
  
  /**
   * Update a file
   */
  router.put('/projects/:projectId/files/:path(*)', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const filePath = req.params.path;
      const { content, userId = 1 } = req.body; // Default for testing - replace with actual auth
      
      const result = await fileManager.updateFile(projectId, filePath, content, userId);
      
      if (result.success && result.file) {
        res.json(result.file);
      } else if (!result.success) {
        res.status(500).json({ error: result.message });
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } catch (error) {
      console.error('Error updating file:', error);
      res.status(500).json({ error: 'Failed to update file' });
    }
  });
  
  /**
   * Delete a file
   */
  router.delete('/projects/:projectId/files/:path(*)', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const filePath = req.params.path;
      
      const result = await fileManager.deleteFile(projectId, filePath);
      
      if (result.success) {
        res.status(204).send();
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });
  
  // Project template routes
  
  /**
   * Get all templates
   */
  router.get('/templates', async (req, res) => {
    try {
      const { type, language } = req.query;
      
      const result = await projectManager.listTemplates(
        type as string, 
        language as string
      );
      
      if (result.success) {
        res.json(result.templates || []);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });
  
  /**
   * Get template by ID
   */
  router.get('/templates/:id', async (req, res) => {
    try {
      const templateId = req.params.id;
      
      const result = await projectManager.getTemplate(templateId);
      
      if (result.success && result.template) {
        res.json(result.template);
      } else if (!result.success) {
        res.status(500).json({ error: result.message });
      } else {
        res.status(404).json({ error: 'Template not found' });
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({ error: 'Failed to fetch template' });
    }
  });
  
  /**
   * Create a template
   */
  router.post('/templates', async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertProjectTemplateSchema.parse(req.body);
      
      // Get user ID from session or token
      const userId = req.body.userId || 1; // Default for testing - replace with actual auth
      
      const result = await projectManager.createTemplate(validatedData, userId);
      
      if (result.success && result.template) {
        res.status(201).json(result.template);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
      }
    }
  });
  
  /**
   * Create a template from a project
   */
  router.post('/projects/:projectId/templates', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const templateData = req.body;
      
      // Get user ID from session or token
      const userId = req.body.userId || 1; // Default for testing - replace with actual auth
      
      const result = await projectManager.createTemplateFromProject(
        projectId, 
        templateData, 
        userId
      );
      
      if (result.success && result.template) {
        res.status(201).json(result.template);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error creating template from project:', error);
      res.status(500).json({ error: 'Failed to create template from project' });
    }
  });
  
  /**
   * Delete a template
   */
  router.delete('/templates/:id', async (req, res) => {
    try {
      const templateId = req.params.id;
      
      // TODO: Add method to ProjectManager
      // const result = await projectManager.deleteTemplate(templateId);
      
      // Temporary implementation
      const template = await storage.getTemplate(Number(templateId));
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      await storage.deleteProjectTemplate(Number(templateId));
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });
  
  // Project version routes
  
  /**
   * Create a project version (commit)
   */
  router.post('/projects/:projectId/versions', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const { message, userId = 1 } = req.body; // Default for testing - replace with actual auth
      
      const result = await projectManager.createProjectVersion(projectId, message, userId);
      
      if (result.success && result.version) {
        res.status(201).json(result.version);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error creating project version:', error);
      res.status(500).json({ error: 'Failed to create project version' });
    }
  });
  
  /**
   * Get all versions for a project
   */
  router.get('/projects/:projectId/versions', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      
      const result = await projectManager.listProjectVersions(projectId);
      
      if (result.success) {
        res.json(result.versions || []);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error fetching project versions:', error);
      res.status(500).json({ error: 'Failed to fetch project versions' });
    }
  });
  
  /**
   * Restore project to a version
   */
  router.post('/projects/:projectId/versions/:versionId/restore', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const versionId = req.params.versionId;
      const userId = req.body.userId || 1; // Default for testing - replace with actual auth
      
      const result = await projectManager.restoreProjectVersion(projectId, versionId, userId);
      
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error restoring project version:', error);
      res.status(500).json({ error: 'Failed to restore project version' });
    }
  });
  
  // Preview routes
  
  /**
   * Initialize preview settings for a project
   */
  router.post('/projects/:projectId/preview', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      
      const result = await previewEngine.initializePreview(projectId);
      
      if (result.success && result.previewSetting) {
        res.status(201).json(result.previewSetting);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error initializing preview:', error);
      res.status(500).json({ error: 'Failed to initialize preview' });
    }
  });
  
  /**
   * Get preview status
   */
  router.get('/projects/:projectId/preview', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      
      const result = await previewEngine.getPreviewStatus(projectId);
      
      if (result.success) {
        res.json({
          ...result.previewSetting,
          url: result.url,
          logs: result.logs
        });
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error fetching preview status:', error);
      res.status(500).json({ error: 'Failed to fetch preview status' });
    }
  });
  
  /**
   * Start preview
   */
  router.post('/projects/:projectId/preview/start', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      
      const result = await previewEngine.startPreview(projectId);
      
      if (result.success) {
        res.json({
          success: true,
          url: result.url,
          port: result.port
        });
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error starting preview:', error);
      res.status(500).json({ error: 'Failed to start preview' });
    }
  });
  
  /**
   * Stop preview
   */
  router.post('/projects/:projectId/preview/stop', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      
      const result = await previewEngine.stopPreview(projectId);
      
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error stopping preview:', error);
      res.status(500).json({ error: 'Failed to stop preview' });
    }
  });
  
  /**
   * Restart preview
   */
  router.post('/projects/:projectId/preview/restart', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      
      const result = await previewEngine.restartPreview(projectId);
      
      if (result.success) {
        res.json({
          success: true,
          url: result.url,
          port: result.port
        });
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error restarting preview:', error);
      res.status(500).json({ error: 'Failed to restart preview' });
    }
  });
  
  /**
   * Update preview settings
   */
  router.patch('/projects/:projectId/preview', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const updateData = req.body;
      
      const result = await previewEngine.updatePreviewSettings(projectId, updateData);
      
      if (result.success && result.previewSetting) {
        res.json(result.previewSetting);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error updating preview settings:', error);
      res.status(500).json({ error: 'Failed to update preview settings' });
    }
  });
  
  // AI Code Generation routes
  
  /**
   * Generate code
   */
  router.post('/projects/:projectId/generate-code', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const { prompt, fileId, userId = 1 } = req.body; // Default for testing - replace with actual auth
      
      const result = await aiCodeAssistant.generateCode(projectId, prompt, fileId, userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error generating code:', error);
      res.status(500).json({ error: 'Failed to generate code' });
    }
  });
  
  /**
   * Complete code
   */
  router.post('/files/:fileId/complete-code', async (req, res) => {
    try {
      const fileId = req.params.fileId;
      const { cursorPosition, userId = 1 } = req.body; // Default for testing - replace with actual auth
      
      const result = await aiCodeAssistant.completeCode(fileId, cursorPosition, userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error completing code:', error);
      res.status(500).json({ error: 'Failed to complete code' });
    }
  });
  
  /**
   * Generate documentation
   */
  router.post('/files/:fileId/generate-documentation', async (req, res) => {
    try {
      const fileId = req.params.fileId;
      const userId = req.body.userId || 1; // Default for testing - replace with actual auth
      
      const result = await aiCodeAssistant.generateDocumentation(fileId, userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error generating documentation:', error);
      res.status(500).json({ error: 'Failed to generate documentation' });
    }
  });
  
  /**
   * Get AI code generations for a project
   */
  router.get('/projects/:projectId/code-generations', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      
      // Temporary implementation
      const generations = await storage.getAiCodeGenerationsByProject(Number(projectId));
      
      res.json(generations);
    } catch (error) {
      console.error('Error fetching code generations:', error);
      res.status(500).json({ error: 'Failed to fetch code generations' });
    }
  });
  
  return router;
}
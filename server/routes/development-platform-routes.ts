import express from 'express';
import { z } from 'zod';
import { projectManager } from '../services/development/project-manager';
import { fileManager } from '../services/development/file-manager';
import { previewEngine } from '../services/development/preview-engine';
import { aiCodeAssistant } from '../services/development/ai-code-assistant';
import { insertDevProjectSchema, DevFileType } from '@shared/schema';
import path from 'path';

const router = express.Router();

// Project routes
router.get('/projects', async (req, res) => {
  try {
    const projects = await projectManager.getProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

router.get('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await projectManager.getProjectById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const validationResult = insertDevProjectSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error });
    }
    
    const project = await projectManager.createProject(validationResult.data);
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.put('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const validatedData = insertDevProjectSchema.partial().parse(req.body);
    
    const project = await projectManager.updateProject(projectId, validatedData);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await projectManager.deleteProject(projectId);
    
    if (!result) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Project metadata routes
router.get('/project-types', (req, res) => {
  try {
    const types = projectManager.getProjectTypes();
    res.json(types);
  } catch (error) {
    console.error('Error getting project types:', error);
    res.status(500).json({ error: 'Failed to get project types' });
  }
});

router.get('/project-statuses', (req, res) => {
  try {
    const statuses = projectManager.getProjectStatuses();
    res.json(statuses);
  } catch (error) {
    console.error('Error getting project statuses:', error);
    res.status(500).json({ error: 'Failed to get project statuses' });
  }
});

router.get('/programming-languages', (req, res) => {
  try {
    const languages = projectManager.getProjectLanguages();
    res.json(languages);
  } catch (error) {
    console.error('Error getting programming languages:', error);
    res.status(500).json({ error: 'Failed to get programming languages' });
  }
});

// File routes
router.get('/projects/:projectId/files', async (req, res) => {
  try {
    const { projectId } = req.params;
    const fileTree = await fileManager.buildFileTree(projectId);
    res.json(fileTree);
  } catch (error) {
    console.error('Error getting project files:', error);
    res.status(500).json({ error: 'Failed to get project files' });
  }
});

router.get('/projects/:projectId/files/*', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0];
    
    const file = await fileManager.getFileByPath(projectId, filePath);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json({
      content: file.content,
      path: file.path,
      name: file.name,
      type: file.type
    });
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

router.post('/projects/:projectId/files', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path: filePath, name, content, type } = req.body;
    
    if (!filePath || !name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const parentPath = path.dirname(filePath) === '.' ? null : path.dirname(filePath);
    
    const file = await fileManager.createFile({
      projectId,
      path: filePath,
      name,
      type,
      content: content || '',
      size: content ? Buffer.from(content).length : 0,
      createdBy: req.body.userId || 1, // Default to user ID 1 if not provided
      parentPath
    });
    
    res.status(201).json(file);
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

router.put('/projects/:projectId/files/*', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0];
    const { content } = req.body;
    
    if (content === undefined) {
      return res.status(400).json({ error: 'Missing content field' });
    }
    
    const updatedFile = await fileManager.updateFile(projectId, filePath, { content });
    
    if (!updatedFile) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(updatedFile);
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

router.delete('/projects/:projectId/files/*', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0];
    
    const result = await fileManager.deleteFile(projectId, filePath);
    
    if (!result) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Preview routes
router.get('/projects/:projectId/preview', async (req, res) => {
  try {
    const { projectId } = req.params;
    const previewStatus = await previewEngine.getPreviewStatus(projectId);
    res.json(previewStatus);
  } catch (error) {
    console.error('Error getting preview status:', error);
    res.status(500).json({ error: 'Failed to get preview status' });
  }
});

router.post('/projects/:projectId/preview/start', async (req, res) => {
  try {
    const { projectId } = req.params;
    const previewStatus = await previewEngine.startPreview(projectId);
    res.json(previewStatus);
  } catch (error) {
    console.error('Error starting preview:', error);
    res.status(500).json({ error: 'Failed to start preview' });
  }
});

router.post('/projects/:projectId/preview/stop', async (req, res) => {
  try {
    const { projectId } = req.params;
    const previewStatus = await previewEngine.stopPreview(projectId);
    res.json(previewStatus);
  } catch (error) {
    console.error('Error stopping preview:', error);
    res.status(500).json({ error: 'Failed to stop preview' });
  }
});

// AI Code Assistant routes
router.post('/ai/generate-code', async (req, res) => {
  try {
    const { prompt, fileContext } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt field' });
    }
    
    const code = await aiCodeAssistant.generateCodeSuggestion(prompt, fileContext);
    res.json({ code });
  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

router.post('/ai/complete-code', async (req, res) => {
  try {
    const { codeSnippet, language } = req.body;
    
    if (!codeSnippet || !language) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const completedCode = await aiCodeAssistant.completeCode(codeSnippet, language);
    res.json({ code: completedCode });
  } catch (error) {
    console.error('Error completing code:', error);
    res.status(500).json({ error: 'Failed to complete code' });
  }
});

router.post('/ai/explain-code', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Missing code field' });
    }
    
    const explanation = await aiCodeAssistant.explainCode(code);
    res.json({ explanation });
  } catch (error) {
    console.error('Error explaining code:', error);
    res.status(500).json({ error: 'Failed to explain code' });
  }
});

router.post('/ai/fix-bugs', async (req, res) => {
  try {
    const { code, errorMessage } = req.body;
    
    if (!code || !errorMessage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const fixedCode = await aiCodeAssistant.fixBugs(code, errorMessage);
    res.json({ code: fixedCode });
  } catch (error) {
    console.error('Error fixing bugs:', error);
    res.status(500).json({ error: 'Failed to fix bugs' });
  }
});

router.post('/ai/recommend-improvement', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Missing code field' });
    }
    
    const recommendations = await aiCodeAssistant.recommendImprovement(code);
    res.json({ recommendations });
  } catch (error) {
    console.error('Error recommending improvements:', error);
    res.status(500).json({ error: 'Failed to recommend improvements' });
  }
});

export default router;
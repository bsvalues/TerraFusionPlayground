/**
 * Preview Engine Service
 * 
 * Manages preview environments for development projects
 * Handles starting, stopping, and monitoring project preview servers
 */

import { IStorage } from '../../storage';
import { 
  PreviewSetting, 
  InsertPreviewSetting,
  PreviewStatus,
  ProjectType,
  ProjectLanguage
} from '../../../shared/schema';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Map to keep track of running processes
const runningPreviews = new Map<string, ChildProcess>();

export interface PreviewOperationResult {
  success: boolean;
  message?: string;
  previewSetting?: PreviewSetting;
  url?: string;
  logs?: string[];
  port?: number;
}

export class PreviewEngine {
  constructor(private storage: IStorage) {}

  /**
   * Initialize preview settings for a project
   * 
   * @param projectId - Project ID
   * @returns PreviewOperationResult
   */
  async initializePreview(projectId: string): Promise<PreviewOperationResult> {
    try {
      // Check if preview settings already exist
      const existingSettings = await this.storage.findPreviewSettingByProjectId(projectId);
      if (existingSettings) {
        return { success: true, previewSetting: existingSettings };
      }
      
      // Get project details
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }
      
      // Determine appropriate preview command based on project type and language
      const command = this.determinePreviewCommand(project.type, project.language);
      
      // Find an available port
      const port = await this.findAvailablePort(3000, 3100);
      
      // Create preview settings
      const newSettings: InsertPreviewSetting = {
        projectId,
        port,
        command,
        env: {},
        autoRefresh: true,
        status: PreviewStatus.STOPPED,
        logs: []
      };
      
      const previewSetting = await this.storage.createPreviewSetting(newSettings);
      
      return { success: true, previewSetting };
    } catch (err) {
      console.error('Error initializing preview:', err);
      return { success: false, message: `Error initializing preview: ${err.message}` };
    }
  }

  /**
   * Determine appropriate preview command based on project type and language
   * 
   * @param projectType - Project type
   * @param language - Project language
   * @returns Preview command
   */
  private determinePreviewCommand(projectType: string, language: string): string {
    if (language === ProjectLanguage.PYTHON) {
      if (projectType === ProjectType.API_SERVICE) {
        return 'python -m uvicorn src.main:app --host 0.0.0.0 --port {PORT} --reload';
      } else {
        return 'python src/main.py';
      }
    } else if (language === ProjectLanguage.JAVASCRIPT) {
      if (projectType === ProjectType.WEB_APPLICATION) {
        return 'npm run dev || npx vite --host 0.0.0.0 --port {PORT}';
      } else if (projectType === ProjectType.API_SERVICE) {
        return 'node src/index.js';
      } else {
        return 'npm start || node src/index.js';
      }
    } else if (language === ProjectLanguage.TYPESCRIPT) {
      if (projectType === ProjectType.WEB_APPLICATION) {
        return 'npm run dev || npx vite --host 0.0.0.0 --port {PORT}';
      } else if (projectType === ProjectType.API_SERVICE) {
        return 'npx ts-node src/index.ts';
      } else {
        return 'npm start || npx ts-node src/index.ts';
      }
    }
    
    // Default fallback
    return 'npm start';
  }

  /**
   * Find an available port in the given range
   * 
   * @param startPort - Starting port number
   * @param endPort - Ending port number
   * @returns Available port
   */
  private async findAvailablePort(startPort: number, endPort: number): Promise<number> {
    // This is a simplified version for the simulation
    // In a real implementation, we would check if ports are in use
    
    // For now, just return a random port in the range
    return Math.floor(Math.random() * (endPort - startPort + 1)) + startPort;
  }

  /**
   * Start a project preview
   * 
   * @param projectId - Project ID
   * @returns PreviewOperationResult
   */
  async startPreview(projectId: string): Promise<PreviewOperationResult> {
    try {
      // Get preview settings
      let settings = await this.storage.findPreviewSettingByProjectId(projectId);
      if (!settings) {
        // Initialize preview settings if they don't exist
        const initResult = await this.initializePreview(projectId);
        if (!initResult.success) {
          return initResult;
        }
        settings = initResult.previewSetting;
      }
      
      // Check if preview is already running
      if (settings.status === PreviewStatus.RUNNING) {
        return { 
          success: true, 
          message: 'Preview is already running', 
          previewSetting: settings,
          url: `http://localhost:${settings.port}`,
          port: settings.port
        };
      }
      
      // Get project
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }
      
      // Export files to a temporary directory
      const tempDir = await this.exportProjectFiles(projectId);
      
      // Prepare command
      const command = settings.command.replace('{PORT}', settings.port.toString());
      const [cmd, ...args] = command.split(' ');
      
      // Prepare environment variables
      const env = {
        ...process.env,
        ...settings.env,
        PORT: settings.port.toString(),
      };
      
      // Start process
      const process = spawn(cmd, args, {
        cwd: tempDir,
        env,
        shell: true
      });
      
      // Store running process
      runningPreviews.set(projectId, process);
      
      // Capture output
      const logs: string[] = [];
      
      process.stdout.on('data', (data) => {
        const log = data.toString();
        logs.push(log);
        this.appendLog(projectId, log);
      });
      
      process.stderr.on('data', (data) => {
        const log = `ERROR: ${data.toString()}`;
        logs.push(log);
        this.appendLog(projectId, log);
      });
      
      process.on('close', (code) => {
        this.appendLog(projectId, `Process exited with code ${code}`);
        this.updatePreviewStatus(projectId, PreviewStatus.STOPPED);
        runningPreviews.delete(projectId);
      });
      
      // Update status
      await this.updatePreviewStatus(projectId, PreviewStatus.RUNNING);
      
      // Update preview settings
      const updatedSettings = await this.storage.updatePreviewSetting(settings.id, {
        status: PreviewStatus.RUNNING,
        lastStarted: new Date(),
        pid: process.pid,
      });
      
      return { 
        success: true, 
        message: 'Preview started', 
        previewSetting: updatedSettings,
        url: `http://localhost:${settings.port}`,
        port: settings.port,
        logs
      };
    } catch (err) {
      console.error('Error starting preview:', err);
      return { success: false, message: `Error starting preview: ${err.message}` };
    }
  }

  /**
   * Stop a running preview
   * 
   * @param projectId - Project ID
   * @returns PreviewOperationResult
   */
  async stopPreview(projectId: string): Promise<PreviewOperationResult> {
    try {
      // Get preview settings
      const settings = await this.storage.findPreviewSettingByProjectId(projectId);
      if (!settings) {
        return { success: false, message: `Preview settings for project ${projectId} not found` };
      }
      
      // Check if preview is running
      if (settings.status !== PreviewStatus.RUNNING) {
        return { success: true, message: 'Preview is not running', previewSetting: settings };
      }
      
      // Get running process
      const process = runningPreviews.get(projectId);
      if (process) {
        // Kill process
        process.kill();
        runningPreviews.delete(projectId);
      }
      
      // Update status
      await this.updatePreviewStatus(projectId, PreviewStatus.STOPPED);
      
      // Update preview settings
      const updatedSettings = await this.storage.updatePreviewSetting(settings.id, {
        status: PreviewStatus.STOPPED,
        lastStopped: new Date(),
        pid: null
      });
      
      return { 
        success: true, 
        message: 'Preview stopped', 
        previewSetting: updatedSettings
      };
    } catch (err) {
      console.error('Error stopping preview:', err);
      return { success: false, message: `Error stopping preview: ${err.message}` };
    }
  }

  /**
   * Restart a preview
   * 
   * @param projectId - Project ID
   * @returns PreviewOperationResult
   */
  async restartPreview(projectId: string): Promise<PreviewOperationResult> {
    try {
      // Stop preview if running
      await this.stopPreview(projectId);
      
      // Start preview
      return await this.startPreview(projectId);
    } catch (err) {
      console.error('Error restarting preview:', err);
      return { success: false, message: `Error restarting preview: ${err.message}` };
    }
  }

  /**
   * Get preview status and logs
   * 
   * @param projectId - Project ID
   * @returns PreviewOperationResult
   */
  async getPreviewStatus(projectId: string): Promise<PreviewOperationResult> {
    try {
      // Get preview settings
      const settings = await this.storage.findPreviewSettingByProjectId(projectId);
      if (!settings) {
        return { success: false, message: `Preview settings for project ${projectId} not found` };
      }
      
      return { 
        success: true, 
        previewSetting: settings,
        logs: settings.logs,
        url: settings.status === PreviewStatus.RUNNING ? `http://localhost:${settings.port}` : undefined,
        port: settings.port
      };
    } catch (err) {
      console.error('Error getting preview status:', err);
      return { success: false, message: `Error getting preview status: ${err.message}` };
    }
  }

  /**
   * Update preview settings
   * 
   * @param projectId - Project ID
   * @param updateData - Settings to update
   * @returns PreviewOperationResult
   */
  async updatePreviewSettings(
    projectId: string, 
    updateData: Partial<PreviewSetting>
  ): Promise<PreviewOperationResult> {
    try {
      // Get preview settings
      const settings = await this.storage.findPreviewSettingByProjectId(projectId);
      if (!settings) {
        return { success: false, message: `Preview settings for project ${projectId} not found` };
      }
      
      // Remove fields that should not be updated
      const { id, projectId: pId, ...updatableData } = updateData as any;
      
      // Update settings
      const updatedSettings = await this.storage.updatePreviewSetting(settings.id, updatableData);
      
      return { success: true, previewSetting: updatedSettings };
    } catch (err) {
      console.error('Error updating preview settings:', err);
      return { success: false, message: `Error updating preview settings: ${err.message}` };
    }
  }

  /**
   * Update preview status
   * 
   * @param projectId - Project ID
   * @param status - New status
   */
  private async updatePreviewStatus(projectId: string, status: PreviewStatus): Promise<void> {
    try {
      const settings = await this.storage.findPreviewSettingByProjectId(projectId);
      if (settings) {
        await this.storage.updatePreviewSetting(settings.id, { status });
      }
    } catch (err) {
      console.error('Error updating preview status:', err);
    }
  }

  /**
   * Append log to preview logs
   * 
   * @param projectId - Project ID
   * @param log - Log message
   */
  private async appendLog(projectId: string, log: string): Promise<void> {
    try {
      const settings = await this.storage.findPreviewSettingByProjectId(projectId);
      if (settings) {
        const logs = [...settings.logs, log].slice(-100); // Keep only last 100 logs
        await this.storage.updatePreviewSetting(settings.id, { logs });
      }
    } catch (err) {
      console.error('Error appending log:', err);
    }
  }

  /**
   * Export project files to a temporary directory
   * 
   * @param projectId - Project ID
   * @returns Path to temporary directory
   */
  private async exportProjectFiles(projectId: string): Promise<string> {
    try {
      // Create temporary directory
      const tempDir = path.join(os.tmpdir(), `taxi-ai-preview-${projectId}`);
      
      // Ensure directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      } else {
        // Clear existing directory
        fs.rmSync(tempDir, { recursive: true, force: true });
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Get all project files
      const files = await this.storage.findProjectFilesByProjectId(projectId);
      
      // First create all directories
      for (const file of files) {
        if (file.isDirectory) {
          const dirPath = path.join(tempDir, file.path);
          fs.mkdirSync(dirPath, { recursive: true });
        }
      }
      
      // Then write all files
      for (const file of files) {
        if (!file.isDirectory) {
          const filePath = path.join(tempDir, file.path);
          fs.writeFileSync(filePath, file.content);
        }
      }
      
      return tempDir;
    } catch (err) {
      console.error('Error exporting project files:', err);
      throw err;
    }
  }

  /**
   * Clean up all running previews
   */
  async cleanupAllPreviews(): Promise<void> {
    for (const [projectId, process] of runningPreviews) {
      try {
        process.kill();
        await this.updatePreviewStatus(projectId, PreviewStatus.STOPPED);
      } catch (err) {
        console.error(`Error stopping preview for project ${projectId}:`, err);
      }
    }
    
    runningPreviews.clear();
  }
}
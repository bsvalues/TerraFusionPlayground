/**
 * Project Manager Service
 * 
 * Manages development projects for the TaxI_AI Development Platform
 * Handles project creation, updating, deletion, and template management
 */

import { IStorage } from '../../storage';
import { 
  DevelopmentProject, 
  InsertDevelopmentProject,
  ProjectType,
  ProjectLanguage,
  ProjectStatus,
  ProjectTemplate,
  InsertProjectTemplate,
  ProjectVersion,
  InsertProjectVersion,
  FileType
} from '../../../shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { FileManager } from './file-manager';

export interface ProjectOperationResult {
  success: boolean;
  message?: string;
  project?: DevelopmentProject;
  projects?: DevelopmentProject[];
  template?: ProjectTemplate;
  templates?: ProjectTemplate[];
  version?: ProjectVersion;
}

export class ProjectManager {
  private fileManager: FileManager;
  
  constructor(private storage: IStorage) {
    this.fileManager = new FileManager(storage);
  }

  /**
   * Create a new development project
   * 
   * @param projectData - Project data
   * @param userId - User ID creating the project
   * @returns ProjectOperationResult
   */
  async createProject(
    projectData: Omit<InsertDevelopmentProject, 'projectId'>,
    userId: number
  ): Promise<ProjectOperationResult> {
    try {
      // Generate UUID for project
      const projectId = uuidv4();
      
      // Create project record
      const newProject: InsertDevelopmentProject = {
        ...projectData,
        projectId,
        createdBy: userId
      };
      
      const project = await this.storage.createDevelopmentProject(newProject);
      
      // Create initial project structure if from a template
      if (project.template) {
        await this.applyTemplate(project.projectId, project.template, userId);
      } else {
        // Create a basic project structure
        await this.createDefaultProjectStructure(project.projectId, project.type, project.language, userId);
      }
      
      return { success: true, project };
    } catch (err) {
      console.error('Error creating project:', err);
      return { success: false, message: `Error creating project: ${err.message}` };
    }
  }

  /**
   * Apply a template to a project
   * 
   * @param projectId - Project ID
   * @param templateId - Template ID
   * @param userId - User ID
   * @returns ProjectOperationResult
   */
  private async applyTemplate(
    projectId: string, 
    templateId: string, 
    userId: number
  ): Promise<ProjectOperationResult> {
    try {
      // Get template
      const template = await this.storage.findProjectTemplateByTemplateId(templateId);
      if (!template) {
        return { success: false, message: `Template with ID ${templateId} not found` };
      }
      
      // Create files from template
      const fileStructure = template.files as any;
      
      // Process file structure (recursive function)
      await this.processTemplateFiles(projectId, fileStructure, '', userId);
      
      return { success: true };
    } catch (err) {
      console.error('Error applying template:', err);
      return { success: false, message: `Error applying template: ${err.message}` };
    }
  }

  /**
   * Process template files recursively
   * 
   * @param projectId - Project ID
   * @param files - File structure object
   * @param parentPath - Current parent path
   * @param userId - User ID
   */
  private async processTemplateFiles(
    projectId: string, 
    files: any, 
    parentPath: string,
    userId: number
  ): Promise<void> {
    for (const [name, value] of Object.entries(files)) {
      const currentPath = parentPath ? `${parentPath}/${name}` : name;
      
      if (typeof value === 'string') {
        // It's a file
        await this.fileManager.createFile(
          projectId, 
          currentPath, 
          value, 
          userId, 
          this.determineFileType(name)
        );
      } else {
        // It's a directory
        await this.fileManager.createDirectory(projectId, currentPath, userId);
        await this.processTemplateFiles(projectId, value, currentPath, userId);
      }
    }
  }

  /**
   * Create a default project structure based on project type and language
   * 
   * @param projectId - Project ID
   * @param projectType - Project type
   * @param language - Project language
   * @param userId - User ID
   */
  private async createDefaultProjectStructure(
    projectId: string,
    projectType: string,
    language: string,
    userId: number
  ): Promise<void> {
    // Create directories
    await this.fileManager.createDirectory(projectId, 'src', userId);
    await this.fileManager.createDirectory(projectId, 'docs', userId);
    
    // Create README file
    await this.fileManager.createFile(
      projectId,
      'README.md',
      `# Project Overview\n\nA project created with TaxI_AI Development Platform.`,
      userId,
      FileType.MARKDOWN
    );
    
    if (language === ProjectLanguage.PYTHON) {
      // Create Python-specific files
      await this.fileManager.createFile(
        projectId,
        'requirements.txt',
        '',
        userId,
        FileType.CONFIG
      );
      
      await this.fileManager.createFile(
        projectId,
        'src/__init__.py',
        '',
        userId,
        FileType.CODE
      );
      
      await this.fileManager.createFile(
        projectId,
        'src/main.py',
        '# Main application entry point\n\ndef main():\n    print("Application started")\n\nif __name__ == "__main__":\n    main()',
        userId,
        FileType.CODE
      );
    } else if (language === ProjectLanguage.JAVASCRIPT || language === ProjectLanguage.TYPESCRIPT) {
      // Create JS/TS specific files
      const isTypescript = language === ProjectLanguage.TYPESCRIPT;
      const mainExt = isTypescript ? 'ts' : 'js';
      
      await this.fileManager.createFile(
        projectId,
        'package.json',
        `{\n  "name": "taxi-ai-project",\n  "version": "1.0.0",\n  "main": "src/index.${mainExt}"\n}`,
        userId,
        FileType.JSON
      );
      
      if (isTypescript) {
        await this.fileManager.createFile(
          projectId,
          'tsconfig.json',
          `{\n  "compilerOptions": {\n    "target": "ES2020",\n    "module": "commonjs",\n    "outDir": "./dist",\n    "strict": true,\n    "esModuleInterop": true\n  }\n}`,
          userId,
          FileType.JSON
        );
      }
      
      await this.fileManager.createFile(
        projectId,
        `src/index.${mainExt}`,
        `// Main application entry point\n\nfunction main() {\n  console.log("Application started");\n}\n\nmain();`,
        userId,
        FileType.CODE
      );
    }
    
    // Add project type specific files
    if (projectType === ProjectType.API_SERVICE) {
      if (language === ProjectLanguage.PYTHON) {
        await this.fileManager.createFile(
          projectId,
          'src/api.py',
          '# API endpoints definition\n\nfrom fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/")\ndef read_root():\n    return {"message": "API is running"}',
          userId,
          FileType.CODE
        );
      } else if (language === ProjectLanguage.JAVASCRIPT || language === ProjectLanguage.TYPESCRIPT) {
        const ext = language === ProjectLanguage.TYPESCRIPT ? 'ts' : 'js';
        await this.fileManager.createFile(
          projectId,
          `src/api.${ext}`,
          `// API endpoints definition\n\nconst express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.json({ message: 'API is running' });\n});\n\nmodule.exports = app;`,
          userId,
          FileType.CODE
        );
      }
    } else if (projectType === ProjectType.AI_AGENT) {
      if (language === ProjectLanguage.PYTHON) {
        await this.fileManager.createFile(
          projectId,
          'src/agent.py',
          '# AI Agent definition\n\nclass Agent:\n    def __init__(self):\n        self.name = "TaxI_AI Agent"\n    \n    def process(self, input_data):\n        # Process input and return response\n        return {"response": f"Processed: {input_data}"}',
          userId,
          FileType.CODE
        );
      } else if (language === ProjectLanguage.JAVASCRIPT || language === ProjectLanguage.TYPESCRIPT) {
        const ext = language === ProjectLanguage.TYPESCRIPT ? 'ts' : 'js';
        await this.fileManager.createFile(
          projectId,
          `src/agent.${ext}`,
          `// AI Agent definition\n\nclass Agent {\n  constructor() {\n    this.name = "TaxI_AI Agent";\n  }\n\n  process(inputData) {\n    // Process input and return response\n    return { response: \`Processed: \${inputData}\` };\n  }\n}\n\nmodule.exports = Agent;`,
          userId,
          FileType.CODE
        );
      }
    }
  }

  /**
   * Determine file type based on file name/extension
   * 
   * @param fileName - File name
   * @returns FileType
   */
  private determineFileType(fileName: string): FileType {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    switch (ext) {
      case 'js':
      case 'ts':
      case 'py':
      case 'java':
      case 'cs':
      case 'cpp':
      case 'c':
      case 'go':
      case 'rb':
      case 'php':
        return FileType.CODE;
      case 'md':
      case 'markdown':
        return FileType.MARKDOWN;
      case 'json':
        return FileType.JSON;
      case 'yml':
      case 'yaml':
      case 'toml':
      case 'ini':
      case 'env':
      case 'config':
        return FileType.CONFIG;
      case 'csv':
      case 'tsv':
      case 'xml':
        return FileType.DATA;
      default:
        return FileType.OTHER;
    }
  }

  /**
   * Get a project by ID
   * 
   * @param projectId - Project ID
   * @returns ProjectOperationResult
   */
  async getProject(projectId: string): Promise<ProjectOperationResult> {
    try {
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }
      
      return { success: true, project };
    } catch (err) {
      console.error('Error getting project:', err);
      return { success: false, message: `Error getting project: ${err.message}` };
    }
  }

  /**
   * Update project details
   * 
   * @param projectId - Project ID
   * @param updateData - Project data to update
   * @returns ProjectOperationResult
   */
  async updateProject(projectId: string, updateData: Partial<DevelopmentProject>): Promise<ProjectOperationResult> {
    try {
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }
      
      // Remove fields that should not be updated
      const { id, projectId: pId, createdAt, createdBy, ...updatableData } = updateData as any;
      
      // Update project
      updatableData.updatedAt = new Date();
      const updatedProject = await this.storage.updateDevelopmentProject(project.id, updatableData);
      
      return { success: true, project: updatedProject };
    } catch (err) {
      console.error('Error updating project:', err);
      return { success: false, message: `Error updating project: ${err.message}` };
    }
  }

  /**
   * Delete a project
   * 
   * @param projectId - Project ID
   * @returns ProjectOperationResult
   */
  async deleteProject(projectId: string): Promise<ProjectOperationResult> {
    try {
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }
      
      // Delete all files associated with the project
      const files = await this.storage.findProjectFilesByProjectId(projectId);
      for (const file of files) {
        await this.storage.deleteProjectFile(file.id);
      }
      
      // Delete all versions
      const versions = await this.storage.findProjectVersionsByProjectId(projectId);
      for (const version of versions) {
        await this.storage.deleteProjectVersion(version.id);
      }
      
      // Delete preview settings
      const previewSettings = await this.storage.findPreviewSettingByProjectId(projectId);
      if (previewSettings) {
        await this.storage.deletePreviewSetting(previewSettings.id);
      }
      
      // Finally delete the project
      await this.storage.deleteDevelopmentProject(project.id);
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting project:', err);
      return { success: false, message: `Error deleting project: ${err.message}` };
    }
  }

  /**
   * List all projects with optional filtering
   * 
   * @param userId - Optional user ID to filter by
   * @param status - Optional status to filter by
   * @returns ProjectOperationResult
   */
  async listProjects(userId?: number, status?: ProjectStatus): Promise<ProjectOperationResult> {
    try {
      let projects: DevelopmentProject[];
      
      if (userId && status) {
        projects = await this.storage.findDevelopmentProjectsByUserAndStatus(userId, status);
      } else if (userId) {
        projects = await this.storage.findDevelopmentProjectsByUser(userId);
      } else if (status) {
        projects = await this.storage.findDevelopmentProjectsByStatus(status);
      } else {
        projects = await this.storage.findAllDevelopmentProjects();
      }
      
      return { success: true, projects };
    } catch (err) {
      console.error('Error listing projects:', err);
      return { success: false, message: `Error listing projects: ${err.message}` };
    }
  }

  /**
   * Search for projects by name or description
   * 
   * @param query - Search query
   * @param userId - Optional user ID to filter by
   * @returns ProjectOperationResult
   */
  async searchProjects(query: string, userId?: number): Promise<ProjectOperationResult> {
    try {
      let projects: DevelopmentProject[];
      
      if (userId) {
        projects = await this.storage.findDevelopmentProjectsByUser(userId);
      } else {
        projects = await this.storage.findAllDevelopmentProjects();
      }
      
      // Filter by query
      const filteredProjects = projects.filter(project => 
        project.name.toLowerCase().includes(query.toLowerCase()) || 
        (project.description && project.description.toLowerCase().includes(query.toLowerCase()))
      );
      
      return { success: true, projects: filteredProjects };
    } catch (err) {
      console.error('Error searching projects:', err);
      return { success: false, message: `Error searching projects: ${err.message}` };
    }
  }

  /**
   * Create a project template
   * 
   * @param templateData - Template data
   * @param userId - User ID creating the template
   * @returns ProjectOperationResult
   */
  async createTemplate(
    templateData: Omit<InsertProjectTemplate, 'templateId'>,
    userId: number
  ): Promise<ProjectOperationResult> {
    try {
      // Generate UUID for template
      const templateId = uuidv4();
      
      // Create template record
      const newTemplate: InsertProjectTemplate = {
        ...templateData,
        templateId,
        createdBy: userId
      };
      
      const template = await this.storage.createProjectTemplate(newTemplate);
      
      return { success: true, template };
    } catch (err) {
      console.error('Error creating template:', err);
      return { success: false, message: `Error creating template: ${err.message}` };
    }
  }

  /**
   * Create a template from an existing project
   * 
   * @param projectId - Source project ID
   * @param templateData - Basic template info
   * @param userId - User ID creating the template
   * @returns ProjectOperationResult
   */
  async createTemplateFromProject(
    projectId: string,
    templateData: Pick<InsertProjectTemplate, 'name' | 'description' | 'category' | 'tags'>,
    userId: number
  ): Promise<ProjectOperationResult> {
    try {
      // Get project details
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }
      
      // Get all project files
      const files = await this.storage.findProjectFilesByProjectId(projectId);
      
      // Build template file structure
      const fileStructure = this.buildTemplateFileStructure(files);
      
      // Create the template
      return await this.createTemplate(
        {
          ...templateData,
          type: project.type as ProjectType,
          language: project.language as ProjectLanguage,
          framework: project.framework,
          files: fileStructure,
          dependencies: project.config?.dependencies || {},
          isOfficial: false
        },
        userId
      );
    } catch (err) {
      console.error('Error creating template from project:', err);
      return { success: false, message: `Error creating template from project: ${err.message}` };
    }
  }

  /**
   * Build template file structure from flat list of files
   * 
   * @param files - List of all project files
   * @returns Template file structure object
   */
  private buildTemplateFileStructure(files: ProjectFile[]): any {
    const structure: any = {};
    
    // First sort files to ensure parent directories are processed first
    const sortedFiles = [...files].sort((a, b) => {
      // Directories first
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      
      // Then by path depth
      const aDepth = a.path.split('/').length;
      const bDepth = b.path.split('/').length;
      return aDepth - bDepth;
    });
    
    for (const file of sortedFiles) {
      if (file.path === '') continue;
      
      const pathParts = file.path.split('/');
      let current = structure;
      
      // Navigate through the structure to find the right place
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      // Add the file/directory
      const name = pathParts[pathParts.length - 1];
      if (file.isDirectory) {
        current[name] = {};
      } else {
        current[name] = file.content;
      }
    }
    
    return structure;
  }

  /**
   * Get template by ID
   * 
   * @param templateId - Template ID
   * @returns ProjectOperationResult
   */
  async getTemplate(templateId: string): Promise<ProjectOperationResult> {
    try {
      const template = await this.storage.findProjectTemplateByTemplateId(templateId);
      if (!template) {
        return { success: false, message: `Template with ID ${templateId} not found` };
      }
      
      return { success: true, template };
    } catch (err) {
      console.error('Error getting template:', err);
      return { success: false, message: `Error getting template: ${err.message}` };
    }
  }

  /**
   * List all templates with optional filtering
   * 
   * @param type - Optional project type filter
   * @param language - Optional language filter
   * @returns ProjectOperationResult
   */
  async listTemplates(type?: ProjectType, language?: ProjectLanguage): Promise<ProjectOperationResult> {
    try {
      const allTemplates = await this.storage.findAllProjectTemplates();
      
      // Apply filters
      let filteredTemplates = allTemplates;
      
      if (type) {
        filteredTemplates = filteredTemplates.filter(t => t.type === type);
      }
      
      if (language) {
        filteredTemplates = filteredTemplates.filter(t => t.language === language);
      }
      
      return { success: true, templates: filteredTemplates };
    } catch (err) {
      console.error('Error listing templates:', err);
      return { success: false, message: `Error listing templates: ${err.message}` };
    }
  }

  /**
   * Create a new project version (commit)
   * 
   * @param projectId - Project ID
   * @param commitMessage - Commit message
   * @param userId - User ID
   * @returns ProjectOperationResult
   */
  async createProjectVersion(
    projectId: string,
    commitMessage: string,
    userId: number
  ): Promise<ProjectOperationResult> {
    try {
      // Get project
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }
      
      // Get all files
      const files = await this.storage.findProjectFilesByProjectId(projectId);
      
      // Get existing versions to determine next version number
      const versions = await this.storage.findProjectVersionsByProjectId(projectId);
      let versionNumber = '1.0.0';
      
      if (versions.length > 0) {
        // Parse latest version and increment patch number
        const latestVersion = versions.sort((a, b) => {
          // Sort by created date in descending order
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })[0];
        
        const parts = latestVersion.versionNumber.split('.');
        if (parts.length === 3) {
          const patch = parseInt(parts[2]) + 1;
          versionNumber = `${parts[0]}.${parts[1]}.${patch}`;
        }
      }
      
      // Create snapshot of all files
      const snapshot = {
        project: {
          name: project.name,
          description: project.description,
          type: project.type,
          language: project.language,
          framework: project.framework,
          config: project.config
        },
        files: files.map(file => ({
          path: file.path,
          name: file.name,
          content: file.content,
          isDirectory: file.isDirectory,
          type: file.type,
          metadata: file.metadata
        }))
      };
      
      // Create version record
      const newVersion: InsertProjectVersion = {
        versionId: uuidv4(),
        projectId,
        versionNumber,
        commitMessage,
        snapshot,
        createdBy: userId,
        isDeployed: false
      };
      
      const version = await this.storage.createProjectVersion(newVersion);
      
      return { success: true, version };
    } catch (err) {
      console.error('Error creating project version:', err);
      return { success: false, message: `Error creating project version: ${err.message}` };
    }
  }

  /**
   * List all versions of a project
   * 
   * @param projectId - Project ID
   * @returns ProjectOperationResult
   */
  async listProjectVersions(projectId: string): Promise<ProjectOperationResult> {
    try {
      // Check if project exists
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }
      
      // Get all versions
      const versions = await this.storage.findProjectVersionsByProjectId(projectId);
      
      // Sort by creation date (newest first)
      versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return { success: true, versions };
    } catch (err) {
      console.error('Error listing project versions:', err);
      return { success: false, message: `Error listing project versions: ${err.message}` };
    }
  }

  /**
   * Restore project to a specific version
   * 
   * @param projectId - Project ID
   * @param versionId - Version ID to restore
   * @param userId - User ID
   * @returns ProjectOperationResult
   */
  async restoreProjectVersion(
    projectId: string,
    versionId: string,
    userId: number
  ): Promise<ProjectOperationResult> {
    try {
      // Check if project exists
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }
      
      // Get version
      const version = await this.storage.findProjectVersionByVersionId(versionId);
      if (!version) {
        return { success: false, message: `Version with ID ${versionId} not found` };
      }
      
      if (version.projectId !== projectId) {
        return { success: false, message: `Version does not belong to project ${projectId}` };
      }
      
      // Get snapshot
      const snapshot = version.snapshot as any;
      if (!snapshot || !snapshot.files) {
        return { success: false, message: `Invalid snapshot in version ${versionId}` };
      }
      
      // Create backup of current state before restoration
      await this.createProjectVersion(
        projectId,
        `Automatic backup before restoring to version ${version.versionNumber}`,
        userId
      );
      
      // Delete all current files
      const currentFiles = await this.storage.findProjectFilesByProjectId(projectId);
      for (const file of currentFiles) {
        await this.storage.deleteProjectFile(file.id);
      }
      
      // Restore files from snapshot
      for (const fileData of snapshot.files) {
        if (fileData.isDirectory) {
          await this.fileManager.createDirectory(projectId, fileData.path, userId);
        } else {
          await this.fileManager.createFile(
            projectId,
            fileData.path,
            fileData.content,
            userId,
            fileData.type
          );
        }
      }
      
      // Update project metadata if needed
      if (snapshot.project) {
        await this.updateProject(projectId, {
          name: snapshot.project.name,
          description: snapshot.project.description,
          config: snapshot.project.config,
          framework: snapshot.project.framework
        });
      }
      
      return { success: true, message: `Project restored to version ${version.versionNumber}` };
    } catch (err) {
      console.error('Error restoring project version:', err);
      return { success: false, message: `Error restoring project version: ${err.message}` };
    }
  }
}
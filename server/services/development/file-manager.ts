/**
 * File Manager Service
 * 
 * Manages file operations for the TaxI_AI Development Platform
 * Handles file creation, reading, updating, deletion, and organization
 */

import { IStorage } from '../../storage';
import { 
  ProjectFile, 
  InsertProjectFile, 
  FileType,
  DevelopmentProject 
} from '../../../shared/schema';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface FileOperationResult {
  success: boolean;
  message?: string;
  file?: ProjectFile;
  files?: ProjectFile[];
}

export class FileManager {
  constructor(private storage: IStorage) {}

  /**
   * Create a new file in a project
   * 
   * @param projectId - Project ID
   * @param filePath - Path to file (relative to project root)
   * @param content - File content
   * @param userId - User ID creating the file
   * @param type - File type
   * @returns FileOperationResult
   */
  async createFile(
    projectId: string, 
    filePath: string, 
    content: string, 
    userId: number,
    type: FileType = FileType.CODE
  ): Promise<FileOperationResult> {
    try {
      // Check if project exists
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }

      // Check if file already exists at path
      const existingFile = await this.storage.findProjectFileByPath(projectId, filePath);
      if (existingFile) {
        return { success: false, message: `File already exists at path: ${filePath}` };
      }

      // Create parent directories if they don't exist
      const dirPath = path.dirname(filePath);
      if (dirPath !== '.' && dirPath !== '/') {
        await this.ensureDirectoryExists(projectId, dirPath, userId);
      }

      // Parse file information
      const fileName = path.basename(filePath);
      const parentPath = dirPath === '.' ? '' : dirPath;
      
      // Create file record
      const newFile: InsertProjectFile = {
        fileId: uuidv4(),
        projectId,
        path: filePath,
        name: fileName,
        content,
        type,
        size: Buffer.byteLength(content, 'utf8'),
        isDirectory: false,
        parentPath,
        createdBy: userId,
        metadata: {}
      };

      const file = await this.storage.createProjectFile(newFile);
      
      return { success: true, file };
    } catch (err) {
      console.error('Error creating file:', err);
      return { success: false, message: `Error creating file: ${err.message}` };
    }
  }

  /**
   * Create a directory in a project
   * 
   * @param projectId - Project ID
   * @param dirPath - Path to directory (relative to project root)
   * @param userId - User ID creating the directory
   * @returns FileOperationResult
   */
  async createDirectory(
    projectId: string,
    dirPath: string,
    userId: number
  ): Promise<FileOperationResult> {
    try {
      // Check if project exists
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }

      return this.ensureDirectoryExists(projectId, dirPath, userId);
    } catch (err) {
      console.error('Error creating directory:', err);
      return { success: false, message: `Error creating directory: ${err.message}` };
    }
  }

  /**
   * Ensure a directory exists in a project, creating any missing parent directories
   * 
   * @param projectId - Project ID
   * @param dirPath - Path to directory
   * @param userId - User ID creating the directory
   * @returns FileOperationResult
   */
  private async ensureDirectoryExists(
    projectId: string,
    dirPath: string,
    userId: number
  ): Promise<FileOperationResult> {
    // Check if directory already exists
    const existingDir = await this.storage.findProjectFileByPath(projectId, dirPath);
    if (existingDir) {
      if (!existingDir.isDirectory) {
        return { success: false, message: `Path exists but is not a directory: ${dirPath}` };
      }
      return { success: true, file: existingDir };
    }

    // Create parent directories recursively
    const parentPath = path.dirname(dirPath);
    if (parentPath !== '.' && parentPath !== '/' && parentPath !== dirPath) {
      await this.ensureDirectoryExists(projectId, parentPath, userId);
    }

    // Create the directory
    const dirName = path.basename(dirPath);
    const newDir: InsertProjectFile = {
      fileId: uuidv4(),
      projectId,
      path: dirPath,
      name: dirName,
      content: '',
      type: FileType.OTHER,
      size: 0,
      isDirectory: true,
      parentPath: parentPath === '.' ? '' : parentPath,
      createdBy: userId,
      metadata: {}
    };

    const dir = await this.storage.createProjectFile(newDir);
    return { success: true, file: dir };
  }

  /**
   * Read a file's content
   * 
   * @param projectId - Project ID
   * @param filePath - Path to file
   * @returns FileOperationResult
   */
  async readFile(projectId: string, filePath: string): Promise<FileOperationResult> {
    try {
      const file = await this.storage.findProjectFileByPath(projectId, filePath);
      if (!file) {
        return { success: false, message: `File not found at path: ${filePath}` };
      }

      if (file.isDirectory) {
        return { success: false, message: `Path is a directory, not a file: ${filePath}` };
      }

      return { success: true, file };
    } catch (err) {
      console.error('Error reading file:', err);
      return { success: false, message: `Error reading file: ${err.message}` };
    }
  }

  /**
   * Update a file's content
   * 
   * @param projectId - Project ID
   * @param filePath - Path to file
   * @param content - New file content
   * @returns FileOperationResult
   */
  async updateFile(projectId: string, filePath: string, content: string): Promise<FileOperationResult> {
    try {
      const file = await this.storage.findProjectFileByPath(projectId, filePath);
      if (!file) {
        return { success: false, message: `File not found at path: ${filePath}` };
      }

      if (file.isDirectory) {
        return { success: false, message: `Path is a directory, not a file: ${filePath}` };
      }

      const updatedFile = await this.storage.updateProjectFile(file.id, {
        content,
        size: Buffer.byteLength(content, 'utf8'),
        updatedAt: new Date()
      });

      return { success: true, file: updatedFile };
    } catch (err) {
      console.error('Error updating file:', err);
      return { success: false, message: `Error updating file: ${err.message}` };
    }
  }

  /**
   * Delete a file or directory
   * 
   * @param projectId - Project ID
   * @param filePath - Path to file or directory
   * @param recursive - Whether to recursively delete directories
   * @returns FileOperationResult
   */
  async deleteFile(projectId: string, filePath: string, recursive: boolean = false): Promise<FileOperationResult> {
    try {
      const file = await this.storage.findProjectFileByPath(projectId, filePath);
      if (!file) {
        return { success: false, message: `File not found at path: ${filePath}` };
      }

      if (file.isDirectory) {
        // Get all files in the directory
        const children = await this.storage.findProjectFilesByParentPath(projectId, filePath);
        
        if (children.length > 0 && !recursive) {
          return { success: false, message: `Directory is not empty. Use recursive=true to delete.` };
        }

        // Recursively delete all children
        if (recursive) {
          for (const child of children) {
            if (child.isDirectory) {
              await this.deleteFile(projectId, child.path, true);
            } else {
              await this.storage.deleteProjectFile(child.id);
            }
          }
        }
      }

      await this.storage.deleteProjectFile(file.id);
      return { success: true };
    } catch (err) {
      console.error('Error deleting file:', err);
      return { success: false, message: `Error deleting file: ${err.message}` };
    }
  }

  /**
   * Rename a file or directory
   * 
   * @param projectId - Project ID
   * @param oldPath - Current path
   * @param newPath - New path
   * @returns FileOperationResult
   */
  async renameFile(projectId: string, oldPath: string, newPath: string): Promise<FileOperationResult> {
    try {
      const file = await this.storage.findProjectFileByPath(projectId, oldPath);
      if (!file) {
        return { success: false, message: `File not found at path: ${oldPath}` };
      }

      // Check if destination already exists
      const existingDestination = await this.storage.findProjectFileByPath(projectId, newPath);
      if (existingDestination) {
        return { success: false, message: `Destination path already exists: ${newPath}` };
      }

      // Create parent directories if needed
      const newDirPath = path.dirname(newPath);
      if (newDirPath !== '.' && newDirPath !== '/') {
        await this.ensureDirectoryExists(projectId, newDirPath, file.createdBy);
      }

      const updatedFile = await this.storage.updateProjectFile(file.id, {
        path: newPath,
        name: path.basename(newPath),
        parentPath: newDirPath === '.' ? '' : newDirPath,
        updatedAt: new Date()
      });

      // If it's a directory, we need to update all children paths
      if (file.isDirectory) {
        const children = await this.storage.findProjectFilesByPathPrefix(projectId, oldPath + '/');
        for (const child of children) {
          const childNewPath = child.path.replace(oldPath, newPath);
          const childNewParentPath = child.parentPath.replace(oldPath, newPath);
          
          await this.storage.updateProjectFile(child.id, {
            path: childNewPath,
            parentPath: childNewParentPath,
            updatedAt: new Date()
          });
        }
      }

      return { success: true, file: updatedFile };
    } catch (err) {
      console.error('Error renaming file:', err);
      return { success: false, message: `Error renaming file: ${err.message}` };
    }
  }

  /**
   * List files in a directory
   * 
   * @param projectId - Project ID
   * @param dirPath - Directory path (empty for root)
   * @returns FileOperationResult
   */
  async listFiles(projectId: string, dirPath: string = ''): Promise<FileOperationResult> {
    try {
      let files: ProjectFile[];

      if (dirPath === '' || dirPath === '.' || dirPath === '/') {
        // List files in root directory (with no parent path)
        files = await this.storage.findProjectFilesByParentPath(projectId, '');
      } else {
        // Check if directory exists
        const dir = await this.storage.findProjectFileByPath(projectId, dirPath);
        if (!dir) {
          return { success: false, message: `Directory not found: ${dirPath}` };
        }
        if (!dir.isDirectory) {
          return { success: false, message: `Path is not a directory: ${dirPath}` };
        }

        // List files in the directory
        files = await this.storage.findProjectFilesByParentPath(projectId, dirPath);
      }

      return { success: true, files };
    } catch (err) {
      console.error('Error listing files:', err);
      return { success: false, message: `Error listing files: ${err.message}` };
    }
  }

  /**
   * Get a file tree for the entire project
   * 
   * @param projectId - Project ID
   * @returns FileOperationResult with file tree structure
   */
  async getFileTree(projectId: string): Promise<FileOperationResult> {
    try {
      // Get all files in the project
      const allFiles = await this.storage.findProjectFilesByProjectId(projectId);
      
      // Organize into tree structure
      const fileTree = this.buildFileTree(allFiles);
      
      return { success: true, files: fileTree };
    } catch (err) {
      console.error('Error getting file tree:', err);
      return { success: false, message: `Error getting file tree: ${err.message}` };
    }
  }

  /**
   * Build a file tree from a flat list of files
   * 
   * @param files - List of all files
   * @returns Array of root-level files and directories with nested children
   */
  private buildFileTree(files: ProjectFile[]): ProjectFile[] {
    const tree: ProjectFile[] = [];
    const map: Record<string, ProjectFile & { children?: ProjectFile[] }> = {};

    // First, add all files to the map
    for (const file of files) {
      map[file.path] = { ...file, children: file.isDirectory ? [] : undefined };
    }

    // Then build the tree structure
    for (const file of files) {
      if (!file.parentPath) {
        // Root-level files
        tree.push(map[file.path]);
      } else {
        // Add to parent directory's children
        const parent = map[file.parentPath];
        if (parent && parent.children) {
          parent.children.push(map[file.path]);
        }
      }
    }

    return tree;
  }

  /**
   * Search for files in a project
   * 
   * @param projectId - Project ID
   * @param query - Search query
   * @param fileType - Optional file type filter
   * @returns FileOperationResult
   */
  async searchFiles(
    projectId: string, 
    query: string, 
    fileType?: FileType
  ): Promise<FileOperationResult> {
    try {
      // Get all files in the project
      let files = await this.storage.findProjectFilesByProjectId(projectId);
      
      // Filter by file type if provided
      if (fileType) {
        files = files.filter(file => file.type === fileType);
      }
      
      // Search by name or content
      const matchingFiles = files.filter(file => 
        file.name.toLowerCase().includes(query.toLowerCase()) || 
        (!file.isDirectory && file.content.toLowerCase().includes(query.toLowerCase()))
      );
      
      return { success: true, files: matchingFiles };
    } catch (err) {
      console.error('Error searching files:', err);
      return { success: false, message: `Error searching files: ${err.message}` };
    }
  }
}
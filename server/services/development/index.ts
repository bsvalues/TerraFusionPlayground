/**
 * TaxI_AI Development Platform Services
 * 
 * This file exports all the development platform services needed for
 * creating, managing, and previewing assessment agency applications.
 */

import { FileManager } from './file-manager';
import { ProjectManager } from './project-manager';
import { PreviewEngine } from './preview-engine';
import { AICodeAssistant } from './ai-code-assistant';

export {
  FileManager,
  ProjectManager,
  PreviewEngine,
  AICodeAssistant
};

// Export service types
export type { 
  FileOperationResult 
} from './file-manager';

export type { 
  ProjectOperationResult 
} from './project-manager';

export type { 
  PreviewOperationResult 
} from './preview-engine';

export type { 
  CodeGenerationResult,
  CodeCompletionResult,
  CodeDocumentationResult
} from './ai-code-assistant';
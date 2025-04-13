/**
 * Extension Interface
 * 
 * This file defines the interface that all extensions must implement to be
 * compatible with the SpatialEst platform extension system.
 */

import { IStorage } from '../storage';

/**
 * Permission type for extensions
 */
export type ExtensionPermission = 
  | 'read:properties' 
  | 'write:properties'
  | 'read:land-records'
  | 'write:land-records'
  | 'read:improvements'
  | 'write:improvements'
  | 'read:fields'
  | 'write:fields'
  | 'read:appeals'
  | 'write:appeals'
  | 'read:mcp-tools'
  | 'execute:mcp-tools'
  | 'use:ai-services'
  | 'use:file-system'
  | 'use:ftp'
  | 'use:gis';

/**
 * Extension metadata
 */
export interface ExtensionMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  authorUrl?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  icon?: string;
  category: 'data-import' | 'data-export' | 'visualization' | 'analysis' | 'workflow' | 'integration' | 'other';
  requiredPermissions: ExtensionPermission[];
  settings?: ExtensionSetting[];
}

/**
 * Extension setting definition
 */
export interface ExtensionSetting {
  id: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  default?: any;
  options?: { label: string; value: any }[];
}

/**
 * Extension activation context
 */
export interface ExtensionContext {
  storage: IStorage;
  settings: Record<string, any>;
  logger: {
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
    debug(message: string, data?: any): void;
  };
  registerCommand(command: string, callback: (...args: any[]) => any): void;
  registerWebviewPanel(id: string, title: string, content: string): void;
  registerMenuItem(item: ExtensionMenuItem): void;
}

/**
 * Extension menu item
 */
export interface ExtensionMenuItem {
  id: string;
  label: string;
  parent?: string;
  position?: number;
  icon?: string;
  command?: string;
  commandArgs?: any[];
}

/**
 * Extension interface
 */
export interface IExtension {
  /**
   * Extension metadata
   */
  metadata: ExtensionMetadata;
  
  /**
   * Called when the extension is activated
   * @param context Extension context
   */
  activate(context: ExtensionContext): Promise<void>;
  
  /**
   * Called when the extension is deactivated
   */
  deactivate(): Promise<void>;
}
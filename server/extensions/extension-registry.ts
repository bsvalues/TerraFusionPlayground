/**
 * Extension Registry
 * 
 * This service manages the lifecycle of extensions, including:
 * - Loading extensions from disk or code
 * - Activating and deactivating extensions
 * - Managing extension settings
 * - Handling extension permissions
 * - Providing an API for extension interoperability
 */

import { IStorage } from '../storage';
import { 
  IExtension, 
  ExtensionMetadata, 
  ExtensionContext, 
  ExtensionMenuItem 
} from './extension-interface';

// Define types for command registry
type CommandCallback = (...args: any[]) => any;
interface CommandRegistration {
  extension: string;
  callback: CommandCallback;
}

// Define types for webview panel registry
interface WebviewPanel {
  id: string;
  title: string;
  content: string;
  extension: string;
}

// Define types for menu item registry
interface MenuItemRegistration extends ExtensionMenuItem {
  extension: string;
}

/**
 * Extension Registry Service
 */
export class ExtensionRegistry {
  private extensions: Map<string, IExtension> = new Map();
  private activeExtensions: Set<string> = new Set();
  private extensionSettings: Map<string, Record<string, any>> = new Map();
  
  // Extension capability registries
  private commands: Map<string, CommandRegistration> = new Map();
  private webviewPanels: Map<string, WebviewPanel> = new Map();
  private menuItems: MenuItemRegistration[] = [];

  constructor(private storage: IStorage) {}

  /**
   * Register an extension with the registry
   */
  public registerExtension(extension: IExtension): void {
    if (this.extensions.has(extension.metadata.id)) {
      throw new Error(`Extension with ID '${extension.metadata.id}' is already registered`);
    }
    
    this.extensions.set(extension.metadata.id, extension);
    this.extensionSettings.set(extension.metadata.id, this.getDefaultSettings(extension.metadata));
    
    console.log(`Registered extension: ${extension.metadata.name} (${extension.metadata.id})`);
  }

  /**
   * Get an extension by ID
   */
  public getExtension(id: string): IExtension | undefined {
    return this.extensions.get(id);
  }

  /**
   * Get all registered extensions
   */
  public getAllExtensions(): Map<string, IExtension> {
    return this.extensions;
  }

  /**
   * Check if an extension is active
   */
  public isExtensionActive(id: string): boolean {
    return this.activeExtensions.has(id);
  }

  /**
   * Activate an extension
   */
  public async activateExtension(id: string): Promise<boolean> {
    if (this.activeExtensions.has(id)) {
      return true; // Already active
    }
    
    const extension = this.extensions.get(id);
    if (!extension) {
      throw new Error(`Extension with ID '${id}' not found`);
    }
    
    try {
      console.log(`Activating extension: ${extension.metadata.name} (${id})`);
      
      // Create extension context
      const context: ExtensionContext = {
        storage: this.storage,
        settings: this.extensionSettings.get(id) || {},
        logger: {
          info: (message, data) => console.log(`[${extension.metadata.name}] INFO: ${message}`, data || ''),
          warn: (message, data) => console.warn(`[${extension.metadata.name}] WARN: ${message}`, data || ''),
          error: (message, data) => console.error(`[${extension.metadata.name}] ERROR: ${message}`, data || ''),
          debug: (message, data) => console.debug(`[${extension.metadata.name}] DEBUG: ${message}`, data || ''),
        },
        registerCommand: (command, callback) => this.registerCommand(id, command, callback),
        registerWebviewPanel: (panelId, title, content) => this.registerWebviewPanel(id, panelId, title, content),
        registerMenuItem: (item) => this.registerMenuItem(id, item),
      };
      
      // Activate the extension
      await extension.activate(context);
      
      // Mark as active
      this.activeExtensions.add(id);
      
      console.log(`Extension activated: ${extension.metadata.name} (${id})`);
      return true;
    } catch (error) {
      console.error(`Failed to activate extension ${id}:`, error);
      return false;
    }
  }

  /**
   * Deactivate an extension
   */
  public async deactivateExtension(id: string): Promise<boolean> {
    if (!this.activeExtensions.has(id)) {
      return true; // Already inactive
    }
    
    const extension = this.extensions.get(id);
    if (!extension) {
      throw new Error(`Extension with ID '${id}' not found`);
    }
    
    try {
      console.log(`Deactivating extension: ${extension.metadata.name} (${id})`);
      
      // Deactivate the extension
      await extension.deactivate();
      
      // Clean up registered commands, webviews, and menu items
      this.cleanupExtensionRegistrations(id);
      
      // Mark as inactive
      this.activeExtensions.delete(id);
      
      console.log(`Extension deactivated: ${extension.metadata.name} (${id})`);
      return true;
    } catch (error) {
      console.error(`Failed to deactivate extension ${id}:`, error);
      return false;
    }
  }

  /**
   * Clean up registrations for a deactivated extension
   */
  private cleanupExtensionRegistrations(extensionId: string): void {
    // Clean up commands
    for (const [commandId, registration] of this.commands.entries()) {
      if (registration.extension === extensionId) {
        this.commands.delete(commandId);
      }
    }
    
    // Clean up webview panels
    for (const [panelId, panel] of this.webviewPanels.entries()) {
      if (panel.extension === extensionId) {
        this.webviewPanels.delete(panelId);
      }
    }
    
    // Clean up menu items
    this.menuItems = this.menuItems.filter(item => item.extension !== extensionId);
  }

  /**
   * Update extension settings
   */
  public updateExtensionSettings(id: string, settings: Record<string, any>): void {
    if (!this.extensions.has(id)) {
      throw new Error(`Extension with ID '${id}' not found`);
    }
    
    const currentSettings = this.extensionSettings.get(id) || {};
    this.extensionSettings.set(id, { ...currentSettings, ...settings });
  }

  /**
   * Get extension settings
   */
  public getExtensionSettings(id: string): Record<string, any> {
    return this.extensionSettings.get(id) || {};
  }

  /**
   * Get default settings for an extension
   */
  private getDefaultSettings(metadata: ExtensionMetadata): Record<string, any> {
    const defaults: Record<string, any> = {};
    
    if (metadata.settings) {
      for (const setting of metadata.settings) {
        if (setting.default !== undefined) {
          defaults[setting.id] = setting.default;
        }
      }
    }
    
    return defaults;
  }

  /**
   * Register a command for an extension
   */
  private registerCommand(extension: string, command: string, callback: CommandCallback): void {
    const commandId = `${extension}.${command}`;
    
    if (this.commands.has(commandId)) {
      throw new Error(`Command '${commandId}' is already registered`);
    }
    
    this.commands.set(commandId, { extension, callback });
  }

  /**
   * Execute a command
   */
  public executeCommand(command: string, ...args: any[]): any {
    const registration = this.commands.get(command);
    
    if (!registration) {
      throw new Error(`Command '${command}' not found`);
    }
    
    if (!this.isExtensionActive(registration.extension)) {
      throw new Error(`Extension '${registration.extension}' is not active`);
    }
    
    return registration.callback(...args);
  }

  /**
   * Register a webview panel for an extension
   */
  private registerWebviewPanel(extension: string, id: string, title: string, content: string): void {
    const panelId = `${extension}.${id}`;
    
    if (this.webviewPanels.has(panelId)) {
      throw new Error(`Webview panel '${panelId}' is already registered`);
    }
    
    this.webviewPanels.set(panelId, { id, title, content, extension });
  }

  /**
   * Get a webview panel
   */
  public getWebviewPanel(id: string): WebviewPanel | undefined {
    return this.webviewPanels.get(id);
  }

  /**
   * Get all webview panels
   */
  public getAllWebviewPanels(): WebviewPanel[] {
    return Array.from(this.webviewPanels.values());
  }

  /**
   * Register a menu item for an extension
   */
  private registerMenuItem(extension: string, item: ExtensionMenuItem): void {
    const menuItem: MenuItemRegistration = {
      ...item,
      extension
    };
    
    this.menuItems.push(menuItem);
  }

  /**
   * Get all menu items
   */
  public getAllMenuItems(): MenuItemRegistration[] {
    return this.menuItems;
  }
}
/**
 * Extension Registry
 * 
 * The extension registry manages all extensions in the system, including
 * registration, activation, and deactivation. It also provides a central
 * point for command execution and webview management.
 */

import { IStorage } from '../storage';
import { 
  IExtension, 
  ExtensionMetadata,
  ExtensionContext,
  ExtensionLogger,
  CommandRegistration,
  WebviewPanel,
  ExtensionMenuItem
} from './extension-interface';

/**
 * Extension Registry Class
 * 
 * Manages all extensions in the system
 */
export class ExtensionRegistry {
  private extensions: Map<string, IExtension> = new Map();
  private activeExtensions: Map<string, ExtensionContext> = new Map();
  private commands: Map<string, CommandRegistration> = new Map();
  private webviews: Map<string, WebviewPanel> = new Map();
  private menuItems: ExtensionMenuItem[] = [];
  private extensionSettings: Map<string, Record<string, any>> = new Map();
  
  /**
   * Constructor
   */
  constructor(private storage: IStorage) {}
  
  /**
   * Register an extension
   * @param extension Extension to register
   */
  public registerExtension(extension: IExtension): void {
    if (this.extensions.has(extension.metadata.id)) {
      throw new Error(`Extension with ID ${extension.metadata.id} is already registered`);
    }
    
    this.extensions.set(extension.metadata.id, extension);
    
    // Initialize default settings
    const defaultSettings: Record<string, any> = {};
    extension.metadata.settings?.forEach(setting => {
      defaultSettings[setting.id] = setting.default;
    });
    this.extensionSettings.set(extension.metadata.id, defaultSettings);
    
    console.log(`Extension ${extension.metadata.name} (${extension.metadata.id}) registered`);
  }
  
  /**
   * Activate an extension
   * @param extensionId ID of the extension to activate
   */
  public async activateExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    
    if (!extension) {
      throw new Error(`Extension with ID ${extensionId} is not registered`);
    }
    
    if (this.activeExtensions.has(extensionId)) {
      console.log(`Extension ${extensionId} is already active`);
      return;
    }
    
    // Create extension context
    const context: ExtensionContext = {
      extensionId,
      storage: this.storage,
      logger: this.createLogger(extensionId),
      settings: this.extensionSettings.get(extensionId) || {},
      
      registerCommand: (command: string, callback: (...args: any[]) => any) => {
        this.registerCommand(extensionId, command, callback);
      },
      
      registerWebviewPanel: (id: string, title: string, content: string) => {
        this.registerWebviewPanel(extensionId, id, title, content);
      },
      
      registerMenuItem: (item: ExtensionMenuItem) => {
        this.registerMenuItem(extensionId, item);
      }
    };
    
    // Activate the extension
    await extension.activate(context);
    
    // Store the context
    this.activeExtensions.set(extensionId, context);
    
    console.log(`Extension ${extension.metadata.name} (${extensionId}) activated`);
  }
  
  /**
   * Deactivate an extension
   * @param extensionId ID of the extension to deactivate
   */
  public async deactivateExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    
    if (!extension) {
      throw new Error(`Extension with ID ${extensionId} is not registered`);
    }
    
    if (!this.activeExtensions.has(extensionId)) {
      console.log(`Extension ${extensionId} is not active`);
      return;
    }
    
    // Deactivate the extension
    await extension.deactivate();
    
    // Remove all commands registered by this extension
    this.commands = new Map(
      [...this.commands.entries()].filter(([_, cmd]) => cmd.extensionId !== extensionId)
    );
    
    // Remove all webviews registered by this extension
    for (const [id, panel] of this.webviews.entries()) {
      if (id.startsWith(`${extensionId}.`)) {
        this.webviews.delete(id);
      }
    }
    
    // Remove all menu items registered by this extension
    this.menuItems = this.menuItems.filter(item => !item.id.startsWith(`${extensionId}.`));
    
    // Remove the context
    this.activeExtensions.delete(extensionId);
    
    console.log(`Extension ${extension.metadata.name} (${extensionId}) deactivated`);
  }
  
  /**
   * Register a command for an extension
   * @param extensionId ID of the extension registering the command
   * @param command Command name
   * @param callback Command callback
   */
  private registerCommand(extensionId: string, command: string, callback: (...args: any[]) => any): void {
    const fullCommandName = `${extensionId}.${command}`;
    
    if (this.commands.has(fullCommandName)) {
      throw new Error(`Command ${fullCommandName} is already registered`);
    }
    
    this.commands.set(fullCommandName, {
      extensionId,
      callback
    });
    
    console.log(`Command ${fullCommandName} registered`);
  }
  
  /**
   * Execute a command
   * @param command Command name
   * @param args Command arguments
   * @returns Command result
   */
  public async executeCommand(command: string, ...args: any[]): Promise<any> {
    if (!this.commands.has(command)) {
      throw new Error(`Command ${command} is not registered`);
    }
    
    const registration = this.commands.get(command)!;
    
    return registration.callback(...args);
  }
  
  /**
   * Register a webview panel for an extension
   * @param extensionId ID of the extension registering the webview
   * @param id Panel ID
   * @param title Panel title
   * @param content Panel content
   */
  private registerWebviewPanel(extensionId: string, id: string, title: string, content: string): void {
    const fullPanelId = `${extensionId}.${id}`;
    
    if (this.webviews.has(fullPanelId)) {
      throw new Error(`Webview panel ${fullPanelId} is already registered`);
    }
    
    this.webviews.set(fullPanelId, {
      id: fullPanelId,
      title,
      content
    });
    
    console.log(`Webview panel ${fullPanelId} registered`);
  }
  
  /**
   * Register a menu item for an extension
   * @param extensionId ID of the extension registering the menu item
   * @param item Menu item
   */
  private registerMenuItem(extensionId: string, item: ExtensionMenuItem): void {
    const fullItemId = `${extensionId}.${item.id}`;
    
    // Check if the item already exists
    if (this.menuItems.some(menuItem => menuItem.id === fullItemId)) {
      throw new Error(`Menu item ${fullItemId} is already registered`);
    }
    
    // If there's a parent, make sure it's fully qualified
    const parent = item.parent 
      ? item.parent.includes('.')
        ? item.parent
        : `${extensionId}.${item.parent}`
      : undefined;
    
    // If there's a command, make sure it's fully qualified
    const command = item.command
      ? item.command.includes('.')
        ? item.command
        : `${extensionId}.${item.command}`
      : undefined;
    
    // Add the menu item
    this.menuItems.push({
      ...item,
      id: fullItemId,
      parent,
      command
    });
    
    // Sort menu items by position
    this.menuItems.sort((a, b) => {
      const posA = a.position ?? Number.MAX_SAFE_INTEGER;
      const posB = b.position ?? Number.MAX_SAFE_INTEGER;
      return posA - posB;
    });
    
    console.log(`Menu item ${fullItemId} registered`);
  }
  
  /**
   * Update extension settings
   * @param extensionId ID of the extension
   * @param settings New settings
   */
  public updateExtensionSettings(extensionId: string, settings: Record<string, any>): void {
    if (!this.extensions.has(extensionId)) {
      throw new Error(`Extension with ID ${extensionId} is not registered`);
    }
    
    // Get the current settings
    const currentSettings = this.extensionSettings.get(extensionId) || {};
    
    // Update the settings
    this.extensionSettings.set(extensionId, {
      ...currentSettings,
      ...settings
    });
    
    console.log(`Extension ${extensionId} settings updated`);
  }
  
  /**
   * Get all registered extensions
   */
  public getAllExtensions(): { id: string; metadata: ExtensionMetadata; active: boolean }[] {
    return Array.from(this.extensions.entries()).map(([id, extension]) => ({
      id,
      metadata: extension.metadata,
      active: this.activeExtensions.has(id)
    }));
  }
  
  /**
   * Get extension metadata
   * @param extensionId Extension ID
   */
  public getExtensionMetadata(extensionId: string): ExtensionMetadata | undefined {
    const extension = this.extensions.get(extensionId);
    return extension?.metadata;
  }
  
  /**
   * Get extension settings
   * @param extensionId Extension ID
   */
  public getExtensionSettings(extensionId: string): Record<string, any> | undefined {
    return this.extensionSettings.get(extensionId);
  }
  
  /**
   * Get all registered commands
   */
  public getAllCommands(): string[] {
    return Array.from(this.commands.keys());
  }
  
  /**
   * Get all registered webview panels
   */
  public getAllWebviewPanels(): WebviewPanel[] {
    return Array.from(this.webviews.values());
  }
  
  /**
   * Get a specific webview panel
   * @param id Panel ID
   */
  public getWebviewPanel(id: string): WebviewPanel | undefined {
    return this.webviews.get(id);
  }
  
  /**
   * Get all registered menu items
   */
  public getAllMenuItems(): ExtensionMenuItem[] {
    return this.menuItems;
  }
  
  /**
   * Create a logger for an extension
   * @param extensionId Extension ID
   * @returns Extension logger
   */
  private createLogger(extensionId: string): ExtensionLogger {
    return {
      info: (message: string, data?: any) => {
        console.log(`[${extensionId}] INFO: ${message}`, data || '');
      },
      
      warn: (message: string, data?: any) => {
        console.warn(`[${extensionId}] WARN: ${message}`, data || '');
      },
      
      error: (message: string, data?: any) => {
        console.error(`[${extensionId}] ERROR: ${message}`, data || '');
      },
      
      debug: (message: string, data?: any) => {
        console.debug(`[${extensionId}] DEBUG: ${message}`, data || '');
      }
    };
  }
}
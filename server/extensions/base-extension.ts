/**
 * Base Extension
 * 
 * A base class for extensions that provides common functionality and
 * simplifies extension development by handling some boilerplate.
 */

import { 
  IExtension, 
  ExtensionMetadata, 
  ExtensionContext,
  ExtensionMenuItem
} from './extension-interface';

/**
 * Base Extension class
 */
export abstract class BaseExtension implements IExtension {
  protected context: ExtensionContext | null = null;
  protected activated: boolean = false;
  
  /**
   * Constructor
   * @param metadata Extension metadata
   */
  constructor(public readonly metadata: ExtensionMetadata) {}
  
  /**
   * Called when the extension is activated
   * @param context Extension context
   */
  public async activate(context: ExtensionContext): Promise<void> {
    if (this.activated) {
      return;
    }
    
    this.context = context;
    try {
      // Register core extension commands
      this.registerCoreCommands();
      
      // Call the extension's onActivate hook
      await this.onActivate();
      
      this.activated = true;
      this.log(`Extension activated`);
    } catch (error) {
      this.error(`Failed to activate extension: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Called when the extension is deactivated
   */
  public async deactivate(): Promise<void> {
    if (!this.activated) {
      return;
    }
    
    try {
      // Call the extension's onDeactivate hook
      await this.onDeactivate();
      
      this.activated = false;
      this.log(`Extension deactivated`);
    } catch (error) {
      this.error(`Failed to deactivate extension: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      this.context = null;
    }
  }
  
  /**
   * Register core extension commands
   */
  private registerCoreCommands(): void {
    if (!this.context) {
      return;
    }
    
    // Register core commands for all extensions
    this.context.registerCommand('getMetadata', () => this.metadata);
    this.context.registerCommand('getSettings', () => this.context?.settings || {});
  }
  
  /**
   * Extension activation hook
   * Override this method to implement your extension's activation logic
   */
  protected abstract onActivate(): Promise<void>;
  
  /**
   * Extension deactivation hook
   * Override this method to implement your extension's deactivation logic
   */
  protected abstract onDeactivate(): Promise<void>;
  
  /**
   * Register a command
   */
  protected registerCommand(command: string, callback: (...args: any[]) => any): void {
    if (!this.context) {
      throw new Error('Extension context is not available');
    }
    
    this.context.registerCommand(command, callback);
  }
  
  /**
   * Register a webview panel
   */
  protected registerWebviewPanel(id: string, title: string, content: string): void {
    if (!this.context) {
      throw new Error('Extension context is not available');
    }
    
    this.context.registerWebviewPanel(id, title, content);
  }
  
  /**
   * Register a menu item
   */
  protected registerMenuItem(item: ExtensionMenuItem): void {
    if (!this.context) {
      throw new Error('Extension context is not available');
    }
    
    this.context.registerMenuItem(item);
  }
  
  /**
   * Log an info message
   */
  protected log(message: string, data?: any): void {
    this.context?.logger.info(message, data);
  }
  
  /**
   * Log a warning message
   */
  protected warn(message: string, data?: any): void {
    this.context?.logger.warn(message, data);
  }
  
  /**
   * Log an error message
   */
  protected error(message: string, data?: any): void {
    this.context?.logger.error(message, data);
  }
  
  /**
   * Log a debug message
   */
  protected debug(message: string, data?: any): void {
    this.context?.logger.debug(message, data);
  }
}
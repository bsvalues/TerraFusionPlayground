import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Type definitions
export type ExtensionCommandParams = Record<string, any>;

/**
 * Service for handling extension-related operations on the client
 */
export class ExtensionService {
  private static instance: ExtensionService;
  private activeWebviews: Map<string, { id: string, title: string }> = new Map();
  private webviewChangeListeners: Set<(webviews: { id: string, title: string }[]) => void> = new Set();
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  public static getInstance(): ExtensionService {
    if (!ExtensionService.instance) {
      ExtensionService.instance = new ExtensionService();
    }
    return ExtensionService.instance;
  }
  
  /**
   * Execute an extension command
   */
  public async executeCommand(command: string, params: ExtensionCommandParams = {}): Promise<any> {
    try {
      // Extract extension ID and command name
      const [extensionPrefix, extensionId, commandName] = command.split('.');
      
      if (!extensionPrefix || !extensionId || !commandName || extensionPrefix !== 'extension') {
        throw new Error(`Invalid command format: ${command}`);
      }
      
      // Make API call to execute the command
      const response = await apiRequest(`/api/extensions/${extensionId}/command/${commandName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ params }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to execute command: ${command}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error executing extension command:', error);
      throw error;
    }
  }
  
  /**
   * Open a webview
   */
  public openWebview(id: string, title: string): void {
    this.activeWebviews.set(id, { id, title });
    this.notifyWebviewsChanged();
  }
  
  /**
   * Close a webview
   */
  public closeWebview(id: string): void {
    this.activeWebviews.delete(id);
    this.notifyWebviewsChanged();
  }
  
  /**
   * Get all active webviews
   */
  public getActiveWebviews(): { id: string, title: string }[] {
    return Array.from(this.activeWebviews.values());
  }
  
  /**
   * Subscribe to webview changes
   */
  public subscribeToWebviewChanges(listener: (webviews: { id: string, title: string }[]) => void): () => void {
    this.webviewChangeListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.webviewChangeListeners.delete(listener);
    };
  }
  
  /**
   * Notify all listeners of webview changes
   */
  private notifyWebviewsChanged(): void {
    const webviews = this.getActiveWebviews();
    this.webviewChangeListeners.forEach(listener => listener(webviews));
  }
}
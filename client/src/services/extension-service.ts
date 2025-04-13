import { apiRequest } from '@/lib/queryClient';

export interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  commands?: {
    id: string;
    title: string;
    hidden?: boolean;
  }[];
  settings?: {
    id: string;
    label: string;
    type: string;
    default: any;
    value?: any;
  }[];
}

export interface WebviewInfo {
  id: string;
  title: string;
  extensionId: string;
}

export class ExtensionService {
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * Get all registered extensions
   */
  async getExtensions(): Promise<Extension[]> {
    try {
      const response = await apiRequest('/api/extensions');
      if (!response.ok) {
        throw new Error(`Failed to get extensions: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting extensions:', error);
      throw error;
    }
  }

  /**
   * Get details for a specific extension
   */
  async getExtension(extensionId: string): Promise<Extension> {
    try {
      const response = await apiRequest(`/api/extensions/${extensionId}`);
      if (!response.ok) {
        throw new Error(`Failed to get extension ${extensionId}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error getting extension ${extensionId}:`, error);
      throw error;
    }
  }

  /**
   * Get all available webviews
   */
  async getWebviews(): Promise<WebviewInfo[]> {
    try {
      const response = await apiRequest('/api/extensions/webviews');
      if (!response.ok) {
        throw new Error(`Failed to get webviews: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting webviews:', error);
      throw error;
    }
  }

  /**
   * Get webview content for a specific extension's webview
   */
  async getWebviewContent(extensionId: string, webviewId: string): Promise<string> {
    try {
      const response = await apiRequest(`/api/extensions/${extensionId}/webviews/${webviewId}`);
      if (!response.ok) {
        throw new Error(`Failed to get webview content: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Error getting webview content:', error);
      throw error;
    }
  }

  /**
   * Activate an extension
   */
  async activateExtension(extensionId: string): Promise<void> {
    try {
      const response = await apiRequest(`/api/extensions/${extensionId}/activate`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to activate extension ${extensionId}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error activating extension ${extensionId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate an extension
   */
  async deactivateExtension(extensionId: string): Promise<void> {
    try {
      const response = await apiRequest(`/api/extensions/${extensionId}/deactivate`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to deactivate extension ${extensionId}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deactivating extension ${extensionId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a command
   */
  async executeCommand(commandId: string, args?: any[]): Promise<any> {
    try {
      const response = await apiRequest('/api/extensions/commands/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          commandId,
          args: args || []
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to execute command ${commandId}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error executing command ${commandId}:`, error);
      throw error;
    }
  }

  /**
   * Update extension settings
   */
  async updateExtensionSettings(extensionId: string, settings: Record<string, any>): Promise<void> {
    try {
      const response = await apiRequest(`/api/extensions/${extensionId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update extension settings: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating extension settings:', error);
      throw error;
    }
  }

  /**
   * Subscribe to extension events
   */
  addEventListener(event: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)?.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit an extension event
   * @private - This is for internal use only
   */
  private emit(event: string, data: any): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}
import { EventEmitter } from 'events';
import { verifyPlugin, VerificationResult } from './verification';
import { PluginManifest } from './plugin-manifest';
import { PluginPaymentManager } from './plugin-payment';

/**
 * Event types emitted by the plugin loader
 */
export enum PluginLoaderEvent {
  PLUGIN_LOADED = 'plugin:loaded',
  PLUGIN_UNLOADED = 'plugin:unloaded',
  PLUGIN_ERROR = 'plugin:error',
  PLUGIN_VERIFIED = 'plugin:verified',
}

/**
 * Plugin loader options
 */
export interface PluginLoaderOptions {
  apiVersion: string;
  pluginsDir: string;
  verificationPublicKey?: string;
  strictMode?: boolean;
  paymentOptions?: {
    apiKey?: string;
    webhookSecret?: string;
  };
}

/**
 * Main plugin loader class that manages loading, verifying, and unloading plugins
 */
export class PluginLoader extends EventEmitter {
  private apiVersion: string;
  private pluginDirectory: string;
  private strictMode: boolean;
  private verificationPublicKey?: string;
  
  private loadedPlugins: Map<string, {
    manifest: PluginManifest;
    exports: any;
    instance: any;
  }> = new Map();
  
  private pendingPlugins: Set<string> = new Set();
  private paymentManager: PluginPaymentManager;
  
  /**
   * Create a new plugin loader
   * 
   * @param options Plugin loader options
   */
  constructor(options: PluginLoaderOptions) {
    super();
    
    this.apiVersion = options.apiVersion;
    this.pluginDirectory = options.pluginsDir;
    this.strictMode = options.strictMode ?? true;
    this.verificationPublicKey = options.verificationPublicKey;
    
    this.paymentManager = new PluginPaymentManager(options.paymentOptions || {});
  }
  
  /**
   * Load a plugin from its manifest
   * 
   * @param manifest Plugin manifest
   * @param userId Optional user ID for payment verification
   * @returns Promise resolving to the loaded plugin
   */
  async loadPlugin(manifest: PluginManifest, userId?: string): Promise<any> {
    if (this.loadedPlugins.has(manifest.id)) {
      return this.loadedPlugins.get(manifest.id)!.exports;
    }
    
    if (this.pendingPlugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already being loaded`);
    }
    
    this.pendingPlugins.add(manifest.id);
    
    try {
      // Verify plugin compatibility and integrity
      const verificationResult = this.verifyPlugin(manifest);
      
      // In strict mode, any verification errors will prevent loading
      if (this.strictMode && !verificationResult.isValid) {
        const errorMsg = `Plugin ${manifest.id} failed verification: ${verificationResult.errors.join(', ')}`;
        this.emit(PluginLoaderEvent.PLUGIN_ERROR, {
          pluginId: manifest.id,
          error: new Error(errorMsg)
        });
        throw new Error(errorMsg);
      }
      
      // If the plugin has payment requirements, verify the user has access
      if (manifest.payment && manifest.payment.model !== 'free' && userId) {
        const hasAccess = await this.paymentManager.hasActiveSubscription(manifest.id, userId);
        if (!hasAccess) {
          throw new Error(`User does not have an active subscription for plugin ${manifest.id}`);
        }
      }
      
      // In a real implementation, this would dynamically import the plugin module
      // For this example, we'll just create a mock
      const mockExports = {
        initialize: async () => console.log(`Initializing plugin ${manifest.id}`),
        shutdown: async () => console.log(`Shutting down plugin ${manifest.id}`),
      };
      
      const mockInstance = { 
        active: true,
        manifest
      };
      
      // Initialize the plugin
      await mockExports.initialize();
      
      // Store the loaded plugin
      this.loadedPlugins.set(manifest.id, {
        manifest,
        exports: mockExports,
        instance: mockInstance
      });
      
      // Emit loaded event
      this.emit(PluginLoaderEvent.PLUGIN_LOADED, {
        pluginId: manifest.id,
        manifest
      });
      
      return mockExports;
    } catch (error) {
      this.emit(PluginLoaderEvent.PLUGIN_ERROR, {
        pluginId: manifest.id,
        error
      });
      throw error;
    } finally {
      this.pendingPlugins.delete(manifest.id);
    }
  }
  
  /**
   * Unload a plugin by ID
   * 
   * @param pluginId Plugin ID
   * @returns Promise resolving when the plugin is unloaded
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }
    
    try {
      // Call the plugin's shutdown method
      await plugin.exports.shutdown();
      
      // Remove the plugin from the loaded map
      this.loadedPlugins.delete(pluginId);
      
      // Emit unloaded event
      this.emit(PluginLoaderEvent.PLUGIN_UNLOADED, {
        pluginId
      });
    } catch (error) {
      this.emit(PluginLoaderEvent.PLUGIN_ERROR, {
        pluginId,
        error
      });
      throw error;
    }
  }
  
  /**
   * Get a loaded plugin by ID
   * 
   * @param pluginId Plugin ID
   * @returns The loaded plugin or undefined if not loaded
   */
  getPlugin(pluginId: string): any | undefined {
    const plugin = this.loadedPlugins.get(pluginId);
    return plugin ? plugin.exports : undefined;
  }
  
  /**
   * Check if a plugin is loaded
   * 
   * @param pluginId Plugin ID
   * @returns True if the plugin is loaded
   */
  isPluginLoaded(pluginId: string): boolean {
    return this.loadedPlugins.has(pluginId);
  }
  
  /**
   * Get all loaded plugins
   * 
   * @returns Map of loaded plugins by ID
   */
  getLoadedPlugins(): Map<string, PluginManifest> {
    const result = new Map<string, PluginManifest>();
    
    for (const [id, plugin] of this.loadedPlugins.entries()) {
      result.set(id, plugin.manifest);
    }
    
    return result;
  }
  
  /**
   * Verify a plugin against compatibility and integrity checks
   * 
   * @param manifest Plugin manifest
   * @returns Verification result
   */
  private verifyPlugin(manifest: PluginManifest): VerificationResult {
    // Get map of loaded plugins for dependency verification
    const loadedPlugins = new Map<string, PluginManifest>();
    
    for (const [id, plugin] of this.loadedPlugins.entries()) {
      loadedPlugins.set(id, plugin.manifest);
    }
    
    // Perform verification
    const result = verifyPlugin(manifest, {
      currentApiVersion: this.apiVersion,
      loadedPlugins,
      publicKey: this.verificationPublicKey
    });
    
    // Emit verification event
    this.emit(PluginLoaderEvent.PLUGIN_VERIFIED, {
      pluginId: manifest.id,
      result
    });
    
    return result;
  }
  
  /**
   * Create a checkout session for a paid plugin
   * 
   * @param pluginId Plugin ID to purchase
   * @param userId User ID making the purchase
   * @param successUrl URL to redirect to after successful checkout
   * @param cancelUrl URL to redirect to if checkout is canceled
   * @returns Promise resolving to the checkout URL
   */
  async createCheckoutSession(
    pluginId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const plugin = this.loadedPlugins.get(pluginId);
    
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }
    
    if (!plugin.manifest.payment) {
      throw new Error(`Plugin ${pluginId} is not a paid plugin`);
    }
    
    return this.paymentManager.createCheckoutSession(
      plugin.manifest,
      userId,
      successUrl,
      cancelUrl
    );
  }
  
  /**
   * Get the payment manager
   * 
   * @returns The payment manager instance
   */
  getPaymentManager(): PluginPaymentManager {
    return this.paymentManager;
  }
}
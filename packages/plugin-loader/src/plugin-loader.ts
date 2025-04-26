import { PluginManifest, PluginInstance, pluginManifestSchema } from './manifest-schema';
import { verifyPluginManifest, VerificationResult } from './verification';
import { EventEmitter } from 'events';

export interface PluginLoadOptions {
  /** Whether to automatically enable the plugin after loading */
  autoEnable?: boolean;
  /** Whether to verify the plugin signature (default: true) */
  verifySignature?: boolean;
  /** Whether to skip the peer version check (default: false) */
  skipVersionCheck?: boolean;
  /** Custom public key to use for signature verification */
  publicKey?: string;
}

export interface PluginLoaderOptions {
  /** Current core platform version */
  coreVersion: string;
  /** Default plugin load options */
  defaultLoadOptions?: PluginLoadOptions;
  /** Plugin storage directory */
  pluginDirectory?: string;
  /** Global plugin API */
  globalApi?: Record<string, any>;
}

export class PluginLoader extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private coreVersion: string;
  private defaultLoadOptions: PluginLoadOptions;
  private pluginDirectory: string;
  private globalApi: Record<string, any>;
  
  constructor(options: PluginLoaderOptions) {
    super();
    this.coreVersion = options.coreVersion;
    this.defaultLoadOptions = {
      autoEnable: true,
      verifySignature: true,
      skipVersionCheck: false,
      ...options.defaultLoadOptions
    };
    this.pluginDirectory = options.pluginDirectory || './plugins';
    this.globalApi = options.globalApi || {};
  }
  
  /**
   * Loads a plugin from a manifest and optional implementation
   * 
   * @param manifest The plugin manifest
   * @param implementation Optional plugin implementation
   * @param options Load options
   * @returns The loaded plugin instance or null if loading failed
   */
  async loadPlugin(
    manifest: PluginManifest, 
    implementation?: any,
    options?: PluginLoadOptions
  ): Promise<PluginInstance | null> {
    try {
      // Merge default options with provided options
      const loadOptions = { ...this.defaultLoadOptions, ...options };
      
      // Validate manifest schema
      const validationResult = pluginManifestSchema.safeParse(manifest);
      if (!validationResult.success) {
        this.emit('error', {
          pluginName: manifest.name,
          message: 'Invalid plugin manifest',
          errors: validationResult.error.errors
        });
        return null;
      }
      
      // Verify plugin compatibility and signature
      if (!loadOptions.skipVersionCheck) {
        const verificationResult = verifyPluginManifest(
          manifest, 
          this.coreVersion,
          loadOptions.publicKey
        );
        
        if (!verificationResult.isValid) {
          this.emit('error', {
            pluginName: manifest.name,
            message: 'Plugin verification failed',
            errors: verificationResult.errors
          });
          return null;
        }
        
        if (verificationResult.warnings.length > 0) {
          this.emit('warning', {
            pluginName: manifest.name,
            warnings: verificationResult.warnings
          });
        }
      }
      
      // Check if plugin with this name already exists
      if (this.plugins.has(manifest.name)) {
        this.emit('error', {
          pluginName: manifest.name,
          message: `Plugin with name ${manifest.name} already loaded`
        });
        return null;
      }
      
      // Create plugin instance
      const pluginId = manifest.name;
      const pluginInstance: PluginInstance = {
        id: pluginId,
        manifest,
        enabled: false,
        instance: implementation || null
      };
      
      // Load plugin implementation if not provided
      if (!implementation && manifest.main) {
        try {
          // In a real implementation, this would dynamically load the module
          // pluginInstance.instance = require(path.join(this.pluginDirectory, pluginId, manifest.main));
          
          // For this example, we'll just use a mock
          pluginInstance.instance = { init: () => console.log(`Plugin ${pluginId} initialized`) };
        } catch (error) {
          this.emit('error', {
            pluginName: manifest.name,
            message: `Failed to load plugin implementation: ${error.message}`
          });
          return null;
        }
      }
      
      // Register the plugin
      this.plugins.set(pluginId, pluginInstance);
      this.emit('plugin:loaded', { pluginId, manifest });
      
      // Enable the plugin if autoEnable is true
      if (loadOptions.autoEnable) {
        await this.enablePlugin(pluginId);
      }
      
      return pluginInstance;
    } catch (error) {
      this.emit('error', {
        pluginName: manifest?.name || 'unknown',
        message: `Unexpected error loading plugin: ${error.message}`,
        error
      });
      return null;
    }
  }
  
  /**
   * Enable a loaded plugin
   * 
   * @param pluginId The plugin ID to enable
   * @returns Whether the plugin was successfully enabled
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      this.emit('error', {
        pluginName: pluginId,
        message: `Plugin ${pluginId} not found`
      });
      return false;
    }
    
    if (plugin.enabled) {
      return true; // Already enabled
    }
    
    try {
      // Initialize the plugin with the global API
      if (plugin.instance && typeof plugin.instance.init === 'function') {
        plugin.api = await plugin.instance.init(this.globalApi);
      }
      
      // Mark as enabled
      plugin.enabled = true;
      this.emit('plugin:enabled', { pluginId });
      return true;
    } catch (error) {
      this.emit('error', {
        pluginName: pluginId,
        message: `Failed to enable plugin: ${error.message}`,
        error
      });
      return false;
    }
  }
  
  /**
   * Disable a loaded plugin
   * 
   * @param pluginId The plugin ID to disable
   * @returns Whether the plugin was successfully disabled
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      this.emit('error', {
        pluginName: pluginId,
        message: `Plugin ${pluginId} not found`
      });
      return false;
    }
    
    if (!plugin.enabled) {
      return true; // Already disabled
    }
    
    try {
      // Cleanup the plugin
      if (plugin.instance && typeof plugin.instance.destroy === 'function') {
        await plugin.instance.destroy();
      }
      
      // Mark as disabled
      plugin.enabled = false;
      plugin.api = undefined;
      this.emit('plugin:disabled', { pluginId });
      return true;
    } catch (error) {
      this.emit('error', {
        pluginName: pluginId,
        message: `Failed to disable plugin: ${error.message}`,
        error
      });
      return false;
    }
  }
  
  /**
   * Unload a plugin completely
   * 
   * @param pluginId The plugin ID to unload
   * @returns Whether the plugin was successfully unloaded
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    // Disable first if enabled
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    
    if (plugin.enabled) {
      const disabled = await this.disablePlugin(pluginId);
      if (!disabled) {
        return false;
      }
    }
    
    // Remove from plugins map
    this.plugins.delete(pluginId);
    this.emit('plugin:unloaded', { pluginId });
    return true;
  }
  
  /**
   * Get all loaded plugins
   */
  getPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Get a specific plugin by ID
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }
  
  /**
   * Check if a plugin is enabled
   */
  isPluginEnabled(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    return plugin ? plugin.enabled : false;
  }
}
import { z } from 'zod';

// Plugin manifest schema
export const pluginManifestSchema = z.object({
  // Basic plugin info
  name: z.string().min(3).max(100),
  displayName: z.string().min(3).max(100).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/),
  description: z.string().min(10).max(500),
  
  // Plugin requirements
  peerVersion: z.string().regex(/^(\d+\.\d+\.\d+|\^[0-9]+\.\d+\.\d+|~[0-9]+\.\d+\.\d+)$/),
  
  // Author information
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  }),
  
  // Plugin capabilities
  capabilities: z.array(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
  
  // Entrypoint and assets
  main: z.string(),
  styles: z.string().optional(),
  assets: z.array(z.string()).optional(),
  
  // Security
  publicKey: z.string().optional(),
  signature: z.string().optional(),
  
  // Plugin configuration
  configuration: z.object({
    settings: z.array(z.object({
      key: z.string(),
      type: z.enum(['string', 'number', 'boolean', 'select']),
      label: z.string(),
      description: z.string().optional(),
      default: z.union([z.string(), z.number(), z.boolean()]).optional(),
      options: z.array(z.object({
        value: z.union([z.string(), z.number(), z.boolean()]),
        label: z.string()
      })).optional(),
      required: z.boolean().optional()
    })).optional(),
    permissions: z.array(z.string()).optional()
  }).optional(),
  
  // Marketplace information
  marketplace: z.object({
    premium: z.boolean().default(false),
    price: z.number().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    screenshots: z.array(z.string().url()).optional(),
    demoUrl: z.string().url().optional(),
    documentationUrl: z.string().url().optional(),
    featured: z.boolean().default(false)
  }).optional()
});

export type PluginManifest = z.infer<typeof pluginManifestSchema>;

// Plugin instance (runtime object with loaded data)
export interface PluginInstance {
  id: string;
  manifest: PluginManifest;
  enabled: boolean;
  instance: any;
  api?: any; // The API exposed by the plugin
}
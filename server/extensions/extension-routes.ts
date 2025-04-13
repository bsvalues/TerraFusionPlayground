/**
 * Extension Routes
 * 
 * This file defines the API routes for managing extensions,
 * including listing, activating, deactivating, and configuring extensions.
 */

import { Request, Response, Router } from 'express';
import { ExtensionRegistry } from './extension-registry';
import { IStorage } from '../storage';

export function createExtensionRoutes(extensionRegistry: ExtensionRegistry) {
  const router = Router();
  
  /**
   * Get all extensions and their status
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const extensions = Array.from(extensionRegistry.getAllExtensions().entries()).map(([id, extension]) => ({
        id,
        name: extension.metadata.name,
        version: extension.metadata.version,
        description: extension.metadata.description,
        author: extension.metadata.author,
        category: extension.metadata.category,
        isActive: extensionRegistry.isExtensionActive(id),
        icon: extension.metadata.icon,
        requiredPermissions: extension.metadata.requiredPermissions
      }));
      
      res.json(extensions);
    } catch (error) {
      console.error('Error retrieving extensions:', error);
      res.status(500).json({ error: 'Failed to retrieve extensions' });
    }
  });
  
  /**
   * Get extension details
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const extension = extensionRegistry.getExtension(id);
      
      if (!extension) {
        return res.status(404).json({ error: `Extension '${id}' not found` });
      }
      
      res.json({
        id,
        metadata: extension.metadata,
        isActive: extensionRegistry.isExtensionActive(id),
        settings: extensionRegistry.getExtensionSettings(id)
      });
    } catch (error) {
      console.error(`Error retrieving extension details for ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to retrieve extension details' });
    }
  });
  
  /**
   * Activate an extension
   */
  router.post('/:id/activate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const extension = extensionRegistry.getExtension(id);
      
      if (!extension) {
        return res.status(404).json({ error: `Extension '${id}' not found` });
      }
      
      if (extensionRegistry.isExtensionActive(id)) {
        return res.json({ success: true, message: `Extension '${id}' is already active` });
      }
      
      const success = await extensionRegistry.activateExtension(id);
      
      if (success) {
        res.json({ success: true, message: `Extension '${id}' activated successfully` });
      } else {
        res.status(500).json({ success: false, error: `Failed to activate extension '${id}'` });
      }
    } catch (error) {
      console.error(`Error activating extension ${req.params.id}:`, error);
      res.status(500).json({ success: false, error: 'Failed to activate extension' });
    }
  });
  
  /**
   * Deactivate an extension
   */
  router.post('/:id/deactivate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const extension = extensionRegistry.getExtension(id);
      
      if (!extension) {
        return res.status(404).json({ error: `Extension '${id}' not found` });
      }
      
      if (!extensionRegistry.isExtensionActive(id)) {
        return res.json({ success: true, message: `Extension '${id}' is already inactive` });
      }
      
      const success = await extensionRegistry.deactivateExtension(id);
      
      if (success) {
        res.json({ success: true, message: `Extension '${id}' deactivated successfully` });
      } else {
        res.status(500).json({ success: false, error: `Failed to deactivate extension '${id}'` });
      }
    } catch (error) {
      console.error(`Error deactivating extension ${req.params.id}:`, error);
      res.status(500).json({ success: false, error: 'Failed to deactivate extension' });
    }
  });
  
  /**
   * Update extension settings
   */
  router.patch('/:id/settings', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { settings } = req.body;
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Settings must be an object' });
      }
      
      const extension = extensionRegistry.getExtension(id);
      
      if (!extension) {
        return res.status(404).json({ error: `Extension '${id}' not found` });
      }
      
      extensionRegistry.updateExtensionSettings(id, settings);
      
      res.json({ 
        success: true, 
        message: `Settings for extension '${id}' updated successfully`,
        settings: extensionRegistry.getExtensionSettings(id)
      });
    } catch (error) {
      console.error(`Error updating settings for extension ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to update extension settings' });
    }
  });
  
  /**
   * Execute a command
   */
  router.post('/commands/:command', async (req: Request, res: Response) => {
    try {
      const { command } = req.params;
      const args = req.body?.args || [];
      
      if (!Array.isArray(args)) {
        return res.status(400).json({ error: 'Command arguments must be an array' });
      }
      
      const result = extensionRegistry.executeCommand(command, ...args);
      res.json({ success: true, result });
    } catch (error) {
      console.error(`Error executing command ${req.params.command}:`, error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to execute command' 
      });
    }
  });
  
  /**
   * Get all webview panels
   */
  router.get('/webviews', async (req: Request, res: Response) => {
    try {
      const panels = extensionRegistry.getAllWebviewPanels().map(panel => ({
        id: panel.id,
        title: panel.title,
        extension: panel.extension
      }));
      
      res.json(panels);
    } catch (error) {
      console.error('Error retrieving webview panels:', error);
      res.status(500).json({ error: 'Failed to retrieve webview panels' });
    }
  });
  
  /**
   * Get a specific webview panel
   */
  router.get('/webviews/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const panel = extensionRegistry.getWebviewPanel(id);
      
      if (!panel) {
        return res.status(404).json({ error: `Webview panel '${id}' not found` });
      }
      
      res.json(panel);
    } catch (error) {
      console.error(`Error retrieving webview panel ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to retrieve webview panel' });
    }
  });
  
  /**
   * Get all menu items
   */
  router.get('/menu-items', async (req: Request, res: Response) => {
    try {
      const menuItems = extensionRegistry.getAllMenuItems();
      res.json(menuItems);
    } catch (error) {
      console.error('Error retrieving menu items:', error);
      res.status(500).json({ error: 'Failed to retrieve menu items' });
    }
  });
  
  return router;
}
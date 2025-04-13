/**
 * Extension Routes
 * 
 * This file defines the API routes for managing extensions,
 * including listing, activating, deactivating, and configuring extensions.
 */

import { Router, Request, Response } from 'express';
import { ExtensionRegistry } from './extension-registry';

/**
 * Create extension routes
 * @param extensionRegistry Extension registry
 * @returns Express router with extension routes
 */
export function createExtensionRoutes(extensionRegistry: ExtensionRegistry) {
  const router = Router();
  
  /**
   * Get all extensions and their status
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const extensions = extensionRegistry.getAllExtensions();
      
      // Format the response
      const formattedExtensions = extensions.map(ext => ({
        id: ext.id,
        name: ext.metadata.name,
        version: ext.metadata.version,
        description: ext.metadata.description,
        author: ext.metadata.author,
        active: ext.active,
        category: ext.metadata.category
      }));
      
      res.json(formattedExtensions);
    } catch (error) {
      console.error('Error getting extensions:', error);
      res.status(500).json({ error: 'Failed to get extensions' });
    }
  });
  
  /**
   * Get extension details
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const extensionId = req.params.id;
      const metadata = extensionRegistry.getExtensionMetadata(extensionId);
      
      if (!metadata) {
        return res.status(404).json({ error: 'Extension not found' });
      }
      
      const extensions = extensionRegistry.getAllExtensions();
      const extension = extensions.find(ext => ext.id === extensionId);
      const settings = extensionRegistry.getExtensionSettings(extensionId);
      
      res.json({
        id: extensionId,
        metadata,
        settings,
        active: extension?.active || false
      });
    } catch (error) {
      console.error(`Error getting extension ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get extension details' });
    }
  });
  
  /**
   * Activate an extension
   */
  router.post('/:id/activate', async (req: Request, res: Response) => {
    try {
      const extensionId = req.params.id;
      const metadata = extensionRegistry.getExtensionMetadata(extensionId);
      
      if (!metadata) {
        return res.status(404).json({ error: 'Extension not found' });
      }
      
      const extensions = extensionRegistry.getAllExtensions();
      const extension = extensions.find(ext => ext.id === extensionId);
      
      if (extension?.active) {
        return res.json({ message: 'Extension is already active' });
      }
      
      await extensionRegistry.activateExtension(extensionId);
      
      res.json({ success: true, message: `Extension ${metadata.name} activated` });
    } catch (error) {
      console.error(`Error activating extension ${req.params.id}:`, error);
      res.status(500).json({ error: `Failed to activate extension: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  /**
   * Deactivate an extension
   */
  router.post('/:id/deactivate', async (req: Request, res: Response) => {
    try {
      const extensionId = req.params.id;
      const metadata = extensionRegistry.getExtensionMetadata(extensionId);
      
      if (!metadata) {
        return res.status(404).json({ error: 'Extension not found' });
      }
      
      const extensions = extensionRegistry.getAllExtensions();
      const extension = extensions.find(ext => ext.id === extensionId);
      
      if (!extension?.active) {
        return res.json({ message: 'Extension is already inactive' });
      }
      
      await extensionRegistry.deactivateExtension(extensionId);
      
      res.json({ success: true, message: `Extension ${metadata.name} deactivated` });
    } catch (error) {
      console.error(`Error deactivating extension ${req.params.id}:`, error);
      res.status(500).json({ error: `Failed to deactivate extension: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  /**
   * Update extension settings
   */
  router.patch('/:id/settings', async (req: Request, res: Response) => {
    try {
      const extensionId = req.params.id;
      const newSettings = req.body;
      
      const metadata = extensionRegistry.getExtensionMetadata(extensionId);
      
      if (!metadata) {
        return res.status(404).json({ error: 'Extension not found' });
      }
      
      // Validate settings against metadata
      const validSettings: Record<string, any> = {};
      const invalidSettings: string[] = [];
      
      for (const [key, value] of Object.entries(newSettings)) {
        const settingDef = metadata.settings?.find(s => s.id === key);
        
        if (!settingDef) {
          invalidSettings.push(key);
          continue;
        }
        
        // Simple type validation
        if (settingDef.type === 'number' && typeof value !== 'number') {
          invalidSettings.push(key);
        } else if (settingDef.type === 'string' && typeof value !== 'string') {
          invalidSettings.push(key);
        } else if (settingDef.type === 'boolean' && typeof value !== 'boolean') {
          invalidSettings.push(key);
        } else if ((settingDef.type === 'select' || settingDef.type === 'multiselect') && 
                  !settingDef.options?.some(option => option.value === value)) {
          invalidSettings.push(key);
        } else {
          validSettings[key] = value;
        }
      }
      
      if (invalidSettings.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid settings',
          invalidSettings
        });
      }
      
      extensionRegistry.updateExtensionSettings(extensionId, validSettings);
      
      const updatedSettings = extensionRegistry.getExtensionSettings(extensionId);
      
      res.json({ 
        success: true, 
        message: `Settings updated for extension ${metadata.name}`,
        settings: updatedSettings
      });
    } catch (error) {
      console.error(`Error updating settings for extension ${req.params.id}:`, error);
      res.status(500).json({ error: `Failed to update extension settings: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  /**
   * Execute a command
   */
  router.post('/commands/:command', async (req: Request, res: Response) => {
    try {
      const command = req.params.command;
      const args = req.body.args || [];
      
      const result = await extensionRegistry.executeCommand(command, ...args);
      
      res.json({ success: true, result });
    } catch (error) {
      console.error(`Error executing command ${req.params.command}:`, error);
      res.status(500).json({ error: `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  /**
   * Get all webview panels
   */
  router.get('/webviews', async (req: Request, res: Response) => {
    try {
      const webviews = extensionRegistry.getAllWebviewPanels();
      
      // Format the response to include metadata but not the full content
      const formattedWebviews = webviews.map(webview => ({
        id: webview.id,
        title: webview.title,
        contentPreview: webview.content.substring(0, 100) + (webview.content.length > 100 ? '...' : '')
      }));
      
      res.json(formattedWebviews);
    } catch (error) {
      console.error('Error getting webview panels:', error);
      res.status(500).json({ error: 'Failed to get webview panels' });
    }
  });
  
  /**
   * Get a specific webview panel
   */
  router.get('/webviews/:id', async (req: Request, res: Response) => {
    try {
      const webviewId = req.params.id;
      const webview = extensionRegistry.getWebviewPanel(webviewId);
      
      if (!webview) {
        return res.status(404).json({ error: 'Webview panel not found' });
      }
      
      res.json({
        id: webview.id,
        title: webview.title,
        content: webview.content
      });
    } catch (error) {
      console.error(`Error getting webview panel ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get webview panel' });
    }
  });
  
  /**
   * Get all menu items
   */
  router.get('/menu-items', async (req: Request, res: Response) => {
    try {
      const menuItems = extensionRegistry.getAllMenuItems();
      
      // Build a menu tree
      const topLevelItems = menuItems.filter(item => !item.parent);
      const childItems = menuItems.filter(item => item.parent);
      
      const buildMenuTree = (items: any[]) => {
        return items.map(item => {
          const children = childItems.filter(child => child.parent === item.id);
          return {
            ...item,
            children: children.length > 0 ? buildMenuTree(children) : []
          };
        });
      };
      
      const menuTree = buildMenuTree(topLevelItems);
      
      res.json(menuTree);
    } catch (error) {
      console.error('Error getting menu items:', error);
      res.status(500).json({ error: 'Failed to get menu items' });
    }
  });
  
  return router;
}
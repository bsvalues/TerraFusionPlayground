/**
 * Extensions System Entry Point
 * 
 * This file exports the extension system components and provides
 * initialization for the extension system.
 */

import { IStorage } from '../storage';
import { ExtensionRegistry } from './extension-registry';
import { createExtensionRoutes } from './extension-routes';
import { PropertyComparisonExtension } from './samples/property-comparison-extension';

// Export core extension types and classes
export * from './extension-interface';
export * from './base-extension';
export * from './extension-registry';
export * from './extension-routes';

// Sample extensions
export * from './samples/property-comparison-extension';

/**
 * Initialize the extension system with built-in and installed extensions
 * @param storage Storage instance to use with extensions
 * @returns Initialized ExtensionRegistry instance
 */
export function initializeExtensionSystem(storage: IStorage): ExtensionRegistry {
  // Create the extension registry
  const extensionRegistry = new ExtensionRegistry(storage);
  
  // Register built-in extensions
  const propertyComparisonExtension = new PropertyComparisonExtension();
  extensionRegistry.registerExtension(propertyComparisonExtension);
  
  // TODO: Implement dynamic loading of installed extensions from disk/database
  
  // Activate built-in extensions
  extensionRegistry.activateExtension(propertyComparisonExtension.metadata.id)
    .catch(error => console.error(`Failed to activate extension ${propertyComparisonExtension.metadata.id}:`, error));
  
  return extensionRegistry;
}
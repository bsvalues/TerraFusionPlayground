/**
 * Realm Adapter for Yjs Document Persistence
 * 
 * This module provides functions to load and save Yjs documents to Realm database,
 * enabling offline-first CRDT capabilities on mobile devices.
 */

import Realm from 'realm';
import * as Y from 'yjs';

/**
 * YDoc Schema for Realm
 */
const YDocSchema = {
  name: 'YDoc',
  primaryKey: 'id',
  properties: {
    id: 'string',
    updateData: 'data',
    lastModified: 'date',
    version: 'int',
  }
};

/**
 * Get a Realm instance for YDoc storage
 * 
 * @returns Realm instance
 */
async function getRealm(): Promise<Realm> {
  try {
    return await Realm.open({
      schema: [YDocSchema],
      schemaVersion: 1,
    });
  } catch (error) {
    console.error('Error opening Realm:', error);
    throw error;
  }
}

/**
 * Load a Yjs document from Realm
 * 
 * @param id Document ID
 * @returns Binary update data or null if not found
 */
export async function loadYDoc(id: string): Promise<Uint8Array | null> {
  try {
    const realm = await getRealm();
    
    // Find document by ID
    const doc = realm.objectForPrimaryKey('YDoc', id);
    
    if (doc && doc.updateData) {
      console.log(`Loaded YDoc ${id} from Realm, version ${doc.version}`);
      return new Uint8Array(doc.updateData);
    }
    
    console.log(`No YDoc found for ${id}`);
    return null;
  } catch (error) {
    console.error(`Error loading YDoc ${id} from Realm:`, error);
    return null;
  }
}

/**
 * Save a Yjs document to Realm
 * 
 * @param id Document ID
 * @param ydoc Yjs document
 * @returns Whether the save was successful
 */
export async function saveYDoc(id: string, ydoc: Y.Doc): Promise<boolean> {
  try {
    const realm = await getRealm();
    
    // Encode document state
    const updateData = Y.encodeStateAsUpdate(ydoc);
    
    // Write to Realm
    realm.write(() => {
      const existingDoc = realm.objectForPrimaryKey('YDoc', id);
      
      if (existingDoc) {
        // Update existing document
        existingDoc.updateData = updateData;
        existingDoc.lastModified = new Date();
        existingDoc.version = existingDoc.version + 1;
        
        console.log(`Updated YDoc ${id} in Realm, version ${existingDoc.version}`);
      } else {
        // Create new document
        realm.create('YDoc', {
          id,
          updateData,
          lastModified: new Date(),
          version: 1,
        });
        
        console.log(`Created new YDoc ${id} in Realm, version 1`);
      }
    });
    
    return true;
  } catch (error) {
    console.error(`Error saving YDoc ${id} to Realm:`, error);
    return false;
  }
}

/**
 * Delete a Yjs document from Realm
 * 
 * @param id Document ID
 * @returns Whether the deletion was successful
 */
export async function deleteYDoc(id: string): Promise<boolean> {
  try {
    const realm = await getRealm();
    
    // Find document by ID
    const doc = realm.objectForPrimaryKey('YDoc', id);
    
    if (doc) {
      // Delete document
      realm.write(() => {
        realm.delete(doc);
      });
      
      console.log(`Deleted YDoc ${id} from Realm`);
      return true;
    }
    
    console.log(`No YDoc found for ${id} to delete`);
    return false;
  } catch (error) {
    console.error(`Error deleting YDoc ${id} from Realm:`, error);
    return false;
  }
}

/**
 * List all Yjs documents in Realm
 * 
 * @returns Array of document IDs
 */
export async function listYDocs(): Promise<string[]> {
  try {
    const realm = await getRealm();
    
    // Get all documents
    const docs = realm.objects('YDoc');
    
    // Extract IDs
    const ids = Array.from(docs).map(doc => doc.id);
    
    console.log(`Found ${ids.length} YDocs in Realm`);
    return ids;
  } catch (error) {
    console.error('Error listing YDocs from Realm:', error);
    return [];
  }
}
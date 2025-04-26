/**
 * Storage Module
 * 
 * Provides storage capabilities for offline sync, with adapters for
 * IndexedDB, localStorage, and Realm.
 */

import { EventEmitter } from 'events';

/**
 * Storage provider interface
 */
export interface StorageProvider {
  /** Has document */
  hasDocument(docId: string): Promise<boolean>;
  /** Save document */
  saveDocument(docId: string, data: Uint8Array): Promise<void>;
  /** Load document */
  loadDocument(docId: string): Promise<Uint8Array | null>;
  /** Delete document */
  deleteDocument(docId: string): Promise<void>;
  /** Save metadata */
  saveMetadata(docId: string, metadata: any): Promise<void>;
  /** Load metadata */
  loadMetadata(docId: string): Promise<any>;
  /** Delete metadata */
  deleteMetadata(docId: string): Promise<void>;
  /** List documents */
  listDocuments(): Promise<string[]>;
  /** Clear all */
  clearAll(): Promise<void>;
}

/**
 * Local storage provider using IndexedDB
 */
export class LocalStorageProvider extends EventEmitter implements StorageProvider {
  private dbName: string;
  private docStoreName: string;
  private metaStoreName: string;
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  
  /**
   * Initialize a new local storage provider
   * 
   * @param dbName IndexedDB database name
   * @param docStoreName Document store name
   * @param metaStoreName Metadata store name
   */
  constructor(
    dbName = 'terraFusionOfflineSync',
    docStoreName = 'documents',
    metaStoreName = 'metadata'
  ) {
    super();
    this.dbName = dbName;
    this.docStoreName = docStoreName;
    this.metaStoreName = metaStoreName;
  }
  
  /**
   * Open the database
   * 
   * @returns The opened database
   */
  private async openDb(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    
    if (this.dbPromise) {
      return this.dbPromise;
    }
    
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB:', event);
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create document store
        if (!db.objectStoreNames.contains(this.docStoreName)) {
          db.createObjectStore(this.docStoreName);
        }
        
        // Create metadata store
        if (!db.objectStoreNames.contains(this.metaStoreName)) {
          db.createObjectStore(this.metaStoreName);
        }
      };
    });
    
    return this.dbPromise;
  }
  
  /**
   * Check if a document exists
   * 
   * @param docId Document ID
   * @returns Whether the document exists
   */
  async hasDocument(docId: string): Promise<boolean> {
    try {
      const db = await this.openDb();
      const transaction = db.transaction([this.docStoreName], 'readonly');
      const store = transaction.objectStore(this.docStoreName);
      const request = store.get(docId);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          resolve(!!request.result);
        };
        
        request.onerror = () => {
          resolve(false);
        };
      });
    } catch (error) {
      console.error('Error checking document:', error);
      return false;
    }
  }
  
  /**
   * Save a document
   * 
   * @param docId Document ID
   * @param data Document data
   */
  async saveDocument(docId: string, data: Uint8Array): Promise<void> {
    try {
      const db = await this.openDb();
      const transaction = db.transaction([this.docStoreName], 'readwrite');
      const store = transaction.objectStore(this.docStoreName);
      
      return new Promise((resolve, reject) => {
        const request = store.put(data, docId);
        
        request.onsuccess = () => {
          this.emit('document:saved', { docId });
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to save document: ${docId}`));
        };
      });
    } catch (error) {
      console.error('Error saving document:', error);
      throw new Error(`Failed to save document: ${docId}`);
    }
  }
  
  /**
   * Load a document
   * 
   * @param docId Document ID
   * @returns The document data or null if not found
   */
  async loadDocument(docId: string): Promise<Uint8Array | null> {
    try {
      const db = await this.openDb();
      const transaction = db.transaction([this.docStoreName], 'readonly');
      const store = transaction.objectStore(this.docStoreName);
      
      return new Promise((resolve) => {
        const request = store.get(docId);
        
        request.onsuccess = () => {
          if (request.result) {
            this.emit('document:loaded', { docId });
            resolve(request.result);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error loading document:', error);
      return null;
    }
  }
  
  /**
   * Delete a document
   * 
   * @param docId Document ID
   */
  async deleteDocument(docId: string): Promise<void> {
    try {
      const db = await this.openDb();
      const transaction = db.transaction([this.docStoreName], 'readwrite');
      const store = transaction.objectStore(this.docStoreName);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(docId);
        
        request.onsuccess = () => {
          this.emit('document:deleted', { docId });
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to delete document: ${docId}`));
        };
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error(`Failed to delete document: ${docId}`);
    }
  }
  
  /**
   * Save document metadata
   * 
   * @param docId Document ID
   * @param metadata Metadata
   */
  async saveMetadata(docId: string, metadata: any): Promise<void> {
    try {
      const db = await this.openDb();
      const transaction = db.transaction([this.metaStoreName], 'readwrite');
      const store = transaction.objectStore(this.metaStoreName);
      
      return new Promise((resolve, reject) => {
        const request = store.put(metadata, docId);
        
        request.onsuccess = () => {
          this.emit('metadata:saved', { docId, metadata });
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to save metadata: ${docId}`));
        };
      });
    } catch (error) {
      console.error('Error saving metadata:', error);
      throw new Error(`Failed to save metadata: ${docId}`);
    }
  }
  
  /**
   * Load document metadata
   * 
   * @param docId Document ID
   * @returns The metadata or null if not found
   */
  async loadMetadata(docId: string): Promise<any> {
    try {
      const db = await this.openDb();
      const transaction = db.transaction([this.metaStoreName], 'readonly');
      const store = transaction.objectStore(this.metaStoreName);
      
      return new Promise((resolve) => {
        const request = store.get(docId);
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error loading metadata:', error);
      return null;
    }
  }
  
  /**
   * Delete document metadata
   * 
   * @param docId Document ID
   */
  async deleteMetadata(docId: string): Promise<void> {
    try {
      const db = await this.openDb();
      const transaction = db.transaction([this.metaStoreName], 'readwrite');
      const store = transaction.objectStore(this.metaStoreName);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(docId);
        
        request.onsuccess = () => {
          this.emit('metadata:deleted', { docId });
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to delete metadata: ${docId}`));
        };
      });
    } catch (error) {
      console.error('Error deleting metadata:', error);
      throw new Error(`Failed to delete metadata: ${docId}`);
    }
  }
  
  /**
   * List all documents
   * 
   * @returns Array of document IDs
   */
  async listDocuments(): Promise<string[]> {
    try {
      const db = await this.openDb();
      const transaction = db.transaction([this.docStoreName], 'readonly');
      const store = transaction.objectStore(this.docStoreName);
      
      return new Promise((resolve) => {
        const request = store.getAllKeys();
        
        request.onsuccess = () => {
          const keys = Array.from(request.result).map(key => String(key));
          resolve(keys);
        };
        
        request.onerror = () => {
          resolve([]);
        };
      });
    } catch (error) {
      console.error('Error listing documents:', error);
      return [];
    }
  }
  
  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.openDb();
      
      // Clear document store
      const docTransaction = db.transaction([this.docStoreName], 'readwrite');
      const docStore = docTransaction.objectStore(this.docStoreName);
      
      await new Promise<void>((resolve, reject) => {
        const request = docStore.clear();
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error('Failed to clear document store'));
        };
      });
      
      // Clear metadata store
      const metaTransaction = db.transaction([this.metaStoreName], 'readwrite');
      const metaStore = metaTransaction.objectStore(this.metaStoreName);
      
      await new Promise<void>((resolve, reject) => {
        const request = metaStore.clear();
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error('Failed to clear metadata store'));
        };
      });
      
      this.emit('storage:cleared');
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw new Error('Failed to clear storage');
    }
  }
}

export default LocalStorageProvider;
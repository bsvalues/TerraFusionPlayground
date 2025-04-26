/**
 * Storage Provider
 * 
 * Provides an interface for persisting data locally.
 */

import { EventEmitter } from 'events';
import { isBrowser } from './utils';

/**
 * Storage interface
 */
export interface IStorageProvider {
  /**
   * Check if document exists
   * 
   * @param docId Document ID
   * @returns Whether document exists
   */
  documentExists(docId: string): Promise<boolean>;
  
  /**
   * Save document
   * 
   * @param docId Document ID
   * @param data Document data
   */
  saveDocument(docId: string, data: Uint8Array): Promise<void>;
  
  /**
   * Load document
   * 
   * @param docId Document ID
   * @returns Document data
   */
  loadDocument(docId: string): Promise<Uint8Array | null>;
  
  /**
   * Delete document
   * 
   * @param docId Document ID
   */
  deleteDocument(docId: string): Promise<void>;
  
  /**
   * List documents
   * 
   * @returns Array of document IDs
   */
  listDocuments(): Promise<string[]>;
  
  /**
   * Save metadata
   * 
   * @param docId Document ID
   * @param metadata Metadata
   */
  saveMetadata(docId: string, metadata: any): Promise<void>;
  
  /**
   * Load metadata
   * 
   * @param docId Document ID
   * @returns Metadata
   */
  loadMetadata(docId: string): Promise<any | null>;
  
  /**
   * Delete metadata
   * 
   * @param docId Document ID
   */
  deleteMetadata(docId: string): Promise<void>;
}

/**
 * IndexedDB storage provider
 */
export class IndexedDBStorageProvider extends EventEmitter implements IStorageProvider {
  private dbName: string;
  private dbVersion: number;
  private db: IDBDatabase | null = null;
  private isReady: boolean = false;
  private readyPromise: Promise<void>;
  
  /**
   * Document store name
   */
  private static DOC_STORE = 'documents';
  
  /**
   * Metadata store name
   */
  private static META_STORE = 'metadata';
  
  /**
   * Initialize a new IndexedDB storage provider
   * 
   * @param dbName Database name
   * @param dbVersion Database version
   */
  constructor(dbName: string = 'terrafusion_docs', dbVersion: number = 1) {
    super();
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.readyPromise = this.initializeDB();
  }
  
  /**
   * Initialize database
   */
  private async initializeDB(): Promise<void> {
    if (!isBrowser()) {
      throw new Error('IndexedDB is only available in browser environments');
    }
    
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = (event) => {
        reject(new Error(`Failed to open database: ${(event.target as any).error}`));
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isReady = true;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create document store if it doesn't exist
        if (!db.objectStoreNames.contains(IndexedDBStorageProvider.DOC_STORE)) {
          db.createObjectStore(IndexedDBStorageProvider.DOC_STORE);
        }
        
        // Create metadata store if it doesn't exist
        if (!db.objectStoreNames.contains(IndexedDBStorageProvider.META_STORE)) {
          db.createObjectStore(IndexedDBStorageProvider.META_STORE);
        }
      };
    });
  }
  
  /**
   * Ensure database is ready
   */
  private async ensureReady(): Promise<void> {
    if (!this.isReady) {
      await this.readyPromise;
    }
  }
  
  /**
   * Check if document exists
   * 
   * @param docId Document ID
   * @returns Whether document exists
   */
  async documentExists(docId: string): Promise<boolean> {
    await this.ensureReady();
    
    return new Promise<boolean>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([IndexedDBStorageProvider.DOC_STORE], 'readonly');
      const store = transaction.objectStore(IndexedDBStorageProvider.DOC_STORE);
      const request = store.getKey(docId);
      
      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to check if document exists: ${docId}`));
      };
    });
  }
  
  /**
   * Save document
   * 
   * @param docId Document ID
   * @param data Document data
   */
  async saveDocument(docId: string, data: Uint8Array): Promise<void> {
    await this.ensureReady();
    
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([IndexedDBStorageProvider.DOC_STORE], 'readwrite');
      const store = transaction.objectStore(IndexedDBStorageProvider.DOC_STORE);
      const request = store.put(data, docId);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to save document: ${docId}`));
      };
    });
  }
  
  /**
   * Load document
   * 
   * @param docId Document ID
   * @returns Document data
   */
  async loadDocument(docId: string): Promise<Uint8Array | null> {
    await this.ensureReady();
    
    return new Promise<Uint8Array | null>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([IndexedDBStorageProvider.DOC_STORE], 'readonly');
      const store = transaction.objectStore(IndexedDBStorageProvider.DOC_STORE);
      const request = store.get(docId);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to load document: ${docId}`));
      };
    });
  }
  
  /**
   * Delete document
   * 
   * @param docId Document ID
   */
  async deleteDocument(docId: string): Promise<void> {
    await this.ensureReady();
    
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([IndexedDBStorageProvider.DOC_STORE], 'readwrite');
      const store = transaction.objectStore(IndexedDBStorageProvider.DOC_STORE);
      const request = store.delete(docId);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to delete document: ${docId}`));
      };
    });
  }
  
  /**
   * List documents
   * 
   * @returns Array of document IDs
   */
  async listDocuments(): Promise<string[]> {
    await this.ensureReady();
    
    return new Promise<string[]>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([IndexedDBStorageProvider.DOC_STORE], 'readonly');
      const store = transaction.objectStore(IndexedDBStorageProvider.DOC_STORE);
      const request = store.getAllKeys();
      
      request.onsuccess = () => {
        const docIds: string[] = [];
        
        for (let i = 0; i < request.result.length; i++) {
          docIds.push(request.result[i] as string);
        }
        
        resolve(docIds);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to list documents'));
      };
    });
  }
  
  /**
   * Save metadata
   * 
   * @param docId Document ID
   * @param metadata Metadata
   */
  async saveMetadata(docId: string, metadata: any): Promise<void> {
    await this.ensureReady();
    
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([IndexedDBStorageProvider.META_STORE], 'readwrite');
      const store = transaction.objectStore(IndexedDBStorageProvider.META_STORE);
      const request = store.put(metadata, docId);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to save metadata: ${docId}`));
      };
    });
  }
  
  /**
   * Load metadata
   * 
   * @param docId Document ID
   * @returns Metadata
   */
  async loadMetadata(docId: string): Promise<any | null> {
    await this.ensureReady();
    
    return new Promise<any | null>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([IndexedDBStorageProvider.META_STORE], 'readonly');
      const store = transaction.objectStore(IndexedDBStorageProvider.META_STORE);
      const request = store.get(docId);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to load metadata: ${docId}`));
      };
    });
  }
  
  /**
   * Delete metadata
   * 
   * @param docId Document ID
   */
  async deleteMetadata(docId: string): Promise<void> {
    await this.ensureReady();
    
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([IndexedDBStorageProvider.META_STORE], 'readwrite');
      const store = transaction.objectStore(IndexedDBStorageProvider.META_STORE);
      const request = store.delete(docId);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to delete metadata: ${docId}`));
      };
    });
  }
}

/**
 * Memory storage provider (for non-browser environments or testing)
 */
export class LocalStorageProvider extends EventEmitter implements IStorageProvider {
  private documents: Map<string, Uint8Array> = new Map();
  private metadata: Map<string, any> = new Map();
  
  /**
   * Initialize a new memory storage provider
   */
  constructor() {
    super();
  }
  
  /**
   * Check if document exists
   * 
   * @param docId Document ID
   * @returns Whether document exists
   */
  async documentExists(docId: string): Promise<boolean> {
    return this.documents.has(docId);
  }
  
  /**
   * Save document
   * 
   * @param docId Document ID
   * @param data Document data
   */
  async saveDocument(docId: string, data: Uint8Array): Promise<void> {
    this.documents.set(docId, data);
    this.emit('document:saved', { docId });
  }
  
  /**
   * Load document
   * 
   * @param docId Document ID
   * @returns Document data
   */
  async loadDocument(docId: string): Promise<Uint8Array | null> {
    return this.documents.get(docId) || null;
  }
  
  /**
   * Delete document
   * 
   * @param docId Document ID
   */
  async deleteDocument(docId: string): Promise<void> {
    this.documents.delete(docId);
    this.emit('document:deleted', { docId });
  }
  
  /**
   * List documents
   * 
   * @returns Array of document IDs
   */
  async listDocuments(): Promise<string[]> {
    return Array.from(this.documents.keys());
  }
  
  /**
   * Save metadata
   * 
   * @param docId Document ID
   * @param metadata Metadata
   */
  async saveMetadata(docId: string, metadata: any): Promise<void> {
    this.metadata.set(docId, metadata);
    this.emit('metadata:saved', { docId });
  }
  
  /**
   * Load metadata
   * 
   * @param docId Document ID
   * @returns Metadata
   */
  async loadMetadata(docId: string): Promise<any | null> {
    return this.metadata.get(docId) || null;
  }
  
  /**
   * Delete metadata
   * 
   * @param docId Document ID
   */
  async deleteMetadata(docId: string): Promise<void> {
    this.metadata.delete(docId);
    this.emit('metadata:deleted', { docId });
  }
  
  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.documents.clear();
    this.metadata.clear();
    this.emit('storage:cleared');
  }
}
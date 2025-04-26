/**
 * Storage Manager
 * 
 * Provides storage capabilities for offline data:
 * - Document persistence
 * - Asset storage
 * - Configuration storage
 * - Sync queue management
 */

import { EventEmitter } from 'events';

/**
 * Sync queue item status
 */
export type SyncQueueItemStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Sync queue item
 */
export interface SyncQueueItem {
  id: string;
  docId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  status: SyncQueueItemStatus;
  retries: number;
  error?: string;
}

/**
 * Storage Manager interface
 */
export interface StorageManager {
  /**
   * Initialize storage
   */
  initialize(): Promise<void>;
  
  /**
   * Store a document
   */
  storeDocument(docId: string, data: any, metadata?: any): Promise<void>;
  
  /**
   * Load a document
   */
  loadDocument(docId: string): Promise<any | null>;
  
  /**
   * Load document metadata
   */
  loadDocumentMetadata(docId: string): Promise<any | null>;
  
  /**
   * Update document metadata
   */
  updateDocumentMetadata(docId: string, metadata: any): Promise<void>;
  
  /**
   * Delete a document
   */
  deleteDocument(docId: string): Promise<boolean>;
  
  /**
   * Check if a document exists
   */
  hasDocument(docId: string): Promise<boolean>;
  
  /**
   * List all documents
   */
  listDocuments(): Promise<string[]>;
  
  /**
   * Store an asset
   */
  storeAsset(assetId: string, data: Blob | ArrayBuffer, metadata?: any): Promise<void>;
  
  /**
   * Load an asset
   */
  loadAsset(assetId: string): Promise<Blob | ArrayBuffer | null>;
  
  /**
   * Delete an asset
   */
  deleteAsset(assetId: string): Promise<boolean>;
  
  /**
   * Store configuration
   */
  storeConfig<T>(key: string, data: T): Promise<void>;
  
  /**
   * Load configuration
   */
  loadConfig<T>(key: string, defaultValue?: T): Promise<T>;
  
  /**
   * Delete configuration
   */
  deleteConfig(key: string): Promise<boolean>;
  
  /**
   * Add item to sync queue
   */
  addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'status' | 'retries'>): Promise<string>;
  
  /**
   * Get sync queue items
   */
  getSyncQueueItems(status?: SyncQueueItemStatus): Promise<SyncQueueItem[]>;
  
  /**
   * Get pending sync items
   */
  getPendingSyncItems(): Promise<SyncQueueItem[]>;
  
  /**
   * Update a sync queue item
   */
  updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void>;
  
  /**
   * Remove a sync queue item
   */
  removeSyncQueueItem(id: string): Promise<boolean>;
  
  /**
   * Clear all sync queue items
   */
  clearSyncQueue(status?: SyncQueueItemStatus): Promise<void>;
}

/**
 * Storage Manager implementation using IndexedDB
 */
export class IndexedDBStorageManager extends EventEmitter implements StorageManager {
  private dbName: string;
  private db: IDBDatabase | null = null;
  
  constructor(dbName: string = 'terrafusion-offline-storage') {
    super();
    this.dbName = dbName;
  }
  
  /**
   * Initialize storage
   */
  public async initialize(): Promise<void> {
    if (this.db) {
      return;
    }
    
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = (event) => {
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('configs')) {
          db.createObjectStore('configs', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('docId', 'docId', { unique: false });
        }
      };
    });
  }
  
  /**
   * Store a document
   */
  public async storeDocument(docId: string, data: any, metadata?: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['documents', 'metadata'], 'readwrite');
      
      transaction.onerror = (event) => {
        reject(new Error('Transaction failed'));
      };
      
      // Store document
      const documentStore = transaction.objectStore('documents');
      const documentRequest = documentStore.put({
        id: docId,
        data,
        timestamp: new Date()
      });
      
      documentRequest.onerror = (event) => {
        reject(new Error('Failed to store document'));
      };
      
      // Store metadata if provided
      if (metadata) {
        const metadataStore = transaction.objectStore('metadata');
        const metadataRequest = metadataStore.put({
          id: docId,
          ...metadata,
          timestamp: new Date()
        });
        
        metadataRequest.onerror = (event) => {
          reject(new Error('Failed to store metadata'));
        };
      }
      
      transaction.oncomplete = (event) => {
        this.emit('document:stored', { docId });
        resolve();
      };
    });
  }
  
  /**
   * Load a document
   */
  public async loadDocument(docId: string): Promise<any | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<any | null>((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.get(docId);
      
      request.onerror = (event) => {
        reject(new Error('Failed to load document'));
      };
      
      request.onsuccess = (event) => {
        const result = request.result;
        if (result) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  }
  
  /**
   * Load document metadata
   */
  public async loadDocumentMetadata(docId: string): Promise<any | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<any | null>((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(docId);
      
      request.onerror = (event) => {
        reject(new Error('Failed to load metadata'));
      };
      
      request.onsuccess = (event) => {
        const result = request.result;
        if (result) {
          const { id, timestamp, ...metadata } = result;
          resolve(metadata);
        } else {
          resolve(null);
        }
      };
    });
  }
  
  /**
   * Update document metadata
   */
  public async updateDocumentMetadata(docId: string, metadata: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // First, load existing metadata
    const existingMetadata = await this.loadDocumentMetadata(docId);
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      
      const updatedMetadata = {
        id: docId,
        ...(existingMetadata || {}),
        ...metadata,
        timestamp: new Date()
      };
      
      const request = store.put(updatedMetadata);
      
      request.onerror = (event) => {
        reject(new Error('Failed to update metadata'));
      };
      
      request.onsuccess = (event) => {
        this.emit('metadata:updated', { docId });
        resolve();
      };
    });
  }
  
  /**
   * Delete a document
   */
  public async deleteDocument(docId: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<boolean>((resolve, reject) => {
      const transaction = this.db!.transaction(['documents', 'metadata'], 'readwrite');
      
      transaction.onerror = (event) => {
        reject(new Error('Transaction failed'));
      };
      
      // Delete document
      const documentStore = transaction.objectStore('documents');
      const documentRequest = documentStore.delete(docId);
      
      documentRequest.onerror = (event) => {
        reject(new Error('Failed to delete document'));
      };
      
      // Delete metadata
      const metadataStore = transaction.objectStore('metadata');
      const metadataRequest = metadataStore.delete(docId);
      
      metadataRequest.onerror = (event) => {
        // Non-critical error, just log it
        console.error('Failed to delete metadata:', event);
      };
      
      transaction.oncomplete = (event) => {
        this.emit('document:deleted', { docId });
        resolve(true);
      };
    });
  }
  
  /**
   * Check if a document exists
   */
  public async hasDocument(docId: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<boolean>((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.get(docId);
      
      request.onerror = (event) => {
        reject(new Error('Failed to check document existence'));
      };
      
      request.onsuccess = (event) => {
        resolve(request.result !== undefined);
      };
    });
  }
  
  /**
   * List all documents
   */
  public async listDocuments(): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<string[]>((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAllKeys();
      
      request.onerror = (event) => {
        reject(new Error('Failed to list documents'));
      };
      
      request.onsuccess = (event) => {
        resolve(request.result as string[]);
      };
    });
  }
  
  /**
   * Store an asset
   */
  public async storeAsset(assetId: string, data: Blob | ArrayBuffer, metadata?: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['assets'], 'readwrite');
      const store = transaction.objectStore('assets');
      
      const asset = {
        id: assetId,
        data,
        metadata: metadata || {},
        timestamp: new Date()
      };
      
      const request = store.put(asset);
      
      request.onerror = (event) => {
        reject(new Error('Failed to store asset'));
      };
      
      request.onsuccess = (event) => {
        this.emit('asset:stored', { assetId });
        resolve();
      };
    });
  }
  
  /**
   * Load an asset
   */
  public async loadAsset(assetId: string): Promise<Blob | ArrayBuffer | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<Blob | ArrayBuffer | null>((resolve, reject) => {
      const transaction = this.db!.transaction(['assets'], 'readonly');
      const store = transaction.objectStore('assets');
      const request = store.get(assetId);
      
      request.onerror = (event) => {
        reject(new Error('Failed to load asset'));
      };
      
      request.onsuccess = (event) => {
        const result = request.result;
        if (result) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  }
  
  /**
   * Delete an asset
   */
  public async deleteAsset(assetId: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<boolean>((resolve, reject) => {
      const transaction = this.db!.transaction(['assets'], 'readwrite');
      const store = transaction.objectStore('assets');
      const request = store.delete(assetId);
      
      request.onerror = (event) => {
        reject(new Error('Failed to delete asset'));
      };
      
      request.onsuccess = (event) => {
        this.emit('asset:deleted', { assetId });
        resolve(true);
      };
    });
  }
  
  /**
   * Store configuration
   */
  public async storeConfig<T>(key: string, data: T): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['configs'], 'readwrite');
      const store = transaction.objectStore('configs');
      
      const config = {
        key,
        data,
        timestamp: new Date()
      };
      
      const request = store.put(config);
      
      request.onerror = (event) => {
        reject(new Error('Failed to store config'));
      };
      
      request.onsuccess = (event) => {
        this.emit('config:stored', { key });
        resolve();
      };
    });
  }
  
  /**
   * Load configuration
   */
  public async loadConfig<T>(key: string, defaultValue?: T): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<T>((resolve, reject) => {
      const transaction = this.db!.transaction(['configs'], 'readonly');
      const store = transaction.objectStore('configs');
      const request = store.get(key);
      
      request.onerror = (event) => {
        reject(new Error('Failed to load config'));
      };
      
      request.onsuccess = (event) => {
        const result = request.result;
        if (result) {
          resolve(result.data as T);
        } else {
          resolve(defaultValue as T);
        }
      };
    });
  }
  
  /**
   * Delete configuration
   */
  public async deleteConfig(key: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<boolean>((resolve, reject) => {
      const transaction = this.db!.transaction(['configs'], 'readwrite');
      const store = transaction.objectStore('configs');
      const request = store.delete(key);
      
      request.onerror = (event) => {
        reject(new Error('Failed to delete config'));
      };
      
      request.onsuccess = (event) => {
        this.emit('config:deleted', { key });
        resolve(true);
      };
    });
  }
  
  /**
   * Add item to sync queue
   */
  public async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'status' | 'retries'>): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<string>((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const id = `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const queueItem: SyncQueueItem = {
        id,
        ...item,
        timestamp: new Date(),
        status: 'pending',
        retries: 0
      };
      
      const request = store.add(queueItem);
      
      request.onerror = (event) => {
        reject(new Error('Failed to add item to sync queue'));
      };
      
      request.onsuccess = (event) => {
        this.emit('syncQueue:itemAdded', { id });
        resolve(id);
      };
    });
  }
  
  /**
   * Get sync queue items
   */
  public async getSyncQueueItems(status?: SyncQueueItemStatus): Promise<SyncQueueItem[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<SyncQueueItem[]>((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      
      let request: IDBRequest;
      
      if (status) {
        const index = store.index('status');
        request = index.getAll(status);
      } else {
        request = store.getAll();
      }
      
      request.onerror = (event) => {
        reject(new Error('Failed to get sync queue items'));
      };
      
      request.onsuccess = (event) => {
        resolve(request.result as SyncQueueItem[]);
      };
    });
  }
  
  /**
   * Get pending sync items
   */
  public async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    return this.getSyncQueueItems('pending');
  }
  
  /**
   * Update a sync queue item
   */
  public async updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // First, get the existing item
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const getRequest = store.get(id);
      
      getRequest.onerror = (event) => {
        reject(new Error('Failed to get sync queue item'));
      };
      
      getRequest.onsuccess = (event) => {
        const existingItem = getRequest.result as SyncQueueItem;
        
        if (!existingItem) {
          reject(new Error('Sync queue item not found'));
          return;
        }
        
        // Update the item
        const updatedItem: SyncQueueItem = {
          ...existingItem,
          ...updates
        };
        
        const putRequest = store.put(updatedItem);
        
        putRequest.onerror = (event) => {
          reject(new Error('Failed to update sync queue item'));
        };
        
        putRequest.onsuccess = (event) => {
          this.emit('syncQueue:itemUpdated', { id });
          resolve();
        };
      };
    });
  }
  
  /**
   * Remove a sync queue item
   */
  public async removeSyncQueueItem(id: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise<boolean>((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);
      
      request.onerror = (event) => {
        reject(new Error('Failed to remove sync queue item'));
      };
      
      request.onsuccess = (event) => {
        this.emit('syncQueue:itemRemoved', { id });
        resolve(true);
      };
    });
  }
  
  /**
   * Clear all sync queue items
   */
  public async clearSyncQueue(status?: SyncQueueItemStatus): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    if (status) {
      // Get items with the specified status
      const items = await this.getSyncQueueItems(status);
      
      // Delete each item
      for (const item of items) {
        await this.removeSyncQueueItem(item.id);
      }
    } else {
      // Clear the entire store
      return new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        const request = store.clear();
        
        request.onerror = (event) => {
          reject(new Error('Failed to clear sync queue'));
        };
        
        request.onsuccess = (event) => {
          this.emit('syncQueue:cleared');
          resolve();
        };
      });
    }
  }
}

/**
 * Create a storage manager
 */
export async function createStorageManager(
  options: { dbName?: string } = {}
): Promise<StorageManager> {
  const { dbName = 'terrafusion-offline-storage' } = options;
  
  const storage = new IndexedDBStorageManager(dbName);
  await storage.initialize();
  
  return storage;
}
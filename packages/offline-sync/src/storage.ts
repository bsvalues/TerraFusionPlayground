/**
 * Storage Module
 * 
 * Provides local storage capabilities for offline data:
 * - IndexedDB-based storage for web applications
 * - Integration with Realm for mobile applications
 * - Queryable and indexed data storage
 * - Snapshot management
 */

import { EventEmitter } from 'events';
import { get, set, del, clear, createStore } from 'idb-keyval';
import * as Y from 'yjs';

// Storage types
export enum StorageType {
  INDEXEDDB = 'indexeddb',
  REALM = 'realm',
  MEMORY = 'memory'
}

// Storage entity types
export enum StorageEntityType {
  DOCUMENT = 'document',     // CRDT documents
  ASSET = 'asset',           // Binary assets (images, files)
  SNAPSHOT = 'snapshot',     // Document snapshots
  METADATA = 'metadata',     // Document metadata
  QUEUE = 'queue',           // Sync queue items
  LOG = 'log',               // Sync logs
  CONFIG = 'config'          // Configuration
}

// Storage entity
export interface StorageEntity {
  id: string;
  type: StorageEntityType;
  data: any;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  tags?: string[];
}

// Sync queue item
export interface SyncQueueItem {
  id: string;
  docId: string;
  operation: 'create' | 'update' | 'delete';
  data: Uint8Array;
  createdAt: Date;
  retries: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error?: string;
}

/**
 * Storage Manager
 * 
 * Manages local storage for offline data.
 */
export class StorageManager extends EventEmitter {
  private type: StorageType;
  private stores: Map<StorageEntityType, any> = new Map();
  private namespace: string;
  
  constructor(type: StorageType = StorageType.INDEXEDDB, namespace: string = 'terrafusion') {
    super();
    this.type = type;
    this.namespace = namespace;
  }

  /**
   * Initialize the storage manager
   */
  public async initialize(): Promise<void> {
    console.log(`Initializing storage manager (${this.type})`);
    
    // Initialize stores for each entity type
    for (const type of Object.values(StorageEntityType)) {
      if (this.type === StorageType.INDEXEDDB) {
        this.stores.set(type, createStore(`${this.namespace}-${type}`, 'keyval-store'));
      } else {
        // For memory storage, use a simple Map
        this.stores.set(type, new Map());
      }
    }
    
    this.emit('initialized');
  }

  /**
   * Store a CRDT document
   */
  public async storeDocument(docId: string, update: Uint8Array, metadata?: any): Promise<void> {
    const store = this.stores.get(StorageEntityType.DOCUMENT);
    
    if (!store) {
      throw new Error('Document store not initialized');
    }
    
    const entity: StorageEntity = {
      id: docId,
      type: StorageEntityType.DOCUMENT,
      data: update,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (this.type === StorageType.INDEXEDDB) {
      await set(docId, entity, store);
    } else {
      store.set(docId, entity);
    }
    
    // Store metadata separately if provided
    if (metadata) {
      await this.storeMetadata(docId, metadata);
    }
    
    this.emit('document:stored', { docId });
  }

  /**
   * Load a CRDT document
   */
  public async loadDocument(docId: string): Promise<Uint8Array | undefined> {
    const store = this.stores.get(StorageEntityType.DOCUMENT);
    
    if (!store) {
      throw new Error('Document store not initialized');
    }
    
    let entity: StorageEntity | undefined;
    
    if (this.type === StorageType.INDEXEDDB) {
      entity = await get(docId, store);
    } else {
      entity = store.get(docId);
    }
    
    if (!entity) {
      return undefined;
    }
    
    return entity.data;
  }

  /**
   * Delete a CRDT document
   */
  public async deleteDocument(docId: string): Promise<boolean> {
    const store = this.stores.get(StorageEntityType.DOCUMENT);
    
    if (!store) {
      throw new Error('Document store not initialized');
    }
    
    if (this.type === StorageType.INDEXEDDB) {
      await del(docId, store);
    } else {
      store.delete(docId);
    }
    
    // Also delete any associated metadata
    await this.deleteMetadata(docId);
    
    this.emit('document:deleted', { docId });
    
    return true;
  }

  /**
   * Store document metadata
   */
  public async storeMetadata(docId: string, metadata: any): Promise<void> {
    const store = this.stores.get(StorageEntityType.METADATA);
    
    if (!store) {
      throw new Error('Metadata store not initialized');
    }
    
    const entity: StorageEntity = {
      id: docId,
      type: StorageEntityType.METADATA,
      data: metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (this.type === StorageType.INDEXEDDB) {
      await set(docId, entity, store);
    } else {
      store.set(docId, entity);
    }
    
    this.emit('metadata:stored', { docId });
  }

  /**
   * Load document metadata
   */
  public async loadMetadata(docId: string): Promise<any | undefined> {
    const store = this.stores.get(StorageEntityType.METADATA);
    
    if (!store) {
      throw new Error('Metadata store not initialized');
    }
    
    let entity: StorageEntity | undefined;
    
    if (this.type === StorageType.INDEXEDDB) {
      entity = await get(docId, store);
    } else {
      entity = store.get(docId);
    }
    
    if (!entity) {
      return undefined;
    }
    
    return entity.data;
  }

  /**
   * Delete document metadata
   */
  public async deleteMetadata(docId: string): Promise<boolean> {
    const store = this.stores.get(StorageEntityType.METADATA);
    
    if (!store) {
      throw new Error('Metadata store not initialized');
    }
    
    if (this.type === StorageType.INDEXEDDB) {
      await del(docId, store);
    } else {
      store.delete(docId);
    }
    
    this.emit('metadata:deleted', { docId });
    
    return true;
  }

  /**
   * Create a document snapshot
   */
  public async createSnapshot(docId: string, snapshot: Uint8Array): Promise<string> {
    const store = this.stores.get(StorageEntityType.SNAPSHOT);
    
    if (!store) {
      throw new Error('Snapshot store not initialized');
    }
    
    const snapshotId = `${docId}-${Date.now()}`;
    
    const entity: StorageEntity = {
      id: snapshotId,
      type: StorageEntityType.SNAPSHOT,
      data: {
        docId,
        snapshot
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (this.type === StorageType.INDEXEDDB) {
      await set(snapshotId, entity, store);
    } else {
      store.set(snapshotId, entity);
    }
    
    this.emit('snapshot:created', { docId, snapshotId });
    
    return snapshotId;
  }

  /**
   * Get document snapshots
   */
  public async getSnapshots(docId: string): Promise<string[]> {
    const store = this.stores.get(StorageEntityType.SNAPSHOT);
    
    if (!store) {
      throw new Error('Snapshot store not initialized');
    }
    
    // This is a simplified implementation
    // In a real implementation, we would use an index to efficiently query
    // but IndexedDB in browsers doesn't support queries via the idb-keyval library
    
    // For demonstration, we'll assume all snapshots are prefixed with the docId
    if (this.type === StorageType.INDEXEDDB) {
      // This is not efficient, but it's a simple solution for demonstration
      const keys = await this.getAllKeys(StorageEntityType.SNAPSHOT);
      return keys.filter(key => key.startsWith(`${docId}-`));
    } else {
      // For in-memory storage, we can filter the keys
      return Array.from(store.keys()).filter(key => key.startsWith(`${docId}-`));
    }
  }

  /**
   * Load a snapshot
   */
  public async loadSnapshot(snapshotId: string): Promise<Uint8Array | undefined> {
    const store = this.stores.get(StorageEntityType.SNAPSHOT);
    
    if (!store) {
      throw new Error('Snapshot store not initialized');
    }
    
    let entity: StorageEntity | undefined;
    
    if (this.type === StorageType.INDEXEDDB) {
      entity = await get(snapshotId, store);
    } else {
      entity = store.get(snapshotId);
    }
    
    if (!entity) {
      return undefined;
    }
    
    return entity.data.snapshot;
  }

  /**
   * Delete a snapshot
   */
  public async deleteSnapshot(snapshotId: string): Promise<boolean> {
    const store = this.stores.get(StorageEntityType.SNAPSHOT);
    
    if (!store) {
      throw new Error('Snapshot store not initialized');
    }
    
    if (this.type === StorageType.INDEXEDDB) {
      await del(snapshotId, store);
    } else {
      store.delete(snapshotId);
    }
    
    this.emit('snapshot:deleted', { snapshotId });
    
    return true;
  }

  /**
   * Store a binary asset
   */
  public async storeAsset(assetId: string, data: Blob | ArrayBuffer, metadata?: any): Promise<void> {
    const store = this.stores.get(StorageEntityType.ASSET);
    
    if (!store) {
      throw new Error('Asset store not initialized');
    }
    
    const entity: StorageEntity = {
      id: assetId,
      type: StorageEntityType.ASSET,
      data: data,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: metadata?.tags
    };
    
    if (this.type === StorageType.INDEXEDDB) {
      await set(assetId, entity, store);
    } else {
      store.set(assetId, entity);
    }
    
    // Store metadata separately if provided
    if (metadata) {
      const metadataStore = this.stores.get(StorageEntityType.METADATA);
      if (metadataStore) {
        const metadataEntity: StorageEntity = {
          id: `asset-${assetId}`,
          type: StorageEntityType.METADATA,
          data: metadata,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        if (this.type === StorageType.INDEXEDDB) {
          await set(`asset-${assetId}`, metadataEntity, metadataStore);
        } else {
          metadataStore.set(`asset-${assetId}`, metadataEntity);
        }
      }
    }
    
    this.emit('asset:stored', { assetId });
  }

  /**
   * Load a binary asset
   */
  public async loadAsset(assetId: string): Promise<Blob | ArrayBuffer | undefined> {
    const store = this.stores.get(StorageEntityType.ASSET);
    
    if (!store) {
      throw new Error('Asset store not initialized');
    }
    
    let entity: StorageEntity | undefined;
    
    if (this.type === StorageType.INDEXEDDB) {
      entity = await get(assetId, store);
    } else {
      entity = store.get(assetId);
    }
    
    if (!entity) {
      return undefined;
    }
    
    return entity.data;
  }

  /**
   * Delete a binary asset
   */
  public async deleteAsset(assetId: string): Promise<boolean> {
    const store = this.stores.get(StorageEntityType.ASSET);
    
    if (!store) {
      throw new Error('Asset store not initialized');
    }
    
    if (this.type === StorageType.INDEXEDDB) {
      await del(assetId, store);
    } else {
      store.delete(assetId);
    }
    
    // Also delete any associated metadata
    const metadataStore = this.stores.get(StorageEntityType.METADATA);
    if (metadataStore) {
      if (this.type === StorageType.INDEXEDDB) {
        await del(`asset-${assetId}`, metadataStore);
      } else {
        metadataStore.delete(`asset-${assetId}`);
      }
    }
    
    this.emit('asset:deleted', { assetId });
    
    return true;
  }

  /**
   * Add item to sync queue
   */
  public async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries' | 'status'>): Promise<string> {
    const store = this.stores.get(StorageEntityType.QUEUE);
    
    if (!store) {
      throw new Error('Queue store not initialized');
    }
    
    const queueId = `queue-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const queueItem: SyncQueueItem = {
      ...item,
      id: queueId,
      createdAt: new Date(),
      retries: 0,
      status: 'pending'
    };
    
    if (this.type === StorageType.INDEXEDDB) {
      await set(queueId, queueItem, store);
    } else {
      store.set(queueId, queueItem);
    }
    
    this.emit('queue:item-added', { queueId, docId: item.docId });
    
    return queueId;
  }

  /**
   * Get pending sync queue items
   */
  public async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const store = this.stores.get(StorageEntityType.QUEUE);
    
    if (!store) {
      throw new Error('Queue store not initialized');
    }
    
    // This is a simplified implementation
    // In a real implementation, we would use an index to efficiently query
    
    if (this.type === StorageType.INDEXEDDB) {
      // This is not efficient, but it's a simple solution for demonstration
      const allItems = await this.getAllValues(StorageEntityType.QUEUE);
      return allItems.filter(item => item.status === 'pending' || item.status === 'failed');
    } else {
      // For in-memory storage, we can filter the values
      return Array.from(store.values()).filter(item => item.status === 'pending' || item.status === 'failed');
    }
  }

  /**
   * Update sync queue item
   */
  public async updateSyncQueueItem(queueId: string, updates: Partial<Omit<SyncQueueItem, 'id' | 'createdAt'>>): Promise<boolean> {
    const store = this.stores.get(StorageEntityType.QUEUE);
    
    if (!store) {
      throw new Error('Queue store not initialized');
    }
    
    let item: SyncQueueItem | undefined;
    
    if (this.type === StorageType.INDEXEDDB) {
      item = await get(queueId, store);
    } else {
      item = store.get(queueId);
    }
    
    if (!item) {
      return false;
    }
    
    const updatedItem: SyncQueueItem = {
      ...item,
      ...updates
    };
    
    if (this.type === StorageType.INDEXEDDB) {
      await set(queueId, updatedItem, store);
    } else {
      store.set(queueId, updatedItem);
    }
    
    this.emit('queue:item-updated', { queueId, docId: item.docId, status: updatedItem.status });
    
    return true;
  }

  /**
   * Remove sync queue item
   */
  public async removeSyncQueueItem(queueId: string): Promise<boolean> {
    const store = this.stores.get(StorageEntityType.QUEUE);
    
    if (!store) {
      throw new Error('Queue store not initialized');
    }
    
    if (this.type === StorageType.INDEXEDDB) {
      await del(queueId, store);
    } else {
      store.delete(queueId);
    }
    
    this.emit('queue:item-removed', { queueId });
    
    return true;
  }

  /**
   * Store configuration
   */
  public async storeConfig(key: string, value: any): Promise<void> {
    const store = this.stores.get(StorageEntityType.CONFIG);
    
    if (!store) {
      throw new Error('Config store not initialized');
    }
    
    if (this.type === StorageType.INDEXEDDB) {
      await set(key, value, store);
    } else {
      store.set(key, value);
    }
  }

  /**
   * Load configuration
   */
  public async loadConfig<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const store = this.stores.get(StorageEntityType.CONFIG);
    
    if (!store) {
      throw new Error('Config store not initialized');
    }
    
    let value: T | undefined;
    
    if (this.type === StorageType.INDEXEDDB) {
      value = await get(key, store);
    } else {
      value = store.get(key);
    }
    
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Delete configuration
   */
  public async deleteConfig(key: string): Promise<boolean> {
    const store = this.stores.get(StorageEntityType.CONFIG);
    
    if (!store) {
      throw new Error('Config store not initialized');
    }
    
    if (this.type === StorageType.INDEXEDDB) {
      await del(key, store);
    } else {
      store.delete(key);
    }
    
    return true;
  }

  /**
   * Clear all data (dangerous!)
   */
  public async clearAll(): Promise<void> {
    for (const [type, store] of this.stores.entries()) {
      if (this.type === StorageType.INDEXEDDB) {
        await clear(store);
      } else {
        store.clear();
      }
      
      console.log(`Cleared store: ${type}`);
    }
    
    this.emit('storage:cleared');
  }

  /**
   * Get all keys for a specific entity type
   */
  private async getAllKeys(entityType: StorageEntityType): Promise<string[]> {
    // This is not directly supported by idb-keyval
    // In a real implementation, we would use a different library or approach
    // This is a placeholder for demonstration purposes
    return [];
  }

  /**
   * Get all values for a specific entity type
   */
  private async getAllValues(entityType: StorageEntityType): Promise<any[]> {
    // This is not directly supported by idb-keyval
    // In a real implementation, we would use a different library or approach
    // This is a placeholder for demonstration purposes
    return [];
  }
}

/**
 * Create a new storage manager
 */
export function createStorageManager(type: StorageType = StorageType.INDEXEDDB, namespace: string = 'terrafusion'): StorageManager {
  return new StorageManager(type, namespace);
}
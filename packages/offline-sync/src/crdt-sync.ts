/**
 * CRDT Document Manager
 * 
 * Manages CRDT-based document synchronization using Yjs.
 */

import { EventEmitter } from 'events';
import * as Y from 'yjs';
import { LocalStorageProvider } from './storage';
import { generateId, deepEqual } from './utils';

/**
 * Sync status enum
 */
export enum SyncStatus {
  /** Document is synced */
  SYNCED = 'synced',
  /** Document is currently syncing */
  SYNCING = 'syncing',
  /** Document has local changes that need to be synced */
  UNSYNCED = 'unsynced',
  /** Syncing failed */
  FAILED = 'failed',
  /** Document has conflicts */
  CONFLICT = 'conflict'
}

/**
 * Document metadata interface
 */
export interface DocumentMetadata {
  /** Document ID */
  id: string;
  /** Document type */
  type: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  modifiedAt: number;
  /** Last synced timestamp */
  lastSynced?: number;
  /** User ID of last modifier */
  lastModifiedBy?: string;
  /** Sync status */
  syncStatus: SyncStatus;
  /** Version */
  version: number;
  /** Custom metadata */
  [key: string]: any;
}

/**
 * Document update options
 */
export interface UpdateOptions {
  /** User ID */
  userId?: string;
  /** Update metadata */
  updateMetadata?: boolean;
  /** Origin identifier */
  origin?: any;
}

/**
 * CRDT Document Manager
 */
export class CRDTDocumentManager extends EventEmitter {
  private storageProvider: LocalStorageProvider;
  private docs: Map<string, Y.Doc> = new Map();
  private metadataCache: Map<string, DocumentMetadata> = new Map();
  
  /**
   * Initialize a new CRDT document manager
   * 
   * @param storageProvider Storage provider
   */
  constructor(storageProvider: LocalStorageProvider) {
    super();
    this.storageProvider = storageProvider;
  }
  
  /**
   * Initialize the document manager
   */
  async initialize(): Promise<void> {
    // Load metadata for all documents
    const docIds = await this.storageProvider.listDocuments();
    
    for (const docId of docIds) {
      const metadata = await this.storageProvider.loadMetadata(docId);
      
      if (metadata) {
        this.metadataCache.set(docId, metadata);
      }
    }
    
    this.emit('initialized');
  }
  
  /**
   * Create a new document
   * 
   * @param docId Document ID
   * @param initialData Initial data
   * @param type Document type
   * @param options Create options
   * @returns New document
   */
  async createDocument(
    docId: string,
    initialData?: any,
    type: string = 'default',
    options: UpdateOptions = {}
  ): Promise<Y.Doc> {
    // Check if document already exists
    if (await this.hasDocument(docId)) {
      throw new Error(`Document already exists: ${docId}`);
    }
    
    // Create new document
    const doc = new Y.Doc();
    this.docs.set(docId, doc);
    
    // Set initial data if provided
    if (initialData) {
      this.setDocumentData(doc, initialData);
    }
    
    // Save to storage
    const encodedState = Y.encodeStateAsUpdate(doc);
    await this.storageProvider.saveDocument(docId, encodedState);
    
    // Create metadata
    const metadata: DocumentMetadata = {
      id: docId,
      type,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      lastModifiedBy: options.userId,
      syncStatus: SyncStatus.UNSYNCED,
      version: 1
    };
    
    // Save metadata
    this.metadataCache.set(docId, metadata);
    await this.storageProvider.saveMetadata(docId, metadata);
    
    // Emit event
    this.emit('document:created', { docId, userId: options.userId, type });
    
    return doc;
  }
  
  /**
   * Check if document exists
   * 
   * @param docId Document ID
   * @returns Whether the document exists
   */
  async hasDocument(docId: string): Promise<boolean> {
    // Check cache first
    if (this.docs.has(docId)) {
      return true;
    }
    
    // Check storage
    return this.storageProvider.documentExists(docId);
  }
  
  /**
   * Get document
   * 
   * @param docId Document ID
   * @returns Document
   */
  async getDocument(docId: string): Promise<Y.Doc> {
    // Check cache first
    let doc = this.docs.get(docId);
    
    if (doc) {
      return doc;
    }
    
    // Check if document exists
    if (!await this.hasDocument(docId)) {
      throw new Error(`Document not found: ${docId}`);
    }
    
    // Load from storage
    const encodedState = await this.storageProvider.loadDocument(docId);
    
    if (!encodedState) {
      throw new Error(`Document data not found: ${docId}`);
    }
    
    // Create new document
    doc = new Y.Doc();
    
    // Apply stored state
    Y.applyUpdate(doc, encodedState);
    
    // Cache document
    this.docs.set(docId, doc);
    
    // Emit event
    this.emit('document:loaded', { docId });
    
    return doc;
  }
  
  /**
   * Save document
   * 
   * @param docId Document ID
   * @param options Save options
   */
  async saveDocument(
    docId: string,
    options: UpdateOptions = {}
  ): Promise<void> {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      throw new Error(`Document not loaded: ${docId}`);
    }
    
    // Get state as update
    const encodedState = Y.encodeStateAsUpdate(doc);
    
    // Save to storage
    await this.storageProvider.saveDocument(docId, encodedState);
    
    // Update metadata if needed
    if (options.updateMetadata !== false) {
      const metadata = this.metadataCache.get(docId);
      
      if (metadata) {
        metadata.modifiedAt = Date.now();
        metadata.lastModifiedBy = options.userId;
        metadata.syncStatus = SyncStatus.UNSYNCED;
        metadata.version += 1;
        
        // Save metadata
        this.metadataCache.set(docId, metadata);
        await this.storageProvider.saveMetadata(docId, metadata);
      }
    }
    
    // Emit event
    this.emit('document:saved', { docId, userId: options.userId });
  }
  
  /**
   * Delete document
   * 
   * @param docId Document ID
   * @param options Delete options
   */
  async deleteDocument(
    docId: string,
    options: UpdateOptions = {}
  ): Promise<void> {
    // Delete from storage
    await this.storageProvider.deleteDocument(docId);
    await this.storageProvider.deleteMetadata(docId);
    
    // Delete from cache
    this.docs.delete(docId);
    this.metadataCache.delete(docId);
    
    // Emit event
    this.emit('document:deleted', { docId, userId: options.userId });
  }
  
  /**
   * Get document metadata
   * 
   * @param docId Document ID
   * @returns Document metadata
   */
  getDocumentMetadata(docId: string): DocumentMetadata | null {
    return this.metadataCache.get(docId) || null;
  }
  
  /**
   * Update document metadata
   * 
   * @param docId Document ID
   * @param metadata Document metadata
   */
  async updateDocumentMetadata(
    docId: string,
    metadata: DocumentMetadata
  ): Promise<void> {
    // Update metadata cache
    this.metadataCache.set(docId, metadata);
    
    // Save to storage
    await this.storageProvider.saveMetadata(docId, metadata);
    
    // Emit event
    this.emit('metadata:updated', { docId, metadata });
  }
  
  /**
   * Get all document IDs
   * 
   * @returns Array of document IDs
   */
  async getAllDocumentIds(): Promise<string[]> {
    return this.storageProvider.listDocuments();
  }
  
  /**
   * Get all document metadata
   * 
   * @returns Array of document metadata
   */
  async getAllDocumentMetadata(): Promise<DocumentMetadata[]> {
    const docIds = await this.getAllDocumentIds();
    const metadataList: DocumentMetadata[] = [];
    
    for (const docId of docIds) {
      const metadata = this.metadataCache.get(docId);
      
      if (metadata) {
        metadataList.push(metadata);
      } else {
        const loadedMetadata = await this.storageProvider.loadMetadata(docId);
        
        if (loadedMetadata) {
          this.metadataCache.set(docId, loadedMetadata);
          metadataList.push(loadedMetadata);
        }
      }
    }
    
    return metadataList;
  }
  
  /**
   * Apply updates to a document
   * 
   * @param docId Document ID
   * @param update Updates to apply
   * @param options Apply options
   */
  async applyUpdates(
    docId: string,
    update: Uint8Array,
    options: UpdateOptions = {}
  ): Promise<void> {
    let doc = this.docs.get(docId);
    
    if (!doc) {
      // Load document if not in cache
      doc = await this.getDocument(docId);
    }
    
    // Apply update
    Y.applyUpdate(doc, update, options.origin);
    
    // Save document
    await this.saveDocument(docId, options);
    
    // Emit event
    this.emit('document:updated', { docId, userId: options.userId });
  }
  
  /**
   * Get updates since a given state
   * 
   * @param docId Document ID
   * @param stateVector State vector to compare against
   * @returns Updates
   */
  async getUpdatesSince(
    docId: string,
    stateVector?: Uint8Array
  ): Promise<Uint8Array> {
    const doc = await this.getDocument(docId);
    
    if (stateVector) {
      return Y.encodeStateAsUpdate(doc, stateVector);
    } else {
      return Y.encodeStateAsUpdate(doc);
    }
  }
  
  /**
   * Get all updates for a document
   * 
   * @param docId Document ID
   * @returns Updates
   */
  getUpdates(docId: string): Uint8Array | null {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return null;
    }
    
    return Y.encodeStateAsUpdate(doc);
  }
  
  /**
   * Get document state vector
   * 
   * @param docId Document ID
   * @returns State vector
   */
  getStateVector(docId: string): Uint8Array | null {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return null;
    }
    
    return Y.encodeStateVector(doc);
  }
  
  /**
   * Get document data
   * 
   * @param docId Document ID
   * @returns Document data
   */
  async getDocumentData(docId: string): Promise<any> {
    const doc = await this.getDocument(docId);
    return this.extractDocumentData(doc);
  }
  
  /**
   * Set document data
   * 
   * @param docOrId Document or document ID
   * @param data Data to set
   * @param options Set options
   */
  async setDocumentData(
    docOrId: Y.Doc | string,
    data: any,
    options: UpdateOptions = {}
  ): Promise<void> {
    // Get document
    const doc = typeof docOrId === 'string' 
      ? await this.getDocument(docOrId)
      : docOrId;
    
    const docId = typeof docOrId === 'string'
      ? docOrId
      : doc.guid;
    
    // Start transaction
    doc.transact(() => {
      // Get root map
      const rootMap = doc.getMap('data');
      
      // Clear existing data
      rootMap.clear();
      
      // Set new data
      if (data) {
        // For objects, set each property individually
        if (typeof data === 'object' && !Array.isArray(data)) {
          for (const [key, value] of Object.entries(data)) {
            this.setValueInDoc(rootMap, key, value);
          }
        } else {
          // For non-objects, set the value directly
          this.setValueInDoc(rootMap, 'value', data);
        }
      }
    }, options.origin);
    
    // Save document if needed
    if (typeof docOrId === 'string') {
      await this.saveDocument(docId, options);
    }
    
    // Emit event
    this.emit('data:updated', { docId, userId: options.userId });
  }
  
  /**
   * Set a value in a document map
   * 
   * @param map Map to set value in
   * @param key Key to set
   * @param value Value to set
   */
  private setValueInDoc(map: Y.Map<any>, key: string, value: any): void {
    if (value === undefined || value === null) {
      // Delete undefined/null values
      map.delete(key);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // For objects, create a nested map
      const nestedMap = new Y.Map();
      map.set(key, nestedMap);
      
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        this.setValueInDoc(nestedMap, nestedKey, nestedValue);
      }
    } else if (Array.isArray(value)) {
      // For arrays, create a Y.Array
      const yarray = new Y.Array();
      map.set(key, yarray);
      
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          const itemMap = new Y.Map();
          
          for (const [itemKey, itemValue] of Object.entries(item)) {
            this.setValueInDoc(itemMap, itemKey, itemValue);
          }
          
          yarray.push([itemMap]);
        } else {
          yarray.push([item]);
        }
      }
    } else {
      // For primitives, set directly
      map.set(key, value);
    }
  }
  
  /**
   * Extract data from a document
   * 
   * @param doc Document
   * @returns Document data
   */
  private extractDocumentData(doc: Y.Doc): any {
    const rootMap = doc.getMap('data');
    return this.extractValueFromDoc(rootMap);
  }
  
  /**
   * Extract a value from a document map or array
   * 
   * @param value Y.js value
   * @returns Extracted value
   */
  private extractValueFromDoc(value: any): any {
    if (value instanceof Y.Map) {
      // Extract object from map
      const result: Record<string, any> = {};
      
      for (const [key, val] of value.entries()) {
        result[key] = this.extractValueFromDoc(val);
      }
      
      return result;
    } else if (value instanceof Y.Array) {
      // Extract array
      const result: any[] = [];
      
      for (let i = 0; i < value.length; i++) {
        result.push(this.extractValueFromDoc(value.get(i)));
      }
      
      return result;
    } else {
      // Return primitive value as is
      return value;
    }
  }
  
  /**
   * Compare two document states
   * 
   * @param docId Document ID
   * @param remoteData Remote data to compare with
   * @returns Whether the data is equal
   */
  async compareDocumentData(
    docId: string,
    remoteData: any
  ): Promise<boolean> {
    const localData = await this.getDocumentData(docId);
    return deepEqual(localData, remoteData);
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.docs.clear();
    this.emit('cache:cleared');
  }
  
  /**
   * Observe document changes
   * 
   * @param docId Document ID
   * @param callback Callback to call on changes
   * @returns Unsubscribe function
   */
  async observeDocument(
    docId: string,
    callback: (update: Uint8Array, origin: any) => void
  ): Promise<() => void> {
    const doc = await this.getDocument(docId);
    
    // Set up observer
    const observer = (update: Uint8Array, origin: any) => {
      callback(update, origin);
    };
    
    doc.on('update', observer);
    
    // Return unsubscribe function
    return () => {
      doc.off('update', observer);
    };
  }
}

export default CRDTDocumentManager;
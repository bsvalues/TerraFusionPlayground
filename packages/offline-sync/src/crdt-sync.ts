/**
 * CRDT Document Manager
 * 
 * Provides CRDT-based document management:
 * - Document creation and loading
 * - Change tracking
 * - Conflict-free merging
 * - Awareness for collaboration
 */

import { EventEmitter } from 'events';
import * as Y from 'yjs';
import { StorageManager } from './storage';

/**
 * Sync status enum
 */
export enum SyncStatus {
  UNSYNCED = 'unsynced',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  ERROR = 'error'
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  author?: string;
  [key: string]: any;
}

/**
 * CRDT Document Manager interface
 */
export interface CRDTDocumentManager {
  /**
   * Initialize the CRDT document manager
   */
  initialize(): Promise<void>;
  
  /**
   * Create a new document
   */
  createDocument(docId: string, initialData?: any, metadata?: Partial<DocumentMetadata>): Promise<Y.Doc>;
  
  /**
   * Load a document
   */
  getDocument(docId: string): any;
  
  /**
   * Check if a document exists
   */
  hasDocument(docId: string): Promise<boolean>;
  
  /**
   * Save a document
   */
  saveDocument(docId: string): Promise<void>;
  
  /**
   * Delete a document
   */
  deleteDocument(docId: string): Promise<boolean>;
  
  /**
   * Get all document IDs
   */
  getAllDocumentIds(): string[];
  
  /**
   * Get document metadata
   */
  getDocumentMetadata(docId: string): DocumentMetadata | null;
  
  /**
   * Update document metadata
   */
  updateDocumentMetadata(docId: string, metadata: Partial<DocumentMetadata>): Promise<void>;
  
  /**
   * Get document updates
   */
  getUpdates(docId: string): Uint8Array | null;
  
  /**
   * Apply updates to a document
   */
  applyUpdates(docId: string, updates: Uint8Array): void;
  
  /**
   * Get document awareness
   */
  getAwareness(docId: string): any;
  
  /**
   * Get document state vector
   */
  getStateVector(docId: string): Uint8Array | null;
  
  /**
   * Get missing updates for a document given a state vector
   */
  getMissingUpdates(docId: string, stateVector: Uint8Array): Uint8Array | null;
  
  /**
   * Register a change listener
   */
  on(event: string, listener: (...args: any[]) => void): this;
  
  /**
   * Remove a change listener
   */
  off(event: string, listener: (...args: any[]) => void): this;
}

/**
 * CRDT Document Manager implementation using Yjs
 */
export class YjsDocumentManager extends EventEmitter implements CRDTDocumentManager {
  private storage: StorageManager;
  private docs: Map<string, Y.Doc> = new Map();
  private metadata: Map<string, DocumentMetadata> = new Map();
  private awareness: Map<string, any> = new Map();
  
  constructor(storage: StorageManager) {
    super();
    this.storage = storage;
  }
  
  /**
   * Initialize the CRDT document manager
   */
  public async initialize(): Promise<void> {
    console.log('Initializing CRDT document manager');
    
    // Load documents from storage
    await this.loadDocuments();
    
    this.emit('initialized');
  }
  
  /**
   * Load documents from storage
   */
  private async loadDocuments(): Promise<void> {
    // Get all document IDs
    const docIds = await this.storage.listDocuments();
    
    for (const docId of docIds) {
      try {
        // Load document data
        const data = await this.storage.loadDocument(docId);
        
        if (data) {
          // Create Yjs document
          const doc = new Y.Doc();
          this.docs.set(docId, doc);
          
          // Load document metadata
          const metadata = await this.storage.loadDocumentMetadata(docId);
          
          if (metadata) {
            this.metadata.set(docId, metadata as DocumentMetadata);
          } else {
            // Create default metadata
            const defaultMetadata: DocumentMetadata = {
              syncStatus: SyncStatus.UNSYNCED,
              createdAt: new Date(),
              updatedAt: new Date(),
              version: 1
            };
            
            this.metadata.set(docId, defaultMetadata);
            await this.storage.updateDocumentMetadata(docId, defaultMetadata);
          }
        }
      } catch (error) {
        console.error(`Error loading document ${docId}:`, error);
      }
    }
  }
  
  /**
   * Create a new document
   */
  public async createDocument(
    docId: string, 
    initialData?: any, 
    metadata?: Partial<DocumentMetadata>
  ): Promise<Y.Doc> {
    // Check if document already exists
    if (this.docs.has(docId)) {
      throw new Error(`Document ${docId} already exists`);
    }
    
    // Create new Yjs document
    const doc = new Y.Doc();
    this.docs.set(docId, doc);
    
    // Initialize with data if provided
    if (initialData) {
      const rootMap = doc.getMap();
      
      // Set initial data
      if (typeof initialData === 'object' && initialData !== null) {
        for (const [key, value] of Object.entries(initialData)) {
          rootMap.set(key, value);
        }
      }
    }
    
    // Create metadata
    const defaultMetadata: DocumentMetadata = {
      syncStatus: SyncStatus.UNSYNCED,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      ...metadata
    };
    
    this.metadata.set(docId, defaultMetadata);
    
    // Save to storage
    await this.saveDocument(docId);
    
    this.emit('document:created', { docId });
    
    return doc;
  }
  
  /**
   * Get a document
   */
  public getDocument(docId: string): any {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return null;
    }
    
    // Convert Yjs document to plain object
    return this.yDocToObject(doc);
  }
  
  /**
   * Check if a document exists
   */
  public async hasDocument(docId: string): Promise<boolean> {
    return this.docs.has(docId) || await this.storage.hasDocument(docId);
  }
  
  /**
   * Save a document
   */
  public async saveDocument(docId: string): Promise<void> {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      throw new Error(`Document ${docId} not found`);
    }
    
    // Convert Yjs document to plain object
    const data = this.yDocToObject(doc);
    
    // Update metadata
    const metadata = this.metadata.get(docId);
    
    if (metadata) {
      metadata.updatedAt = new Date();
      metadata.version += 1;
      
      // Save to storage
      await this.storage.storeDocument(docId, data, metadata);
      
      this.emit('document:saved', { docId });
    } else {
      throw new Error(`Metadata for document ${docId} not found`);
    }
  }
  
  /**
   * Delete a document
   */
  public async deleteDocument(docId: string): Promise<boolean> {
    // Remove from memory
    this.docs.delete(docId);
    this.metadata.delete(docId);
    this.awareness.delete(docId);
    
    // Remove from storage
    const result = await this.storage.deleteDocument(docId);
    
    if (result) {
      this.emit('document:deleted', { docId });
    }
    
    return result;
  }
  
  /**
   * Get all document IDs
   */
  public getAllDocumentIds(): string[] {
    return Array.from(this.docs.keys());
  }
  
  /**
   * Get document metadata
   */
  public getDocumentMetadata(docId: string): DocumentMetadata | null {
    return this.metadata.get(docId) || null;
  }
  
  /**
   * Update document metadata
   */
  public async updateDocumentMetadata(docId: string, metadata: Partial<DocumentMetadata>): Promise<void> {
    const existingMetadata = this.metadata.get(docId);
    
    if (!existingMetadata) {
      throw new Error(`Document ${docId} not found`);
    }
    
    // Update metadata
    const updatedMetadata: DocumentMetadata = {
      ...existingMetadata,
      ...metadata,
      updatedAt: new Date()
    };
    
    this.metadata.set(docId, updatedMetadata);
    
    // Save to storage
    await this.storage.updateDocumentMetadata(docId, updatedMetadata);
    
    this.emit('metadata:updated', { docId, metadata: updatedMetadata });
  }
  
  /**
   * Get document updates
   */
  public getUpdates(docId: string): Uint8Array | null {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return null;
    }
    
    // Get updates
    return Y.encodeStateAsUpdate(doc);
  }
  
  /**
   * Apply updates to a document
   */
  public applyUpdates(docId: string, updates: Uint8Array): void {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      throw new Error(`Document ${docId} not found`);
    }
    
    // Apply updates
    Y.applyUpdate(doc, updates);
    
    this.emit('document:updated', { docId });
  }
  
  /**
   * Get document awareness
   */
  public getAwareness(docId: string): any {
    return this.awareness.get(docId) || null;
  }
  
  /**
   * Get document state vector
   */
  public getStateVector(docId: string): Uint8Array | null {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return null;
    }
    
    // Get state vector
    return Y.encodeStateVector(doc);
  }
  
  /**
   * Get missing updates for a document given a state vector
   */
  public getMissingUpdates(docId: string, stateVector: Uint8Array): Uint8Array | null {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return null;
    }
    
    // Get missing updates
    return Y.encodeStateAsUpdate(doc, stateVector);
  }
  
  /**
   * Convert a Yjs document to a plain JavaScript object
   */
  private yDocToObject(doc: Y.Doc): any {
    const rootMap = doc.getMap();
    const result: any = {};
    
    // Convert Yjs map to plain object
    rootMap.forEach((value, key) => {
      result[key] = this.yValueToPlainValue(value);
    });
    
    return result;
  }
  
  /**
   * Convert a Yjs value to a plain JavaScript value
   */
  private yValueToPlainValue(value: any): any {
    if (value instanceof Y.Map) {
      // Convert Y.Map to plain object
      const result: any = {};
      
      value.forEach((v, k) => {
        result[k] = this.yValueToPlainValue(v);
      });
      
      return result;
    } else if (value instanceof Y.Array) {
      // Convert Y.Array to plain array
      return Array.from(value).map(v => this.yValueToPlainValue(v));
    } else if (value instanceof Y.Text) {
      // Convert Y.Text to string
      return value.toString();
    } else {
      // Return primitive values as is
      return value;
    }
  }
}

/**
 * Create a CRDT document manager
 */
export async function createCRDTDocumentManager(
  storage: StorageManager
): Promise<CRDTDocumentManager> {
  const manager = new YjsDocumentManager(storage);
  await manager.initialize();
  
  return manager;
}
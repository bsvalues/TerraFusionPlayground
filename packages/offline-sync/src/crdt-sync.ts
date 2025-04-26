/**
 * CRDT Document Manager
 * 
 * Manages CRDT-based document synchronization using Yjs.
 */

import { EventEmitter } from 'events';
import * as Y from 'yjs';
import { LocalStorageProvider } from './storage';

/**
 * Synchronization status enum
 */
export enum SyncStatus {
  /** Not yet synchronized */
  UNSYNCED = 'unsynced',
  /** Synchronizing in progress */
  SYNCING = 'syncing',
  /** Synchronized */
  SYNCED = 'synced',
  /** Failed to synchronize */
  FAILED = 'failed',
  /** Conflict detected */
  CONFLICT = 'conflict'
}

/**
 * Document metadata interface
 */
export interface DocumentMetadata {
  /** Document ID */
  id: string;
  /** Last modified timestamp */
  lastModified: number;
  /** Last synced timestamp */
  lastSynced?: number;
  /** Synchronization status */
  syncStatus: SyncStatus;
  /** Version */
  version: number;
  /** Size in bytes */
  size?: number;
  /** Custom metadata properties */
  [key: string]: any;
}

/**
 * CRDT document manager
 */
export class CRDTDocumentManager extends EventEmitter {
  private documents: Map<string, Y.Doc> = new Map();
  private metadata: Map<string, DocumentMetadata> = new Map();
  private storageProvider: LocalStorageProvider;
  private static DEFAULT_NAMESPACE = 'terraFusion';
  
  /**
   * Initialize a new CRDT document manager
   * 
   * @param storageProvider Storage provider
   * @param namespace Namespace for document IDs
   */
  constructor(storageProvider: LocalStorageProvider, namespace: string = CRDTDocumentManager.DEFAULT_NAMESPACE) {
    super();
    this.storageProvider = storageProvider;
  }
  
  /**
   * Check if a document exists
   * 
   * @param docId Document ID
   * @returns Whether the document exists
   */
  async hasDocument(docId: string): Promise<boolean> {
    // Check in-memory cache
    if (this.documents.has(docId)) {
      return true;
    }
    
    // Check storage
    return this.storageProvider.hasDocument(docId);
  }
  
  /**
   * Create a new document
   * 
   * @param docId Document ID
   * @param initialData Initial data
   * @returns The created document
   */
  async createDocument(docId: string, initialData?: any): Promise<Y.Doc> {
    // Create Yjs document
    const doc = new Y.Doc({ guid: docId });
    
    // Initialize with data if provided
    if (initialData) {
      const map = doc.getMap('data');
      
      doc.transact(() => {
        Object.entries(initialData).forEach(([key, value]) => {
          map.set(key, value);
        });
      });
    }
    
    // Create metadata
    const metadata: DocumentMetadata = {
      id: docId,
      lastModified: Date.now(),
      syncStatus: SyncStatus.UNSYNCED,
      version: 1
    };
    
    // Store in memory
    this.documents.set(docId, doc);
    this.metadata.set(docId, metadata);
    
    // Store in storage
    await this.storageProvider.saveDocument(docId, Y.encodeStateAsUpdate(doc));
    await this.storageProvider.saveMetadata(docId, metadata);
    
    // Emit event
    this.emit('document:created', { docId, doc, metadata });
    
    return doc;
  }
  
  /**
   * Get a document
   * 
   * @param docId Document ID
   * @returns The document
   */
  async getDocument(docId: string): Promise<Y.Doc> {
    // Check if document exists in memory
    const existingDoc = this.documents.get(docId);
    
    if (existingDoc) {
      return existingDoc;
    }
    
    // Load from storage
    const update = await this.storageProvider.loadDocument(docId);
    
    if (!update) {
      throw new Error(`Document not found: ${docId}`);
    }
    
    // Create Yjs document
    const doc = new Y.Doc({ guid: docId });
    
    // Apply update
    Y.applyUpdate(doc, update);
    
    // Load metadata
    const metadata = await this.storageProvider.loadMetadata(docId);
    
    if (metadata) {
      this.metadata.set(docId, metadata);
    } else {
      // Create default metadata
      const defaultMetadata: DocumentMetadata = {
        id: docId,
        lastModified: Date.now(),
        syncStatus: SyncStatus.UNSYNCED,
        version: 1
      };
      
      this.metadata.set(docId, defaultMetadata);
      await this.storageProvider.saveMetadata(docId, defaultMetadata);
    }
    
    // Store in memory
    this.documents.set(docId, doc);
    
    // Listen for document changes
    doc.on('update', (update: Uint8Array, origin: any) => {
      this.handleDocumentUpdate(docId, update, origin);
    });
    
    // Emit event
    this.emit('document:loaded', { docId, doc });
    
    return doc;
  }
  
  /**
   * Handle document update
   * 
   * @param docId Document ID
   * @param update Update data
   * @param origin Update origin
   */
  private handleDocumentUpdate(docId: string, update: Uint8Array, origin: any): void {
    // Update metadata
    const metadata = this.metadata.get(docId);
    
    if (metadata) {
      metadata.lastModified = Date.now();
      metadata.version++;
      metadata.syncStatus = SyncStatus.UNSYNCED;
      
      this.metadata.set(docId, metadata);
      
      // Save metadata
      this.storageProvider.saveMetadata(docId, metadata).catch(error => {
        console.error('Error saving metadata:', error);
      });
      
      // Emit event
      this.emit('metadata:updated', { docId, metadata });
    }
    
    // Save document (async)
    this.saveDocument(docId).catch(error => {
      console.error('Error saving document:', error);
    });
    
    // Emit event
    this.emit('document:updated', { docId, update, origin });
  }
  
  /**
   * Save a document
   * 
   * @param docId Document ID
   */
  async saveDocument(docId: string): Promise<void> {
    const doc = this.documents.get(docId);
    
    if (!doc) {
      throw new Error(`Document not found: ${docId}`);
    }
    
    // Encode state as update
    const update = Y.encodeStateAsUpdate(doc);
    
    // Save to storage
    await this.storageProvider.saveDocument(docId, update);
    
    // Update metadata
    const metadata = this.metadata.get(docId);
    
    if (metadata) {
      metadata.lastModified = Date.now();
      
      this.metadata.set(docId, metadata);
      await this.storageProvider.saveMetadata(docId, metadata);
    }
    
    // Emit event
    this.emit('document:saved', { docId });
  }
  
  /**
   * Delete a document
   * 
   * @param docId Document ID
   */
  async deleteDocument(docId: string): Promise<void> {
    // Remove from memory
    this.documents.delete(docId);
    this.metadata.delete(docId);
    
    // Remove from storage
    await this.storageProvider.deleteDocument(docId);
    await this.storageProvider.deleteMetadata(docId);
    
    // Emit event
    this.emit('document:deleted', { docId });
  }
  
  /**
   * Get document metadata
   * 
   * @param docId Document ID
   * @returns The document metadata or undefined if not found
   */
  getDocumentMetadata(docId: string): DocumentMetadata | undefined {
    return this.metadata.get(docId);
  }
  
  /**
   * Update document metadata
   * 
   * @param docId Document ID
   * @param metadata Metadata to update
   */
  async updateDocumentMetadata(docId: string, metadata: Partial<DocumentMetadata>): Promise<void> {
    const existingMetadata = this.metadata.get(docId);
    
    if (!existingMetadata) {
      throw new Error(`Document metadata not found: ${docId}`);
    }
    
    // Update metadata
    const updatedMetadata = {
      ...existingMetadata,
      ...metadata,
      id: docId // Ensure ID doesn't change
    };
    
    // Store in memory
    this.metadata.set(docId, updatedMetadata);
    
    // Store in storage
    await this.storageProvider.saveMetadata(docId, updatedMetadata);
    
    // Emit event
    this.emit('metadata:updated', { docId, metadata: updatedMetadata });
  }
  
  /**
   * List all documents
   * 
   * @returns Array of document IDs
   */
  async listDocuments(): Promise<string[]> {
    return this.storageProvider.listDocuments();
  }
  
  /**
   * List all document metadata
   * 
   * @returns Array of document metadata
   */
  async listDocumentMetadata(): Promise<DocumentMetadata[]> {
    const docIds = await this.listDocuments();
    const result: DocumentMetadata[] = [];
    
    for (const docId of docIds) {
      const metadata = await this.storageProvider.loadMetadata(docId);
      
      if (metadata) {
        result.push(metadata);
      }
    }
    
    return result;
  }
  
  /**
   * Get updates for a document
   * 
   * @param docId Document ID
   * @returns The updates or null if not found
   */
  getUpdates(docId: string): Uint8Array | null {
    const doc = this.documents.get(docId);
    
    if (!doc) {
      return null;
    }
    
    return Y.encodeStateAsUpdate(doc);
  }
  
  /**
   * Apply updates to a document
   * 
   * @param docId Document ID
   * @param update Update data
   */
  async applyUpdates(docId: string, update: Uint8Array): Promise<void> {
    const doc = this.documents.get(docId);
    
    if (!doc) {
      throw new Error(`Document not found: ${docId}`);
    }
    
    // Apply update
    Y.applyUpdate(doc, update);
    
    // Update metadata
    const metadata = this.metadata.get(docId);
    
    if (metadata) {
      metadata.lastSynced = Date.now();
      metadata.syncStatus = SyncStatus.SYNCED;
      
      this.metadata.set(docId, metadata);
      await this.storageProvider.saveMetadata(docId, metadata);
      
      // Emit event
      this.emit('metadata:updated', { docId, metadata });
    }
    
    // Emit event
    this.emit('remote:update', { docId, updates: update });
  }
  
  /**
   * Clear all documents
   */
  async clearAllDocuments(): Promise<void> {
    // Clear memory
    this.documents.clear();
    this.metadata.clear();
    
    // Clear storage
    await this.storageProvider.clearAll();
    
    // Emit event
    this.emit('documents:cleared');
  }
}

export default CRDTDocumentManager;
/**
 * CRDT Synchronization Module
 * 
 * Implements conflict-free replicated data types (CRDTs) using Yjs to enable:
 * - Conflict-free data merging
 * - Real-time collaboration
 * - Offline-first operations
 * - Automatic state reconciliation
 */

import { EventEmitter } from 'events';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as awarenessProtocol from 'y-protocols/awareness';
import { WebrtcProvider } from 'y-webrtc';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

// CRDT Document Types
export enum CRDTDocumentType {
  PROPERTY = 'property',
  TASK = 'task',
  ASSESSMENT = 'assessment',
  NOTES = 'notes',
  MAP_FEATURE = 'map_feature'
}

// Sync status
export enum SyncStatus {
  SYNCED = 'synced',
  SYNCING = 'syncing',
  PENDING_CHANGES = 'pending_changes',
  CONFLICT = 'conflict',
  ERROR = 'error',
  OFFLINE = 'offline'
}

// Awareness state (for collaborative editing)
export interface AwarenessState {
  userId: string;
  userName: string;
  color: string;
  location?: {
    lat: number;
    lng: number;
  };
  selectedElement?: string;
  status: 'active' | 'idle' | 'away';
}

// Sync provider type
export enum SyncProviderType {
  WEBSOCKET = 'websocket',
  WEBRTC = 'webrtc',
  INDEXEDDB = 'indexeddb',
  CUSTOM = 'custom'
}

// CRDT document metadata
export interface CRDTDocumentMetadata {
  id: string;
  type: CRDTDocumentType;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  version: number;
  name: string;
  description?: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
}

/**
 * CRDT Document Manager
 * 
 * Manages CRDT documents for various entities in the system.
 */
export class CRDTDocumentManager extends EventEmitter {
  private docs: Map<string, Y.Doc> = new Map();
  private metadata: Map<string, CRDTDocumentMetadata> = new Map();
  private providers: Map<string, Map<string, any>> = new Map();
  private awareness: Map<string, awarenessProtocol.Awareness> = new Map();
  private isOnline: boolean = navigator.onLine;

  constructor() {
    super();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnlineStatusChange(true));
    window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
  }

  /**
   * Initialize the CRDT document manager
   */
  public initialize(): void {
    console.log('Initializing CRDT document manager');
    this.emit('initialized');
  }

  /**
   * Create a new CRDT document
   */
  public createDocument(
    docId: string,
    type: CRDTDocumentType,
    userId: string,
    userName: string,
    name: string,
    description?: string
  ): Y.Doc {
    // Check if document already exists
    if (this.docs.has(docId)) {
      throw new Error(`Document with ID ${docId} already exists`);
    }
    
    // Create new Y.Doc
    const doc = new Y.Doc();
    
    // Initialize document with basic structure based on type
    this.initializeDocumentStructure(doc, type);
    
    // Create metadata
    const metadata: CRDTDocumentMetadata = {
      id: docId,
      type,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
      version: 1,
      name,
      description,
      syncStatus: this.isOnline ? SyncStatus.SYNCED : SyncStatus.OFFLINE
    };
    
    // Store document and metadata
    this.docs.set(docId, doc);
    this.metadata.set(docId, metadata);
    
    // Initialize awareness for collaborative editing
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalState({
      userId,
      userName,
      color: this.getRandomColor(),
      status: 'active'
    });
    this.awareness.set(docId, awareness);
    
    // Initialize local persistence
    this.setupLocalPersistence(docId, doc);
    
    // If online, set up synchronization
    if (this.isOnline) {
      this.setupSynchronization(docId, doc, awareness);
    }
    
    console.log(`CRDT document created: ${docId} (${type})`);
    this.emit('document:created', { docId, type, metadata });
    
    return doc;
  }

  /**
   * Initialize the document structure based on its type
   */
  private initializeDocumentStructure(doc: Y.Doc, type: CRDTDocumentType): void {
    // Create shared data structures based on document type
    switch (type) {
      case CRDTDocumentType.PROPERTY:
        doc.getMap('property'); // Main property data
        doc.getMap('attributes'); // Property attributes
        doc.getMap('values'); // Assessment values
        doc.getArray('history'); // History of changes
        doc.getMap('files'); // Attached files
        break;
        
      case CRDTDocumentType.TASK:
        doc.getMap('task'); // Main task data
        doc.getArray('steps'); // Task steps/checklist
        doc.getMap('assignees'); // Assigned users
        doc.getArray('comments'); // Task comments
        doc.getMap('timestamps'); // Task timestamps (created, due, completed)
        break;
        
      case CRDTDocumentType.ASSESSMENT:
        doc.getMap('assessment'); // Main assessment data
        doc.getMap('values'); // Assessment values
        doc.getArray('comparables'); // Comparable properties
        doc.getMap('factors'); // Assessment factors
        doc.getArray('history'); // History of changes
        break;
        
      case CRDTDocumentType.NOTES:
        doc.getText('content'); // Note content
        doc.getMap('metadata'); // Note metadata
        doc.getArray('tags'); // Note tags
        break;
        
      case CRDTDocumentType.MAP_FEATURE:
        doc.getMap('feature'); // Feature data
        doc.getMap('geometry'); // Geometry data
        doc.getMap('properties'); // Feature properties
        doc.getArray('history'); // Edit history
        break;
        
      default:
        // Generic structure for unknown types
        doc.getMap('data');
        doc.getArray('history');
    }
    
    // Add shared metadata
    doc.getMap('metadata').set('type', type);
    doc.getMap('metadata').set('createdAt', new Date().toISOString());
  }

  /**
   * Set up local persistence using IndexedDB
   */
  private setupLocalPersistence(docId: string, doc: Y.Doc): void {
    // Create IndexedDB provider
    const dbName = `terrafusion-crdt-${docId}`;
    const indexeddbProvider = new IndexeddbPersistence(dbName, doc);
    
    // Store provider
    let providers = this.providers.get(docId);
    if (!providers) {
      providers = new Map();
      this.providers.set(docId, providers);
    }
    providers.set(SyncProviderType.INDEXEDDB, indexeddbProvider);
    
    // Listen for sync events
    indexeddbProvider.on('synced', () => {
      console.log(`Document ${docId} synced with IndexedDB`);
      this.emit('document:persisted', { docId });
    });
    
    console.log(`Local persistence set up for document: ${docId}`);
  }

  /**
   * Set up synchronization providers
   */
  private setupSynchronization(docId: string, doc: Y.Doc, awareness: awarenessProtocol.Awareness): void {
    // Get providers map for this document
    let providers = this.providers.get(docId);
    if (!providers) {
      providers = new Map();
      this.providers.set(docId, providers);
    }
    
    // Set up WebRTC provider for P2P sync
    if (!providers.has(SyncProviderType.WEBRTC)) {
      const webrtcProvider = new WebrtcProvider(`terrafusion-crdt-${docId}`, doc, {
        awareness,
        maxConns: 20,
        filterBcConns: true,
        peerOpts: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      });
      
      providers.set(SyncProviderType.WEBRTC, webrtcProvider);
      
      console.log(`WebRTC provider set up for document: ${docId}`);
    }
    
    // Update sync status
    const metadata = this.metadata.get(docId);
    if (metadata) {
      metadata.syncStatus = SyncStatus.SYNCED;
      metadata.lastSyncedAt = new Date();
      this.metadata.set(docId, metadata);
    }
    
    this.emit('document:sync-setup', { docId });
  }

  /**
   * Handle online status change
   */
  private handleOnlineStatusChange(isOnline: boolean): void {
    this.isOnline = isOnline;
    console.log(`Connection status changed: ${isOnline ? 'Online' : 'Offline'}`);
    this.emit('connection:status-changed', { isOnline });
    
    // Update all documents
    for (const [docId, doc] of this.docs.entries()) {
      const metadata = this.metadata.get(docId);
      if (metadata) {
        // Update sync status
        metadata.syncStatus = isOnline ? SyncStatus.SYNCING : SyncStatus.OFFLINE;
        this.metadata.set(docId, metadata);
        
        // Set up or tear down sync providers
        if (isOnline) {
          const awareness = this.awareness.get(docId);
          if (awareness) {
            this.setupSynchronization(docId, doc, awareness);
          }
        } else {
          // When going offline, we don't need to tear down providers
          // They will automatically reconnect when back online
        }
      }
    }
    
    if (isOnline) {
      // Sync all documents with pending changes
      this.syncPendingChanges();
    }
  }

  /**
   * Sync pending changes for all documents
   */
  private syncPendingChanges(): void {
    for (const [docId, metadata] of this.metadata.entries()) {
      if (metadata.syncStatus === SyncStatus.PENDING_CHANGES) {
        const doc = this.docs.get(docId);
        if (doc) {
          // Update status to syncing
          metadata.syncStatus = SyncStatus.SYNCING;
          this.metadata.set(docId, metadata);
          
          // In a real implementation, this would send the changes to the server
          // For now, we'll just simulate a successful sync after a short delay
          setTimeout(() => {
            metadata.syncStatus = SyncStatus.SYNCED;
            metadata.lastSyncedAt = new Date();
            this.metadata.set(docId, metadata);
            
            this.emit('document:synced', { docId });
          }, 1500);
        }
      }
    }
  }

  /**
   * Get a document by ID
   */
  public getDocument(docId: string): Y.Doc | undefined {
    return this.docs.get(docId);
  }

  /**
   * Get document metadata
   */
  public getDocumentMetadata(docId: string): CRDTDocumentMetadata | undefined {
    return this.metadata.get(docId);
  }

  /**
   * Update document metadata
   */
  public updateDocumentMetadata(docId: string, updates: Partial<Omit<CRDTDocumentMetadata, 'id' | 'createdAt' | 'createdBy'>>): CRDTDocumentMetadata | undefined {
    const metadata = this.metadata.get(docId);
    
    if (!metadata) {
      return undefined;
    }
    
    const updatedMetadata: CRDTDocumentMetadata = {
      ...metadata,
      ...updates,
      updatedAt: new Date()
    };
    
    this.metadata.set(docId, updatedMetadata);
    
    this.emit('document:metadata-updated', { docId, metadata: updatedMetadata });
    
    return updatedMetadata;
  }

  /**
   * Delete a document
   */
  public deleteDocument(docId: string): boolean {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return false;
    }
    
    // Clean up providers
    const providers = this.providers.get(docId);
    if (providers) {
      for (const [type, provider] of providers.entries()) {
        if (type === SyncProviderType.WEBSOCKET) {
          provider.disconnect();
        } else if (type === SyncProviderType.WEBRTC) {
          provider.destroy();
        } else if (type === SyncProviderType.INDEXEDDB) {
          provider.destroy();
        }
      }
      this.providers.delete(docId);
    }
    
    // Clean up awareness
    const awareness = this.awareness.get(docId);
    if (awareness) {
      awareness.destroy();
      this.awareness.delete(docId);
    }
    
    // Remove document and metadata
    this.docs.delete(docId);
    this.metadata.delete(docId);
    
    console.log(`CRDT document deleted: ${docId}`);
    this.emit('document:deleted', { docId });
    
    return true;
  }

  /**
   * Get all document IDs
   */
  public getAllDocumentIds(): string[] {
    return Array.from(this.docs.keys());
  }

  /**
   * Get documents by type
   */
  public getDocumentsByType(type: CRDTDocumentType): string[] {
    const docIds: string[] = [];
    
    for (const [docId, metadata] of this.metadata.entries()) {
      if (metadata.type === type) {
        docIds.push(docId);
      }
    }
    
    return docIds;
  }

  /**
   * Get documents by sync status
   */
  public getDocumentsBySyncStatus(status: SyncStatus): string[] {
    const docIds: string[] = [];
    
    for (const [docId, metadata] of this.metadata.entries()) {
      if (metadata.syncStatus === status) {
        docIds.push(docId);
      }
    }
    
    return docIds;
  }

  /**
   * Apply updates from a binary update
   */
  public applyUpdate(docId: string, update: Uint8Array): boolean {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return false;
    }
    
    Y.applyUpdate(doc, update);
    
    // Update metadata
    const metadata = this.metadata.get(docId);
    if (metadata) {
      metadata.updatedAt = new Date();
      metadata.version += 1;
      
      if (!this.isOnline) {
        metadata.syncStatus = SyncStatus.PENDING_CHANGES;
      }
      
      this.metadata.set(docId, metadata);
    }
    
    this.emit('document:updated', { docId });
    
    return true;
  }

  /**
   * Get binary state vector for a document
   */
  public getStateVector(docId: string): Uint8Array | undefined {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return undefined;
    }
    
    return Y.encodeStateVector(doc);
  }

  /**
   * Get binary updates for a document
   */
  public getUpdates(docId: string, stateVector?: Uint8Array): Uint8Array | undefined {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return undefined;
    }
    
    return Y.encodeStateAsUpdate(doc, stateVector);
  }

  /**
   * Subscribe to document changes
   */
  public subscribeToChanges(docId: string, callback: (event: any) => void): void {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      throw new Error(`Document with ID ${docId} not found`);
    }
    
    // Subscribe to document updates
    doc.on('update', (update: Uint8Array, origin: any) => {
      callback({
        type: 'update',
        docId,
        update,
        origin
      });
    });
    
    // Subscribe to awareness updates
    const awareness = this.awareness.get(docId);
    if (awareness) {
      awareness.on('change', (changes: any) => {
        callback({
          type: 'awareness',
          docId,
          changes
        });
      });
    }
  }

  /**
   * Unsubscribe from document changes
   */
  public unsubscribeFromChanges(docId: string, callback: (event: any) => void): void {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return;
    }
    
    // Unsubscribe from document updates
    doc.off('update', callback);
    
    // Unsubscribe from awareness updates
    const awareness = this.awareness.get(docId);
    if (awareness) {
      awareness.off('change', callback);
    }
  }

  /**
   * Create a snapshot of a document
   */
  public createSnapshot(docId: string): Uint8Array | undefined {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return undefined;
    }
    
    return Y.encodeStateAsUpdate(doc);
  }

  /**
   * Restore a document from a snapshot
   */
  public restoreSnapshot(docId: string, snapshot: Uint8Array): boolean {
    const doc = this.docs.get(docId);
    
    if (!doc) {
      return false;
    }
    
    Y.applyUpdate(doc, snapshot);
    
    // Update metadata
    const metadata = this.metadata.get(docId);
    if (metadata) {
      metadata.updatedAt = new Date();
      metadata.version += 1;
      this.metadata.set(docId, metadata);
    }
    
    this.emit('document:restored', { docId });
    
    return true;
  }

  /**
   * Get a random color for collaborative editing
   */
  private getRandomColor(): string {
    const colors = [
      '#FF0000', // Red
      '#00FF00', // Green
      '#0000FF', // Blue
      '#FFFF00', // Yellow
      '#FF00FF', // Magenta
      '#00FFFF', // Cyan
      '#FFA500', // Orange
      '#800080', // Purple
      '#008000', // Dark Green
      '#000080', // Navy
      '#800000', // Maroon
      '#008080', // Teal
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

/**
 * Create a new CRDT document manager
 */
export function createCRDTDocumentManager(): CRDTDocumentManager {
  return new CRDTDocumentManager();
}
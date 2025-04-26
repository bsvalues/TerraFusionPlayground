/**
 * Background Sync Module
 * 
 * Provides background synchronization capabilities:
 * - Service worker-based sync for web applications
 * - Background tasks for mobile applications
 * - Retry logic and error handling
 * - Conflict detection
 */

import { EventEmitter } from 'events';
import { SyncQueueItem, StorageManager } from './storage';
import { CRDTDocumentManager, SyncStatus } from './crdt-sync';

// Sync mode
export enum SyncMode {
  IMMEDIATE = 'immediate',     // Sync immediately when changes are made
  BACKGROUND = 'background',   // Sync in the background when possible
  MANUAL = 'manual',           // Sync only when explicitly requested
  SCHEDULED = 'scheduled'      // Sync on a schedule
}

// Sync state
export enum SyncState {
  IDLE = 'idle',
  SYNCING = 'syncing',
  PAUSED = 'paused',
  ERROR = 'error'
}

// Sync direction
export enum SyncDirection {
  UPLOAD = 'upload',          // Local to server
  DOWNLOAD = 'download',      // Server to local
  BIDIRECTIONAL = 'bidirectional'  // Both ways
}

// Sync result
export interface SyncResult {
  success: boolean;
  docId?: string;
  timestamp: Date;
  direction: SyncDirection;
  error?: Error;
  details?: any;
}

// Sync statistics
export interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSyncTime?: Date;
  averageSyncDuration?: number; // In milliseconds
  syncDurations: number[];      // Last 10 sync durations
  syncResults: SyncResult[];    // Last 10 sync results
}

// Sync configuration
export interface SyncConfig {
  mode: SyncMode;
  retryLimit: number;
  retryDelay: number; // In milliseconds
  retryBackoffFactor: number;
  syncInterval?: number; // In milliseconds, for scheduled mode
  priorityDocs?: string[]; // Documents to sync first
  excludedDocs?: string[]; // Documents to exclude from sync
  maxConcurrentSyncs: number;
  networkTimeout: number; // In milliseconds
  direction: SyncDirection;
  syncOnStartup: boolean;
  syncOnNetworkChange: boolean;
  syncOnFocus: boolean;
  syncOnDocumentChange: boolean;
  batchSize: number; // Number of documents to sync in a batch
}

/**
 * Background Sync Manager
 * 
 * Manages background synchronization of offline data.
 */
export class BackgroundSyncManager extends EventEmitter {
  private storage: StorageManager;
  private crdtManager: CRDTDocumentManager;
  private config: SyncConfig;
  private state: SyncState = SyncState.IDLE;
  private stats: SyncStats;
  private syncQueue: string[] = []; // Queue of document IDs to sync
  private syncTimer?: ReturnType<typeof setInterval>;
  private activeSyncs: Set<string> = new Set(); // Set of document IDs currently being synced
  private isOnline: boolean = navigator.onLine;
  private isServiceWorkerSupported: boolean = 'serviceWorker' in navigator;
  private isBackgroundSyncSupported: boolean = 'SyncManager' in self;
  
  constructor(storage: StorageManager, crdtManager: CRDTDocumentManager, config?: Partial<SyncConfig>) {
    super();
    
    this.storage = storage;
    this.crdtManager = crdtManager;
    
    // Default configuration
    this.config = {
      mode: SyncMode.BACKGROUND,
      retryLimit: 5,
      retryDelay: 5000,
      retryBackoffFactor: 1.5,
      maxConcurrentSyncs: 3,
      networkTimeout: 30000,
      direction: SyncDirection.BIDIRECTIONAL,
      syncOnStartup: true,
      syncOnNetworkChange: true,
      syncOnFocus: true,
      syncOnDocumentChange: true,
      batchSize: 10,
      ...config
    };
    
    // Initialize stats
    this.stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      syncDurations: [],
      syncResults: []
    };
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
    
    // Listen for focus/blur events
    window.addEventListener('focus', () => this.handleFocus());
    
    // Listen for document changes
    this.crdtManager.on('document:updated', ({ docId }) => {
      if (this.config.syncOnDocumentChange) {
        this.enqueueSync(docId);
      }
    });
  }

  /**
   * Initialize the background sync manager
   */
  public async initialize(): Promise<void> {
    console.log('Initializing background sync manager');
    
    // Register service worker if supported
    if (this.isServiceWorkerSupported) {
      try {
        await this.registerServiceWorker();
      } catch (error) {
        console.error('Failed to register service worker:', error);
      }
    }
    
    // If configured to sync on startup, enqueue all documents
    if (this.config.syncOnStartup && this.isOnline) {
      this.enqueueAllDocuments();
    }
    
    // Start scheduled sync if in scheduled mode
    if (this.config.mode === SyncMode.SCHEDULED && this.config.syncInterval) {
      this.startScheduledSync();
    }
    
    this.emit('initialized');
    
    // Process any pending sync items
    this.processPendingSyncItems();
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered:', registration);
      
      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        // Process messages from service worker
        if (event.data && event.data.type === 'sync:completed') {
          this.handleServiceWorkerSyncCompleted(event.data);
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Handle service worker sync completed event
   */
  private handleServiceWorkerSyncCompleted(data: any): void {
    const { docId, success, error } = data;
    
    if (success) {
      this.handleSyncSuccess(docId);
    } else {
      this.handleSyncError(docId, new Error(error || 'Unknown error'));
    }
  }

  /**
   * Start scheduled sync
   */
  private startScheduledSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    if (this.config.syncInterval) {
      this.syncTimer = setInterval(() => {
        if (this.isOnline) {
          this.enqueueAllDocuments();
        }
      }, this.config.syncInterval);
      
      console.log(`Scheduled sync started with interval: ${this.config.syncInterval}ms`);
    }
  }

  /**
   * Stop scheduled sync
   */
  private stopScheduledSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
      
      console.log('Scheduled sync stopped');
    }
  }

  /**
   * Handle network change
   */
  private handleNetworkChange(isOnline: boolean): void {
    this.isOnline = isOnline;
    console.log(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
    this.emit('network:status-changed', { isOnline });
    
    if (isOnline && this.config.syncOnNetworkChange) {
      console.log('Network reconnected, enqueueing pending documents');
      this.processPendingSyncItems();
    }
  }

  /**
   * Handle window focus
   */
  private handleFocus(): void {
    if (this.isOnline && this.config.syncOnFocus) {
      console.log('Window focused, enqueueing pending documents');
      this.processPendingSyncItems();
    }
  }

  /**
   * Enqueue all documents for synchronization
   */
  private enqueueAllDocuments(): void {
    const docIds = this.crdtManager.getAllDocumentIds();
    
    // Filter out excluded documents
    const filteredDocIds = this.config.excludedDocs
      ? docIds.filter(id => !this.config.excludedDocs!.includes(id))
      : docIds;
    
    // Sort by priority
    if (this.config.priorityDocs && this.config.priorityDocs.length > 0) {
      filteredDocIds.sort((a, b) => {
        const aPriority = this.config.priorityDocs!.includes(a) ? 0 : 1;
        const bPriority = this.config.priorityDocs!.includes(b) ? 0 : 1;
        return aPriority - bPriority;
      });
    }
    
    // Enqueue documents
    for (const docId of filteredDocIds) {
      this.enqueueSync(docId);
    }
  }

  /**
   * Enqueue a document for synchronization
   */
  public enqueueSync(docId: string): void {
    // Skip if already in queue or actively syncing
    if (this.syncQueue.includes(docId) || this.activeSyncs.has(docId)) {
      return;
    }
    
    // Skip if excluded
    if (this.config.excludedDocs && this.config.excludedDocs.includes(docId)) {
      return;
    }
    
    // Add to queue
    this.syncQueue.push(docId);
    
    this.emit('sync:enqueued', { docId });
    
    // If in immediate mode, start syncing right away
    if (this.config.mode === SyncMode.IMMEDIATE && this.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Process the sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.state === SyncState.SYNCING || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }
    
    this.state = SyncState.SYNCING;
    this.emit('sync:started');
    
    // Process documents in batches
    while (this.syncQueue.length > 0 && this.isOnline) {
      // Get next batch
      const batch = this.syncQueue.splice(0, Math.min(this.config.batchSize, this.syncQueue.length));
      
      // Filter out documents already being synced
      const filteredBatch = batch.filter(docId => !this.activeSyncs.has(docId));
      
      // Sync documents in parallel, but respect maxConcurrentSyncs
      const promises: Promise<void>[] = [];
      
      for (const docId of filteredBatch) {
        if (this.activeSyncs.size >= this.config.maxConcurrentSyncs) {
          // Wait for at least one active sync to complete
          await Promise.race(Array.from(this.activeSyncs).map(id => this.waitForSync(id)));
        }
        
        // Mark document as actively syncing
        this.activeSyncs.add(docId);
        
        // Sync document
        promises.push(this.syncDocument(docId));
      }
      
      // Wait for all syncs to complete
      await Promise.all(promises);
    }
    
    this.state = SyncState.IDLE;
    this.emit('sync:completed');
  }

  /**
   * Wait for a document to finish syncing
   */
  private waitForSync(docId: string): Promise<void> {
    return new Promise<void>(resolve => {
      const handler = (data: any) => {
        if (data.docId === docId) {
          this.off('sync:success', handler);
          this.off('sync:error', handler);
          resolve();
        }
      };
      
      this.on('sync:success', handler);
      this.on('sync:error', handler);
    });
  }

  /**
   * Sync a document
   */
  private async syncDocument(docId: string): Promise<void> {
    console.log(`Syncing document: ${docId}`);
    
    const startTime = Date.now();
    
    try {
      // Get document
      const doc = this.crdtManager.getDocument(docId);
      
      if (!doc) {
        throw new Error(`Document not found: ${docId}`);
      }
      
      // Get metadata
      const metadata = this.crdtManager.getDocumentMetadata(docId);
      
      if (!metadata) {
        throw new Error(`Document metadata not found: ${docId}`);
      }
      
      // Update status
      this.crdtManager.updateDocumentMetadata(docId, {
        syncStatus: SyncStatus.SYNCING
      });
      
      // If using service worker background sync API for upload
      if (this.isServiceWorkerSupported && this.isBackgroundSyncSupported && this.config.direction !== SyncDirection.DOWNLOAD) {
        await this.registerBackgroundSync(docId);
      } else {
        // Implement direct sync with the server
        await this.directSync(docId, doc, metadata);
      }
      
      // Update stats
      const duration = Date.now() - startTime;
      this.stats.totalSyncs++;
      this.stats.successfulSyncs++;
      this.stats.lastSyncTime = new Date();
      this.stats.syncDurations.push(duration);
      
      // Keep only last 10 durations
      if (this.stats.syncDurations.length > 10) {
        this.stats.syncDurations.shift();
      }
      
      // Calculate average duration
      this.stats.averageSyncDuration = this.stats.syncDurations.reduce((sum, d) => sum + d, 0) / this.stats.syncDurations.length;
      
      // Store result
      const result: SyncResult = {
        success: true,
        docId,
        timestamp: new Date(),
        direction: this.config.direction
      };
      
      this.stats.syncResults.push(result);
      
      // Keep only last 10 results
      if (this.stats.syncResults.length > 10) {
        this.stats.syncResults.shift();
      }
      
      // Update document metadata
      this.crdtManager.updateDocumentMetadata(docId, {
        syncStatus: SyncStatus.SYNCED,
        lastSyncedAt: new Date()
      });
      
      this.handleSyncSuccess(docId);
    } catch (error) {
      console.error(`Error syncing document ${docId}:`, error);
      
      // Update stats
      this.stats.totalSyncs++;
      this.stats.failedSyncs++;
      
      // Store result
      const result: SyncResult = {
        success: false,
        docId,
        timestamp: new Date(),
        direction: this.config.direction,
        error: error as Error
      };
      
      this.stats.syncResults.push(result);
      
      // Keep only last 10 results
      if (this.stats.syncResults.length > 10) {
        this.stats.syncResults.shift();
      }
      
      // Update document metadata
      this.crdtManager.updateDocumentMetadata(docId, {
        syncStatus: SyncStatus.ERROR
      });
      
      this.handleSyncError(docId, error as Error);
    } finally {
      // Remove from active syncs
      this.activeSyncs.delete(docId);
    }
  }

  /**
   * Register a background sync task using the Background Sync API
   */
  private async registerBackgroundSync(docId: string): Promise<void> {
    if (!this.isServiceWorkerSupported || !this.isBackgroundSyncSupported) {
      throw new Error('Background Sync API not supported');
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Create sync manager
      const syncManager = registration.sync;
      
      // Add document updates to the sync queue in IndexedDB
      await this.addDocumentToSyncQueue(docId);
      
      // Register sync task
      await syncManager.register(`sync-doc-${docId}`);
      
      console.log(`Background sync registered for document: ${docId}`);
    } catch (error) {
      console.error(`Error registering background sync for document ${docId}:`, error);
      throw error;
    }
  }

  /**
   * Add document to sync queue in storage
   */
  private async addDocumentToSyncQueue(docId: string): Promise<void> {
    const doc = this.crdtManager.getDocument(docId);
    
    if (!doc) {
      throw new Error(`Document not found: ${docId}`);
    }
    
    // Get document update
    const update = this.crdtManager.getUpdates(docId);
    
    if (!update) {
      throw new Error(`Failed to get updates for document: ${docId}`);
    }
    
    // Add to sync queue in storage
    await this.storage.addToSyncQueue({
      docId,
      operation: 'update',
      data: update
    });
  }

  /**
   * Perform direct sync with server
   */
  private async directSync(docId: string, doc: any, metadata: any): Promise<void> {
    // This is a placeholder for actual server sync implementation
    // In a real implementation, this would:
    // 1. Upload local changes to the server
    // 2. Download server changes
    // 3. Merge changes using Yjs CRDT
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate 10% chance of error
    if (Math.random() < 0.1) {
      throw new Error('Simulated network error');
    }
  }

  /**
   * Process pending sync items from storage
   */
  private async processPendingSyncItems(): Promise<void> {
    if (!this.isOnline) {
      return;
    }
    
    try {
      // Get pending items from storage
      const pendingItems = await this.storage.getPendingSyncItems();
      
      if (pendingItems.length === 0) {
        return;
      }
      
      console.log(`Processing ${pendingItems.length} pending sync items`);
      
      for (const item of pendingItems) {
        try {
          // Update status to processing
          await this.storage.updateSyncQueueItem(item.id, {
            status: 'processing'
          });
          
          // Process item based on operation
          if (item.operation === 'create' || item.operation === 'update') {
            // In a real implementation, this would send the item to the server
            // For now, we'll just simulate a successful sync
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Update document status
            this.crdtManager.updateDocumentMetadata(item.docId, {
              syncStatus: SyncStatus.SYNCED,
              lastSyncedAt: new Date()
            });
            
            // Update sync queue item status
            await this.storage.updateSyncQueueItem(item.id, {
              status: 'completed'
            });
            
            this.emit('sync:success', { docId: item.docId, queueId: item.id });
          } else if (item.operation === 'delete') {
            // Handle delete operation
            // In a real implementation, this would delete the document from the server
            
            // Update sync queue item status
            await this.storage.updateSyncQueueItem(item.id, {
              status: 'completed'
            });
            
            this.emit('sync:success', { docId: item.docId, queueId: item.id });
          }
        } catch (error) {
          console.error(`Error processing sync item ${item.id}:`, error);
          
          // Update retry count
          const retries = item.retries + 1;
          
          if (retries >= this.config.retryLimit) {
            // Max retries reached
            await this.storage.updateSyncQueueItem(item.id, {
              status: 'failed',
              retries,
              error: (error as Error).message
            });
            
            this.emit('sync:error', { docId: item.docId, queueId: item.id, error });
          } else {
            // Retry later
            const delay = this.config.retryDelay * Math.pow(this.config.retryBackoffFactor, retries);
            
            await this.storage.updateSyncQueueItem(item.id, {
              status: 'pending',
              retries
            });
            
            this.emit('sync:retry', { docId: item.docId, queueId: item.id, retries, delay });
            
            // Schedule retry
            setTimeout(() => {
              this.processPendingSyncItems();
            }, delay);
          }
        }
      }
    } catch (error) {
      console.error('Error processing pending sync items:', error);
    }
  }

  /**
   * Handle sync success
   */
  private handleSyncSuccess(docId: string): void {
    this.activeSyncs.delete(docId);
    
    this.emit('sync:success', { docId });
    
    // Continue processing queue
    if (this.syncQueue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Handle sync error
   */
  private handleSyncError(docId: string, error: Error): void {
    this.activeSyncs.delete(docId);
    
    this.emit('sync:error', { docId, error });
    
    // Continue processing queue
    if (this.syncQueue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Get sync statistics
   */
  public getSyncStats(): SyncStats {
    return { ...this.stats };
  }

  /**
   * Get current sync state
   */
  public getSyncState(): SyncState {
    return this.state;
  }

  /**
   * Pause synchronization
   */
  public pauseSync(): void {
    if (this.state !== SyncState.PAUSED) {
      this.state = SyncState.PAUSED;
      
      // Stop scheduled sync
      this.stopScheduledSync();
      
      this.emit('sync:paused');
    }
  }

  /**
   * Resume synchronization
   */
  public resumeSync(): void {
    if (this.state === SyncState.PAUSED) {
      this.state = SyncState.IDLE;
      
      // Restart scheduled sync if needed
      if (this.config.mode === SyncMode.SCHEDULED && this.config.syncInterval) {
        this.startScheduledSync();
      }
      
      this.emit('sync:resumed');
      
      // Process queue if there are pending documents
      if (this.syncQueue.length > 0 && this.isOnline) {
        this.processQueue();
      }
    }
  }

  /**
   * Manually trigger sync for all documents
   */
  public syncAll(): void {
    if (this.isOnline) {
      this.enqueueAllDocuments();
      this.processQueue();
    } else {
      console.warn('Cannot sync while offline');
    }
  }

  /**
   * Manually trigger sync for a specific document
   */
  public syncDocument(docId: string): void {
    if (this.isOnline) {
      this.enqueueSync(docId);
      this.processQueue();
    } else {
      console.warn('Cannot sync while offline');
    }
  }

  /**
   * Update sync configuration
   */
  public updateConfig(updates: Partial<SyncConfig>): void {
    const oldConfig = { ...this.config };
    
    this.config = {
      ...this.config,
      ...updates
    };
    
    // Handle changes to scheduled sync
    if (oldConfig.mode !== SyncMode.SCHEDULED && this.config.mode === SyncMode.SCHEDULED) {
      this.startScheduledSync();
    } else if (oldConfig.mode === SyncMode.SCHEDULED && this.config.mode !== SyncMode.SCHEDULED) {
      this.stopScheduledSync();
    } else if (oldConfig.syncInterval !== this.config.syncInterval && this.config.mode === SyncMode.SCHEDULED) {
      this.stopScheduledSync();
      this.startScheduledSync();
    }
    
    this.emit('config:updated', { config: this.config });
  }
}

/**
 * Create a new background sync manager
 */
export function createBackgroundSyncManager(
  storage: StorageManager,
  crdtManager: CRDTDocumentManager,
  config?: Partial<SyncConfig>
): BackgroundSyncManager {
  return new BackgroundSyncManager(storage, crdtManager, config);
}
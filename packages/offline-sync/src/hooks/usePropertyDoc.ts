/**
 * usePropertyDoc Hook
 * 
 * A React hook for managing property document synchronization.
 */

import { useState, useEffect, useCallback } from 'react';
import { CRDTDocumentManager, SyncStatus } from '../crdt-sync';
import { ConflictResolutionManager, ResolutionStrategy } from '../conflict-resolution';
import * as Y from 'yjs';
import * as json from 'lib0/json';

/**
 * Property document state interface
 */
export interface PropertyDocState {
  /**
   * Property ID
   */
  id: string;
  
  /**
   * Property address
   */
  address?: string;
  
  /**
   * Property owner
   */
  owner?: string;
  
  /**
   * Property value
   */
  value?: number;
  
  /**
   * Last inspection date
   */
  lastInspection?: string;
  
  /**
   * Property notes
   */
  notes?: string;
  
  /**
   * Property features
   */
  features?: string[];
  
  /**
   * Any other field
   */
  [key: string]: any;
}

/**
 * Property document hook result interface
 */
export interface PropertyDocHookResult {
  /**
   * Local document state
   */
  local: PropertyDocState;
  
  /**
   * Remote document state (if any)
   */
  remote: PropertyDocState | null;
  
  /**
   * Shared document state (merged)
   */
  shared: PropertyDocState;
  
  /**
   * Loading state
   */
  isLoading: boolean;
  
  /**
   * Error if any
   */
  error: Error | null;
  
  /**
   * Sync status
   */
  syncStatus: SyncStatus;
  
  /**
   * Whether the document has a conflict
   */
  hasConflict: boolean;
  
  /**
   * Update document locally
   */
  updateLocal: (data: Partial<PropertyDocState>) => Promise<void>;
  
  /**
   * Sync document with remote
   */
  syncWithRemote: () => Promise<boolean>;
  
  /**
   * Resolve conflict
   */
  resolveConflict: (data: PropertyDocState) => Promise<void>;
}

/**
 * Property document hook
 * 
 * @param propertyId Property ID
 * @param crdtManager CRDT document manager
 * @param conflictManager Conflict resolution manager
 * @param options Hook options
 * @returns Property document hook result
 */
export function usePropertyDoc(
  propertyId: string,
  crdtManager: CRDTDocumentManager,
  conflictManager: ConflictResolutionManager,
  options: {
    userId?: string;
    apiEndpoint?: string;
  } = {}
): PropertyDocHookResult {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.UNSYNCED);
  const [localState, setLocalState] = useState<PropertyDocState>({ id: propertyId });
  const [remoteState, setRemoteState] = useState<PropertyDocState | null>(null);
  const [hasConflict, setHasConflict] = useState<boolean>(false);
  const [sharedState, setSharedState] = useState<PropertyDocState>({ id: propertyId });
  
  const { userId = 'anonymous', apiEndpoint = '/api/sync' } = options;
  
  /**
   * Load document data
   */
  const loadDocumentData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check if document exists
      const exists = await crdtManager.hasDocument(propertyId);
      
      if (!exists) {
        // Create initial document
        await crdtManager.createDocument(propertyId, {
          id: propertyId
        });
      }
      
      // Get document data
      const data = await crdtManager.getDocumentData(propertyId);
      
      // Set local state
      setLocalState(data || { id: propertyId });
      
      // Set shared state (initially same as local)
      setSharedState(data || { id: propertyId });
      
      // Get document metadata
      const metadata = crdtManager.getDocumentMetadata(propertyId);
      
      if (metadata) {
        setSyncStatus(metadata.syncStatus);
      }
      
      // Check for conflicts
      checkForConflicts();
      
      setIsLoading(false);
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, [propertyId, crdtManager, conflictManager]);
  
  /**
   * Check for conflicts
   */
  const checkForConflicts = useCallback(() => {
    // Get existing conflicts
    const conflicts = conflictManager.getConflictsByDocument(propertyId)
      .filter(conflict => conflict.status === 'detected' || conflict.status === 'pending');
    
    if (conflicts.length > 0) {
      // Use the most recent conflict
      const latestConflict = conflicts.sort((a, b) => b.detectedAt - a.detectedAt)[0];
      
      // Set states
      setLocalState(latestConflict.localDoc);
      setRemoteState(latestConflict.remoteDoc);
      setHasConflict(true);
      setSyncStatus(SyncStatus.CONFLICT);
    } else {
      setHasConflict(false);
    }
  }, [propertyId, conflictManager]);
  
  /**
   * Update document locally
   */
  const updateLocal = useCallback(async (data: Partial<PropertyDocState>) => {
    try {
      // Get current document data
      const currentData = await crdtManager.getDocumentData(propertyId);
      
      // Merge with new data
      const newData = {
        ...currentData,
        ...data,
        id: propertyId // Ensure ID doesn't change
      };
      
      // Update document
      await crdtManager.setDocumentData(propertyId, newData, {
        userId,
        updateMetadata: true
      });
      
      // Update local state
      setLocalState(newData);
      
      // Update shared state if no conflict
      if (!hasConflict) {
        setSharedState(newData);
      }
      
      // Get document metadata
      const metadata = crdtManager.getDocumentMetadata(propertyId);
      
      if (metadata) {
        setSyncStatus(metadata.syncStatus);
      }
    } catch (err) {
      setError(err as Error);
    }
  }, [propertyId, crdtManager, userId, hasConflict]);
  
  /**
   * Sync document with remote
   */
  const syncWithRemote = useCallback(async () => {
    try {
      // Check if document exists
      const exists = await crdtManager.hasDocument(propertyId);
      
      if (!exists) {
        throw new Error(`Document not found: ${propertyId}`);
      }
      
      // Update sync status
      const metadata = crdtManager.getDocumentMetadata(propertyId);
      
      if (metadata) {
        metadata.syncStatus = SyncStatus.SYNCING;
        await crdtManager.updateDocumentMetadata(propertyId, metadata);
        setSyncStatus(SyncStatus.SYNCING);
      }
      
      // Get updates
      const updates = crdtManager.getUpdates(propertyId);
      
      if (!updates) {
        throw new Error(`No updates available for document: ${propertyId}`);
      }
      
      // Send updates to server
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Document-ID': propertyId
        },
        body: updates
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      // Get remote updates
      const remoteUpdates = await response.arrayBuffer();
      
      if (remoteUpdates.byteLength > 0) {
        // Get local data before applying updates
        const localData = await crdtManager.getDocumentData(propertyId);
        
        // Apply remote updates
        await crdtManager.applyUpdates(propertyId, new Uint8Array(remoteUpdates), {
          userId,
          origin: 'remote'
        });
        
        // Get updated data
        const updatedData = await crdtManager.getDocumentData(propertyId);
        
        // Check for conflicts
        if (json.stringify(localData) !== json.stringify(updatedData)) {
          // Detect conflict
          const conflict = conflictManager.detectConflict(
            propertyId,
            localData,
            updatedData,
            userId
          );
          
          if (conflict) {
            // Set states
            setLocalState(conflict.localDoc);
            setRemoteState(conflict.remoteDoc);
            setHasConflict(true);
            
            // Update metadata
            if (metadata) {
              metadata.syncStatus = SyncStatus.CONFLICT;
              await crdtManager.updateDocumentMetadata(propertyId, metadata);
              setSyncStatus(SyncStatus.CONFLICT);
            }
            
            return false;
          }
        }
        
        // Update local state
        setLocalState(updatedData);
        
        // Update shared state
        setSharedState(updatedData);
      }
      
      // Update metadata
      if (metadata) {
        metadata.syncStatus = SyncStatus.SYNCED;
        metadata.lastSynced = Date.now();
        await crdtManager.updateDocumentMetadata(propertyId, metadata);
        setSyncStatus(SyncStatus.SYNCED);
      }
      
      return true;
    } catch (err) {
      // Update error state
      setError(err as Error);
      
      // Update metadata
      const metadata = crdtManager.getDocumentMetadata(propertyId);
      
      if (metadata) {
        metadata.syncStatus = SyncStatus.FAILED;
        await crdtManager.updateDocumentMetadata(propertyId, metadata);
        setSyncStatus(SyncStatus.FAILED);
      }
      
      return false;
    }
  }, [propertyId, crdtManager, conflictManager, userId, apiEndpoint]);
  
  /**
   * Resolve conflict
   */
  const resolveConflict = useCallback(async (data: PropertyDocState) => {
    try {
      // Get conflicts
      const conflicts = conflictManager.getConflictsByDocument(propertyId)
        .filter(conflict => conflict.status === 'detected' || conflict.status === 'pending');
      
      if (conflicts.length === 0) {
        throw new Error('No conflict to resolve');
      }
      
      // Use the most recent conflict
      const latestConflict = conflicts.sort((a, b) => b.detectedAt - a.detectedAt)[0];
      
      // Resolve conflict
      const result = await conflictManager.resolveConflict(
        latestConflict.id,
        ResolutionStrategy.CUSTOM,
        userId,
        data
      );
      
      if (!result.success) {
        throw new Error('Failed to resolve conflict');
      }
      
      // Update document with resolved data
      await crdtManager.setDocumentData(propertyId, data, {
        userId,
        updateMetadata: true
      });
      
      // Update local state
      setLocalState(data);
      
      // Update shared state
      setSharedState(data);
      
      // Reset conflict state
      setRemoteState(null);
      setHasConflict(false);
      
      // Update metadata
      const metadata = crdtManager.getDocumentMetadata(propertyId);
      
      if (metadata) {
        metadata.syncStatus = SyncStatus.UNSYNCED;
        await crdtManager.updateDocumentMetadata(propertyId, metadata);
        setSyncStatus(SyncStatus.UNSYNCED);
      }
      
      // Sync with remote
      await syncWithRemote();
    } catch (err) {
      setError(err as Error);
    }
  }, [propertyId, crdtManager, conflictManager, userId, syncWithRemote]);
  
  /**
   * Initialize
   */
  useEffect(() => {
    loadDocumentData();
    
    // Set up observer
    let unsubscribe: (() => void) | undefined;
    
    const setupObserver = async () => {
      try {
        unsubscribe = await crdtManager.observeDocument(propertyId, (update, origin) => {
          // Skip updates from this client
          if (origin === 'local') {
            return;
          }
          
          // Reload document data
          loadDocumentData();
        });
      } catch (err) {
        console.error('Failed to set up observer:', err);
      }
    };
    
    setupObserver();
    
    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [propertyId, crdtManager, loadDocumentData]);
  
  return {
    local: localState,
    remote: remoteState,
    shared: hasConflict ? localState : sharedState,
    isLoading,
    error,
    syncStatus,
    hasConflict,
    updateLocal,
    syncWithRemote,
    resolveConflict
  };
}
/**
 * usePropertyDoc Hook
 * 
 * A React hook that provides property document management with CRDT support,
 * including conflict detection and resolution.
 */

import { useState, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { deepEqual } from 'lib0/json';
import { CRDTDocumentManager, SyncStatus } from '../crdt-sync';
import { ConflictResolutionManager, ResolutionStrategy } from '../conflict-resolution';

/**
 * Property document state type
 */
export interface PropertyDocState {
  id: string;
  address?: string;
  owner?: string;
  value?: number;
  lastInspection?: string;
  notes?: string;
  features?: string[];
  [key: string]: any;
}

/**
 * Property document with conflict state
 */
export interface PropertyDocWithConflict {
  /** Shared document state (no conflicts) */
  shared: PropertyDocState;
  /** Local document state */
  local: PropertyDocState;
  /** Remote document state (if conflict exists) */
  remote: PropertyDocState | null;
  /** Whether there's a conflict */
  hasConflict: boolean;
  /** Resolve a conflict */
  resolveConflict: (merged: PropertyDocState) => Promise<void>;
  /** Synchronization status */
  syncStatus: SyncStatus;
  /** Whether the document is loading */
  isLoading: boolean;
  /** Whether there was an error loading the document */
  error: Error | null;
}

// Create a Yjs document instance
const createYDoc = (docId: string) => {
  return new Y.Doc({ guid: docId });
};

// Clone a Yjs document and apply an update
const applyUpdateToClone = (doc: Y.Doc, update: Uint8Array): any => {
  const clone = new Y.Doc({ guid: doc.guid });
  Y.applyUpdate(clone, update);
  return getStateFromYDoc(clone);
};

// Get state from a Yjs document
const getStateFromYDoc = (doc: Y.Doc): PropertyDocState => {
  const map = doc.getMap('data');
  const result: PropertyDocState = { id: doc.guid };
  
  map.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
};

// Apply state to a Yjs document
const applyStateToYDoc = (doc: Y.Doc, state: PropertyDocState): void => {
  const map = doc.getMap('data');
  
  doc.transact(() => {
    Object.entries(state).forEach(([key, value]) => {
      if (key !== 'id') {
        map.set(key, value);
      }
    });
  });
};

/**
 * Hook for working with property documents with CRDT support.
 * 
 * @param propertyId - The property ID
 * @param crdtManager - The CRDT document manager
 * @param conflictManager - The conflict resolution manager
 * @param options - Additional options
 * @returns Property document with conflict state
 */
export function usePropertyDoc(
  propertyId: string,
  crdtManager: CRDTDocumentManager,
  conflictManager: ConflictResolutionManager,
  options: {
    userId?: string;
    autoResolveStrategy?: ResolutionStrategy;
  } = {}
): PropertyDocWithConflict {
  const { userId = 'anonymous', autoResolveStrategy } = options;
  
  // State
  const [ydoc, setYDoc] = useState<Y.Doc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [conflict, setConflict] = useState(false);
  const [remoteSnapshot, setRemoteSnapshot] = useState<PropertyDocState | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.UNSYNCED);
  
  // Load the document
  useEffect(() => {
    let mounted = true;
    
    const loadDoc = async () => {
      try {
        setIsLoading(true);
        
        // Check if the document exists
        const exists = await crdtManager.hasDocument(propertyId);
        
        if (exists) {
          // Get document from CRDT manager
          const doc = await crdtManager.getDocument(propertyId);
          
          if (mounted) {
            setYDoc(doc);
            
            // Get metadata
            const metadata = crdtManager.getDocumentMetadata(propertyId);
            if (metadata) {
              setSyncStatus(metadata.syncStatus);
            }
            
            setIsLoading(false);
          }
        } else {
          // Create a new document
          const doc = await crdtManager.createDocument(propertyId, { id: propertyId });
          
          if (mounted) {
            setYDoc(doc);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('Error loading property document:', err);
        
        if (mounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };
    
    loadDoc();
    
    return () => {
      mounted = false;
    };
  }, [propertyId, crdtManager]);
  
  // Listen for document changes
  useEffect(() => {
    if (!ydoc) return;
    
    // Observer function
    const handleDocUpdate = () => {
      // Check for conflicts
      const unresolved = conflictManager.getUnresolvedConflictsForDocument(propertyId);
      
      if (unresolved.length > 0) {
        // There are conflicts
        setConflict(true);
        
        // If there's an auto-resolve strategy, use it
        if (autoResolveStrategy) {
          unresolved.forEach(conflict => {
            conflictManager.resolveConflict(conflict.id, autoResolveStrategy, userId);
          });
        } else {
          // Get remote state from the first conflict
          const firstConflict = unresolved[0];
          setRemoteSnapshot(firstConflict.remoteValue);
        }
      } else {
        // No conflicts
        setConflict(false);
        setRemoteSnapshot(null);
      }
    };
    
    // Subscribe to changes
    const observeCallback = () => {
      handleDocUpdate();
    };
    
    ydoc.on('update', observeCallback);
    
    // Initial check
    handleDocUpdate();
    
    return () => {
      ydoc.off('update', observeCallback);
    };
  }, [ydoc, propertyId, conflictManager, userId, autoResolveStrategy]);
  
  // Listen for sync status changes
  useEffect(() => {
    if (!ydoc) return;
    
    const handleMetadataUpdate = ({ docId, metadata }: any) => {
      if (docId === propertyId) {
        setSyncStatus(metadata.syncStatus);
      }
    };
    
    crdtManager.on('metadata:updated', handleMetadataUpdate);
    
    return () => {
      crdtManager.off('metadata:updated', handleMetadataUpdate);
    };
  }, [ydoc, propertyId, crdtManager]);
  
  // Subscribe to remote updates
  useEffect(() => {
    if (!ydoc) return;
    
    const handleRemoteUpdate = async ({ docId, updates }: any) => {
      if (docId === propertyId) {
        // Get local state
        const localState = getStateFromYDoc(ydoc);
        
        // Apply update to a clone to get remote state
        const remoteState = applyUpdateToClone(ydoc, updates);
        
        // Check if there's a conflict
        if (!deepEqual(localState, remoteState)) {
          setConflict(true);
          setRemoteSnapshot(remoteState);
        }
      }
    };
    
    crdtManager.on('remote:update', handleRemoteUpdate);
    
    return () => {
      crdtManager.off('remote:update', handleRemoteUpdate);
    };
  }, [ydoc, propertyId, crdtManager]);
  
  // Resolve conflict
  const resolveConflict = useCallback(async (merged: PropertyDocState) => {
    if (!ydoc) return;
    
    try {
      // Apply merged state to the Yjs document
      applyStateToYDoc(ydoc, merged);
      
      // Save document
      await crdtManager.saveDocument(propertyId);
      
      // Clear conflict
      setConflict(false);
      setRemoteSnapshot(null);
      
      // Push update
      const updates = crdtManager.getUpdates(propertyId);
      if (updates) {
        // This would typically be done by the sync manager
        console.log('Pushing updates to server');
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
    }
  }, [ydoc, propertyId, crdtManager]);
  
  // Get current state
  const sharedState: PropertyDocState = ydoc 
    ? getStateFromYDoc(ydoc) 
    : { id: propertyId };
  
  // Return document state
  return {
    shared: sharedState,
    local: sharedState, // In a real implementation, this might differ from shared during local edits
    remote: remoteSnapshot,
    hasConflict: conflict,
    resolveConflict,
    syncStatus,
    isLoading,
    error
  };
}

export default usePropertyDoc;
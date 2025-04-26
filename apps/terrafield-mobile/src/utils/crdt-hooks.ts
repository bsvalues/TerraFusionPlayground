/**
 * CRDT Hooks for Mobile
 * 
 * Specialized hooks for mobile CRDT handling with Realm persistence
 */

import { useState, useEffect, useMemo } from 'react';
import * as Y from 'yjs';
import { loadYDoc, saveYDoc } from '../realm-adapter';
import { addToSyncQueue } from '../sync-manager';

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
   * Property features
   */
  features?: string[];
  
  /**
   * Property notes
   */
  notes?: string;
  
  /**
   * Last modified timestamp
   */
  modifiedAt?: number;
  
  /**
   * Last modified by
   */
  modifiedBy?: string;
}

/**
 * Sync status enum
 */
export enum SyncStatus {
  SYNCED = 'SYNCED',
  SYNCING = 'SYNCING',
  UNSYNCED = 'UNSYNCED',
  CONFLICT = 'CONFLICT',
  FAILED = 'FAILED'
}

/**
 * Mobile property document hook options
 */
export interface MobilePropertyDocOptions {
  /**
   * Auto sync enabled
   */
  autoSync?: boolean;
  
  /**
   * Auto sync interval in milliseconds
   */
  autoSyncInterval?: number;
  
  /**
   * User ID
   */
  userId?: string;
  
  /**
   * API endpoint
   */
  apiEndpoint?: string;
}

/**
 * Mobile property document hook for handling CRDT with Realm persistence
 * 
 * @param propertyId Property ID
 * @param options Hook options
 * @returns Property document state and methods
 */
export function useMobilePropertyDoc(
  propertyId: string,
  options: MobilePropertyDocOptions = {}
) {
  // Hook options with defaults
  const {
    autoSync = true,
    autoSyncInterval = 30000,
    userId = 'anonymous',
    apiEndpoint = '/api/mobile-sync'
  } = options;
  
  // Yjs document
  const ydoc = useMemo(() => new Y.Doc(), []);
  
  // Shared state
  const [shared, setShared] = useState<any>({});
  
  // Local state
  const [local, setLocal] = useState<any>({});
  
  // Remote state
  const [remote, setRemote] = useState<any>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Error state
  const [error, setError] = useState<Error | null>(null);
  
  // Sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.UNSYNCED);
  
  // Conflict state
  const [hasConflict, setHasConflict] = useState(false);

  // Initialize document
  useEffect(() => {
    let isMounted = true;
    
    const initDoc = async () => {
      try {
        setIsLoading(true);
        
        // Load document from Realm
        const savedDoc = await loadYDoc(propertyId);
        
        if (savedDoc) {
          console.log(`Loaded document ${propertyId} from Realm`);
          Y.applyUpdate(ydoc, savedDoc);
        } else {
          console.log(`No saved document found for ${propertyId}, creating new document`);
          
          // Initialize property map with ID
          const propertyMap = ydoc.getMap('property');
          propertyMap.set('id', propertyId);
        }
        
        // Get property map
        const propertyMap = ydoc.getMap('property');
        
        // Set shared state
        if (isMounted) {
          setShared(propertyMap.toJSON());
          setLocal(propertyMap.toJSON());
          setIsLoading(false);
          setSyncStatus(SyncStatus.SYNCED);
        }
      } catch (err) {
        console.error(`Error initializing document ${propertyId}:`, err);
        
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
          setSyncStatus(SyncStatus.FAILED);
        }
      }
    };
    
    initDoc();
    
    return () => {
      isMounted = false;
    };
  }, [propertyId, ydoc]);
  
  // Watch for document changes and save to Realm
  useEffect(() => {
    const observer = () => {
      const propertyMap = ydoc.getMap('property');
      const currentValue = propertyMap.toJSON();
      
      // Update shared and local state
      setShared(currentValue);
      setLocal(currentValue);
      
      // Set sync status
      setSyncStatus(SyncStatus.UNSYNCED);
      
      // Save to Realm
      saveYDoc(propertyId, ydoc).catch(err => {
        console.error(`Error saving document ${propertyId} to Realm:`, err);
      });
    };
    
    // Observe document changes
    ydoc.on('update', observer);
    
    return () => {
      ydoc.off('update', observer);
    };
  }, [propertyId, ydoc]);
  
  // Auto sync
  useEffect(() => {
    if (!autoSync) return;
    
    const intervalId = setInterval(() => {
      if (syncStatus === SyncStatus.UNSYNCED) {
        syncWithRemote();
      }
    }, autoSyncInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [autoSync, autoSyncInterval, syncStatus]);
  
  // Update document
  const updateDoc = (data: Partial<PropertyDocState>) => {
    try {
      // Skip if no changes
      if (Object.keys(data).length === 0) return;
      
      // Update document
      ydoc.transact(() => {
        const propertyMap = ydoc.getMap('property');
        
        // Update fields
        Object.entries(data).forEach(([key, value]) => {
          propertyMap.set(key, value);
        });
        
        // Add metadata
        propertyMap.set('modifiedAt', Date.now());
        propertyMap.set('modifiedBy', userId);
      });
      
      setSyncStatus(SyncStatus.UNSYNCED);
    } catch (err) {
      console.error('Error updating document:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };
  
  // Debounced update
  const debouncedUpdate = (data: Partial<PropertyDocState>) => {
    // Simple debounce - in a real app, you'd use a proper debounce function
    setTimeout(() => {
      updateDoc(data);
    }, 300);
  };
  
  // Sync with remote
  const syncWithRemote = async () => {
    try {
      setSyncStatus(SyncStatus.SYNCING);
      
      // Encode Yjs document state
      const update = Y.encodeStateAsUpdate(ydoc);
      
      // Queue sync operation
      await addToSyncQueue({
        id: propertyId,
        endpoint: `${apiEndpoint}/${propertyId}`,
        data: {
          propertyId,
          update: Array.from(update),
          userId
        }
      });
      
      setSyncStatus(SyncStatus.SYNCED);
    } catch (err) {
      console.error('Error syncing with remote:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setSyncStatus(SyncStatus.FAILED);
    }
  };
  
  // Handle remote update
  const handleRemoteUpdate = (remoteUpdate: Uint8Array) => {
    try {
      // Create a new document with remote state
      const remoteDoc = new Y.Doc();
      Y.applyUpdate(remoteDoc, remoteUpdate);
      
      // Get remote property map
      const remotePropertyMap = remoteDoc.getMap('property').toJSON();
      
      // Check for conflicts
      if (!deepEqual(local, remotePropertyMap)) {
        setRemote(remotePropertyMap);
        setHasConflict(true);
        setSyncStatus(SyncStatus.CONFLICT);
      } else {
        // No conflict, apply update
        Y.applyUpdate(ydoc, remoteUpdate);
        setSyncStatus(SyncStatus.SYNCED);
      }
    } catch (err) {
      console.error('Error handling remote update:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };
  
  // Resolve conflict
  const resolveConflict = (resolvedData: PropertyDocState) => {
    try {
      // Update document with resolved data
      ydoc.transact(() => {
        const propertyMap = ydoc.getMap('property');
        
        // Clear existing data
        propertyMap.clear();
        
        // Set resolved data
        Object.entries(resolvedData).forEach(([key, value]) => {
          propertyMap.set(key, value);
        });
        
        // Add metadata
        propertyMap.set('modifiedAt', Date.now());
        propertyMap.set('modifiedBy', userId);
        propertyMap.set('resolvedAt', Date.now());
        propertyMap.set('resolvedBy', userId);
      });
      
      // Reset conflict state
      setHasConflict(false);
      setRemote(null);
      
      // Sync with remote
      syncWithRemote();
    } catch (err) {
      console.error('Error resolving conflict:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };
  
  // Reset error
  const resetError = () => {
    setError(null);
  };
  
  return {
    ydoc,
    shared,
    local,
    remote,
    isLoading,
    error,
    syncStatus,
    hasConflict,
    updateDoc,
    debouncedUpdate,
    syncWithRemote,
    handleRemoteUpdate,
    resolveConflict,
    resetError
  };
}

/**
 * Helper function to check if two values are deeply equal
 * 
 * @param a First value
 * @param b Second value
 * @returns Whether the values are deeply equal
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    
    return true;
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
}
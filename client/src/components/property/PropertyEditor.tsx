/**
 * PropertyEditor
 * 
 * A component for editing property data with conflict resolution.
 */

import React, { useState, useEffect } from 'react';

// Import from packages
import { usePropertyDoc } from '@terrafusion/offline-sync/src/hooks';
import { ConflictManager } from '@terrafusion/ui-components/src/conflict-resolution';
import { CRDTDocumentManager, SyncStatus } from '@terrafusion/offline-sync/src/crdt-sync';
import { ConflictResolutionManager } from '@terrafusion/offline-sync/src/conflict-resolution';
import { IndexedDBStorageProvider } from '@terrafusion/offline-sync/src/storage';

// Import local components
import PropertyForm from './PropertyForm';

/**
 * PropertyEditor props interface
 */
export interface PropertyEditorProps {
  /**
   * Property ID
   */
  propertyId: string;
  
  /**
   * User ID (for tracking who made changes)
   */
  userId?: string;
  
  /**
   * API endpoint for syncing
   */
  apiEndpoint?: string;
  
  /**
   * CRDT document manager (if not provided, one will be created)
   */
  crdtManager?: CRDTDocumentManager;
  
  /**
   * Conflict resolution manager (if not provided, one will be created)
   */
  conflictManager?: ConflictResolutionManager;
  
  /**
   * Storage provider (if not provided, one will be created)
   */
  storageProvider?: IndexedDBStorageProvider;
  
  /**
   * Initial property data (optional)
   */
  initialData?: any;
  
  /**
   * Whether the component is in read-only mode
   */
  readOnly?: boolean;
  
  /**
   * On save callback
   */
  onSave?: (data: any) => void;
}

/**
 * PropertyEditor component
 */
export const PropertyEditor: React.FC<PropertyEditorProps> = ({
  propertyId,
  userId = 'anonymous',
  apiEndpoint = '/api/sync',
  crdtManager,
  conflictManager,
  storageProvider,
  initialData,
  readOnly = false,
  onSave
}) => {
  // Set up state for managers if not provided
  const [internalStorageProvider] = useState(() => 
    storageProvider || new IndexedDBStorageProvider('terrafusion_property_editor')
  );
  
  const [internalCrdtManager] = useState(() => 
    crdtManager || new CRDTDocumentManager(internalStorageProvider)
  );
  
  const [internalConflictManager] = useState(() => 
    conflictManager || new ConflictResolutionManager()
  );
  
  // Use our property document hook
  const {
    local: localState,
    remote: remoteState,
    shared: sharedState,
    isLoading,
    error,
    syncStatus,
    hasConflict,
    updateLocal,
    syncWithRemote,
    resolveConflict
  } = usePropertyDoc(
    propertyId,
    internalCrdtManager,
    internalConflictManager,
    {
      userId,
      apiEndpoint
    }
  );
  
  // Initialize with initial data if provided
  useEffect(() => {
    if (initialData && !isLoading && Object.keys(sharedState).length <= 1) {
      updateLocal({
        ...initialData,
        id: propertyId
      });
    }
  }, [initialData, propertyId, isLoading, sharedState, updateLocal]);
  
  // Handle form changes
  const handleChange = async (data: any) => {
    await updateLocal(data);
    
    if (onSave) {
      onSave({
        ...sharedState,
        ...data
      });
    }
  };
  
  // Handle conflict resolution
  const handleResolveConflict = async (mergedState: any) => {
    await resolveConflict(mergedState);
    
    if (onSave) {
      onSave(mergedState);
    }
  };
  
  // Handle sync
  const handleSync = async () => {
    await syncWithRemote();
  };
  
  // If there's an error, display it
  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 text-red-600">
        <h3 className="font-bold mb-2">Error</h3>
        <p>{error.message}</p>
      </div>
    );
  }
  
  // If we're loading, show a loading indicator
  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-white shadow-sm">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  // If there's a conflict, show the conflict manager
  if (hasConflict && remoteState) {
    return (
      <div className="p-4 border rounded-lg bg-white shadow-sm">
        <ConflictManager
          localState={localState}
          remoteState={remoteState}
          onResolve={handleResolveConflict}
          onCancel={() => {}}
        />
      </div>
    );
  }
  
  // Otherwise, show the form
  return (
    <PropertyForm
      property={sharedState}
      isLoading={isLoading}
      readOnly={readOnly}
      syncStatus={syncStatus}
      onChange={handleChange}
      onSync={handleSync}
    />
  );
};

export default PropertyEditor;
/**
 * PropertyEditor Component
 * 
 * A component for editing property details with CRDT-based offline sync and
 * built-in conflict resolution.
 */

import React, { useState, useEffect } from 'react';
import { usePropertyDoc } from '@terrafusion/offline-sync';
import { ConflictManager } from '@terrafusion/ui-components/conflict-resolution';
import { CRDTDocumentManager } from '@terrafusion/offline-sync/src/crdt-sync';
import { ConflictResolutionManager } from '@terrafusion/offline-sync/src/conflict-resolution';
import { LocalStorageProvider } from '@terrafusion/offline-sync/src/storage';

// Placeholder for the actual form component that would be used in a real app
import { PropertyForm } from './PropertyForm';

// Create singleton instances of required managers
const storageProvider = new LocalStorageProvider();
const crdtManager = new CRDTDocumentManager(storageProvider);
const conflictManager = new ConflictResolutionManager();

interface PropertyEditorProps {
  propertyId: string;
  userId?: string;
  onSave?: (data: any) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

/**
 * Property Editor Component
 */
export const PropertyEditor: React.FC<PropertyEditorProps> = ({
  propertyId,
  userId = 'anonymous',
  onSave,
  onCancel,
  readOnly = false
}) => {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize managers if needed
  useEffect(() => {
    const initializeManagers = async () => {
      try {
        // Check if document exists
        const exists = await crdtManager.hasDocument(propertyId);
        
        if (!exists) {
          // Create initial document with default data
          await crdtManager.createDocument(propertyId, { 
            id: propertyId,
            address: '',
            owner: '',
            value: 0,
            lastInspection: '',
            notes: '',
            features: []
          });
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing property editor:', error);
      }
    };

    if (!isInitialized) {
      initializeManagers();
    }
  }, [propertyId, isInitialized]);

  // Use the property document hook
  const propertyDoc = usePropertyDoc(
    propertyId,
    crdtManager,
    conflictManager,
    { userId }
  );

  // Handle form submission
  const handleSubmit = async (data: any) => {
    try {
      // Get the document
      const doc = await crdtManager.getDocument(propertyId);
      
      // Apply changes
      const map = doc.getMap('data');
      
      doc.transact(() => {
        Object.entries(data).forEach(([key, value]) => {
          if (key !== 'id') {
            map.set(key, value);
          }
        });
      });
      
      // Save document
      await crdtManager.saveDocument(propertyId);
      
      // Call onSave callback if provided
      if (onSave) {
        onSave(data);
      }
    } catch (error) {
      console.error('Error saving property:', error);
    }
  };

  // Show loading state
  if (propertyDoc.isLoading || !isInitialized) {
    return <div className="p-4">Loading property data...</div>;
  }

  // Show error state
  if (propertyDoc.error) {
    return (
      <div className="p-4 text-red-500">
        Error loading property: {propertyDoc.error.message}
      </div>
    );
  }

  // Show conflict resolution UI if there's a conflict
  if (propertyDoc.hasConflict && propertyDoc.remote) {
    return (
      <ConflictManager
        localState={propertyDoc.local}
        remoteState={propertyDoc.remote}
        onResolve={(mergedState) => {
          propertyDoc.resolveConflict(mergedState);
        }}
        onCancel={onCancel}
      />
    );
  }

  // Show standard property form
  return (
    <PropertyForm
      data={propertyDoc.shared}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      readOnly={readOnly}
      syncStatus={propertyDoc.syncStatus}
    />
  );
};

export default PropertyEditor;
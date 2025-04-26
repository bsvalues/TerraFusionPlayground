/**
 * Conflict Resolution Example
 * 
 * An example component that demonstrates how to use the conflict resolution components
 * in a real application.
 */

import React, { useState, useEffect } from 'react';
import { createStorageManager } from '@terrafusion/offline-sync/src/storage';
import { 
  createConflictResolutionManager, 
  ConflictType, 
  ResolutionStrategy 
} from '@terrafusion/offline-sync/src/conflict-resolution';
import { createCRDTDocumentManager } from '@terrafusion/offline-sync/src/crdt-sync';
import { ConflictManager } from '../ConflictManager';
import { ConflictBadge } from '../ConflictBadge';

// Mock sample data - In a real app, this would come from your app's state
const SAMPLE_USER = {
  id: 'user-1',
  name: 'John Doe',
  role: 'Field Inspector'
};

// Sample property data with conflict
const SAMPLE_PROPERTY_LOCAL = {
  id: 'property-123',
  address: '123 Main St',
  owner: 'Jane Smith',
  value: 450000,
  lastInspection: '2025-03-15',
  notes: 'Property in good condition',
  features: ['garage', 'porch', 'basement']
};

const SAMPLE_PROPERTY_REMOTE = {
  id: 'property-123',
  address: '123 Main Street', // Modified
  owner: 'Jane Smith-Johnson', // Modified
  value: 475000, // Modified
  lastInspection: '2025-04-05', // Modified
  notes: 'Property in good condition, new roof installed',
  features: ['garage', 'porch', 'basement', 'new roof'] // Modified
};

/**
 * Example component
 */
export const ConflictResolutionExample: React.FC = () => {
  // State for managers
  const [storage, setStorage] = useState<any>(null);
  const [crdtManager, setCrdtManager] = useState<any>(null);
  const [conflictManager, setConflictManager] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [propertyData, setPropertyData] = useState(SAMPLE_PROPERTY_LOCAL);
  
  // Initialize managers
  useEffect(() => {
    const init = async () => {
      // In a real app, you'd initialize these with your app's configuration
      const storageManager = await createStorageManager();
      const crdtDocManager = await createCRDTDocumentManager(storageManager);
      const conflictResManager = createConflictResolutionManager(crdtDocManager, storageManager);
      
      // Store the managers
      setStorage(storageManager);
      setCrdtManager(crdtDocManager);
      setConflictManager(conflictResManager);
      
      // Initialize and create sample documents
      await crdtDocManager.initialize();
      await conflictResManager.initialize();
      
      // Create a sample document with conflicts
      if (!(await crdtDocManager.hasDocument('property-123'))) {
        await crdtDocManager.createDocument('property-123', SAMPLE_PROPERTY_LOCAL);
      }
      
      // Simulate some conflicts
      simulateConflicts(conflictResManager);
      
      setIsReady(true);
    };
    
    init();
  }, []);
  
  // Simulate conflicts for the example
  const simulateConflicts = (manager: any) => {
    // In a real app, these conflicts would be detected by the CRDT system
    // Here we're manually creating them for demonstration purposes
    
    // Address conflict
    manager.detectConflicts(
      'property-123',
      SAMPLE_PROPERTY_LOCAL.address,
      SAMPLE_PROPERTY_REMOTE.address,
      'address'
    );
    
    // Owner conflict
    manager.detectConflicts(
      'property-123',
      SAMPLE_PROPERTY_LOCAL.owner,
      SAMPLE_PROPERTY_REMOTE.owner,
      'owner'
    );
    
    // Value conflict
    manager.detectConflicts(
      'property-123',
      SAMPLE_PROPERTY_LOCAL.value,
      SAMPLE_PROPERTY_REMOTE.value,
      'value'
    );
    
    // Last inspection conflict
    manager.detectConflicts(
      'property-123',
      SAMPLE_PROPERTY_LOCAL.lastInspection,
      SAMPLE_PROPERTY_REMOTE.lastInspection,
      'lastInspection'
    );
    
    // Notes conflict
    manager.detectConflicts(
      'property-123',
      SAMPLE_PROPERTY_LOCAL.notes,
      SAMPLE_PROPERTY_REMOTE.notes,
      'notes'
    );
    
    // Features conflict
    manager.detectConflicts(
      'property-123',
      SAMPLE_PROPERTY_LOCAL.features,
      SAMPLE_PROPERTY_REMOTE.features,
      'features'
    );
  };
  
  // Handle conflict resolution
  const handleConflictResolved = () => {
    // In a real app, this would update your app's state after conflicts are resolved
    console.log('Conflict resolved!');
    
    // Reload the property data
    if (crdtManager) {
      const updatedData = crdtManager.getDocument('property-123');
      if (updatedData) {
        setPropertyData(updatedData);
      }
    }
  };
  
  if (!isReady) {
    return (
      <div className="p-8 text-center">
        <p>Initializing conflict resolution system...</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Property Details</h1>
          
          {/* Conflict manager with badge */}
          {conflictManager && (
            <ConflictManager
              conflictManager={conflictManager}
              userId={SAMPLE_USER.id}
              documentId="property-123"
              autoOpenModal={false}
            >
              <button
                className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleConflictResolved}
              >
                Reload After Resolution
              </button>
            </ConflictManager>
          )}
        </div>
        
        <div className="mt-2 flex items-center text-gray-600">
          <span className="mr-4">User: {SAMPLE_USER.name}</span>
          <span>Role: {SAMPLE_USER.role}</span>
        </div>
      </header>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          Property Information
          {conflictManager && (
            <ConflictBadge
              count={conflictManager.getUnresolvedConflictsForDocument('property-123').length}
              className="ml-2"
            />
          )}
        </h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Property ID</label>
            <div className="p-2 bg-gray-50 rounded">{propertyData.id}</div>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-1">Address</label>
            <div className="p-2 bg-gray-50 rounded">{propertyData.address}</div>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-1">Owner</label>
            <div className="p-2 bg-gray-50 rounded">{propertyData.owner}</div>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-1">Assessed Value</label>
            <div className="p-2 bg-gray-50 rounded">${propertyData.value.toLocaleString()}</div>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-1">Last Inspection</label>
            <div className="p-2 bg-gray-50 rounded">{propertyData.lastInspection}</div>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-1">Notes</label>
            <div className="p-2 bg-gray-50 rounded">{propertyData.notes}</div>
          </div>
          
          <div className="col-span-2">
            <label className="block text-gray-700 font-medium mb-1">Features</label>
            <div className="p-2 bg-gray-50 rounded">
              <div className="flex flex-wrap gap-2">
                {propertyData.features.map((feature: string) => (
                  <span 
                    key={feature}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-600">
        <p>
          <strong>In a real application:</strong> The conflict resolution system would automatically
          detect conflicts when syncing offline changes with the server. This example manually creates
          conflicts for demonstration purposes.
        </p>
        <p className="mt-2">
          Click on the conflict badge to open the resolution dialog. After resolving conflicts,
          click the "Reload After Resolution" button to see the updated data.
        </p>
      </div>
    </div>
  );
};

export default ConflictResolutionExample;
/**
 * ConflictResolutionExample
 * 
 * A component for demonstrating the conflict resolution UI.
 */

import React, { useState } from 'react';

// Import from packages
import { PropertyDocState } from '@terrafusion/offline-sync/src/hooks/usePropertyDoc';
import { LocalStorageProvider } from '@terrafusion/offline-sync/src/storage';
import { CRDTDocumentManager, SyncStatus } from '@terrafusion/offline-sync/src/crdt-sync';
import { 
  ConflictResolutionManager, 
  FieldResolution, 
  ResolutionStrategy 
} from '@terrafusion/offline-sync/src/conflict-resolution';

// Import local components
import { ConflictManager } from '../ConflictManager';

/**
 * Example property states
 */
const exampleLocalState: PropertyDocState = {
  id: 'property-123',
  address: '123 Main St',
  owner: 'John Doe',
  value: 350000,
  lastInspection: '2025-03-15',
  notes: 'Great property with recent renovations. Ready for inspection.',
  features: ['3 bedrooms', '2 bathrooms', 'Garage', 'Garden']
};

const exampleRemoteState: PropertyDocState = {
  id: 'property-123',
  address: '123 Main Street',
  owner: 'Jane Smith',
  value: 375000,
  lastInspection: '2025-04-01',
  notes: 'Property in excellent condition. New roof installed last year.',
  features: ['3 bedrooms', '2 bathrooms', 'Garage', 'Pool']
};

/**
 * ConflictResolutionExample component
 */
export const ConflictResolutionExample: React.FC = () => {
  // Local state for the resolved property
  const [resolvedState, setResolvedState] = useState<PropertyDocState | null>(null);
  const [viewMode, setViewMode] = useState<'conflict' | 'resolved'>('conflict');
  
  // Handle resolve
  const handleResolve = (mergedState: PropertyDocState) => {
    setResolvedState(mergedState);
    setViewMode('resolved');
  };
  
  // Handle cancel
  const handleCancel = () => {
    // Just reset for the example
    setViewMode('conflict');
  };
  
  // Handle reset
  const handleReset = () => {
    setResolvedState(null);
    setViewMode('conflict');
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Conflict Resolution Example</h1>
        <p className="text-gray-600">
          This example demonstrates the conflict resolution UI for property data synchronization.
        </p>
      </div>
      
      {viewMode === 'resolved' && resolvedState ? (
        <div className="space-y-6">
          <div className="bg-green-100 p-4 rounded-md text-green-700 mb-4">
            <h3 className="font-bold mb-2">Conflicts Resolved</h3>
            <p>The conflicts have been successfully resolved with the following data:</p>
          </div>
          
          <div className="border p-4 rounded-lg">
            <h3 className="font-bold mb-2">Resolved Property Data</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">{JSON.stringify(resolvedState, null, 2)}</pre>
          </div>
          
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleReset}
          >
            Go Back to Conflict Example
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border p-4 rounded-lg">
              <h3 className="font-bold mb-2">Local Changes</h3>
              <pre className="bg-blue-50 p-4 rounded overflow-auto">{JSON.stringify(exampleLocalState, null, 2)}</pre>
            </div>
            
            <div className="border p-4 rounded-lg">
              <h3 className="font-bold mb-2">Remote Changes</h3>
              <pre className="bg-purple-50 p-4 rounded overflow-auto">{JSON.stringify(exampleRemoteState, null, 2)}</pre>
            </div>
          </div>
          
          <div className="border p-4 rounded-lg">
            <h3 className="font-bold mb-2">Conflict Resolution UI</h3>
            <div className="mt-4">
              <ConflictManager
                localState={exampleLocalState}
                remoteState={exampleRemoteState}
                onResolve={handleResolve}
                onCancel={handleCancel}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictResolutionExample;
/**
 * ConflictResolutionExample
 * 
 * An example component demonstrating how to use the conflict resolution UI.
 */

import React, { useState, useEffect } from 'react';
import { ConflictManager } from '../ConflictManager';
import { PropertyDocState } from '@terrafusion/offline-sync/src/hooks/usePropertyDoc';
import { LocalStorageProvider } from '@terrafusion/offline-sync/src/storage';
import { CRDTDocumentManager, SyncStatus } from '@terrafusion/offline-sync/src/crdt-sync';
import { ConflictResolutionManager, ResolutionStrategy } from '@terrafusion/offline-sync/src/conflict-resolution';

/**
 * Example Property Document State
 */
const exampleLocalState: PropertyDocState = {
  id: 'property-123',
  address: '123 Main St, Local City',
  owner: 'Local Owner',
  value: 350000,
  lastInspection: '2025-03-15',
  notes: 'Local notes about the property. This text was edited while offline.',
  features: ['3 Bedrooms', '2 Bathrooms', 'Garage', 'Local Feature']
};

/**
 * Example Remote Property Document State
 */
const exampleRemoteState: PropertyDocState = {
  id: 'property-123',
  address: '123 Main St, Server City',
  owner: 'Remote Owner',
  value: 375000,
  lastInspection: '2025-03-20',
  notes: 'Remote notes about the property. This was updated on the server.',
  features: ['3 Bedrooms', '2 Bathrooms', 'Garage', 'Remote Feature']
};

/**
 * Conflict Resolution Example Component
 */
export const ConflictResolutionExample: React.FC = () => {
  const [hasConflict, setHasConflict] = useState(true);
  const [localState, setLocalState] = useState<PropertyDocState>(exampleLocalState);
  const [remoteState, setRemoteState] = useState<PropertyDocState>(exampleRemoteState);
  const [resolvedState, setResolvedState] = useState<PropertyDocState | null>(null);
  const [strategyUsed, setStrategyUsed] = useState<string | null>(null);
  
  // Reset the example
  const handleReset = () => {
    setHasConflict(true);
    setResolvedState(null);
    setStrategyUsed(null);
  };
  
  // Handle conflict resolution
  const handleResolve = (mergedState: PropertyDocState) => {
    setResolvedState(mergedState);
    setHasConflict(false);
    setStrategyUsed('Manual Merge');
  };
  
  // Auto-resolve with a specific strategy
  const autoResolve = (strategy: ResolutionStrategy) => {
    let resolved: PropertyDocState;
    
    switch (strategy) {
      case ResolutionStrategy.KEEP_LOCAL:
        resolved = { ...localState };
        setStrategyUsed('Keep Local');
        break;
      case ResolutionStrategy.ACCEPT_REMOTE:
        resolved = { ...remoteState };
        setStrategyUsed('Accept Remote');
        break;
      case ResolutionStrategy.FIELD_LEVEL:
        // Simple field-level merge taking the most recent values
        resolved = {
          ...localState,
          // Take some fields from remote to demonstrate a merge
          value: remoteState.value,
          lastInspection: remoteState.lastInspection,
          features: [...new Set([...localState.features || [], ...remoteState.features || []])]
        };
        setStrategyUsed('Field-Level Merge');
        break;
      default:
        resolved = { ...localState };
        setStrategyUsed('Default Strategy');
    }
    
    setResolvedState(resolved);
    setHasConflict(false);
  };
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Conflict Resolution Demo</h2>
        <p className="mb-4">
          This example demonstrates how TerraFusion's conflict resolution UI works when
          changes are made both locally and remotely to the same property.
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleReset}
          >
            Reset Example
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => autoResolve(ResolutionStrategy.KEEP_LOCAL)}
            disabled={!hasConflict}
          >
            Auto-Resolve: Keep Local
          </button>
          <button
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            onClick={() => autoResolve(ResolutionStrategy.ACCEPT_REMOTE)}
            disabled={!hasConflict}
          >
            Auto-Resolve: Accept Remote
          </button>
          <button
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            onClick={() => autoResolve(ResolutionStrategy.FIELD_LEVEL)}
            disabled={!hasConflict}
          >
            Auto-Resolve: Field-Level Merge
          </button>
        </div>
      </div>
      
      {hasConflict ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-orange-100 p-4 border-b">
            <h3 className="text-lg font-semibold text-orange-800">Conflict Detected</h3>
            <p className="text-orange-700">
              Changes were made to this property both locally and on the server.
              Please review the differences and resolve the conflict.
            </p>
          </div>
          
          <ConflictManager
            localState={localState}
            remoteState={remoteState}
            onResolve={handleResolve}
            onCancel={() => {}}
          />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-green-100 p-4 border-b">
            <h3 className="text-lg font-semibold text-green-800">Conflict Resolved</h3>
            <p className="text-green-700">
              The conflict has been resolved using strategy: <strong>{strategyUsed}</strong>
            </p>
          </div>
          
          <div className="p-4">
            <h4 className="font-semibold mb-2">Resolved Property Data:</h4>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(resolvedState, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictResolutionExample;
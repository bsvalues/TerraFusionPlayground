/**
 * ConflictManager
 * 
 * A component for managing data conflicts.
 */

import React, { useState, useMemo } from 'react';
import { deepEqual } from '@terrafusion/offline-sync/src/utils';
import { PropertyDocState } from '@terrafusion/offline-sync/src/hooks/usePropertyDoc';
import { FieldResolution, ResolutionStrategy } from '@terrafusion/offline-sync/src/conflict-resolution';

/**
 * Conflict manager props interface
 */
export interface ConflictManagerProps {
  /**
   * Local state
   */
  localState: PropertyDocState;
  
  /**
   * Remote state
   */
  remoteState: PropertyDocState;
  
  /**
   * Resolve callback
   */
  onResolve: (mergedState: PropertyDocState) => void;
  
  /**
   * Cancel callback
   */
  onCancel: () => void;
}

/**
 * Field conflict interface
 */
interface FieldConflict {
  field: string;
  localValue: any;
  remoteValue: any;
  resolution: FieldResolution;
  label?: string;
}

/**
 * Field labels
 */
const FIELD_LABELS: Record<string, string> = {
  address: 'Address',
  owner: 'Owner',
  value: 'Value',
  lastInspection: 'Last Inspection',
  notes: 'Notes',
  features: 'Features'
};

/**
 * ConflictManager component
 */
export const ConflictManager: React.FC<ConflictManagerProps> = ({
  localState,
  remoteState,
  onResolve,
  onCancel
}) => {
  // Field conflicts
  const fieldConflicts = useMemo(() => {
    const conflicts: FieldConflict[] = [];
    
    // Get all fields
    const allFields = new Set([
      ...Object.keys(localState || {}),
      ...Object.keys(remoteState || {})
    ]);
    
    // Compare fields
    for (const field of allFields) {
      // Skip id field
      if (field === 'id') continue;
      
      // Check if field exists in both
      const inLocal = localState && field in localState;
      const inRemote = remoteState && field in remoteState;
      
      // If field only exists in one, it's a conflict
      if (inLocal !== inRemote) {
        conflicts.push({
          field,
          localValue: inLocal ? localState[field] : undefined,
          remoteValue: inRemote ? remoteState[field] : undefined,
          resolution: FieldResolution.LOCAL,
          label: FIELD_LABELS[field] || field
        });
        continue;
      }
      
      // If values are different, it's a conflict
      if (inLocal && inRemote && !deepEqual(localState[field], remoteState[field])) {
        conflicts.push({
          field,
          localValue: localState[field],
          remoteValue: remoteState[field],
          resolution: FieldResolution.LOCAL,
          label: FIELD_LABELS[field] || field
        });
      }
    }
    
    return conflicts;
  }, [localState, remoteState]);
  
  // Field resolutions
  const [resolutions, setResolutions] = useState<Record<string, FieldResolution>>(
    Object.fromEntries(fieldConflicts.map(conflict => [conflict.field, FieldResolution.LOCAL]))
  );
  
  // Handle resolution change
  const handleResolutionChange = (field: string, resolution: FieldResolution) => {
    setResolutions(prev => ({
      ...prev,
      [field]: resolution
    }));
  };
  
  // Handle resolve with strategy
  const handleResolveWithStrategy = (strategy: ResolutionStrategy) => {
    let mergedState: PropertyDocState;
    
    switch (strategy) {
      case ResolutionStrategy.KEEP_LOCAL:
        mergedState = { ...localState };
        break;
      case ResolutionStrategy.ACCEPT_REMOTE:
        mergedState = { ...remoteState };
        break;
      case ResolutionStrategy.FIELD_LEVEL:
        mergedState = { ...localState };
        
        for (const conflict of fieldConflicts) {
          if (resolutions[conflict.field] === FieldResolution.REMOTE) {
            mergedState[conflict.field] = remoteState[conflict.field];
          }
        }
        break;
      default:
        mergedState = { ...localState };
    }
    
    onResolve(mergedState);
  };
  
  // Format value for display
  const formatValue = (value: any): string => {
    if (value === undefined || value === null) {
      return 'No value';
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'Empty array';
      }
      
      if (typeof value[0] === 'object') {
        return `Array of ${value.length} objects`;
      }
      
      return value.join(', ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    if (typeof value === 'string') {
      if (value.length > 100) {
        return `${value.substring(0, 100)}...`;
      }
      return value;
    }
    
    return String(value);
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Resolve Conflicts</h2>
      
      {fieldConflicts.length === 0 ? (
        <div className="bg-green-100 p-4 rounded-md text-green-700 mb-4">
          No conflicts found between local and remote data.
        </div>
      ) : (
        <>
          <div className="bg-yellow-100 p-4 rounded-md text-yellow-700 mb-4">
            Please resolve the following conflicts to continue.
          </div>
          
          <div className="mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Field</th>
                  <th className="p-2 text-left">Local Value</th>
                  <th className="p-2 text-left">Remote Value</th>
                  <th className="p-2 text-left">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {fieldConflicts.map((conflict) => (
                  <tr key={conflict.field} className="border-b">
                    <td className="p-2 font-medium">{conflict.label}</td>
                    <td className="p-2">
                      <div className="bg-blue-50 p-2 rounded">
                        {formatValue(conflict.localValue)}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="bg-purple-50 p-2 rounded">
                        {formatValue(conflict.remoteValue)}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex">
                        <label className="flex items-center mr-4">
                          <input
                            type="radio"
                            name={`resolution-${conflict.field}`}
                            value="local"
                            checked={resolutions[conflict.field] === FieldResolution.LOCAL}
                            onChange={() => handleResolutionChange(conflict.field, FieldResolution.LOCAL)}
                            className="mr-1"
                          />
                          <span>Local</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`resolution-${conflict.field}`}
                            value="remote"
                            checked={resolutions[conflict.field] === FieldResolution.REMOTE}
                            onChange={() => handleResolutionChange(conflict.field, FieldResolution.REMOTE)}
                            className="mr-1"
                          />
                          <span>Remote</span>
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      
      <div className="flex justify-between">
        <div>
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded mr-2 hover:bg-gray-300"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
        
        <div className="flex">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded mr-2 hover:bg-blue-600"
            onClick={() => handleResolveWithStrategy(ResolutionStrategy.KEEP_LOCAL)}
          >
            Keep All Local
          </button>
          <button
            className="px-4 py-2 bg-purple-500 text-white rounded mr-2 hover:bg-purple-600"
            onClick={() => handleResolveWithStrategy(ResolutionStrategy.ACCEPT_REMOTE)}
          >
            Accept All Remote
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => handleResolveWithStrategy(ResolutionStrategy.FIELD_LEVEL)}
          >
            Apply Selected
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictManager;
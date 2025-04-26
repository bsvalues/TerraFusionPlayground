/**
 * ConflictManager
 * 
 * A component for visualizing and resolving conflicts between local and remote data.
 */

import React, { useState, useEffect } from 'react';
import { FieldResolution, ResolutionStrategy } from '@terrafusion/offline-sync/src/conflict-resolution';

/**
 * ConflictManager props interface
 */
export interface ConflictManagerProps {
  /**
   * Local state
   */
  localState: any;
  
  /**
   * Remote state
   */
  remoteState: any;
  
  /**
   * On resolve callback
   */
  onResolve: (mergedState: any) => void;
  
  /**
   * On cancel callback
   */
  onCancel: () => void;
}

/**
 * ConflictManager component
 */
export const ConflictManager: React.FC<ConflictManagerProps> = ({
  localState,
  remoteState,
  onResolve,
  onCancel
}) => {
  // Field resolutions
  const [fieldResolutions, setFieldResolutions] = useState<Record<string, FieldResolution>>({});
  
  // Selected strategy
  const [strategy, setStrategy] = useState<ResolutionStrategy>(ResolutionStrategy.FIELD_LEVEL);
  
  // Merged state
  const [mergedState, setMergedState] = useState<any>({});
  
  // Get all fields from both states
  const allFields = Array.from(new Set([
    ...Object.keys(localState || {}),
    ...Object.keys(remoteState || {})
  ])).filter(field => field !== 'id'); // Filter out id field
  
  // Initialize field resolutions
  useEffect(() => {
    const initialResolutions: Record<string, FieldResolution> = {};
    
    allFields.forEach(field => {
      if (localState[field] === remoteState[field]) {
        // If values are the same, use local
        initialResolutions[field] = FieldResolution.LOCAL;
      } else if (Array.isArray(localState[field]) && Array.isArray(remoteState[field])) {
        // If both are arrays, use merge
        initialResolutions[field] = FieldResolution.MERGE;
      } else {
        // Otherwise, default to local
        initialResolutions[field] = FieldResolution.LOCAL;
      }
    });
    
    setFieldResolutions(initialResolutions);
  }, [localState, remoteState, allFields]);
  
  // Update merged state when field resolutions change
  useEffect(() => {
    const newMergedState = { ...localState };
    
    allFields.forEach(field => {
      const resolution = fieldResolutions[field] || FieldResolution.LOCAL;
      
      switch (resolution) {
        case FieldResolution.LOCAL:
          // Already using local value
          break;
        case FieldResolution.REMOTE:
          newMergedState[field] = remoteState[field];
          break;
        case FieldResolution.MERGE:
          if (Array.isArray(localState[field]) && Array.isArray(remoteState[field])) {
            // Merge arrays
            const combined = [...localState[field], ...remoteState[field]];
            const deduped = Array.from(new Set(combined));
            newMergedState[field] = deduped;
          } else {
            // Not arrays, use remote
            newMergedState[field] = remoteState[field];
          }
          break;
        default:
          // Default to local
          break;
      }
    });
    
    setMergedState(newMergedState);
  }, [localState, remoteState, fieldResolutions, allFields]);
  
  // Handle field resolution change
  const handleResolutionChange = (field: string, resolution: FieldResolution) => {
    setFieldResolutions(prev => ({
      ...prev,
      [field]: resolution
    }));
  };
  
  // Handle strategy change
  const handleStrategyChange = (newStrategy: ResolutionStrategy) => {
    setStrategy(newStrategy);
    
    // Apply strategy immediately
    switch (newStrategy) {
      case ResolutionStrategy.KEEP_LOCAL:
        setMergedState({ ...localState });
        break;
      case ResolutionStrategy.ACCEPT_REMOTE:
        setMergedState({ ...remoteState });
        break;
      case ResolutionStrategy.AUTO_MERGE:
        // Use current field-level merge as auto merge
        break;
      case ResolutionStrategy.FIELD_LEVEL:
        // Stay with current field resolutions
        break;
      default:
        // Default to field level
        break;
    }
  };
  
  // Handle resolve
  const handleResolve = () => {
    onResolve(mergedState);
  };
  
  // Determine if a field has a conflict
  const hasConflict = (field: string): boolean => {
    // Check if field exists in both states
    const inLocal = field in localState;
    const inRemote = field in remoteState;
    
    // No conflict if only in one state
    if (!inLocal || !inRemote) return false;
    
    // Check if values are different
    if (Array.isArray(localState[field]) && Array.isArray(remoteState[field])) {
      // For arrays, check if they're different
      if (localState[field].length !== remoteState[field].length) return true;
      
      // Check if all elements are the same
      return !localState[field].every((item: any) => remoteState[field].includes(item));
    }
    
    // For other values, check if they're different
    return localState[field] !== remoteState[field];
  };
  
  // Get conflict count
  const conflictCount = allFields.filter(hasConflict).length;
  
  return (
    <div className="space-y-6">
      <div className="bg-yellow-100 p-4 rounded-md text-yellow-700">
        <h3 className="font-bold mb-1">Conflict Detected</h3>
        <p>
          {conflictCount === 0
            ? 'No conflicts detected. You can safely resolve.'
            : `${conflictCount} field${conflictCount === 1 ? '' : 's'} with conflicts detected. Please review and resolve the conflicts.`}
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-bold mb-2">Resolution Strategy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              className={`p-2 border rounded ${strategy === ResolutionStrategy.KEEP_LOCAL ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-100'}`}
              onClick={() => handleStrategyChange(ResolutionStrategy.KEEP_LOCAL)}
            >
              Keep Local Changes
            </button>
            
            <button
              className={`p-2 border rounded ${strategy === ResolutionStrategy.ACCEPT_REMOTE ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-100'}`}
              onClick={() => handleStrategyChange(ResolutionStrategy.ACCEPT_REMOTE)}
            >
              Accept Remote Changes
            </button>
            
            <button
              className={`p-2 border rounded ${strategy === ResolutionStrategy.AUTO_MERGE ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-100'}`}
              onClick={() => handleStrategyChange(ResolutionStrategy.AUTO_MERGE)}
            >
              Auto Merge
            </button>
            
            <button
              className={`p-2 border rounded ${strategy === ResolutionStrategy.FIELD_LEVEL ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-100'}`}
              onClick={() => handleStrategyChange(ResolutionStrategy.FIELD_LEVEL)}
            >
              Field-Level Resolution
            </button>
          </div>
        </div>
        
        {strategy === ResolutionStrategy.FIELD_LEVEL && (
          <div>
            <h3 className="font-bold mb-2">Field-Level Resolution</h3>
            <div className="bg-white border rounded-md">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Value</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remote Value</th>
                    <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allFields.map(field => (
                    <tr key={field} className={hasConflict(field) ? 'bg-yellow-50' : ''}>
                      <td className="p-3 text-sm font-medium text-gray-900">{field}</td>
                      <td className="p-3 text-sm text-gray-900">
                        {Array.isArray(localState[field])
                          ? localState[field].join(', ')
                          : JSON.stringify(localState[field])}
                      </td>
                      <td className="p-3 text-sm text-gray-900">
                        {Array.isArray(remoteState[field])
                          ? remoteState[field].join(', ')
                          : JSON.stringify(remoteState[field])}
                      </td>
                      <td className="p-3 text-sm text-gray-900">
                        <select
                          className="text-sm border rounded px-2 py-1 w-full"
                          value={fieldResolutions[field] || FieldResolution.LOCAL}
                          onChange={(e) => handleResolutionChange(field, e.target.value as FieldResolution)}
                          disabled={!hasConflict(field)}
                        >
                          <option value={FieldResolution.LOCAL}>Keep Local</option>
                          <option value={FieldResolution.REMOTE}>Accept Remote</option>
                          {Array.isArray(localState[field]) && Array.isArray(remoteState[field]) && (
                            <option value={FieldResolution.MERGE}>Merge</option>
                          )}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div>
          <h3 className="font-bold mb-2">Merged Result</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">{JSON.stringify(mergedState, null, 2)}</pre>
        </div>
        
        <div className="flex space-x-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleResolve}
          >
            Resolve Conflicts
          </button>
          
          <button
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictManager;
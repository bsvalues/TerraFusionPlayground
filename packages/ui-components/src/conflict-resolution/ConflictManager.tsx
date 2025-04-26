/**
 * Conflict Manager Component
 * 
 * Component for visualizing and resolving conflicts between local and remote data.
 */

import React, { useState, useEffect } from 'react';
import { 
  ResolutionStrategy, 
  FieldDiff, 
  Conflict 
} from '@terrafusion/offline-sync/src/conflict-resolution';

/**
 * Conflict manager props interface
 */
export interface ConflictManagerProps {
  /**
   * Conflict ID
   */
  conflictId: string;
  
  /**
   * Local data
   */
  local: any;
  
  /**
   * Remote data
   */
  remote: any;
  
  /**
   * User ID
   */
  userId: string;
  
  /**
   * On resolve callback
   */
  onResolve: (resolved: any) => void;
}

/**
 * Conflict manager component
 */
const ConflictManager: React.FC<ConflictManagerProps> = ({
  conflictId,
  local,
  remote,
  userId,
  onResolve
}) => {
  // Active tab
  const [activeTab, setActiveTab] = useState<'differences' | 'local' | 'remote'>('differences');
  
  // Field diffs
  const [fieldDiffs, setFieldDiffs] = useState<FieldDiff[]>([]);
  
  // Custom data
  const [customData, setCustomData] = useState<any>(null);
  
  // Selected resolution strategy
  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy>(
    ResolutionStrategy.MERGE_FIELDS
  );
  
  // Create field diffs
  useEffect(() => {
    // Get all fields from both objects
    const allFields = new Set([
      ...Object.keys(local),
      ...Object.keys(remote)
    ]);
    
    // Create field diffs
    const diffs: FieldDiff[] = [];
    
    for (const field of allFields) {
      // Skip id field
      if (field === 'id') {
        continue;
      }
      
      const localValue = local[field];
      const remoteValue = remote[field];
      
      // Check if values are different
      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        diffs.push({
          field,
          localValue,
          remoteValue,
          selectedValue: null
        });
      }
    }
    
    setFieldDiffs(diffs);
    
    // Initialize custom data
    setCustomData({ ...local });
  }, [local, remote]);
  
  // Update field selection
  const handleFieldSelection = (field: string, value: 'local' | 'remote') => {
    setFieldDiffs(prev => 
      prev.map(diff => 
        diff.field === field
          ? { ...diff, selectedValue: value }
          : diff
      )
    );
  };
  
  // Update custom data
  const handleCustomDataChange = (field: string, value: any) => {
    setCustomData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Resolve conflict
  const handleResolve = () => {
    let resolvedData: any;
    
    switch (selectedStrategy) {
      case ResolutionStrategy.USE_LOCAL:
        resolvedData = { ...local };
        break;
      
      case ResolutionStrategy.USE_REMOTE:
        resolvedData = { ...remote };
        break;
      
      case ResolutionStrategy.USE_CUSTOM:
        resolvedData = { ...customData };
        break;
      
      case ResolutionStrategy.MERGE_FIELDS:
        // Start with local data
        resolvedData = { ...local };
        
        // Apply field selections
        for (const fieldDiff of fieldDiffs) {
          if (fieldDiff.selectedValue === 'remote') {
            resolvedData[fieldDiff.field] = remote[fieldDiff.field];
          }
        }
        
        break;
      
      default:
        resolvedData = { ...local };
    }
    
    // Call onResolve callback
    onResolve(resolvedData);
  };
  
  // Format value for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    
    if (Array.isArray(value)) {
      return `[${value.join(', ')}]`;
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    return String(value);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Resolve Conflict</h3>
        <div className="space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('differences')}
            className={`
              px-3 py-1 rounded text-sm
              ${activeTab === 'differences' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'}
            `}
          >
            Differences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`
              px-3 py-1 rounded text-sm
              ${activeTab === 'local' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'}
            `}
          >
            Local
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('remote')}
            className={`
              px-3 py-1 rounded text-sm
              ${activeTab === 'remote' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'}
            `}
          >
            Remote
          </button>
        </div>
      </div>
      
      <div className="rounded border p-4">
        {activeTab === 'differences' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which version of each field you want to keep.
            </p>
            
            <div className="space-y-4">
              {fieldDiffs.map((diff) => (
                <div key={diff.field} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{diff.field}</span>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => handleFieldSelection(diff.field, 'local')}
                        className={`
                          px-2 py-1 text-xs rounded
                          ${diff.selectedValue === 'local' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 hover:bg-gray-300'}
                        `}
                      >
                        Use Local
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldSelection(diff.field, 'remote')}
                        className={`
                          px-2 py-1 text-xs rounded
                          ${diff.selectedValue === 'remote' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 hover:bg-gray-300'}
                        `}
                      >
                        Use Remote
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`
                      p-2 rounded text-sm
                      ${diff.selectedValue === 'local' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}
                    `}>
                      <div className="font-medium text-xs text-muted-foreground mb-1">Local:</div>
                      <div className="font-mono whitespace-pre-wrap">{formatValue(diff.localValue)}</div>
                    </div>
                    <div className={`
                      p-2 rounded text-sm
                      ${diff.selectedValue === 'remote' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}
                    `}>
                      <div className="font-medium text-xs text-muted-foreground mb-1">Remote:</div>
                      <div className="font-mono whitespace-pre-wrap">{formatValue(diff.remoteValue)}</div>
                    </div>
                  </div>
                </div>
              ))}
              
              {fieldDiffs.length === 0 && (
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-muted-foreground">No differences found.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'local' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is your local version of the data.
            </p>
            
            <pre className="bg-gray-50 p-4 rounded text-sm font-mono whitespace-pre-wrap">
              {JSON.stringify(local, null, 2)}
            </pre>
          </div>
        )}
        
        {activeTab === 'remote' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is the remote version of the data.
            </p>
            
            <pre className="bg-gray-50 p-4 rounded text-sm font-mono whitespace-pre-wrap">
              {JSON.stringify(remote, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t">
        <div>
          <label className="flex items-center space-x-2">
            <span className="text-sm font-medium">Resolution Strategy:</span>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value as ResolutionStrategy)}
              className="border p-1 rounded text-sm"
            >
              <option value={ResolutionStrategy.MERGE_FIELDS}>Merge Fields</option>
              <option value={ResolutionStrategy.USE_LOCAL}>Use Local Version</option>
              <option value={ResolutionStrategy.USE_REMOTE}>Use Remote Version</option>
            </select>
          </label>
        </div>
        
        <div className="space-x-2">
          <button
            type="button"
            onClick={handleResolve}
            className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Resolve Conflict
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictManager;
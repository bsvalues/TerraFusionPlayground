/**
 * PropertyForm
 * 
 * A form for editing property data.
 */

import React, { useState, useEffect } from 'react';

/**
 * Import from offline sync module
 */
import { SyncStatus } from '@terrafusion/offline-sync/src/crdt-sync';
import { PropertyDocState } from '@terrafusion/offline-sync/src/hooks/usePropertyDoc';

/**
 * PropertyForm props interface
 */
export interface PropertyFormProps {
  /**
   * Property data
   */
  property: PropertyDocState;
  
  /**
   * Loading state
   */
  isLoading?: boolean;
  
  /**
   * Read-only mode
   */
  readOnly?: boolean;
  
  /**
   * Sync status
   */
  syncStatus?: SyncStatus;
  
  /**
   * On change callback
   */
  onChange?: (data: Partial<PropertyDocState>) => void;
  
  /**
   * On sync callback
   */
  onSync?: () => void;
}

/**
 * PropertyForm component
 */
export const PropertyForm: React.FC<PropertyFormProps> = ({
  property,
  isLoading = false,
  readOnly = false,
  syncStatus = SyncStatus.SYNCED,
  onChange,
  onSync
}) => {
  // Local form state
  const [formState, setFormState] = useState<PropertyDocState>(property);
  
  // Update form state when property changes
  useEffect(() => {
    setFormState(property);
  }, [property]);
  
  // Handle field change
  const handleChange = (field: string, value: any) => {
    // Update form state
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Call onChange if provided
    if (onChange) {
      onChange({ [field]: value });
    }
  };
  
  // Handle features change
  const handleFeaturesChange = (features: string) => {
    // Split by comma and trim
    const featureArray = features.split(',').map(f => f.trim()).filter(f => f);
    
    // Update form state
    setFormState(prev => ({
      ...prev,
      features: featureArray
    }));
    
    // Call onChange if provided
    if (onChange) {
      onChange({ features: featureArray });
    }
  };
  
  // Handle sync
  const handleSync = () => {
    if (onSync) {
      onSync();
    }
  };
  
  // Get status color
  const getStatusColor = (): string => {
    switch (syncStatus) {
      case SyncStatus.SYNCED:
        return 'text-green-600';
      case SyncStatus.SYNCING:
        return 'text-blue-600';
      case SyncStatus.UNSYNCED:
        return 'text-yellow-600';
      case SyncStatus.FAILED:
        return 'text-red-600';
      case SyncStatus.CONFLICT:
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };
  
  // Get status text
  const getStatusText = (): string => {
    switch (syncStatus) {
      case SyncStatus.SYNCED:
        return 'Synced';
      case SyncStatus.SYNCING:
        return 'Syncing...';
      case SyncStatus.UNSYNCED:
        return 'Unsynced';
      case SyncStatus.FAILED:
        return 'Sync Failed';
      case SyncStatus.CONFLICT:
        return 'Conflict';
      default:
        return 'Unknown';
    }
  };
  
  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Property Details</h2>
        
        <div className="flex items-center">
          <span className={`mr-2 ${getStatusColor()}`}>{getStatusText()}</span>
          
          {syncStatus !== SyncStatus.CONFLICT && (
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              onClick={handleSync}
              disabled={isLoading || syncStatus === SyncStatus.SYNCING || readOnly}
            >
              {syncStatus === SyncStatus.SYNCING ? 'Syncing...' : 'Sync'}
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* ID */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
          <input
            type="text"
            className="w-full p-2 border rounded bg-gray-100"
            value={formState.id || ''}
            readOnly
          />
        </div>
        
        {/* Address */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            className="w-full p-2 border rounded disabled:bg-gray-100"
            value={formState.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            disabled={isLoading || readOnly}
          />
        </div>
        
        {/* Owner */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
          <input
            type="text"
            className="w-full p-2 border rounded disabled:bg-gray-100"
            value={formState.owner || ''}
            onChange={(e) => handleChange('owner', e.target.value)}
            disabled={isLoading || readOnly}
          />
        </div>
        
        {/* Value */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
          <input
            type="number"
            className="w-full p-2 border rounded disabled:bg-gray-100"
            value={formState.value || ''}
            onChange={(e) => handleChange('value', parseFloat(e.target.value))}
            disabled={isLoading || readOnly}
          />
        </div>
        
        {/* Last Inspection */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Inspection</label>
          <input
            type="date"
            className="w-full p-2 border rounded disabled:bg-gray-100"
            value={formState.lastInspection || ''}
            onChange={(e) => handleChange('lastInspection', e.target.value)}
            disabled={isLoading || readOnly}
          />
        </div>
        
        {/* Notes */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="w-full p-2 border rounded disabled:bg-gray-100"
            value={formState.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            disabled={isLoading || readOnly}
          />
        </div>
        
        {/* Features */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma-separated)</label>
          <textarea
            className="w-full p-2 border rounded disabled:bg-gray-100"
            value={(formState.features || []).join(', ')}
            onChange={(e) => handleFeaturesChange(e.target.value)}
            rows={2}
            disabled={isLoading || readOnly}
          />
        </div>
      </div>
    </div>
  );
};

export default PropertyForm;
/**
 * Mobile Property Editor
 *
 * Component for editing property data with offline sync and conflict resolution on mobile
 * Includes performance monitoring for critical operations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { usePropertyDoc } from '@terrafusion/offline-sync/src/hooks';
import { ConflictManager } from '@terrafusion/ui-components/src/conflict-resolution';
import { MobilePropertyForm } from './MobilePropertyForm';
import { PerformanceProfiler, useRenderProfiling } from '../utils/performance-monitoring';

/**
 * Mobile property editor props interface
 */
export interface MobilePropertyEditorProps {
  /**
   * Property ID
   */
  propertyId: string;

  /**
   * API endpoint
   */
  apiEndpoint?: string;

  /**
   * User ID
   */
  userId?: string;

  /**
   * On save callback
   */
  onSave?: (data: any) => void;
}

/**
 * Mobile property editor component
 */
export const MobilePropertyEditor: React.FC<MobilePropertyEditorProps> = ({
  propertyId,
  apiEndpoint = '/api/sync',
  userId = 'anonymous-mobile',
  onSave,
}) => {
  // Use property document hook
  const {
    local,
    remote,
    shared,
    isLoading,
    error,
    syncStatus,
    hasConflict,
    debouncedUpdate,
    syncWithRemote,
    resolveConflict,
  } = usePropertyDoc(propertyId, {
    autoSync: true,
    autoSyncInterval: 30000, // 30 seconds
    userId,
    apiEndpoint,
  });

  // Convert syncStatus to a format compatible with MobilePropertyForm
  const getMobileFormSyncStatus = () => {
    switch (syncStatus) {
      case 'SYNCED':
        return 'synced';
      case 'SYNCING':
        return 'syncing';
      case 'UNSYNCED':
        return 'unsynced';
      case 'CONFLICT':
        return 'conflict';
      case 'FAILED':
        return 'failed';
      default:
        return 'unsynced';
    }
  };

  // Handle property change
  const handlePropertyChange = (data: any) => {
    debouncedUpdate(data);
  };

  // Handle conflict resolution
  const handleResolveConflict = (resolved: any) => {
    resolveConflict(resolved);

    // Call onSave callback
    if (onSave) {
      onSave(resolved);
    }
  };

  // Display loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={styles.loadingText}>Loading property data...</Text>
      </View>
    );
  }

  // Display error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  // Display conflict resolution UI
  if (hasConflict && remote) {
    return (
      <View style={styles.container}>
        <View style={styles.conflictHeader}>
          <Text style={styles.conflictTitle}>Conflict Detected</Text>
          <Text style={styles.conflictDescription}>
            The property data has been modified remotely. Please resolve the conflict.
          </Text>
        </View>

        <ConflictManager
          conflictId={propertyId}
          local={local}
          remote={remote}
          onResolve={handleResolveConflict}
          userId={userId}
        />
      </View>
    );
  }

  // Display property form
  return (
    <View style={styles.container}>
      <MobilePropertyForm
        data={shared}
        onChange={handlePropertyChange}
        isLoading={isLoading}
        syncStatus={getMobileFormSyncStatus()}
      />
    </View>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4361ee',
  },
  errorContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff0f0',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
  },
  conflictHeader: {
    backgroundColor: '#fff9c4',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ffd54f',
  },
  conflictTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff8f00',
    marginBottom: 8,
  },
  conflictDescription: {
    fontSize: 14,
    color: '#555555',
  },
});

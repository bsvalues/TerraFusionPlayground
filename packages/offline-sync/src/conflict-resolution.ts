/**
 * Conflict Resolution
 * 
 * Provides tools for detecting and resolving conflicts in offline data.
 */

import { EventEmitter } from 'events';
import { deepEqual } from './utils';

/**
 * Field resolution enumeration
 */
export enum FieldResolution {
  /**
   * Keep local value
   */
  LOCAL = 'local',
  
  /**
   * Accept remote value
   */
  REMOTE = 'remote',
  
  /**
   * Merge values
   */
  MERGE = 'merge',
  
  /**
   * Custom resolution
   */
  CUSTOM = 'custom'
}

/**
 * Resolution strategy enumeration
 */
export enum ResolutionStrategy {
  /**
   * Keep local data
   */
  KEEP_LOCAL = 'keep_local',
  
  /**
   * Accept remote data
   */
  ACCEPT_REMOTE = 'accept_remote',
  
  /**
   * Auto merge
   */
  AUTO_MERGE = 'auto_merge',
  
  /**
   * Resolve at field level
   */
  FIELD_LEVEL = 'field_level',
  
  /**
   * Custom resolution
   */
  CUSTOM = 'custom'
}

/**
 * Conflict status enumeration
 */
export enum ConflictStatus {
  /**
   * Conflict detected
   */
  DETECTED = 'detected',
  
  /**
   * Conflict pending resolution
   */
  PENDING = 'pending',
  
  /**
   * Conflict resolved
   */
  RESOLVED = 'resolved',
  
  /**
   * Conflict ignored
   */
  IGNORED = 'ignored'
}

/**
 * Conflict interface
 */
export interface Conflict {
  /**
   * Conflict ID
   */
  id: string;
  
  /**
   * Document ID
   */
  docId: string;
  
  /**
   * Local document
   */
  localDoc: any;
  
  /**
   * Remote document
   */
  remoteDoc: any;
  
  /**
   * Conflict status
   */
  status: ConflictStatus | string;
  
  /**
   * User ID
   */
  userId: string;
  
  /**
   * Detected at timestamp
   */
  detectedAt: number;
  
  /**
   * Resolved at timestamp
   */
  resolvedAt?: number;
  
  /**
   * Resolution strategy
   */
  resolutionStrategy?: ResolutionStrategy | string;
  
  /**
   * Field resolutions
   */
  fieldResolutions?: Record<string, FieldResolution | string>;
  
  /**
   * Resolved document
   */
  resolvedDoc?: any;
  
  /**
   * Error if any
   */
  error?: Error | string;
}

/**
 * Conflict resolution result interface
 */
export interface ConflictResolutionResult {
  /**
   * Whether resolution was successful
   */
  success: boolean;
  
  /**
   * Resolved document
   */
  resolvedDoc?: any;
  
  /**
   * Error if any
   */
  error?: Error | string;
}

/**
 * Conflict resolution manager
 */
export class ConflictResolutionManager extends EventEmitter {
  private conflicts: Map<string, Conflict> = new Map();
  
  /**
   * Initialize a new conflict resolution manager
   */
  constructor() {
    super();
  }
  
  /**
   * Detect conflict
   * 
   * @param docId Document ID
   * @param localDoc Local document
   * @param remoteDoc Remote document
   * @param userId User ID
   * @returns Conflict if detected
   */
  detectConflict(docId: string, localDoc: any, remoteDoc: any, userId: string = 'anonymous'): Conflict | null {
    // Skip if documents are equal
    if (deepEqual(localDoc, remoteDoc)) {
      return null;
    }
    
    // Generate conflict ID
    const conflictId = `conflict_${docId}_${Date.now()}`;
    
    // Create conflict
    const conflict: Conflict = {
      id: conflictId,
      docId,
      localDoc,
      remoteDoc,
      status: ConflictStatus.DETECTED,
      userId,
      detectedAt: Date.now()
    };
    
    // Store conflict
    this.conflicts.set(conflictId, conflict);
    
    // Emit event
    this.emit('conflict:detected', conflict);
    
    return conflict;
  }
  
  /**
   * Resolve conflict
   * 
   * @param conflictId Conflict ID
   * @param strategy Resolution strategy
   * @param userId User ID
   * @param customData Custom resolution data
   * @returns Resolution result
   */
  async resolveConflict(
    conflictId: string,
    strategy: ResolutionStrategy | string,
    userId: string = 'anonymous',
    customData?: any
  ): Promise<ConflictResolutionResult> {
    try {
      // Get conflict
      const conflict = this.conflicts.get(conflictId);
      
      if (!conflict) {
        throw new Error(`Conflict not found: ${conflictId}`);
      }
      
      // Apply resolution strategy
      let resolvedDoc: any;
      
      switch (strategy) {
        case ResolutionStrategy.KEEP_LOCAL:
          resolvedDoc = { ...conflict.localDoc };
          break;
        case ResolutionStrategy.ACCEPT_REMOTE:
          resolvedDoc = { ...conflict.remoteDoc };
          break;
        case ResolutionStrategy.AUTO_MERGE:
          resolvedDoc = this.autoMerge(conflict.localDoc, conflict.remoteDoc);
          break;
        case ResolutionStrategy.FIELD_LEVEL:
          resolvedDoc = this.fieldLevelMerge(conflict.localDoc, conflict.remoteDoc, conflict.fieldResolutions || {});
          break;
        case ResolutionStrategy.CUSTOM:
          if (!customData) {
            throw new Error('Custom data required for custom resolution strategy');
          }
          resolvedDoc = customData;
          break;
        default:
          throw new Error(`Unknown resolution strategy: ${strategy}`);
      }
      
      // Update conflict
      conflict.status = ConflictStatus.RESOLVED;
      conflict.resolvedAt = Date.now();
      conflict.resolutionStrategy = strategy;
      conflict.resolvedDoc = resolvedDoc;
      
      // Store conflict
      this.conflicts.set(conflictId, conflict);
      
      // Emit event
      this.emit('conflict:resolved', conflict);
      
      return {
        success: true,
        resolvedDoc
      };
    } catch (err) {
      // Update conflict
      const conflict = this.conflicts.get(conflictId);
      
      if (conflict) {
        conflict.error = err as Error;
        this.conflicts.set(conflictId, conflict);
      }
      
      // Emit event
      this.emit('conflict:error', {
        conflictId,
        error: err
      });
      
      return {
        success: false,
        error: err as Error
      };
    }
  }
  
  /**
   * Auto merge
   * 
   * @param localDoc Local document
   * @param remoteDoc Remote document
   * @returns Merged document
   */
  private autoMerge(localDoc: any, remoteDoc: any): any {
    // Start with local document as base
    const mergedDoc = { ...localDoc };
    
    // Get all fields from both documents
    const allFields = new Set([
      ...Object.keys(localDoc || {}),
      ...Object.keys(remoteDoc || {})
    ]);
    
    // Apply merge rules
    for (const field of allFields) {
      // Skip id field
      if (field === 'id') continue;
      
      const inLocal = localDoc && field in localDoc;
      const inRemote = remoteDoc && field in remoteDoc;
      
      // If field only exists in remote, use remote value
      if (!inLocal && inRemote) {
        mergedDoc[field] = remoteDoc[field];
        continue;
      }
      
      // If field only exists in local, use local value (already there)
      if (inLocal && !inRemote) {
        continue;
      }
      
      // If values are different, use the more recent one
      // For now, default to remote as it's likely more recent
      if (inLocal && inRemote && !deepEqual(localDoc[field], remoteDoc[field])) {
        mergedDoc[field] = remoteDoc[field];
      }
    }
    
    return mergedDoc;
  }
  
  /**
   * Field level merge
   * 
   * @param localDoc Local document
   * @param remoteDoc Remote document
   * @param fieldResolutions Field resolutions
   * @returns Merged document
   */
  private fieldLevelMerge(
    localDoc: any,
    remoteDoc: any,
    fieldResolutions: Record<string, FieldResolution | string>
  ): any {
    // Start with local document as base
    const mergedDoc = { ...localDoc };
    
    // Get all fields from both documents
    const allFields = new Set([
      ...Object.keys(localDoc || {}),
      ...Object.keys(remoteDoc || {})
    ]);
    
    // Apply field resolutions
    for (const field of allFields) {
      // Skip id field
      if (field === 'id') continue;
      
      // Get resolution for field
      const resolution = fieldResolutions[field] || FieldResolution.LOCAL;
      
      // Apply resolution
      switch (resolution) {
        case FieldResolution.LOCAL:
          // Keep local value (already there)
          break;
        case FieldResolution.REMOTE:
          // Use remote value
          if (remoteDoc && field in remoteDoc) {
            mergedDoc[field] = remoteDoc[field];
          }
          break;
        case FieldResolution.MERGE:
          // Merge arrays
          if (
            localDoc && 
            remoteDoc && 
            field in localDoc && 
            field in remoteDoc && 
            Array.isArray(localDoc[field]) && 
            Array.isArray(remoteDoc[field])
          ) {
            // Merge arrays by combining and deduplicating
            const combined = [...localDoc[field], ...remoteDoc[field]];
            const deduped = Array.from(new Set(combined));
            mergedDoc[field] = deduped;
          } else {
            // Default to remote for non-arrays
            if (remoteDoc && field in remoteDoc) {
              mergedDoc[field] = remoteDoc[field];
            }
          }
          break;
        default:
          // Default to local value
          break;
      }
    }
    
    return mergedDoc;
  }
  
  /**
   * Ignore conflict
   * 
   * @param conflictId Conflict ID
   * @returns Whether conflict was ignored
   */
  ignoreConflict(conflictId: string): boolean {
    // Get conflict
    const conflict = this.conflicts.get(conflictId);
    
    if (!conflict) {
      return false;
    }
    
    // Update conflict
    conflict.status = ConflictStatus.IGNORED;
    
    // Store conflict
    this.conflicts.set(conflictId, conflict);
    
    // Emit event
    this.emit('conflict:ignored', conflict);
    
    return true;
  }
  
  /**
   * Get conflict by ID
   * 
   * @param conflictId Conflict ID
   * @returns Conflict if found
   */
  getConflict(conflictId: string): Conflict | null {
    return this.conflicts.get(conflictId) || null;
  }
  
  /**
   * Get conflicts by document
   * 
   * @param docId Document ID
   * @returns Array of conflicts
   */
  getConflictsByDocument(docId: string): Conflict[] {
    return Array.from(this.conflicts.values())
      .filter(conflict => conflict.docId === docId);
  }
  
  /**
   * Get conflicts by user
   * 
   * @param userId User ID
   * @returns Array of conflicts
   */
  getConflictsByUser(userId: string): Conflict[] {
    return Array.from(this.conflicts.values())
      .filter(conflict => conflict.userId === userId);
  }
  
  /**
   * Get conflicts by status
   * 
   * @param status Conflict status
   * @returns Array of conflicts
   */
  getConflictsByStatus(status: ConflictStatus | string): Conflict[] {
    return Array.from(this.conflicts.values())
      .filter(conflict => conflict.status === status);
  }
  
  /**
   * Get all conflicts
   * 
   * @returns Array of conflicts
   */
  getAllConflicts(): Conflict[] {
    return Array.from(this.conflicts.values());
  }
  
  /**
   * Clear all conflicts
   */
  clearConflicts(): void {
    this.conflicts.clear();
    this.emit('conflicts:cleared');
  }
}
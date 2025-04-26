/**
 * Conflict Resolution Manager
 * 
 * Manages detection and resolution of data conflicts.
 */

import { EventEmitter } from 'events';
import { deepEqual } from './utils';

/**
 * Resolution strategy enum
 */
export enum ResolutionStrategy {
  /** Keep local changes */
  KEEP_LOCAL = 'keep_local',
  /** Accept remote changes */
  ACCEPT_REMOTE = 'accept_remote',
  /** Merge changes field by field */
  FIELD_LEVEL = 'field_level',
  /** Custom resolution */
  CUSTOM = 'custom'
}

/**
 * Field resolution enum
 */
export enum FieldResolution {
  /** Keep local field */
  LOCAL = 'local',
  /** Accept remote field */
  REMOTE = 'remote'
}

/**
 * Conflict interface
 */
export interface Conflict {
  /** Conflict ID */
  id: string;
  /** Local document */
  localDoc: any;
  /** Remote document */
  remoteDoc: any;
  /** Timestamp of detection */
  detectedAt: number;
  /** Document ID */
  docId: string;
  /** User ID */
  userId: string;
  /** Status */
  status: 'detected' | 'resolved' | 'pending';
  /** Resolution timestamp */
  resolvedAt?: number;
  /** Resolution strategy */
  strategy?: ResolutionStrategy;
  /** Custom resolution data */
  customResolution?: any;
  /** Fields with conflicts */
  conflictingFields?: string[];
}

/**
 * Resolution result interface
 */
export interface ResolutionResult {
  /** Success status */
  success: boolean;
  /** Conflict ID */
  conflictId: string;
  /** Resolved document */
  resolvedDoc?: any;
  /** Error if any */
  error?: Error;
  /** Strategy used */
  strategy: ResolutionStrategy;
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
   * Generate conflict ID
   * 
   * @param docId Document ID
   * @param userId User ID
   * @returns Conflict ID
   */
  private generateConflictId(docId: string, userId: string): string {
    return `conflict_${docId}_${userId}_${Date.now()}`;
  }
  
  /**
   * Detect conflicts between local and remote documents
   * 
   * @param docId Document ID
   * @param localDoc Local document
   * @param remoteDoc Remote document
   * @param userId User ID
   * @returns Conflict if detected, null otherwise
   */
  detectConflict(
    docId: string, 
    localDoc: any, 
    remoteDoc: any,
    userId: string = 'anonymous'
  ): Conflict | null {
    // Skip if documents are exactly the same
    if (deepEqual(localDoc, remoteDoc)) {
      return null;
    }
    
    // Find conflicting fields
    const conflictingFields: string[] = [];
    
    // Compare all fields in both documents
    const allFields = new Set([
      ...Object.keys(localDoc || {}),
      ...Object.keys(remoteDoc || {})
    ]);
    
    for (const field of allFields) {
      // Skip id field
      if (field === 'id') {
        continue;
      }
      
      // Check if field exists in both documents
      const inLocal = localDoc && field in localDoc;
      const inRemote = remoteDoc && field in remoteDoc;
      
      // If field only exists in one document, it's a conflict
      if (inLocal !== inRemote) {
        conflictingFields.push(field);
        continue;
      }
      
      // If field exists in both but values are different, it's a conflict
      if (inLocal && inRemote && !deepEqual(localDoc[field], remoteDoc[field])) {
        conflictingFields.push(field);
      }
    }
    
    // If no conflicting fields, no conflict
    if (conflictingFields.length === 0) {
      return null;
    }
    
    // Create conflict
    const conflictId = this.generateConflictId(docId, userId);
    
    const conflict: Conflict = {
      id: conflictId,
      localDoc,
      remoteDoc,
      detectedAt: Date.now(),
      docId,
      userId,
      status: 'detected',
      conflictingFields
    };
    
    // Save conflict
    this.conflicts.set(conflictId, conflict);
    
    // Emit event
    this.emit('conflict:detected', { conflictId, docId, userId, conflictingFields });
    
    return conflict;
  }
  
  /**
   * Resolve a conflict
   * 
   * @param conflictId Conflict ID
   * @param strategy Resolution strategy
   * @param userId User ID
   * @param customResolution Custom resolution data
   * @returns Resolution result
   */
  async resolveConflict(
    conflictId: string,
    strategy: ResolutionStrategy,
    userId: string = 'anonymous',
    customResolution: any = null
  ): Promise<ResolutionResult> {
    const conflict = this.conflicts.get(conflictId);
    
    if (!conflict) {
      return {
        success: false,
        conflictId,
        error: new Error(`Conflict not found: ${conflictId}`),
        strategy
      };
    }
    
    // Already resolved
    if (conflict.status === 'resolved') {
      return {
        success: false,
        conflictId,
        error: new Error(`Conflict already resolved: ${conflictId}`),
        strategy
      };
    }
    
    try {
      let resolvedDoc: any;
      
      switch (strategy) {
        case ResolutionStrategy.KEEP_LOCAL:
          resolvedDoc = { ...conflict.localDoc };
          break;
          
        case ResolutionStrategy.ACCEPT_REMOTE:
          resolvedDoc = { ...conflict.remoteDoc };
          break;
          
        case ResolutionStrategy.FIELD_LEVEL:
          resolvedDoc = this.resolveFieldLevel(conflict, customResolution);
          break;
          
        case ResolutionStrategy.CUSTOM:
          if (!customResolution) {
            throw new Error('Custom resolution data required for CUSTOM strategy');
          }
          
          resolvedDoc = customResolution;
          break;
          
        default:
          throw new Error(`Unknown resolution strategy: ${strategy}`);
      }
      
      // Update conflict
      conflict.status = 'resolved';
      conflict.resolvedAt = Date.now();
      conflict.strategy = strategy;
      conflict.customResolution = customResolution;
      
      // Save conflict
      this.conflicts.set(conflictId, conflict);
      
      // Emit event
      this.emit('conflict:resolved', { 
        conflictId, 
        docId: conflict.docId, 
        userId, 
        strategy,
        resolvedDoc
      });
      
      return {
        success: true,
        conflictId,
        resolvedDoc,
        strategy
      };
    } catch (error) {
      return {
        success: false,
        conflictId,
        error: error as Error,
        strategy
      };
    }
  }
  
  /**
   * Resolve field level conflicts
   * 
   * @param conflict Conflict
   * @param fieldResolutions Field resolutions
   * @returns Resolved document
   */
  private resolveFieldLevel(conflict: Conflict, fieldResolutions: Record<string, FieldResolution>): any {
    // Start with local document as base
    const resolvedDoc = { ...conflict.localDoc };
    
    // If no field resolutions provided, use all local fields
    if (!fieldResolutions || Object.keys(fieldResolutions).length === 0) {
      // Use all local values
      return resolvedDoc;
    }
    
    // Apply field resolutions
    for (const [field, resolution] of Object.entries(fieldResolutions)) {
      if (resolution === FieldResolution.REMOTE) {
        // Use remote value
        resolvedDoc[field] = conflict.remoteDoc[field];
      }
    }
    
    return resolvedDoc;
  }
  
  /**
   * Get conflict by ID
   * 
   * @param conflictId Conflict ID
   * @returns Conflict or null if not found
   */
  getConflict(conflictId: string): Conflict | null {
    return this.conflicts.get(conflictId) || null;
  }
  
  /**
   * Get conflicts by document ID
   * 
   * @param docId Document ID
   * @returns Array of conflicts
   */
  getConflictsByDocument(docId: string): Conflict[] {
    return Array.from(this.conflicts.values())
      .filter(conflict => conflict.docId === docId);
  }
  
  /**
   * Get conflicts by user ID
   * 
   * @param userId User ID
   * @returns Array of conflicts
   */
  getConflictsByUser(userId: string): Conflict[] {
    return Array.from(this.conflicts.values())
      .filter(conflict => conflict.userId === userId);
  }
  
  /**
   * Get pending conflicts
   * 
   * @returns Array of pending conflicts
   */
  getPendingConflicts(): Conflict[] {
    return Array.from(this.conflicts.values())
      .filter(conflict => conflict.status === 'detected' || conflict.status === 'pending');
  }
  
  /**
   * Check if document has conflicts
   * 
   * @param docId Document ID
   * @returns Whether the document has conflicts
   */
  hasConflicts(docId: string): boolean {
    return this.getConflictsByDocument(docId)
      .some(conflict => conflict.status === 'detected' || conflict.status === 'pending');
  }
  
  /**
   * Clear conflicts
   * 
   * @param docId Optional document ID to clear conflicts for
   */
  clearConflicts(docId?: string): void {
    if (docId) {
      // Clear conflicts for specific document
      for (const [id, conflict] of this.conflicts.entries()) {
        if (conflict.docId === docId) {
          this.conflicts.delete(id);
        }
      }
    } else {
      // Clear all conflicts
      this.conflicts.clear();
    }
    
    // Emit event
    this.emit('conflicts:cleared', { docId });
  }
}

export default ConflictResolutionManager;
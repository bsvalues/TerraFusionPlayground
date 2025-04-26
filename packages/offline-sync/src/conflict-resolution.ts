/**
 * Conflict Resolution Manager
 * 
 * Handles conflict detection and resolution for CRDT-based offline sync.
 */

import { EventEmitter } from 'events';
import * as Y from 'yjs';
import { deepEqual } from 'lib0/json';

/**
 * Resolution strategy for conflict resolution
 */
export enum ResolutionStrategy {
  /** Keep local changes */
  KEEP_LOCAL = 'keep-local',
  /** Accept remote changes */
  ACCEPT_REMOTE = 'accept-remote',
  /** Manual merge */
  MANUAL_MERGE = 'manual-merge',
  /** Time-based (latest wins) */
  TIME_BASED = 'time-based',
  /** Field-level merge */
  FIELD_LEVEL = 'field-level'
}

/**
 * Conflict status enum
 */
export enum ConflictStatus {
  /** Pending resolution */
  PENDING = 'pending',
  /** Resolved */
  RESOLVED = 'resolved'
}

/**
 * Conflict information interface
 */
export interface Conflict {
  /** Unique identifier for the conflict */
  id: string;
  /** Document ID */
  docId: string;
  /** Local value */
  localValue: any;
  /** Remote value */
  remoteValue: any;
  /** Status */
  status: ConflictStatus;
  /** Resolution strategy used (if resolved) */
  resolutionStrategy?: ResolutionStrategy;
  /** User who resolved the conflict */
  resolvedBy?: string;
  /** Timestamp when the conflict was created */
  createdAt: number;
  /** Timestamp when the conflict was resolved */
  resolvedAt?: number;
}

/**
 * Conflict resolution handler signature
 */
export type ConflictResolutionHandler = (
  conflictId: string,
  strategy: ResolutionStrategy,
  userId: string,
  customValue?: any
) => Promise<boolean>;

/**
 * Conflict resolution manager
 */
export class ConflictResolutionManager extends EventEmitter {
  private conflicts: Map<string, Conflict> = new Map();
  private resolutionHandler?: ConflictResolutionHandler;
  
  /**
   * Initialize a new conflict resolution manager
   * 
   * @param resolutionHandler Optional custom resolution handler
   */
  constructor(resolutionHandler?: ConflictResolutionHandler) {
    super();
    this.resolutionHandler = resolutionHandler;
  }
  
  /**
   * Register a conflict
   * 
   * @param docId Document ID
   * @param localValue Local value
   * @param remoteValue Remote value
   * @returns The registered conflict
   */
  registerConflict(docId: string, localValue: any, remoteValue: any): Conflict {
    const conflictId = `conflict_${docId}_${Date.now()}`;
    
    const conflict: Conflict = {
      id: conflictId,
      docId,
      localValue,
      remoteValue,
      status: ConflictStatus.PENDING,
      createdAt: Date.now()
    };
    
    this.conflicts.set(conflictId, conflict);
    
    // Emit event
    this.emit('conflict:registered', conflict);
    
    return conflict;
  }
  
  /**
   * Register a conflict from Yjs document
   * 
   * @param doc The Yjs document
   * @param update Remote update
   * @returns The registered conflict or null if there's no conflict
   */
  registerConflictFromYDoc(doc: Y.Doc, update: Uint8Array): Conflict | null {
    const docId = doc.guid;
    
    // Get local state
    const localValue = this.extractStateFromYDoc(doc);
    
    // Apply update to a clone
    const clone = new Y.Doc({ guid: docId });
    Y.applyUpdate(clone, Y.encodeStateAsUpdate(doc));
    Y.applyUpdate(clone, update);
    
    // Get remote state
    const remoteValue = this.extractStateFromYDoc(clone);
    
    // Check if there's actually a conflict
    if (deepEqual(localValue, remoteValue)) {
      return null;
    }
    
    // Register conflict
    return this.registerConflict(docId, localValue, remoteValue);
  }
  
  /**
   * Extract state from a Yjs document
   * 
   * @param doc The Yjs document
   * @returns The document state
   */
  private extractStateFromYDoc(doc: Y.Doc): any {
    const map = doc.getMap('data');
    const result: any = { id: doc.guid };
    
    map.forEach((value, key) => {
      result[key] = value;
    });
    
    return result;
  }
  
  /**
   * Apply state to a Yjs document
   * 
   * @param doc The Yjs document
   * @param state The state to apply
   */
  private applyStateToYDoc(doc: Y.Doc, state: any): void {
    const map = doc.getMap('data');
    
    doc.transact(() => {
      Object.entries(state).forEach(([key, value]) => {
        if (key !== 'id') {
          map.set(key, value);
        }
      });
    });
  }
  
  /**
   * Resolve a conflict
   * 
   * @param conflictId Conflict ID
   * @param strategy Resolution strategy
   * @param userId User ID
   * @param customValue Custom value for manual merge
   * @returns Whether the conflict was resolved successfully
   */
  async resolveConflict(
    conflictId: string,
    strategy: ResolutionStrategy,
    userId: string,
    customValue?: any
  ): Promise<boolean> {
    const conflict = this.conflicts.get(conflictId);
    
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }
    
    if (conflict.status === ConflictStatus.RESOLVED) {
      throw new Error(`Conflict already resolved: ${conflictId}`);
    }
    
    let success = false;
    
    if (this.resolutionHandler) {
      // Use custom resolution handler
      success = await this.resolutionHandler(conflictId, strategy, userId, customValue);
    } else {
      // Use built-in resolution logic
      success = true;
    }
    
    if (success) {
      // Update conflict status
      conflict.status = ConflictStatus.RESOLVED;
      conflict.resolutionStrategy = strategy;
      conflict.resolvedBy = userId;
      conflict.resolvedAt = Date.now();
      
      // Save conflict
      this.conflicts.set(conflictId, conflict);
      
      // Emit event
      this.emit('conflict:resolved', conflict);
    }
    
    return success;
  }
  
  /**
   * Resolve a conflict with merge
   * 
   * @param conflictId Conflict ID
   * @param mergedValue Merged value
   * @param userId User ID
   * @returns Whether the conflict was resolved successfully
   */
  async resolveWithMerge(conflictId: string, mergedValue: any, userId: string): Promise<boolean> {
    return this.resolveConflict(conflictId, ResolutionStrategy.MANUAL_MERGE, userId, mergedValue);
  }
  
  /**
   * Get a conflict by ID
   * 
   * @param conflictId Conflict ID
   * @returns The conflict or undefined if not found
   */
  getConflict(conflictId: string): Conflict | undefined {
    return this.conflicts.get(conflictId);
  }
  
  /**
   * Get all conflicts
   * 
   * @returns Array of all conflicts
   */
  getAllConflicts(): Conflict[] {
    return Array.from(this.conflicts.values());
  }
  
  /**
   * Get unresolved conflicts
   * 
   * @returns Array of unresolved conflicts
   */
  getUnresolvedConflicts(): Conflict[] {
    return Array.from(this.conflicts.values()).filter(
      conflict => conflict.status === ConflictStatus.PENDING
    );
  }
  
  /**
   * Get resolved conflicts
   * 
   * @returns Array of resolved conflicts
   */
  getResolvedConflicts(): Conflict[] {
    return Array.from(this.conflicts.values()).filter(
      conflict => conflict.status === ConflictStatus.RESOLVED
    );
  }
  
  /**
   * Get conflicts for a document
   * 
   * @param docId Document ID
   * @returns Array of conflicts for the document
   */
  getConflictsForDocument(docId: string): Conflict[] {
    return Array.from(this.conflicts.values()).filter(
      conflict => conflict.docId === docId
    );
  }
  
  /**
   * Get unresolved conflicts for a document
   * 
   * @param docId Document ID
   * @returns Array of unresolved conflicts for the document
   */
  getUnresolvedConflictsForDocument(docId: string): Conflict[] {
    return Array.from(this.conflicts.values()).filter(
      conflict => conflict.docId === docId && conflict.status === ConflictStatus.PENDING
    );
  }
  
  /**
   * Clear all conflicts
   */
  clearAllConflicts(): void {
    this.conflicts.clear();
    this.emit('conflicts:cleared');
  }
}

export default ConflictResolutionManager;
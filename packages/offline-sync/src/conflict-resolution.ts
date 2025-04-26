/**
 * Conflict Resolution Module
 * 
 * Provides tools and UI for resolving conflicts:
 * - Conflict detection
 * - Manual resolution interface
 * - Resolution strategies
 * - Audit logging
 */

import { EventEmitter } from 'events';
import * as Y from 'yjs';
import { CRDTDocumentManager } from './crdt-sync';
import { StorageManager } from './storage';

// Conflict types
export enum ConflictType {
  VALUE = 'value',           // Conflicting primitive values
  STRUCTURE = 'structure',   // Structural conflicts (e.g., array vs map)
  DELETION = 'deletion',     // One side deleted an entity
  EXISTENCE = 'existence',   // One side created an entity, the other didn't
  DEPENDENCY = 'dependency', // Conflicts in dependent entities
  VERSION = 'version',       // Version conflicts
  SCHEMA = 'schema',         // Schema conflicts
  OTHER = 'other'            // Other conflicts
}

// Resolution strategies
export enum ResolutionStrategy {
  TAKE_LOCAL = 'take_local',       // Use local version
  TAKE_REMOTE = 'take_remote',     // Use remote version
  TAKE_NEWER = 'take_newer',       // Use newer version based on timestamp
  TAKE_OLDER = 'take_older',       // Use older version based on timestamp
  MERGE = 'merge',                 // Merge both versions
  CUSTOM = 'custom',               // Custom resolution
  MANUAL = 'manual'                // Manual resolution by user
}

// Conflict details
export interface ConflictDetails {
  id: string;                     // Unique conflict ID
  docId: string;                  // Document ID
  path: string;                   // Path to conflicted element
  type: ConflictType;             // Type of conflict
  localValue: any;                // Local value
  remoteValue: any;               // Remote value
  timestamp: Date;                // Conflict detection timestamp
  resolved: boolean;              // Whether the conflict is resolved
  resolutionStrategy?: ResolutionStrategy; // Strategy used for resolution
  resolvedValue?: any;            // Value after resolution
  resolvedBy?: string;            // Who resolved the conflict
  resolvedAt?: Date;              // When the conflict was resolved
  metadata?: Record<string, any>; // Additional metadata
}

// Conflict audit log entry
export interface ConflictAuditEntry {
  id: string;                     // Unique audit entry ID
  conflictId: string;             // Conflict ID
  docId: string;                  // Document ID
  timestamp: Date;                // Entry timestamp
  action: string;                 // Action performed
  user?: string;                  // User who performed the action
  details: any;                   // Action details
}

/**
 * Conflict Resolution Manager
 * 
 * Manages conflict detection and resolution.
 */
export class ConflictResolutionManager extends EventEmitter {
  private crdtManager: CRDTDocumentManager;
  private storage: StorageManager;
  private conflicts: Map<string, ConflictDetails> = new Map();
  private auditLog: ConflictAuditEntry[] = [];
  private mergeHandlers: Map<string, (local: any, remote: any) => any> = new Map();
  private conflictDetectors: Map<string, (local: any, remote: any) => boolean> = new Map();
  
  constructor(crdtManager: CRDTDocumentManager, storage: StorageManager) {
    super();
    this.crdtManager = crdtManager;
    this.storage = storage;
    
    // Register default merge handlers
    this.registerDefaultMergeHandlers();
    
    // Register default conflict detectors
    this.registerDefaultConflictDetectors();
  }

  /**
   * Initialize the conflict resolution manager
   */
  public async initialize(): Promise<void> {
    console.log('Initializing conflict resolution manager');
    
    // Load unresolved conflicts from storage
    await this.loadUnresolvedConflicts();
    
    this.emit('initialized');
  }

  /**
   * Register default merge handlers
   */
  private registerDefaultMergeHandlers(): void {
    // Simple primitive values - take newer by default
    this.registerMergeHandler('primitive', (local: any, remote: any, metadata?: any) => {
      if (metadata?.localTime && metadata?.remoteTime) {
        return metadata.localTime > metadata.remoteTime ? local : remote;
      }
      return remote; // Default to remote if no timestamp
    });
    
    // Arrays - concatenate and deduplicate
    this.registerMergeHandler('array', (local: any[], remote: any[]) => {
      if (!Array.isArray(local) || !Array.isArray(remote)) {
        return remote;
      }
      
      // Concatenate arrays and remove duplicates
      const merged = [...local];
      
      for (const item of remote) {
        if (!this.arrayIncludes(merged, item)) {
          merged.push(item);
        }
      }
      
      return merged;
    });
    
    // Objects - deep merge
    this.registerMergeHandler('object', (local: Record<string, any>, remote: Record<string, any>) => {
      if (typeof local !== 'object' || typeof remote !== 'object' || local === null || remote === null) {
        return remote;
      }
      
      const merged = { ...local };
      
      for (const [key, value] of Object.entries(remote)) {
        if (key in merged && typeof merged[key] === 'object' && typeof value === 'object' && merged[key] !== null && value !== null) {
          // Recursively merge nested objects
          merged[key] = this.mergeValues(merged[key], value, 'object');
        } else {
          // For primitive values, or if one side is not an object, take remote
          merged[key] = value;
        }
      }
      
      return merged;
    });
  }

  /**
   * Register default conflict detectors
   */
  private registerDefaultConflictDetectors(): void {
    // Primitive values
    this.registerConflictDetector('primitive', (local: any, remote: any) => {
      // Skip if same type and value
      if (local === remote) return false;
      
      // Check if both are primitives
      const localType = typeof local;
      const remoteType = typeof remote;
      
      // Different types is always a conflict
      if (localType !== remoteType) return true;
      
      // Same type but different values
      return local !== remote;
    });
    
    // Arrays
    this.registerConflictDetector('array', (local: any[], remote: any[]) => {
      // Skip if both are not arrays
      if (!Array.isArray(local) || !Array.isArray(remote)) return true;
      
      // Different lengths is a conflict
      if (local.length !== remote.length) return true;
      
      // Check if arrays have different items
      for (let i = 0; i < local.length; i++) {
        if (!this.areValuesEqual(local[i], remote[i])) {
          return true;
        }
      }
      
      return false;
    });
    
    // Objects
    this.registerConflictDetector('object', (local: Record<string, any>, remote: Record<string, any>) => {
      // Skip if both are not objects
      if (typeof local !== 'object' || typeof remote !== 'object' || local === null || remote === null) return true;
      
      // Different keys is a conflict
      const localKeys = Object.keys(local);
      const remoteKeys = Object.keys(remote);
      
      if (localKeys.length !== remoteKeys.length) return true;
      
      // Check for differences in keys
      for (const key of localKeys) {
        if (!remoteKeys.includes(key)) return true;
        
        if (!this.areValuesEqual(local[key], remote[key])) {
          return true;
        }
      }
      
      return false;
    });
  }

  /**
   * Check if arrays include an item (deep equality)
   */
  private arrayIncludes(array: any[], item: any): boolean {
    return array.some(element => this.areValuesEqual(element, item));
  }

  /**
   * Check if values are equal (deep equality)
   */
  private areValuesEqual(a: any, b: any): boolean {
    // Handle primitives
    if (a === b) return true;
    
    // Handle null/undefined
    if (a === null || a === undefined || b === null || b === undefined) return a === b;
    
    // Handle different types
    if (typeof a !== typeof b) return false;
    
    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      
      for (let i = 0; i < a.length; i++) {
        if (!this.areValuesEqual(a[i], b[i])) return false;
      }
      
      return true;
    }
    
    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!this.areValuesEqual(a[key], b[key])) return false;
      }
      
      return true;
    }
    
    // Handle other types
    return a === b;
  }

  /**
   * Load unresolved conflicts from storage
   */
  private async loadUnresolvedConflicts(): Promise<void> {
    try {
      // In a real implementation, this would load conflicts from storage
      // For demonstration, we'll just initialize an empty map
      this.conflicts = new Map();
      
      // Load audit log
      this.auditLog = [];
    } catch (error) {
      console.error('Error loading unresolved conflicts:', error);
    }
  }

  /**
   * Register a merge handler for a specific type
   */
  public registerMergeHandler(type: string, handler: (local: any, remote: any, metadata?: any) => any): void {
    this.mergeHandlers.set(type, handler);
  }

  /**
   * Register a conflict detector for a specific type
   */
  public registerConflictDetector(type: string, detector: (local: any, remote: any) => boolean): void {
    this.conflictDetectors.set(type, detector);
  }

  /**
   * Detect conflicts between local and remote data
   */
  public detectConflicts(docId: string, localData: any, remoteData: any, path: string = ''): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    
    // Determine the type of data
    let dataType: string;
    
    if (Array.isArray(localData) && Array.isArray(remoteData)) {
      dataType = 'array';
    } else if (typeof localData === 'object' && typeof remoteData === 'object' && localData !== null && remoteData !== null) {
      dataType = 'object';
    } else {
      dataType = 'primitive';
    }
    
    // Get conflict detector for this type
    const detector = this.conflictDetectors.get(dataType);
    
    if (detector) {
      // Check if there is a conflict
      const hasConflict = detector(localData, remoteData);
      
      if (hasConflict) {
        // Create conflict details
        const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        const conflict: ConflictDetails = {
          id: conflictId,
          docId,
          path,
          type: this.determineConflictType(localData, remoteData),
          localValue: localData,
          remoteValue: remoteData,
          timestamp: new Date(),
          resolved: false
        };
        
        conflicts.push(conflict);
        this.conflicts.set(conflictId, conflict);
        
        // Log the conflict
        this.logConflict(conflict, 'detected');
        
        // Emit event
        this.emit('conflict:detected', conflict);
      }
    }
    
    // Recursively check nested properties
    if (dataType === 'object') {
      // Get all keys from both objects
      const keys = new Set([...Object.keys(localData), ...Object.keys(remoteData)]);
      
      for (const key of keys) {
        const localValue = localData[key];
        const remoteValue = remoteData[key];
        
        // Skip if key doesn't exist in one of the objects
        if (localValue === undefined || remoteValue === undefined) {
          // Create existence conflict
          const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          
          const conflict: ConflictDetails = {
            id: conflictId,
            docId,
            path: path ? `${path}.${key}` : key,
            type: ConflictType.EXISTENCE,
            localValue: localValue,
            remoteValue: remoteValue,
            timestamp: new Date(),
            resolved: false
          };
          
          conflicts.push(conflict);
          this.conflicts.set(conflictId, conflict);
          
          // Log the conflict
          this.logConflict(conflict, 'detected');
          
          // Emit event
          this.emit('conflict:detected', conflict);
          
          continue;
        }
        
        // Recursively check nested properties
        const nestedPath = path ? `${path}.${key}` : key;
        const nestedConflicts = this.detectConflicts(docId, localValue, remoteValue, nestedPath);
        
        conflicts.push(...nestedConflicts);
      }
    } else if (dataType === 'array') {
      // For arrays, we don't check individual items recursively
      // Since CRDT arrays are handled differently
    }
    
    return conflicts;
  }

  /**
   * Determine conflict type
   */
  private determineConflictType(localData: any, remoteData: any): ConflictType {
    // Check for deletion
    if (localData === null || localData === undefined) {
      return ConflictType.DELETION;
    }
    
    if (remoteData === null || remoteData === undefined) {
      return ConflictType.DELETION;
    }
    
    // Check for structure conflicts
    if (Array.isArray(localData) !== Array.isArray(remoteData)) {
      return ConflictType.STRUCTURE;
    }
    
    if (typeof localData !== typeof remoteData) {
      return ConflictType.STRUCTURE;
    }
    
    // Default to value conflict
    return ConflictType.VALUE;
  }

  /**
   * Resolve a conflict
   */
  public resolveConflict(conflictId: string, strategy: ResolutionStrategy, userId: string, customValue?: any): boolean {
    const conflict = this.conflicts.get(conflictId);
    
    if (!conflict) {
      console.error(`Conflict not found: ${conflictId}`);
      return false;
    }
    
    if (conflict.resolved) {
      console.error(`Conflict already resolved: ${conflictId}`);
      return false;
    }
    
    let resolvedValue: any;
    
    switch (strategy) {
      case ResolutionStrategy.TAKE_LOCAL:
        resolvedValue = conflict.localValue;
        break;
        
      case ResolutionStrategy.TAKE_REMOTE:
        resolvedValue = conflict.remoteValue;
        break;
        
      case ResolutionStrategy.TAKE_NEWER:
        // This would require timestamp metadata
        resolvedValue = conflict.remoteValue; // Default to remote
        break;
        
      case ResolutionStrategy.TAKE_OLDER:
        // This would require timestamp metadata
        resolvedValue = conflict.localValue; // Default to local
        break;
        
      case ResolutionStrategy.MERGE:
        // Use appropriate merge handler
        resolvedValue = this.mergeValues(conflict.localValue, conflict.remoteValue);
        break;
        
      case ResolutionStrategy.CUSTOM:
        // Use provided custom value
        if (customValue === undefined) {
          console.error('Custom resolution strategy requires a custom value');
          return false;
        }
        resolvedValue = customValue;
        break;
        
      case ResolutionStrategy.MANUAL:
        // This should not be used directly, it's a placeholder
        console.error('Manual resolution strategy should not be used directly');
        return false;
        
      default:
        console.error(`Unknown resolution strategy: ${strategy}`);
        return false;
    }
    
    // Update conflict
    conflict.resolved = true;
    conflict.resolutionStrategy = strategy;
    conflict.resolvedValue = resolvedValue;
    conflict.resolvedBy = userId;
    conflict.resolvedAt = new Date();
    
    this.conflicts.set(conflictId, conflict);
    
    // Apply resolution to document
    const doc = this.crdtManager.getDocument(conflict.docId);
    
    if (doc) {
      // Apply the change to the document
      this.applyResolution(doc, conflict);
      
      // Log the resolution
      this.logConflict(conflict, 'resolved', {
        strategy,
        resolvedBy: userId,
        resolvedValue
      });
      
      // Emit event
      this.emit('conflict:resolved', conflict);
      
      return true;
    } else {
      console.error(`Document not found: ${conflict.docId}`);
      return false;
    }
  }

  /**
   * Apply a conflict resolution to a document
   */
  private applyResolution(doc: Y.Doc, conflict: ConflictDetails): void {
    // Parse the path
    const pathParts = conflict.path.split('.');
    
    // Get the parent object/array
    let parent: any = doc;
    let current: any = doc;
    
    // Path is empty for root object
    if (conflict.path === '') {
      // Handle root object conflicts
      // For Yjs documents, this is more complex
      // In a real implementation, this would update the appropriate shared types
      return;
    }
    
    // Navigate to the parent
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      
      if (part.match(/^\d+$/)) {
        // Array index
        const index = parseInt(part, 10);
        
        if (Array.isArray(current)) {
          parent = current;
          current = current[index];
        } else if (current && typeof current === 'object' && current.get) {
          // Yjs shared type
          parent = current;
          current = current.get(index);
        } else {
          console.error(`Invalid path: ${conflict.path}`);
          return;
        }
      } else {
        // Object property
        if (current && typeof current === 'object') {
          if (current.get) {
            // Yjs shared type
            parent = current;
            current = current.get(part);
          } else {
            parent = current;
            current = current[part];
          }
        } else {
          console.error(`Invalid path: ${conflict.path}`);
          return;
        }
      }
    }
    
    // Get the final part
    const lastPart = pathParts[pathParts.length - 1];
    
    if (parent && typeof parent === 'object') {
      if (parent.set) {
        // Yjs shared type
        parent.set(lastPart, conflict.resolvedValue);
      } else if (Array.isArray(parent) && lastPart.match(/^\d+$/)) {
        // Array
        const index = parseInt(lastPart, 10);
        parent[index] = conflict.resolvedValue;
      } else {
        // Object
        parent[lastPart] = conflict.resolvedValue;
      }
    } else {
      console.error(`Invalid parent type for path: ${conflict.path}`);
    }
  }

  /**
   * Merge values using the appropriate handler
   */
  private mergeValues(localData: any, remoteData: any, type?: string): any {
    let dataType = type;
    
    if (!dataType) {
      if (Array.isArray(localData) && Array.isArray(remoteData)) {
        dataType = 'array';
      } else if (typeof localData === 'object' && typeof remoteData === 'object' && localData !== null && remoteData !== null) {
        dataType = 'object';
      } else {
        dataType = 'primitive';
      }
    }
    
    // Get merge handler for this type
    const handler = this.mergeHandlers.get(dataType);
    
    if (handler) {
      return handler(localData, remoteData);
    }
    
    // Default to remote if no handler
    return remoteData;
  }

  /**
   * Log a conflict action
   */
  private logConflict(conflict: ConflictDetails, action: string, details?: any): void {
    const auditEntry: ConflictAuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      conflictId: conflict.id,
      docId: conflict.docId,
      timestamp: new Date(),
      action,
      user: conflict.resolvedBy,
      details: details || {}
    };
    
    this.auditLog.push(auditEntry);
    
    // In a real implementation, this would also be stored persistently
    
    this.emit('audit:logged', auditEntry);
  }

  /**
   * Get all conflicts
   */
  public getAllConflicts(): ConflictDetails[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get unresolved conflicts
   */
  public getUnresolvedConflicts(): ConflictDetails[] {
    return Array.from(this.conflicts.values()).filter(conflict => !conflict.resolved);
  }

  /**
   * Get conflicts for a document
   */
  public getConflictsForDocument(docId: string): ConflictDetails[] {
    return Array.from(this.conflicts.values()).filter(conflict => conflict.docId === docId);
  }

  /**
   * Get unresolved conflicts for a document
   */
  public getUnresolvedConflictsForDocument(docId: string): ConflictDetails[] {
    return Array.from(this.conflicts.values()).filter(conflict => conflict.docId === docId && !conflict.resolved);
  }

  /**
   * Get conflict by ID
   */
  public getConflict(conflictId: string): ConflictDetails | undefined {
    return this.conflicts.get(conflictId);
  }

  /**
   * Get audit log entries
   */
  public getAuditLog(): ConflictAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Get audit log for a conflict
   */
  public getAuditLogForConflict(conflictId: string): ConflictAuditEntry[] {
    return this.auditLog.filter(entry => entry.conflictId === conflictId);
  }

  /**
   * Get audit log for a document
   */
  public getAuditLogForDocument(docId: string): ConflictAuditEntry[] {
    return this.auditLog.filter(entry => entry.docId === docId);
  }

  /**
   * Clear resolved conflicts
   */
  public clearResolvedConflicts(): void {
    // Remove resolved conflicts
    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.resolved) {
        this.conflicts.delete(id);
      }
    }
    
    this.emit('conflicts:cleared');
  }
}

/**
 * Create a new conflict resolution manager
 */
export function createConflictResolutionManager(
  crdtManager: CRDTDocumentManager,
  storage: StorageManager
): ConflictResolutionManager {
  return new ConflictResolutionManager(crdtManager, storage);
}
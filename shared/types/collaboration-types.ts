/**
 * Collaboration Types
 * 
 * This file defines types related to the collaboration system.
 */

/**
 * Types of collaboration messages
 */
export enum CollaborationMessageType {
  // Session management
  JOIN_SESSION = 'join_session',
  LEAVE_SESSION = 'leave_session',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  
  // Real-time editing
  CURSOR_POSITION = 'cursor_position',
  EDIT_OPERATION = 'edit_operation',
  COMMENT = 'comment',
  
  // System messages
  CONNECTION_ESTABLISHED = 'connection_established',
  ERROR = 'error',
  NOTIFICATION = 'notification',
  
  // Heartbeat
  PING = 'ping',
  PONG = 'pong'
}

/**
 * User roles in a collaboration session
 */
export enum CollaborationRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

/**
 * Base interface for all collaboration messages
 */
export interface CollaborationMessage {
  type: CollaborationMessageType | string;
  sessionId?: string;
  userId?: number;
  userName?: string;
  timestamp: number;
  payload?: any;
}

/**
 * User information in a collaboration session
 */
export interface CollaborationUser {
  id: number;
  name: string;
  role: CollaborationRole;
  cursorPosition?: {
    x: number;
    y: number;
    section?: string;
  };
  connected: boolean;
  lastActive: number;
}

/**
 * Collaboration session information
 */
export interface CollaborationSession {
  id: string;
  name: string;
  created: number;
  ownerId: number;
  users: CollaborationUser[];
  documentId?: string;
  activeSections?: string[];
}
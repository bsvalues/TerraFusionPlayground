/**
 * Team Collaboration WebSocket Service
 * 
 * This service enables real-time collaboration between team members
 * via WebSockets. It handles:
 * - User presence and status updates
 * - Real-time chat messages
 * - Task assignment notifications
 * - Activity streaming for team dashboards
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IStorage } from '../storage';
import { randomUUID } from 'crypto';

// Define message types for team collaboration
export enum TeamCollaborationMessageType {
  JOIN_SESSION = 'join_session',
  LEAVE_SESSION = 'leave_session',
  CHAT_MESSAGE = 'chat_message',
  STATUS_UPDATE = 'status_update',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  COMMENT_ADDED = 'comment_added',
  USER_ACTIVITY = 'user_activity',
  MEETING_REMINDER = 'meeting_reminder',
  ERROR = 'error'
}

// Base message interface
interface TeamCollaborationMessage {
  type: TeamCollaborationMessageType;
  timestamp: string;
  sessionId: string;
  senderId: number;
  senderName?: string;
}

// Session join message
interface JoinSessionMessage extends TeamCollaborationMessage {
  type: TeamCollaborationMessageType.JOIN_SESSION;
  userId: number;
  userName: string;
  userRole: string;
}

// Chat message
interface ChatMessage extends TeamCollaborationMessage {
  type: TeamCollaborationMessageType.CHAT_MESSAGE;
  content: string;
  threadId?: string; // For threaded conversations
}

// Status update message
interface StatusUpdateMessage extends TeamCollaborationMessage {
  type: TeamCollaborationMessageType.STATUS_UPDATE;
  status: string;
  activity?: string;
}

// Task assigned message
interface TaskAssignedMessage extends TeamCollaborationMessage {
  type: TeamCollaborationMessageType.TASK_ASSIGNED;
  taskId: string;
  taskTitle: string;
  assigneeId: number;
  assigneeName: string;
  priority: string;
}

// Task updated message
interface TaskUpdatedMessage extends TeamCollaborationMessage {
  type: TeamCollaborationMessageType.TASK_UPDATED;
  taskId: string;
  taskTitle: string;
  updatedFields: string[];
  updatedBy: number;
  updatedByName: string;
}

// Comment added message
interface CommentAddedMessage extends TeamCollaborationMessage {
  type: TeamCollaborationMessageType.COMMENT_ADDED;
  taskId: string;
  commentId: string;
  content: string;
}

// User activity message
interface UserActivityMessage extends TeamCollaborationMessage {
  type: TeamCollaborationMessageType.USER_ACTIVITY;
  userId: number;
  userName: string;
  activityType: string;
  entityType: string;
  entityId: string;
  details?: any;
}

// Meeting reminder message
interface MeetingReminderMessage extends TeamCollaborationMessage {
  type: TeamCollaborationMessageType.MEETING_REMINDER;
  meetingId: string;
  title: string;
  startTime: string;
  durationMinutes: number;
  participantIds: number[];
}

// Error message
interface ErrorMessage extends TeamCollaborationMessage {
  type: TeamCollaborationMessageType.ERROR;
  errorCode: string;
  errorMessage: string;
}

// Union type for all message types
type TeamMessage = 
  | JoinSessionMessage
  | ChatMessage
  | StatusUpdateMessage
  | TaskAssignedMessage
  | TaskUpdatedMessage
  | CommentAddedMessage
  | UserActivityMessage
  | MeetingReminderMessage
  | ErrorMessage;

// Client connection information
interface ClientConnection {
  socket: WebSocket;
  userId: number;
  userName: string;
  userRole: string;
  lastActivity: Date;
}

/**
 * Team Collaboration WebSocket Service
 * Manages real-time communication between team members
 */
export class TeamCollaborationWebSocketService {
  private wss: WebSocketServer;
  private storage: IStorage;
  
  // Map of sessionId -> Map of userId -> ClientConnection
  private sessions: Map<string, Map<number, ClientConnection>> = new Map();
  
  // Pending authentication requests
  private pendingAuthentication: Map<string, { socket: WebSocket, authTimeout: NodeJS.Timeout }> = new Map();
  
  constructor(server: Server, storage: IStorage) {
    this.storage = storage;
    this.wss = new WebSocketServer({ server, path: '/ws/team-collaboration' });
    this.initializeWebSocketServer();
    console.log('Team Collaboration WebSocket Service initialized');
  }
  
  /**
   * Initialize the WebSocket server and set up event handlers
   */
  private initializeWebSocketServer() {
    this.wss.on('connection', (socket: WebSocket) => {
      // Generate a unique connection ID for this socket
      const connectionId = randomUUID();
      
      // Set a timeout for authentication
      const authTimeout = setTimeout(() => {
        this.handleAuthenticationTimeout(connectionId);
      }, 30000); // 30 seconds timeout for authentication
      
      // Store pending authentication
      this.pendingAuthentication.set(connectionId, {
        socket,
        authTimeout
      });
      
      // Send a welcome message requiring authentication
      socket.send(JSON.stringify({
        type: 'auth_required',
        connectionId,
        message: 'Please authenticate with sessionId and userId'
      }));
      
      // Set up message handler
      socket.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Handle authentication
          if (message.type === 'authenticate') {
            this.handleAuthentication(connectionId, socket, message);
            return;
          }
          
          // For all other messages, find the user's connection
          const userConnection = this.findUserConnection(socket);
          
          if (!userConnection) {
            socket.send(JSON.stringify({
              type: TeamCollaborationMessageType.ERROR,
              errorCode: 'not_authenticated',
              errorMessage: 'Not authenticated or session expired',
              timestamp: new Date().toISOString(),
              sessionId: '',
              senderId: 0
            }));
            return;
          }
          
          // Update last activity timestamp
          userConnection.lastActivity = new Date();
          
          // Process the message based on its type
          this.handleMessage(userConnection, message);
        } catch (error) {
          console.error('Error processing message:', error);
          socket.send(JSON.stringify({
            type: TeamCollaborationMessageType.ERROR,
            errorCode: 'invalid_message',
            errorMessage: 'Invalid message format',
            timestamp: new Date().toISOString(),
            sessionId: '',
            senderId: 0
          }));
        }
      });
      
      // Handle disconnection
      socket.on('close', () => {
        // Check if this was a pending authentication
        if (this.pendingAuthentication.has(connectionId)) {
          const pending = this.pendingAuthentication.get(connectionId);
          if (pending) {
            clearTimeout(pending.authTimeout);
            this.pendingAuthentication.delete(connectionId);
          }
        } else {
          // Find and remove the client from any session
          this.handleDisconnect(socket);
        }
      });
      
      // Handle errors
      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }
  
  /**
   * Handle authentication timeout
   * @param connectionId The connection ID
   */
  private handleAuthenticationTimeout(connectionId: string) {
    const pending = this.pendingAuthentication.get(connectionId);
    if (pending) {
      pending.socket.send(JSON.stringify({
        type: TeamCollaborationMessageType.ERROR,
        errorCode: 'auth_timeout',
        errorMessage: 'Authentication timeout',
        timestamp: new Date().toISOString(),
        sessionId: '',
        senderId: 0
      }));
      
      pending.socket.close();
      this.pendingAuthentication.delete(connectionId);
    }
  }
  
  /**
   * Handle authentication message
   * @param connectionId The connection ID
   * @param socket The WebSocket connection
   * @param message The authentication message
   */
  private async handleAuthentication(connectionId: string, socket: WebSocket, message: any) {
    // Remove from pending authentication
    const pending = this.pendingAuthentication.get(connectionId);
    if (!pending) {
      // This shouldn't happen, but just in case
      socket.close();
      return;
    }
    
    clearTimeout(pending.authTimeout);
    this.pendingAuthentication.delete(connectionId);
    
    // Validate session and user
    const { sessionId, userId, userName, userRole } = message;
    
    try {
      // Verify the session exists
      const session = await this.storage.getCollaborationSessionById(sessionId);
      
      if (!session) {
        socket.send(JSON.stringify({
          type: TeamCollaborationMessageType.ERROR,
          errorCode: 'invalid_session',
          errorMessage: 'Invalid session ID',
          timestamp: new Date().toISOString(),
          sessionId: '',
          senderId: 0
        }));
        socket.close();
        return;
      }
      
      // Verify the user exists
      const user = await this.storage.getTeamMemberById(userId);
      
      if (!user) {
        socket.send(JSON.stringify({
          type: TeamCollaborationMessageType.ERROR,
          errorCode: 'invalid_user',
          errorMessage: 'Invalid user ID',
          timestamp: new Date().toISOString(),
          sessionId: '',
          senderId: 0
        }));
        socket.close();
        return;
      }
      
      // Create a new session map if it doesn't exist
      if (!this.sessions.has(sessionId)) {
        this.sessions.set(sessionId, new Map());
      }
      
      // Get the session map
      const sessionMap = this.sessions.get(sessionId)!;
      
      // Add the user to the session
      sessionMap.set(userId, {
        socket,
        userId,
        userName: userName || user.name,
        userRole: userRole || user.role,
        lastActivity: new Date()
      });
      
      // Send a success message
      socket.send(JSON.stringify({
        type: 'auth_success',
        message: 'Successfully authenticated',
        sessionId,
        userId
      }));
      
      // Broadcast join message to all users in the session
      this.broadcastToSession(sessionId, {
        type: TeamCollaborationMessageType.JOIN_SESSION,
        sessionId,
        senderId: userId,
        senderName: userName || user.name,
        timestamp: new Date().toISOString(),
        userId,
        userName: userName || user.name,
        userRole: userRole || user.role
      }, [userId]); // Exclude the user who just joined
      
      // Send the current session state to the user
      this.sendSessionState(sessionId, userId);
      
      // Log to the database that the user joined the session
      await this.storage.createSystemActivity({
        activity_type: 'session_joined',
        component: 'team_collaboration',
        status: 'success',
        details: {
          sessionId,
          userId,
          userName: userName || user.name,
          userRole: userRole || user.role,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error authenticating user:', error);
      socket.send(JSON.stringify({
        type: TeamCollaborationMessageType.ERROR,
        errorCode: 'auth_error',
        errorMessage: 'Authentication error',
        timestamp: new Date().toISOString(),
        sessionId: '',
        senderId: 0
      }));
      socket.close();
    }
  }
  
  /**
   * Send the current session state to a user
   * @param sessionId The session ID
   * @param userId The user ID
   */
  private async sendSessionState(sessionId: string, userId: number) {
    const sessionMap = this.sessions.get(sessionId);
    if (!sessionMap) return;
    
    const userConnection = sessionMap.get(userId);
    if (!userConnection) return;
    
    // Get active users in the session
    const activeUsers = Array.from(sessionMap.entries()).map(([id, connection]) => ({
      userId: id,
      userName: connection.userName,
      userRole: connection.userRole,
      lastActivity: connection.lastActivity.toISOString()
    }));
    
    // Send the session state to the user
    userConnection.socket.send(JSON.stringify({
      type: 'session_state',
      sessionId,
      activeUsers,
      timestamp: new Date().toISOString()
    }));
    
    try {
      // Get recent messages and activity for this session
      const recentActivity = await this.getRecentSessionActivity(sessionId);
      
      // Send recent activity to the user
      userConnection.socket.send(JSON.stringify({
        type: 'recent_activity',
        sessionId,
        activities: recentActivity,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error getting recent session activity:', error);
    }
  }
  
  /**
   * Get recent activity for a session
   * @param sessionId The session ID
   */
  private async getRecentSessionActivity(sessionId: string) {
    // This would be implemented to fetch recent chat messages, task updates, etc.
    // from the database for the given session
    return []; // Placeholder for now
  }
  
  /**
   * Handle a message from a client
   * @param connection The client connection
   * @param message The message
   */
  private async handleMessage(connection: ClientConnection, message: TeamMessage) {
    const { userId, userName, userRole } = connection;
    const { type, sessionId } = message;
    
    // Validate that the user has access to the session
    const sessionMap = this.sessions.get(sessionId);
    if (!sessionMap || !sessionMap.has(userId)) {
      connection.socket.send(JSON.stringify({
        type: TeamCollaborationMessageType.ERROR,
        errorCode: 'session_access_denied',
        errorMessage: 'Access to this session denied',
        timestamp: new Date().toISOString(),
        sessionId: '',
        senderId: 0
      }));
      return;
    }
    
    // Make sure sender information is consistent
    message.senderId = userId;
    message.senderName = userName;
    message.timestamp = new Date().toISOString();
    
    // Process the message based on its type
    switch (type) {
      case TeamCollaborationMessageType.CHAT_MESSAGE:
        await this.handleChatMessage(sessionId, message as ChatMessage);
        break;
      
      case TeamCollaborationMessageType.STATUS_UPDATE:
        await this.handleStatusUpdate(sessionId, message as StatusUpdateMessage);
        break;
      
      case TeamCollaborationMessageType.TASK_ASSIGNED:
        await this.handleTaskAssigned(sessionId, message as TaskAssignedMessage);
        break;
      
      case TeamCollaborationMessageType.TASK_UPDATED:
        await this.handleTaskUpdated(sessionId, message as TaskUpdatedMessage);
        break;
      
      case TeamCollaborationMessageType.COMMENT_ADDED:
        await this.handleCommentAdded(sessionId, message as CommentAddedMessage);
        break;
      
      case TeamCollaborationMessageType.USER_ACTIVITY:
        await this.handleUserActivity(sessionId, message as UserActivityMessage);
        break;
      
      default:
        console.warn(`Unhandled message type: ${type}`);
        break;
    }
  }
  
  /**
   * Handle a chat message
   * @param sessionId The session ID
   * @param message The chat message
   */
  private async handleChatMessage(sessionId: string, message: ChatMessage) {
    // Store the chat message in the database
    try {
      await this.storage.createTeamChatMessage({
        content: message.content,
        userId: message.senderId,
        sessionId: sessionId,
        timestamp: new Date(),
        threadId: message.threadId || null
      });
    } catch (error) {
      console.error('Error storing chat message:', error);
    }
    
    // Broadcast the message to all users in the session
    this.broadcastToSession(sessionId, message);
  }
  
  /**
   * Handle a status update
   * @param sessionId The session ID
   * @param message The status update message
   */
  private async handleStatusUpdate(sessionId: string, message: StatusUpdateMessage) {
    const { senderId, status, activity } = message;
    
    // Update the user's status in the database
    try {
      await this.storage.updateTeamMemberStatus(senderId, status);
      
      // Log the activity
      await this.storage.createSystemActivity({
        activity_type: 'status_update',
        component: 'team_collaboration',
        status: 'success',
        details: {
          userId: senderId,
          status,
          activity,
          sessionId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
    
    // Broadcast the status update to all users in the session
    this.broadcastToSession(sessionId, message);
  }
  
  /**
   * Handle a task assigned message
   * @param sessionId The session ID
   * @param message The task assigned message
   */
  private async handleTaskAssigned(sessionId: string, message: TaskAssignedMessage) {
    // Store the task assignment in the database
    try {
      // Update the task assignment
      await this.storage.updateTaskAssignment(message.taskId, message.assigneeId);
      
      // Log the activity
      await this.storage.createSystemActivity({
        activity_type: 'task_assigned',
        component: 'team_collaboration',
        status: 'success',
        details: {
          taskId: message.taskId,
          assigneeId: message.assigneeId,
          assignedBy: message.senderId,
          sessionId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error storing task assignment:', error);
    }
    
    // Broadcast the message to all users in the session
    this.broadcastToSession(sessionId, message);
  }
  
  /**
   * Handle a task updated message
   * @param sessionId The session ID
   * @param message The task updated message
   */
  private async handleTaskUpdated(sessionId: string, message: TaskUpdatedMessage) {
    // Log the task update in the database
    try {
      await this.storage.createSystemActivity({
        activity_type: 'task_updated',
        component: 'team_collaboration',
        status: 'success',
        details: {
          taskId: message.taskId,
          updatedBy: message.updatedBy,
          updatedFields: message.updatedFields,
          sessionId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error logging task update:', error);
    }
    
    // Broadcast the message to all users in the session
    this.broadcastToSession(sessionId, message);
  }
  
  /**
   * Handle a comment added message
   * @param sessionId The session ID
   * @param message The comment added message
   */
  private async handleCommentAdded(sessionId: string, message: CommentAddedMessage) {
    // Log the comment in the database
    try {
      await this.storage.createSystemActivity({
        activity_type: 'comment_added',
        component: 'team_collaboration',
        status: 'success',
        details: {
          taskId: message.taskId,
          commentId: message.commentId,
          userId: message.senderId,
          sessionId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error logging comment:', error);
    }
    
    // Broadcast the message to all users in the session
    this.broadcastToSession(sessionId, message);
  }
  
  /**
   * Handle a user activity message
   * @param sessionId The session ID
   * @param message The user activity message
   */
  private async handleUserActivity(sessionId: string, message: UserActivityMessage) {
    // Log the activity in the database
    try {
      await this.storage.createSystemActivity({
        activity_type: message.activityType,
        component: 'team_collaboration',
        status: 'success',
        details: {
          userId: message.userId,
          entityType: message.entityType,
          entityId: message.entityId,
          details: message.details,
          sessionId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
    
    // Broadcast the message to all users in the session
    this.broadcastToSession(sessionId, message);
  }
  
  /**
   * Handle client disconnection
   * @param socket The WebSocket connection
   */
  private handleDisconnect(socket: WebSocket) {
    // Find the user connection
    for (const [sessionId, sessionMap] of this.sessions.entries()) {
      for (const [userId, connection] of sessionMap.entries()) {
        if (connection.socket === socket) {
          // Remove the user from the session
          sessionMap.delete(userId);
          
          // If the session is empty, remove it
          if (sessionMap.size === 0) {
            this.sessions.delete(sessionId);
          } else {
            // Broadcast leave message to other users in the session
            this.broadcastToSession(sessionId, {
              type: TeamCollaborationMessageType.LEAVE_SESSION,
              sessionId,
              senderId: userId,
              senderName: connection.userName,
              timestamp: new Date().toISOString(),
              userId,
              userName: connection.userName,
              userRole: connection.userRole
            });
          }
          
          // Log to the database that the user left the session
          this.storage.createSystemActivity({
            activity_type: 'session_left',
            component: 'team_collaboration',
            status: 'success',
            details: {
              sessionId,
              userId,
              userName: connection.userName,
              userRole: connection.userRole,
              timestamp: new Date().toISOString()
            }
          }).catch(error => {
            console.error('Error logging session leave:', error);
          });
          
          return;
        }
      }
    }
  }
  
  /**
   * Broadcast a message to all users in a session
   * @param sessionId The session ID
   * @param message The message to broadcast
   * @param excludeUserIds User IDs to exclude from the broadcast
   */
  private broadcastToSession(
    sessionId: string, 
    message: any, 
    excludeUserIds: number[] = []
  ) {
    const sessionMap = this.sessions.get(sessionId);
    if (!sessionMap) return;
    
    const messageStr = JSON.stringify(message);
    
    for (const [userId, connection] of sessionMap.entries()) {
      if (excludeUserIds.includes(userId)) continue;
      
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(messageStr);
      }
    }
  }
  
  /**
   * Find a user connection by socket
   * @param socket The WebSocket connection
   * @returns The user connection or undefined if not found
   */
  private findUserConnection(socket: WebSocket): ClientConnection | undefined {
    for (const sessionMap of this.sessions.values()) {
      for (const connection of sessionMap.values()) {
        if (connection.socket === socket) {
          return connection;
        }
      }
    }
    return undefined;
  }
  
  /**
   * Send a message to a specific user
   * @param sessionId The session ID
   * @param userId The user ID
   * @param message The message to send
   */
  public sendMessageToUser(sessionId: string, userId: number, message: any) {
    const sessionMap = this.sessions.get(sessionId);
    if (!sessionMap) return false;
    
    const connection = sessionMap.get(userId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) return false;
    
    connection.socket.send(JSON.stringify(message));
    return true;
  }
  
  /**
   * Broadcast a system message to all users in a session
   * @param sessionId The session ID
   * @param messageType The message type
   * @param messageData Additional message data
   */
  public broadcastSystemMessage(
    sessionId: string, 
    messageType: TeamCollaborationMessageType, 
    messageData: any
  ) {
    const message = {
      type: messageType,
      sessionId,
      senderId: 0,  // 0 indicates system message
      senderName: 'System',
      timestamp: new Date().toISOString(),
      ...messageData
    };
    
    this.broadcastToSession(sessionId, message);
    return true;
  }
  
  /**
   * Get active sessions
   * @returns Map of session IDs to user counts
   */
  public getActiveSessions() {
    const sessionCounts = new Map<string, number>();
    
    for (const [sessionId, sessionMap] of this.sessions.entries()) {
      sessionCounts.set(sessionId, sessionMap.size);
    }
    
    return sessionCounts;
  }
  
  /**
   * Get active users in a session
   * @param sessionId The session ID
   * @returns Array of active user information
   */
  public getActiveUsersInSession(sessionId: string) {
    const sessionMap = this.sessions.get(sessionId);
    if (!sessionMap) return [];
    
    return Array.from(sessionMap.entries()).map(([userId, connection]) => ({
      userId,
      userName: connection.userName,
      userRole: connection.userRole,
      lastActivity: connection.lastActivity.toISOString()
    }));
  }
}
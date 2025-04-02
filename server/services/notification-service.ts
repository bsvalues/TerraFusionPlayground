/**
 * Notification Service
 * 
 * This service provides real-time notification capabilities for the MCP system,
 * similar to the MessageService described in the Benton County configuration.
 * It handles property changes, alerts, and system announcements.
 */

import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AuditLog, SystemActivity } from '@shared/schema';
import { storage } from '../storage';

// Define the supported notification types
export enum NotificationType {
  PROPERTY_CHANGE = 'property_change',
  PROTEST_STATUS = 'protest_status',
  SYSTEM_ALERT = 'system_alert',
  AI_AGENT_ACTIVITY = 'ai_agent_activity',
  PACS_UPDATE = 'pacs_update'
}

// Define the notification structure
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  data?: any;
}

/**
 * Main class for notification functionality
 */
export class NotificationService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private notifications: Map<string, Notification[]> = new Map();
  private systemNotifications: Notification[] = [];
  
  /**
   * Initialize the WebSocket server for real-time notifications
   */
  initialize(server: Server) {
    // Create WebSocket server with proper configuration and a specific path
    // to avoid conflicts with Vite's WebSocket server
    this.wss = new WebSocketServer({
      server,
      path: '/api/notifications/ws',
      // Add error handling for WebSocket
      clientTracking: true,
      // Set a reasonable ping interval and timeout
      perMessageDeflate: false
    });
    
    // Handle WebSocket server errors
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
    
    // Handle connections
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('New client connected to notification service');
      
      // Send initial connection acknowledgment
      try {
        ws.send(JSON.stringify({
          type: 'connection_established',
          message: 'Connected to notification service'
        }));
      } catch (err) {
        console.error('Error sending welcome message:', err);
      }
      
      // Handle WebSocket errors
      ws.on('error', (err) => {
        console.error('WebSocket connection error:', err);
      });
      
      // Handle messages from clients with better error handling
      ws.on('message', (message: string) => {
        try {
          // Try to parse the message
          const data = JSON.parse(message.toString());
          
          // Handle client authentication
          if (data.type === 'auth') {
            const userId = data.userId;
            if (userId) {
              this.clients.set(userId, ws);
              console.log(`Client authenticated with user ID: ${userId}`);
              
              // Send unread notifications
              const userNotifications = this.notifications.get(userId) || [];
              const unreadNotifications = userNotifications.filter(n => !n.isRead);
              if (unreadNotifications.length > 0) {
                try {
                  ws.send(JSON.stringify({
                    type: 'notifications',
                    notifications: unreadNotifications
                  }));
                } catch (err) {
                  console.error('Error sending notifications:', err);
                }
              }
            }
          }
          
          // Handle notification read acknowledgment
          if (data.type === 'mark_read') {
            const userId = data.userId;
            const notificationId = data.notificationId;
            
            if (userId && notificationId) {
              this.markNotificationAsRead(userId, notificationId);
            }
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });
      
      // Handle disconnections
      ws.on('close', () => {
        console.log('Client disconnected from notification service');
        // Remove client from the map (find by value)
        // Convert to array for iteration to avoid MapIterator issue
        Array.from(this.clients.entries()).forEach(([userId, client]) => {
          if (client === ws) {
            this.clients.delete(userId);
          }
        });
      });
      
      // Send system notifications to newly connected client
      if (this.systemNotifications.length > 0) {
        ws.send(JSON.stringify({
          type: 'system_notifications',
          notifications: this.systemNotifications
        }));
      }
    });
    
    console.log('Notification service initialized');
  }
  
  /**
   * Generate a unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Create and send a notification to a specific user
   */
  sendUserNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    data?: any
  ): Notification {
    const notification: Notification = {
      id: this.generateNotificationId(),
      type,
      title,
      message,
      entityType,
      entityId,
      timestamp: new Date(),
      isRead: false,
      priority,
      data
    };
    
    // Store the notification
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId)!.push(notification);
    
    // Send the notification if the user is connected
    const client = this.clients.get(userId);
    if (client) {
      client.send(JSON.stringify({
        type: 'notification',
        notification
      }));
    }
    
    return notification;
  }
  
  /**
   * Create and broadcast a system notification to all connected clients
   */
  broadcastSystemNotification(
    type: NotificationType,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    data?: any
  ): Notification {
    const notification: Notification = {
      id: this.generateNotificationId(),
      type,
      title,
      message,
      entityType,
      entityId,
      timestamp: new Date(),
      isRead: false,
      priority,
      data
    };
    
    // Store the system notification
    this.systemNotifications.push(notification);
    // Keep only the last 100 system notifications
    if (this.systemNotifications.length > 100) {
      this.systemNotifications.shift();
    }
    
    // Broadcast to all connected clients
    if (this.wss) {
      // Use forEach with explicit type
      this.wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'system_notification',
            notification
          }));
        }
      });
    }
    
    return notification;
  }
  
  /**
   * Mark a notification as read
   */
  markNotificationAsRead(userId: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;
    
    const notification = userNotifications.find(n => n.id === notificationId);
    if (!notification) return false;
    
    notification.isRead = true;
    return true;
  }
  
  /**
   * Get all notifications for a user
   */
  getUserNotifications(userId: string): Notification[] {
    return this.notifications.get(userId) || [];
  }
  
  /**
   * Get all system notifications
   */
  getSystemNotifications(): Notification[] {
    return [...this.systemNotifications];
  }
  
  /**
   * Create a notification based on an audit log
   */
  createNotificationFromAuditLog(auditLog: AuditLog) {
    // Define mapping from audit actions to notification types
    const actionTypeMap: { [key: string]: NotificationType } = {
      'CREATE': NotificationType.PROPERTY_CHANGE,
      'UPDATE': NotificationType.PROPERTY_CHANGE,
      'DELETE': NotificationType.PROPERTY_CHANGE,
      'QUERY': NotificationType.AI_AGENT_ACTIVITY,
      'SUMMARY': NotificationType.AI_AGENT_ACTIVITY
    };
    
    // Get the appropriate notification type
    const notificationType = actionTypeMap[auditLog.action] || NotificationType.SYSTEM_ALERT;
    
    // Determine the title based on entity type and action
    let title = 'System Activity';
    let message = 'An action occurred in the system.';
    
    switch (auditLog.entityType) {
      case 'property':
        title = `Property ${auditLog.action}`;
        message = `Property ${auditLog.entityId} was ${auditLog.action.toLowerCase()}d.`;
        break;
      case 'landRecord':
        title = `Land Record ${auditLog.action}`;
        message = `Land record for property ${auditLog.entityId} was ${auditLog.action.toLowerCase()}d.`;
        break;
      case 'improvement':
        title = `Improvement ${auditLog.action}`;
        message = `Improvement for property ${auditLog.entityId} was ${auditLog.action.toLowerCase()}d.`;
        break;
      case 'protest':
        title = `Protest ${auditLog.action}`;
        message = `Protest for property ${auditLog.entityId} was ${auditLog.action.toLowerCase()}d.`;
        break;
      case 'protestStatus':
        title = 'Protest Status Update';
        message = `Status updated for protest on property ${auditLog.entityId}.`;
        break;
      case 'naturalLanguage':
        title = 'Natural Language Query';
        message = `A natural language query was processed.`;
        break;
      default:
        title = `${auditLog.entityType} ${auditLog.action}`;
        message = `A ${auditLog.entityType} was ${auditLog.action.toLowerCase()}d.`;
    }
    
    // If there's a user ID, send as a user notification
    if (auditLog.userId) {
      return this.sendUserNotification(
        auditLog.userId.toString(),
        notificationType,
        title,
        message,
        auditLog.entityType,
        auditLog.entityId || undefined,
        'medium',
        auditLog.details
      );
    } else {
      // Otherwise, broadcast as a system notification
      return this.broadcastSystemNotification(
        notificationType,
        title,
        message,
        auditLog.entityType,
        auditLog.entityId || undefined,
        'medium',
        auditLog.details
      );
    }
  }
  
  /**
   * Create a notification based on system activity
   */
  createNotificationFromSystemActivity(activity: SystemActivity) {
    // Determine notification type based on activity
    let notificationType = NotificationType.SYSTEM_ALERT;
    
    if (activity.agentId) {
      notificationType = NotificationType.AI_AGENT_ACTIVITY;
    }
    
    // Create and broadcast the notification
    return this.broadcastSystemNotification(
      notificationType,
      'System Activity',
      activity.activity,
      activity.entityType || undefined,
      activity.entityId || undefined,
      'low'
    );
  }
}

export const notificationService = new NotificationService();
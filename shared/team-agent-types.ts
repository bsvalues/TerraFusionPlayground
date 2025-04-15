/**
 * Team Agent Types
 * 
 * This file defines the types and interfaces for the team collaboration agents
 * that support property assessment operations by simulating different team members.
 */

import { z } from 'zod';

/**
 * Team Member Role
 */
export enum TeamMemberRole {
  FRONTEND_DEVELOPER = 'frontend_developer',
  BACKEND_DEVELOPER = 'backend_developer',
  DESIGNER = 'designer',
  QA_TESTER = 'qa_tester',
  ASSESSOR = 'county_assessor'
}

/**
 * Team Member Status
 */
export enum TeamMemberStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
  IN_MEETING = 'in_meeting'
}

/**
 * Task Priority
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Task Status
 */
export enum TaskStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  TESTING = 'testing',
  DONE = 'done',
  BLOCKED = 'blocked'
}

/**
 * Team member capabilities schema
 */
export const teamMemberCapabilitiesSchema = z.object({
  skills: z.array(z.string()),
  expertiseLevel: z.enum(['junior', 'mid', 'senior', 'expert']),
  toolsAndFrameworks: z.array(z.string()),
  availability: z.object({
    hoursPerWeek: z.number(),
    preferredWorkingHours: z.object({
      start: z.string(),
      end: z.string()
    }),
    timeZone: z.string()
  })
});

/**
 * Team member schema
 */
export const teamMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  role: z.string(), // TeamMemberRole as string for flexibility
  status: z.string().default(TeamMemberStatus.AVAILABLE),
  capabilities: teamMemberCapabilitiesSchema,
  avatar: z.string().nullable().optional(),
  email: z.string(),
  joinedAt: z.date(),
  lastActive: z.date()
});

/**
 * Task schema
 */
export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  assignedTo: z.number().nullable().optional(),
  createdBy: z.number(),
  status: z.string().default(TaskStatus.BACKLOG),
  priority: z.string().default(TaskPriority.MEDIUM),
  createdAt: z.date(),
  updatedAt: z.date(),
  dueDate: z.date().nullable().optional(),
  estimatedHours: z.number().nullable().optional(),
  actualHours: z.number().nullable().optional(),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.string()).default([])
});

/**
 * Task comment schema
 */
export const taskCommentSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.number(),
  content: z.string(),
  timestamp: z.date(),
  attachments: z.array(z.string()).default([])
});

/**
 * Team collaboration session schema
 */
export const teamCollaborationSessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  startTime: z.date(),
  endTime: z.date().nullable().optional(),
  status: z.string(), // scheduled, in_progress, completed, cancelled
  participants: z.array(z.number()),
  organizer: z.number(),
  agenda: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
  recordingUrl: z.string().nullable().optional(),
  taskIds: z.array(z.string().uuid()).default([])
});

/**
 * Team feedback schema
 */
export const teamFeedbackSchema = z.object({
  id: z.string().uuid(),
  fromUserId: z.number(),
  toUserId: z.number(),
  content: z.string(),
  rating: z.number().min(1).max(5),
  timestamp: z.date(),
  category: z.string(), // code_quality, communication, timeliness, problem_solving, other
  taskId: z.string().uuid().nullable().optional()
});

/**
 * Team knowledge base item schema
 */
export const teamKnowledgeBaseItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  category: z.string(),
  createdBy: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.string()).default([]),
  relatedItemIds: z.array(z.string().uuid()).default([])
});

/**
 * Team agent types
 */
export type TeamMemberCapabilities = z.infer<typeof teamMemberCapabilitiesSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type TeamTask = z.infer<typeof taskSchema>;
export type TaskComment = z.infer<typeof taskCommentSchema>;
export type TeamCollaborationSession = z.infer<typeof teamCollaborationSessionSchema>;
export type TeamFeedback = z.infer<typeof teamFeedbackSchema>;
export type TeamKnowledgeBaseItem = z.infer<typeof teamKnowledgeBaseItemSchema>;

// Insert types (omitting auto-generated fields)
export const insertTeamMemberSchema = teamMemberSchema.omit({ id: true, joinedAt: true, lastActive: true });
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export const insertTaskSchema = taskSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;

export const insertTaskCommentSchema = taskCommentSchema.omit({ id: true });
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;

export const insertTeamCollaborationSessionSchema = teamCollaborationSessionSchema.omit({ id: true });
export type InsertTeamCollaborationSession = z.infer<typeof insertTeamCollaborationSessionSchema>;

export const insertTeamFeedbackSchema = teamFeedbackSchema.omit({ id: true });
export type InsertTeamFeedback = z.infer<typeof insertTeamFeedbackSchema>;

export const insertTeamKnowledgeBaseItemSchema = teamKnowledgeBaseItemSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTeamKnowledgeBaseItem = z.infer<typeof insertTeamKnowledgeBaseItemSchema>;
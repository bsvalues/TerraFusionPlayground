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
  role: z.nativeEnum(TeamMemberRole),
  status: z.nativeEnum(TeamMemberStatus),
  capabilities: teamMemberCapabilitiesSchema,
  avatar: z.string().optional(),
  email: z.string().email(),
  joinedAt: z.date(),
  lastActive: z.date()
});

/**
 * Task schema
 */
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  assignedTo: z.number().nullable(),
  createdBy: z.number(),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority),
  createdAt: z.date(),
  updatedAt: z.date(),
  dueDate: z.date().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  tags: z.array(z.string()),
  attachments: z.array(z.string()).optional(),
  comments: z.array(
    z.object({
      id: z.string(),
      userId: z.number(),
      content: z.string(),
      timestamp: z.date(),
      attachments: z.array(z.string()).optional()
    })
  ).optional()
});

/**
 * Team collaboration session schema
 */
export const teamCollaborationSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  participants: z.array(z.number()),
  organizer: z.number(),
  agenda: z.array(z.string()),
  notes: z.string().optional(),
  recordingUrl: z.string().optional(),
  taskIds: z.array(z.string()).optional()
});

/**
 * Team feedback schema
 */
export const teamFeedbackSchema = z.object({
  id: z.string(),
  fromUserId: z.number(),
  toUserId: z.number(),
  content: z.string(),
  rating: z.number().min(1).max(5),
  timestamp: z.date(),
  category: z.enum(['code_quality', 'communication', 'timeliness', 'problem_solving', 'other']),
  taskId: z.string().optional()
});

/**
 * Team knowledge base item schema
 */
export const teamKnowledgeBaseItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.string(),
  createdBy: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tags: z.array(z.string()),
  attachments: z.array(z.string()).optional(),
  relatedItemIds: z.array(z.string()).optional()
});

/**
 * Team agent types
 */
export type TeamMemberCapabilities = z.infer<typeof teamMemberCapabilitiesSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type TeamTask = z.infer<typeof taskSchema>;
export type TeamCollaborationSession = z.infer<typeof teamCollaborationSessionSchema>;
export type TeamFeedback = z.infer<typeof teamFeedbackSchema>;
export type TeamKnowledgeBaseItem = z.infer<typeof teamKnowledgeBaseItemSchema>;

// Insert schemas for team members table
export const insertTeamMemberSchema = teamMemberSchema.omit({ id: true, joinedAt: true, lastActive: true });
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

// Insert schema for tasks table
export const insertTaskSchema = taskSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;

// Insert schema for collaboration sessions table
export const insertTeamCollaborationSessionSchema = teamCollaborationSessionSchema.omit({ id: true });
export type InsertTeamCollaborationSession = z.infer<typeof insertTeamCollaborationSessionSchema>;

// Insert schema for feedback table
export const insertTeamFeedbackSchema = teamFeedbackSchema.omit({ id: true });
export type InsertTeamFeedback = z.infer<typeof insertTeamFeedbackSchema>;

// Insert schema for knowledge base items table
export const insertTeamKnowledgeBaseItemSchema = teamKnowledgeBaseItemSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTeamKnowledgeBaseItem = z.infer<typeof insertTeamKnowledgeBaseItemSchema>;
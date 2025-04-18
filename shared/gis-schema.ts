/**
 * GIS Schema Definitions
 * 
 * This file contains the database schema definitions for the GIS module.
 * It includes tables for:
 * - GIS layers (vector and raster)
 * - ETL jobs for data conversion
 * - Agent messages for GIS coordination
 * - Agent tasks for GIS operations
 * - Spatial events for system notifications
 */

import { relations, sql } from 'drizzle-orm';
import { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  integer, 
  boolean, 
  json, 
  varchar 
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './schema';

/**
 * GIS Layers Table
 * Stores vector and raster GIS layers
 */
export const gisLayers = pgTable('gis_layers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'vector', 'raster', etc.
  description: text('description'),
  source: json('source'), // Source data or reference
  style: json('style'), // Styling information
  metadata: json('metadata'), // Additional metadata
  visible: boolean('visible').default(true),
  opacity: varchar('opacity', { length: 10 }).default('1.0'),
  zIndex: integer('z_index').default(0),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Relations for GIS layers
export const gisLayersRelations = relations(gisLayers, ({ one }) => ({
  user: one(users, {
    fields: [gisLayers.userId],
    references: [users.id],
  }),
}));

// Insert schema for GIS layers
export const insertGISLayerSchema = createInsertSchema(gisLayers)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Types for GIS layers
export type GISLayer = typeof gisLayers.$inferSelect;
export type InsertGISLayer = z.infer<typeof insertGISLayerSchema>;

/**
 * ETL Jobs Table
 * Stores data conversion job definitions and results
 */
export const etlJobs = pgTable('etl_jobs', {
  id: text('id').primaryKey(),
  config: json('config').notNull(), // Job configuration
  status: text('status').notNull(), // 'pending', 'running', 'completed', 'failed', 'canceled'
  result: json('result'), // Job result
  progress: integer('progress'), // Progress percentage (0-100)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  userId: integer('user_id').references(() => users.id)
});

// Relations for ETL jobs
export const etlJobsRelations = relations(etlJobs, ({ one }) => ({
  user: one(users, {
    fields: [etlJobs.userId],
    references: [users.id],
  }),
}));

// Insert schema for ETL jobs
export const insertETLJobSchema = createInsertSchema(etlJobs)
  .omit({ result: true, progress: true, startedAt: true, completedAt: true });

// Types for ETL jobs
export type ETLJob = typeof etlJobs.$inferSelect;
export type InsertETLJob = z.infer<typeof insertETLJobSchema>;

/**
 * Agent Messages Table
 * Stores messages for agent communication
 */
export const agentMessages = pgTable('agent_messages', {
  id: serial('id').primaryKey(),
  messageId: text('message_id').notNull().unique(),
  conversationId: text('conversation_id'),
  senderAgentId: text('sender_agent_id').notNull(),
  receiverAgentId: text('receiver_agent_id'),
  messageType: text('message_type').notNull(),
  subject: text('subject').notNull(),
  content: json('content').notNull(),
  priority: text('priority').default('normal'),
  status: text('status').default('sent'),
  timestamp: timestamp('timestamp').defaultNow(),
  processedAt: timestamp('processed_at'),
  expiresAt: timestamp('expires_at'),
  correlationId: text('correlation_id'),
  contextData: json('context_data'),
  isAcknowledged: boolean('is_acknowledged')
});

// Insert schema for agent messages
export const insertAgentMessageSchema = createInsertSchema(agentMessages)
  .omit({ id: true, processedAt: true, isAcknowledged: true });

// Types for agent messages
export type AgentMessage = typeof agentMessages.$inferSelect;
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;

/**
 * Agent Tasks Table
 * Stores tasks assigned to agents
 */
export const agentTasks = pgTable('agent_tasks', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  taskType: text('task_type').notNull(),
  status: text('status').notNull(), // 'pending', 'processing', 'completed', 'failed', 'canceled'
  data: json('data').notNull(),
  result: json('result'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  userId: integer('user_id').references(() => users.id)
});

// Relations for agent tasks
export const agentTasksRelations = relations(agentTasks, ({ one }) => ({
  user: one(users, {
    fields: [agentTasks.userId],
    references: [users.id],
  }),
}));

// Insert schema for agent tasks
export const insertAgentTaskSchema = createInsertSchema(agentTasks)
  .omit({ result: true, error: true, completedAt: true });

// Types for agent tasks
export type AgentTask = typeof agentTasks.$inferSelect;
export type InsertAgentTask = z.infer<typeof insertAgentTaskSchema>;

/**
 * Spatial Events Table
 * Stores events related to spatial data changes
 */
export const spatialEvents = pgTable('spatial_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  data: json('data').notNull(),
  metadata: json('metadata'),
  timestamp: timestamp('timestamp').defaultNow(),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at')
});

// Insert schema for spatial events
export const insertSpatialEventSchema = createInsertSchema(spatialEvents)
  .omit({ processed: true, processedAt: true });

// Types for spatial events
export type SpatialEvent = typeof spatialEvents.$inferSelect;
export type InsertSpatialEvent = z.infer<typeof insertSpatialEventSchema>;

/**
 * System Activities Table
 * Stores system activity logs
 */
export const systemActivities = pgTable('system_activities', {
  id: serial('id').primaryKey(),
  activity_type: text('activity_type').notNull(),
  component: text('component').notNull(),
  status: text('status'),
  created_at: timestamp('created_at').defaultNow(),
  details: json('details')
});

// Insert schema for system activities
export const insertSystemActivitySchema = createInsertSchema(systemActivities)
  .omit({ id: true, created_at: true });

// Types for system activities
export type SystemActivity = typeof systemActivities.$inferSelect;
export type InsertSystemActivity = z.infer<typeof insertSystemActivitySchema>;
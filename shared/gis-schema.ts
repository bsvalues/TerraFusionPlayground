/**
 * GIS Schema Definitions
 * 
 * This file contains the schema definitions for GIS data in the application.
 * It defines the structure of GIS layers, feature collections, and map projects.
 */

import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, json, boolean, real } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Layer type enum
export enum LayerType {
  VECTOR = 'vector',
  RASTER = 'raster',
  TILE = 'tile',
  WMS = 'wms',
  GEOJSON = 'geojson'
}

// ETL Job Status enum
export enum ETLJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

// Agent Task Status enum
export enum AgentTaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

// Spatial Event Type enum
export enum SpatialEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  ANALYZED = 'analyzed',
  REPAIRED = 'repaired',
  CONVERTED = 'converted'
}

// GIS Layer table
export const gisLayers = pgTable('gis_layers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().$type<LayerType>(),
  source: text('source'),
  url: text('url'),
  attribution: text('attribution'),
  metadata: json('metadata'),
  visible: boolean('visible').notNull().default(true),
  opacity: real('opacity').notNull().default(1.0),
  zIndex: integer('z_index').notNull().default(0),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// GIS Feature Collection table
export const gisFeatureCollections = pgTable('gis_feature_collections', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  layerId: integer('layer_id').notNull().references(() => gisLayers.id, { onDelete: 'cascade' }),
  data: json('data').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// GIS Map Project table
export const gisMapProjects = pgTable('gis_map_projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  center: json('center').notNull(), // [longitude, latitude]
  zoom: real('zoom').notNull().default(3.0),
  layers: json('layers').notNull(), // Array of layer configurations
  metadata: json('metadata'),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// ETL Job table
export const etlJobs = pgTable('etl_jobs', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  description: text('description'),
  sourceType: text('source_type').notNull(),
  targetType: text('target_type').notNull(),
  config: json('config').notNull(),
  status: text('status').notNull().$type<ETLJobStatus>(),
  progress: real('progress'),
  result: json('result'),
  error: text('error'),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at')
});

// GIS Agent Task table
export const gisAgentTasks = pgTable('gis_agent_tasks', {
  id: text('id').primaryKey(), // UUID
  agentId: text('agent_id').notNull(),
  agentType: text('agent_type').notNull(),
  taskType: text('task_type').notNull(),
  status: text('status').notNull().$type<AgentTaskStatus>(),
  data: json('data').notNull(),
  result: json('result'),
  progress: real('progress'),
  message: text('message'),
  error: text('error'),
  userId: integer('user_id').notNull(),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time')
});

// Agent Message table
export const agentMessages = pgTable('agent_messages', {
  id: serial('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  parentId: integer('parent_id').references(() => agentMessages.id),
  content: text('content').notNull(),
  type: text('type').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Spatial Event table
export const spatialEvents = pgTable('spatial_events', {
  id: serial('id').primaryKey(),
  type: text('type').notNull().$type<SpatialEventType>(),
  layerId: integer('layer_id').references(() => gisLayers.id),
  featureId: text('feature_id'),
  data: json('data'),
  metadata: json('metadata'),
  userId: integer('user_id'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Define relations
export const gisLayersRelations = relations(gisLayers, ({ many }) => ({
  featureCollections: many(gisFeatureCollections)
}));

export const gisFeatureCollectionsRelations = relations(gisFeatureCollections, ({ one }) => ({
  layer: one(gisLayers, {
    fields: [gisFeatureCollections.layerId],
    references: [gisLayers.id]
  })
}));

// Generate Zod schemas
export const insertGISLayerSchema = createInsertSchema(gisLayers).omit({ id: true });
export const insertGISFeatureCollectionSchema = createInsertSchema(gisFeatureCollections).omit({ id: true });
export const insertGISMapProjectSchema = createInsertSchema(gisMapProjects).omit({ id: true });
export const insertETLJobSchema = createInsertSchema(etlJobs);
export const insertGISAgentTaskSchema = createInsertSchema(gisAgentTasks);
export const insertAgentMessageSchema = createInsertSchema(agentMessages).omit({ id: true });
export const insertSpatialEventSchema = createInsertSchema(spatialEvents).omit({ id: true });

// Export types
export type GISLayer = typeof gisLayers.$inferSelect;
export type InsertGISLayer = z.infer<typeof insertGISLayerSchema>;

export type GISFeatureCollection = typeof gisFeatureCollections.$inferSelect;
export type InsertGISFeatureCollection = z.infer<typeof insertGISFeatureCollectionSchema>;

export type GISMapProject = typeof gisMapProjects.$inferSelect;
export type InsertGISMapProject = z.infer<typeof insertGISMapProjectSchema>;

export type ETLJob = typeof etlJobs.$inferSelect;
export type InsertETLJob = z.infer<typeof insertETLJobSchema>;

export type GISAgentTask = typeof gisAgentTasks.$inferSelect;
export type InsertGISAgentTask = z.infer<typeof insertGISAgentTaskSchema>;

export type AgentMessage = typeof agentMessages.$inferSelect;
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;

export type SpatialEvent = typeof spatialEvents.$inferSelect;
export type InsertSpatialEvent = z.infer<typeof insertSpatialEventSchema>;
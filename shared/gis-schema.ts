/**
 * GIS Data Schema
 * 
 * Defines the shared database schema and types for GIS functionality.
 * This file contains Drizzle ORM schema definitions and TypeScript interfaces.
 */

import { pgTable, serial, text, jsonb, timestamp, boolean, integer, foreignKey, unique, varchar, decimal } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import type { Json } from './schema';

// GIS Layer Schema
export const gisLayers = pgTable('gis_layers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // vector, raster, base_map, etc.
  source: jsonb('source').notNull(),
  style: jsonb('style'),
  metadata: jsonb('metadata'),
  visible: boolean('visible').default(true),
  opacity: decimal('opacity').default('1.0'),
  zIndex: integer('z_index').default(0),
  userId: integer('user_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const layerInsertSchema = createInsertSchema(gisLayers, {
  // Add custom validation as needed
  style: z.any().optional(),
  metadata: z.any().optional(),
  source: z.any(),
});

export type GISLayer = typeof gisLayers.$inferSelect;
export type InsertGISLayer = z.infer<typeof layerInsertSchema>;

// GIS Feature Collection Schema
export const gisFeatureCollections = pgTable('gis_feature_collections', {
  id: serial('id').primaryKey(),
  layerId: integer('layer_id').references(() => gisLayers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  features: jsonb('features').notNull(), // GeoJSON FeatureCollection
  properties: jsonb('properties'),
  userId: integer('user_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const featureCollectionInsertSchema = createInsertSchema(gisFeatureCollections, {
  // Add custom validation as needed
  features: z.any(),
  properties: z.any().optional(),
});

export type GISFeatureCollection = typeof gisFeatureCollections.$inferSelect;
export type InsertGISFeatureCollection = z.infer<typeof featureCollectionInsertSchema>;

// Spatial Reference System Schema
export const spatialReferenceSystems = pgTable('spatial_reference_systems', {
  id: serial('id').primaryKey(),
  srid: integer('srid').notNull().unique(),
  name: text('name').notNull(),
  wkt: text('wkt'),
  proj4: text('proj4'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type SpatialReferenceSystem = typeof spatialReferenceSystems.$inferSelect;

// GIS Map Project Schema
export const gisMapProjects = pgTable('gis_map_projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  centerLat: decimal('center_lat').notNull(),
  centerLng: decimal('center_lng').notNull(),
  zoomLevel: decimal('zoom_level').notNull().default('5'),
  basemapId: integer('basemap_id'),
  layers: jsonb('layers').default([]),
  settings: jsonb('settings'),
  thumbnail: text('thumbnail'),
  isPublic: boolean('is_public').default(false),
  userId: integer('user_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const mapProjectInsertSchema = createInsertSchema(gisMapProjects, {
  // Add custom validation as needed
  layers: z.any().optional(),
  settings: z.any().optional(),
});

export type GISMapProject = typeof gisMapProjects.$inferSelect;
export type InsertGISMapProject = z.infer<typeof mapProjectInsertSchema>;

// ETL Job Schema
export const etlJobs = pgTable('etl_jobs', {
  id: text('id').primaryKey(),
  config: jsonb('config').notNull(),
  status: text('status').notNull(),
  result: jsonb('result'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  userId: integer('user_id'),
});

export type ETLJob = typeof etlJobs.$inferSelect;

// GIS Agent Task Schema
export const gisAgentTasks = pgTable('gis_agent_tasks', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  taskType: text('task_type').notNull(),
  status: text('status').notNull(),
  data: jsonb('data').notNull(),
  result: jsonb('result'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  userId: integer('user_id'),
});

export type GISAgentTask = typeof gisAgentTasks.$inferSelect;

// Agent Message Schema
export const agentMessages = pgTable('agent_messages', {
  id: serial('id').primaryKey(),
  topic: text('topic').notNull(),
  content: jsonb('content').notNull(),
  processed: boolean('processed').default(false),
  timestamp: timestamp('timestamp').defaultNow(),
});

export type AgentMessage = typeof agentMessages.$inferSelect;
export type InsertAgentMessage = typeof agentMessages.$inferInsert;

// Spatial Analysis Result Schema
export const spatialAnalysisResults = pgTable('spatial_analysis_results', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  analysisType: text('analysis_type').notNull(),
  inputData: jsonb('input_data').notNull(),
  resultData: jsonb('result_data').notNull(),
  parameters: jsonb('parameters'),
  metadata: jsonb('metadata'),
  userId: integer('user_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type SpatialAnalysisResult = typeof spatialAnalysisResults.$inferSelect;

// Enums

// Layer Type enum
export enum LayerType {
  VECTOR = 'vector',
  RASTER = 'raster',
  BASE_MAP = 'base_map',
  GROUP = 'group',
  POINT = 'point',
  ANALYSIS = 'analysis',
}

// ETL Job Status enum
export enum ETLJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

// Agent Task Status enum
export enum AgentTaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

// Spatial Event Type enum
export enum SpatialEventType {
  GEOMETRY_CREATED = 'spatial.geometry.created',
  GEOMETRY_UPDATED = 'spatial.geometry.updated',
  GEOMETRY_DELETED = 'spatial.geometry.deleted',
  TOPOLOGY_ERROR = 'spatial.topology.error',
  ANALYSIS_COMPLETED = 'spatial.analysis.completed',
  DATA_IMPORTED = 'spatial.data.imported',
  DATA_CONVERTED = 'spatial.data.converted',
}
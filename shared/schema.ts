import { pgTable, text, serial, integer, timestamp, numeric, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
  email: true,
});

// Properties table
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  propertyId: text("property_id").notNull().unique(),
  address: text("address").notNull(),
  parcelNumber: text("parcel_number").notNull(),
  propertyType: text("property_type").notNull(),
  acres: numeric("acres").notNull(),
  value: numeric("value"),
  status: text("status").notNull().default("active"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPropertySchema = createInsertSchema(properties).pick({
  propertyId: true,
  address: true,
  parcelNumber: true,
  propertyType: true,
  acres: true,
  value: true,
  status: true,
});

// Land Records table
export const landRecords = pgTable("land_records", {
  id: serial("id").primaryKey(),
  propertyId: text("property_id").notNull(),
  landUseCode: text("land_use_code").notNull(),
  zoning: text("zoning").notNull(),
  topography: text("topography"),
  frontage: numeric("frontage"),
  depth: numeric("depth"),
  shape: text("shape"),
  utilities: text("utilities"),
  floodZone: text("flood_zone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertLandRecordSchema = createInsertSchema(landRecords).pick({
  propertyId: true,
  landUseCode: true,
  zoning: true,
  topography: true,
  frontage: true,
  depth: true,
  shape: true,
  utilities: true,
  floodZone: true,
});

// Improvements table
export const improvements = pgTable("improvements", {
  id: serial("id").primaryKey(),
  propertyId: text("property_id").notNull(),
  improvementType: text("improvement_type").notNull(),
  yearBuilt: integer("year_built"),
  squareFeet: numeric("square_feet"),
  bedrooms: integer("bedrooms"),
  bathrooms: numeric("bathrooms"),
  quality: text("quality"),
  condition: text("condition"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertImprovementSchema = createInsertSchema(improvements).pick({
  propertyId: true,
  improvementType: true,
  yearBuilt: true,
  squareFeet: true,
  bedrooms: true,
  bathrooms: true,
  quality: true,
  condition: true,
});

// Fields table
export const fields = pgTable("fields", {
  id: serial("id").primaryKey(),
  propertyId: text("property_id").notNull(),
  fieldType: text("field_type").notNull(),
  fieldValue: text("field_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertFieldSchema = createInsertSchema(fields).pick({
  propertyId: true,
  fieldType: true,
  fieldValue: true,
});

// Protests table
export const protests = pgTable("protests", {
  id: serial("id").primaryKey(),
  propertyId: text("property_id").notNull(),
  userId: integer("user_id").notNull(),
  reason: text("reason").notNull(),
  evidenceUrls: text("evidence_urls").array(),
  status: text("status").notNull().default("submitted"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertProtestSchema = createInsertSchema(protests).pick({
  propertyId: true,
  userId: true,
  reason: true,
  evidenceUrls: true,
  status: true,
});

// Audit Logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: json("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ipAddress: text("ip_address"),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).pick({
  userId: true,
  action: true,
  entityType: true,
  entityId: true,
  details: true,
  ipAddress: true,
});

// AI Agents table
export const aiAgents = pgTable("ai_agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("active"),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  performance: integer("performance").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiAgentSchema = createInsertSchema(aiAgents).pick({
  name: true,
  type: true,
  status: true,
  performance: true,
});

// System Activities table
export const systemActivities = pgTable("system_activities", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id"),
  activity: text("activity").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertSystemActivitySchema = createInsertSchema(systemActivities).pick({
  agentId: true,
  activity: true,
  entityType: true,
  entityId: true,
});

// PACS Modules table
export const pacsModules = pgTable("pacs_modules", {
  id: serial("id").primaryKey(),
  moduleName: text("module_name").notNull().unique(),
  source: text("source").notNull(),
  integration: text("integration").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPacsModuleSchema = createInsertSchema(pacsModules).pick({
  moduleName: true,
  source: true,
  integration: true,
  description: true,
});

// Define type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type LandRecord = typeof landRecords.$inferSelect;
export type InsertLandRecord = z.infer<typeof insertLandRecordSchema>;

export type Improvement = typeof improvements.$inferSelect;
export type InsertImprovement = z.infer<typeof insertImprovementSchema>;

export type Field = typeof fields.$inferSelect;
export type InsertField = z.infer<typeof insertFieldSchema>;

export type Protest = typeof protests.$inferSelect;
export type InsertProtest = z.infer<typeof insertProtestSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;

export type SystemActivity = typeof systemActivities.$inferSelect;
export type InsertSystemActivity = z.infer<typeof insertSystemActivitySchema>;

export type PacsModule = typeof pacsModules.$inferSelect;
export type InsertPacsModule = z.infer<typeof insertPacsModuleSchema>;

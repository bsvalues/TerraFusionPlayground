import { pgTable, text, serial, integer, timestamp, numeric, json, boolean, jsonb, date } from "drizzle-orm/pg-core";
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
  extraFields: jsonb("extra_fields").default({}),
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
  extraFields: true,
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

// Appeals table (renamed from protests for clarity)
export const appeals = pgTable("appeals", {
  id: serial("id").primaryKey(),
  appealNumber: text("appeal_number").notNull().unique(), // Unique identifier for the appeal
  propertyId: text("property_id").notNull(),
  userId: integer("user_id").notNull(),
  appealType: text("appeal_type").notNull().default("value"), // value, classification, exemption
  reason: text("reason").notNull(),
  evidenceUrls: text("evidence_urls").array(),
  requestedValue: numeric("requested_value"), // Value requested by appellant
  dateReceived: timestamp("date_received").defaultNow().notNull(),
  hearingDate: timestamp("hearing_date"),
  hearingLocation: text("hearing_location"),
  assignedTo: integer("assigned_to"), // Staff ID assigned to handle this appeal
  status: text("status").notNull().default("submitted"), // submitted, reviewing, scheduled, heard, decided, withdrawn
  decision: text("decision"), // granted, denied, partial
  decisionReason: text("decision_reason"),
  decisionDate: timestamp("decision_date"),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertAppealSchema = createInsertSchema(appeals).pick({
  appealNumber: true,
  propertyId: true,
  userId: true,
  appealType: true,
  reason: true,
  evidenceUrls: true,
  requestedValue: true,
  dateReceived: true,
  hearingDate: true,
  hearingLocation: true,
  assignedTo: true,
  status: true,
});

// Appeal comments table for tracking communications
export const appealComments = pgTable("appeal_comments", {
  id: serial("id").primaryKey(),
  appealId: integer("appeal_id").notNull(),
  userId: integer("user_id").notNull(),
  comment: text("comment").notNull(),
  internalOnly: boolean("internal_only").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppealCommentSchema = createInsertSchema(appealComments).pick({
  appealId: true,
  userId: true,
  comment: true,
  internalOnly: true,
});

// Appeal evidence items table
export const appealEvidence = pgTable("appeal_evidence", {
  id: serial("id").primaryKey(),
  appealId: integer("appeal_id").notNull(),
  documentType: text("document_type").notNull(), // photo, assessment, appraisal, etc.
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  uploadedBy: integer("uploaded_by").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppealEvidenceSchema = createInsertSchema(appealEvidence).pick({
  appealId: true,
  documentType: true,
  fileName: true,
  fileUrl: true,
  fileSize: true,
  uploadedBy: true,
  description: true,
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
  activity_type: text("activity_type").notNull(),
  component: text("component").notNull(),
  status: text("status").notNull().default("info"), // info, warning, error, success
  details: jsonb("details").default({}),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertSystemActivitySchema = createInsertSchema(systemActivities).pick({
  activity_type: true,
  component: true,
  status: true,
  details: true,
  created_at: true,
});

// MCP Tool Execution Logs table
export const mcpToolExecutionLogs = pgTable("mcp_tool_execution_logs", {
  id: serial("id").primaryKey(),
  toolName: text("tool_name").notNull(),
  requestId: text("request_id").notNull(),
  agentId: integer("agent_id"),
  userId: integer("user_id"),
  parameters: jsonb("parameters").default({}),
  status: text("status").notNull(), // starting, success, error
  result: jsonb("result"),
  error: text("error"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMCPToolExecutionLogSchema = createInsertSchema(mcpToolExecutionLogs).pick({
  toolName: true,
  requestId: true,
  agentId: true,
  userId: true,
  parameters: true,
  status: true,
  result: true,
  error: true,
  startTime: true,
  endTime: true,
});

// PACS Modules table
export const pacsModules = pgTable("pacs_modules", {
  id: serial("id").primaryKey(),
  moduleName: text("module_name").notNull().unique(),
  source: text("source").notNull(),
  integration: text("integration").notNull(),
  description: text("description"),
  category: text("category"),
  apiEndpoints: jsonb("api_endpoints"),
  dataSchema: jsonb("data_schema"),
  syncStatus: text("sync_status").default("pending"),
  lastSyncTimestamp: timestamp("last_sync_timestamp"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPacsModuleSchema = createInsertSchema(pacsModules).pick({
  moduleName: true,
  source: true,
  integration: true,
  description: true,
  category: true,
  apiEndpoints: true,
  dataSchema: true,
  syncStatus: true,
  lastSyncTimestamp: true,
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

export type Appeal = typeof appeals.$inferSelect;
export type InsertAppeal = z.infer<typeof insertAppealSchema>;

export type AppealComment = typeof appealComments.$inferSelect;
export type InsertAppealComment = z.infer<typeof insertAppealCommentSchema>;

export type AppealEvidence = typeof appealEvidence.$inferSelect;
export type InsertAppealEvidence = z.infer<typeof insertAppealEvidenceSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;

export type SystemActivity = typeof systemActivities.$inferSelect;
export type InsertSystemActivity = z.infer<typeof insertSystemActivitySchema>;

export type MCPToolExecutionLog = typeof mcpToolExecutionLogs.$inferSelect;
export type InsertMCPToolExecutionLog = z.infer<typeof insertMCPToolExecutionLogSchema>;

export type PacsModule = typeof pacsModules.$inferSelect;
export type InsertPacsModule = z.infer<typeof insertPacsModuleSchema>;

// Property Insights Sharing table
export const propertyInsightShares = pgTable("property_insight_shares", {
  id: serial("id").primaryKey(),
  shareId: text("share_id").notNull().unique(), // UUID for sharing
  propertyId: text("property_id").notNull(),
  propertyName: text("property_name"), // Optional property name for better context
  propertyAddress: text("property_address"), // Optional property address for better context
  title: text("title").notNull(),
  insightType: text("insight_type").notNull(), // 'story', 'comparison', 'data'
  insightData: jsonb("insight_data").notNull(), // Stored insight content
  format: text("format").notNull().default("detailed"), // 'simple', 'detailed', 'summary'
  createdBy: integer("created_by"), // Optional user ID if authenticated
  accessCount: integer("access_count").notNull().default(0), // Number of times accessed
  expiresAt: timestamp("expires_at"), // Optional expiration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isPublic: boolean("is_public").notNull().default(true),
  password: text("password"), // Optional password protection
  allowedDomains: text("allowed_domains").array(), // Domain restriction for email sharing
});

export const insertPropertyInsightShareSchema = createInsertSchema(propertyInsightShares).pick({
  shareId: true,
  propertyId: true,
  propertyName: true,
  propertyAddress: true,
  title: true,
  insightType: true,
  insightData: true,
  format: true,
  createdBy: true,
  expiresAt: true,
  isPublic: true,
  password: true,
  allowedDomains: true,
});

export type PropertyInsightShare = typeof propertyInsightShares.$inferSelect;
export type InsertPropertyInsightShare = z.infer<typeof insertPropertyInsightShareSchema>;

// Comparable Sales Records table
export const comparableSales = pgTable("comparable_sales", {
  id: serial("id").primaryKey(),
  propertyId: text("property_id").notNull(), // Subject property ID
  comparablePropertyId: text("comparable_property_id").notNull(), // Comparable property ID
  saleDate: date("sale_date"), // Date of sale for comparable property (null if not a sale)
  salePrice: numeric("sale_price"), // Sale price of comparable property (null if not a sale)
  adjustedPrice: numeric("adjusted_price"), // Price after applying adjustments
  distanceInMiles: numeric("distance_in_miles"), // Distance to subject property
  similarityScore: numeric("similarity_score"), // AI-calculated similarity (0-100)
  adjustmentFactors: jsonb("adjustment_factors"), // Detailed adjustments (size, quality, etc.)
  notes: text("notes"), // Additional notes about the comparable
  status: text("status").notNull().default("active"), // active, inactive, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(), // User who created the comparable
});

export const insertComparableSaleSchema = createInsertSchema(comparableSales).pick({
  propertyId: true,
  comparablePropertyId: true,
  saleDate: true,
  salePrice: true,
  adjustedPrice: true,
  distanceInMiles: true,
  similarityScore: true,
  adjustmentFactors: true,
  notes: true,
  status: true,
  createdBy: true,
});

export type ComparableSale = typeof comparableSales.$inferSelect;
export type InsertComparableSale = z.infer<typeof insertComparableSaleSchema>;

// Comparable Sales Analysis table
export const comparableSalesAnalyses = pgTable("comparable_sales_analyses", {
  id: serial("id").primaryKey(),
  analysisId: text("analysis_id").notNull().unique(), // Unique identifier for the analysis
  propertyId: text("property_id").notNull(), // Subject property ID
  title: text("title").notNull(), // Name of the analysis
  description: text("description"), // Description of the analysis
  methodology: text("methodology").notNull().default("sales_comparison"), // sales_comparison, income, cost
  effectiveDate: date("effective_date").notNull(), // Date for which the analysis is valid
  valueConclusion: numeric("value_conclusion"), // Final concluded value
  adjustmentNotes: text("adjustment_notes"), // Notes on adjustments
  marketConditions: text("market_conditions"), // Market conditions analysis
  confidenceLevel: text("confidence_level").default("medium"), // low, medium, high
  status: text("status").notNull().default("draft"), // draft, final, archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(), // User who created the analysis
  reviewedBy: integer("reviewed_by"), // User who reviewed the analysis (null if not reviewed)
  reviewNotes: text("review_notes"), // Notes from reviewer
  reviewDate: timestamp("review_date"), // Date of review
});

export const insertComparableSalesAnalysisSchema = createInsertSchema(comparableSalesAnalyses).pick({
  analysisId: true,
  propertyId: true,
  title: true,
  description: true,
  methodology: true,
  effectiveDate: true,
  valueConclusion: true,
  adjustmentNotes: true,
  marketConditions: true,
  confidenceLevel: true,
  status: true,
  createdBy: true,
  reviewedBy: true,
  reviewNotes: true,
  reviewDate: true,
});

export type ComparableSalesAnalysis = typeof comparableSalesAnalyses.$inferSelect;
export type InsertComparableSalesAnalysis = z.infer<typeof insertComparableSalesAnalysisSchema>;

// Import Staging table
export const importStaging = pgTable("import_staging", {
  id: serial("id").primaryKey(),
  stagingId: text("staging_id").notNull().unique(),
  propertyData: jsonb("property_data").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull().default("pending"),
  validationErrors: jsonb("validation_errors").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertImportStagingSchema = createInsertSchema(importStaging).pick({
  stagingId: true,
  propertyData: true,
  source: true,
  status: true,
  validationErrors: true,
});

export type StagedProperty = typeof importStaging.$inferSelect;
export type InsertStagedProperty = z.infer<typeof insertImportStagingSchema>;

// Comparable Sales Analysis Comparables join table
export const comparableAnalysisEntries = pgTable("comparable_analysis_entries", {
  id: serial("id").primaryKey(),
  analysisId: text("analysis_id").notNull(), // References analysisId in comparableSalesAnalyses
  comparableSaleId: integer("comparable_sale_id").notNull(), // References id in comparableSales
  includeInFinalValue: boolean("include_in_final_value").notNull().default(true), // Whether to include in final value calculation
  weight: numeric("weight").notNull().default("1"), // Weight given to this comparable (0-1)
  adjustedValue: numeric("adjusted_value"), // Final adjusted value of this comparable
  notes: text("notes"), // Notes specific to this comparable in this analysis
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertComparableAnalysisEntrySchema = createInsertSchema(comparableAnalysisEntries).pick({
  analysisId: true,
  comparableSaleId: true,
  includeInFinalValue: true,
  weight: true,
  adjustedValue: true,
  notes: true,
});

export type ComparableAnalysisEntry = typeof comparableAnalysisEntries.$inferSelect;
export type InsertComparableAnalysisEntry = z.infer<typeof insertComparableAnalysisEntrySchema>;

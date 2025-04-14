import { pgTable, text, serial, integer, timestamp, numeric, json, boolean, jsonb, date, varchar, index, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum definitions for validation and workflow
export enum RuleCategory {
  CLASSIFICATION = 'classification',
  VALUATION = 'valuation',
  PROPERTY_DATA = 'property_data',
  COMPLIANCE = 'compliance',
  DATA_QUALITY = 'data_quality',
  GEO_SPATIAL = 'geo_spatial',
  STATISTICAL = 'statistical'
}

export enum RuleLevel {
  CRITICAL = 'critical',  // Blocking issue, must be resolved
  ERROR = 'error',        // Significant issue that should be addressed
  WARNING = 'warning',    // Potential issue that should be reviewed
  INFO = 'info'           // Informational finding
}

export enum EntityType {
  PROPERTY = 'property',
  LAND_RECORD = 'land_record',
  IMPROVEMENT = 'improvement',
  APPEAL = 'appeal',
  USER = 'user',
  COMPARABLE_SALE = 'comparable_sale',
  WORKFLOW = 'workflow'
}

export enum MessageEventType {
  COMMAND = 'COMMAND',
  EVENT = 'EVENT',
  QUERY = 'QUERY',
  RESPONSE = 'RESPONSE',
  ERROR = 'ERROR',
  STATUS_UPDATE = 'STATUS_UPDATE',
  ASSISTANCE_REQUESTED = 'ASSISTANCE_REQUESTED'
}

// Agent Message Priority Levels
export enum MessagePriority {
  LOW = 'low',         // Background or non-time-sensitive messages
  NORMAL = 'normal',   // Default priority
  HIGH = 'high',       // Important messages that should be processed soon
  URGENT = 'urgent',   // Critical messages that need immediate attention
  SYSTEM = 'system'    // System-level messages (highest priority)
}

export enum IssueStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  WAIVED = 'waived'
}

// Data Lineage Record table
export const dataLineageRecords = pgTable("data_lineage_records", {
  id: serial("id").primaryKey(),
  propertyId: text("property_id").notNull(),
  fieldName: text("field_name").notNull(),
  oldValue: text("old_value").notNull(),
  newValue: text("new_value").notNull(),
  changeTimestamp: timestamp("change_timestamp").notNull(),
  source: text("source").notNull(), // import, manual, api, calculated, validated, correction
  userId: integer("user_id").notNull(),
  sourceDetails: jsonb("source_details").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDataLineageRecordSchema = createInsertSchema(dataLineageRecords).pick({
  propertyId: true,
  fieldName: true,
  oldValue: true,
  newValue: true,
  changeTimestamp: true,
  source: true,
  userId: true,
  sourceDetails: true,
});

export enum AppealStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  SCHEDULED = 'scheduled',
  HEARD = 'heard',
  DECIDED = 'decided',
  WITHDRAWN = 'withdrawn'
}

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

// Agent Messages table for inter-agent communication
export const agentMessages = pgTable("agent_messages", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull().unique(), // UUID for message identification
  conversationId: text("conversation_id"), // Thread/conversation ID for related messages
  senderAgentId: text("sender_agent_id").notNull(), // ID of agent sending the message
  receiverAgentId: text("receiver_agent_id"), // ID of agent receiving the message (null for broadcasts)
  messageType: text("message_type").notNull(), // Corresponds to MessageEventType enum
  subject: text("subject").notNull(), // Brief summary of message content
  content: jsonb("content").notNull(), // Structured message content
  contextData: jsonb("context_data").default({}), // Additional context for the message
  priority: text("priority").notNull().default("normal"), // Corresponds to MessagePriority enum
  status: text("status").notNull().default("pending"), // pending, delivered, processed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"), // When message was received
  processedAt: timestamp("processed_at"), // When message was fully processed
  retryCount: integer("retry_count").default(0), // Number of delivery attempts
  expiresAt: timestamp("expires_at"), // Optional TTL for message
  correlationId: text("correlation_id"), // ID for correlating messages (request/response)
  isAcknowledged: boolean("is_acknowledged").default(false), // Whether receipt was acknowledged
});

export const insertAgentMessageSchema = createInsertSchema(agentMessages).pick({
  messageId: true,
  conversationId: true,
  senderAgentId: true,
  receiverAgentId: true,
  messageType: true,
  subject: true,
  content: true,
  contextData: true,
  priority: true,
  status: true,
  expiresAt: true,
  correlationId: true,
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

export type AgentMessage = typeof agentMessages.$inferSelect;
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;

// Code Improvement Enums
export enum ImprovementType {
  FEATURE_SUGGESTION = 'feature_suggestion',
  CODE_IMPROVEMENT = 'code_improvement',
  BUG_FIX = 'bug_fix',
  PERFORMANCE_OPTIMIZATION = 'performance_optimization',
  ARCHITECTURE_RECOMMENDATION = 'architecture_recommendation',
  DATA_MODEL_ENHANCEMENT = 'data_model_enhancement'
}

// Code Improvements table for storing agent-suggested code improvements
export const codeImprovements = pgTable("code_improvements", {
  id: text("id").primaryKey(), // Unique identifier for the improvement
  type: text("type").notNull(), // Type of improvement (enum value)
  title: text("title").notNull(), // Brief title of the improvement
  description: text("description").notNull(), // Detailed description
  agentId: text("agent_id").notNull(), // ID of the agent suggesting the improvement
  agentName: text("agent_name").notNull(), // Name of the agent for display
  affectedFiles: jsonb("affected_files"), // List of files affected by this improvement
  suggestedChanges: jsonb("suggested_changes"), // Detailed code change suggestions
  priority: text("priority").notNull().default("medium"), // low, medium, high
  status: text("status").notNull().default("pending"), // pending, approved, rejected, implemented
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCodeImprovementSchema = createInsertSchema(codeImprovements).pick({
  id: true,
  type: true,
  title: true,
  description: true,
  agentId: true,
  agentName: true,
  affectedFiles: true,
  suggestedChanges: true,
  priority: true,
  status: true,
});

export type CodeImprovement = typeof codeImprovements.$inferSelect;
export type InsertCodeImprovement = z.infer<typeof insertCodeImprovementSchema>;

export type DataLineageRecord = typeof dataLineageRecords.$inferSelect;
export type InsertDataLineageRecord = z.infer<typeof insertDataLineageRecordSchema>;

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

// Validation Rules table
export const validationRules = pgTable("validation_rules", {
  id: serial("id").primaryKey(),
  ruleId: varchar("rule_id", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // classification, valuation, property_data, compliance, etc.
  level: varchar("level", { length: 20 }).notNull(), // critical, error, warning, info
  entityType: varchar("entity_type", { length: 50 }).notNull(), // property, land_record, improvement, appeal, etc.
  implementation: text("implementation"), // Optional: For simple rules, store the implementation logic
  parameters: jsonb("parameters").default({}), // Optional: Parameters for the rule
  reference: text("reference"), // Optional: Legal or policy reference (e.g., RCW 84.40.030)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
});

export const insertValidationRuleSchema = createInsertSchema(validationRules).pick({
  ruleId: true,
  name: true,
  description: true,
  category: true,
  level: true,
  entityType: true,
  implementation: true,
  parameters: true,
  reference: true,
  isActive: true,
  createdBy: true,
});

export type ValidationRule = typeof validationRules.$inferSelect;
export type InsertValidationRule = z.infer<typeof insertValidationRuleSchema>;

// Validation Issues table
export const validationIssues = pgTable("validation_issues", {
  id: serial("id").primaryKey(),
  issueId: varchar("issue_id", { length: 100 }).notNull().unique(),
  ruleId: varchar("rule_id", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  propertyId: varchar("property_id", { length: 100 }),
  level: varchar("level", { length: 20 }).notNull(),
  message: text("message").notNull(),
  details: jsonb("details").default({}),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, acknowledged, resolved, waived
  resolution: text("resolution"),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    ruleIdIdx: index("validation_issues_rule_id_idx").on(table.ruleId),
    entityTypeIdIdx: index("validation_issues_entity_type_id_idx").on(table.entityType, table.entityId),
    propertyIdIdx: index("validation_issues_property_id_idx").on(table.propertyId),
    statusIdx: index("validation_issues_status_idx").on(table.status),
    levelIdx: index("validation_issues_level_idx").on(table.level),
  };
});

export const insertValidationIssueSchema = createInsertSchema(validationIssues).pick({
  issueId: true,
  ruleId: true,
  entityType: true,
  entityId: true,
  propertyId: true,
  level: true,
  message: true,
  details: true,
  status: true,
  resolution: true,
  resolvedBy: true,
  resolvedAt: true,
});

export type ValidationIssue = typeof validationIssues.$inferSelect;
export type InsertValidationIssue = z.infer<typeof insertValidationIssueSchema>;

// Workflow Definition table
export const workflowDefinitions = pgTable("workflow_definitions", {
  id: serial("id").primaryKey(),
  definitionId: varchar("definition_id", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: integer("version").notNull().default(1),
  steps: jsonb("steps").notNull(), // Array of workflow steps with their actions, validations, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
});

export const insertWorkflowDefinitionSchema = createInsertSchema(workflowDefinitions).pick({
  definitionId: true,
  name: true,
  description: true,
  version: true,
  steps: true,
  isActive: true,
  createdBy: true,
});

export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type InsertWorkflowDefinition = z.infer<typeof insertWorkflowDefinitionSchema>;

// Workflow Instances table
export const workflowInstances = pgTable("workflow_instances", {
  id: serial("id").primaryKey(),
  instanceId: varchar("instance_id", { length: 100 }).notNull().unique(),
  definitionId: varchar("definition_id", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  currentStepId: varchar("current_step_id", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("not_started"), // not_started, in_progress, waiting, completed, canceled
  assignedTo: integer("assigned_to"),
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  data: jsonb("data").default({}), // Workflow instance data
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    definitionIdIdx: index("workflow_instances_definition_id_idx").on(table.definitionId),
    entityTypeIdIdx: index("workflow_instances_entity_type_id_idx").on(table.entityType, table.entityId),
    statusIdx: index("workflow_instances_status_idx").on(table.status),
    assignedToIdx: index("workflow_instances_assigned_to_idx").on(table.assignedTo),
  };
});

export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances).pick({
  instanceId: true,
  definitionId: true,
  entityType: true,
  entityId: true,
  currentStepId: true,
  status: true,
  assignedTo: true,
  priority: true,
  data: true,
  startedAt: true,
  completedAt: true,
  dueDate: true,
});

export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;

// Workflow Step History table
export const workflowStepHistory = pgTable("workflow_step_history", {
  id: serial("id").primaryKey(),
  instanceId: varchar("instance_id", { length: 100 }).notNull(),
  stepId: varchar("step_id", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  assignedTo: integer("assigned_to"),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  data: jsonb("data").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    instanceIdIdx: index("workflow_step_history_instance_id_idx").on(table.instanceId),
  };
});

export const insertWorkflowStepHistorySchema = createInsertSchema(workflowStepHistory).pick({
  instanceId: true,
  stepId: true,
  status: true,
  assignedTo: true,
  startedAt: true,
  completedAt: true,
  notes: true,
  data: true,
});

export type WorkflowStepHistory = typeof workflowStepHistory.$inferSelect;
export type InsertWorkflowStepHistory = z.infer<typeof insertWorkflowStepHistorySchema>;

// Shared Workflow tables for collaborative features
export enum CollaborationStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export enum CollaborationRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

// Shared Workflow table for collaborative workflow instances
export const sharedWorkflows = pgTable("shared_workflows", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull().references(() => workflowDefinitions.id), // Reference to the workflow definition
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active, paused, completed, archived
  shareCode: text("share_code").notNull().unique(), // Unique code for sharing the workflow
  isPublic: boolean("is_public").default(false), // Whether the workflow is publicly accessible
  createdBy: integer("created_by").notNull(), // User ID who created the shared workflow
  lastModified: timestamp("last_modified").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Indexes for performance
    shareCodeIdx: index("shared_workflows_share_code_idx").on(table.shareCode),
    createdByIdx: index("shared_workflows_created_by_idx").on(table.createdBy),
    statusIdx: index("shared_workflows_status_idx").on(table.status),
  };
});

export const insertSharedWorkflowSchema = createInsertSchema(sharedWorkflows).pick({
  workflowId: true,
  name: true,
  description: true,
  status: true,
  shareCode: true,
  isPublic: true,
  createdBy: true,
});

// Shared Workflow Collaborators table for managing collaborators
export const sharedWorkflowCollaborators = pgTable("shared_workflow_collaborators", {
  id: serial("id").primaryKey(),
  sharedWorkflowId: integer("shared_workflow_id").notNull().references(() => sharedWorkflows.id),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("viewer"), // owner, editor, viewer
  invitedBy: integer("invited_by").notNull(),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at"),
}, (table) => {
  return {
    // Unique constraint to prevent duplicate collaborators
    uniqueUserWorkflow: index("shared_workflow_collaborators_unique_user_workflow_idx")
      .on(table.sharedWorkflowId, table.userId)
  };
});

export const insertSharedWorkflowCollaboratorSchema = createInsertSchema(sharedWorkflowCollaborators).pick({
  sharedWorkflowId: true,
  userId: true,
  role: true,
  invitedBy: true,
  lastAccessedAt: true,
});

// Shared Workflow Activity table for tracking changes and comments
export const sharedWorkflowActivities = pgTable("shared_workflow_activities", {
  id: serial("id").primaryKey(),
  sharedWorkflowId: integer("shared_workflow_id").notNull().references(() => sharedWorkflows.id),
  userId: integer("user_id").notNull(),
  activityType: text("activity_type").notNull(), // edit, comment, status_change, etc.
  details: jsonb("details").default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => {
  return {
    // Index for querying activities by workflow
    workflowActivityIdx: index("shared_workflow_activities_workflow_idx").on(table.sharedWorkflowId)
  };
});

export const insertSharedWorkflowActivitySchema = createInsertSchema(sharedWorkflowActivities).pick({
  sharedWorkflowId: true,
  userId: true,
  activityType: true,
  details: true,
});

// Workflow Session table for real-time collaboration
export const workflowSessions = pgTable("workflow_sessions", {
  id: serial("id").primaryKey(),
  sharedWorkflowId: integer("shared_workflow_id").notNull().references(() => sharedWorkflows.id),
  sessionId: text("session_id").notNull().unique(),
  createdBy: integer("created_by").notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  status: text("status").notNull().default("active"), // active, ended
  participants: jsonb("participants").default([]),
}, (table) => {
  return {
    // Index for active sessions
    activeSessionsIdx: index("workflow_sessions_active_idx").on(table.status),
  };
});

export const insertWorkflowSessionSchema = createInsertSchema(workflowSessions).pick({
  sharedWorkflowId: true,
  sessionId: true,
  createdBy: true,
  status: true,
  participants: true,
});

// Types for shared workflow features
export type SharedWorkflow = typeof sharedWorkflows.$inferSelect;
export type InsertSharedWorkflow = z.infer<typeof insertSharedWorkflowSchema>;

export type SharedWorkflowCollaborator = typeof sharedWorkflowCollaborators.$inferSelect;
export type InsertSharedWorkflowCollaborator = z.infer<typeof insertSharedWorkflowCollaboratorSchema>;

export type SharedWorkflowActivity = typeof sharedWorkflowActivities.$inferSelect;
export type InsertSharedWorkflowActivity = z.infer<typeof insertSharedWorkflowActivitySchema>;

export type WorkflowSession = typeof workflowSessions.$inferSelect;
export type InsertWorkflowSession = z.infer<typeof insertWorkflowSessionSchema>;

// Compliance Reports table
export const complianceReports = pgTable("compliance_reports", {
  id: serial("id").primaryKey(),
  reportId: varchar("report_id", { length: 100 }).notNull().unique(),
  year: integer("year").notNull(),
  countyCode: varchar("county_code", { length: 10 }).notNull(),
  reportType: varchar("report_type", { length: 50 }).notNull().default("standard"), // standard, dor, audit
  generatedAt: timestamp("generated_at").notNull(),
  summary: jsonb("summary").notNull(), // Summary metrics
  issues: jsonb("issues"), // Optional detailed issues list
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, final, submitted
  submittedBy: integer("submitted_by"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertComplianceReportSchema = createInsertSchema(complianceReports).pick({
  reportId: true,
  year: true,
  countyCode: true,
  reportType: true,
  generatedAt: true,
  summary: true,
  issues: true,
  status: true,
  submittedBy: true,
  submittedAt: true,
});

export type ComplianceReport = typeof complianceReports.$inferSelect;
export type InsertComplianceReport = z.infer<typeof insertComplianceReportSchema>;

// Agent Experiences table for replay buffer
export const agentExperiences = pgTable("agent_experiences", {
  id: serial("id").primaryKey(),
  experienceId: varchar("experience_id", { length: 100 }).notNull().unique(),
  agentId: varchar("agent_id", { length: 50 }).notNull(),
  agentName: varchar("agent_name", { length: 100 }).notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  action: text("action").notNull(),
  state: jsonb("state").notNull(),
  nextState: jsonb("next_state"),
  reward: real("reward").notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: varchar("entity_id", { length: 100 }),
  priority: real("priority").notNull().default(0),
  context: jsonb("context"),
  usedForTraining: boolean("used_for_training").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    agentIdIdx: index("agent_experiences_agent_id_idx").on(table.agentId),
    priorityIdx: index("agent_experiences_priority_idx").on(table.priority),
    entityTypeIdx: index("agent_experiences_entity_type_idx").on(table.entityType),
  };
});

export const insertAgentExperienceSchema = createInsertSchema(agentExperiences).pick({
  experienceId: true,
  agentId: true,
  agentName: true,
  timestamp: true,
  action: true,
  state: true,
  nextState: true,
  reward: true,
  entityType: true,
  entityId: true,
  priority: true,
  context: true,
  usedForTraining: true,
});

export type AgentExperience = typeof agentExperiences.$inferSelect;
export type InsertAgentExperience = z.infer<typeof insertAgentExperienceSchema>;

// Learning Updates table
export const learningUpdates = pgTable("learning_updates", {
  id: serial("id").primaryKey(),
  updateId: varchar("update_id", { length: 100 }).notNull().unique(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  updateType: varchar("update_type", { length: 20 }).notNull(),
  sourceExperiences: jsonb("source_experiences").notNull(),
  payload: jsonb("payload").notNull(),
  appliedTo: jsonb("applied_to").default([]),
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLearningUpdateSchema = createInsertSchema(learningUpdates).pick({
  updateId: true,
  timestamp: true,
  updateType: true,
  sourceExperiences: true,
  payload: true,
  appliedTo: true,
  metrics: true,
});

export type LearningUpdate = typeof learningUpdates.$inferSelect;
export type InsertLearningUpdate = z.infer<typeof insertLearningUpdateSchema>;

// Property Analysis Interfaces
export interface PropertyHistoryDataPoint {
  date: Date;
  fieldName: string;
  oldValue: string;
  newValue: string;
  source: string;
  userId: number;
}

export interface MarketTrend {
  region: string;
  trendType: string;
  period: string;
  changePercentage: number;
  startDate: Date;
  endDate: Date;
  avgValue?: number;
  avgDaysOnMarket?: number;
  totalProperties?: number;
}

export interface PropertyAnalysisResult {
  propertyId: string;
  estimatedValue: number;
  confidenceScore: number;
  factors: {
    name: string;
    impact: number;
    description: string;
  }[];
  comparables: string[];
  recommendations: string[];
  marketTrends: string[];
}

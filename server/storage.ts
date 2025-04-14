import { 
  users, User, InsertUser, 
  properties, Property, InsertProperty,
  landRecords, LandRecord, InsertLandRecord,
  improvements, Improvement, InsertImprovement,
  fields, Field, InsertField,
  appeals, Appeal, InsertAppeal,
  appealComments, AppealComment, InsertAppealComment,
  appealEvidence, AppealEvidence, InsertAppealEvidence,
  auditLogs, AuditLog, InsertAuditLog,
  aiAgents, AiAgent, InsertAiAgent,
  systemActivities, SystemActivity, InsertSystemActivity,
  mcpToolExecutionLogs, MCPToolExecutionLog, InsertMCPToolExecutionLog,
  pacsModules, PacsModule, InsertPacsModule,
  agentMessages, AgentMessage, InsertAgentMessage,
  propertyInsightShares, PropertyInsightShare, InsertPropertyInsightShare,
  comparableSales, ComparableSale, InsertComparableSale,
  comparableSalesAnalyses, ComparableSalesAnalysis, InsertComparableSalesAnalysis,
  comparableAnalysisEntries, ComparableAnalysisEntry, InsertComparableAnalysisEntry,
  importStaging, StagedProperty, InsertStagedProperty,
  validationRules, ValidationRule, InsertValidationRule,
  validationIssues, ValidationIssue, InsertValidationIssue,
  workflowDefinitions, WorkflowDefinition, InsertWorkflowDefinition,
  workflowInstances, WorkflowInstance, InsertWorkflowInstance,
  workflowStepHistory, WorkflowStepHistory, InsertWorkflowStepHistory,
  complianceReports, ComplianceReport, InsertComplianceReport,
  agentExperiences, AgentExperience, InsertAgentExperience,
  learningUpdates, LearningUpdate, InsertLearningUpdate,
  dataLineageRecords, DataLineageRecord, InsertDataLineageRecord,
  codeImprovements, CodeImprovement, InsertCodeImprovement,
  sharedWorkflows, SharedWorkflow, InsertSharedWorkflow,
  sharedWorkflowCollaborators, SharedWorkflowCollaborator, InsertSharedWorkflowCollaborator,
  sharedWorkflowActivities, SharedWorkflowActivity, InsertSharedWorkflowActivity,
  workflowSessions, WorkflowSession, InsertWorkflowSession,
  // Enum types needed for validation and workflow
  RuleCategory, RuleLevel, EntityType, IssueStatus, MessagePriority, MessageEventType, ImprovementType,
  CollaborationStatus, CollaborationRole
} from "@shared/schema";
import { MarketTrend, PropertyHistoryDataPoint, PropertyAnalysisResult } from "@shared/schema";
import { RegulatoryFramework } from "./services/risk-assessment-engine";
import pg from 'pg';
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";

import {
  getAllPacsModules as fetchAllPacsModules,
  getPacsModuleById as fetchPacsModuleById,
  getPacsModulesByCategory as fetchPacsModulesByCategory,
  updatePacsModuleSyncStatus as updatePacsSyncStatus,
  upsertPacsModule as upsertPacs
} from "./pacs-storage";

// Database row type for PACS modules
interface PacsModuleRow {
  id: number;
  module_name: string;
  source: string;
  integration: string;
  description: string | null;
  category: string | null;
  api_endpoints: any;
  data_schema: any;
  sync_status: string | null;
  last_sync_timestamp: Date | null;
  created_at: Date;
}

// Define the storage interface
export interface IStorage {
  // Data Lineage methods
  createDataLineageRecord(record: InsertDataLineageRecord): Promise<DataLineageRecord>;
  getDataLineageByField(propertyId: string, fieldName: string): Promise<DataLineageRecord[]>;
  getDataLineageByProperty(propertyId: string): Promise<DataLineageRecord[]>;
  getDataLineageByUser(userId: number, limit?: number): Promise<DataLineageRecord[]>;
  getDataLineageByDateRange(startDate: Date, endDate: Date, limit?: number): Promise<DataLineageRecord[]>;
  getDataLineageBySource(source: string, limit?: number): Promise<DataLineageRecord[]>;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Property methods
  getAllProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  getPropertyByPropertyId(propertyId: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  
  // Land Record methods
  getLandRecordsByPropertyId(propertyId: string): Promise<LandRecord[]>;
  createLandRecord(landRecord: InsertLandRecord): Promise<LandRecord>;
  
  // Improvement methods
  getImprovementsByPropertyId(propertyId: string): Promise<Improvement[]>;
  createImprovement(improvement: InsertImprovement): Promise<Improvement>;
  
  // Field methods
  getFieldsByPropertyId(propertyId: string): Promise<Field[]>;
  createField(field: InsertField): Promise<Field>;
  getField(id: number): Promise<Field | undefined>;
  updateField(id: number, field: Partial<InsertField>): Promise<Field | undefined>;
  
  // Appeals Management methods
  getAppealsByPropertyId(propertyId: string): Promise<Appeal[]>;
  getAppealsByUserId(userId: number): Promise<Appeal[]>;
  createAppeal(appeal: InsertAppeal): Promise<Appeal>;
  updateAppealStatus(id: number, status: string): Promise<Appeal | undefined>;
  updateAppeal(id: number, updates: Partial<Appeal>): Promise<Appeal | undefined>;
  getAppealCommentsByAppealId(appealId: number): Promise<AppealComment[]>;
  createAppealComment(comment: InsertAppealComment): Promise<AppealComment>;
  getAppealEvidenceByAppealId(appealId: number): Promise<AppealEvidence[]>;
  createAppealEvidence(evidence: InsertAppealEvidence): Promise<AppealEvidence>;
  
  // Audit Log methods
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  
  // AI Agent methods
  getAllAiAgents(): Promise<AiAgent[]>;
  updateAiAgentStatus(id: number, status: string, performance: number): Promise<AiAgent | undefined>;
  
  // System Activity methods
  getSystemActivities(limit?: number): Promise<SystemActivity[]>;
  createSystemActivity(activity: InsertSystemActivity): Promise<SystemActivity>;
  
  // MCP Tool Execution Logging methods
  createMCPToolExecutionLog(log: InsertMCPToolExecutionLog): Promise<MCPToolExecutionLog>;
  getMCPToolExecutionLogs(limit?: number): Promise<MCPToolExecutionLog[]>;
  
  // PACS Module methods
  getAllPacsModules(): Promise<PacsModule[]>;
  upsertPacsModule(module: InsertPacsModule): Promise<PacsModule>;
  getPacsModuleById(id: number): Promise<PacsModule | undefined>;
  getPacsModulesByCategory(): Promise<PacsModule[]>;
  updatePacsModuleSyncStatus(id: number, syncStatus: string, lastSyncTimestamp: Date): Promise<PacsModule | undefined>;
  
  // Agent Messages methods
  createAgentMessage(message: InsertAgentMessage): Promise<AgentMessage>;
  getAgentMessageById(id: number): Promise<AgentMessage | undefined>;
  getAgentMessagesByType(messageType: MessageEventType): Promise<AgentMessage[]>;
  getAgentMessagesByPriority(priority: MessagePriority): Promise<AgentMessage[]>;
  getAgentMessagesBySourceAgent(sourceAgentId: string): Promise<AgentMessage[]>;
  getAgentMessagesByTargetAgent(targetAgentId: string): Promise<AgentMessage[]>;
  getAgentMessagesByStatus(status: string): Promise<AgentMessage[]>;
  getRecentAgentMessages(limit?: number): Promise<AgentMessage[]>;
  updateAgentMessageStatus(id: number, status: string): Promise<AgentMessage | undefined>;
  getAgentMessagesForEntity(entityType: EntityType, entityId: string): Promise<AgentMessage[]>;
  
  // Property Insight Sharing methods
  createPropertyInsightShare(share: InsertPropertyInsightShare): Promise<PropertyInsightShare>;
  getPropertyInsightShareById(shareId: string): Promise<PropertyInsightShare | null>;
  getPropertyInsightSharesByPropertyId(propertyId: string): Promise<PropertyInsightShare[]>;
  getAllPropertyInsightShares(): Promise<PropertyInsightShare[]>;
  updatePropertyInsightShare(shareId: string, updates: Partial<InsertPropertyInsightShare>): Promise<PropertyInsightShare | null>;
  deletePropertyInsightShare(shareId: string): Promise<boolean>;
  
  // Comparable Sales methods
  createComparableSale(comparableSale: InsertComparableSale): Promise<ComparableSale>;
  getComparableSaleById(id: number): Promise<ComparableSale | undefined>;
  getComparableSalesByPropertyId(propertyId: string): Promise<ComparableSale[]>;
  getComparableSalesByStatus(status: string): Promise<ComparableSale[]>;
  updateComparableSale(id: number, updates: Partial<InsertComparableSale>): Promise<ComparableSale | undefined>;
  deleteComparableSale(id: number): Promise<boolean>;
  
  // Comparable Sales Analysis methods
  createComparableSalesAnalysis(analysis: InsertComparableSalesAnalysis): Promise<ComparableSalesAnalysis>;
  getComparableSalesAnalysisById(analysisId: string): Promise<ComparableSalesAnalysis | undefined>;
  getComparableSalesAnalysesByPropertyId(propertyId: string): Promise<ComparableSalesAnalysis[]>;
  updateComparableSalesAnalysis(analysisId: string, updates: Partial<InsertComparableSalesAnalysis>): Promise<ComparableSalesAnalysis | undefined>;
  deleteComparableSalesAnalysis(analysisId: string): Promise<boolean>;
  
  // Comparable Analysis Entry methods
  createComparableAnalysisEntry(entry: InsertComparableAnalysisEntry): Promise<ComparableAnalysisEntry>;
  getComparableAnalysisEntriesByAnalysisId(analysisId: string): Promise<ComparableAnalysisEntry[]>;
  updateComparableAnalysisEntry(id: number, updates: Partial<InsertComparableAnalysisEntry>): Promise<ComparableAnalysisEntry | undefined>;
  deleteComparableAnalysisEntry(id: number): Promise<boolean>;
  
  // Property Data Staging methods
  createStagedProperty(property: InsertStagedProperty): Promise<StagedProperty>;
  getAllStagedProperties(): Promise<StagedProperty[]>;
  getStagedPropertyById(stagingId: string): Promise<StagedProperty | null>;
  updateStagedProperty(stagingId: string, updates: Partial<StagedProperty>): Promise<StagedProperty | null>;
  deleteStagedProperty(stagingId: string): Promise<boolean>;
  
  // Market and Economic Data methods
  getMarketTrends(region?: string): Promise<any[]>;
  getEconomicIndicators(region?: string): Promise<any>;
  findComparableProperties(propertyId: string, count: number): Promise<any[]>;
  getPropertyHistory(propertyId: string): Promise<any>;
  getRegionalHistoricalData(region: string): Promise<any>;
  
  // Property methods (additional)
  // Property Analysis methods
  getPropertyById(propertyId: string): Promise<any>;
  getPropertyHistory(propertyId: string): Promise<PropertyHistoryDataPoint[]>;
  getMarketTrends(region?: string): Promise<MarketTrend[]>;
  findComparableProperties(propertyId: string, count?: number): Promise<Property[]>;
  
  // Regulatory and Risk Data methods
  getRegulatoryFramework(region: string): Promise<any>;
  getHistoricalRegulatoryChanges(region: string): Promise<any[]>;
  getEnvironmentalRisks(propertyId: string): Promise<any>;
  
  // Validation Rules methods
  createValidationRule(rule: InsertValidationRule): Promise<ValidationRule>;
  getValidationRuleById(ruleId: string): Promise<ValidationRule | null>;
  getAllValidationRules(): Promise<ValidationRule[]>;
  getValidationRulesByEntityType(entityType: string): Promise<ValidationRule[]>;
  updateValidationRule(ruleId: string, updates: Partial<ValidationRule>): Promise<ValidationRule | null>;
  deleteValidationRule(ruleId: string): Promise<boolean>;
  
  // Validation Issues methods
  createValidationIssue(issue: Omit<ValidationIssue, 'id' | 'createdAt'>): Promise<ValidationIssue>;
  getValidationIssueById(issueId: string): Promise<ValidationIssue | null>;
  getValidationIssues(options?: { 
    propertyId?: string, 
    entityType?: string, 
    entityId?: string, 
    ruleId?: string, 
    level?: string, 
    status?: string 
  }): Promise<ValidationIssue[]>;
  updateValidationIssue(issueId: string, updates: Partial<ValidationIssue>): Promise<ValidationIssue | null>;
  deleteValidationIssue(issueId: string): Promise<boolean>;
  
  // Workflow Definition methods
  createWorkflowDefinition(workflow: InsertWorkflowDefinition): Promise<WorkflowDefinition>;
  getWorkflowDefinitionById(definitionId: string): Promise<WorkflowDefinition | null>;
  getAllWorkflowDefinitions(): Promise<WorkflowDefinition[]>;
  updateWorkflowDefinition(definitionId: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition | null>;
  deleteWorkflowDefinition(definitionId: string): Promise<boolean>;
  
  // Workflow Instance methods
  createWorkflowInstance(instance: InsertWorkflowInstance): Promise<WorkflowInstance>;
  getWorkflowInstanceById(instanceId: string): Promise<WorkflowInstance | null>;
  getWorkflowInstances(options?: { 
    status?: string, 
    definitionId?: string, 
    entityType?: string, 
    entityId?: string, 
    assignedTo?: number, 
    priority?: string,
    startedAfter?: Date,
    startedBefore?: Date,
    dueAfter?: Date,
    dueBefore?: Date
  }): Promise<WorkflowInstance[]>;
  updateWorkflowInstance(instanceId: string, updates: Partial<WorkflowInstance>): Promise<WorkflowInstance | null>;
  deleteWorkflowInstance(instanceId: string): Promise<boolean>;
  
  // Workflow Step History methods
  createWorkflowStepHistory(stepHistory: InsertWorkflowStepHistory): Promise<WorkflowStepHistory>;
  getWorkflowStepHistoryByInstance(instanceId: string): Promise<WorkflowStepHistory[]>;
  getStepHistoryByInstanceAndStep(instanceId: string, stepId: string): Promise<WorkflowStepHistory[]>;
  updateWorkflowStepHistory(id: number, updates: Partial<WorkflowStepHistory>): Promise<WorkflowStepHistory | null>;
  
  // Compliance Report methods
  createComplianceReport(report: InsertComplianceReport): Promise<ComplianceReport>;
  getComplianceReportById(reportId: string): Promise<ComplianceReport | null>;
  getComplianceReportsByYear(year: number): Promise<ComplianceReport[]>;
  getComplianceReportsByType(reportType: string): Promise<ComplianceReport[]>;
  updateComplianceReport(reportId: string, updates: Partial<ComplianceReport>): Promise<ComplianceReport | null>;
  updateComplianceReportStatus(reportId: string, status: string, submittedBy?: number): Promise<ComplianceReport | null>;
  
  // Washington State Specific Compliance Reports
  createEqualizationReport(report: any): Promise<any>; // Equalization ratio report (RCW 84.48)
  getEqualizationReportByYear(year: number): Promise<any | undefined>;
  createRevaluationCycleReport(report: any): Promise<any>; // Revaluation cycle report (WAC 458-07-015)
  getRevaluationCycleReportByYear(year: number): Promise<any | undefined>;  
  createExemptionVerificationReport(report: any): Promise<any>; // Exemption verification report
  getExemptionVerificationReportByYear(year: number): Promise<any | undefined>;
  createAppealComplianceReport(report: any): Promise<any>; // Appeal compliance report
  getAppealComplianceReportByYear(year: number): Promise<any | undefined>;
  getAppealsByTaxYear(taxYear: number): Promise<Appeal[]>;
  getAllExemptions(taxYear: number): Promise<any[]>;
  
  // Validation methods
  createValidationRule(rule: Omit<ValidationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ValidationRule>;
  getValidationRuleById(ruleId: string): Promise<ValidationRule | null>;
  getAllValidationRules(options?: { 
    category?: RuleCategory, 
    level?: RuleLevel,
    entityType?: EntityType,
    active?: boolean 
  }): Promise<ValidationRule[]>;
  getValidationRulesByEntityType(entityType: EntityType): Promise<ValidationRule[]>;
  updateValidationRule(ruleId: string, updates: Partial<ValidationRule>): Promise<ValidationRule | null>;
  deleteValidationRule(ruleId: string): Promise<boolean>;
  
  // Validation issues methods
  createValidationIssue(issue: Omit<ValidationIssue, 'id' | 'createdAt'>): Promise<ValidationIssue>;
  getValidationIssueById(issueId: string): Promise<ValidationIssue | null>;
  getValidationIssues(options?: {
    entityId?: string, 
    entityType?: EntityType,
    ruleId?: string,
    level?: RuleLevel,
    status?: IssueStatus,
    createdAfter?: Date,
    createdBefore?: Date
  }): Promise<ValidationIssue[]>;
  updateValidationIssue(issueId: string, updates: Partial<ValidationIssue>): Promise<ValidationIssue | null>;
  resolveValidationIssue(issueId: string, resolution: string, userId?: number): Promise<ValidationIssue | null>;
  acknowledgeValidationIssue(issueId: string, notes?: string): Promise<ValidationIssue | null>;
  waiveValidationIssue(issueId: string, reason: string, userId?: number): Promise<ValidationIssue | null>;
  
  // Code Improvement methods
  createCodeImprovement(improvement: InsertCodeImprovement): Promise<CodeImprovement>;
  getCodeImprovements(): Promise<CodeImprovement[]>;
  getCodeImprovementById(id: string): Promise<CodeImprovement | null>;
  getCodeImprovementsByAgent(agentId: string): Promise<CodeImprovement[]>;
  getCodeImprovementsByType(type: ImprovementType): Promise<CodeImprovement[]>;
  updateCodeImprovementStatus(id: string, status: 'pending' | 'approved' | 'rejected' | 'implemented'): Promise<CodeImprovement | null>;
  
  // Workflow methods
  createWorkflowDefinition(definition: Omit<WorkflowDefinition, 'definitionId' | 'createdAt'>): Promise<WorkflowDefinition>;
  getWorkflowDefinitionById(definitionId: string): Promise<WorkflowDefinition | null>;
  getAllWorkflowDefinitions(active?: boolean): Promise<WorkflowDefinition[]>;
  updateWorkflowDefinition(definitionId: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition | null>;
  activateWorkflowDefinition(definitionId: string): Promise<boolean>;
  deactivateWorkflowDefinition(definitionId: string): Promise<boolean>;
  
  // Workflow instance methods
  createWorkflowInstance(instance: Omit<WorkflowInstance, 'instanceId' | 'createdAt' | 'lastUpdated'>): Promise<WorkflowInstance>;
  getWorkflowInstanceById(instanceId: string): Promise<WorkflowInstance | null>;
  getWorkflowInstancesByDefinitionId(definitionId: string): Promise<WorkflowInstance[]>;
  getWorkflowInstancesByEntityId(entityId: string, entityType: string): Promise<WorkflowInstance[]>;
  getWorkflowInstancesByAssignee(assigneeId: number): Promise<WorkflowInstance[]>;
  updateWorkflowInstance(instanceId: string, updates: Partial<WorkflowInstance>): Promise<WorkflowInstance | null>;
  
  // Workflow step history methods
  createWorkflowStepHistory(stepHistory: Omit<WorkflowStepHistory, 'id' | 'createdAt'>): Promise<WorkflowStepHistory>;
  getWorkflowStepHistoryByInstanceId(instanceId: string): Promise<WorkflowStepHistory[]>;
  
  // Agent Experiences methods
  createAgentExperience(experience: InsertAgentExperience): Promise<AgentExperience>;
  getAgentExperienceById(experienceId: string): Promise<AgentExperience | null>;
  getAgentExperiencesByAgentId(agentId: string): Promise<AgentExperience[]>;
  getAgentExperiencesByEntityType(entityType: string): Promise<AgentExperience[]>;
  getAgentExperiencesByPriority(minPriority: number, limit?: number): Promise<AgentExperience[]>;
  updateAgentExperiencePriority(experienceId: string, priority: number): Promise<AgentExperience | null>;
  markAgentExperienceAsUsed(experienceId: string): Promise<AgentExperience | null>;
  
  // Learning Updates methods
  createLearningUpdate(update: InsertLearningUpdate): Promise<LearningUpdate>;
  getLearningUpdateById(updateId: string): Promise<LearningUpdate | null>;
  getRecentLearningUpdates(limit?: number): Promise<LearningUpdate[]>;
  getLearningUpdatesByType(updateType: string): Promise<LearningUpdate[]>;
}

// Implement the in-memory storage
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private properties: Map<number, Property>;
  private landRecords: Map<number, LandRecord>;
  private improvements: Map<number, Improvement>;
  private fields: Map<number, Field>;
  private appeals: Map<number, Appeal>;
  private appealComments: Map<number, AppealComment>;
  private appealEvidence: Map<number, AppealEvidence>;
  private dataLineageRecords: Map<number, DataLineageRecord>;
  private auditLogs: Map<number, AuditLog>;
  private aiAgents: Map<number, AiAgent>;
  private systemActivities: Map<number, SystemActivity>;
  private mcpToolExecutionLogs: Map<number, MCPToolExecutionLog>;
  private pacsModules: Map<number, PacsModule>;
  private agentMessages: Map<number, AgentMessage>;
  private propertyInsightShares: Map<string, PropertyInsightShare>;
  private comparableSales: Map<number, ComparableSale>;
  private comparableSalesAnalyses: Map<string, ComparableSalesAnalysis>;
  private comparableAnalysisEntries: Map<number, ComparableAnalysisEntry>;
  private stagedProperties: Map<string, StagedProperty>;
  private validationRules: Map<string, ValidationRule>;
  private validationIssues: Map<string, ValidationIssue>;
  private workflowDefinitions: Map<string, WorkflowDefinition>;
  private workflowInstances: Map<string, WorkflowInstance>;
  private workflowStepHistory: Map<number, WorkflowStepHistory>;
  private complianceReports: Map<string, ComplianceReport>;
  private equalizationReports: Map<string, any>; // Washington-specific equalization ratio reports
  private revaluationCycleReports: Map<string, any>; // Washington-specific revaluation cycle reports
  private exemptionVerificationReports: Map<string, any>; // Washington-specific exemption verification reports
  private appealComplianceReports: Map<string, any>; // Washington-specific appeal compliance reports
  private agentExperiences: Map<string, AgentExperience>; // Agent experiences for replay buffer
  private learningUpdates: Map<string, LearningUpdate>; // Learning updates from agent experiences
  private codeImprovements: Map<string, CodeImprovement>; // Agent-suggested code improvements
  
  private currentUserId: number;
  private currentPropertyId: number;
  private currentLandRecordId: number;
  private currentImprovementId: number;
  private currentFieldId: number;
  private currentAppealId: number;
  private currentAppealCommentId: number;
  private currentAppealEvidenceId: number;
  private currentAuditLogId: number;
  private currentAiAgentId: number;
  private currentSystemActivityId: number;
  private currentPacsModuleId: number;
  private currentPropertyInsightShareId: number;
  private currentComparableSaleId: number;
  private currentComparableAnalysisEntryId: number;
  private currentMCPToolExecutionLogId: number;
  private currentWorkflowStepHistoryId: number;
  private currentAgentMessageId: number;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.landRecords = new Map();
    this.improvements = new Map();
    this.fields = new Map();
    this.appeals = new Map();
    this.appealComments = new Map();
    this.appealEvidence = new Map();
    this.dataLineageRecords = new Map();
    this.auditLogs = new Map();
    this.aiAgents = new Map();
    this.systemActivities = new Map();
    this.mcpToolExecutionLogs = new Map();
    this.pacsModules = new Map();
    this.agentMessages = new Map();
    this.propertyInsightShares = new Map();
    this.comparableSales = new Map();
    this.comparableSalesAnalyses = new Map();
    this.comparableAnalysisEntries = new Map();
    this.stagedProperties = new Map<string, StagedProperty>();
    this.validationRules = new Map<string, ValidationRule>();
    this.validationIssues = new Map<string, ValidationIssue>();
    this.workflowDefinitions = new Map<string, WorkflowDefinition>();
    this.workflowInstances = new Map<string, WorkflowInstance>();
    this.workflowStepHistory = new Map<number, WorkflowStepHistory>();
    this.complianceReports = new Map<string, ComplianceReport>();
    this.equalizationReports = new Map<string, any>();
    this.revaluationCycleReports = new Map<string, any>();
    this.exemptionVerificationReports = new Map<string, any>();
    this.appealComplianceReports = new Map<string, any>();
    this.agentExperiences = new Map<string, AgentExperience>();
    this.learningUpdates = new Map<string, LearningUpdate>();
    this.codeImprovements = new Map<string, CodeImprovement>();
    
    this.currentUserId = 1;
    this.currentPropertyId = 1;
    this.currentLandRecordId = 1;
    this.currentImprovementId = 1;
    this.currentFieldId = 1;
    this.currentAppealId = 1;
    this.currentAppealCommentId = 1;
    this.currentAppealEvidenceId = 1;
    this.currentAuditLogId = 1;
    this.currentAiAgentId = 1;
    this.currentSystemActivityId = 1;
    this.currentPacsModuleId = 1;
    this.currentPropertyInsightShareId = 1;
    this.currentComparableSaleId = 1;
    this.currentComparableAnalysisEntryId = 1;
    this.currentMCPToolExecutionLogId = 1;
    this.currentWorkflowStepHistoryId = 1;
    this.currentAgentMessageId = 1;
    
    // Initialize with sample data
    this.seedData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const timestamp = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: timestamp,
      role: insertUser.role || 'user',       // Ensure role is always defined
      email: insertUser.email || null        // Ensure email is always defined or null
    };
    this.users.set(id, user);
    return user;
  }
  
  // Property methods
  async getAllProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }
  
  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }
  
  async getPropertyByPropertyId(propertyId: string): Promise<Property | undefined> {
    return Array.from(this.properties.values()).find(
      (property) => property.propertyId === propertyId,
    );
  }
  
  async getPropertyById(propertyId: string): Promise<any> {
    const property = await this.getPropertyByPropertyId(propertyId);
    if (!property) {
      return null;
    }
    return property;
  }
  
  async getComparableProperties(propertyId: string, count: number = 5): Promise<Property[]> {
    // Get the target property
    const targetProperty = await this.getPropertyByPropertyId(propertyId);
    if (!targetProperty) {
      return [];
    }
    
    // Get all properties except the target one
    const allProperties = await this.getAllProperties();
    const otherProperties = allProperties.filter(p => p.propertyId !== propertyId);
    
    // Sort by similarity (using property type and acres as simple similarity metrics)
    const sortedProperties = otherProperties.sort((a, b) => {
      // Same property type gets priority
      if (a.propertyType === targetProperty.propertyType && b.propertyType !== targetProperty.propertyType) {
        return -1;
      }
      if (b.propertyType === targetProperty.propertyType && a.propertyType !== targetProperty.propertyType) {
        return 1;
      }
      
      // Similar acreage gets priority
      const aAcres = parseFloat(a.acres);
      const bAcres = parseFloat(b.acres);
      const targetAcres = parseFloat(targetProperty.acres);
      
      const aDiff = Math.abs(aAcres - targetAcres);
      const bDiff = Math.abs(bAcres - targetAcres);
      
      return aDiff - bDiff;
    });
    
    // Return the top N most similar properties
    return sortedProperties.slice(0, count);
  }
  
  async getPropertyHistory(propertyId: string): Promise<PropertyHistoryDataPoint[]> {
    // Get data lineage records for this property
    const lineageRecords = await this.getDataLineageByProperty(propertyId);
    
    // Convert to history data points
    const historyPoints: PropertyHistoryDataPoint[] = lineageRecords.map(record => ({
      date: record.changeTimestamp,
      fieldName: record.fieldName,
      oldValue: record.oldValue,
      newValue: record.newValue,
      source: record.source,
      userId: record.userId
    }));
    
    // Sort by date, newest first
    return historyPoints.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
  
  async getMarketTrends(): Promise<MarketTrend[]> {
    // In a real implementation, this would fetch actual market trends
    // For now, we'll return mock data
    return [
      {
        region: 'Benton County',
        trendType: 'price',
        period: 'yearly',
        changePercentage: 5.2,
        startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        endDate: new Date(),
        avgValue: 320000
      },
      {
        region: 'Benton County',
        trendType: 'demand',
        period: 'quarterly',
        changePercentage: 3.8,
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        endDate: new Date(),
        avgDaysOnMarket: 28
      },
      {
        region: 'Benton County',
        trendType: 'inventory',
        period: 'monthly',
        changePercentage: -2.1,
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        endDate: new Date(),
        totalProperties: 182
      }
    ];
  }
  
  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = this.currentPropertyId++;
    const timestamp = new Date();
    const property: Property = { 
      ...insertProperty, 
      id, 
      createdAt: timestamp, 
      lastUpdated: timestamp,
      // Ensure required fields are properly typed
      status: insertProperty.status || 'active',
      // Ensure acres is always a string
      acres: insertProperty.acres,
      // Ensure value is either a string or null
      value: insertProperty.value === undefined ? null : insertProperty.value,
      // Ensure extraFields is always an object
      extraFields: insertProperty.extraFields || {}
    };
    this.properties.set(id, property);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Created new property: ${property.address}`,
      entityType: 'property',
      entityId: property.propertyId
    });
    
    return property;
  }
  
  async updateProperty(id: number, updateData: Partial<InsertProperty>, userId: number = 1, source: 'import' | 'manual' | 'api' | 'calculated' | 'validated' | 'correction' = 'manual'): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;
    
    const timestamp = new Date();
    const updatedProperty = { 
      ...property, 
      ...updateData, 
      lastUpdated: timestamp 
    };
    
    // Track changes for data lineage
    for (const key in updateData) {
      if (property[key] !== updatedProperty[key]) {
        const oldValue = property[key] === undefined ? null : property[key];
        const newValue = updatedProperty[key] === undefined ? null : updatedProperty[key];
        
        // Only track if values actually changed
        if (oldValue !== newValue) {
          // Convert values to strings for storage
          const oldValueStr = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue);
          const newValueStr = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
          
          await this.createDataLineageRecord({
            propertyId: property.propertyId,
            fieldName: key,
            oldValue: oldValueStr,
            newValue: newValueStr,
            changeTimestamp: timestamp,
            source,
            userId,
            sourceDetails: { updateOperation: 'updateProperty', entityId: id }
          });
        }
      }
    }
    
    this.properties.set(id, updatedProperty);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Updated property: ${property.address}`,
      entityType: 'property',
      entityId: property.propertyId
    });
    
    return updatedProperty;
  }
  
  // Land Record methods
  async getLandRecordsByPropertyId(propertyId: string): Promise<LandRecord[]> {
    return Array.from(this.landRecords.values())
      .filter(record => record.propertyId === propertyId);
  }
  
  async createLandRecord(insertLandRecord: InsertLandRecord): Promise<LandRecord> {
    const id = this.currentLandRecordId++;
    const timestamp = new Date();
    const landRecord: LandRecord = { 
      ...insertLandRecord, 
      id, 
      createdAt: timestamp, 
      lastUpdated: timestamp,
      // Ensure nullable fields are properly set
      topography: insertLandRecord.topography !== undefined ? insertLandRecord.topography : null,
      frontage: insertLandRecord.frontage !== undefined ? insertLandRecord.frontage : null,
      depth: insertLandRecord.depth !== undefined ? insertLandRecord.depth : null,
      shape: insertLandRecord.shape !== undefined ? insertLandRecord.shape : null,
      utilities: insertLandRecord.utilities !== undefined ? insertLandRecord.utilities : null,
      floodZone: insertLandRecord.floodZone !== undefined ? insertLandRecord.floodZone : null
    };
    this.landRecords.set(id, landRecord);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Added land record for property ID: ${landRecord.propertyId}`,
      entityType: 'landRecord',
      entityId: landRecord.propertyId
    });
    
    return landRecord;
  }
  
  // Improvement methods
  async getImprovementsByPropertyId(propertyId: string): Promise<Improvement[]> {
    return Array.from(this.improvements.values())
      .filter(improvement => improvement.propertyId === propertyId);
  }
  
  async createImprovement(insertImprovement: InsertImprovement): Promise<Improvement> {
    const id = this.currentImprovementId++;
    const timestamp = new Date();
    const improvement: Improvement = { 
      ...insertImprovement, 
      id, 
      createdAt: timestamp, 
      lastUpdated: timestamp,
      // Ensure nullable fields are properly set
      yearBuilt: insertImprovement.yearBuilt !== undefined ? insertImprovement.yearBuilt : null,
      squareFeet: insertImprovement.squareFeet !== undefined ? insertImprovement.squareFeet : null,
      bedrooms: insertImprovement.bedrooms !== undefined ? insertImprovement.bedrooms : null,
      bathrooms: insertImprovement.bathrooms !== undefined ? insertImprovement.bathrooms : null,
      quality: insertImprovement.quality !== undefined ? insertImprovement.quality : null,
      condition: insertImprovement.condition !== undefined ? insertImprovement.condition : null
    };
    this.improvements.set(id, improvement);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Added improvement (${improvement.improvementType}) for property ID: ${improvement.propertyId}`,
      entityType: 'improvement',
      entityId: improvement.propertyId
    });
    
    return improvement;
  }
  
  // Field methods
  async getFieldsByPropertyId(propertyId: string): Promise<Field[]> {
    return Array.from(this.fields.values())
      .filter(field => field.propertyId === propertyId);
  }
  
  async createField(insertField: InsertField): Promise<Field> {
    const id = this.currentFieldId++;
    const timestamp = new Date();
    const field: Field = { 
      ...insertField, 
      id, 
      createdAt: timestamp, 
      lastUpdated: timestamp,
      // Ensure fieldValue is properly set
      fieldValue: insertField.fieldValue !== undefined ? insertField.fieldValue : null
    };
    this.fields.set(id, field);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Added field (${field.fieldType}) for property ID: ${field.propertyId}`,
      entityType: 'field',
      entityId: field.propertyId
    });
    
    return field;
  }
  
  async getField(id: number): Promise<Field | undefined> {
    return this.fields.get(id);
  }
  
  async updateField(id: number, updateData: Partial<InsertField>, userId: number = 1, source: 'import' | 'manual' | 'api' | 'calculated' | 'validated' | 'correction' = 'manual'): Promise<Field | undefined> {
    const field = this.fields.get(id);
    if (!field) return undefined;
    
    const timestamp = new Date();
    const updatedField = { 
      ...field, 
      ...updateData, 
      lastUpdated: timestamp 
    };
    
    // Track changes for data lineage
    for (const key in updateData) {
      if (field[key] !== updatedField[key]) {
        const oldValue = field[key] === undefined ? null : field[key];
        const newValue = updatedField[key] === undefined ? null : updatedField[key];
        
        // Only track if values actually changed
        if (oldValue !== newValue) {
          // Convert values to strings for storage
          const oldValueStr = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue);
          const newValueStr = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
          
          // Use the field's property ID for data lineage tracking
          await this.createDataLineageRecord({
            propertyId: field.propertyId,
            fieldName: `field.${field.fieldName}.${key}`,
            oldValue: oldValueStr,
            newValue: newValueStr,
            changeTimestamp: timestamp,
            source,
            userId,
            sourceDetails: { updateOperation: 'updateField', entityId: id }
          });
        }
      }
    }
    
    this.fields.set(id, updatedField);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Updated field (${field.fieldType}) for property ID: ${field.propertyId}`,
      entityType: 'field',
      entityId: field.propertyId
    });
    
    return updatedField;
  }
  
  // Appeals Management methods
  async getAppealsByPropertyId(propertyId: string): Promise<Appeal[]> {
    return Array.from(this.appeals.values())
      .filter(appeal => appeal.propertyId === propertyId);
  }
  
  async getAppealsByUserId(userId: number): Promise<Appeal[]> {
    return Array.from(this.appeals.values())
      .filter(appeal => appeal.userId === userId);
  }
  
  async createAppeal(insertAppeal: InsertAppeal): Promise<Appeal> {
    const id = this.currentAppealId++;
    const timestamp = new Date();
    const appeal: Appeal = { 
      ...insertAppeal, 
      id, 
      createdAt: timestamp, 
      lastUpdated: timestamp,
      // Ensure all required fields are set with proper defaults
      status: insertAppeal.status || 'submitted',
      appealType: insertAppeal.appealType || 'value',
      evidenceUrls: insertAppeal.evidenceUrls || null,
      requestedValue: insertAppeal.requestedValue || null,
      hearingDate: insertAppeal.hearingDate || null,
      hearingLocation: insertAppeal.hearingLocation || null,
      assignedTo: insertAppeal.assignedTo || null,
      dateReceived: insertAppeal.dateReceived || timestamp,
      // Required fields that might not be in the insert schema
      decision: null, 
      decisionReason: null, 
      decisionDate: null,
      notificationSent: false
    };
    this.appeals.set(id, appeal);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 3, // Citizen Interaction Agent
      activity: `New appeal submitted for property ID: ${appeal.propertyId}`,
      entityType: 'appeal',
      entityId: appeal.propertyId
    });
    
    return appeal;
  }
  
  async updateAppealStatus(id: number, status: string): Promise<Appeal | undefined> {
    const appeal = this.appeals.get(id);
    if (!appeal) return undefined;
    
    const timestamp = new Date();
    const updatedAppeal = { 
      ...appeal, 
      status, 
      lastUpdated: timestamp 
    };
    
    this.appeals.set(id, updatedAppeal);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 3, // Citizen Interaction Agent
      activity: `Appeal status updated to ${status} for property ID: ${appeal.propertyId}`,
      entityType: 'appeal',
      entityId: appeal.propertyId
    });
    
    return updatedAppeal;
  }
  
  async updateAppeal(id: number, updates: Partial<Appeal>, userId: number = 1, source: 'import' | 'manual' | 'api' | 'calculated' | 'validated' | 'correction' = 'manual'): Promise<Appeal | undefined> {
    const appeal = this.appeals.get(id);
    if (!appeal) return undefined;
    
    const timestamp = new Date();
    const updatedAppeal = { 
      ...appeal, 
      ...updates, 
      lastUpdated: timestamp 
    };
    
    // Track changes for data lineage
    for (const key in updates) {
      if (appeal[key] !== updatedAppeal[key]) {
        const oldValue = appeal[key] === undefined ? null : appeal[key];
        const newValue = updatedAppeal[key] === undefined ? null : updatedAppeal[key];
        
        // Only track if values actually changed
        if (oldValue !== newValue) {
          // Convert values to strings for storage
          const oldValueStr = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue);
          const newValueStr = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
          
          // Use the appeal's property ID for data lineage tracking
          await this.createDataLineageRecord({
            propertyId: appeal.propertyId,
            fieldName: `appeal.${key}`,
            oldValue: oldValueStr,
            newValue: newValueStr,
            changeTimestamp: timestamp,
            source,
            userId,
            sourceDetails: { updateOperation: 'updateAppeal', entityId: id }
          });
        }
      }
    }
    
    this.appeals.set(id, updatedAppeal);
    
    // Create system activity if significant changes
    if (updates.status || updates.decision) {
      await this.createSystemActivity({
        agentId: 3, // Citizen Interaction Agent
        activity: `Appeal updated for property ID: ${appeal.propertyId}`,
        entityType: 'appeal',
        entityId: appeal.propertyId
      });
    }
    
    return updatedAppeal;
  }
  
  async getAppealCommentsByAppealId(appealId: number): Promise<AppealComment[]> {
    return Array.from(this.appealComments.values())
      .filter(comment => comment.appealId === appealId);
  }
  
  async createAppealComment(insertComment: InsertAppealComment): Promise<AppealComment> {
    const id = this.currentAppealCommentId++;
    const timestamp = new Date();
    const comment: AppealComment = { 
      ...insertComment, 
      id, 
      createdAt: timestamp,
      // Ensure internalOnly is properly set
      internalOnly: insertComment.internalOnly !== undefined ? insertComment.internalOnly : null
    };
    this.appealComments.set(id, comment);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 3, // Citizen Interaction Agent
      activity: `New comment added to appeal ID: ${comment.appealId}`,
      entityType: 'appealComment',
      entityId: String(comment.appealId)
    });
    
    return comment;
  }
  
  async getAppealEvidenceByAppealId(appealId: number): Promise<AppealEvidence[]> {
    return Array.from(this.appealEvidence.values())
      .filter(evidence => evidence.appealId === appealId);
  }
  
  async createAppealEvidence(insertEvidence: InsertAppealEvidence): Promise<AppealEvidence> {
    const id = this.currentAppealEvidenceId++;
    const timestamp = new Date();
    const evidence: AppealEvidence = { 
      ...insertEvidence, 
      id, 
      createdAt: timestamp,
      // Ensure optional fields are properly set
      fileSize: insertEvidence.fileSize !== undefined ? insertEvidence.fileSize : null,
      description: insertEvidence.description !== undefined ? insertEvidence.description : null
    };
    this.appealEvidence.set(id, evidence);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 3, // Citizen Interaction Agent
      activity: `New evidence uploaded for appeal ID: ${evidence.appealId}`,
      entityType: 'appealEvidence',
      entityId: String(evidence.appealId)
    });
    
    return evidence;
  }
  
  // Audit Log methods
  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const id = this.currentAuditLogId++;
    const timestamp = new Date();
    const auditLog: AuditLog = { 
      ...insertAuditLog, 
      id, 
      timestamp,
      // Ensure nullable fields are properly set
      userId: insertAuditLog.userId !== undefined ? insertAuditLog.userId : null,
      entityId: insertAuditLog.entityId !== undefined ? insertAuditLog.entityId : null,
      details: insertAuditLog.details || null,
      ipAddress: insertAuditLog.ipAddress !== undefined ? insertAuditLog.ipAddress : null
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }
  
  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // Data Lineage methods
  async createDataLineageRecord(record: InsertDataLineageRecord): Promise<DataLineageRecord> {
    const id = this.dataLineageRecords.size + 1;
    const timestamp = new Date();
    const lineageRecord: DataLineageRecord = {
      ...record,
      id,
      createdAt: timestamp
    };
    this.dataLineageRecords.set(id, lineageRecord);
    return lineageRecord;
  }
  
  async getDataLineageByField(propertyId: string, fieldName: string): Promise<DataLineageRecord[]> {
    return Array.from(this.dataLineageRecords.values())
      .filter(record => record.propertyId === propertyId && record.fieldName === fieldName)
      .sort((a, b) => b.changeTimestamp.getTime() - a.changeTimestamp.getTime());
  }
  
  async getDataLineageByProperty(propertyId: string): Promise<DataLineageRecord[]> {
    return Array.from(this.dataLineageRecords.values())
      .filter(record => record.propertyId === propertyId)
      .sort((a, b) => b.changeTimestamp.getTime() - a.changeTimestamp.getTime());
  }
  
  async getDataLineageByUser(userId: number, limit: number = 100): Promise<DataLineageRecord[]> {
    return Array.from(this.dataLineageRecords.values())
      .filter(record => record.userId === userId)
      .sort((a, b) => b.changeTimestamp.getTime() - a.changeTimestamp.getTime())
      .slice(0, limit);
  }
  
  async getDataLineageByDateRange(startDate: Date, endDate: Date, limit: number = 100): Promise<DataLineageRecord[]> {
    return Array.from(this.dataLineageRecords.values())
      .filter(record => {
        const timestamp = record.changeTimestamp.getTime();
        return timestamp >= startDate.getTime() && timestamp <= endDate.getTime();
      })
      .sort((a, b) => b.changeTimestamp.getTime() - a.changeTimestamp.getTime())
      .slice(0, limit);
  }
  
  async getDataLineageBySource(source: string, limit: number = 100): Promise<DataLineageRecord[]> {
    return Array.from(this.dataLineageRecords.values())
      .filter(record => record.source === source)
      .sort((a, b) => b.changeTimestamp.getTime() - a.changeTimestamp.getTime())
      .slice(0, limit);
  }
  
  // AI Agent methods
  async getAllAiAgents(): Promise<AiAgent[]> {
    return Array.from(this.aiAgents.values());
  }
  
  async updateAiAgentStatus(id: number, status: string, performance: number): Promise<AiAgent | undefined> {
    const agent = this.aiAgents.get(id);
    if (!agent) return undefined;
    
    const timestamp = new Date();
    const updatedAgent = { 
      ...agent, 
      status, 
      performance,
      lastActivity: timestamp 
    };
    
    this.aiAgents.set(id, updatedAgent);
    return updatedAgent;
  }
  
  // System Activity methods
  async getSystemActivities(limit: number = 100): Promise<SystemActivity[]> {
    return Array.from(this.systemActivities.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async createSystemActivity(insertActivity: InsertSystemActivity): Promise<SystemActivity> {
    const id = this.currentSystemActivityId++;
    const timestamp = new Date();
    const activity: SystemActivity = { 
      ...insertActivity, 
      id, 
      timestamp,
      // Ensure nullable fields are properly set
      agentId: insertActivity.agentId !== undefined ? insertActivity.agentId : null,
      entityType: insertActivity.entityType !== undefined ? insertActivity.entityType : null,
      entityId: insertActivity.entityId !== undefined ? insertActivity.entityId : null,
    };
    this.systemActivities.set(id, activity);
    return activity;
  }
  
  // MCP Tool Execution Log methods
  async createMCPToolExecutionLog(log: InsertMCPToolExecutionLog): Promise<MCPToolExecutionLog> {
    const id = this.currentMCPToolExecutionLogId++;
    const timestamp = new Date();
    const mcpToolExecutionLog: MCPToolExecutionLog = {
      ...log,
      id,
      createdAt: timestamp
    };
    this.mcpToolExecutionLogs.set(id, mcpToolExecutionLog);
    return mcpToolExecutionLog;
  }

  // Validation methods
  async createValidationRule(rule: Omit<ValidationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ValidationRule> {
    const id = `rule_${crypto.randomUUID()}`;
    const timestamp = new Date();
    const validationRule: ValidationRule = {
      ...rule,
      id,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    this.validationRules.set(id, validationRule);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Created validation rule: ${rule.name}`,
      entityType: 'validation_rule',
      entityId: id
    });
    
    return validationRule;
  }
  
  async getValidationRuleById(ruleId: string): Promise<ValidationRule | null> {
    const rule = this.validationRules.get(ruleId);
    return rule || null;
  }
  
  async getAllValidationRules(options?: { 
    category?: RuleCategory, 
    level?: RuleLevel,
    entityType?: EntityType,
    active?: boolean 
  }): Promise<ValidationRule[]> {
    let rules = Array.from(this.validationRules.values());
    
    if (options) {
      if (options.category !== undefined) {
        rules = rules.filter(rule => rule.category === options.category);
      }
      
      if (options.level !== undefined) {
        rules = rules.filter(rule => rule.level === options.level);
      }
      
      if (options.entityType !== undefined) {
        rules = rules.filter(rule => rule.entityType === options.entityType);
      }
      
      if (options.active !== undefined) {
        rules = rules.filter(rule => rule.active === options.active);
      }
    }
    
    return rules;
  }
  
  async getValidationRulesByEntityType(entityType: EntityType): Promise<ValidationRule[]> {
    return Array.from(this.validationRules.values())
      .filter(rule => rule.entityType === entityType);
  }
  
  async updateValidationRule(ruleId: string, updates: Partial<ValidationRule>): Promise<ValidationRule | null> {
    const rule = this.validationRules.get(ruleId);
    if (!rule) return null;
    
    const timestamp = new Date();
    const updatedRule = { 
      ...rule, 
      ...updates, 
      updatedAt: timestamp 
    };
    
    this.validationRules.set(ruleId, updatedRule);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Updated validation rule: ${rule.name}`,
      entityType: 'validation_rule',
      entityId: ruleId
    });
    
    return updatedRule;
  }
  
  async deleteValidationRule(ruleId: string): Promise<boolean> {
    const rule = this.validationRules.get(ruleId);
    if (!rule) return false;
    
    const result = this.validationRules.delete(ruleId);
    
    if (result) {
      // Create system activity
      await this.createSystemActivity({
        agentId: 1, // Data Management Agent
        activity: `Deleted validation rule: ${rule.name}`,
        entityType: 'validation_rule',
        entityId: ruleId
      });
    }
    
    return result;
  }
  
  // Validation issues methods
  async createValidationIssue(issue: Omit<ValidationIssue, 'id' | 'createdAt'>): Promise<ValidationIssue> {
    const id = `issue_${crypto.randomUUID()}`;
    const timestamp = new Date();
    const validationIssue: ValidationIssue = {
      ...issue,
      id,
      createdAt: timestamp
    };
    
    this.validationIssues.set(id, validationIssue);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Created validation issue for ${issue.entityType} ${issue.entityId}: ${issue.message}`,
      entityType: issue.entityType,
      entityId: issue.entityId
    });
    
    return validationIssue;
  }
  
  async getValidationIssueById(issueId: string): Promise<ValidationIssue | null> {
    const issue = this.validationIssues.get(issueId);
    return issue || null;
  }
  
  async getValidationIssues(options?: {
    entityId?: string, 
    entityType?: EntityType,
    ruleId?: string,
    level?: RuleLevel,
    status?: IssueStatus,
    createdAfter?: Date,
    createdBefore?: Date
  }): Promise<ValidationIssue[]> {
    let issues = Array.from(this.validationIssues.values());
    
    if (options) {
      if (options.entityId !== undefined) {
        issues = issues.filter(issue => issue.entityId === options.entityId);
      }
      
      if (options.entityType !== undefined) {
        issues = issues.filter(issue => issue.entityType === options.entityType);
      }
      
      if (options.ruleId !== undefined) {
        issues = issues.filter(issue => issue.ruleId === options.ruleId);
      }
      
      if (options.level !== undefined) {
        issues = issues.filter(issue => issue.level === options.level);
      }
      
      if (options.status !== undefined) {
        issues = issues.filter(issue => issue.status === options.status);
      }
      
      if (options.createdAfter !== undefined) {
        issues = issues.filter(issue => issue.createdAt >= options.createdAfter!);
      }
      
      if (options.createdBefore !== undefined) {
        issues = issues.filter(issue => issue.createdAt <= options.createdBefore!);
      }
    }
    
    return issues;
  }
  
  async updateValidationIssue(issueId: string, updates: Partial<ValidationIssue>): Promise<ValidationIssue | null> {
    const issue = this.validationIssues.get(issueId);
    if (!issue) return null;
    
    const updatedIssue = { 
      ...issue, 
      ...updates
    };
    
    this.validationIssues.set(issueId, updatedIssue);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Updated validation issue: ${issue.message}`,
      entityType: issue.entityType,
      entityId: issue.entityId
    });
    
    return updatedIssue;
  }
  
  async resolveValidationIssue(issueId: string, resolution: string, userId?: number): Promise<ValidationIssue | null> {
    const issue = this.validationIssues.get(issueId);
    if (!issue) return null;
    
    const resolvedIssue = { 
      ...issue, 
      status: 'resolved' as IssueStatus,
      resolution,
      resolvedBy: userId || null,
      resolvedAt: new Date()
    };
    
    this.validationIssues.set(issueId, resolvedIssue);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Resolved validation issue: ${resolution}`,
      entityType: issue.entityType,
      entityId: issue.entityId
    });
    
    return resolvedIssue;
  }
  
  async acknowledgeValidationIssue(issueId: string, notes?: string): Promise<ValidationIssue | null> {
    const issue = this.validationIssues.get(issueId);
    if (!issue) return null;
    
    const acknowledgedIssue = { 
      ...issue, 
      status: 'acknowledged' as IssueStatus,
      notes: notes || issue.notes
    };
    
    this.validationIssues.set(issueId, acknowledgedIssue);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Acknowledged validation issue: ${issue.message}`,
      entityType: issue.entityType,
      entityId: issue.entityId
    });
    
    return acknowledgedIssue;
  }
  
  async waiveValidationIssue(issueId: string, reason: string, userId?: number): Promise<ValidationIssue | null> {
    const issue = this.validationIssues.get(issueId);
    if (!issue) return null;
    
    const waivedIssue = { 
      ...issue, 
      status: 'waived' as IssueStatus,
      waiver: reason,
      waivedBy: userId || null,
      waivedAt: new Date()
    };
    
    this.validationIssues.set(issueId, waivedIssue);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Waived validation issue: ${reason}`,
      entityType: issue.entityType,
      entityId: issue.entityId
    });
    
    return waivedIssue;
  }
  
  // Workflow methods
  async createWorkflowDefinition(definition: Omit<WorkflowDefinition, 'definitionId' | 'createdAt'>): Promise<WorkflowDefinition> {
    const definitionId = `wfdef_${crypto.randomUUID()}`;
    const timestamp = new Date();
    const workflowDefinition: WorkflowDefinition = {
      ...definition,
      definitionId,
      createdAt: timestamp
    };
    
    this.workflowDefinitions.set(definitionId, workflowDefinition);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Created workflow definition: ${definition.name}`,
      entityType: 'workflow_definition',
      entityId: definitionId
    });
    
    return workflowDefinition;
  }
  
  async getWorkflowDefinitionById(definitionId: string): Promise<WorkflowDefinition | null> {
    const definition = this.workflowDefinitions.get(definitionId);
    return definition || null;
  }
  
  async getAllWorkflowDefinitions(active?: boolean): Promise<WorkflowDefinition[]> {
    let definitions = Array.from(this.workflowDefinitions.values());
    
    if (active !== undefined) {
      definitions = definitions.filter(def => def.isActive === active);
    }
    
    return definitions;
  }
  
  async updateWorkflowDefinition(definitionId: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition | null> {
    const definition = this.workflowDefinitions.get(definitionId);
    if (!definition) return null;
    
    const updatedDefinition = { 
      ...definition, 
      ...updates 
    };
    
    this.workflowDefinitions.set(definitionId, updatedDefinition);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Updated workflow definition: ${definition.name}`,
      entityType: 'workflow_definition',
      entityId: definitionId
    });
    
    return updatedDefinition;
  }
  
  async activateWorkflowDefinition(definitionId: string): Promise<boolean> {
    const definition = this.workflowDefinitions.get(definitionId);
    if (!definition) return false;
    
    const activatedDefinition = { 
      ...definition, 
      isActive: true 
    };
    
    this.workflowDefinitions.set(definitionId, activatedDefinition);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Activated workflow definition: ${definition.name}`,
      entityType: 'workflow_definition',
      entityId: definitionId
    });
    
    return true;
  }
  
  async deactivateWorkflowDefinition(definitionId: string): Promise<boolean> {
    const definition = this.workflowDefinitions.get(definitionId);
    if (!definition) return false;
    
    const deactivatedDefinition = { 
      ...definition, 
      isActive: false 
    };
    
    this.workflowDefinitions.set(definitionId, deactivatedDefinition);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Deactivated workflow definition: ${definition.name}`,
      entityType: 'workflow_definition',
      entityId: definitionId
    });
    
    return true;
  }
  
  // Workflow instance methods
  async createWorkflowInstance(instance: Omit<WorkflowInstance, 'instanceId' | 'createdAt' | 'lastUpdated'>): Promise<WorkflowInstance> {
    const instanceId = `wf_${crypto.randomUUID()}`;
    const timestamp = new Date();
    const workflowInstance: WorkflowInstance = {
      ...instance,
      instanceId,
      createdAt: timestamp,
      lastUpdated: timestamp
    };
    
    this.workflowInstances.set(instanceId, workflowInstance);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Created workflow instance for definition: ${instance.definitionId}`,
      entityType: instance.entityType,
      entityId: instance.entityId
    });
    
    return workflowInstance;
  }
  
  async getWorkflowInstanceById(instanceId: string): Promise<WorkflowInstance | null> {
    const instance = this.workflowInstances.get(instanceId);
    return instance || null;
  }
  
  async getWorkflowInstancesByDefinitionId(definitionId: string): Promise<WorkflowInstance[]> {
    return Array.from(this.workflowInstances.values())
      .filter(instance => instance.definitionId === definitionId);
  }
  
  async getWorkflowInstancesByEntityId(entityId: string, entityType: string): Promise<WorkflowInstance[]> {
    return Array.from(this.workflowInstances.values())
      .filter(instance => instance.entityId === entityId && instance.entityType === entityType);
  }
  
  async getWorkflowInstancesByAssignee(assigneeId: number): Promise<WorkflowInstance[]> {
    return Array.from(this.workflowInstances.values())
      .filter(instance => instance.assigneeId === assigneeId);
  }
  
  async updateWorkflowInstance(instanceId: string, updates: Partial<WorkflowInstance>): Promise<WorkflowInstance | null> {
    const instance = this.workflowInstances.get(instanceId);
    if (!instance) return null;
    
    const timestamp = new Date();
    const updatedInstance = { 
      ...instance, 
      ...updates, 
      lastUpdated: timestamp 
    };
    
    this.workflowInstances.set(instanceId, updatedInstance);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Updated workflow instance: ${instance.instanceId}`,
      entityType: instance.entityType,
      entityId: instance.entityId
    });
    
    return updatedInstance;
  }
  
  // Workflow step history methods
  async createWorkflowStepHistory(stepHistory: Omit<WorkflowStepHistory, 'id' | 'createdAt'>): Promise<WorkflowStepHistory> {
    const id = this.currentWorkflowStepHistoryId++;
    const timestamp = new Date();
    const workflowStepHistory: WorkflowStepHistory = {
      ...stepHistory,
      id,
      createdAt: timestamp
    };
    
    this.workflowStepHistory.set(id, workflowStepHistory);
    
    // Get the workflow instance to reference in the activity log
    const instance = await this.getWorkflowInstanceById(stepHistory.instanceId);
    if (instance) {
      // Create system activity
      await this.createSystemActivity({
        agentId: 1, // Data Management Agent
        activity: `Workflow step transition: ${stepHistory.fromStep} → ${stepHistory.toStep}`,
        entityType: instance.entityType,
        entityId: instance.entityId
      });
    }
    
    return workflowStepHistory;
  }
  
  async getWorkflowStepHistoryByInstanceId(instanceId: string): Promise<WorkflowStepHistory[]> {
    return Array.from(this.workflowStepHistory.values())
      .filter(history => history.instanceId === instanceId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getMCPToolExecutionLogs(limit: number = 100): Promise<MCPToolExecutionLog[]> {
    return Array.from(this.mcpToolExecutionLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // PACS Module methods
  async getAllPacsModules(): Promise<PacsModule[]> {
    // Use the specialized function from pacs-storage.ts
    return fetchAllPacsModules(this.pacsModules);
  }
  
  async upsertPacsModule(insertModule: InsertPacsModule): Promise<PacsModule> {
    // Use the specialized function from pacs-storage.ts
    return upsertPacs(this.pacsModules, this.currentPacsModuleId, insertModule);
  }
  
  async getPacsModuleById(id: number): Promise<PacsModule | undefined> {
    // Use the specialized function from pacs-storage.ts
    return fetchPacsModuleById(this.pacsModules, id);
  }
  
  async getPacsModulesByCategory(): Promise<PacsModule[]> {
    // Use the specialized function from pacs-storage.ts
    return fetchPacsModulesByCategory(this.pacsModules);
  }
  
  async updatePacsModuleSyncStatus(id: number, syncStatus: string, lastSyncTimestamp: Date): Promise<PacsModule | undefined> {
    // Use the specialized function from pacs-storage.ts
    return updatePacsSyncStatus(this.pacsModules, id, syncStatus, lastSyncTimestamp);
  }
  
  // Agent Messages methods
  async createAgentMessage(message: InsertAgentMessage): Promise<AgentMessage> {
    const id = ++this.currentAgentMessageId;
    const timestamp = new Date();
    const newMessage: AgentMessage = {
      ...message,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: message.status || 'pending' // Default status is pending
    };
    
    this.agentMessages.set(id, newMessage);
    return newMessage;
  }

  async getAgentMessageById(id: number): Promise<AgentMessage | undefined> {
    return this.agentMessages.get(id);
  }

  async getAgentMessagesByType(messageType: MessageEventType): Promise<AgentMessage[]> {
    return Array.from(this.agentMessages.values())
      .filter(message => message.messageType === messageType);
  }

  async getAgentMessagesByPriority(priority: MessagePriority): Promise<AgentMessage[]> {
    return Array.from(this.agentMessages.values())
      .filter(message => message.priority === priority);
  }

  async getAgentMessagesBySourceAgent(sourceAgentId: string): Promise<AgentMessage[]> {
    return Array.from(this.agentMessages.values())
      .filter(message => message.senderAgentId === sourceAgentId);
  }

  async getAgentMessagesByTargetAgent(targetAgentId: string): Promise<AgentMessage[]> {
    return Array.from(this.agentMessages.values())
      .filter(message => message.receiverAgentId === targetAgentId);
  }

  async getAgentMessagesByStatus(status: string): Promise<AgentMessage[]> {
    return Array.from(this.agentMessages.values())
      .filter(message => message.status === status);
  }

  async getRecentAgentMessages(limit: number = 100): Promise<AgentMessage[]> {
    return Array.from(this.agentMessages.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async updateAgentMessageStatus(id: number, status: string): Promise<AgentMessage | undefined> {
    const message = this.agentMessages.get(id);
    if (!message) {
      return undefined;
    }
    
    const updatedMessage: AgentMessage = {
      ...message,
      status,
      updatedAt: new Date()
    };
    
    this.agentMessages.set(id, updatedMessage);
    return updatedMessage;
  }

  async getAgentMessagesForEntity(entityType: EntityType, entityId: string): Promise<AgentMessage[]> {
    return Array.from(this.agentMessages.values())
      .filter(message => 
        message.entityType === entityType && 
        message.entityId === entityId
      );
  }
  
  // Property Insight Sharing methods
  async createPropertyInsightShare(insertShare: InsertPropertyInsightShare): Promise<PropertyInsightShare> {
    const id = this.currentPropertyInsightShareId++;
    const timestamp = new Date();
    
    // Create a complete PropertyInsightShare object with defaults for required fields
    const share: PropertyInsightShare = {
      ...insertShare,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
      accessCount: 0,
      // Set defaults for fields that might be undefined but are required by the PropertyInsightShare type
      password: insertShare.password || null,
      format: insertShare.format || "detailed",
      createdBy: insertShare.createdBy || null,
      allowedDomains: insertShare.allowedDomains || null,
      expiresAt: insertShare.expiresAt || null,
      isPublic: insertShare.isPublic ?? true,
      // Handle propertyName and propertyAddress values (null if undefined)
      propertyName: insertShare.propertyName || null,
      propertyAddress: insertShare.propertyAddress || null
    };
    
    this.propertyInsightShares.set(share.shareId, share);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Analysis Agent
      activity: `Created property insight share for property ID: ${share.propertyId}`,
      entityType: 'propertyInsight',
      entityId: share.propertyId
    });
    
    return share;
  }
  
  async getPropertyInsightShareById(shareId: string): Promise<PropertyInsightShare | null> {
    const share = this.propertyInsightShares.get(shareId);
    if (!share) return null;
    
    // Check if share has expired
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return null;
    }
    
    return share;
  }
  
  async getPropertyInsightSharesByPropertyId(propertyId: string): Promise<PropertyInsightShare[]> {
    return Array.from(this.propertyInsightShares.values())
      .filter((share: PropertyInsightShare) => share.propertyId.includes(propertyId))
      .filter((share: PropertyInsightShare) => !share.expiresAt || new Date(share.expiresAt) >= new Date());
  }
  
  async updatePropertyInsightShare(shareId: string, updates: Partial<InsertPropertyInsightShare>): Promise<PropertyInsightShare | null> {
    const share = this.propertyInsightShares.get(shareId);
    if (!share) return null;
    
    const timestamp = new Date();
    const updatedShare: PropertyInsightShare = {
      ...share,
      ...updates as any, // Type assertion to handle accessCount update
      updatedAt: timestamp
    };
    
    this.propertyInsightShares.set(shareId, updatedShare);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Analysis Agent
      activity: `Updated property insight share for property ID: ${share.propertyId}`,
      entityType: 'propertyInsight',
      entityId: share.propertyId
    });
    
    return updatedShare;
  }
  
  async getAllPropertyInsightShares(): Promise<PropertyInsightShare[]> {
    return Array.from(this.propertyInsightShares.values())
      .filter((share: PropertyInsightShare) => !share.expiresAt || new Date(share.expiresAt) >= new Date());
  }
  
  async deletePropertyInsightShare(shareId: string): Promise<boolean> {
    const share = this.propertyInsightShares.get(shareId);
    if (!share) return false;
    
    this.propertyInsightShares.delete(shareId);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Analysis Agent
      activity: `Deleted property insight share for property ID: ${share.propertyId}`,
      entityType: 'propertyInsight',
      entityId: share.propertyId
    });
    
    return true;
  }
  
  // Comparable Sales methods
  async createComparableSale(insertComparableSale: InsertComparableSale): Promise<ComparableSale> {
    const id = this.currentComparableSaleId++;
    const timestamp = new Date();
    
    const comparableSale: ComparableSale = {
      ...insertComparableSale,
      id,
      createdAt: timestamp,
      lastUpdated: timestamp,
      // Ensure required fields are properly set
      status: insertComparableSale.status || "active",
      // Ensure optional fields are properly set
      saleDate: insertComparableSale.saleDate || null,
      salePrice: insertComparableSale.salePrice || null,
      adjustedPrice: insertComparableSale.adjustedPrice || null,
      distanceInMiles: insertComparableSale.distanceInMiles || null,
      similarityScore: insertComparableSale.similarityScore || null,
      adjustmentFactors: insertComparableSale.adjustmentFactors || null,
      notes: insertComparableSale.notes || null
    };
    
    this.comparableSales.set(id, comparableSale);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Property Analysis Agent
      activity: `Added comparable sale for property ID: ${comparableSale.propertyId}`,
      entityType: 'comparableSale',
      entityId: comparableSale.propertyId
    });
    
    return comparableSale;
  }
  
  async getComparableSaleById(id: number): Promise<ComparableSale | undefined> {
    return this.comparableSales.get(id);
  }
  
  async getComparableSalesByPropertyId(propertyId: string): Promise<ComparableSale[]> {
    return Array.from(this.comparableSales.values())
      .filter(sale => sale.propertyId === propertyId);
  }
  
  async getComparableSalesByStatus(status: string): Promise<ComparableSale[]> {
    return Array.from(this.comparableSales.values())
      .filter(sale => sale.status === status);
  }
  
  async getAllComparableSales(): Promise<ComparableSale[]> {
    return Array.from(this.comparableSales.values());
  }
  
  async updateComparableSale(id: number, updates: Partial<InsertComparableSale>): Promise<ComparableSale | undefined> {
    const comparableSale = this.comparableSales.get(id);
    if (!comparableSale) return undefined;
    
    const timestamp = new Date();
    const updatedSale = {
      ...comparableSale,
      ...updates,
      lastUpdated: timestamp
    };
    
    this.comparableSales.set(id, updatedSale);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Property Analysis Agent
      activity: `Updated comparable sale for property ID: ${comparableSale.propertyId}`,
      entityType: 'comparableSale',
      entityId: comparableSale.propertyId
    });
    
    return updatedSale;
  }
  
  async deleteComparableSale(id: number): Promise<boolean> {
    if (!this.comparableSales.has(id)) {
      return false;
    }
    
    const comparableSale = this.comparableSales.get(id);
    this.comparableSales.delete(id);
    
    // Create system activity
    if (comparableSale) {
      await this.createSystemActivity({
        agentId: 2, // Property Analysis Agent
        activity: `Deleted comparable sale for property ID: ${comparableSale.propertyId}`,
        entityType: 'comparableSale',
        entityId: comparableSale.propertyId
      });
    }
    
    return true;
  }
  
  // Comparable Sales Analysis methods
  async createComparableSalesAnalysis(insertAnalysis: InsertComparableSalesAnalysis): Promise<ComparableSalesAnalysis> {
    const analysisId = insertAnalysis.analysisId;
    const timestamp = new Date();
    
    const analysis: ComparableSalesAnalysis = {
      ...insertAnalysis,
      id: this.currentPropertyInsightShareId++, // Reuse counter for simplicity
      createdAt: timestamp,
      lastUpdated: timestamp,
      // Ensure required fields are properly set
      status: insertAnalysis.status || "draft",
      methodology: insertAnalysis.methodology || "direct_comparison",
      // Ensure optional fields are properly set
      description: insertAnalysis.description || null,
      valueConclusion: insertAnalysis.valueConclusion || null,
      adjustmentNotes: insertAnalysis.adjustmentNotes || null,
      marketConditions: insertAnalysis.marketConditions || null,
      reviewedBy: insertAnalysis.reviewedBy || null,
      reviewNotes: insertAnalysis.reviewNotes || null,
      reviewDate: insertAnalysis.reviewDate || null
    };
    
    this.comparableSalesAnalyses.set(analysisId, analysis);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Property Analysis Agent
      activity: `Created comparable sales analysis: ${analysis.title}`,
      entityType: 'comparableSalesAnalysis',
      entityId: analysis.propertyId
    });
    
    return analysis;
  }
  
  async getComparableSalesAnalysisById(analysisId: string): Promise<ComparableSalesAnalysis | undefined> {
    return this.comparableSalesAnalyses.get(analysisId);
  }
  
  async getComparableSalesAnalysesByPropertyId(propertyId: string): Promise<ComparableSalesAnalysis[]> {
    return Array.from(this.comparableSalesAnalyses.values())
      .filter(analysis => analysis.propertyId === propertyId);
  }
  
  async getAllComparableSalesAnalyses(): Promise<ComparableSalesAnalysis[]> {
    return Array.from(this.comparableSalesAnalyses.values());
  }
  
  async updateComparableSalesAnalysis(analysisId: string, updates: Partial<InsertComparableSalesAnalysis>): Promise<ComparableSalesAnalysis | undefined> {
    const analysis = this.comparableSalesAnalyses.get(analysisId);
    if (!analysis) return undefined;
    
    const timestamp = new Date();
    const updatedAnalysis = {
      ...analysis,
      ...updates,
      lastUpdated: timestamp
    };
    
    this.comparableSalesAnalyses.set(analysisId, updatedAnalysis);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Property Analysis Agent
      activity: `Updated comparable sales analysis: ${analysis.title}`,
      entityType: 'comparableSalesAnalysis',
      entityId: analysis.propertyId
    });
    
    return updatedAnalysis;
  }
  
  async deleteComparableSalesAnalysis(analysisId: string): Promise<boolean> {
    if (!this.comparableSalesAnalyses.has(analysisId)) {
      return false;
    }
    
    const analysis = this.comparableSalesAnalyses.get(analysisId);
    this.comparableSalesAnalyses.delete(analysisId);
    
    // Create system activity
    if (analysis) {
      await this.createSystemActivity({
        agentId: 2, // Property Analysis Agent
        activity: `Deleted comparable sales analysis: ${analysis.title}`,
        entityType: 'comparableSalesAnalysis',
        entityId: analysis.propertyId
      });
    }
    
    return true;
  }
  
  // Comparable Analysis Entry methods
  async createComparableAnalysisEntry(insertEntry: InsertComparableAnalysisEntry): Promise<ComparableAnalysisEntry> {
    const id = this.currentComparableAnalysisEntryId++;
    const timestamp = new Date();
    
    const entry: ComparableAnalysisEntry = {
      ...insertEntry,
      id,
      createdAt: timestamp,
      // Ensure required fields are properly set
      includeInFinalValue: insertEntry.includeInFinalValue !== undefined ? insertEntry.includeInFinalValue : true,
      weight: insertEntry.weight || "1",
      // Ensure optional fields are properly set
      adjustedValue: insertEntry.adjustedValue || null,
      notes: insertEntry.notes || null
    };
    
    this.comparableAnalysisEntries.set(id, entry);
    
    // No system activity for entries as they're detailed components
    
    return entry;
  }
  
  async getComparableAnalysisEntriesByAnalysisId(analysisId: string): Promise<ComparableAnalysisEntry[]> {
    return Array.from(this.comparableAnalysisEntries.values())
      .filter(entry => entry.analysisId === analysisId);
  }
  
  async getComparableAnalysisEntryById(id: number): Promise<ComparableAnalysisEntry | undefined> {
    return this.comparableAnalysisEntries.get(id);
  }
  
  async updateComparableAnalysisEntry(id: number, updates: Partial<InsertComparableAnalysisEntry>): Promise<ComparableAnalysisEntry | undefined> {
    const entry = this.comparableAnalysisEntries.get(id);
    if (!entry) return undefined;
    
    const updatedEntry = {
      ...entry,
      ...updates
    };
    
    this.comparableAnalysisEntries.set(id, updatedEntry);
    
    // No system activity for entries as they're detailed components
    
    return updatedEntry;
  }
  
  async deleteComparableAnalysisEntry(id: number): Promise<boolean> {
    if (!this.comparableAnalysisEntries.has(id)) {
      return false;
    }
    
    this.comparableAnalysisEntries.delete(id);
    return true;
  }
  
  // Seed initial data
  // Property Data Staging methods
  async createStagedProperty(property: InsertStagedProperty): Promise<StagedProperty> {
    const timestamp = new Date();
    const stagedProperty: StagedProperty = {
      ...property,
      id: 1, // This will be auto-incrementing in the database
      createdAt: timestamp,
      updatedAt: timestamp,
      status: property.status || 'pending',
      source: property.source,
      stagingId: property.stagingId,
      propertyData: property.propertyData,
      validationErrors: property.validationErrors || null
    };
    
    this.stagedProperties.set(property.stagingId, stagedProperty);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Staged new property with ID: ${property.stagingId}`,
      entityType: 'stagedProperty',
      entityId: property.stagingId
    });
    
    return stagedProperty;
  }
  
  async getAllStagedProperties(): Promise<StagedProperty[]> {
    return Array.from(this.stagedProperties.values());
  }
  
  async getStagedPropertyById(stagingId: string): Promise<StagedProperty | null> {
    const stagedProperty = this.stagedProperties.get(stagingId);
    return stagedProperty || null;
  }
  
  async updateStagedProperty(stagingId: string, updates: Partial<StagedProperty>): Promise<StagedProperty | null> {
    const stagedProperty = this.stagedProperties.get(stagingId);
    if (!stagedProperty) return null;
    
    const timestamp = new Date();
    const updatedStagedProperty = {
      ...stagedProperty,
      ...updates,
      updatedAt: timestamp
    };
    
    this.stagedProperties.set(stagingId, updatedStagedProperty);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Updated staged property with ID: ${stagingId}`,
      entityType: 'stagedProperty',
      entityId: stagingId
    });
    
    return updatedStagedProperty;
  }
  
  async deleteStagedProperty(stagingId: string): Promise<boolean> {
    const exists = this.stagedProperties.has(stagingId);
    if (!exists) return false;
    
    this.stagedProperties.delete(stagingId);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 1, // Data Management Agent
      activity: `Deleted staged property with ID: ${stagingId}`,
      entityType: 'stagedProperty',
      entityId: stagingId
    });
    
    return true;
  }
  
  // Market and Economic Data methods
  async getMarketTrends(region: string): Promise<MarketTrend[]> {
    // Log the access to market trends
    await this.createSystemActivity({
      agentId: 5, // Market Analysis Agent
      activity: `Retrieved market trends for region: ${region}`,
      entityType: 'marketTrends',
      entityId: region
    });
    
    // Determine most likely zip code for this region
    const zipCode = region.includes('Benton') ? '97330' : 
                    region.includes('Portland') ? '97201' : 
                    region.includes('Salem') ? '97301' : '97330';
    
    // Return market trends for the region
    return [
      {
        metric: 'median_price',
        timeframe: '1_year',
        value: 450000,
        trend: 'increasing',
        confidence: 0.85
      },
      {
        metric: 'days_on_market',
        timeframe: '3_months',
        value: 12,
        trend: 'decreasing',
        confidence: 0.78
      },
      {
        metric: 'price_per_sqft',
        timeframe: '6_months',
        value: 275,
        trend: 'stable',
        confidence: 0.92
      },
      {
        metric: 'inventory_level',
        timeframe: '1_month',
        value: 1.8,
        trend: 'decreasing',
        confidence: 0.88
      }
    ];
  }

  async getEconomicIndicators(region: string): Promise<EconomicIndicator[]> {
    // Log access to economic indicators
    await this.createSystemActivity({
      agentId: 5, // Market Analysis Agent
      activity: `Retrieved economic indicators for region: ${region}`,
      entityType: 'economicIndicators',
      entityId: region
    });
    
    // Return economic indicators for the region
    return [
      {
        name: 'interest_rate',
        value: 6.25,
        impact: 'negative',
        significance: 0.9
      },
      {
        name: 'unemployment_rate',
        value: 3.8,
        impact: 'positive',
        significance: 0.75
      },
      {
        name: 'local_gdp_growth',
        value: 2.7,
        impact: 'positive',
        significance: 0.82
      },
      {
        name: 'construction_permits',
        value: 1250,
        impact: 'negative',
        significance: 0.69
      },
      {
        name: 'population_growth',
        value: 1.5,
        impact: 'positive',
        significance: 0.85
      }
    ];
  }

  async findComparableProperties(propertyId: string, count: number): Promise<Property[]> {
    // Get the target property
    const targetProperty = await this.getPropertyByPropertyId(propertyId);
    if (!targetProperty) {
      return [];
    }
    
    // Get all properties
    const allProperties = await this.getAllProperties();
    
    // Remove the target property from the list
    const otherProperties = allProperties.filter(p => p.propertyId !== propertyId);
    
    // Get property type for filtering
    const propertyType = targetProperty.propertyType;
    
    // Get improvements for the target property
    const targetImprovements = await this.getImprovementsByPropertyId(propertyId);
    
    // Extract key metrics for comparison
    const targetMetrics = {
      propertyType: propertyType,
      squareFeet: targetImprovements.length > 0 ? targetImprovements[0].squareFeet : null,
      bedrooms: targetImprovements.length > 0 ? targetImprovements[0].bedrooms : null,
      bathrooms: targetImprovements.length > 0 ? targetImprovements[0].bathrooms : null
    };
    
    // Create a scoring function for properties based on similarity
    const scoreProperty = async (property: Property) => {
      const improvements = await this.getImprovementsByPropertyId(property.propertyId);
      
      // Basic score starts with property type match
      let score = property.propertyType === targetMetrics.propertyType ? 100 : 0;
      
      // If we have improvements to compare
      if (improvements.length > 0 && targetImprovements.length > 0) {
        const imp = improvements[0];
        
        // Square footage similarity (within 20% = good)
        if (imp.squareFeet && targetMetrics.squareFeet) {
          const sqftDiff = Math.abs(Number(imp.squareFeet) - Number(targetMetrics.squareFeet));
          const sqftRatio = sqftDiff / Number(targetMetrics.squareFeet);
          score += (1 - Math.min(sqftRatio, 1)) * 50; // Max 50 points for size
        }
        
        // Bedroom match
        if (imp.bedrooms && targetMetrics.bedrooms) {
          const bedroomDiff = Math.abs(Number(imp.bedrooms) - Number(targetMetrics.bedrooms));
          score += bedroomDiff === 0 ? 25 : bedroomDiff === 1 ? 15 : 0;
        }
        
        // Bathroom match
        if (imp.bathrooms && targetMetrics.bathrooms) {
          const bathroomDiff = Math.abs(Number(imp.bathrooms) - Number(targetMetrics.bathrooms));
          score += bathroomDiff === 0 ? 25 : bathroomDiff === 1 ? 15 : 0;
        }
      }
      
      return { property, score };
    };
    
    // Score all properties
    const scoredProperties = await Promise.all(otherProperties.map(scoreProperty));
    
    // Sort by score and take the top 'count'
    const comparables = scoredProperties
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.property);
    
    // Log the comparable search
    await this.createSystemActivity({
      agentId: 5, // Market Analysis Agent
      activity: `Found ${comparables.length} comparable properties for: ${propertyId}`,
      entityType: 'propertyComparables',
      entityId: propertyId
    });
    
    return comparables;
  }

  async getPropertyHistory(propertyId: string): Promise<any> {
    // Log the history access
    await this.createSystemActivity({
      agentId: 5, // Market Analysis Agent
      activity: `Retrieved property history for: ${propertyId}`,
      entityType: 'propertyHistory',
      entityId: propertyId
    });
    
    // Get the property
    const property = await this.getPropertyByPropertyId(propertyId);
    if (!property) {
      return { history: [] };
    }
    
    const currentYear = new Date().getFullYear();
    
    // Generate a simulated history of valuations and significant events
    const valueChanges = [];
    let baseValue = property.value ? Number(property.value) * 0.8 : 300000; // Start 20% lower or default
    
    // Generate 10 years of history or less if property is newer
    for (let year = currentYear - 10; year <= currentYear; year++) {
      // Apply a random adjustment between -2% and +8% each year
      const yearlyChange = baseValue * (Math.random() * 0.1 - 0.02);
      baseValue += yearlyChange;
      
      valueChanges.push({
        year: year,
        value: Math.round(baseValue),
        percentChange: Math.round((yearlyChange / (baseValue - yearlyChange)) * 100 * 10) / 10,
        assessmentType: 'Annual Valuation'
      });
    }
    
    // Add some significant property events
    const events = [
      {
        date: `${currentYear - 8}-06-15`,
        type: 'Sale',
        description: `Property sold for $${Math.round(valueChanges[2].value).toLocaleString()}`
      },
      {
        date: `${currentYear - 6}-03-22`,
        type: 'Improvement',
        description: 'Major kitchen renovation completed'
      },
      {
        date: `${currentYear - 4}-09-05`,
        type: 'Appeal',
        description: 'Valuation appealed by owner - No change'
      },
      {
        date: `${currentYear - 2}-05-30`,
        type: 'Zoning',
        description: 'Area rezoned to allow mixed-use development'
      }
    ];
    
    return {
      propertyId: propertyId,
      address: property.address,
      valueHistory: valueChanges,
      events: events
    };
  }

  async getRegionalHistoricalData(region: string): Promise<any> {
    // Log the access to regional data
    await this.createSystemActivity({
      agentId: 5, // Market Analysis Agent
      activity: `Retrieved regional historical data for: ${region}`,
      entityType: 'regionalData',
      entityId: region
    });
    
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 10;
    
    // Generate baseline median values depending on region
    let baselineMedianValue = region.includes('Benton') ? 350000 : 
                             region.includes('Portland') ? 450000 : 
                             region.includes('Salem') ? 325000 : 
                             region.includes('Eugene') ? 375000 : 400000;
    
    // Generate annual median values with realistic growth patterns
    const annualMedianValues = [];
    const annualGrowthRates = [];
    let priorValue = baselineMedianValue * 0.7; // Start 30% lower 10 years ago
    
    for (let year = startYear; year <= currentYear; year++) {
      // Growth rate pattern with recession in 2020 and recovery thereafter
      let growthRate;
      if (year === 2020) {
        growthRate = -0.03; // 3% decline in 2020
      } else if (year === 2021) {
        growthRate = 0.08; // Strong recovery
      } else if (year === 2022) {
        growthRate = 0.12; // Very strong growth
      } else if (year === 2023) {
        growthRate = 0.09; // Sustained strong growth
      } else if (year === 2024) {
        growthRate = 0.05; // Moderation
      } else if (year === 2025) {
        growthRate = 0.03; // Further moderation
      } else {
        growthRate = 0.04 + (Math.random() * 0.03 - 0.01); // Random 3-6% growth
      }
      
      const newValue = priorValue * (1 + growthRate);
      annualMedianValues.push({
        year: year,
        value: Math.round(newValue)
      });
      
      annualGrowthRates.push({
        year: year,
        rate: Math.round(growthRate * 1000) / 10 // Convert to percentage with one decimal
      });
      
      priorValue = newValue;
    }
    
    // Generate inventory data
    const inventoryLevels = [];
    for (let year = startYear; year <= currentYear; year++) {
      // Inventory typically declines in hot markets and increases in slow ones
      // 2020-2022 had very low inventory
      let inventoryMonths;
      if (year >= 2020 && year <= 2022) {
        inventoryMonths = 1.0 + (Math.random() * 0.5);
      } else if (year >= 2023) {
        inventoryMonths = 2.0 + (Math.random() * 0.8);
      } else {
        inventoryMonths = 3.5 + (Math.random() * 1.5);
      }
      
      inventoryLevels.push({
        year: year,
        months: Math.round(inventoryMonths * 10) / 10
      });
    }
    
    // Generate population data
    const populationData = [];
    let population = region.includes('Benton') ? 95000 : 
                    region.includes('Portland') ? 650000 : 
                    region.includes('Salem') ? 175000 : 
                    region.includes('Eugene') ? 170000 : 120000;
    
    for (let year = startYear; year <= currentYear; year++) {
      // Population growth is typically 1-2% annually
      const growthRate = 0.01 + (Math.random() * 0.01);
      population = Math.round(population * (1 + growthRate));
      
      populationData.push({
        year: year,
        population: population,
        growthRate: Math.round(growthRate * 1000) / 10
      });
    }
    
    return {
      region: region,
      period: `${startYear}-${currentYear}`,
      medianValues: annualMedianValues,
      growthRates: annualGrowthRates,
      inventory: inventoryLevels,
      population: populationData
    };
  }
  
  // Regulatory and Risk Data methods
  async getRegulatoryFramework(region: string): Promise<RegulatoryFramework> {
    // Log the access
    await this.createSystemActivity({
      agentId: 5, // Market Analysis Agent
      activity: `Retrieved regulatory framework for: ${region}`,
      entityType: 'regulatoryFramework',
      entityId: region
    });
    
    return {
      region: region,
      zoningRegulations: [
        {
          code: "R-1",
          name: "Single Family Residential",
          description: "Low-density residential zoning for single-family dwellings",
          maxDensity: "6 units per acre",
          heightLimit: "35 feet",
          setbacks: {
            front: "20 feet",
            side: "5 feet",
            rear: "15 feet"
          }
        },
        {
          code: "R-2",
          name: "Medium Density Residential",
          description: "Medium-density residential zoning allowing duplexes and townhomes",
          maxDensity: "12 units per acre",
          heightLimit: "35 feet",
          setbacks: {
            front: "15 feet",
            side: "5 feet",
            rear: "10 feet"
          }
        },
        {
          code: "C-1",
          name: "Neighborhood Commercial",
          description: "Small-scale commercial uses serving neighborhood needs",
          maxDensity: "N/A",
          heightLimit: "35 feet",
          setbacks: {
            front: "10 feet",
            side: "10 feet if adjacent to residential",
            rear: "10 feet if adjacent to residential"
          }
        }
      ],
      buildingCodes: [
        {
          code: "IBC 2021",
          name: "International Building Code 2021",
          adoption: "January 1, 2023",
          scope: "All commercial construction"
        },
        {
          code: "IRC 2021",
          name: "International Residential Code 2021",
          adoption: "January 1, 2023",
          scope: "All residential construction"
        },
        {
          code: "IECC 2021",
          name: "International Energy Conservation Code 2021",
          adoption: "January 1, 2023",
          scope: "Energy efficiency standards for all construction"
        }
      ],
      environmentalRegulations: [
        {
          code: "ESA-OV",
          name: "Environmentally Sensitive Areas Overlay",
          description: "Regulations protecting wetlands, streams, and habitats",
          requirements: "Buffer zones, mitigation for impacts, special permits"
        },
        {
          code: "FP-OV",
          name: "Floodplain Overlay",
          description: "Regulations for development in FEMA designated floodplains",
          requirements: "Elevated structures, floodproofing, special permits"
        },
        {
          code: "ESI",
          name: "Environmental Site Investigation",
          description: "Requirements for sites with potential contamination",
          requirements: "Phase I/II Environmental Assessments, remediation plans"
        }
      ],
      taxPolicies: [
        {
          name: "Property Tax Limitation",
          description: "Annual increases in assessed value limited to 3% for existing properties",
          implementation: "1997",
          exceptions: "New construction, major improvements, property use changes"
        },
        {
          name: "Veterans' Exemption",
          description: "Partial property tax exemption for qualifying veterans",
          amount: "$4,000 - $8,000 depending on disability status",
          application: "Annual filing required"
        },
        {
          name: "Senior Deferral Program",
          description: "Tax deferral for qualifying seniors",
          eligibility: "Age 62+, income limits apply",
          application: "Annual filing required"
        }
      ],
      lastUpdated: new Date()
    };
  }

  async getHistoricalRegulatoryChanges(region: string): Promise<any[]> {
    // Log the access
    await this.createSystemActivity({
      agentId: 5, // Market Analysis Agent
      activity: `Retrieved historical regulatory changes for: ${region}`,
      entityType: 'regulatoryChanges',
      entityId: region
    });
    
    const currentYear = new Date().getFullYear();
    
    return [
      {
        date: `${currentYear - 10}-05-15`,
        category: "Zoning",
        description: "Comprehensive Plan Update - Increased density in transit corridors",
        impact: "Positive impact on multi-family and mixed-use property values",
        marketEffect: "High"
      },
      {
        date: `${currentYear - 8}-07-01`,
        category: "Building Code",
        description: "Adoption of 2015 International Building Code",
        impact: "Increased construction costs for new development",
        marketEffect: "Medium"
      },
      {
        date: `${currentYear - 6}-01-15`,
        category: "Environmental",
        description: "Expanded Wetland Protection Ordinance - Added buffer requirements",
        impact: "Reduced developable land area in certain zones",
        marketEffect: "Medium-High"
      },
      {
        date: `${currentYear - 5}-03-22`,
        category: "Tax Policy",
        description: "School bond measure passed - Property tax rate increase of $1.20 per $1,000",
        impact: "Increased carrying costs for property owners",
        marketEffect: "Low-Medium"
      },
      {
        date: `${currentYear - 3}-09-10`,
        category: "Zoning",
        description: "Accessory Dwelling Unit (ADU) ordinance - Reduced restrictions",
        impact: "Increased property utilization options in residential zones",
        marketEffect: "Medium"
      },
      {
        date: `${currentYear - 2}-11-05`,
        category: "Environmental",
        description: "Updated Flood Insurance Rate Maps (FIRM) - Expanded floodplain areas",
        impact: "Increased insurance costs and building requirements in affected areas",
        marketEffect: "High"
      },
      {
        date: `${currentYear - 1}-04-01`,
        category: "Building Code",
        description: "Adoption of 2021 International Energy Conservation Code",
        impact: "Increased construction costs for energy efficiency compliance",
        marketEffect: "Medium"
      },
      {
        date: `${currentYear}-01-15`,
        category: "Zoning",
        description: "Mixed-Use Overlay District expanded to additional commercial corridors",
        impact: "Increased development potential for affected commercial properties",
        marketEffect: "High"
      }
    ];
  }

  async getEnvironmentalRisks(propertyId: string): Promise<any> {
    // Get the property
    const property = await this.getPropertyByPropertyId(propertyId);
    if (!property) {
      return { risks: [] };
    }
    
    // Log the access
    await this.createSystemActivity({
      agentId: 6, // Risk Assessment Agent
      activity: `Retrieved environmental risks for property: ${propertyId}`,
      entityType: 'environmentalRisks',
      entityId: propertyId
    });
    
    // Use property ID to determine some pseudo-random but consistent risks
    const propertyIdNum = parseInt(propertyId.replace(/\D/g, '')) || 0;
    
    // Flood risk - based on last digit
    const floodRiskLevel = propertyIdNum % 10 <= 2 ? 'High' : 
                          propertyIdNum % 10 <= 5 ? 'Medium' : 'Low';
                          
    // Wildfire risk - based on second-to-last digit
    const wildfireRiskLevel = Math.floor((propertyIdNum % 100) / 10) <= 2 ? 'High' : 
                             Math.floor((propertyIdNum % 100) / 10) <= 5 ? 'Medium' : 'Low';
                             
    // Earthquake risk - based on third-to-last digit
    const earthquakeRiskLevel = Math.floor((propertyIdNum % 1000) / 100) <= 2 ? 'High' : 
                               Math.floor((propertyIdNum % 1000) / 100) <= 5 ? 'Medium' : 'Low';
    
    return {
      propertyId: propertyId,
      address: property.address,
      risks: [
        {
          type: "Flood",
          level: floodRiskLevel,
          description: floodRiskLevel === 'High' ? 
                      "Property is located in or near FEMA designated 100-year floodplain" : 
                      floodRiskLevel === 'Medium' ? 
                      "Property is located in or near FEMA designated 500-year floodplain" : 
                      "Property is not located in a designated floodplain",
          mitigationOptions: floodRiskLevel !== 'Low' ? [
            "Elevate structure above base flood elevation",
            "Install flood vents in foundation",
            "Implement proper site grading and drainage",
            "Consider flood insurance even if not in mandatory purchase area"
          ] : [],
          insuranceConsiderations: floodRiskLevel !== 'Low' ? "Flood insurance recommended or required" : "Standard coverage typically sufficient"
        },
        {
          type: "Wildfire",
          level: wildfireRiskLevel,
          description: wildfireRiskLevel === 'High' ? 
                      "Property is located in a Wildland-Urban Interface (WUI) high-risk zone" : 
                      wildfireRiskLevel === 'Medium' ? 
                      "Property is located near areas with elevated wildfire potential" : 
                      "Property is in an area with low historical wildfire activity",
          mitigationOptions: wildfireRiskLevel !== 'Low' ? [
            "Create defensible space around structures",
            "Use fire-resistant building materials",
            "Implement ember-resistant venting",
            "Maintain and manage vegetation"
          ] : [],
          insuranceConsiderations: wildfireRiskLevel === 'High' ? "Specialized coverage likely required, high premiums" : 
                                  wildfireRiskLevel === 'Medium' ? "Standard coverage with wildfire endorsement recommended" : 
                                  "Standard coverage typically sufficient"
        },
        {
          type: "Earthquake",
          level: earthquakeRiskLevel,
          description: earthquakeRiskLevel === 'High' ? 
                      "Property is located in an area with significant seismic activity potential" : 
                      earthquakeRiskLevel === 'Medium' ? 
                      "Property is located in an area with moderate seismic risk" : 
                      "Property is in an area with low seismic activity potential",
          mitigationOptions: earthquakeRiskLevel !== 'Low' ? [
            "Structural retrofitting",
            "Foundation bolting and bracing",
            "Flexible utility connections",
            "Secure heavy furniture and appliances"
          ] : [],
          insuranceConsiderations: earthquakeRiskLevel !== 'Low' ? "Separate earthquake insurance policy recommended" : "Optional earthquake endorsement may be considered"
        }
      ],
      environmentalHazards: [
        {
          type: "Soil Contamination",
          probability: propertyIdNum % 7 === 0 ? "Medium" : "Low",
          description: "Historical land use in the area included some industrial activity"
        },
        {
          type: "Radon",
          probability: propertyIdNum % 5 === 0 ? "Medium" : "Low",
          description: "Area has known radon potential based on geological characteristics"
        }
      ],
      assessmentDate: new Date(),
      recommendations: [
        "Conduct professional environmental site assessment for detailed analysis",
        "Review FEMA flood maps and consider elevation certificate if in flood zone",
        "Implement appropriate risk mitigation measures based on identified risks",
        "Review insurance coverage to ensure adequate protection against identified hazards"
      ]
    };
  }
  
  private seedData() {
    // Seed an admin user
    this.createUser({
      username: 'admin',
      password: 'admin123', // In a real app, this would be hashed
      name: 'John Davis',
      role: 'administrator',
      email: 'admin@example.com'
    });
    
    // Seed AI Agents
    const agentNames = [
      'Data Management Agent',
      'Property Valuation Agent',
      'Citizen Interaction Agent',
      'Quality Control & Audit Agent',
      'Legal & Compliance Agent',
      'Integration & Reporting Agent'
    ];
    
    agentNames.forEach((name, index) => {
      const id = this.currentAiAgentId++;
      const performance = 85 + Math.floor(Math.random() * 15); // 85-99
      const agent: AiAgent = {
        id,
        name,
        type: name.split(' ')[0].toLowerCase(),
        status: index === 5 ? 'syncing' : 'active', // Make the last one "syncing"
        lastActivity: new Date(),
        performance,
        createdAt: new Date()
      };
      this.aiAgents.set(id, agent);
    });
    
    // Seed Properties - Benton County Washington
    const propertyData = [
      {
        propertyId: 'BC001',
        address: '1320 N Louisiana St, Kennewick',
        parcelNumber: '1-1289-100-0008-000',
        propertyType: 'Residential',
        acres: '0.23',
        value: '325000',
        status: 'active'
      },
      {
        propertyId: 'BC002',
        address: '8524 W Gage Blvd, Kennewick',
        parcelNumber: '1-1789-202-0553-001',
        propertyType: 'Commercial',
        acres: '1.5',
        value: '1750000',
        status: 'active'
      },
      {
        propertyId: 'BC003',
        address: '4050 Keene Rd, West Richland',
        parcelNumber: '1-0589-404-0032-000',
        propertyType: 'Residential',
        acres: '0.95',
        value: '485000',
        status: 'active'
      },
      {
        propertyId: 'BC004',
        address: '710 George Washington Way, Richland',
        parcelNumber: '1-3289-101-0982-000',
        propertyType: 'Commercial',
        acres: '1.2',
        value: '1250000',
        status: 'active'
      },
      {
        propertyId: 'BC005',
        address: '620 Market St, Prosser',
        parcelNumber: '1-1389-103-0022-001',
        propertyType: 'Government',
        acres: '2.7',
        value: '0', // Exempt - County Courthouse
        status: 'exempt'
      },
      {
        propertyId: 'BC006',
        address: '1390 9th St, Benton City',
        parcelNumber: '1-2465-300-0043-000',
        propertyType: 'Residential',
        acres: '0.35',
        value: '285000',
        status: 'active'
      }
    ];
    
    propertyData.forEach(propData => {
      this.createProperty(propData);
    });
    
    // Seed sample appeals data
    const appealData = [
      {
        propertyId: 'BC001',
        userId: 1,
        appealNumber: 'A2023-001',
        reason: 'Incorrect square footage',
        details: 'The property assessment lists 2,400 sq ft, but the actual size is 2,150 sq ft',
        status: 'under_review',
        appealType: 'valuation',
        evidenceUrls: null,
        requestedValue: '298000',
        assessmentYear: '2023',
        dateReceived: new Date('2023-08-15'),
        hearingDate: new Date('2023-09-20'),
        decision: null,
        decisionReason: null,
        decisionDate: null,
        assignedTo: 2,
        notificationSent: false
      },
      {
        propertyId: 'BC002',
        userId: 1,
        appealNumber: 'A2023-002',
        reason: 'Comparable properties are valued lower',
        details: 'Similar commercial properties in the area are assessed at $150-175 per sq ft, but this property is assessed at $225 per sq ft',
        status: 'scheduled',
        appealType: 'valuation',
        evidenceUrls: null,
        requestedValue: '1250000',
        assessmentYear: '2023',
        dateReceived: new Date('2023-08-20'),
        hearingDate: new Date('2023-09-25'),
        decision: null,
        decisionReason: null,
        decisionDate: null,
        assignedTo: 2,
        notificationSent: true
      }
    ];
    
    // Create sample appeals
    appealData.forEach(appeal => {
      this.createAppeal(appeal);
    });

    // Create sample appeal comments
    this.createAppealComment({
      appealId: 1,
      userId: 1,
      comment: 'I have submitted the floor plan documentation as evidence.'
    });
    
    this.createAppealComment({
      appealId: 1,
      userId: 2, // assessor
      comment: 'Thank you for your submission. We will review the floor plan document.'
    });
    
    // Create sample appeal evidence
    this.createAppealEvidence({
      appealId: 1,
      uploadedBy: 1,
      documentType: 'floor_plan',
      fileName: 'floor_plan.pdf',
      fileSize: 1024 * 500, // 500KB
      fileUrl: 'https://example.com/evidence/floor_plan.pdf',
      description: 'Property floor plan showing correct square footage'
    });
    
    // Seed System Activities for Benton County Washington
    const activityData = [
      {
        agentId: 3,
        activity: 'Processed a new appeal for 1320 N Louisiana St, Kennewick',
        entityType: 'appeal',
        entityId: 'BC001'
      },
      {
        agentId: 1,
        activity: 'Imported 156 new records from PACS:Land Benton County',
        entityType: 'import',
        entityId: 'PACS:Land'
      },
      {
        agentId: 2,
        activity: 'Completed batch recalculation for Kennewick Commercial District',
        entityType: 'valuation',
        entityId: 'KCD1'
      },
      {
        agentId: 4,
        activity: 'Flagged anomaly in valuation for 8524 W Gage Blvd, Kennewick',
        entityType: 'property',
        entityId: 'BC002'
      },
      {
        agentId: 2,
        activity: 'Updated property records for West Richland residential zone',
        entityType: 'property',
        entityId: 'BC003'
      },
      {
        agentId: 1,
        activity: 'New agricultural exemption processed for Benton City property',
        entityType: 'exemption',
        entityId: 'BC006'
      },
      {
        agentId: 5,
        activity: 'Verified compliance with Washington State assessment guidelines',
        entityType: 'compliance',
        entityId: 'WACG-2023'
      },
      {
        agentId: null,
        activity: 'Scheduled automated backup of Benton County database',
        entityType: 'system',
        entityId: 'backup'
      }
    ];
    
    // Create activities with different timestamps
    let timeOffset = 0;
    activityData.forEach(activity => {
      const timestamp = new Date();
      timestamp.setMinutes(timestamp.getMinutes() - timeOffset);
      timeOffset += 15; // Each activity is 15 minutes apart
      
      const id = this.currentSystemActivityId++;
      const systemActivity: SystemActivity = {
        ...activity,
        id,
        timestamp
      };
      
      this.systemActivities.set(id, systemActivity);
    });
  }
}

// Create a PostgreSQL implementation of the storage interface
export class PgStorage implements IStorage {
  private pool: pg.Pool;
  private db: any;
  // We need a reference to these in-memory maps for the PACS methods
  private pacsModules: Map<number, PacsModule>;
  private currentPacsModuleId: number;

  constructor() {
    this.pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.db = drizzle(this.pool, { schema: { 
      users, properties, landRecords, improvements, fields, 
      appeals, appealComments, appealEvidence, auditLogs,
      aiAgents, systemActivities, mcpToolExecutionLogs, pacsModules, propertyInsightShares,
      comparableSales, comparableSalesAnalyses, comparableAnalysisEntries,
      importStaging
    }});
    
    // Initialize in-memory maps for PACS methods
    this.pacsModules = new Map();
    this.currentPacsModuleId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const results = await this.db.select().from(users).where(eq(users.id, id));
    return results[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await this.db.select().from(users).where(eq(users.username, username));
    return results[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const results = await this.db.insert(users).values(insertUser).returning();
    return results[0];
  }

  // Property methods
  async getAllProperties(): Promise<Property[]> {
    return await this.db.select().from(properties);
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const results = await this.db.select().from(properties).where(eq(properties.id, id));
    return results[0];
  }

  async getPropertyByPropertyId(propertyId: string): Promise<Property | undefined> {
    const results = await this.db.select().from(properties).where(eq(properties.propertyId, propertyId));
    return results[0];
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const results = await this.db.insert(properties).values(insertProperty).returning();
    return results[0];
  }

  async updateProperty(id: number, updateData: Partial<InsertProperty>): Promise<Property | undefined> {
    const results = await this.db.update(properties).set(updateData).where(eq(properties.id, id)).returning();
    return results[0];
  }

  // Land Record methods
  async getLandRecordsByPropertyId(propertyId: string): Promise<LandRecord[]> {
    return await this.db.select().from(landRecords).where(eq(landRecords.propertyId, propertyId));
  }

  async createLandRecord(insertLandRecord: InsertLandRecord): Promise<LandRecord> {
    const results = await this.db.insert(landRecords).values(insertLandRecord).returning();
    return results[0];
  }

  // Improvement methods
  async getImprovementsByPropertyId(propertyId: string): Promise<Improvement[]> {
    return await this.db.select().from(improvements).where(eq(improvements.propertyId, propertyId));
  }

  async createImprovement(insertImprovement: InsertImprovement): Promise<Improvement> {
    const results = await this.db.insert(improvements).values(insertImprovement).returning();
    return results[0];
  }

  // Field methods
  async getFieldsByPropertyId(propertyId: string): Promise<Field[]> {
    return await this.db.select().from(fields).where(eq(fields.propertyId, propertyId));
  }

  async createField(insertField: InsertField): Promise<Field> {
    const results = await this.db.insert(fields).values(insertField).returning();
    return results[0];
  }

  async getField(id: number): Promise<Field | undefined> {
    const results = await this.db.select().from(fields).where(eq(fields.id, id));
    return results[0];
  }

  async updateField(id: number, updateData: Partial<InsertField>): Promise<Field | undefined> {
    const results = await this.db.update(fields).set(updateData).where(eq(fields.id, id)).returning();
    return results[0];
  }

  // Appeals Management methods
  async getAppealsByPropertyId(propertyId: string): Promise<Appeal[]> {
    return await this.db.select().from(appeals).where(eq(appeals.propertyId, propertyId));
  }

  async getAppealsByUserId(userId: number): Promise<Appeal[]> {
    return await this.db.select().from(appeals).where(eq(appeals.userId, userId));
  }

  async createAppeal(insertAppeal: InsertAppeal): Promise<Appeal> {
    const results = await this.db.insert(appeals).values(insertAppeal).returning();
    return results[0];
  }

  async updateAppealStatus(id: number, status: string): Promise<Appeal | undefined> {
    const results = await this.db.update(appeals).set({ status }).where(eq(appeals.id, id)).returning();
    return results[0];
  }
  
  async updateAppeal(id: number, updates: Partial<Appeal>): Promise<Appeal | undefined> {
    const results = await this.db.update(appeals).set({ 
      ...updates,
      lastUpdated: new Date()
    }).where(eq(appeals.id, id)).returning();
    return results[0];
  }

  async getAppealCommentsByAppealId(appealId: number): Promise<AppealComment[]> {
    return await this.db.select().from(appealComments).where(eq(appealComments.appealId, appealId));
  }

  async createAppealComment(insertComment: InsertAppealComment): Promise<AppealComment> {
    const results = await this.db.insert(appealComments).values(insertComment).returning();
    return results[0];
  }

  async getAppealEvidenceByAppealId(appealId: number): Promise<AppealEvidence[]> {
    return await this.db.select().from(appealEvidence).where(eq(appealEvidence.appealId, appealId));
  }

  async createAppealEvidence(insertEvidence: InsertAppealEvidence): Promise<AppealEvidence> {
    const results = await this.db.insert(appealEvidence).values(insertEvidence).returning();
    return results[0];
  }

  // Audit Log methods
  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const results = await this.db.insert(auditLogs).values(insertAuditLog).returning();
    return results[0];
  }

  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    const query = this.db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
    if (limit) {
      query.limit(limit);
    }
    return await query;
  }

  // AI Agent methods
  async getAllAiAgents(): Promise<AiAgent[]> {
    return await this.db.select().from(aiAgents);
  }

  async updateAiAgentStatus(id: number, status: string, performance: number): Promise<AiAgent | undefined> {
    const results = await this.db.update(aiAgents)
      .set({ status, performance, lastActivity: new Date() })
      .where(eq(aiAgents.id, id))
      .returning();
    return results[0];
  }

  // System Activity methods
  async getSystemActivities(limit?: number): Promise<SystemActivity[]> {
    const query = this.db.select().from(systemActivities).orderBy(desc(systemActivities.timestamp));
    if (limit) {
      query.limit(limit);
    }
    return await query;
  }

  async createSystemActivity(insertActivity: InsertSystemActivity): Promise<SystemActivity> {
    const results = await this.db.insert(systemActivities).values(insertActivity).returning();
    return results[0];
  }

  // PACS Module methods
  async getAllPacsModules(): Promise<PacsModule[]> {
    const results = await this.db.select().from(pacsModules);
    return results;
  }

  async upsertPacsModule(module: InsertPacsModule): Promise<PacsModule> {
    // Check if module exists
    const existing = await this.db.select()
      .from(pacsModules)
      .where(eq(pacsModules.moduleName, module.moduleName));
    
    if (existing.length > 0) {
      // Update
      const results = await this.db.update(pacsModules)
        .set({
          source: module.source,
          integration: module.integration,
          description: module.description,
          category: module.category,
          apiEndpoints: module.apiEndpoints,
          dataSchema: module.dataSchema,
          syncStatus: module.syncStatus
        })
        .where(eq(pacsModules.id, existing[0].id))
        .returning();
      return results[0];
    } else {
      // Insert
      const results = await this.db.insert(pacsModules)
        .values(module)
        .returning();
      return results[0];
    }
  }

  async getPacsModuleById(id: number): Promise<PacsModule | undefined> {
    const results = await this.db.select()
      .from(pacsModules)
      .where(eq(pacsModules.id, id));
    return results[0];
  }

  async getPacsModulesByCategory(): Promise<PacsModule[]> {
    return await this.db.select().from(pacsModules)
      .orderBy(pacsModules.category);
  }

  async updatePacsModuleSyncStatus(id: number, syncStatus: string, lastSyncTimestamp: Date): Promise<PacsModule | undefined> {
    const results = await this.db.update(pacsModules)
      .set({ 
        syncStatus: syncStatus, 
        lastSyncTimestamp: lastSyncTimestamp 
      })
      .where(eq(pacsModules.id, id))
      .returning();
    return results[0];
  }
  
  // Property Insight Sharing methods
  async createPropertyInsightShare(insertShare: InsertPropertyInsightShare): Promise<PropertyInsightShare> {
    const results = await this.db.insert(propertyInsightShares).values(insertShare).returning();
    return results[0];
  }
  
  async getAllPropertyInsightShares(): Promise<PropertyInsightShare[]> {
    const results = await this.db.select().from(propertyInsightShares);
    
    // Filter out expired shares
    return results.filter((share: any) => {
      // Explicitly cast the share to PropertyInsightShare
      const typedShare = share as PropertyInsightShare;
      return !typedShare.expiresAt || new Date(typedShare.expiresAt) >= new Date();
    });
  }
  
  async getPropertyInsightShareById(shareId: string): Promise<PropertyInsightShare | null> {
    const results = await this.db.select().from(propertyInsightShares).where(eq(propertyInsightShares.shareId, shareId));
    if (results.length === 0) return null;
    
    // Check if share has expired
    if (results[0].expiresAt && new Date(results[0].expiresAt) < new Date()) {
      return null;
    }
    
    return results[0];
  }
  
  async getPropertyInsightSharesByPropertyId(propertyId: string): Promise<PropertyInsightShare[]> {
    const results = await this.db.select().from(propertyInsightShares)
      .where(eq(propertyInsightShares.propertyId, propertyId));
    
    // Filter out expired shares
    return results.filter((share: any) => {
      // Explicitly cast the share to PropertyInsightShare
      const typedShare = share as PropertyInsightShare;
      return !typedShare.expiresAt || new Date(typedShare.expiresAt) >= new Date();
    });
  }
  
  async updatePropertyInsightShare(shareId: string, updates: Partial<InsertPropertyInsightShare> | any): Promise<PropertyInsightShare | null> {
    // The 'any' type is used here to handle the accessCount field which is not part of InsertPropertyInsightShare
    
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: new Date()
    };
    
    const results = await this.db.update(propertyInsightShares)
      .set(updatesWithTimestamp as any) // Type assertion to allow accessCount update
      .where(eq(propertyInsightShares.shareId, shareId))
      .returning();
      
    if (results.length === 0) return null;
    return results[0];
  }
  
  async deletePropertyInsightShare(shareId: string): Promise<boolean> {
    const results = await this.db.delete(propertyInsightShares)
      .where(eq(propertyInsightShares.shareId, shareId))
      .returning();
      
    return results.length > 0;
  }
  
  // Property Data Staging methods
  async createStagedProperty(property: InsertStagedProperty): Promise<StagedProperty> {
    const results = await this.db.insert(importStaging).values(property).returning();
    return results[0];
  }
  
  async getAllStagedProperties(): Promise<StagedProperty[]> {
    return await this.db.select().from(importStaging);
  }
  
  async getStagedPropertyById(stagingId: string): Promise<StagedProperty | null> {
    const results = await this.db.select().from(importStaging)
      .where(eq(importStaging.stagingId, stagingId));
    return results.length > 0 ? results[0] : null;
  }
  
  async updateStagedProperty(stagingId: string, updates: Partial<StagedProperty>): Promise<StagedProperty | null> {
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: new Date()
    };
    
    const results = await this.db.update(importStaging)
      .set(updatesWithTimestamp)
      .where(eq(importStaging.stagingId, stagingId))
      .returning();
      
    return results.length > 0 ? results[0] : null;
  }
  
  async deleteStagedProperty(stagingId: string): Promise<boolean> {
    const results = await this.db.delete(importStaging)
      .where(eq(importStaging.stagingId, stagingId))
      .returning();
      
    return results.length > 0;
  }
  
  // MCP Tool Execution Logging methods
  async createMCPToolExecutionLog(log: InsertMCPToolExecutionLog): Promise<MCPToolExecutionLog> {
    const result = await this.db.insert(mcpToolExecutionLogs)
      .values({
        tool_name: log.toolName,
        request_id: log.requestId,
        agent_id: log.agentId,
        user_id: log.userId,
        parameters: log.parameters || {},
        status: log.status,
        result: log.result || null,
        error: log.error || null,
        start_time: log.startTime,
        end_time: log.endTime
      })
      .returning();
      
    return result[0];
  }
  
  async getMCPToolExecutionLogs(limit: number = 100): Promise<MCPToolExecutionLog[]> {
    const results = await this.db.select()
      .from(mcpToolExecutionLogs)
      .orderBy(desc(mcpToolExecutionLogs.createdAt))
      .limit(limit);
      
    return results;
  }
  
  // Validation methods
  async createValidationRule(rule: Omit<ValidationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ValidationRule> {
    const timestamp = new Date();
    const result = await this.db.insert(validationRules).values({
      ...rule,
      createdAt: timestamp,
      updatedAt: timestamp
    }).returning();
    
    return result[0];
  }
  
  async getValidationRuleById(ruleId: string): Promise<ValidationRule | null> {
    const results = await this.db.select()
      .from(validationRules)
      .where(eq(validationRules.id, ruleId));
      
    return results.length > 0 ? results[0] : null;
  }
  
  async getAllValidationRules(options?: { 
    category?: RuleCategory, 
    level?: RuleLevel,
    entityType?: EntityType,
    active?: boolean 
  }): Promise<ValidationRule[]> {
    let query = this.db.select().from(validationRules);
    
    if (options) {
      if (options.category !== undefined) {
        query = query.where(eq(validationRules.category, options.category));
      }
      
      if (options.level !== undefined) {
        query = query.where(eq(validationRules.level, options.level));
      }
      
      if (options.entityType !== undefined) {
        query = query.where(eq(validationRules.entityType, options.entityType));
      }
      
      if (options.active !== undefined) {
        query = query.where(eq(validationRules.isActive, options.active));
      }
    }
    
    return await query;
  }
  
  async getValidationRulesByEntityType(entityType: EntityType): Promise<ValidationRule[]> {
    const results = await this.db.select()
      .from(validationRules)
      .where(eq(validationRules.entityType, entityType));
      
    return results;
  }
  
  async updateValidationRule(ruleId: string, updates: Partial<ValidationRule>): Promise<ValidationRule | null> {
    const timestamp = new Date();
    const updatedData = {
      ...updates,
      updatedAt: timestamp
    };
    
    const results = await this.db.update(validationRules)
      .set(updatedData)
      .where(eq(validationRules.id, ruleId))
      .returning();
      
    return results.length > 0 ? results[0] : null;
  }
  
  async deleteValidationRule(ruleId: string): Promise<boolean> {
    const results = await this.db.delete(validationRules)
      .where(eq(validationRules.id, ruleId))
      .returning();
      
    return results.length > 0;
  }
  
  // Validation issues methods
  async createValidationIssue(issue: Omit<ValidationIssue, 'id' | 'createdAt'>): Promise<ValidationIssue> {
    const timestamp = new Date();
    const results = await this.db.insert(validationIssues).values({
      ...issue,
      createdAt: timestamp
    }).returning();
    
    return results[0];
  }
  
  async getValidationIssueById(issueId: string): Promise<ValidationIssue | null> {
    const results = await this.db.select()
      .from(validationIssues)
      .where(eq(validationIssues.id, issueId));
      
    return results.length > 0 ? results[0] : null;
  }
  
  async getValidationIssues(options?: {
    entityId?: string, 
    entityType?: EntityType,
    ruleId?: string,
    level?: RuleLevel,
    status?: IssueStatus,
    createdAfter?: Date,
    createdBefore?: Date
  }): Promise<ValidationIssue[]> {
    let query = this.db.select().from(validationIssues);
    
    if (options) {
      if (options.entityId !== undefined) {
        query = query.where(eq(validationIssues.entityId, options.entityId));
      }
      
      if (options.entityType !== undefined) {
        query = query.where(eq(validationIssues.entityType, options.entityType));
      }
      
      if (options.ruleId !== undefined) {
        query = query.where(eq(validationIssues.ruleId, options.ruleId));
      }
      
      if (options.level !== undefined) {
        query = query.where(eq(validationIssues.level, options.level));
      }
      
      if (options.status !== undefined) {
        query = query.where(eq(validationIssues.status, options.status));
      }
      
      if (options.createdAfter !== undefined) {
        query = query.where(sql`${validationIssues.createdAt} >= ${options.createdAfter}`);
      }
      
      if (options.createdBefore !== undefined) {
        query = query.where(sql`${validationIssues.createdAt} <= ${options.createdBefore}`);
      }
    }
    
    return await query;
  }
  
  async updateValidationIssue(issueId: string, updates: Partial<ValidationIssue>): Promise<ValidationIssue | null> {
    const results = await this.db.update(validationIssues)
      .set(updates)
      .where(eq(validationIssues.id, issueId))
      .returning();
      
    return results.length > 0 ? results[0] : null;
  }
  
  async resolveValidationIssue(issueId: string, resolution: string, userId?: number): Promise<ValidationIssue | null> {
    const timestamp = new Date();
    const updates = {
      status: 'resolved' as IssueStatus,
      resolution,
      resolvedBy: userId || null,
      resolvedAt: timestamp
    };
    
    const results = await this.db.update(validationIssues)
      .set(updates)
      .where(eq(validationIssues.id, issueId))
      .returning();
      
    return results.length > 0 ? results[0] : null;
  }
  
  async acknowledgeValidationIssue(issueId: string, notes?: string): Promise<ValidationIssue | null> {
    const updates: any = {
      status: 'acknowledged' as IssueStatus
    };
    
    if (notes !== undefined) {
      updates.notes = notes;
    }
    
    const results = await this.db.update(validationIssues)
      .set(updates)
      .where(eq(validationIssues.id, issueId))
      .returning();
      
    return results.length > 0 ? results[0] : null;
  }
  
  async waiveValidationIssue(issueId: string, reason: string, userId?: number): Promise<ValidationIssue | null> {
    const timestamp = new Date();
    const updates = {
      status: 'waived' as IssueStatus,
      waiver: reason,
      waivedBy: userId || null,
      waivedAt: timestamp
    };
    
    const results = await this.db.update(validationIssues)
      .set(updates)
      .where(eq(validationIssues.id, issueId))
      .returning();
      
    return results.length > 0 ? results[0] : null;
  }
  
  // Workflow methods
  async createWorkflowDefinition(definition: Omit<WorkflowDefinition, 'definitionId' | 'createdAt'>): Promise<WorkflowDefinition> {
    const timestamp = new Date();
    const results = await this.db.insert(workflowDefinitions).values({
      ...definition,
      createdAt: timestamp
    }).returning();
    
    return results[0];
  }
  
  async getWorkflowDefinitionById(definitionId: string): Promise<WorkflowDefinition | null> {
    const results = await this.db.select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.definitionId, definitionId));
      
    return results.length > 0 ? results[0] : null;
  }
  
  async getAllWorkflowDefinitions(active?: boolean): Promise<WorkflowDefinition[]> {
    let query = this.db.select().from(workflowDefinitions);
    
    if (active !== undefined) {
      query = query.where(eq(workflowDefinitions.isActive, active));
    }
    
    return await query;
  }
  
  async updateWorkflowDefinition(definitionId: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition | null> {
    const results = await this.db.update(workflowDefinitions)
      .set(updates)
      .where(eq(workflowDefinitions.definitionId, definitionId))
      .returning();
      
    return results.length > 0 ? results[0] : null;
  }
  
  async activateWorkflowDefinition(definitionId: string): Promise<boolean> {
    const results = await this.db.update(workflowDefinitions)
      .set({ isActive: true })
      .where(eq(workflowDefinitions.definitionId, definitionId))
      .returning();
      
    return results.length > 0;
  }
  
  async deactivateWorkflowDefinition(definitionId: string): Promise<boolean> {
    const results = await this.db.update(workflowDefinitions)
      .set({ isActive: false })
      .where(eq(workflowDefinitions.definitionId, definitionId))
      .returning();
      
    return results.length > 0;
  }
  
  // Workflow instance methods
  async createWorkflowInstance(instance: Omit<WorkflowInstance, 'instanceId' | 'createdAt' | 'lastUpdated'>): Promise<WorkflowInstance> {
    const timestamp = new Date();
    const results = await this.db.insert(workflowInstances).values({
      ...instance,
      createdAt: timestamp,
      lastUpdated: timestamp
    }).returning();
    
    return results[0];
  }
  
  async getWorkflowInstanceById(instanceId: string): Promise<WorkflowInstance | null> {
    const results = await this.db.select()
      .from(workflowInstances)
      .where(eq(workflowInstances.instanceId, instanceId));
      
    return results.length > 0 ? results[0] : null;
  }
  
  async getWorkflowInstancesByDefinitionId(definitionId: string): Promise<WorkflowInstance[]> {
    const results = await this.db.select()
      .from(workflowInstances)
      .where(eq(workflowInstances.definitionId, definitionId));
      
    return results;
  }
  
  async getWorkflowInstancesByEntityId(entityId: string, entityType: string): Promise<WorkflowInstance[]> {
    const results = await this.db.select()
      .from(workflowInstances)
      .where(eq(workflowInstances.entityId, entityId))
      .where(eq(workflowInstances.entityType, entityType));
      
    return results;
  }
  
  async getWorkflowInstancesByAssignee(assigneeId: number): Promise<WorkflowInstance[]> {
    const results = await this.db.select()
      .from(workflowInstances)
      .where(eq(workflowInstances.assignedTo, assigneeId));
      
    return results;
  }
  
  async updateWorkflowInstance(instanceId: string, updates: Partial<WorkflowInstance>): Promise<WorkflowInstance | null> {
    const timestamp = new Date();
    const updatedData = {
      ...updates,
      lastUpdated: timestamp
    };
    
    const results = await this.db.update(workflowInstances)
      .set(updatedData)
      .where(eq(workflowInstances.instanceId, instanceId))
      .returning();
      
    return results.length > 0 ? results[0] : null;
  }
  
  // Workflow step history methods
  async createWorkflowStepHistory(stepHistory: Omit<WorkflowStepHistory, 'id' | 'createdAt'>): Promise<WorkflowStepHistory> {
    const timestamp = new Date();
    const results = await this.db.insert(workflowStepHistory).values({
      ...stepHistory,
      createdAt: timestamp
    }).returning();
    
    return results[0];
  }
  
  async getWorkflowStepHistoryByInstanceId(instanceId: string): Promise<WorkflowStepHistory[]> {
    const results = await this.db.select()
      .from(workflowStepHistory)
      .where(eq(workflowStepHistory.instanceId, instanceId))
      .orderBy(workflowStepHistory.createdAt);
      
    return results;
  }

  // Compliance Report methods
  async createComplianceReport(report: InsertComplianceReport): Promise<ComplianceReport> {
    const timestamp = new Date();
    const reportId = report.reportId || `report-${Date.now()}`;
    
    const complianceReport: ComplianceReport = {
      ...report,
      reportId,
      createdAt: timestamp,
      lastUpdated: timestamp,
      status: report.status || 'draft',
      submittedBy: report.submittedBy || null,
      submittedDate: report.submittedDate || null
    };
    
    this.complianceReports.set(reportId, complianceReport);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Compliance Agent
      activity: `Created ${report.reportType} compliance report for ${report.year}`,
      entityType: 'complianceReport',
      entityId: reportId
    });
    
    return complianceReport;
  }
  
  async getComplianceReportById(reportId: string): Promise<ComplianceReport | null> {
    const report = this.complianceReports.get(reportId);
    return report || null;
  }
  
  async getComplianceReportsByYear(year: number): Promise<ComplianceReport[]> {
    return Array.from(this.complianceReports.values())
      .filter(report => report.year === year);
  }
  
  async getComplianceReportsByType(reportType: string): Promise<ComplianceReport[]> {
    return Array.from(this.complianceReports.values())
      .filter(report => report.reportType === reportType);
  }
  
  async updateComplianceReport(reportId: string, updates: Partial<ComplianceReport>): Promise<ComplianceReport | null> {
    const report = this.complianceReports.get(reportId);
    if (!report) return null;
    
    const timestamp = new Date();
    const updatedReport = {
      ...report,
      ...updates,
      lastUpdated: timestamp
    };
    
    this.complianceReports.set(reportId, updatedReport);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Compliance Agent
      activity: `Updated ${report.reportType} compliance report for ${report.year}`,
      entityType: 'complianceReport',
      entityId: reportId
    });
    
    return updatedReport;
  }
  
  async updateComplianceReportStatus(reportId: string, status: string, submittedBy?: number): Promise<ComplianceReport | null> {
    const report = this.complianceReports.get(reportId);
    if (!report) return null;
    
    const timestamp = new Date();
    const updatedReport = {
      ...report,
      status,
      lastUpdated: timestamp
    };
    
    // If status is 'submitted', update submission details
    if (status === 'submitted') {
      updatedReport.submittedBy = submittedBy || null;
      updatedReport.submittedDate = timestamp;
    }
    
    this.complianceReports.set(reportId, updatedReport);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Compliance Agent
      activity: `Updated status to ${status} for ${report.reportType} compliance report (${report.year})`,
      entityType: 'complianceReport',
      entityId: reportId
    });
    
    return updatedReport;
  }
  
  // Washington State Specific Compliance Reports
  async createEqualizationReport(report: any): Promise<any> {
    const timestamp = new Date();
    const reportId = `equalization-${report.year}-${Date.now()}`;
    
    const equalizationReport = {
      ...report,
      reportId,
      createdAt: timestamp,
      lastUpdated: timestamp,
      status: report.status || 'draft',
      reportType: 'equalization',
      submittedBy: report.submittedBy || null,
      submittedDate: report.submittedDate || null
    };
    
    this.equalizationReports.set(reportId, equalizationReport);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Compliance Agent
      activity: `Created Equalization Report for ${report.year}`,
      entityType: 'equalizationReport',
      entityId: reportId
    });
    
    return equalizationReport;
  }
  
  async getEqualizationReportByYear(year: number): Promise<any | undefined> {
    return Array.from(this.equalizationReports.values())
      .find(report => report.year === year);
  }
  
  async createRevaluationCycleReport(report: any): Promise<any> {
    const timestamp = new Date();
    const reportId = `revaluation-${report.year}-${Date.now()}`;
    
    const revaluationReport = {
      ...report,
      reportId,
      createdAt: timestamp,
      lastUpdated: timestamp,
      status: report.status || 'draft',
      reportType: 'revaluation',
      submittedBy: report.submittedBy || null,
      submittedDate: report.submittedDate || null
    };
    
    this.revaluationCycleReports.set(reportId, revaluationReport);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Compliance Agent
      activity: `Created Revaluation Cycle Report for ${report.year}`,
      entityType: 'revaluationReport',
      entityId: reportId
    });
    
    return revaluationReport;
  }
  
  async getRevaluationCycleReportByYear(year: number): Promise<any | undefined> {
    return Array.from(this.revaluationCycleReports.values())
      .find(report => report.year === year);
  }
  
  async createExemptionVerificationReport(report: any): Promise<any> {
    const timestamp = new Date();
    const reportId = `exemption-${report.year}-${Date.now()}`;
    
    const exemptionReport = {
      ...report,
      reportId,
      createdAt: timestamp,
      lastUpdated: timestamp,
      status: report.status || 'draft',
      reportType: 'exemption',
      submittedBy: report.submittedBy || null,
      submittedDate: report.submittedDate || null
    };
    
    this.exemptionVerificationReports.set(reportId, exemptionReport);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Compliance Agent
      activity: `Created Exemption Verification Report for ${report.year}`,
      entityType: 'exemptionReport',
      entityId: reportId
    });
    
    return exemptionReport;
  }
  
  async getExemptionVerificationReportByYear(year: number): Promise<any | undefined> {
    return Array.from(this.exemptionVerificationReports.values())
      .find(report => report.year === year);
  }
  
  async createAppealComplianceReport(report: any): Promise<any> {
    const timestamp = new Date();
    const reportId = `appeal-compliance-${report.year}-${Date.now()}`;
    
    const appealReport = {
      ...report,
      reportId,
      createdAt: timestamp,
      lastUpdated: timestamp,
      status: report.status || 'draft',
      reportType: 'appeal-compliance',
      submittedBy: report.submittedBy || null,
      submittedDate: report.submittedDate || null
    };
    
    this.appealComplianceReports.set(reportId, appealReport);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 2, // Compliance Agent
      activity: `Created Appeal Compliance Report for ${report.year}`,
      entityType: 'appealComplianceReport',
      entityId: reportId
    });
    
    return appealReport;
  }
  
  async getAppealComplianceReportByYear(year: number): Promise<any | undefined> {
    return Array.from(this.appealComplianceReports.values())
      .find(report => report.year === year);
  }
  
  async getAppealsByTaxYear(taxYear: number): Promise<Appeal[]> {
    return Array.from(this.appeals.values())
      .filter(appeal => {
        // Check if the appeal has a tax year field or use the created date's year
        const appealYear = appeal.taxYear || appeal.createdAt.getFullYear();
        return appealYear === taxYear;
      });
  }
  
  async getAllExemptions(taxYear: number): Promise<any[]> {
    // Get all properties with exemptions for the given tax year
    return Array.from(this.properties.values())
      .filter(property => {
        // Check if the property has exemption data
        const hasExemption = property.propertyType === 'exempt' || 
                            (property.extraFields && property.extraFields.exemptionType);
        
        // Check if the exemption is valid for this tax year
        const exemptionYear = property.extraFields?.exemptionYear || 
                             property.lastUpdated.getFullYear();
        
        return hasExemption && exemptionYear === taxYear;
      })
      .map(property => {
        return {
          propertyId: property.propertyId,
          address: property.address,
          exemptionType: property.extraFields?.exemptionType || 'Unknown',
          exemptionAmount: property.extraFields?.exemptionAmount || '0',
          exemptionYear: property.extraFields?.exemptionYear || property.lastUpdated.getFullYear(),
          ownerName: property.ownerName,
          parcelNumber: property.parcelNumber
        };
      });
  }

  // Agent Experiences methods
  async createAgentExperience(experience: InsertAgentExperience): Promise<AgentExperience> {
    const timestamp = new Date();
    const newExperience: AgentExperience = {
      ...experience,
      id: experience.experienceId, // Use the provided experienceId as the id
      createdAt: timestamp,
      usedInTraining: false,
      priority: experience.metadata?.priority || 0,
      lastUpdated: timestamp
    };
    
    this.agentExperiences.set(experience.experienceId, newExperience);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 7, // MCP Coordinator Agent
      activity: `Recorded agent experience from ${experience.agentName}`,
      entityType: experience.metadata?.entityType || 'unknown',
      entityId: experience.metadata?.entityId || experience.experienceId
    });
    
    return newExperience;
  }
  
  async getAgentExperienceById(experienceId: string): Promise<AgentExperience | null> {
    const experience = this.agentExperiences.get(experienceId);
    return experience || null;
  }
  
  async getAgentExperiencesByAgentId(agentId: string): Promise<AgentExperience[]> {
    return Array.from(this.agentExperiences.values())
      .filter(experience => experience.agentId === agentId);
  }
  
  async getAgentExperiencesByEntityType(entityType: string): Promise<AgentExperience[]> {
    return Array.from(this.agentExperiences.values())
      .filter(experience => experience.metadata?.entityType === entityType);
  }
  
  async getAgentExperiencesByPriority(minPriority: number, limit: number = 10): Promise<AgentExperience[]> {
    return Array.from(this.agentExperiences.values())
      .filter(experience => experience.priority >= minPriority)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }
  
  async updateAgentExperiencePriority(experienceId: string, priority: number): Promise<AgentExperience | null> {
    const experience = this.agentExperiences.get(experienceId);
    if (!experience) return null;
    
    const updatedExperience: AgentExperience = {
      ...experience,
      priority,
      lastUpdated: new Date()
    };
    
    this.agentExperiences.set(experienceId, updatedExperience);
    return updatedExperience;
  }
  
  async markAgentExperienceAsUsed(experienceId: string): Promise<AgentExperience | null> {
    const experience = this.agentExperiences.get(experienceId);
    if (!experience) return null;
    
    const updatedExperience: AgentExperience = {
      ...experience,
      usedInTraining: true,
      lastUpdated: new Date()
    };
    
    this.agentExperiences.set(experienceId, updatedExperience);
    return updatedExperience;
  }
  
  // Learning Updates methods
  async createLearningUpdate(update: InsertLearningUpdate): Promise<LearningUpdate> {
    const timestamp = new Date();
    const newUpdate: LearningUpdate = {
      ...update,
      id: update.updateId, // Use the provided updateId as the id
      createdAt: timestamp
    };
    
    this.learningUpdates.set(update.updateId, newUpdate);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 7, // MCP Coordinator Agent
      activity: `Generated learning update of type ${update.updateType}`,
      entityType: 'learning_update',
      entityId: update.updateId
    });
    
    return newUpdate;
  }
  
  async getLearningUpdateById(updateId: string): Promise<LearningUpdate | null> {
    const update = this.learningUpdates.get(updateId);
    return update || null;
  }
  
  async getRecentLearningUpdates(limit: number = 10): Promise<LearningUpdate[]> {
    return Array.from(this.learningUpdates.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async getLearningUpdatesByType(updateType: string): Promise<LearningUpdate[]> {
    return Array.from(this.learningUpdates.values())
      .filter(update => update.updateType === updateType);
  }
  
  // Code Improvement methods
  async createCodeImprovement(improvement: InsertCodeImprovement): Promise<CodeImprovement> {
    const timestamp = new Date();
    const codeImprovement: CodeImprovement = {
      ...improvement,
      createdAt: timestamp,
      updatedAt: timestamp,
      // Convert JSON to proper structure if needed
      affectedFiles: improvement.affectedFiles || [],
      suggestedChanges: improvement.suggestedChanges || []
    };
    
    this.codeImprovements.set(improvement.id, codeImprovement);
    
    // Create system activity for the improvement
    await this.createSystemActivity({
      agentId: typeof improvement.agentId === 'number' ? improvement.agentId : 1,
      activity: `Agent suggested code improvement: ${improvement.title}`,
      entityType: 'codeImprovement',
      entityId: improvement.id
    });
    
    return codeImprovement;
  }
  
  async getCodeImprovements(): Promise<CodeImprovement[]> {
    return Array.from(this.codeImprovements.values());
  }
  
  async getCodeImprovementById(id: string): Promise<CodeImprovement | null> {
    const improvement = this.codeImprovements.get(id);
    return improvement || null;
  }
  
  async getCodeImprovementsByAgent(agentId: string): Promise<CodeImprovement[]> {
    return Array.from(this.codeImprovements.values())
      .filter(improvement => improvement.agentId.toString() === agentId);
  }
  
  async getCodeImprovementsByType(type: ImprovementType): Promise<CodeImprovement[]> {
    return Array.from(this.codeImprovements.values())
      .filter(improvement => improvement.type === type);
  }
  
  async updateCodeImprovementStatus(id: string, status: 'pending' | 'approved' | 'rejected' | 'implemented'): Promise<CodeImprovement | null> {
    const improvement = this.codeImprovements.get(id);
    if (!improvement) return null;
    
    const updated = {
      ...improvement,
      status,
      updatedAt: new Date()
    };
    
    this.codeImprovements.set(id, updated);
    
    // Create system activity for the status update
    await this.createSystemActivity({
      agentId: typeof improvement.agentId === 'number' ? improvement.agentId : 1,
      activity: `Code improvement status updated to ${status}: ${improvement.title}`,
      entityType: 'codeImprovement',
      entityId: improvement.id
    });
    
    return updated;
  }
  
  // Data Lineage methods
  async createDataLineageRecord(record: InsertDataLineageRecord): Promise<DataLineageRecord> {
    const id = this.dataLineageRecords.size + 1;
    const timestamp = new Date();
    
    const newRecord: DataLineageRecord = {
      ...record,
      id,
      createdAt: timestamp
    };
    
    this.dataLineageRecords.set(id, newRecord);
    
    // Create system activity for audit trail
    await this.createSystemActivity({
      activity_type: 'data_change',
      component: 'Data Lineage Tracker',
      status: 'info',
      details: {
        propertyId: record.propertyId,
        fieldName: record.fieldName,
        source: record.source
      }
    });
    
    return newRecord;
  }
  
  async getDataLineageByField(propertyId: string, fieldName: string): Promise<DataLineageRecord[]> {
    return Array.from(this.dataLineageRecords.values())
      .filter(record => record.propertyId === propertyId && record.fieldName === fieldName)
      .sort((a, b) => b.changeTimestamp.getTime() - a.changeTimestamp.getTime());
  }
  
  async getDataLineageByProperty(propertyId: string): Promise<DataLineageRecord[]> {
    return Array.from(this.dataLineageRecords.values())
      .filter(record => record.propertyId === propertyId)
      .sort((a, b) => b.changeTimestamp.getTime() - a.changeTimestamp.getTime());
  }
  
  async getDataLineageByUser(userId: number, limit: number = 100): Promise<DataLineageRecord[]> {
    return Array.from(this.dataLineageRecords.values())
      .filter(record => record.userId === userId)
      .sort((a, b) => b.changeTimestamp.getTime() - a.changeTimestamp.getTime())
      .slice(0, limit);
  }
  
  async getDataLineageByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<DataLineageRecord[]> {
    return Array.from(this.dataLineageRecords.values())
      .filter(record => 
        record.changeTimestamp >= startDate && 
        record.changeTimestamp <= endDate
      )
      .sort((a, b) => b.changeTimestamp.getTime() - a.changeTimestamp.getTime())
      .slice(0, limit);
  }
  
  async getDataLineageBySource(
    source: string,
    limit: number = 100
  ): Promise<DataLineageRecord[]> {
    return Array.from(this.dataLineageRecords.values())
      .filter(record => record.source === source)
      .sort((a, b) => b.changeTimestamp.getTime() - a.changeTimestamp.getTime())
      .slice(0, limit);
  }
}

// Use database storage instead of in-memory
// Choose which storage implementation to use
// For production/default, use PgStorage
// For testing/development when needed, use MemStorage
export const storage = new MemStorage(); // Change to PgStorage once stable

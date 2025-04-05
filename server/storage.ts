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
  pacsModules, PacsModule, InsertPacsModule,
  propertyInsightShares, PropertyInsightShare, InsertPropertyInsightShare,
  comparableSales, ComparableSale, InsertComparableSale,
  comparableSalesAnalyses, ComparableSalesAnalysis, InsertComparableSalesAnalysis,
  comparableAnalysisEntries, ComparableAnalysisEntry, InsertComparableAnalysisEntry,
  importStaging, StagedProperty, InsertStagedProperty
} from "@shared/schema";
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
  
  // PACS Module methods
  getAllPacsModules(): Promise<PacsModule[]>;
  upsertPacsModule(module: InsertPacsModule): Promise<PacsModule>;
  getPacsModuleById(id: number): Promise<PacsModule | undefined>;
  getPacsModulesByCategory(): Promise<PacsModule[]>;
  updatePacsModuleSyncStatus(id: number, syncStatus: string, lastSyncTimestamp: Date): Promise<PacsModule | undefined>;
  
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
  private auditLogs: Map<number, AuditLog>;
  private aiAgents: Map<number, AiAgent>;
  private systemActivities: Map<number, SystemActivity>;
  private pacsModules: Map<number, PacsModule>;
  private propertyInsightShares: Map<string, PropertyInsightShare>;
  private comparableSales: Map<number, ComparableSale>;
  private comparableSalesAnalyses: Map<string, ComparableSalesAnalysis>;
  private comparableAnalysisEntries: Map<number, ComparableAnalysisEntry>;
  private stagedProperties: Map<string, StagedProperty>;
  
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

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.landRecords = new Map();
    this.improvements = new Map();
    this.fields = new Map();
    this.appeals = new Map();
    this.appealComments = new Map();
    this.appealEvidence = new Map();
    this.auditLogs = new Map();
    this.aiAgents = new Map();
    this.systemActivities = new Map();
    this.pacsModules = new Map();
    this.propertyInsightShares = new Map();
    this.comparableSales = new Map();
    this.comparableSalesAnalyses = new Map();
    this.comparableAnalysisEntries = new Map();
    this.stagedProperties = new Map<string, StagedProperty>();
    
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
  
  async updateProperty(id: number, updateData: Partial<InsertProperty>): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;
    
    const timestamp = new Date();
    const updatedProperty = { 
      ...property, 
      ...updateData, 
      lastUpdated: timestamp 
    };
    
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
  
  async updateField(id: number, updateData: Partial<InsertField>): Promise<Field | undefined> {
    const field = this.fields.get(id);
    if (!field) return undefined;
    
    const timestamp = new Date();
    const updatedField = { 
      ...field, 
      ...updateData, 
      lastUpdated: timestamp 
    };
    
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
      aiAgents, systemActivities, pacsModules, propertyInsightShares,
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
}

// Use database storage instead of in-memory
// Choose which storage implementation to use
// For production/default, use PgStorage
// For testing/development when needed, use MemStorage
export const storage = new MemStorage(); // Change to PgStorage once stable

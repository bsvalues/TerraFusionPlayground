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
  pacsModules, PacsModule, InsertPacsModule
} from "@shared/schema";
import pg from 'pg';

// Database row type for PACS modules
interface PacsModuleRow {
  id: number;
  module_name: string;
  source: string;
  integration: string;
  description: string | null;
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
      value: insertProperty.value === undefined ? null : insertProperty.value
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
    // First check if we have any modules in memory
    const memoryModules = Array.from(this.pacsModules.values());
    if (memoryModules.length > 0) {
      return memoryModules;
    }
    
    // If no modules in memory, try to fetch from database
    try {
      // Connect to database using DATABASE_URL
      console.log("Connecting to database with URL:", process.env.DATABASE_URL ? "URL exists" : "URL is missing");
      // Use direct import since we're now importing pg at the top level
      const { Pool } = pg;
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      console.log("Database pool created");
      
      // Query the database
      console.log("Attempting to connect to database...");
      const client = await pool.connect();
      console.log("Database connection established successfully");
      try {
        const result = await client.query('SELECT * FROM pacs_modules ORDER BY module_name');
        
        // Store results in memory for future requests
        for (const row of result.rows) {
          const module: PacsModule = {
            id: row.id,
            moduleName: row.module_name,
            source: row.source,
            integration: row.integration,
            description: row.description,
            createdAt: row.created_at
          };
          this.pacsModules.set(module.id, module);
        }
        
        return result.rows.map((row: PacsModuleRow) => ({
          id: row.id,
          moduleName: row.module_name,
          source: row.source,
          integration: row.integration,
          description: row.description,
          createdAt: row.created_at
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching PACS modules from database:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      return [];
    }
  }
  
  async upsertPacsModule(insertModule: InsertPacsModule): Promise<PacsModule> {
    try {
      // Connect to database using DATABASE_URL
      console.log("Upserting module, connecting to database with URL:", process.env.DATABASE_URL ? "URL exists" : "URL is missing");
      // Use direct import since we're now importing pg at the top level
      const { Pool } = pg;
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      console.log("Database pool created for upsert");
      
      console.log("Attempting to connect to database for upsert...");
      const client = await pool.connect();
      console.log("Database connection established successfully for upsert");
      try {
        // Check if the module exists in the database
        const existingResult = await client.query(
          'SELECT * FROM pacs_modules WHERE module_name = $1',
          [insertModule.moduleName]
        );
        
        let result;
        
        if (existingResult.rows.length > 0) {
          // Update existing module
          const existing = existingResult.rows[0] as PacsModuleRow;
          result = await client.query(
            `UPDATE pacs_modules 
             SET source = $1, integration = $2, description = $3
             WHERE id = $4
             RETURNING *`,
            [
              insertModule.source || existing.source,
              insertModule.integration || existing.integration,
              insertModule.description !== undefined ? insertModule.description : existing.description,
              existing.id
            ]
          );
        } else {
          // Insert new module
          result = await client.query(
            `INSERT INTO pacs_modules (module_name, source, integration, description)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
              insertModule.moduleName,
              insertModule.source || 'PACS WA',
              insertModule.integration || 'pending',
              insertModule.description || null
            ]
          );
        }
        
        if (result.rows.length > 0) {
          const row = result.rows[0] as PacsModuleRow;
          const module: PacsModule = {
            id: row.id,
            moduleName: row.module_name,
            source: row.source,
            integration: row.integration,
            description: row.description,
            createdAt: row.created_at
          };
          
          // Update in-memory cache
          this.pacsModules.set(module.id, module);
          
          return module;
        } else {
          throw new Error('Failed to upsert PACS module');
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error upserting PACS module:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Fall back to in-memory storage if database operation fails
      const existingModule = Array.from(this.pacsModules.values())
        .find(module => module.moduleName === insertModule.moduleName);
      
      if (existingModule) {
        const updatedModule = {
          ...existingModule,
          ...insertModule,
          description: insertModule.description !== undefined ? insertModule.description : existingModule.description
        };
        this.pacsModules.set(existingModule.id, updatedModule);
        return updatedModule;
      } else {
        const id = this.currentPacsModuleId++;
        const timestamp = new Date();
        const module: PacsModule = {
          ...insertModule,
          id,
          createdAt: timestamp,
          description: insertModule.description !== undefined ? insertModule.description : null
        };
        this.pacsModules.set(id, module);
        return module;
      }
    }
  }
  
  // Seed initial data
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

export const storage = new MemStorage();

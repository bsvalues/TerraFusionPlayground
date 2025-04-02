import { 
  users, User, InsertUser, 
  properties, Property, InsertProperty,
  landRecords, LandRecord, InsertLandRecord,
  improvements, Improvement, InsertImprovement,
  fields, Field, InsertField,
  protests, Protest, InsertProtest, 
  auditLogs, AuditLog, InsertAuditLog,
  aiAgents, AiAgent, InsertAiAgent,
  systemActivities, SystemActivity, InsertSystemActivity,
  pacsModules, PacsModule, InsertPacsModule
} from "@shared/schema";

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
  
  // Protest methods
  getProtestsByPropertyId(propertyId: string): Promise<Protest[]>;
  getProtestsByUserId(userId: number): Promise<Protest[]>;
  createProtest(protest: InsertProtest): Promise<Protest>;
  updateProtestStatus(id: number, status: string): Promise<Protest | undefined>;
  
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
  private protests: Map<number, Protest>;
  private auditLogs: Map<number, AuditLog>;
  private aiAgents: Map<number, AiAgent>;
  private systemActivities: Map<number, SystemActivity>;
  private pacsModules: Map<number, PacsModule>;
  
  private currentUserId: number;
  private currentPropertyId: number;
  private currentLandRecordId: number;
  private currentImprovementId: number;
  private currentFieldId: number;
  private currentProtestId: number;
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
    this.protests = new Map();
    this.auditLogs = new Map();
    this.aiAgents = new Map();
    this.systemActivities = new Map();
    this.pacsModules = new Map();
    
    this.currentUserId = 1;
    this.currentPropertyId = 1;
    this.currentLandRecordId = 1;
    this.currentImprovementId = 1;
    this.currentFieldId = 1;
    this.currentProtestId = 1;
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
    const user: User = { ...insertUser, id, createdAt: timestamp };
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
      lastUpdated: timestamp 
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
      lastUpdated: timestamp 
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
      lastUpdated: timestamp 
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
      lastUpdated: timestamp 
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
  
  // Protest methods
  async getProtestsByPropertyId(propertyId: string): Promise<Protest[]> {
    return Array.from(this.protests.values())
      .filter(protest => protest.propertyId === propertyId);
  }
  
  async getProtestsByUserId(userId: number): Promise<Protest[]> {
    return Array.from(this.protests.values())
      .filter(protest => protest.userId === userId);
  }
  
  async createProtest(insertProtest: InsertProtest): Promise<Protest> {
    const id = this.currentProtestId++;
    const timestamp = new Date();
    const protest: Protest = { 
      ...insertProtest, 
      id, 
      createdAt: timestamp, 
      lastUpdated: timestamp 
    };
    this.protests.set(id, protest);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 3, // Citizen Interaction Agent
      activity: `New protest submitted for property ID: ${protest.propertyId}`,
      entityType: 'protest',
      entityId: protest.propertyId
    });
    
    return protest;
  }
  
  async updateProtestStatus(id: number, status: string): Promise<Protest | undefined> {
    const protest = this.protests.get(id);
    if (!protest) return undefined;
    
    const timestamp = new Date();
    const updatedProtest = { 
      ...protest, 
      status, 
      lastUpdated: timestamp 
    };
    
    this.protests.set(id, updatedProtest);
    
    // Create system activity
    await this.createSystemActivity({
      agentId: 3, // Citizen Interaction Agent
      activity: `Protest status updated to ${status} for property ID: ${protest.propertyId}`,
      entityType: 'protest',
      entityId: protest.propertyId
    });
    
    return updatedProtest;
  }
  
  // Audit Log methods
  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const id = this.currentAuditLogId++;
    const timestamp = new Date();
    const auditLog: AuditLog = { 
      ...insertAuditLog, 
      id, 
      timestamp 
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
      timestamp 
    };
    this.systemActivities.set(id, activity);
    return activity;
  }
  
  // PACS Module methods
  async getAllPacsModules(): Promise<PacsModule[]> {
    return Array.from(this.pacsModules.values());
  }
  
  async upsertPacsModule(insertModule: InsertPacsModule): Promise<PacsModule> {
    // Check if module already exists
    const existingModule = Array.from(this.pacsModules.values())
      .find(module => module.moduleName === insertModule.moduleName);
    
    if (existingModule) {
      const updatedModule = {
        ...existingModule,
        ...insertModule
      };
      this.pacsModules.set(existingModule.id, updatedModule);
      return updatedModule;
    } else {
      const id = this.currentPacsModuleId++;
      const timestamp = new Date();
      const module: PacsModule = {
        ...insertModule,
        id,
        createdAt: timestamp
      };
      this.pacsModules.set(id, module);
      return module;
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
        acres: 0.23,
        value: 325000,
        status: 'active'
      },
      {
        propertyId: 'BC002',
        address: '8524 W Gage Blvd, Kennewick',
        parcelNumber: '1-1789-202-0553-001',
        propertyType: 'Commercial',
        acres: 1.5,
        value: 1750000,
        status: 'active'
      },
      {
        propertyId: 'BC003',
        address: '4050 Keene Rd, West Richland',
        parcelNumber: '1-0589-404-0032-000',
        propertyType: 'Residential',
        acres: 0.95,
        value: 485000,
        status: 'active'
      },
      {
        propertyId: 'BC004',
        address: '710 George Washington Way, Richland',
        parcelNumber: '1-3289-101-0982-000',
        propertyType: 'Commercial',
        acres: 1.2,
        value: 1250000,
        status: 'active'
      },
      {
        propertyId: 'BC005',
        address: '620 Market St, Prosser',
        parcelNumber: '1-1389-103-0022-001',
        propertyType: 'Government',
        acres: 2.7,
        value: 0, // Exempt - County Courthouse
        status: 'exempt'
      },
      {
        propertyId: 'BC006',
        address: '1390 9th St, Benton City',
        parcelNumber: '1-2465-300-0043-000',
        propertyType: 'Residential',
        acres: 0.35,
        value: 285000,
        status: 'active'
      }
    ];
    
    propertyData.forEach(propData => {
      this.createProperty(propData);
    });
    
    // Seed System Activities for Benton County Washington
    const activityData = [
      {
        agentId: 3,
        activity: 'Processed a new protest for 1320 N Louisiana St, Kennewick',
        entityType: 'protest',
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

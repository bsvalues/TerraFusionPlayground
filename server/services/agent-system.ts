/**
 * Agent System Manager
 * 
 * This service manages the MCP agent system, handling the registration, initialization,
 * and coordination of all AI agents within the platform.
 */

import { IStorage } from '../storage';
import { MCPService } from './mcp';
import { BaseAgent } from './agents/base-agent';
import { PropertyAssessmentAgent } from './agents/property-assessment-agent';
import { IngestionAgent } from './agents/ingestion-agent';
import { ReportingAgent } from './agents/reporting-agent';
import { PropertyStoryGenerator } from './property-story-generator';
import { FtpService } from './ftp-service';

export class AgentSystem {
  private _storage: IStorage;
  private mcpService: MCPService;
  private agents: Map<string, BaseAgent> = new Map();
  private isInitialized: boolean = false;
  
  constructor(storage: IStorage) {
    this._storage = storage;
    this.mcpService = new MCPService(storage);
  }
  
  /**
   * Get the storage instance used by the agent system
   * This is primarily used for logging operations
   */
  get storage(): IStorage {
    return this._storage;
  }
  
  /**
   * Initialize the agent system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      console.log("Initializing Agent System...");
      
      // Log initialization
      await this.storage.createSystemActivity({
        activity_type: 'agent_system_init',
        component: 'agent_system',
        status: 'info',
        details: {
          timestamp: new Date().toISOString()
        },
        created_at: new Date()
      });
      
      // Create required services
      const propertyStoryGenerator = new PropertyStoryGenerator(this.storage);
      const ftpService = new FtpService();
      
      // Create and register agents
      console.log("Creating Property Assessment Agent...");
      const propertyAssessmentAgent = new PropertyAssessmentAgent(
        this.storage, 
        this.mcpService,
        propertyStoryGenerator
      );
      this.registerAgent('property_assessment', propertyAssessmentAgent);
      
      console.log("Creating Data Ingestion Agent...");
      const ingestionAgent = new IngestionAgent(
        this.storage,
        this.mcpService,
        ftpService
      );
      this.registerAgent('data_ingestion', ingestionAgent);
      
      console.log("Creating Reporting Agent...");
      const reportingAgent = new ReportingAgent(
        this.storage,
        this.mcpService
      );
      this.registerAgent('reporting', reportingAgent);
      
      // Initialize agents
      for (const [name, agent] of this.agents.entries()) {
        try {
          console.log(`Initializing agent: ${name}...`);
          await agent.initialize();
          console.log(`Agent ${name} initialized successfully.`);
        } catch (error) {
          console.error(`Error initializing agent ${name}:`, error);
        }
      }
      
      this.isInitialized = true;
      console.log("Agent System initialized successfully.");
      
      // Log successful initialization
      await this.storage.createSystemActivity({
        activity_type: 'agent_system_ready',
        component: 'agent_system',
        status: 'info',
        details: {
          agentCount: this.agents.size,
          agents: Array.from(this.agents.keys())
        },
        created_at: new Date()
      });
    } catch (error) {
      console.error("Error initializing Agent System:", error);
      
      // Log initialization error
      await this.storage.createSystemActivity({
        activity_type: 'agent_system_error',
        component: 'agent_system',
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : null
        },
        created_at: new Date()
      });
      
      throw error;
    }
  }
  
  /**
   * Register an agent with the system
   */
  public registerAgent(name: string, agent: BaseAgent): void {
    this.agents.set(name, agent);
  }
  
  /**
   * Get an agent by name
   */
  public getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }
  
  /**
   * Start all agents
   */
  public async startAllAgents(): Promise<void> {
    for (const [name, agent] of this.agents.entries()) {
      try {
        console.log(`Starting agent: ${name}...`);
        await agent.start();
        console.log(`Agent ${name} started successfully.`);
      } catch (error) {
        console.error(`Error starting agent ${name}:`, error);
      }
    }
  }
  
  /**
   * Stop all agents
   */
  public async stopAllAgents(): Promise<void> {
    for (const [name, agent] of this.agents.entries()) {
      try {
        console.log(`Stopping agent: ${name}...`);
        await agent.stop();
        console.log(`Agent ${name} stopped successfully.`);
      } catch (error) {
        console.error(`Error stopping agent ${name}:`, error);
      }
    }
  }
  
  /**
   * Execute a capability on an agent
   */
  public async executeCapability(
    agentName: string, 
    capabilityName: string, 
    parameters: any
  ): Promise<any> {
    const agent = this.agents.get(agentName);
    
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found`);
    }
    
    return agent.executeCapability(capabilityName, parameters);
  }
  
  /**
   * Get the status of all agents
   */
  public getSystemStatus(): any {
    const agentStatuses = {};
    
    for (const [name, agent] of this.agents.entries()) {
      agentStatuses[name] = agent.getStatus();
    }
    
    return {
      isInitialized: this.isInitialized,
      agentCount: this.agents.size,
      agents: agentStatuses
    };
  }
}
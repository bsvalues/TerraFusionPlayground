/**
 * GIS Agent Orchestration Service
 * 
 * Coordinates specialized GIS agents through a message-based architecture.
 * Provides routing, monitoring, and management for the GIS agent ecosystem.
 */

import { BaseAgent } from '../agent-framework/base-agent';
import { MCPService } from '../mcp-service/mcp-service';
import { IStorage } from '../../storage';
import { GISSpecialistAgent } from '../agents/gis-specialist-agent';
import { EventEmitter } from 'events';

// Spatial Event types
export enum SpatialEventType {
  GEOMETRY_CREATED = 'spatial.geometry.created',
  GEOMETRY_UPDATED = 'spatial.geometry.updated',
  GEOMETRY_DELETED = 'spatial.geometry.deleted',
  TOPOLOGY_ERROR = 'spatial.topology.error',
  ANALYSIS_COMPLETED = 'spatial.analysis.completed',
  DATA_IMPORTED = 'spatial.data.imported',
  DATA_CONVERTED = 'spatial.data.converted',
}

// Spatial Event interface
export interface SpatialEvent {
  id: string;
  type: SpatialEventType;
  timestamp: Date;
  data: any;
  metadata?: {
    userId?: number;
    source?: string;
    sessionId?: string;
    [key: string]: any;
  };
}

// Agent Task interface
export interface AgentTask {
  id: string;
  agentId: string;
  taskType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';
  data: any;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

/**
 * Message Queue class for agent communication
 */
class MessageQueue {
  private eventEmitter: EventEmitter;
  private storage: IStorage;
  private queuedMessages: Map<string, any[]>;
  
  constructor(storage: IStorage) {
    this.eventEmitter = new EventEmitter();
    this.storage = storage;
    this.queuedMessages = new Map();
    
    // Set max listeners to avoid warning
    this.eventEmitter.setMaxListeners(50);
  }
  
  /**
   * Publish a message to a topic
   */
  async publish(topic: string, message: any): Promise<void> {
    // Store the message for persistence
    try {
      await this.storage.createAgentMessage({
        topic,
        content: message,
        timestamp: new Date(),
        processed: false
      });
    } catch (error) {
      console.error(`Error storing message for topic ${topic}:`, error);
    }
    
    // Emit the event for in-memory subscribers
    this.eventEmitter.emit(topic, message);
    
    // Queue for any subscribers that aren't currently listening
    if (!this.queuedMessages.has(topic)) {
      this.queuedMessages.set(topic, []);
    }
    this.queuedMessages.get(topic)!.push(message);
  }
  
  /**
   * Subscribe to a topic
   */
  subscribe(topic: string, callback: (message: any) => void): () => void {
    // Add the listener
    this.eventEmitter.on(topic, callback);
    
    // Process any queued messages
    if (this.queuedMessages.has(topic)) {
      const queuedMessages = this.queuedMessages.get(topic)!;
      queuedMessages.forEach(message => {
        callback(message);
      });
      this.queuedMessages.set(topic, []);
    }
    
    // Return unsubscribe function
    return () => {
      this.eventEmitter.removeListener(topic, callback);
    };
  }
  
  /**
   * Get unprocessed messages for a topic
   */
  async getUnprocessedMessages(topic: string): Promise<any[]> {
    try {
      const messages = await this.storage.getUnprocessedAgentMessages(topic);
      return messages;
    } catch (error) {
      console.error(`Error getting unprocessed messages for topic ${topic}:`, error);
      return [];
    }
  }
  
  /**
   * Mark a message as processed
   */
  async markAsProcessed(messageId: string): Promise<void> {
    try {
      await this.storage.updateAgentMessage(messageId, { processed: true });
    } catch (error) {
      console.error(`Error marking message ${messageId} as processed:`, error);
    }
  }
}

/**
 * Main GIS Agent Orchestration Service class
 */
export class GISAgentOrchestrationService {
  private storage: IStorage;
  private mcpService: MCPService;
  private messageQueue: MessageQueue;
  private agentRegistry: Map<string, BaseAgent>;
  private activeAgents: Set<string>;
  private activeTasks: Map<string, AgentTask>;
  
  constructor(storage: IStorage, mcpService: MCPService) {
    this.storage = storage;
    this.mcpService = mcpService;
    this.messageQueue = new MessageQueue(storage);
    this.agentRegistry = new Map();
    this.activeAgents = new Set();
    this.activeTasks = new Map();
  }
  
  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('GIS Agent Orchestration Service initializing...');
    
    // Initialize and register core GIS agents
    await this.initializeAgents();
    
    // Set up event subscriptions
    this.setupEventSubscriptions();
    
    // Process any pending messages
    await this.processPendingMessages();
    
    console.log('GIS Agent Orchestration Service initialized');
  }
  
  /**
   * Initialize and register core GIS agents
   */
  private async initializeAgents(): Promise<void> {
    try {
      // Register GIS Specialist Agent
      // Note: the actual implementations of these dependencies would be provided
      const gisDataService = {} as any; // Placeholder
      const gisSpecialistAgent = new GISSpecialistAgent(
        this.storage,
        this.mcpService,
        gisDataService
      );
      await gisSpecialistAgent.initialize();
      this.registerAgent(gisSpecialistAgent);
      
      // Register additional specialist agents here:
      // - DataNormalizationAgent
      // - TopologyRepairAgent
      // - SchemaConversionAgent
      // - FeatureDetectAgent
      // - SpatialRelationshipAgent
      // - ValuationAnalysisAgent
      
      console.log(`Registered ${this.agentRegistry.size} GIS agents`);
    } catch (error) {
      console.error('Error initializing agents:', error);
      throw new Error(`Failed to initialize agents: ${error.message}`);
    }
  }
  
  /**
   * Register an agent with the orchestration service
   */
  private registerAgent(agent: BaseAgent): void {
    const agentId = agent.getId();
    this.agentRegistry.set(agentId, agent);
    this.activeAgents.add(agentId);
    
    console.log(`Registered agent: ${agent.getName()} (${agentId})`);
  }
  
  /**
   * Set up event subscriptions
   */
  private setupEventSubscriptions(): void {
    // Subscribe to spatial events
    this.messageQueue.subscribe(SpatialEventType.GEOMETRY_CREATED, 
      this.handleGeometryCreated.bind(this));
    this.messageQueue.subscribe(SpatialEventType.TOPOLOGY_ERROR, 
      this.handleTopologyError.bind(this));
    this.messageQueue.subscribe(SpatialEventType.DATA_IMPORTED, 
      this.handleDataImported.bind(this));
    
    // Add more subscriptions as needed
  }
  
  /**
   * Process any pending messages from previous sessions
   */
  private async processPendingMessages(): Promise<void> {
    try {
      // Process geometry created messages
      const geometryCreatedMessages = await this.messageQueue.getUnprocessedMessages(
        SpatialEventType.GEOMETRY_CREATED
      );
      for (const message of geometryCreatedMessages) {
        await this.handleGeometryCreated(message);
        await this.messageQueue.markAsProcessed(message.id);
      }
      
      // Process topology error messages
      const topologyErrorMessages = await this.messageQueue.getUnprocessedMessages(
        SpatialEventType.TOPOLOGY_ERROR
      );
      for (const message of topologyErrorMessages) {
        await this.handleTopologyError(message);
        await this.messageQueue.markAsProcessed(message.id);
      }
      
      // Process data imported messages
      const dataImportedMessages = await this.messageQueue.getUnprocessedMessages(
        SpatialEventType.DATA_IMPORTED
      );
      for (const message of dataImportedMessages) {
        await this.handleDataImported(message);
        await this.messageQueue.markAsProcessed(message.id);
      }
      
      console.log('Processed pending messages');
    } catch (error) {
      console.error('Error processing pending messages:', error);
    }
  }
  
  /**
   * Publish a spatial event
   */
  async publishEvent(event: SpatialEvent): Promise<void> {
    try {
      await this.messageQueue.publish(event.type, event);
      console.log(`Published event: ${event.type} (${event.id})`);
    } catch (error) {
      console.error(`Error publishing event ${event.type}:`, error);
      throw new Error(`Failed to publish event: ${error.message}`);
    }
  }
  
  /**
   * Create a new agent task
   */
  async createTask(agentId: string, taskType: string, data: any): Promise<string> {
    try {
      // Check if agent exists
      if (!this.agentRegistry.has(agentId)) {
        throw new Error(`Agent ${agentId} not found`);
      }
      
      // Generate a task ID
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create the task
      const task: AgentTask = {
        id: taskId,
        agentId,
        taskType,
        status: 'pending',
        data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Store the task
      await this.storage.createAgentTask(task);
      
      // Add to active tasks
      this.activeTasks.set(taskId, task);
      
      // Queue the task for processing
      this.processTask(task).catch(error => {
        console.error(`Error processing task ${taskId}:`, error);
        this.updateTaskStatus(taskId, 'failed', { error: error.message });
      });
      
      return taskId;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }
  
  /**
   * Process an agent task
   */
  private async processTask(task: AgentTask): Promise<void> {
    try {
      // Update task status
      await this.updateTaskStatus(task.id, 'processing');
      
      // Get the agent
      const agent = this.agentRegistry.get(task.agentId);
      if (!agent) {
        throw new Error(`Agent ${task.agentId} not found`);
      }
      
      // Process the task
      const result = await agent.processTask(task.taskType, task.data);
      
      // Update task status
      await this.updateTaskStatus(task.id, 'completed', { result });
    } catch (error) {
      console.error(`Error processing task ${task.id}:`, error);
      await this.updateTaskStatus(task.id, 'failed', { error: error.message });
    }
  }
  
  /**
   * Update task status
   */
  private async updateTaskStatus(
    taskId: string,
    status: AgentTask['status'],
    updates: Partial<AgentTask> = {}
  ): Promise<void> {
    try {
      // Update in-memory task
      if (this.activeTasks.has(taskId)) {
        const task = this.activeTasks.get(taskId)!;
        task.status = status;
        task.updatedAt = new Date();
        
        if (status === 'completed' || status === 'failed') {
          task.completedAt = new Date();
        }
        
        if (updates.result) {
          task.result = updates.result;
        }
        
        if (updates.error) {
          task.error = updates.error;
        }
        
        this.activeTasks.set(taskId, task);
      }
      
      // Update in storage
      await this.storage.updateAgentTask(taskId, {
        status,
        updatedAt: new Date(),
        completedAt: (status === 'completed' || status === 'failed') ? new Date() : undefined,
        ...updates
      });
    } catch (error) {
      console.error(`Error updating task ${taskId} status:`, error);
    }
  }
  
  /**
   * Get the status of a task
   */
  async getTaskStatus(taskId: string): Promise<AgentTask | null> {
    try {
      // Check in-memory first
      if (this.activeTasks.has(taskId)) {
        return this.activeTasks.get(taskId)!;
      }
      
      // Otherwise, check in storage
      return await this.storage.getAgentTask(taskId);
    } catch (error) {
      console.error(`Error getting task ${taskId} status:`, error);
      throw new Error(`Failed to get task status: ${error.message}`);
    }
  }
  
  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    try {
      // Only cancel if the task is pending or processing
      const task = await this.getTaskStatus(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      if (task.status === 'pending' || task.status === 'processing') {
        await this.updateTaskStatus(taskId, 'canceled');
      } else {
        throw new Error(`Cannot cancel task with status ${task.status}`);
      }
    } catch (error) {
      console.error(`Error canceling task ${taskId}:`, error);
      throw new Error(`Failed to cancel task: ${error.message}`);
    }
  }
  
  /**
   * Get all active agents
   */
  getActiveAgents(): string[] {
    return Array.from(this.activeAgents);
  }
  
  /**
   * Get agent details
   */
  getAgentDetails(agentId: string): any {
    if (!this.agentRegistry.has(agentId)) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    const agent = this.agentRegistry.get(agentId)!;
    return {
      id: agent.getId(),
      name: agent.getName(),
      type: agent.getType(),
      capabilities: agent.getCapabilities(),
      status: this.activeAgents.has(agentId) ? 'active' : 'inactive'
    };
  }
  
  /**
   * Get all active tasks
   */
  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values());
  }
  
  /* Event Handlers */
  
  /**
   * Handle geometry created event
   */
  private async handleGeometryCreated(event: SpatialEvent): Promise<void> {
    try {
      console.log(`Handling geometry created event: ${event.id}`);
      
      // This would typically dispatch to a feature detection agent
      // For now, just log the event
      
      // In a real implementation, we would:
      // 1. Check what type of geometry was created
      // 2. Determine which agents should process it
      // 3. Create tasks for those agents
      
      // Example: Create a task for the feature detection agent
      if (this.agentRegistry.has('feature-detect')) {
        await this.createTask('feature-detect', 'analyze_geometry', event.data);
      }
    } catch (error) {
      console.error(`Error handling geometry created event ${event.id}:`, error);
    }
  }
  
  /**
   * Handle topology error event
   */
  private async handleTopologyError(event: SpatialEvent): Promise<void> {
    try {
      console.log(`Handling topology error event: ${event.id}`);
      
      // This would typically dispatch to a topology repair agent
      // For now, just log the event
      
      // Example: Create a task for the topology repair agent
      if (this.agentRegistry.has('topology-repair')) {
        await this.createTask('topology-repair', 'fix_topology', event.data);
      }
    } catch (error) {
      console.error(`Error handling topology error event ${event.id}:`, error);
    }
  }
  
  /**
   * Handle data imported event
   */
  private async handleDataImported(event: SpatialEvent): Promise<void> {
    try {
      console.log(`Handling data imported event: ${event.id}`);
      
      // This would typically dispatch to a data normalization agent
      // For now, just log the event
      
      // Example: Create a task for the data normalization agent
      if (this.agentRegistry.has('data-normalization')) {
        await this.createTask('data-normalization', 'normalize_data', event.data);
      }
    } catch (error) {
      console.error(`Error handling data imported event ${event.id}:`, error);
    }
  }
}
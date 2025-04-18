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
import { v4 as uuidv4 } from 'uuid';

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
  userId?: number;
}

// Message type for agent communication
export interface AgentMessage {
  id: string;
  messageType: string;
  subject: string;
  content: any;
  senderAgentId: string;
  receiverAgentId?: string;
  conversationId?: string;
  timestamp: Date;
  status?: string;
  processedAt?: Date;
  processed?: boolean;
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
    // Generate a unique message ID
    const messageId = uuidv4();
    
    // Store the message for persistence
    try {
      await this.storage.createAgentMessage({
        messageId,
        messageType: topic,
        subject: topic,
        content: message,
        senderAgentId: 'system',
        timestamp: new Date()
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
      // Clear the queue after processing
      this.queuedMessages.set(topic, []);
    }
    
    // Return unsubscribe function
    return () => {
      this.eventEmitter.off(topic, callback);
    };
  }
  
  /**
   * Process any pending messages from storage
   */
  async processPendingMessages(topic: string): Promise<void> {
    try {
      const messages = await this.storage.getUnprocessedAgentMessages(topic);
      
      for (const message of messages) {
        // Emit the event
        this.eventEmitter.emit(topic, message.content);
        
        // Mark as processed
        await this.storage.updateAgentMessage(message.id.toString(), {
          processedAt: new Date()
        });
      }
    } catch (error) {
      console.error(`Error processing pending messages for topic ${topic}:`, error);
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
      // For now, we'll use a placeholder for the GIS data service
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
      throw new Error(`Failed to initialize agents: ${(error as Error).message}`);
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
    // Process pending messages for each event type
    for (const eventType of Object.values(SpatialEventType)) {
      await this.messageQueue.processPendingMessages(eventType);
    }
  }
  
  /**
   * Handle geometry created event
   */
  private async handleGeometryCreated(event: SpatialEvent): Promise<void> {
    try {
      console.log(`Handling geometry created event: ${event.id}`);
      
      // Create activity
      await this.storage.createSystemActivity({
        activity_type: 'spatial_event',
        component: 'GIS Orchestration',
        status: 'success',
        details: { 
          eventType: event.type, 
          geometryId: event.data.geometryId 
        }
      });
      
      // Additional handling logic
      // - Assign to appropriate agent based on geometry type
      // - Create follow-up tasks
      
    } catch (error) {
      console.error('Error handling geometry created event:', error);
      
      // Log error
      await this.storage.createSystemActivity({
        activity_type: 'spatial_event_error',
        component: 'GIS Orchestration',
        status: 'error',
        details: { 
          eventType: SpatialEventType.GEOMETRY_CREATED, 
          error: (error as Error).message 
        }
      });
    }
  }
  
  /**
   * Handle topology error event
   */
  private async handleTopologyError(event: SpatialEvent): Promise<void> {
    try {
      console.log(`Handling topology error event: ${event.id}`);
      
      // Find an available topology repair agent
      const topologyAgent = this.findAvailableAgentByType('topology_repair');
      
      if (topologyAgent) {
        // Create a repair task
        const task: AgentTask = {
          id: uuidv4(),
          agentId: topologyAgent.getId(),
          taskType: 'topology_repair',
          status: 'pending',
          data: event.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: event.metadata?.userId
        };
        
        // Submit the task
        await this.submitAgentTask(task);
      } else {
        console.warn('No available topology repair agent found');
        
        // Queue the task for later processing
        // This would involve storing the task and attempting again later
      }
      
    } catch (error) {
      console.error('Error handling topology error event:', error);
      
      // Log error
      await this.storage.createSystemActivity({
        activity_type: 'spatial_event_error',
        component: 'GIS Orchestration',
        status: 'error',
        details: { 
          eventType: SpatialEventType.TOPOLOGY_ERROR, 
          error: (error as Error).message 
        }
      });
    }
  }
  
  /**
   * Handle data imported event
   */
  private async handleDataImported(event: SpatialEvent): Promise<void> {
    try {
      console.log(`Handling data imported event: ${event.id}`);
      
      // Create activity
      await this.storage.createSystemActivity({
        activity_type: 'spatial_event',
        component: 'GIS Orchestration',
        status: 'success',
        details: { 
          eventType: event.type, 
          importId: event.data.importId 
        }
      });
      
      // Additional handling logic
      // - Trigger data quality checks
      // - Trigger spatial indexing
      // - Notify interested agents
      
    } catch (error) {
      console.error('Error handling data imported event:', error);
      
      // Log error
      await this.storage.createSystemActivity({
        activity_type: 'spatial_event_error',
        component: 'GIS Orchestration',
        status: 'error',
        details: { 
          eventType: SpatialEventType.DATA_IMPORTED, 
          error: (error as Error).message 
        }
      });
    }
  }
  
  /**
   * Find an available agent by type
   */
  private findAvailableAgentByType(agentType: string): BaseAgent | undefined {
    for (const [id, agent] of this.agentRegistry.entries()) {
      if (agent.getType() === agentType && agent.getStatus() === 'ready') {
        return agent;
      }
    }
    return undefined;
  }
  
  /**
   * Submit a task to an agent
   */
  private async submitAgentTask(task: AgentTask): Promise<AgentTask> {
    try {
      // Store the task
      const storedTask = await this.storage.createAgentTask({
        ...task,
        // Add userId if not present
        userId: task.userId || 1 // Default to admin user if not specified
      });
      
      // Add to active tasks
      this.activeTasks.set(task.id, storedTask);
      
      // Get the agent
      const agent = this.agentRegistry.get(task.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${task.agentId}`);
      }
      
      // Execute the task asynchronously
      this.executeAgentTask(task).catch(error => {
        console.error(`Error executing task ${task.id}:`, error);
      });
      
      return storedTask;
    } catch (error) {
      console.error('Error submitting agent task:', error);
      throw new Error(`Failed to submit agent task: ${(error as Error).message}`);
    }
  }
  
  /**
   * Execute a task on an agent
   */
  private async executeAgentTask(task: AgentTask): Promise<void> {
    try {
      // Update task status
      await this.storage.updateAgentTask(task.id, {
        status: 'processing',
        updatedAt: new Date()
      });
      
      // Get the agent
      const agent = this.agentRegistry.get(task.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${task.agentId}`);
      }
      
      // Execute the task
      const result = await agent.executeCapability(task.taskType, task.data);
      
      // Update task with result
      await this.storage.updateAgentTask(task.id, {
        status: 'completed',
        result,
        completedAt: new Date(),
        updatedAt: new Date()
      });
      
      // Remove from active tasks
      this.activeTasks.delete(task.id);
      
      // Log completion
      await this.storage.createSystemActivity({
        activity_type: 'agent_task_completed',
        component: 'GIS Orchestration',
        status: 'success',
        details: { 
          taskId: task.id, 
          agentId: task.agentId,
          taskType: task.taskType 
        }
      });
      
    } catch (error) {
      console.error(`Error executing task ${task.id}:`, error);
      
      // Update task with error
      await this.storage.updateAgentTask(task.id, {
        status: 'failed',
        error: (error as Error).message,
        updatedAt: new Date()
      });
      
      // Remove from active tasks
      this.activeTasks.delete(task.id);
      
      // Log failure
      await this.storage.createSystemActivity({
        activity_type: 'agent_task_failed',
        component: 'GIS Orchestration',
        status: 'error',
        details: { 
          taskId: task.id, 
          agentId: task.agentId,
          taskType: task.taskType,
          error: (error as Error).message 
        }
      });
    }
  }
  
  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<AgentTask | null> {
    try {
      // Check active tasks first
      if (this.activeTasks.has(taskId)) {
        return this.activeTasks.get(taskId)!;
      }
      
      // Retrieve from storage
      return await this.storage.getAgentTask(taskId);
    } catch (error) {
      console.error(`Error getting task ${taskId}:`, error);
      throw new Error(`Failed to get task: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get all active agents
   */
  getActiveAgents(): string[] {
    return Array.from(this.activeAgents);
  }
  
  /**
   * Get all active tasks
   */
  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values());
  }
  
  /**
   * Get active tasks for a specific agent
   */
  getActiveTasksForAgent(agentId: string): AgentTask[] {
    return Array.from(this.activeTasks.values())
      .filter(task => task.agentId === agentId);
  }
  
  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    try {
      const task = await this.getTask(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      // Can only cancel pending or processing tasks
      if (task.status !== 'pending' && task.status !== 'processing') {
        return false;
      }
      
      // Update task status
      await this.storage.updateAgentTask(taskId, {
        status: 'canceled',
        updatedAt: new Date()
      });
      
      // Remove from active tasks
      this.activeTasks.delete(taskId);
      
      // Log cancellation
      await this.storage.createSystemActivity({
        activity_type: 'agent_task_canceled',
        component: 'GIS Orchestration',
        status: 'success',
        details: { 
          taskId,
          agentId: task.agentId,
          taskType: task.taskType 
        }
      });
      
      return true;
    } catch (error) {
      console.error(`Error canceling task ${taskId}:`, error);
      throw new Error(`Failed to cancel task: ${(error as Error).message}`);
    }
  }
  
  /**
   * Broadcast an event to all agents
   */
  async broadcastEvent(eventType: SpatialEventType, data: any, metadata?: any): Promise<void> {
    const event: SpatialEvent = {
      id: uuidv4(),
      type: eventType,
      timestamp: new Date(),
      data,
      metadata
    };
    
    await this.messageQueue.publish(eventType, event);
  }
}
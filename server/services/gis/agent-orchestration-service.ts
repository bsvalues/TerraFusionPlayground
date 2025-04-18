/**
 * GIS Agent Orchestration Service
 * 
 * This service is responsible for coordinating GIS agents and their tasks.
 * It handles agent registration, task assignment, and communication between agents.
 */

import { IStorage } from '../../storage';
import { 
  GISAgentTask, 
  InsertGISAgentTask, 
  AgentMessage, 
  InsertAgentMessage,
  SpatialEvent,
  InsertSpatialEvent
} from '@shared/gis-schema';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  ErrorTrackingService, 
  ErrorCategory, 
  ErrorSeverity, 
  ErrorSource 
} from '../error-tracking-service';

// Agent types for GIS operations
export enum GISAgentType {
  DATA_NORMALIZATION = 'DATA_NORMALIZATION',
  TOPOLOGY_REPAIR = 'TOPOLOGY_REPAIR',
  SCHEMA_CONVERSION = 'SCHEMA_CONVERSION',
  FEATURE_DETECTION = 'FEATURE_DETECTION',
  SPATIAL_RELATIONSHIP = 'SPATIAL_RELATIONSHIP',
  VALUATION_ANALYSIS = 'VALUATION_ANALYSIS'
}

// Task types for GIS operations
export enum GISTaskType {
  DATA_CLEANING = 'DATA_CLEANING',
  SCHEMA_VALIDATION = 'SCHEMA_VALIDATION',
  FORMAT_CONVERSION = 'FORMAT_CONVERSION',
  SPATIAL_ANALYSIS = 'SPATIAL_ANALYSIS',
  TOPOLOGY_VERIFICATION = 'TOPOLOGY_VERIFICATION',
  FEATURE_EXTRACTION = 'FEATURE_EXTRACTION',
  VALUATION_CALCULATION = 'VALUATION_CALCULATION'
}

// Task status enum
export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// Interface for GIS agents
export interface IGISAgent {
  id: string;
  type: GISAgentType;
  name: string;
  description: string;
  capabilities: string[];
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  initialize(): Promise<void>;
  processTask(task: GISAgentTask): Promise<any>;
  shutdown(): Promise<void>;
}

// Agent orchestration service class
export class GISAgentOrchestrationService {
  private static instance: GISAgentOrchestrationService;
  private storage: IStorage;
  private errorTrackingService: ErrorTrackingService;
  private agents: Map<string, IGISAgent> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private activeTasks: Map<number, GISAgentTask> = new Map();
  private isInitialized: boolean = false;

  private constructor(storage: IStorage) {
    this.storage = storage;
    this.errorTrackingService = new ErrorTrackingService(storage);
  }

  /**
   * Get the singleton instance of the GIS Agent Orchestration Service
   * @param storage The storage implementation
   * @returns The GIS Agent Orchestration Service instance
   */
  public static getInstance(storage: IStorage): GISAgentOrchestrationService {
    if (!GISAgentOrchestrationService.instance) {
      GISAgentOrchestrationService.instance = new GISAgentOrchestrationService(storage);
    }
    return GISAgentOrchestrationService.instance;
  }

  /**
   * Initialize the GIS Agent Orchestration Service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('Initializing GIS Agent Orchestration Service...');
      
      // Register event listeners
      this.registerEventListeners();
      
      // Initialize active tasks from the database
      await this.loadActiveTasks();
      
      this.isInitialized = true;
      console.log('GIS Agent Orchestration Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize GIS Agent Orchestration Service:', error);
      this.errorTrackingService.trackError(error, {
        category: ErrorCategory.GIS,
        severity: ErrorSeverity.HIGH,
        source: ErrorSource.GIS_SYSTEM,
        details: { component: 'GISAgentOrchestrationService', method: 'initialize' }
      });
      throw error;
    }
  }

  /**
   * Register an agent with the orchestration service
   * @param agent The GIS agent to register
   */
  public registerAgent(agent: IGISAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with ID ${agent.id} is already registered`);
    }

    this.agents.set(agent.id, agent);
    console.log(`Registered GIS agent: ${agent.name} (${agent.id})`);
    
    // Initialize the agent
    agent.initialize().catch(error => {
      console.error(`Failed to initialize agent ${agent.id}:`, error);
      this.errorTrackingService.trackAgentError(error, agent.id, {
        component: 'GISAgentOrchestrationService',
        method: 'registerAgent',
        agentType: agent.type,
        agentName: agent.name
      });
      this.agents.delete(agent.id);
    });

    // Emit agent registered event
    this.eventEmitter.emit('agent:registered', agent);
  }

  /**
   * Unregister an agent from the orchestration service
   * @param agentId The ID of the agent to unregister
   */
  public async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }

    try {
      // Shutdown the agent
      await agent.shutdown();
      
      // Remove from the registered agents
      this.agents.delete(agentId);
      console.log(`Unregistered GIS agent: ${agent.name} (${agentId})`);
      
      // Emit agent unregistered event
      this.eventEmitter.emit('agent:unregistered', agentId);
    } catch (error) {
      console.error(`Failed to unregister agent ${agentId}:`, error);
      this.errorTrackingService.trackAgentError(error, agentId, {
        component: 'GISAgentOrchestrationService',
        method: 'unregisterAgent',
        agentName: agent.name,
        agentType: agent.type
      });
      throw error;
    }
  }

  /**
   * Get all registered agents
   * @returns A list of all registered agents
   */
  public getAgents(): IGISAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get an agent by ID
   * @param agentId The ID of the agent to get
   * @returns The agent with the specified ID, or undefined if not found
   */
  public getAgent(agentId: string): IGISAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Find available agents of a specific type
   * @param agentType The type of agent to find
   * @returns A list of available agents of the specified type
   */
  public findAvailableAgents(agentType: GISAgentType): IGISAgent[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.type === agentType && agent.status === 'AVAILABLE'
    );
  }

  /**
   * Create and assign a new task to an appropriate agent
   * @param task The task to create and assign
   * @returns The created task
   */
  public async createTask(
    taskData: Omit<InsertGISAgentTask, 'id' | 'status' | 'startTime' | 'endTime'>
  ): Promise<GISAgentTask> {
    try {
      // Create the task object - let the database auto-generate the ID
      const newTask: InsertGISAgentTask = {
        ...taskData,
        status: TaskStatus.PENDING,
        startTime: new Date(),
      };
      
      // Store the task in the database
      const task = await this.storage.createGISAgentTask(newTask);
      
      // Emit task created event
      this.eventEmitter.emit('task:created', task);
      
      // Assign the task to an agent
      await this.assignTask(task);
      
      return task;
    } catch (error) {
      console.error('Failed to create task:', error);
      this.errorTrackingService.trackGisError(error, {
        component: 'GISAgentOrchestrationService',
        method: 'createTask',
        taskData
      });
      throw error;
    }
  }

  /**
   * Assign a task to an appropriate agent
   * @param task The task to assign
   */
  private async assignTask(task: GISAgentTask): Promise<void> {
    try {
      // Find available agents of the specified type
      const availableAgents = this.findAvailableAgents(task.agentType as GISAgentType);
      
      if (availableAgents.length === 0) {
        console.warn(`No available agents of type ${task.agentType} for task ${task.id}`);
        return;
      }
      
      // Simple round-robin assignment for now
      // In a production system, this would use more sophisticated load balancing
      const agent = availableAgents[0];
      
      // Update task status - ensure ID is handled as a number
      const updatedTask = await this.storage.updateGISAgentTask(
        typeof task.id === 'number' ? task.id : parseInt(task.id as string), 
        { 
          status: TaskStatus.RUNNING,
          agentId: agent.id
        }
      );
      
      if (!updatedTask) {
        throw new Error(`Failed to update task ${task.id}`);
      }
      
      // Add to active tasks
      this.activeTasks.set(updatedTask.id as unknown as number, updatedTask);
      
      // Set agent status to busy
      agent.status = 'BUSY';
      
      // Process the task asynchronously
      this.processTaskAsync(agent, updatedTask);
      
      // Emit task assigned event
      this.eventEmitter.emit('task:assigned', {
        taskId: updatedTask.id,
        agentId: agent.id
      });
    } catch (error) {
      console.error(`Failed to assign task ${task.id}:`, error);
      
      // Track the error
      this.errorTrackingService.trackGisError(error, {
        component: 'GISAgentOrchestrationService',
        method: 'assignTask',
        taskId: task.id,
        taskType: task.taskType,
        agentType: task.agentType
      });
      
      // Update task status to failed
      await this.storage.updateGISAgentTask(
        typeof task.id === 'number' ? task.id : parseInt(task.id as string),
        { 
          status: TaskStatus.FAILED,
          error: error instanceof Error ? error.message : 'Failed to assign task'
        }
      );
    }
  }

  /**
   * Process a task asynchronously
   * @param agent The agent to process the task
   * @param task The task to process
   */
  private async processTaskAsync(agent: IGISAgent, task: GISAgentTask): Promise<void> {
    try {
      // Process the task
      const result = await agent.processTask(task);
      
      // Update task status
      const updatedTask = await this.storage.updateGISAgentTask(
        typeof task.id === 'number' ? task.id : parseInt(task.id as string), 
        { 
          status: TaskStatus.COMPLETED,
          result,
          endTime: new Date()
        }
      );
      
      if (!updatedTask) {
        throw new Error(`Failed to update task ${task.id}`);
      }
      
      // Remove from active tasks
      this.activeTasks.delete(task.id as unknown as number);
      
      // Set agent status back to available
      agent.status = 'AVAILABLE';
      
      // Emit task completed event
      this.eventEmitter.emit('task:completed', {
        taskId: task.id,
        agentId: agent.id,
        result
      });
    } catch (error) {
      console.error(`Failed to process task ${task.id}:`, error);
      
      // Track the error
      this.errorTrackingService.trackAgentError(error, agent.id, {
        component: 'GISAgentOrchestrationService',
        method: 'processTaskAsync',
        taskId: task.id,
        taskType: task.taskType,
        agentType: agent.type,
        agentName: agent.name
      });
      
      // Update task status to failed
      await this.storage.updateGISAgentTask(
        typeof task.id === 'number' ? task.id : parseInt(task.id as string), 
        { 
          status: TaskStatus.FAILED,
          error: error instanceof Error ? error.message : 'Failed to process task',
          endTime: new Date()
        }
      );
      
      // Remove from active tasks
      this.activeTasks.delete(task.id as unknown as number);
      
      // Set agent status back to available
      agent.status = 'AVAILABLE';
      
      // Emit task failed event
      this.eventEmitter.emit('task:failed', {
        taskId: task.id,
        agentId: agent.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cancel a task
   * @param taskId The ID of the task to cancel
   */
  public async cancelTask(taskId: string): Promise<void> {
    try {
      const numericTaskId = typeof taskId === 'number' ? taskId : parseInt(taskId);
      const task = this.activeTasks.get(numericTaskId);
      
      if (!task) {
        const error = new Error(`Task with ID ${taskId} is not active`);
        this.errorTrackingService.trackGisError(error, {
          component: 'GISAgentOrchestrationService',
          method: 'cancelTask',
          taskId
        });
        throw error;
      }
      
      // Update task status
      const updatedTask = await this.storage.updateGISAgentTask(
        numericTaskId,
        { 
          status: TaskStatus.CANCELLED,
          endTime: new Date()
        }
      );
      
      if (!updatedTask) {
        const error = new Error(`Failed to update task ${taskId}`);
        this.errorTrackingService.trackGisError(error, {
          component: 'GISAgentOrchestrationService',
          method: 'cancelTask',
          taskId,
          taskType: task.taskType,
          agentId: task.agentId
        });
        throw error;
      }
      
      // Remove from active tasks
      this.activeTasks.delete(numericTaskId);
      
      // Set agent status back to available if there is an agent assigned
      if (task.agentId) {
        const agent = this.agents.get(task.agentId);
        if (agent) {
          agent.status = 'AVAILABLE';
        }
      }
      
      // Emit task cancelled event
      this.eventEmitter.emit('task:cancelled', {
        taskId: task.id,
        agentId: task.agentId
      });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('is not active') || error.message.includes('Failed to update task'))) {
        console.error(`Unexpected error cancelling task ${taskId}:`, error);
        this.errorTrackingService.trackGisError(error, {
          component: 'GISAgentOrchestrationService',
          method: 'cancelTask',
          taskId
        });
      }
      throw error;
    }
  }

  /**
   * Get all tasks
   * @param agentId Optional agent ID to filter tasks by
   * @param status Optional status to filter tasks by
   * @returns A list of tasks matching the specified filters
   */
  public async getTasks(agentId?: string, status?: string): Promise<GISAgentTask[]> {
    return await this.storage.getGISAgentTasks(agentId, status);
  }

  /**
   * Get a task by ID
   * @param taskId The ID of the task to get
   * @returns The task with the specified ID, or undefined if not found
   */
  public async getTask(taskId: string): Promise<GISAgentTask | undefined> {
    return await this.storage.getGISAgentTask(taskId as unknown as number);
  }

  /**
   * Create a new agent message
   * @param message The message to create
   * @returns The created message
   */
  public async createMessage(message: InsertAgentMessage): Promise<AgentMessage> {
    return await this.storage.createAgentMessage(message);
  }

  /**
   * Get messages for an agent
   * @param agentId The ID of the agent to get messages for
   * @returns A list of messages for the specified agent
   */
  public async getMessages(agentId: string): Promise<AgentMessage[]> {
    return await this.storage.getAgentMessagesByAgent(agentId);
  }

  /**
   * Create a new spatial event
   * @param event The event to create
   * @returns The created event
   */
  public async createSpatialEvent(event: InsertSpatialEvent): Promise<SpatialEvent> {
    const newEvent = await this.storage.createSpatialEvent(event);
    
    // Emit spatial event created
    this.eventEmitter.emit('spatial:event', newEvent);
    
    return newEvent;
  }

  /**
   * Get spatial events
   * @param layerId Optional layer ID to filter events by
   * @param type Optional type to filter events by
   * @param userId Optional user ID to filter events by
   * @returns A list of events matching the specified filters
   */
  public async getSpatialEvents(
    layerId?: number, 
    type?: string, 
    userId?: number
  ): Promise<SpatialEvent[]> {
    return await this.storage.getSpatialEvents(layerId, type, userId);
  }

  /**
   * Subscribe to an event
   * @param event The event to subscribe to
   * @param callback The callback to invoke when the event occurs
   */
  public subscribe(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param event The event to unsubscribe from
   * @param callback The callback to remove
   */
  public unsubscribe(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.off(event, callback);
  }

  /**
   * Register event listeners
   */
  private registerEventListeners(): void {
    // Task event logging
    this.eventEmitter.on('task:created', (task) => {
      console.log(`Task created: ${task.id} (${task.taskType})`);
    });
    
    this.eventEmitter.on('task:assigned', (data) => {
      console.log(`Task ${data.taskId} assigned to agent ${data.agentId}`);
    });
    
    this.eventEmitter.on('task:completed', (data) => {
      console.log(`Task ${data.taskId} completed by agent ${data.agentId}`);
    });
    
    this.eventEmitter.on('task:failed', (data) => {
      console.log(`Task ${data.taskId} failed by agent ${data.agentId}: ${data.error}`);
    });
    
    this.eventEmitter.on('task:cancelled', (data) => {
      console.log(`Task ${data.taskId} cancelled`);
    });
    
    // Agent event logging
    this.eventEmitter.on('agent:registered', (agent) => {
      console.log(`Agent registered: ${agent.name} (${agent.id})`);
    });
    
    this.eventEmitter.on('agent:unregistered', (agentId) => {
      console.log(`Agent unregistered: ${agentId}`);
    });
    
    // Spatial event logging
    this.eventEmitter.on('spatial:event', (event) => {
      console.log(`Spatial event: ${event.type} on layer ${event.layerId}`);
    });
  }

  /**
   * Load active tasks from the database
   */
  private async loadActiveTasks(): Promise<void> {
    try {
      // Get all running tasks
      const runningTasks = await this.storage.getGISAgentTasks(
        undefined, 
        TaskStatus.RUNNING
      );
      
      // Add to active tasks map
      for (const task of runningTasks) {
        this.activeTasks.set(task.id as unknown as number, task);
      }
      
      console.log(`Loaded ${runningTasks.length} active tasks`);
    } catch (error) {
      console.error('Failed to load active tasks:', error);
      this.errorTrackingService.trackGisError(error, {
        component: 'GISAgentOrchestrationService',
        method: 'loadActiveTasks',
        severity: ErrorSeverity.HIGH
      });
    }
  }
}

// Export the singleton instance getter
export const getGISAgentOrchestrationService = (storage: IStorage): GISAgentOrchestrationService => {
  return GISAgentOrchestrationService.getInstance(storage);
};
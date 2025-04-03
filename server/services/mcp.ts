/**
 * Model Context Protocol (MCP) Service
 * 
 * This service implements the Model Context Protocol which provides a standardized interface
 * for AI models to interact with the application's data and functionality through a secure,
 * controlled environment that enforces permissions, rate limits, and auditability.
 */

import { IStorage } from '../storage';
import { AiAgent, InsertSystemActivity, SystemActivity } from '../../shared/schema';
import { IPacsIntegrationService } from './pacs-integration';

// MCP Tool Definition
export interface MCPTool {
  name: string;
  description: string;
  parameters: any;
  requiresAuth: boolean;
  requiredPermissions: string[];
  handler: (parameters: any, context: MCPExecutionContext) => Promise<any>;
}

// MCP Request Interface
export interface MCPRequest {
  tool: string;
  parameters: any;
  agentId?: number;
}

// MCP Execution Context
export interface MCPExecutionContext {
  agentId?: number;
  userId?: number;
  permissions: string[];
  isAuthenticated: boolean;
  requestId: string;
  startTime: Date;
}

// MCP Service Interface
export interface IMCPService {
  // Get available tools based on permissions
  getAvailableTools(permissions: string[]): MCPTool[];
  
  // Execute a tool
  executeTool(request: MCPRequest, context: MCPExecutionContext): Promise<any>;
  
  // Register a new tool
  registerTool(tool: MCPTool): void;
}

// MCP Service Implementation
export class MCPService implements IMCPService {
  private storage: IStorage;
  private pacsService: IPacsIntegrationService;
  private tools: Map<string, MCPTool>;
  
  constructor(storage: IStorage, pacsService: IPacsIntegrationService) {
    this.storage = storage;
    this.pacsService = pacsService;
    this.tools = new Map<string, MCPTool>();
    
    // Register default tools
    this.registerDefaultTools();
  }
  
  /**
   * Get available tools based on permissions
   */
  getAvailableTools(permissions: string[]): MCPTool[] {
    const availableTools: MCPTool[] = [];
    
    // Filter tools based on permissions
    for (const tool of this.tools.values()) {
      // Skip tools that require authentication if not authenticated
      if (tool.requiresAuth && !permissions.includes('authenticated')) {
        continue;
      }
      
      // Check if user has required permissions
      const hasPermissions = tool.requiredPermissions.every(permission => 
        permissions.includes(permission) || permissions.includes('admin')
      );
      
      if (hasPermissions) {
        availableTools.push(tool);
      }
    }
    
    return availableTools;
  }
  
  /**
   * Execute a tool
   */
  async executeTool(request: MCPRequest, context: MCPExecutionContext): Promise<any> {
    // Check if tool exists
    const tool = this.tools.get(request.tool);
    if (!tool) {
      throw new Error(`Tool '${request.tool}' not found`);
    }
    
    // Check authentication if required
    if (tool.requiresAuth && !context.isAuthenticated) {
      throw new Error(`Tool '${request.tool}' requires authentication`);
    }
    
    // Check permissions
    const hasPermissions = tool.requiredPermissions.every(permission => 
      context.permissions.includes(permission) || context.permissions.includes('admin')
    );
    
    if (!hasPermissions) {
      throw new Error(`Insufficient permissions to execute tool '${request.tool}'`);
    }
    
    try {
      // Log the tool execution start
      await this.logToolExecution(request, context, 'start');
      
      // Execute the tool
      const result = await tool.handler(request.parameters, context);
      
      // Log the tool execution success
      await this.logToolExecution(request, context, 'success');
      
      // Update AI agent status if agentId is provided
      if (context.agentId) {
        await this.updateAgentStatus(context.agentId, 'active', 100);
      }
      
      return {
        success: true,
        tool: request.tool,
        result,
        requestId: context.requestId,
        executionTime: new Date().getTime() - context.startTime.getTime()
      };
    } catch (error) {
      console.error(`Error executing tool '${request.tool}':`, error);
      
      // Log the tool execution failure
      await this.logToolExecution(request, context, 'error', error);
      
      // Update AI agent status if agentId is provided
      if (context.agentId) {
        await this.updateAgentStatus(context.agentId, 'error', 0);
      }
      
      return {
        success: false,
        tool: request.tool,
        error: error.message,
        requestId: context.requestId,
        executionTime: new Date().getTime() - context.startTime.getTime()
      };
    }
  }
  
  /**
   * Register a new tool
   */
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }
  
  /**
   * Log tool execution
   */
  private async logToolExecution(
    request: MCPRequest, 
    context: MCPExecutionContext, 
    status: string,
    error?: Error
  ): Promise<SystemActivity> {
    const activityData: InsertSystemActivity = {
      activity_type: 'tool_execution',
      component: request.tool,
      status,
      details: {
        tool: request.tool,
        parameters: request.parameters,
        requestId: context.requestId,
        agentId: context.agentId,
        userId: context.userId,
        error: error ? error.message : undefined
      },
      created_at: new Date()
    };
    
    return this.storage.createSystemActivity(activityData);
  }
  
  /**
   * Update AI agent status
   */
  private async updateAgentStatus(agentId: number, status: string, performance: number): Promise<void> {
    await this.storage.updateAiAgentStatus(agentId, status, performance);
  }
  
  /**
   * Register default tools
   */
  private registerDefaultTools(): void {
    // PACS Module tools
    this.registerTool({
      name: 'pacs.listModules',
      description: 'Lists all available PACS modules',
      parameters: {},
      requiresAuth: true,
      requiredPermissions: ['pacs.read'],
      handler: async () => {
        return await this.pacsService.getPacsModules();
      }
    });
    
    this.registerTool({
      name: 'pacs.getModuleById',
      description: 'Get a specific PACS module by ID',
      parameters: {
        id: 'number'
      },
      requiresAuth: true,
      requiredPermissions: ['pacs.read'],
      handler: async (parameters) => {
        const { id } = parameters;
        return await this.pacsService.getPacsModuleById(id);
      }
    });
    
    this.registerTool({
      name: 'pacs.getModulesByCategory',
      description: 'Get PACS modules grouped by category',
      parameters: {},
      requiresAuth: true,
      requiredPermissions: ['pacs.read'],
      handler: async () => {
        return await this.pacsService.getPacsModulesByCategory();
      }
    });
    
    this.registerTool({
      name: 'pacs.executeOperation',
      description: 'Execute an operation on a PACS module',
      parameters: {
        moduleId: 'number',
        operation: 'string',
        parameters: 'object'
      },
      requiresAuth: true,
      requiredPermissions: ['pacs.write'],
      handler: async (parameters) => {
        const { moduleId, operation, parameters: opParameters } = parameters;
        return await this.pacsService.executeModuleOperation(moduleId, operation, opParameters);
      }
    });
    
    this.registerTool({
      name: 'pacs.syncModule',
      description: 'Sync a specific PACS module',
      parameters: {
        moduleId: 'number'
      },
      requiresAuth: true,
      requiredPermissions: ['pacs.write'],
      handler: async (parameters) => {
        const { moduleId } = parameters;
        return await this.pacsService.syncPacsModule(moduleId);
      }
    });
    
    this.registerTool({
      name: 'pacs.syncAllModules',
      description: 'Sync all PACS modules',
      parameters: {},
      requiresAuth: true,
      requiredPermissions: ['pacs.admin'],
      handler: async () => {
        return await this.pacsService.syncAllPacsModules();
      }
    });
    
    // Property tools
    this.registerTool({
      name: 'property.getAll',
      description: 'Get all properties',
      parameters: {},
      requiresAuth: true,
      requiredPermissions: ['property.read'],
      handler: async () => {
        return await this.storage.getAllProperties();
      }
    });
    
    this.registerTool({
      name: 'property.getById',
      description: 'Get a property by ID',
      parameters: {
        id: 'number'
      },
      requiresAuth: true,
      requiredPermissions: ['property.read'],
      handler: async (parameters) => {
        const { id } = parameters;
        return await this.storage.getProperty(id);
      }
    });
    
    this.registerTool({
      name: 'property.getByPropertyId',
      description: 'Get a property by property ID',
      parameters: {
        propertyId: 'string'
      },
      requiresAuth: true,
      requiredPermissions: ['property.read'],
      handler: async (parameters) => {
        const { propertyId } = parameters;
        return await this.storage.getPropertyByPropertyId(propertyId);
      }
    });
    
    // Land Record tools
    this.registerTool({
      name: 'landRecord.getByPropertyId',
      description: 'Get land records by property ID',
      parameters: {
        propertyId: 'string'
      },
      requiresAuth: true,
      requiredPermissions: ['property.read'],
      handler: async (parameters) => {
        const { propertyId } = parameters;
        return await this.storage.getLandRecordsByPropertyId(propertyId);
      }
    });
    
    // Improvement tools
    this.registerTool({
      name: 'improvement.getByPropertyId',
      description: 'Get improvements by property ID',
      parameters: {
        propertyId: 'string'
      },
      requiresAuth: true,
      requiredPermissions: ['property.read'],
      handler: async (parameters) => {
        const { propertyId } = parameters;
        return await this.storage.getImprovementsByPropertyId(propertyId);
      }
    });
    
    // Field tools
    this.registerTool({
      name: 'field.getByPropertyId',
      description: 'Get fields by property ID',
      parameters: {
        propertyId: 'string'
      },
      requiresAuth: true,
      requiredPermissions: ['property.read'],
      handler: async (parameters) => {
        const { propertyId } = parameters;
        return await this.storage.getFieldsByPropertyId(propertyId);
      }
    });
    
    // Appeal tools
    this.registerTool({
      name: 'appeal.getByPropertyId',
      description: 'Get appeals by property ID',
      parameters: {
        propertyId: 'string'
      },
      requiresAuth: true,
      requiredPermissions: ['appeal.read'],
      handler: async (parameters) => {
        const { propertyId } = parameters;
        return await this.storage.getAppealsByPropertyId(propertyId);
      }
    });
    
    this.registerTool({
      name: 'appeal.getByUserId',
      description: 'Get appeals by user ID',
      parameters: {
        userId: 'number'
      },
      requiresAuth: true,
      requiredPermissions: ['appeal.read'],
      handler: async (parameters) => {
        const { userId } = parameters;
        return await this.storage.getAppealsByUserId(userId);
      }
    });
    
    this.registerTool({
      name: 'appeal.updateStatus',
      description: 'Update appeal status',
      parameters: {
        id: 'number',
        status: 'string'
      },
      requiresAuth: true,
      requiredPermissions: ['appeal.write'],
      handler: async (parameters) => {
        const { id, status } = parameters;
        return await this.storage.updateAppealStatus(id, status);
      }
    });
    
    // Agent tools
    this.registerTool({
      name: 'agent.getAll',
      description: 'Get all AI agents',
      parameters: {},
      requiresAuth: true,
      requiredPermissions: ['admin'],
      handler: async () => {
        return await this.storage.getAllAiAgents();
      }
    });
    
    this.registerTool({
      name: 'agent.updateStatus',
      description: 'Update AI agent status',
      parameters: {
        id: 'number',
        status: 'string',
        performance: 'number'
      },
      requiresAuth: true,
      requiredPermissions: ['admin'],
      handler: async (parameters) => {
        const { id, status, performance } = parameters;
        return await this.storage.updateAiAgentStatus(id, status, performance);
      }
    });
    
    // Audit tools
    this.registerTool({
      name: 'audit.getLogs',
      description: 'Get audit logs',
      parameters: {
        limit: 'number?'
      },
      requiresAuth: true,
      requiredPermissions: ['admin'],
      handler: async (parameters) => {
        const { limit } = parameters;
        return await this.storage.getAuditLogs(limit);
      }
    });
    
    // System activity tools
    this.registerTool({
      name: 'system.getActivities',
      description: 'Get system activities',
      parameters: {
        limit: 'number?'
      },
      requiresAuth: true,
      requiredPermissions: ['admin'],
      handler: async (parameters) => {
        const { limit } = parameters;
        return await this.storage.getSystemActivities(limit);
      }
    });
  }
}
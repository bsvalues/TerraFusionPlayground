/**
 * Agent Voice Command Service
 * 
 * Handles interpreting voice commands for agent interactions, maintaining context
 * between commands, and routing commands to appropriate agents.
 */

import OpenAI from 'openai';
import { storage } from '../storage';
import { agentSystem } from './agent-system';
import { AgentCommand, AgentCommandType } from '../types/agent-types';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const MODEL = 'gpt-4o';

// Type definitions
export interface VoiceCommandContext {
  sessionId: string;
  agentId?: string;
  previousCommands: AgentCommand[];
  lastCommandTime: Date;
  subject?: string;
  activeContext?: string;
}

export interface VoiceCommandResult {
  command: AgentCommand;
  response?: any;
  error?: string;
  updatedContext: VoiceCommandContext;
}

export class AgentVoiceCommandService {
  // Store active contexts by session ID
  private activeContexts: Map<string, VoiceCommandContext> = new Map();
  
  /**
   * Process a voice command and return the appropriate response
   */
  public async processVoiceCommand(
    text: string, 
    sessionId: string,
    contextOverride?: Partial<VoiceCommandContext>
  ): Promise<VoiceCommandResult> {
    try {
      // Get or create context for this session
      let context = this.getOrCreateContext(sessionId);
      
      // Apply context override if provided
      if (contextOverride) {
        context = { ...context, ...contextOverride };
      }
      
      // Interpret the command
      const command = await this.interpretCommand(text, context);
      
      // Execute the command
      const response = await this.executeCommand(command, context);
      
      // Update context with this command
      context.previousCommands.push(command);
      context.lastCommandTime = new Date();
      
      if (command.agentId) {
        context.agentId = command.agentId;
      }
      
      if (command.subject) {
        context.subject = command.subject;
      }
      
      // Store updated context
      this.activeContexts.set(sessionId, context);
      
      return {
        command,
        response,
        updatedContext: { ...context }
      };
    } catch (error) {
      console.error('Error processing voice command:', error);
      
      return {
        command: {
          type: AgentCommandType.UNKNOWN,
          original: text
        },
        error: error instanceof Error ? error.message : String(error),
        updatedContext: this.getOrCreateContext(sessionId)
      };
    }
  }
  
  /**
   * Get or create a context for a session
   */
  private getOrCreateContext(sessionId: string): VoiceCommandContext {
    if (this.activeContexts.has(sessionId)) {
      return this.activeContexts.get(sessionId)!;
    }
    
    const newContext: VoiceCommandContext = {
      sessionId,
      previousCommands: [],
      lastCommandTime: new Date()
    };
    
    this.activeContexts.set(sessionId, newContext);
    return newContext;
  }
  
  /**
   * Clear a session's context
   */
  public clearContext(sessionId: string): void {
    this.activeContexts.delete(sessionId);
  }
  
  /**
   * Clean up old contexts (should be called periodically)
   */
  public cleanupOldContexts(maxAgeMinutes: number = 30): void {
    const now = new Date();
    
    for (const [sessionId, context] of this.activeContexts.entries()) {
      const ageMinutes = (now.getTime() - context.lastCommandTime.getTime()) / (1000 * 60);
      
      if (ageMinutes > maxAgeMinutes) {
        this.activeContexts.delete(sessionId);
      }
    }
  }
  
  /**
   * Interpret a voice command using OpenAI
   */
  private async interpretCommand(text: string, context: VoiceCommandContext): Promise<AgentCommand> {
    const agentIds = await this.getAvailableAgentIds();
    const availableAgentTypes = await this.getAvailableAgentTypes();
    
    const systemPrompt = `
    You are an assistant that interprets natural language commands for an AI agent system.
    
    Available agent types: ${availableAgentTypes.join(', ')}
    Available agent IDs: ${agentIds.join(', ')}
    
    Convert the user's voice command into a structured command for the agent system.
    If the command mentions a specific agent, use that agent's ID. If not but there's
    an active agent in the context, assume the command is for that agent.
    
    Command types:
    - QUERY: Request information from an agent
    - TASK: Ask an agent to perform a task
    - STATUS: Check the status of an agent or task
    - ANALYZE: Request in-depth analysis of something
    - CREATE: Create something new
    - UPDATE: Update something that exists
    - DELETE: Delete something
    - LIST: List items
    - HELP: Request help about available commands
    - UNKNOWN: Could not interpret the command
    
    Current context:
    ${context.agentId ? `- Active agent: ${context.agentId}` : '- No active agent'}
    ${context.subject ? `- Current subject: ${context.subject}` : '- No current subject'}
    ${context.activeContext ? `- Active context: ${context.activeContext}` : '- No active context'}
    
    Previous commands:
    ${context.previousCommands.slice(-3).map(cmd => `- ${cmd.original} (${cmd.type}${cmd.agentId ? ` for ${cmd.agentId}` : ''})`).join('\n') || '- No previous commands'}
    
    Return a JSON object with these fields:
    - type: The command type
    - agentId: The target agent ID (if specified)
    - subject: The subject of the command (if applicable)
    - parameters: Object with command-specific parameters
    - original: The original command text
    
    Only include fields that are relevant to the command. If a field is not mentioned, omit it.
    `;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' }
    });
    
    // Extract and validate the response
    const responseContent = response.choices[0].message.content;
    
    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }
    
    // Parse the JSON response
    const parsedResponse = JSON.parse(responseContent);
    
    // Add the original text
    parsedResponse.original = text;
    
    return parsedResponse as AgentCommand;
  }
  
  /**
   * Execute a command on the agent system
   */
  private async executeCommand(command: AgentCommand, context: VoiceCommandContext): Promise<any> {
    // Get the agent ID from the command or context
    const agentId = command.agentId || context.agentId;
    
    // If we don't have an agent ID and it's required, throw an error
    if (!agentId && this.commandRequiresAgent(command.type)) {
      throw new Error('No agent specified for command: ' + command.type);
    }
    
    // Route the command based on its type
    switch (command.type) {
      case AgentCommandType.QUERY:
        return this.executeQueryCommand(command, agentId);
        
      case AgentCommandType.TASK:
        return this.executeTaskCommand(command, agentId);
        
      case AgentCommandType.STATUS:
        return this.executeStatusCommand(command, agentId);
        
      case AgentCommandType.ANALYZE:
        return this.executeAnalyzeCommand(command, agentId);
        
      case AgentCommandType.CREATE:
        return this.executeCreateCommand(command, agentId);
        
      case AgentCommandType.UPDATE:
        return this.executeUpdateCommand(command, agentId);
        
      case AgentCommandType.DELETE:
        return this.executeDeleteCommand(command, agentId);
        
      case AgentCommandType.LIST:
        return this.executeListCommand(command);
        
      case AgentCommandType.HELP:
        return this.executeHelpCommand(command);
        
      case AgentCommandType.UNKNOWN:
      default:
        throw new Error('Unknown or unsupported command type: ' + command.type);
    }
  }
  
  /**
   * Check if a command type requires an agent
   */
  private commandRequiresAgent(commandType: AgentCommandType): boolean {
    return [
      AgentCommandType.QUERY,
      AgentCommandType.TASK,
      AgentCommandType.ANALYZE,
      AgentCommandType.CREATE,
      AgentCommandType.UPDATE,
      AgentCommandType.DELETE
    ].includes(commandType);
  }
  
  /**
   * Execute a QUERY command
   */
  private async executeQueryCommand(command: AgentCommand, agentId?: string): Promise<any> {
    if (!agentId) {
      throw new Error('Agent ID is required for QUERY commands');
    }
    
    // Use agent system to send a query to the specified agent
    const agent = await agentSystem.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Construct the query based on command parameters and subject
    const query = {
      type: 'query',
      text: command.original,
      subject: command.subject,
      parameters: command.parameters
    };
    
    // Send the query to the agent
    return await agent.processQuery(query);
  }
  
  /**
   * Execute a TASK command
   */
  private async executeTaskCommand(command: AgentCommand, agentId?: string): Promise<any> {
    if (!agentId) {
      throw new Error('Agent ID is required for TASK commands');
    }
    
    // Use agent system to send a task to the specified agent
    const agent = await agentSystem.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Construct the task based on command parameters and subject
    const task = {
      type: 'task',
      description: command.original,
      subject: command.subject,
      parameters: command.parameters
    };
    
    // Send the task to the agent
    return await agent.processTask(task);
  }
  
  /**
   * Execute a STATUS command
   */
  private async executeStatusCommand(command: AgentCommand, agentId?: string): Promise<any> {
    if (agentId) {
      // Get status of a specific agent
      const agent = await agentSystem.getAgent(agentId);
      
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      return agent.getStatus();
    } else {
      // Get overall agent system status
      return agentSystem.getStatus();
    }
  }
  
  /**
   * Execute an ANALYZE command
   */
  private async executeAnalyzeCommand(command: AgentCommand, agentId?: string): Promise<any> {
    if (!agentId) {
      throw new Error('Agent ID is required for ANALYZE commands');
    }
    
    // Use agent system to send an analysis request to the specified agent
    const agent = await agentSystem.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Construct the analysis request based on command parameters and subject
    const analysisRequest = {
      type: 'analysis',
      subject: command.subject || 'Not specified',
      parameters: command.parameters
    };
    
    // Send the analysis request to the agent
    return await agent.analyze(analysisRequest);
  }
  
  /**
   * Execute a CREATE command
   */
  private async executeCreateCommand(command: AgentCommand, agentId?: string): Promise<any> {
    if (!agentId) {
      throw new Error('Agent ID is required for CREATE commands');
    }
    
    // Use agent system to send a create request to the specified agent
    const agent = await agentSystem.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Construct the create request based on command parameters and subject
    const createRequest = {
      type: 'create',
      entity: command.subject || 'Not specified',
      parameters: command.parameters
    };
    
    // Send the create request to the agent
    return await agent.create(createRequest);
  }
  
  /**
   * Execute an UPDATE command
   */
  private async executeUpdateCommand(command: AgentCommand, agentId?: string): Promise<any> {
    if (!agentId) {
      throw new Error('Agent ID is required for UPDATE commands');
    }
    
    // Use agent system to send an update request to the specified agent
    const agent = await agentSystem.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Construct the update request based on command parameters and subject
    const updateRequest = {
      type: 'update',
      entity: command.subject || 'Not specified',
      parameters: command.parameters
    };
    
    // Send the update request to the agent
    return await agent.update(updateRequest);
  }
  
  /**
   * Execute a DELETE command
   */
  private async executeDeleteCommand(command: AgentCommand, agentId?: string): Promise<any> {
    if (!agentId) {
      throw new Error('Agent ID is required for DELETE commands');
    }
    
    // Use agent system to send a delete request to the specified agent
    const agent = await agentSystem.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Construct the delete request based on command parameters and subject
    const deleteRequest = {
      type: 'delete',
      entity: command.subject || 'Not specified',
      parameters: command.parameters
    };
    
    // Send the delete request to the agent
    return await agent.delete(deleteRequest);
  }
  
  /**
   * Execute a LIST command
   */
  private async executeListCommand(command: AgentCommand): Promise<any> {
    // Determine what to list based on the command subject
    const subject = command.subject?.toLowerCase();
    
    if (!subject || subject === 'agents') {
      // List available agents
      const agents = await agentSystem.getAllAgents();
      return {
        type: 'agent_list',
        agents: agents.map(agent => ({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status
        }))
      };
    } else if (subject === 'commands' || subject === 'help') {
      // List available commands
      return this.getAvailableCommands();
    } else {
      throw new Error(`Unknown list subject: ${subject}`);
    }
  }
  
  /**
   * Execute a HELP command
   */
  private async executeHelpCommand(command: AgentCommand): Promise<any> {
    return this.getAvailableCommands();
  }
  
  /**
   * Get available agent IDs
   */
  private async getAvailableAgentIds(): Promise<string[]> {
    const agents = await agentSystem.getAllAgents();
    return agents.map(agent => agent.id);
  }
  
  /**
   * Get available agent types
   */
  private async getAvailableAgentTypes(): Promise<string[]> {
    const agents = await agentSystem.getAllAgents();
    const types = new Set(agents.map(agent => agent.type));
    return Array.from(types);
  }
  
  /**
   * Get available commands
   */
  private getAvailableCommands(): any {
    return {
      type: 'help',
      commands: [
        { 
          type: AgentCommandType.QUERY, 
          description: 'Request information from an agent',
          examples: [
            'Ask the property intelligence agent about property values in downtown',
            'Query data management agent for property types'
          ]
        },
        { 
          type: AgentCommandType.TASK, 
          description: 'Ask an agent to perform a task',
          examples: [
            'Tell the frontend agent to create a new page',
            'Ask the designer agent to update the property card layout'
          ]
        },
        { 
          type: AgentCommandType.STATUS, 
          description: 'Check the status of an agent or task',
          examples: [
            'What is the status of the data management agent?',
            'Check the status of all agents'
          ]
        },
        { 
          type: AgentCommandType.ANALYZE, 
          description: 'Request in-depth analysis of something',
          examples: [
            'Analyze property values in the downtown area',
            'Have the risk assessment agent analyze flood risks'
          ]
        },
        { 
          type: AgentCommandType.CREATE, 
          description: 'Create something new',
          examples: [
            'Create a new property record',
            'Have the frontend agent create a dashboard component'
          ]
        },
        { 
          type: AgentCommandType.UPDATE, 
          description: 'Update something that exists',
          examples: [
            'Update property BC001',
            'Have the backend agent update the API endpoint'
          ]
        },
        { 
          type: AgentCommandType.DELETE, 
          description: 'Delete something',
          examples: [
            'Delete property record BC999',
            'Have the data management agent remove duplicate entries'
          ]
        },
        { 
          type: AgentCommandType.LIST, 
          description: 'List items',
          examples: [
            'List all available agents',
            'Show me all commands'
          ]
        },
        { 
          type: AgentCommandType.HELP, 
          description: 'Request help about available commands',
          examples: [
            'Help me with agent commands',
            'What can I ask the agents to do?'
          ]
        }
      ]
    };
  }
}

// Create singleton instance
export const agentVoiceCommandService = new AgentVoiceCommandService();

export default agentVoiceCommandService;
/**
 * Base GIS Agent
 * 
 * This abstract class serves as the foundation for all GIS agents in the system.
 * It extends the BaseAgent class with GIS-specific functionality.
 */

import { BaseAgent, AgentConfig } from '../../agents/base-agent';
import { IStorage } from '../../../storage';
import { MCPService } from '../../mcp';

/**
 * Abstract base class for GIS agents
 */
export abstract class BaseGISAgent extends BaseAgent {
  constructor(storage: IStorage, config: AgentConfig) {
    // Create a minimal mock MCPService if it's not needed for GIS agents
    const mcpService = new MCPService(storage);
    
    super(storage, mcpService, config);
  }
  
  /**
   * Initialize the agent
   */
  public abstract initialize(): Promise<void>;
  
  /**
   * Create an agent message in the storage system
   */
  protected async createAgentMessage(message: any): Promise<any> {
    try {
      // Ensure agentId is set
      if (!message.agentId) {
        message.agentId = this.agentId;
      }
      
      // Create the message in storage
      return await this.storage.createAgentMessage(message);
    } catch (error) {
      console.error(`Error creating agent message for ${this.name}:`, error);
      // Don't throw here to prevent cascading failures
      return null;
    }
  }
  
  /**
   * Log GIS operation
   */
  protected async logGISOperation(operation: string, details: any = {}): Promise<void> {
    try {
      await this.createAgentMessage({
        type: 'GIS_OPERATION',
        content: `GIS Operation: ${operation}`,
        agentId: this.agentId,
        metadata: {
          operation,
          timestamp: new Date(),
          ...details
        }
      });
    } catch (error) {
      console.error(`Error logging GIS operation for ${this.name}:`, error);
    }
  }
  
  /**
   * Record a spatial event
   */
  protected async recordSpatialEvent(eventType: string, geometry: any, details: any = {}): Promise<any> {
    try {
      const event = {
        event_type: eventType,
        agent_id: this.agentId,
        geometry: JSON.stringify(geometry),
        details: JSON.stringify({
          agentName: this.name,
          ...details
        }),
        created_at: new Date()
      };
      
      // Create the spatial event in storage
      if (typeof this.storage.createSpatialEvent === 'function') {
        return await this.storage.createSpatialEvent(event);
      } else {
        console.log(`Storage doesn't support createSpatialEvent method. Event not recorded: ${eventType}`);
        return null;
      }
    } catch (error) {
      console.error(`Error recording spatial event for ${this.name}:`, error);
      return null;
    }
  }
  
  /**
   * Get recent agent messages
   */
  protected async getRecentMessages(limit: number = 10): Promise<any[]> {
    try {
      // Get recent messages for this agent
      if (typeof this.storage.getAgentMessagesByAgentId === 'function') {
        return await this.storage.getAgentMessagesByAgentId(this.agentId);
      } else {
        console.log(`Storage doesn't support getAgentMessagesByAgentId method. Returning empty array.`);
        return [];
      }
    } catch (error) {
      console.error(`Error getting recent messages for ${this.name}:`, error);
      return [];
    }
  }
}
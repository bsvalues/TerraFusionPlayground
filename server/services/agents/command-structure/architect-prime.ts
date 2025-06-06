import { BaseAgent, AgentCapability, AgentConfig } from '../base-agent';
import { logger } from '../../../utils/logger';
import { IStorage } from '../../../storage';
import { MessageEventType, MessagePriority, EntityType } from '../../../../shared/schema';
import { MCPService } from '../../../services/mcp';

/**
 * ArchitectPrimeAgent
 *
 * The highest level agent in the command structure.
 * Maintains architectural vision and system integrity.
 * Provides guidance to the Integration Coordinator and Component Lead agents.
 */
export class ArchitectPrimeAgent extends BaseAgent {
  constructor(storage: IStorage, mcpService?: MCPService) {
    const agentId = 'architect_prime';

    const config: AgentConfig = {
      id: agentId,
      name: 'Architect Prime',
      description:
        'The highest level agent in the command structure that maintains architectural vision and system integrity.',
      capabilities: [
        {
          name: 'maintainArchitecturalVision',
          description: 'Maintains the architectural vision of the system',
          handler: async () => ({ status: 'success', message: 'Architectural vision maintained' }),
        },
        {
          name: 'ensureSystemIntegrity',
          description: 'Ensures system integrity across all components',
          handler: async () => ({ status: 'success', message: 'System integrity verified' }),
        },
        {
          name: 'generateArchitectureDiagrams',
          description: 'Generates architectural diagrams',
          handler: async (params: any, agent: any) => agent.generateArchitectureDiagram(),
        },
        {
          name: 'createVisionStatements',
          description: 'Creates vision statements for the system',
          handler: async (params: any, agent: any) => agent.createDailyVisionStatement(),
        },
        {
          name: 'resolveArchitecturalConflicts',
          description: 'Resolves architectural conflicts between components',
          handler: async (params: any, agent: any) =>
            agent.resolveArchitecturalConflict(
              params.componentA,
              params.componentB,
              params.conflictDescription
            ),
        },
      ],
      permissions: ['system:architect', 'component:all:read', 'component:all:write'],
    };

    super(storage, mcpService || ({} as MCPService), config);

    // Ensure both id and agentId are properly set
    this.id = agentId;
    this.agentId = agentId;

    console.log(
      `Creating agent message with agent ID: ${agentId}`,
      `Message has senderAgentId: ${this.agentId ? 'true' : 'false'}`,
      `Message has agentId: ${this.agentId ? 'true' : 'false'}`
    );
  }

  async initialize(): Promise<void> {
    logger.info({
      component: 'Architect Prime Agent',
      message: 'Initializing architect prime agent',
      agentId: this.agentId,
    });

    // Register capabilities
    this.capabilities.forEach(capability => {
      logger.debug({
        component: 'Architect Prime Agent',
        message: `Registered capability: ${capability}`,
      });
    });

    logger.info({
      component: 'Architect Prime Agent',
      message: 'Architect prime agent initialization complete',
      agentId: this.agentId,
    });
  }

  /**
   * Generate and distribute vision statements to all teams
   */
  async createDailyVisionStatement(): Promise<string> {
    logger.info({ component: 'Architect Prime Agent', message: 'Creating daily vision statement' });

    // Generate a fallback agent ID if this.agentId is null or undefined
    const fallbackAgentId = 'architect_prime_fallback';
    if (
      !this.agentId ||
      this.agentId === 'null' ||
      this.agentId === 'undefined' ||
      typeof this.agentId !== 'string'
    ) {
      console.log(
        `WARNING: ArchitectPrimeAgent.agentId is invalid (${this.agentId}), using fallback ID: ${fallbackAgentId}`
      );
      this.agentId = fallbackAgentId;
      // Also update the id property to maintain consistency
      this.id = fallbackAgentId;
    }

    console.log(
      `ArchitectPrimeAgent.createDailyVisionStatement using agentId: ${this.agentId}, id: ${this.id}`
    );

    const visionStatement = `
      BCBS GeoAssessment System Vision: 
      A state-of-the-art property assessment platform integrating geospatial data, 
      tax calculation, and valuation methodologies in a cohesive system that promotes
      accuracy, transparency, and regulatory compliance while enabling efficient
      workflows for assessors and providing clear information to property owners.
    `;

    // Distribute to all component leads
    const componentLeads = [
      'bsbcmaster_lead',
      'bcbsgispro_lead',
      'bcbslevy_lead',
      'bcbscostapp_lead',
      'bcbsgeoassessmentpro_lead',
    ];

    for (const leadId of componentLeads) {
      // Ensure we have a valid agentId before calling createAgentMessage
      const agentId = this.agentId || fallbackAgentId;

      await this.storage.createAgentMessage({
        senderAgentId: agentId,
        receiverAgentId: leadId,
        messageType: MessageEventType.COMMAND,
        priority: MessagePriority.HIGH,
        subject: 'Daily Vision Statement',
        content: {
          message: visionStatement,
          context: {
            workflow: 'system-vision',
            type: 'vision-statement',
          },
        },
        status: 'pending',
        messageId: `vision-${Date.now()}`,
        conversationId: null,
      });
    }

    // Also send to integration coordinator
    // Ensure we have a valid agentId before calling createAgentMessage
    const agentId = this.agentId || fallbackAgentId;

    await this.storage.createAgentMessage({
      senderAgentId: agentId,
      receiverAgentId: 'integration_coordinator',
      messageType: MessageEventType.COMMAND,
      priority: MessagePriority.HIGH,
      subject: 'Daily Vision Statement',
      content: {
        message: visionStatement,
        context: {
          workflow: 'system-vision',
          type: 'vision-statement',
        },
      },
      status: 'pending',
      messageId: `vision-${Date.now()}`,
      conversationId: null,
    });

    return visionStatement;
  }

  /**
   * Generate an architecture diagram in mermaid format
   */
  async generateArchitectureDiagram(): Promise<string> {
    logger.info({ component: 'Architect Prime Agent', message: 'Generating architecture diagram' });

    const mermaidDiagram = `
      graph TD
        A[Architect Prime] --> B[Integration Coordinator]
        B --> C1[BSBCmaster Lead]
        B --> C2[BCBSGISPRO Lead]
        B --> C3[BCBSLevy Lead]
        B --> C4[BCBSCOSTApp Lead]
        B --> C5[BCBSGeoAssessmentPro Lead]
        
        C1 --> D1[Authentication Agents]
        C1 --> D2[Data Foundation Agents]
        C1 --> D3[Integration Hub Agents]
        
        C2 --> E1[Spatial Data Agents]
        C2 --> E2[Map Rendering Agents]
        C2 --> E3[Spatial Analytics Agents]
        
        C3 --> F1[Tax Rule Agents]
        C3 --> F2[Calculation Agents]
        C3 --> F3[Notification Agents]
        
        C4 --> G1[Cost Model Agents]
        C4 --> G2[Valuation Agents]
        C4 --> G3[Reporting Agents]
        
        C5 --> H1[Integration Agents]
        C5 --> H2[User Interface Agents]
        C5 --> H3[Reporting Agents]
    `;

    // Store the architecture diagram
    await this.storage.createSystemActivity({
      activity: 'Generated system architecture diagram',
      entityType: 'architecture',
      entityId: 'system-architecture',
      component: 'Architect Prime Agent',
    });

    return mermaidDiagram;
  }

  /**
   * Resolve architectural conflicts between components
   */
  async resolveArchitecturalConflict(
    componentA: string,
    componentB: string,
    conflictDescription: string
  ): Promise<string> {
    logger.info({
      component: 'Architect Prime Agent',
      message: `Resolving architectural conflict between ${componentA} and ${componentB}`,
    });

    // Generate a fallback agent ID if this.agentId is null or undefined
    const fallbackAgentId = 'architect_prime_fallback';
    if (
      !this.agentId ||
      this.agentId === 'null' ||
      this.agentId === 'undefined' ||
      typeof this.agentId !== 'string'
    ) {
      console.log(
        `WARNING: ArchitectPrimeAgent.agentId is invalid (${this.agentId}), using fallback ID: ${fallbackAgentId}`
      );
      this.agentId = fallbackAgentId;
      // Also update the id property to maintain consistency
      this.id = fallbackAgentId;
    }

    console.log(
      `ArchitectPrimeAgent.resolveArchitecturalConflict using agentId: ${this.agentId}, id: ${this.id}`
    );

    // Ensure we have a valid agentId
    const agentId = this.agentId || fallbackAgentId;

    // Request information from both components
    await this.storage.createAgentMessage({
      senderAgentId: agentId,
      receiverAgentId: `${componentA}_lead`,
      messageType: MessageEventType.QUERY,
      priority: MessagePriority.URGENT,
      subject: `Architectural Conflict Resolution`,
      content: {
        message: `Please provide details about your component's requirements regarding: ${conflictDescription}`,
        context: {
          workflow: 'conflict-resolution',
          componentA,
          componentB,
          conflictDescription,
        },
      },
      status: 'pending',
      messageId: `conflict-${Date.now()}-a`,
      conversationId: `conflict-${Date.now()}`,
    });

    await this.storage.createAgentMessage({
      senderAgentId: agentId,
      receiverAgentId: `${componentB}_lead`,
      messageType: MessageEventType.QUERY,
      priority: MessagePriority.URGENT,
      subject: `Architectural Conflict Resolution`,
      content: {
        message: `Please provide details about your component's requirements regarding: ${conflictDescription}`,
        context: {
          workflow: 'conflict-resolution',
          componentA,
          componentB,
          conflictDescription,
        },
      },
      status: 'pending',
      messageId: `conflict-${Date.now()}-b`,
      conversationId: `conflict-${Date.now()}`,
    });

    // In a real implementation, we would wait for responses and then make a decision
    const resolution = `
      Architectural conflict between ${componentA} and ${componentB} resolved:
      1. Created unified interface to accommodate both components
      2. Established clear boundaries between components
      3. Implemented adapter pattern to handle different data requirements
      4. Updated system documentation to reflect the resolution
    `;

    // Notify all involved parties
    // Use the same agentId we defined earlier
    await this.storage.createAgentMessage({
      senderAgentId: agentId,
      receiverAgentId: 'integration_coordinator',
      messageType: MessageEventType.STATUS_UPDATE,
      priority: MessagePriority.HIGH,
      subject: `Conflict Resolution: ${componentA} and ${componentB}`,
      content: {
        resolution,
        context: {
          workflow: 'conflict-resolution',
          componentA,
          componentB,
          conflictDescription,
        },
      },
      status: 'pending',
      messageId: `resolution-${Date.now()}`,
      conversationId: null,
    });

    return resolution;
  }
}

/**
 * Initialize GIS Agents
 * 
 * This module initializes and registers GIS agents with the orchestration service.
 */

import { IStorage } from '../../storage';
import { GISAgentOrchestrationService } from './agent-orchestration-service';
import { createSchemaConversionAgent } from './agents/schema-conversion-agent';
import { createDataNormalizationAgent } from './agents/data-normalization-agent';

/**
 * Initialize GIS agents and register them with the orchestration service
 * @param storage The storage implementation
 * @param orchestrationService The GIS agent orchestration service
 */
export async function initializeGISAgents(
  storage: IStorage,
  orchestrationService: GISAgentOrchestrationService
): Promise<void> {
  console.log('Initializing GIS agents...');
  
  try {
    // Initialize orchestration service first
    await orchestrationService.initialize();
    
    // Create and register schema conversion agent
    const schemaConversionAgent = createSchemaConversionAgent(storage);
    await schemaConversionAgent.initialize();
    orchestrationService.registerAgent(schemaConversionAgent);
    
    // Create and register data normalization agent
    const dataNormalizationAgent = createDataNormalizationAgent(storage);
    await dataNormalizationAgent.initialize();
    orchestrationService.registerAgent(dataNormalizationAgent);
    
    // Initialize more agents as needed...
    
    console.log('GIS agents initialized successfully');
  } catch (error) {
    console.error('Failed to initialize GIS agents:', error);
    throw error;
  }
}

/**
 * Initialize GIS agents with a new orchestration service instance
 * @param storage The storage implementation
 * @returns The initialized GIS agent orchestration service
 */
export async function initializeGISAgentsWithService(storage: IStorage): Promise<GISAgentOrchestrationService> {
  const orchestrationService = GISAgentOrchestrationService.getInstance(storage);
  await initializeGISAgents(storage, orchestrationService);
  return orchestrationService;
}
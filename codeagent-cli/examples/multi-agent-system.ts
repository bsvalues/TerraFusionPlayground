/**
 * multi-agent-system.ts
 * 
 * Example usage of the multi-agent architecture
 */

import {
  AgentSystem,
  AgentSystemConfig,
  LogLevel,
  DatabaseTaskType,
  GisTaskType,
  DevelopmentTaskType,
  DebuggingTaskType,
  LocalDeploymentTaskType,
  VersionControlTaskType,
  WebDeploymentTaskType
} from '../src/agents';

async function main() {
  console.log('=== Multi-Agent System Example ===');
  
  // Create agent system with configuration
  const config: AgentSystemConfig = {
    logLevel: LogLevel.DEBUG,
    autoInitialize: true,
    agents: {
      database: true,
      gis: true,
      development: true,
      debugging: true,
      localDeployment: true,
      versionControl: true,
      webDeployment: true
    }
  };
  
  const agentSystem = new AgentSystem(config);
  
  // Initialize the system (happens automatically with autoInitialize, but can be called explicitly)
  await agentSystem.initialize();
  
  // List all agents
  const allAgents = agentSystem.getAllAgents();
  console.log(`\nAll Agents (${allAgents.length}):`);
  allAgents.forEach(agent => {
    console.log(`- ${agent.name} (ID: ${agent.id}) - Status: ${agent.status}, Priority: ${agent.priority}`);
    console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
  });
  
  // Find agents by capability
  const dbAgents = agentSystem.findAgentsByCapability('QUERY_OPTIMIZATION');
  console.log(`\nAgents with QUERY_OPTIMIZATION capability (${dbAgents.length}):`);
  dbAgents.forEach(agent => {
    console.log(`- ${agent.name} (ID: ${agent.id})`);
  });
  
  // Example: Submit database query analysis task
  console.log('\n=== Database Query Analysis ===');
  try {
    const result = await agentSystem.submitTask({
      id: `task-${Date.now()}-1`,
      type: DatabaseTaskType.ANALYZE_QUERY,
      priority: 'high',
      payload: {
        query: 'SELECT * FROM users JOIN orders ON users.id = orders.user_id WHERE users.country = "US" ORDER BY orders.total DESC',
        options: { detailed: true }
      }
    });
    
    console.log('Query Analysis Result:');
    console.log(`Original Query: ${result.originalQuery}`);
    if (result.potentialIssues && result.potentialIssues.length > 0) {
      console.log('Potential Issues:');
      result.potentialIssues.forEach((issue: string) => console.log(`- ${issue}`));
    }
    if (result.recommendations && result.recommendations.length > 0) {
      console.log('Recommendations:');
      result.recommendations.forEach((rec: string) => console.log(`- ${rec}`));
    }
  } catch (error) {
    console.error(`Database task error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Example: Submit GIS spatial query task
  console.log('\n=== GIS Spatial Query ===');
  try {
    const result = await agentSystem.submitTask({
      id: `task-${Date.now()}-2`,
      type: GisTaskType.PERFORM_SPATIAL_QUERY,
      priority: 'normal',
      payload: {
        query: 'SELECT * FROM properties WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), 5000)',
        bounds: {
          minLat: 37.7,
          minLng: -122.5,
          maxLat: 37.8,
          maxLng: -122.3
        }
      }
    });
    
    console.log('Spatial Query Result:');
    console.log(`Found ${result.count} features`);
    console.log(`First feature: ${JSON.stringify(result.features[0])}`);
  } catch (error) {
    console.error(`GIS task error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Example: Submit debugging task
  console.log('\n=== Code Analysis ===');
  try {
    const result = await agentSystem.submitTask({
      id: `task-${Date.now()}-3`,
      type: DebuggingTaskType.ANALYZE_CODE,
      priority: 'high',
      payload: {
        sources: ['src/app.js', 'src/utils.js'],
        options: { 
          ruleset: 'default',
          includeHints: true
        }
      }
    });
    
    console.log('Code Analysis Result:');
    console.log(`Found ${result.length} issues`);
    result.forEach((issue: any) => {
      console.log(`- ${issue.type.toUpperCase()}: ${issue.message} at ${issue.sourceFile}:${issue.lineStart}`);
    });
  } catch (error) {
    console.error(`Debugging task error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Example: Submit web deployment task
  console.log('\n=== Web Deployment ===');
  try {
    // First configure a provider
    const providerResult = await agentSystem.submitTask({
      id: `task-${Date.now()}-4a`,
      type: WebDeploymentTaskType.CONFIGURE_PROVIDER,
      priority: 'normal',
      payload: {
        config: {
          type: 'vercel',
          name: 'vercel-provider',
          region: 'iad1',
          credentials: {
            token: 'PLACEHOLDER_TOKEN' // Would be a real token in production
          }
        }
      }
    });
    
    console.log('Provider Configuration Result:');
    console.log(`Provider: ${providerResult.provider} (${providerResult.type})`);
    console.log(`Services: ${providerResult.services.join(', ')}`);
    
    // Then deploy an application
    const deployResult = await agentSystem.submitTask({
      id: `task-${Date.now()}-4b`,
      type: WebDeploymentTaskType.DEPLOY_APPLICATION,
      priority: 'normal',
      payload: {
        config: {
          name: 'my-web-app',
          provider: {
            type: 'vercel',
            name: 'vercel-provider'
          },
          type: 'static',
          source: {
            type: 'directory',
            path: './build'
          },
          network: {
            domain: 'example.com',
            ssl: true
          }
        }
      }
    });
    
    console.log('Deployment Result:');
    console.log(`Deployment ID: ${deployResult.deploymentId}`);
    console.log(`Status: ${deployResult.status}`);
    console.log(`Estimated Completion: ${deployResult.estimatedCompletionTime}`);
  } catch (error) {
    console.error(`Web deployment task error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Shutdown the agent system
  console.log('\nShutting down Agent System...');
  await agentSystem.shutdown();
  console.log('Shutdown complete');
}

// Execute the example
main().catch(err => {
  console.error('Example error:', err);
  process.exit(1);
});
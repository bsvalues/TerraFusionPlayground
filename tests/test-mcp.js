/**
 * Test script for MCP service
 * 
 * This script tests the Model Context Protocol service by making API calls to the MCP endpoints.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function testMcpEndpoints() {
  console.log('=== Testing MCP Endpoints ===');
  
  try {
    // Test getting available tools
    console.log('\nTesting GET /api/mcp/tools');
    const toolsResponse = await fetch(`${BASE_URL}/mcp/tools`);
    
    if (!toolsResponse.ok) {
      throw new Error(`Failed to fetch MCP tools: ${toolsResponse.status} ${toolsResponse.statusText}`);
    }
    
    const tools = await toolsResponse.json();
    console.log(`Available tools: ${tools.length}`);
    tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    
    // Test executing a schema discovery tool
    console.log('\nTesting POST /api/mcp/execute - getSchema tool');
    const schemaRequest = {
      toolName: 'getSchema',
      parameters: {}
    };
    
    const schemaResponse = await fetch(`${BASE_URL}/mcp/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(schemaRequest)
    });
    
    if (!schemaResponse.ok) {
      throw new Error(`Failed to execute getSchema tool: ${schemaResponse.status} ${schemaResponse.statusText}`);
    }
    
    const schemaResult = await schemaResponse.json();
    console.log('Schema discovery successful');
    console.log(`Tables found: ${Object.keys(schemaResult.result.tables).length}`);
    console.log(`Relationships found: ${schemaResult.result.relationships.length}`);
    
    // Test executing a property query tool
    console.log('\nTesting POST /api/mcp/execute - getProperties tool');
    const propertiesRequest = {
      toolName: 'getProperties',
      parameters: {
        limit: 5
      }
    };
    
    const propertiesResponse = await fetch(`${BASE_URL}/mcp/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(propertiesRequest)
    });
    
    if (!propertiesResponse.ok) {
      throw new Error(`Failed to execute getProperties tool: ${propertiesResponse.status} ${propertiesResponse.statusText}`);
    }
    
    const propertiesResult = await propertiesResponse.json();
    console.log('Properties query successful');
    console.log(`Properties found: ${propertiesResult.result.length}`);
    if (propertiesResult.result.length > 0) {
      const sampleProperty = propertiesResult.result[0];
      console.log(`Sample property: ${sampleProperty.propertyId} - ${sampleProperty.address}`);
    }
    
    // Test executing a PACS modules query tool
    console.log('\nTesting POST /api/mcp/execute - getPacsModules tool');
    const modulesRequest = {
      toolName: 'getPacsModules',
      parameters: {
        filter: {
          integration: 'active'
        }
      }
    };
    
    const modulesResponse = await fetch(`${BASE_URL}/mcp/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(modulesRequest)
    });
    
    if (!modulesResponse.ok) {
      throw new Error(`Failed to execute getPacsModules tool: ${modulesResponse.status} ${modulesResponse.statusText}`);
    }
    
    const modulesResult = await modulesResponse.json();
    console.log('PACS modules query successful');
    console.log(`Active modules found: ${modulesResult.result.length}`);
    if (modulesResult.result.length > 0) {
      const sample = modulesResult.result.slice(0, 3);
      sample.forEach(module => {
        console.log(`- ${module.moduleName}: ${module.description}`);
      });
      if (modulesResult.result.length > 3) {
        console.log(`... and ${modulesResult.result.length - 3} more modules`);
      }
    }
    
    console.log('\n=== MCP Tests Completed Successfully ===');
    return true;
  } catch (error) {
    console.error('MCP test failed:', error);
    return false;
  }
}

// Run the tests
testMcpEndpoints().then(success => {
  if (!success) {
    process.exit(1);
  }
});

export { testMcpEndpoints };
/**
 * Basic test script for the future value prediction capability
 * through direct execution in the agent system.
 */

// Import required modules
const path = require('path');
const fs = require('fs');

async function runTest() {
  try {
    console.log('Loading modules...');
    
    // Import the AgentSystem
    const agentSystemPath = path.join(__dirname, 'server', 'services', 'agent-system');
    const { AgentSystem } = require(agentSystemPath);
    
    // Import Storage
    const storagePath = path.join(__dirname, 'server', 'storage');
    const { MemStorage } = require(storagePath);
    
    // Import MCP Service
    const mcpPath = path.join(__dirname, 'server', 'services', 'mcp');
    const { MCPService } = require(mcpPath);
    
    // Import PropertyStoryGenerator
    const psgPath = path.join(__dirname, 'server', 'services', 'property-story-generator');
    const { PropertyStoryGenerator } = require(psgPath);
    
    // Import FTP Service
    const ftpPath = path.join(__dirname, 'server', 'services', 'ftp-service');
    const { FTPService } = require(ftpPath);
    
    // Import Notification Service
    const notificationPath = path.join(__dirname, 'server', 'services', 'notification-service');
    const { NotificationService } = require(notificationPath);
    
    console.log('Setting up test environment...');
    
    // Create required services
    const storage = new MemStorage();
    const mcpService = new MCPService(storage);
    const ftpService = new FTPService();
    const notificationService = new NotificationService();
    const propertyStoryGenerator = new PropertyStoryGenerator(storage, mcpService);
    
    // Create the agent system
    const agentSystem = new AgentSystem(storage, mcpService, propertyStoryGenerator, ftpService, notificationService);
    
    // Initialize the agent system
    console.log('Initializing the agent system...');
    await agentSystem.initialize();
    console.log('Agent system initialized');
    
    // Test property
    const testPropertyId = 'BC001'; // Use a property ID that exists in your system
    
    // Execute the future value prediction capability
    console.log(`\nTesting Future Value Prediction for property ${testPropertyId}...`);
    try {
      const result = await agentSystem.executeCapability('property_assessment', 'predictFutureValue', {
        propertyId: testPropertyId,
        yearsAhead: 5
      });
      
      console.log('\nFuture Value Prediction Results:');
      console.log('Property ID:', result.propertyId);
      console.log('Current Value:', result.currentValue);
      
      if (result.predictedValues && result.predictedValues.length > 0) {
        const lastPrediction = result.predictedValues[result.predictedValues.length - 1];
        console.log(`Value in ${lastPrediction.year}:`, lastPrediction.predictedValue);
        console.log('Growth from present:', lastPrediction.growthFromPresent + '%');
      }
      
      if (result.confidenceIntervals && result.confidenceIntervals.length > 0) {
        const lastInterval = result.confidenceIntervals[result.confidenceIntervals.length - 1];
        console.log(`Confidence Interval in ${lastInterval.year}:`, 
                   `${lastInterval.low} - ${lastInterval.high} (±${lastInterval.marginOfError}%)`);
      }
      
      // Save the result to a file for inspection
      fs.writeFileSync(
        path.join(__dirname, 'future-value-prediction-result.json'),
        JSON.stringify(result, null, 2)
      );
      console.log('\nResult saved to future-value-prediction-result.json');
      
      console.log('\n✅ Test completed successfully');
    } catch (error) {
      console.error('Error executing capability:', error);
    }
  } catch (error) {
    console.error('Test setup failed:', error);
  }
}

runTest();
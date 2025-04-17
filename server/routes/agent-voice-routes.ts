import { Router } from 'express';
import { VoiceCommandContext } from '../services/agent-voice-command-service';

// Create a router for the voice command API
const router = Router();

/**
 * Process a voice command
 * This endpoint receives voice commands from the client and processes them
 * using the appropriate agent based on the context provided.
 */
router.post('/process', async (req, res) => {
  try {
    const { command, context } = req.body;
    
    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        command: '',
        processed: false,
        successful: false,
        error: 'No command text provided',
        timestamp: Date.now()
      });
    }
    
    // Use context to determine which agent to route the command to
    const { agentId, subject } = context as VoiceCommandContext;
    
    // For now, we'll implement a simple response generation
    // In a real implementation, this would route to different agent services
    const result = processCommand(command, agentId, subject);
    
    return res.json(result);
  } catch (error) {
    console.error('Error processing voice command:', error);
    return res.status(500).json({
      command: req.body.command || '',
      processed: false,
      successful: false,
      error: 'Server error processing command',
      timestamp: Date.now()
    });
  }
});

/**
 * Process a command with some basic responses
 * This is a placeholder for actual agent-specific processing logic
 */
function processCommand(command: string, agentId?: string, subject?: string) {
  const normalizedCommand = command.toLowerCase();
  let response = '';
  let successful = true;
  let actions = [];
  
  // Very simple intent detection based on keywords
  if (normalizedCommand.includes('hello') || 
      normalizedCommand.includes('hi') || 
      normalizedCommand.includes('hey')) {
    response = `Hello! I'm your ${agentId || 'AI'} assistant. How can I help you${subject ? ' with ' + subject : ''}?`;
  } 
  else if (normalizedCommand.includes('help') && normalizedCommand.includes('with')) {
    response = `I can help you with various tasks related to ${subject || 'assessment'}. Just tell me what you need.`;
  }
  else if (normalizedCommand.includes('what can you do') || normalizedCommand.includes('capabilities')) {
    if (agentId === 'assistant') {
      response = 'I can provide information about assessment models, help you create and manage models, and answer questions about the platform.';
    } else if (agentId === 'property') {
      response = 'I can show property details, find comparable properties, analyze value trends, and generate property stories.';
    } else if (agentId === 'analytics') {
      response = 'I can show dashboards, compare models, generate reports, and analyze assessment trends.';
    } else if (agentId === 'data') {
      response = 'I can help find properties, check data quality, identify missing data, and assist with data imports.';
    } else {
      response = 'I can help with various assessment and property-related tasks. Please specify what you need.';
    }
  }
  else if (normalizedCommand.includes('model') && normalizedCommand.includes('create')) {
    response = 'To create a new assessment model, you need to navigate to the Model Workbench and click on "New Model". I can guide you through the process step by step.';
  }
  else if (normalizedCommand.includes('property') && normalizedCommand.includes('show')) {
    // Extract property ID if present (simplified)
    const propertyIdMatch = normalizedCommand.match(/property (?:id )?(\d+)/);
    const propertyId = propertyIdMatch ? propertyIdMatch[1] : '12345';
    
    response = `I'm retrieving details for property ID ${propertyId}. This would typically display property characteristics, valuation history, and assessment information.`;
    actions = [
      {
        type: 'NAVIGATE',
        payload: { url: `/properties/${propertyId}` }
      }
    ];
  }
  else if (normalizedCommand.includes('comparable') || normalizedCommand.includes('comparables')) {
    response = 'I can find comparable properties based on location, size, features, and recent sales. This helps ensure fair and accurate assessments.';
  }
  else if (normalizedCommand.includes('dashboard')) {
    response = 'Opening the analytics dashboard where you can view key performance metrics, assessment ratios, and property trends.';
    actions = [
      {
        type: 'NAVIGATE',
        payload: { url: '/analytics/dashboard' }
      }
    ];
  }
  else if (normalizedCommand.includes('model') && normalizedCommand.includes('workbench')) {
    response = 'The Assessment Model Workbench is a powerful tool for creating, editing, and testing valuation models. It includes formula editors, component libraries, and testing frameworks.';
  }
  else if (normalizedCommand.includes('thank')) {
    response = "You're welcome! Let me know if you need anything else.";
  }
  else {
    // Default response
    response = `I'm not sure how to handle that request yet. Can you try rephrasing or ask me something about ${subject || 'assessment models'}?`;
    successful = false;
  }
  
  return {
    command,
    processed: true,
    successful,
    response,
    actions: actions.length > 0 ? actions : undefined,
    timestamp: Date.now()
  };
}

export default router;
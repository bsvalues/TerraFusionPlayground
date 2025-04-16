/**
 * AI Assistant Routes
 * 
 * API routes for the AI Assistant feature, allowing users to interact with
 * multiple AI providers (OpenAI, Anthropic, Perplexity) through a unified interface.
 */

import express from 'express';
import { z } from 'zod';
import { aiAssistantService } from '../services/ai-assistant-service';

const router = express.Router();

// Define request validation schema
const messageRequestSchema = z.object({
  message: z.string().min(1),
  context: z.object({
    recentMessages: z.array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        timestamp: z.number(),
      })
    ).optional(),
    currentPage: z.object({
      path: z.string(),
      title: z.string(),
      timestamp: z.number(),
    }).optional(),
    pageHistory: z.array(
      z.object({
        path: z.string(),
        title: z.string(),
        timestamp: z.number(),
      })
    ).optional(),
    recentQueries: z.array(z.string()).optional(),
  }).optional(),
  provider: z.enum(['openai', 'anthropic', 'perplexity']),
  options: z.object({
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().positive().optional(),
  }).optional(),
});

// Get available AI providers
router.get('/providers', (req, res) => {
  try {
    const providers = aiAssistantService.getAvailableProviders();
    res.json({
      providers,
      default: providers.length > 0 ? providers[0] : null,
    });
  } catch (error) {
    console.error('Error getting AI providers:', error);
    res.status(500).json({
      error: 'Failed to retrieve available AI providers',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Process message and get response
router.post('/message', async (req, res) => {
  try {
    // Validate request
    const validationResult = messageRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }
    
    const { message, context, provider, options } = validationResult.data;
    
    // Ensure provider is available
    if (!aiAssistantService.isProviderAvailable(provider)) {
      return res.status(400).json({
        error: `AI provider '${provider}' is not available`,
        availableProviders: aiAssistantService.getAvailableProviders(),
      });
    }
    
    // Generate response
    const response = await aiAssistantService.generateResponse({
      message,
      context,
      provider,
      options,
    });
    
    res.json(response);
  } catch (error) {
    console.error('Error processing AI assistant message:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
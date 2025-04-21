import { Router } from 'express';
import { z } from 'zod';
import { agentLearningService } from '../services/agent-learning-service';
import { AgentSystem } from '../services/agent-system';
import { LearningEventType, FeedbackSentiment } from '../../shared/schema';

/**
 * Create routes for the agent learning system
 */
export function createAgentLearningRoutes(agentSystem: AgentSystem) {
  const router = Router();

  /**
   * Get the status of the learning system
   */
  router.get('/status', (req, res) => {
    try {
      const learningStatus = {
        enabled: agentLearningService.config.enabled,
        providers: agentLearningService.config.providers,
        priorityThreshold: agentLearningService.config.priorityThreshold,
        knowledgeVerificationRequired: agentLearningService.config.knowledgeVerificationRequired,
      };
      
      res.json(learningStatus);
    } catch (error) {
      console.error('Error getting learning system status:', error);
      res.status(500).json({ 
        error: 'Failed to get learning system status',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Record a learning event
   */
  router.post('/events', async (req, res) => {
    try {
      // Validate request body
      const schema = z.object({
        agentName: z.string(),
        eventType: z.nativeEnum(LearningEventType),
        eventData: z.any(),
        sourceContext: z.any().optional(),
        priority: z.number().min(1).max(5).default(3)
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid request body',
          issues: result.error.issues
        });
      }

      const { agentName, eventType, eventData, sourceContext, priority } = result.data;
      
      const response = await agentSystem.recordAgentLearningEvent(
        agentName,
        eventType,
        eventData,
        sourceContext,
        priority
      );
      
      if (response.success) {
        res.status(201).json(response);
      } else {
        res.status(400).json(response);
      }
    } catch (error) {
      console.error('Error recording learning event:', error);
      res.status(500).json({ 
        error: 'Failed to record learning event',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Record user feedback
   */
  router.post('/feedback', async (req, res) => {
    try {
      // Validate request body
      const schema = z.object({
        agentName: z.string(),
        userId: z.number().optional(),
        conversationId: z.string().optional(),
        taskId: z.string().optional(),
        feedbackText: z.string().optional(),
        sentiment: z.nativeEnum(FeedbackSentiment).optional(),
        rating: z.number().min(1).max(5).optional(),
        categories: z.array(z.string()).optional()
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid request body',
          issues: result.error.issues
        });
      }

      const { agentName, ...feedbackData } = result.data;
      
      const response = await agentSystem.recordAgentFeedback(
        agentName,
        feedbackData
      );
      
      if (response.success) {
        res.status(201).json(response);
      } else {
        res.status(400).json(response);
      }
    } catch (error) {
      console.error('Error recording feedback:', error);
      res.status(500).json({ 
        error: 'Failed to record feedback',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get knowledge for an agent
   */
  router.get('/knowledge/:agentName', async (req, res) => {
    try {
      const { agentName } = req.params;
      const { type, query, verifiedOnly } = req.query;
      
      const response = await agentSystem.getAgentKnowledge(
        agentName,
        type ? String(type) : undefined,
        query ? String(query) : undefined,
        verifiedOnly === 'true'
      );
      
      if (response.success) {
        res.json(response);
      } else {
        res.status(400).json(response);
      }
    } catch (error) {
      console.error('Error getting agent knowledge:', error);
      res.status(500).json({ 
        error: 'Failed to get agent knowledge',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Add knowledge to an agent's knowledge base
   */
  router.post('/knowledge', async (req, res) => {
    try {
      // Validate request body
      const schema = z.object({
        agentName: z.string(),
        knowledgeType: z.string(),
        title: z.string(),
        content: z.string(),
        confidence: z.number().min(0).max(1).default(0.8),
        verified: z.boolean().default(false)
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid request body',
          issues: result.error.issues
        });
      }

      const { agentName, knowledgeType, title, content, confidence, verified } = result.data;
      
      // Get the agent ID
      const agent = agentSystem.getAgent(agentName);
      if (!agent) {
        return res.status(404).json({ 
          error: 'Agent not found',
          message: `Agent '${agentName}' not found`
        });
      }
      
      // Add knowledge
      const knowledge = await agentLearningService.addKnowledge(
        agent.id,
        knowledgeType,
        title,
        content,
        [],
        confidence,
        verified
      );
      
      res.status(201).json({
        success: true,
        knowledge
      });
    } catch (error) {
      console.error('Error adding knowledge:', error);
      res.status(500).json({ 
        error: 'Failed to add knowledge',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get performance metrics for an agent
   */
  router.get('/metrics/:agentName', async (req, res) => {
    try {
      const { agentName } = req.params;
      const { metricType, timeframe } = req.query;
      
      // Get the agent ID
      const agent = agentSystem.getAgent(agentName);
      if (!agent) {
        return res.status(404).json({ 
          error: 'Agent not found',
          message: `Agent '${agentName}' not found`
        });
      }
      
      // Get metrics from database using agent's ID
      const metrics = await agentLearningService.getAgentMetrics(
        agent.id,
        metricType ? String(metricType) : undefined,
        timeframe ? String(timeframe) : undefined
      );
      
      res.json({
        success: true,
        metrics,
        count: metrics.length
      });
    } catch (error) {
      console.error('Error getting agent metrics:', error);
      res.status(500).json({ 
        error: 'Failed to get agent metrics',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return router;
}
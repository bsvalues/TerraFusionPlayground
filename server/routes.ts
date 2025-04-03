import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertPropertySchema, 
  insertLandRecordSchema,
  insertImprovementSchema,
  insertFieldSchema,
  insertAppealSchema,
  insertAppealCommentSchema,
  insertAppealEvidenceSchema,
  insertAuditLogSchema,
  insertSystemActivitySchema
} from "@shared/schema";
import { processNaturalLanguageQuery, getSummaryFromNaturalLanguage } from "./services/langchain";
import { processNaturalLanguageWithAnthropic, getSummaryWithAnthropic } from "./services/anthropic";
import { PacsIntegration } from "./services/pacs-integration";
import { mappingIntegration } from "./services/mapping-integration";
import { notificationService, NotificationType } from "./services/notification-service";
import { perplexityService } from "./services/perplexity";
import { MCPService, MCPRequest } from "./services/mcp";
import { SecurityService } from "./services/security";
import { AuthService } from "./services/auth-service";
import { validateApiKey, verifyToken, requireScope, TokenScope } from "./middleware/auth-middleware";
import { PropertyStoryGenerator, PropertyStoryOptions } from "./services/property-story-generator";

export async function registerRoutes(app: Express): Promise<Server> {
  // Define API routes
  const apiRouter = app.route("/api");
  
  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
  });
  
  // Properties routes
  app.get("/api/properties", async (_req, res) => {
    try {
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });
  
  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(parseInt(req.params.id));
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });
  
  app.post("/api/properties", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "CREATE",
        entityType: "property",
        entityId: property.propertyId,
        details: { property },
        ipAddress: req.ip || "unknown"
      });
      
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid property data", errors: error.errors });
      }
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });
  
  app.patch("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updateProperty(id, validatedData);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "UPDATE",
        entityType: "property",
        entityId: property.propertyId,
        details: { updatedFields: Object.keys(validatedData) },
        ipAddress: req.ip || "unknown"
      });
      
      res.json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid property data", errors: error.errors });
      }
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });
  
  // Land Records routes
  app.get("/api/properties/:propertyId/land-records", async (req, res) => {
    try {
      const landRecords = await storage.getLandRecordsByPropertyId(req.params.propertyId);
      res.json(landRecords);
    } catch (error) {
      console.error("Error fetching land records:", error);
      res.status(500).json({ message: "Failed to fetch land records" });
    }
  });
  
  app.post("/api/land-records", async (req, res) => {
    try {
      const validatedData = insertLandRecordSchema.parse(req.body);
      const landRecord = await storage.createLandRecord(validatedData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "CREATE",
        entityType: "landRecord",
        entityId: landRecord.propertyId,
        details: { landRecord },
        ipAddress: req.ip || "unknown"
      });
      
      res.status(201).json(landRecord);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid land record data", errors: error.errors });
      }
      console.error("Error creating land record:", error);
      res.status(500).json({ message: "Failed to create land record" });
    }
  });
  
  // Improvements routes
  app.get("/api/properties/:propertyId/improvements", async (req, res) => {
    try {
      const improvements = await storage.getImprovementsByPropertyId(req.params.propertyId);
      res.json(improvements);
    } catch (error) {
      console.error("Error fetching improvements:", error);
      res.status(500).json({ message: "Failed to fetch improvements" });
    }
  });
  
  app.post("/api/improvements", async (req, res) => {
    try {
      const validatedData = insertImprovementSchema.parse(req.body);
      const improvement = await storage.createImprovement(validatedData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "CREATE",
        entityType: "improvement",
        entityId: improvement.propertyId,
        details: { improvement },
        ipAddress: req.ip || "unknown"
      });
      
      res.status(201).json(improvement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid improvement data", errors: error.errors });
      }
      console.error("Error creating improvement:", error);
      res.status(500).json({ message: "Failed to create improvement" });
    }
  });
  
  // Fields routes
  app.get("/api/properties/:propertyId/fields", async (req, res) => {
    try {
      const fields = await storage.getFieldsByPropertyId(req.params.propertyId);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching fields:", error);
      res.status(500).json({ message: "Failed to fetch fields" });
    }
  });
  
  app.post("/api/fields", async (req, res) => {
    try {
      const validatedData = insertFieldSchema.parse(req.body);
      const field = await storage.createField(validatedData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "CREATE",
        entityType: "field",
        entityId: field.propertyId,
        details: { field },
        ipAddress: req.ip || "unknown"
      });
      
      res.status(201).json(field);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid field data", errors: error.errors });
      }
      console.error("Error creating field:", error);
      res.status(500).json({ message: "Failed to create field" });
    }
  });
  
  // Appeals Management routes
  app.get("/api/properties/:propertyId/appeals", async (req, res) => {
    try {
      const appeals = await storage.getAppealsByPropertyId(req.params.propertyId);
      res.json(appeals);
    } catch (error) {
      console.error("Error fetching appeals:", error);
      res.status(500).json({ message: "Failed to fetch appeals" });
    }
  });
  
  app.post("/api/appeals", async (req, res) => {
    try {
      const validatedData = insertAppealSchema.parse(req.body);
      const appeal = await storage.createAppeal(validatedData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: validatedData.userId,
        action: "CREATE",
        entityType: "appeal",
        entityId: appeal.propertyId,
        details: { appeal },
        ipAddress: req.ip || "unknown"
      });
      
      res.status(201).json(appeal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appeal data", errors: error.errors });
      }
      console.error("Error creating appeal:", error);
      res.status(500).json({ message: "Failed to create appeal" });
    }
  });
  
  app.patch("/api/appeals/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Status is required and must be a string" });
      }
      
      const appeal = await storage.updateAppealStatus(id, status);
      
      if (!appeal) {
        return res.status(404).json({ message: "Appeal not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "UPDATE",
        entityType: "appealStatus",
        entityId: appeal.propertyId,
        details: { appealId: id, newStatus: status },
        ipAddress: req.ip || "unknown"
      });
      
      res.json(appeal);
    } catch (error) {
      console.error("Error updating appeal status:", error);
      res.status(500).json({ message: "Failed to update appeal status" });
    }
  });
  
  // Appeal comments routes
  app.get("/api/appeals/:appealId/comments", async (req, res) => {
    try {
      const appealId = parseInt(req.params.appealId);
      const comments = await storage.getAppealCommentsByAppealId(appealId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching appeal comments:", error);
      res.status(500).json({ message: "Failed to fetch appeal comments" });
    }
  });
  
  app.post("/api/appeal-comments", async (req, res) => {
    try {
      const validatedData = insertAppealCommentSchema.parse(req.body);
      const comment = await storage.createAppealComment(validatedData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: validatedData.userId,
        action: "CREATE",
        entityType: "appealComment",
        entityId: comment.appealId.toString(),
        details: { comment },
        ipAddress: req.ip || "unknown"
      });
      
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appeal comment data", errors: error.errors });
      }
      console.error("Error creating appeal comment:", error);
      res.status(500).json({ message: "Failed to create appeal comment" });
    }
  });
  
  // Appeal evidence routes
  app.get("/api/appeals/:appealId/evidence", async (req, res) => {
    try {
      const appealId = parseInt(req.params.appealId);
      const evidence = await storage.getAppealEvidenceByAppealId(appealId);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching appeal evidence:", error);
      res.status(500).json({ message: "Failed to fetch appeal evidence" });
    }
  });
  
  app.post("/api/appeal-evidence", async (req, res) => {
    try {
      const validatedData = insertAppealEvidenceSchema.parse(req.body);
      const evidence = await storage.createAppealEvidence(validatedData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: validatedData.uploadedBy,
        action: "CREATE",
        entityType: "appealEvidence",
        entityId: evidence.appealId.toString(),
        details: { evidence },
        ipAddress: req.ip || "unknown"
      });
      
      res.status(201).json(evidence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appeal evidence data", errors: error.errors });
      }
      console.error("Error creating appeal evidence:", error);
      res.status(500).json({ message: "Failed to create appeal evidence" });
    }
  });
  
  // Audit Logs route
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const auditLogs = await storage.getAuditLogs(limit);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });
  
  // AI Agents routes
  app.get("/api/ai-agents", async (_req, res) => {
    try {
      const agents = await storage.getAllAiAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error fetching AI agents:", error);
      res.status(500).json({ message: "Failed to fetch AI agents" });
    }
  });
  
  app.patch("/api/ai-agents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, performance } = req.body;
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Status is required and must be a string" });
      }
      
      if (performance !== undefined && (typeof performance !== 'number' || performance < 0 || performance > 100)) {
        return res.status(400).json({ message: "Performance must be a number between 0 and 100" });
      }
      
      const agent = await storage.updateAiAgentStatus(id, status, performance || 0);
      
      if (!agent) {
        return res.status(404).json({ message: "AI Agent not found" });
      }
      
      res.json(agent);
    } catch (error) {
      console.error("Error updating AI agent:", error);
      res.status(500).json({ message: "Failed to update AI agent" });
    }
  });
  
  // System Activities route
  app.get("/api/system-activities", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const activities = await storage.getSystemActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching system activities:", error);
      res.status(500).json({ message: "Failed to fetch system activities" });
    }
  });
  
  // PACS Modules routes
  app.get("/api/pacs-modules", async (_req, res) => {
    try {
      const modules = await storage.getAllPacsModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching PACS modules:", error);
      res.status(500).json({ message: "Failed to fetch PACS modules" });
    }
  });
  
  app.post("/api/pacs-modules", async (req, res) => {
    try {
      // Create a new PACS module
      const module = await storage.upsertPacsModule(req.body);
      res.status(200).json(module);
    } catch (error) {
      console.error("Error creating PACS module:", error);
      res.status(500).json({ message: "Failed to create PACS module" });
    }
  });
  
  // Initialize PACS modules from the Benton County Washington CSV
  app.post("/api/pacs-modules/initialize", async (_req, res) => {
    try {
      // This would typically read from a CSV file but we're hardcoding for now
      // Based on PACS_Agent_Module_Map.csv
      const pacsModules = [
        { moduleName: "Land", source: "PACS WA", integration: "active", description: "Land record management for Benton County" },
        { moduleName: "Improvements", source: "PACS WA", integration: "active", description: "Benton County property improvements tracking" },
        { moduleName: "Fields", source: "PACS WA", integration: "active", description: "Custom field definitions for Benton County properties" },
        { moduleName: "Destroyed Property", source: "PACS WA", integration: "active", description: "Tracking of destroyed properties in Benton County" },
        { moduleName: "Imports", source: "PACS WA", integration: "active", description: "Data import functionality for Benton County" },
        { moduleName: "GIS", source: "PACS WA", integration: "active", description: "Geographic Information System integration" },
        { moduleName: "Valuation Methods", source: "PACS WA", integration: "active", description: "Property valuation methodologies" },
        { moduleName: "Comparable Sales", source: "PACS WA", integration: "active", description: "Comparable property sales data" },
        { moduleName: "Land Schedules", source: "PACS WA", integration: "active", description: "Schedules for land valuation" },
        { moduleName: "Improvement Schedules", source: "PACS WA", integration: "active", description: "Schedules for improvement valuation" },
        { moduleName: "Income", source: "PACS WA", integration: "pending", description: "Income approach for commercial property assessment" },
        { moduleName: "Building Permits", source: "PACS WA", integration: "active", description: "Building permit tracking and integration" },
        { moduleName: "Appeal Processing", source: "PACS WA", integration: "active", description: "Processing property assessment appeals" },
        { moduleName: "Inquiry Processing", source: "PACS WA", integration: "active", description: "Processing taxpayer inquiries" },
        { moduleName: "Tax Statements", source: "PACS WA", integration: "active", description: "Generation of tax statements" },
        { moduleName: "DOR Reports", source: "PACS WA", integration: "active", description: "Washington Department of Revenue reports" },
        { moduleName: "Levy Certification", source: "PACS WA", integration: "active", description: "Certification of tax levies" },
        { moduleName: "Current Use Properties", source: "PACS WA", integration: "active", description: "Management of current use properties" },
        { moduleName: "Data Entry", source: "PACS WA", integration: "active", description: "Data entry interface and validation" },
        { moduleName: "Panel Information", source: "PACS WA", integration: "active", description: "Property panel information management" }
      ];
      
      for (const module of pacsModules) {
        await storage.upsertPacsModule(module);
      }
      
      res.status(200).json({ message: "PACS modules initialized successfully" });
    } catch (error) {
      console.error("Error initializing PACS modules:", error);
      res.status(500).json({ message: "Failed to initialize PACS modules" });
    }
  });
  
  // MCP routes - Enhanced with JWT authentication
  
  /**
   * Endpoint to get API token using an API key
   * This endpoint allows clients to exchange API keys for short-lived JWT tokens
   */
  app.post("/api/auth/token", async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      // Generate token from API key
      const token = authService.generateToken(apiKey);
      
      if (!token) {
        return res.status(401).json({ message: "Invalid API key" });
      }
      
      // Return the token
      res.json({ token });
      
    } catch (error) {
      console.error("Error generating token:", error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  });
  
  /**
   * Get available MCP tools - Read-only access required
   */
  app.get("/api/mcp/tools", validateApiKey, requireScope(TokenScope.READ_ONLY), async (req, res) => {
    try {
      const tools = mcpService.getAvailableTools().map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }));
      
      // Log the successful authenticated access
      if (req.user) {
        await securityService.logSecurityEvent(
          req.user.userId,
          "MCP_TOOLS_ACCESS",
          "mcp_tools",
          null,
          { username: req.user.username, role: req.user.role },
          req.ip || "unknown"
        );
      }
      
      res.json(tools);
    } catch (error) {
      console.error("Error fetching MCP tools:", error);
      res.status(500).json({ message: "Failed to fetch MCP tools" });
    }
  });
  
  /**
   * Execute MCP tools - Read-write access required for most operations
   */
  app.post("/api/mcp/execute", validateApiKey, requireScope(TokenScope.READ_WRITE), async (req, res) => {
    try {
      // Get client IP for rate limiting and security logging
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      
      // Apply rate limiting - protect against brute force and DoS attacks
      const rateLimitCheck = securityService.checkRateLimit(clientIp, 'mcp_execute');
      if (!rateLimitCheck.allowed) {
        console.warn(`Rate limit exceeded for IP: ${clientIp} on MCP execute endpoint`);
        
        // Log the rate limit violation
        await securityService.logSecurityEvent(
          req.user?.userId || 1, // Use authenticated user ID if available
          "RATE_LIMIT_EXCEEDED",
          "mcp_request",
          null,
          { endpoint: "/api/mcp/execute", ipAddress: clientIp },
          clientIp
        );
        
        return res.status(429).json({
          success: false,
          message: rateLimitCheck.message || "Too many requests. Please try again later."
        });
      }
      
      const mcpRequest: MCPRequest = req.body;
      
      if (!mcpRequest.toolName) {
        return res.status(400).json({ message: "Tool name is required" });
      }
      
      // Pre-execution security checks
      // 1. Check for basic structure - prevent malformed requests
      if (!mcpRequest.parameters || typeof mcpRequest.parameters !== 'object') {
        await securityService.logSecurityEvent(
          req.user?.userId || 1, // Use authenticated user ID  
          "MALFORMED_REQUEST",
          "mcp_request",
          null,
          { 
            mcpRequest,
            username: req.user?.username || "unknown"
          },
          clientIp
        );
        return res.status(400).json({ 
          message: "Invalid request format. 'parameters' must be an object"
        });
      }
      
      // 2. Check for suspicious toolName values (SQL Injection via toolName)
      if (securityService.containsSqlInjection(mcpRequest.toolName)) {
        await securityService.logSecurityEvent(
          req.user?.userId || 1, // Use authenticated user ID
          "SQL_INJECTION_ATTEMPT",
          "mcp_request",
          null,
          { 
            toolName: mcpRequest.toolName,
            remoteAddress: clientIp,
            username: req.user?.username || "unknown"
          },
          clientIp
        );
        
        // Don't reveal that we detected an injection attempt
        return res.status(404).json({ 
          message: "Tool not found" 
        });
      }
      
      // Execute the MCP request with enhanced security
      const result = await mcpService.executeRequest(mcpRequest);
      
      // If there was a security violation, log it and return an appropriate status code
      if (!result.success && result.securityViolation) {
        // Return a 403 Forbidden for security violations
        return res.status(403).json({
          message: result.error,
          toolName: mcpRequest.toolName,
          success: false
        });
      }
      
      // If validation error, return 400 Bad Request
      if (!result.success && result.validationError) {
        return res.status(400).json({
          message: result.error,
          toolName: mcpRequest.toolName,
          success: false,
          validation: result.validationError
        });
      }
      
      // Create audit log for successful MCP request
      if (result.success) {
        await storage.createAuditLog({
          userId: req.user?.userId || 1, // Use authenticated user ID
          action: "EXECUTE",
          entityType: "mcp_tool",
          entityId: null,
          details: { 
            toolName: mcpRequest.toolName,
            success: result.success,
            username: req.user?.username || "unknown"
          },
          ipAddress: clientIp
        });
        
        // Send notification if this is a significant event
        if (mcpRequest.toolName.includes("Property") || mcpRequest.toolName.includes("Appeal")) {
          // Ensure toolName is never undefined for notification context
          const toolContext = mcpRequest.toolName || "unknown";
          
          notificationService.sendUserNotification(
            req.user?.userId.toString() || "1", // Use authenticated user ID
            NotificationType.SYSTEM_ALERT,
            "MCP Tool Executed",
            `MCP tool ${mcpRequest.toolName} was executed by ${req.user?.username || "admin"}`,
            "mcp_tool",
            toolContext,
            'medium'
          );
        }
      }
      
      // Return the result
      res.json(result);
    } catch (error) {
      console.error("Error executing MCP request:", error);
      res.status(500).json({ message: "Failed to execute MCP request" });
    }
  });
  
  // Natural Language Query routes
  app.post("/api/natural-language/query", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required and must be a string" });
      }
      
      // Try Anthropic first (preferred), and fall back to OpenAI if it fails
      let result;
      try {
        // Check if Anthropic API key is available
        if (process.env.ANTHROPIC_API_KEY) {
          result = await processNaturalLanguageWithAnthropic(query);
        } else {
          // Fall back to OpenAI
          result = await processNaturalLanguageQuery(query);
        }
      } catch (error) {
        console.error("Error with primary NLP service, trying fallback:", error);
        
        // If the first attempt fails, try the other service
        if (process.env.ANTHROPIC_API_KEY) {
          result = await processNaturalLanguageQuery(query);
        } else {
          result = await processNaturalLanguageWithAnthropic(query);
        }
      }
      
      // Create audit log for the query
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "QUERY",
        entityType: "naturalLanguage",
        entityId: null,
        details: { query, resultCount: result.count },
        ipAddress: req.ip || "unknown"
      });
      
      // Create system activity for the NLP query
      await storage.createSystemActivity({
        agentId: 3, // Assuming NLP Agent ID
        activity: `Processed natural language query: "${query}"`,
        entityType: "query",
        entityId: null
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error processing natural language query:", error);
      res.status(500).json({ message: "Failed to process natural language query" });
    }
  });
  
  app.post("/api/natural-language/summary", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required and must be a string" });
      }
      
      // Try Anthropic first (preferred), and fall back to OpenAI if it fails
      let result;
      try {
        // Check if Anthropic API key is available
        if (process.env.ANTHROPIC_API_KEY) {
          result = await getSummaryWithAnthropic(query);
        } else {
          // Fall back to OpenAI
          result = await getSummaryFromNaturalLanguage(query);
        }
      } catch (error) {
        console.error("Error with primary NLP service for summary, trying fallback:", error);
        
        // If the first attempt fails, try the other service
        if (process.env.ANTHROPIC_API_KEY) {
          result = await getSummaryFromNaturalLanguage(query);
        } else {
          result = await getSummaryWithAnthropic(query);
        }
      }
      
      // Create audit log for the summary
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "SUMMARY",
        entityType: "naturalLanguage",
        entityId: null,
        details: { query, summary: result.summary },
        ipAddress: req.ip || "unknown"
      });
      
      // Create system activity for the summary
      await storage.createSystemActivity({
        agentId: 3, // Assuming NLP Agent ID
        activity: `Generated summary for query: "${query}"`,
        entityType: "summary",
        entityId: null
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error generating natural language summary:", error);
      res.status(500).json({ message: "Failed to generate natural language summary" });
    }
  });

  // Perplexity API routes
  app.post("/api/perplexity/query", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required and must be a string" });
      }
      
      const result = await perplexityService.textCompletion(query, {
        systemPrompt: "You are a Property Assessment Assistant for Benton County, Washington. Provide helpful, accurate information about property assessments, tax calculations, and related processes.",
        temperature: 0.2
      });
      
      // Create audit log for the query
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "QUERY",
        entityType: "perplexity",
        entityId: null,
        details: { query, result: result.substring(0, 100) + "..." },
        ipAddress: req.ip || "unknown"
      });
      
      res.json({ result });
    } catch (error) {
      console.error("Error processing Perplexity query:", error);
      res.status(500).json({ message: "Failed to process query with Perplexity API" });
    }
  });
  
  app.post("/api/perplexity/property-analysis", async (req, res) => {
    try {
      const { propertyId, analysisType } = req.body;
      
      if (!propertyId || !analysisType) {
        return res.status(400).json({ message: "Property ID and analysis type are required" });
      }
      
      // Get property data
      const property = await storage.getPropertyByPropertyId(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Get related data
      const landRecords = await storage.getLandRecordsByPropertyId(propertyId);
      const improvements = await storage.getImprovementsByPropertyId(propertyId);
      
      // Prepare complete property data for analysis
      const propertyData = {
        ...property,
        landRecords,
        improvements
      };
      
      const result = await perplexityService.analyzePropertyData(propertyData, analysisType);
      
      // Create audit log for the analysis
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "ANALYZE",
        entityType: "property",
        entityId: propertyId,
        details: { analysisType, result: result.substring(0, 100) + "..." },
        ipAddress: req.ip || "unknown"
      });
      
      res.json({ result });
    } catch (error) {
      console.error("Error analyzing property with Perplexity:", error);
      res.status(500).json({ message: "Failed to analyze property with Perplexity API" });
    }
  });
  
  app.post("/api/perplexity/valuation-insights", async (req, res) => {
    try {
      const { propertyId } = req.body;
      
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }
      
      // Get property data
      const property = await storage.getPropertyByPropertyId(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Get related data
      const landRecords = await storage.getLandRecordsByPropertyId(propertyId);
      const improvements = await storage.getImprovementsByPropertyId(propertyId);
      const fields = await storage.getFieldsByPropertyId(propertyId);
      
      // Prepare complete property data for valuation insights
      const propertyData = {
        ...property,
        landRecords,
        improvements,
        fields
      };
      
      const result = await perplexityService.getPropertyValuationInsights(propertyId, propertyData);
      
      // Create audit log for the valuation insights
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "VALUATION_INSIGHTS",
        entityType: "property",
        entityId: propertyId,
        details: { result: result.substring(0, 100) + "..." },
        ipAddress: req.ip || "unknown"
      });
      
      res.json({ result });
    } catch (error) {
      console.error("Error getting valuation insights with Perplexity:", error);
      res.status(500).json({ message: "Failed to get valuation insights with Perplexity API" });
    }
  });

  // Mapping integration routes
  app.get("/api/mapping/esri-config", (_req, res) => {
    try {
      const config = mappingIntegration.getEsriMapConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching ESRI map config:", error);
      res.status(500).json({ message: "Failed to fetch ESRI map config" });
    }
  });
  
  app.get("/api/mapping/google-config", (_req, res) => {
    try {
      const config = mappingIntegration.getGoogleMapConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching Google map config:", error);
      res.status(500).json({ message: "Failed to fetch Google map config" });
    }
  });
  
  app.get("/api/mapping/pictometry-config", (_req, res) => {
    try {
      const config = mappingIntegration.getPictometryConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching Pictometry config:", error);
      res.status(500).json({ message: "Failed to fetch Pictometry config" });
    }
  });
  
  app.get("/api/mapping/property/:propertyId", async (req, res) => {
    try {
      const property = await storage.getPropertyByPropertyId(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      const parcelInfo = await mappingIntegration.findParcelByPropertyId(req.params.propertyId);
      res.json(parcelInfo);
    } catch (error) {
      console.error("Error fetching property map data:", error);
      res.status(500).json({ message: "Failed to fetch property map data" });
    }
  });
  
  app.get("/api/mapping/google-url", (req, res) => {
    try {
      const { address } = req.query;
      if (!address || typeof address !== 'string') {
        return res.status(400).json({ message: "Address is required" });
      }
      
      const url = mappingIntegration.generateGoogleMapsUrl(address);
      res.json({ url });
    } catch (error) {
      console.error("Error generating Google Maps URL:", error);
      res.status(500).json({ message: "Failed to generate Google Maps URL" });
    }
  });
  
  app.get("/api/mapping/pictometry-url", (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Valid lat and lng coordinates are required" });
      }
      
      const url = mappingIntegration.generatePictometryUrl(lat, lng);
      res.json({ url });
    } catch (error) {
      console.error("Error generating Pictometry URL:", error);
      res.status(500).json({ message: "Failed to generate Pictometry URL" });
    }
  });
  
  // PACS Integration routes
  app.get("/api/pacs/property/:propertyId/details", async (req, res) => {
    try {
      const details = await pacsIntegration.getPropertyFullDetails(req.params.propertyId);
      if (!details) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(details);
    } catch (error) {
      console.error("Error fetching property full details:", error);
      res.status(500).json({ message: "Failed to fetch property full details" });
    }
  });
  
  app.get("/api/pacs/properties/value-range", async (req, res) => {
    try {
      const minValue = parseFloat(req.query.min as string);
      const maxValue = parseFloat(req.query.max as string);
      
      if (isNaN(minValue) || isNaN(maxValue)) {
        return res.status(400).json({ message: "Valid min and max values are required" });
      }
      
      const properties = await pacsIntegration.getPropertiesByValueRange(minValue, maxValue);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties by value range:", error);
      res.status(500).json({ message: "Failed to fetch properties by value range" });
    }
  });
  
  app.get("/api/pacs/properties/type/:type", async (req, res) => {
    try {
      const properties = await pacsIntegration.getPropertiesByType(req.params.type);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties by type:", error);
      res.status(500).json({ message: "Failed to fetch properties by type" });
    }
  });
  
  app.get("/api/pacs/properties/status/:status", async (req, res) => {
    try {
      const properties = await pacsIntegration.getPropertiesByStatus(req.params.status);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties by status:", error);
      res.status(500).json({ message: "Failed to fetch properties by status" });
    }
  });
  
  app.get("/api/pacs/land-records/zoning/:zoning", async (req, res) => {
    try {
      const landRecords = await pacsIntegration.getLandRecordsByZone(req.params.zoning);
      res.json(landRecords);
    } catch (error) {
      console.error("Error fetching land records by zoning:", error);
      res.status(500).json({ message: "Failed to fetch land records by zoning" });
    }
  });
  
  app.get("/api/pacs/improvements/type/:type", async (req, res) => {
    try {
      const improvements = await pacsIntegration.getImprovementsByType(req.params.type);
      res.json(improvements);
    } catch (error) {
      console.error("Error fetching improvements by type:", error);
      res.status(500).json({ message: "Failed to fetch improvements by type" });
    }
  });
  
  app.get("/api/pacs/improvements/year-built-range", async (req, res) => {
    try {
      const minYear = parseInt(req.query.min as string);
      const maxYear = parseInt(req.query.max as string);
      
      if (isNaN(minYear) || isNaN(maxYear)) {
        return res.status(400).json({ message: "Valid min and max years are required" });
      }
      
      const improvements = await pacsIntegration.getImprovementsByYearBuiltRange(minYear, maxYear);
      res.json(improvements);
    } catch (error) {
      console.error("Error fetching improvements by year built range:", error);
      res.status(500).json({ message: "Failed to fetch improvements by year built range" });
    }
  });
  
  app.get("/api/pacs/appeals/active", async (_req, res) => {
    try {
      const appeals = await pacsIntegration.getActiveAppeals();
      res.json(appeals);
    } catch (error) {
      console.error("Error fetching active appeals:", error);
      res.status(500).json({ message: "Failed to fetch active appeals" });
    }
  });
  
  app.get("/api/pacs/properties/recent-changes", async (_req, res) => {
    try {
      const properties = await pacsIntegration.getRecentPropertyChanges();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching recent property changes:", error);
      res.status(500).json({ message: "Failed to fetch recent property changes" });
    }
  });
  
  // Notification routes
  app.get("/api/notifications/user/:userId", (req, res) => {
    try {
      const notifications = notificationService.getUserNotifications(req.params.userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      res.status(500).json({ message: "Failed to fetch user notifications" });
    }
  });
  
  app.get("/api/notifications/system", (_req, res) => {
    try {
      const notifications = notificationService.getSystemNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching system notifications:", error);
      res.status(500).json({ message: "Failed to fetch system notifications" });
    }
  });
  
  app.post("/api/notifications/mark-read", (req, res) => {
    try {
      const { userId, notificationId } = req.body;
      
      if (!userId || !notificationId) {
        return res.status(400).json({ message: "User ID and notification ID are required" });
      }
      
      const success = notificationService.markNotificationAsRead(userId, notificationId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  
  // Create a system notification (for testing)
  app.post("/api/notifications/system", (req, res) => {
    try {
      const { title, message, type, entityType, entityId } = req.body;
      
      if (!title || !message || !type) {
        return res.status(400).json({ message: "Title, message, and type are required" });
      }
      
      // Validate notification type
      if (!Object.values(NotificationType).includes(type)) {
        return res.status(400).json({ 
          message: "Invalid notification type. Valid types: " + 
            Object.values(NotificationType).join(", ") 
        });
      }
      
      const notification = notificationService.broadcastSystemNotification(
        type as NotificationType,
        title,
        message,
        entityType,
        entityId,
        'medium'
      );
      
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating system notification:", error);
      res.status(500).json({ message: "Failed to create system notification" });
    }
  });
  
  // Initialize property story generator
  const propertyStoryGenerator = new PropertyStoryGenerator(storage);
  
  /**
   * Property Story Generator routes
   * AI-powered narrative descriptions of properties
   */
  
  // Generate a story for a single property
  app.get("/api/property-stories/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      
      // Parse options from query parameters
      const options: PropertyStoryOptions = {
        tone: req.query.tone as any,
        focus: req.query.focus as any,
        includeImprovements: req.query.includeImprovements === 'true',
        includeLandRecords: req.query.includeLandRecords === 'true',
        includeFields: req.query.includeFields === 'true',
        maxLength: req.query.maxLength ? parseInt(req.query.maxLength as string) : undefined
      };
      
      // Generate the property story
      const result = await propertyStoryGenerator.generatePropertyStory(propertyId, options);
      
      // Create audit log
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "GENERATE",
        entityType: "propertyStory",
        entityId: propertyId,
        details: { options },
        ipAddress: req.ip || "unknown"
      });
      
      // Return the result
      res.json(result);
    } catch (error) {
      console.error('Error generating property story:', error);
      res.status(500).json({ 
        error: 'Failed to generate property story',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Generate stories for multiple properties
  app.post("/api/property-stories/multiple", async (req, res) => {
    try {
      const { propertyIds, options } = req.body;
      
      // Validate input
      if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
        return res.status(400).json({ error: 'Property IDs array is required' });
      }
      
      // Generate stories for multiple properties
      const results = await propertyStoryGenerator.generateMultiplePropertyStories(
        propertyIds,
        options || {}
      );
      
      // Create audit log
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "GENERATE_MULTIPLE",
        entityType: "propertyStory",
        entityId: propertyIds.join(','),
        details: { propertyIds, options },
        ipAddress: req.ip || "unknown"
      });
      
      // Return the results
      res.json(results);
    } catch (error) {
      console.error('Error generating multiple property stories:', error);
      res.status(500).json({ 
        error: 'Failed to generate multiple property stories',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Generate a comparison between multiple properties
  app.post("/api/property-stories/compare", async (req, res) => {
    try {
      const { propertyIds, options } = req.body;
      
      // Validate input
      if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length < 2) {
        return res.status(400).json({ error: 'At least two property IDs are required for comparison' });
      }
      
      // Generate comparison
      const result = await propertyStoryGenerator.generateComparisonStory(
        propertyIds,
        options || {}
      );
      
      // Create audit log
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "GENERATE_COMPARISON",
        entityType: "propertyStory",
        entityId: propertyIds.join(','),
        details: { propertyIds, options },
        ipAddress: req.ip || "unknown"
      });
      
      // Return the result
      res.json(result);
    } catch (error) {
      console.error('Error generating property comparison:', error);
      res.status(500).json({ 
        error: 'Failed to generate property comparison',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Create HTTP server and initialize WebSocket for real-time notifications
  const httpServer = createServer(app);
  
  // Initialize notification service with the HTTP server
  notificationService.initialize(httpServer);
  
  return httpServer;
}

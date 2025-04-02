import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertPropertySchema, 
  insertLandRecordSchema,
  insertImprovementSchema,
  insertFieldSchema,
  insertProtestSchema,
  insertAuditLogSchema,
  insertSystemActivitySchema
} from "@shared/schema";

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
        ipAddress: req.ip
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
        ipAddress: req.ip
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
        ipAddress: req.ip
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
        ipAddress: req.ip
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
        ipAddress: req.ip
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
  
  // Protests routes
  app.get("/api/properties/:propertyId/protests", async (req, res) => {
    try {
      const protests = await storage.getProtestsByPropertyId(req.params.propertyId);
      res.json(protests);
    } catch (error) {
      console.error("Error fetching protests:", error);
      res.status(500).json({ message: "Failed to fetch protests" });
    }
  });
  
  app.post("/api/protests", async (req, res) => {
    try {
      const validatedData = insertProtestSchema.parse(req.body);
      const protest = await storage.createProtest(validatedData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: validatedData.userId,
        action: "CREATE",
        entityType: "protest",
        entityId: protest.propertyId,
        details: { protest },
        ipAddress: req.ip
      });
      
      res.status(201).json(protest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid protest data", errors: error.errors });
      }
      console.error("Error creating protest:", error);
      res.status(500).json({ message: "Failed to create protest" });
    }
  });
  
  app.patch("/api/protests/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Status is required and must be a string" });
      }
      
      const protest = await storage.updateProtestStatus(id, status);
      
      if (!protest) {
        return res.status(404).json({ message: "Protest not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId: 1, // Assuming admin user
        action: "UPDATE",
        entityType: "protestStatus",
        entityId: protest.propertyId,
        details: { protestId: id, newStatus: status },
        ipAddress: req.ip
      });
      
      res.json(protest);
    } catch (error) {
      console.error("Error updating protest status:", error);
      res.status(500).json({ message: "Failed to update protest status" });
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
  
  // Initialize PACS modules from the provided CSV
  app.post("/api/pacs-modules/initialize", async (_req, res) => {
    try {
      // This would typically read from a file or external source
      // For demonstration, we'll manually create some modules
      const pacsModules = [
        { moduleName: "Land", source: "PACS WA", integration: "active", description: "Land record management" },
        { moduleName: "Improvements", source: "PACS WA", integration: "active", description: "Property improvements tracking" },
        { moduleName: "Fields", source: "PACS WA", integration: "active", description: "Custom field definitions" },
        { moduleName: "Destroyed Property", source: "PACS WA", integration: "pending", description: "Tracking of destroyed properties" },
        { moduleName: "Imports", source: "PACS WA", integration: "active", description: "Data import functionality" }
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

  const httpServer = createServer(app);
  return httpServer;
}

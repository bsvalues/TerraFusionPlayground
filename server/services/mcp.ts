/**
 * Model Context Protocol (MCP) Service
 * 
 * This service implements the Model Context Protocol for the Benton County Assessor's Office.
 * It provides a standardized interface for AI models to interact with data sources and tools,
 * enabling more powerful and context-aware AI assistance for property assessment processes.
 * 
 * Enhanced with security measures to protect against injection attacks and other vulnerabilities
 * demonstrated in the ICSF simulation labs.
 */

import { storage } from "../storage";
import { Property, LandRecord, Improvement, Field, Appeal, PacsModule } from "@shared/schema";
import { pacsIntegration } from "./pacs-integration";
import { mappingIntegration } from "./mapping-integration";
import { securityService } from "./security";
import { z } from "zod";

/**
 * Defines the structure of a tool available to the MCP framework
 */
export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

/**
 * Defines the structure of an MCP request
 */
export interface MCPRequest {
  toolName: string;
  parameters: Record<string, any>;
}

/**
 * Main class for MCP implementation
 */
export class MCPService {
  private tools: Map<string, MCPTool> = new Map();
  
  constructor() {
    this.registerTools();
  }
  
  /**
   * Register all available tools for the MCP framework
   */
  private registerTools() {
    // Database schema tools
    this.registerTool({
      name: "getSchema",
      description: "Get the database schema for property records",
      parameters: {},
      handler: async () => this.getSchemaInfo()
    });
    
    // Property query tools
    this.registerTool({
      name: "getProperties",
      description: "Get all properties or filter by criteria",
      parameters: {
        address: "Optional string to filter properties by address",
        propertyType: "Optional string to filter properties by type",
        minValue: "Optional number to filter properties by minimum value",
        maxValue: "Optional number to filter properties by maximum value",
        status: "Optional string to filter properties by status",
        limit: "Optional number to limit the number of results"
      },
      handler: async (params) => this.getProperties(params)
    });
    
    this.registerTool({
      name: "getPropertyById",
      description: "Get a property by its ID",
      parameters: {
        propertyId: "String representing the property ID"
      },
      handler: async (params) => this.getPropertyById(params.propertyId)
    });
    
    // Land record tools
    this.registerTool({
      name: "getLandRecordsByZone",
      description: "Get land records by zoning classification",
      parameters: {
        zoning: "String representing the zoning classification"
      },
      handler: async (params) => pacsIntegration.getLandRecordsByZone(params.zoning)
    });
    
    // Improvement tools
    this.registerTool({
      name: "getImprovementsByType",
      description: "Get improvements by type",
      parameters: {
        improvementType: "String representing the improvement type"
      },
      handler: async (params) => pacsIntegration.getImprovementsByType(params.improvementType)
    });
    
    this.registerTool({
      name: "getImprovementsByYearBuiltRange",
      description: "Get improvements by year built range",
      parameters: {
        minYear: "Number representing the minimum year built",
        maxYear: "Number representing the maximum year built"
      },
      handler: async (params) => pacsIntegration.getImprovementsByYearBuiltRange(
        params.minYear, 
        params.maxYear
      )
    });
    
    // Appeal tools
    this.registerTool({
      name: "getActiveAppeals",
      description: "Get all active appeals with property information",
      parameters: {},
      handler: async () => pacsIntegration.getActiveAppeals()
    });
    
    // For backward compatibility
    this.registerTool({
      name: "getActiveProtests",
      description: "Get all active protests with property information (deprecated, use getActiveAppeals)",
      parameters: {},
      handler: async () => pacsIntegration.getActiveAppeals()
    });
    
    // Value analysis tools
    this.registerTool({
      name: "getPropertiesByValueRange",
      description: "Get properties within a specified value range",
      parameters: {
        minValue: "Number representing the minimum property value",
        maxValue: "Number representing the maximum property value"
      },
      handler: async (params) => pacsIntegration.getPropertiesByValueRange(
        params.minValue,
        params.maxValue
      )
    });
    
    // Map integration tools
    this.registerTool({
      name: "generateMapUrl",
      description: "Generate map URLs for a property based on ID or address",
      parameters: {
        propertyId: "Optional string representing the property ID",
        address: "Optional string representing the property address",
        mapType: "String representing the map type (esri, google, pictometry)"
      },
      handler: async (params) => this.generateMapUrl(params)
    });
    
    // PACS module tools
    this.registerTool({
      name: "getPacsModules",
      description: "Get information about PACS modules",
      parameters: {
        filter: {
          moduleName: "Optional string to filter by module name",
          integration: "Optional string to filter by integration status"
        }
      },
      handler: async (params) => this.getPacsModules(params)
    });
    
    // Property full details tool
    this.registerTool({
      name: "getPropertyFullDetails",
      description: "Get comprehensive details about a property including land records, improvements, and fields",
      parameters: {
        propertyId: "String representing the property ID"
      },
      handler: async (params) => pacsIntegration.getPropertyFullDetails(params.propertyId)
    });
  }
  
  /**
   * Register a new tool in the MCP framework
   */
  private registerTool(tool: MCPTool) {
    this.tools.set(tool.name, tool);
  }
  
  /**
   * Get all available tools
   */
  public getAvailableTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Execute an MCP request with enhanced security validation
   * Implements protections against injection attacks demonstrated in ICSF labs
   */
  public async executeRequest(request: MCPRequest): Promise<any> {
    const { toolName, parameters } = request;
    
    // Validate tool name exists
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    try {
      // Log the tool execution request
      console.log(`Received MCP tool execution request: ${toolName}`);
      
      // Security checks based on ICSF simulation labs
      
      // 1. Check for XSS payloads in string parameters - Appeal Trigger Abuse Lab
      const stringParams = Object.entries(parameters)
        .filter(([_, value]) => typeof value === 'string')
        .map(([key, value]) => ({ key, value: value as string }));
      
      const xssAttempts = stringParams.filter(p => securityService.containsXss(p.value));
      if (xssAttempts.length > 0) {
        const violationDetails = {
          toolName,
          parameters: request.parameters,
          violations: xssAttempts.map(p => ({ parameter: p.key, value: p.value }))
        };
        
        await securityService.logSecurityEvent(
          1, // Admin user ID
          "XSS_ATTEMPT_BLOCKED",
          "mcp_request",
          null,
          violationDetails,
          "system" // IP not available in this context
        );
        
        return {
          success: false,
          toolName,
          error: "Request contains potentially malicious XSS payloads",
          securityViolation: true
        };
      }
      
      // 2. Check for SQL injection patterns - LaunchWorkflow Poison Injection Lab
      const sqlInjectionAttempts = stringParams.filter(p => securityService.containsSqlInjection(p.value));
      if (sqlInjectionAttempts.length > 0) {
        const violationDetails = {
          toolName,
          parameters: request.parameters,
          violations: sqlInjectionAttempts.map(p => ({ parameter: p.key, value: p.value }))
        };
        
        await securityService.logSecurityEvent(
          1, // Admin user ID
          "SQL_INJECTION_ATTEMPT_BLOCKED",
          "mcp_request",
          null,
          violationDetails,
          "system" // IP not available in this context
        );
        
        return {
          success: false,
          toolName,
          error: "Request contains potentially malicious SQL injection patterns",
          securityViolation: true
        };
      }
      
      // 3. Check for numeric overflow/limits - Mass Refund Injection Lab
      // Get numeric parameters and validate against reasonable limits
      const numericParams = Object.entries(parameters)
        .filter(([_, value]) => typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value))))
        .map(([key, value]) => ({ 
          key, 
          value: typeof value === 'string' ? Number(value) : (value as number)
        }));
      
      // Check each numeric parameter for reasonable limits based on context
      const overflowAttempts = numericParams.filter(p => {
        // Set default min/max values
        let min = 0;
        let max = 1000000000; // 1 billion as a reasonable upper limit
        
        // Determine context-specific limits
        if (p.key.toLowerCase().includes('year')) {
          min = 1800;
          max = new Date().getFullYear() + 10;
        } else if (p.key.toLowerCase().includes('count') || p.key.toLowerCase().includes('limit')) {
          max = 10000;
        }
        
        return !securityService.isValidNumericValue(p.value, min, max);
      });
      
      if (overflowAttempts.length > 0) {
        const violationDetails = {
          toolName,
          parameters: request.parameters,
          violations: overflowAttempts.map(p => ({ parameter: p.key, value: p.value }))
        };
        
        await securityService.logSecurityEvent(
          1, // Admin user ID
          "NUMERIC_OVERFLOW_ATTEMPT_BLOCKED",
          "mcp_request",
          null,
          violationDetails,
          "system" // IP not available in this context
        );
        
        return {
          success: false,
          toolName,
          error: "Request contains potentially dangerous numeric values",
          securityViolation: true
        };
      }
      
      // 4. Validate parameter schema using Zod
      try {
        const schema = securityService.createMcpRequestSchema(toolName);
        const validatedParams = schema.parse(parameters);
        
        // Execute the tool handler with sanitized parameters
        console.log(`Executing MCP tool: ${toolName} with validated parameters`);
        const result = await tool.handler(validatedParams);
        
        // Create system activity for the successful tool execution
        await storage.createSystemActivity({
          agentId: 4, // Assuming MCP Agent ID
          activity: `Executed MCP tool: ${toolName}`,
          entityType: "mcp_tool",
          entityId: null
        });
        
        return {
          success: true,
          toolName,
          result
        };
      } catch (validationError) {
        // Handle Zod validation errors
        console.error(`Parameter validation failed for MCP tool ${toolName}:`, validationError);
        
        const validationDetails = {
          toolName,
          parameters: request.parameters,
          validationError: validationError instanceof z.ZodError 
            ? validationError.errors 
            : String(validationError)
        };
        
        await securityService.logSecurityEvent(
          1, // Admin user ID
          "VALIDATION_ERROR",
          "mcp_request",
          null,
          validationDetails,
          "system" // IP not available in this context
        );
        
        return {
          success: false,
          toolName,
          error: "Parameter validation failed",
          validationError: validationError instanceof z.ZodError 
            ? validationError.errors 
            : String(validationError)
        };
      }
    } catch (error) {
      console.error(`Error executing MCP tool ${toolName}:`, error);
      
      // Create system activity for the failed tool execution
      await storage.createSystemActivity({
        agentId: 4, // Assuming MCP Agent ID
        activity: `Failed to execute MCP tool: ${toolName}`,
        entityType: "mcp_tool",
        entityId: null
      });
      
      return {
        success: false,
        toolName,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Tool: Get database schema information
   */
  private async getSchemaInfo(): Promise<any> {
    // In a real implementation, this would query INFORMATION_SCHEMA tables
    // For now, we'll return a simplified manually defined schema
    return {
      tables: {
        properties: {
          description: "Main property records table",
          columns: [
            { name: "id", type: "serial", description: "Unique identifier" },
            { name: "propertyId", type: "text", description: "Property identification code" },
            { name: "address", type: "text", description: "Property address" },
            { name: "parcelNumber", type: "text", description: "Parcel identification number" },
            { name: "propertyType", type: "text", description: "Type of property" },
            { name: "acres", type: "numeric", description: "Property size in acres" },
            { name: "value", type: "numeric", description: "Assessed property value" },
            { name: "status", type: "text", description: "Current property status" },
            { name: "lastUpdated", type: "timestamp", description: "Last update timestamp" },
            { name: "createdAt", type: "timestamp", description: "Creation timestamp" }
          ]
        },
        land_records: {
          description: "Land record details table",
          columns: [
            { name: "id", type: "serial", description: "Unique identifier" },
            { name: "propertyId", type: "text", description: "Property identification code" },
            { name: "landUseCode", type: "text", description: "Land use classification code" },
            { name: "zoning", type: "text", description: "Zoning classification" },
            { name: "topography", type: "text", description: "Land topography" },
            { name: "frontage", type: "numeric", description: "Property frontage measurement" },
            { name: "depth", type: "numeric", description: "Property depth measurement" },
            { name: "shape", type: "text", description: "Shape of the land parcel" },
            { name: "utilities", type: "text", description: "Available utilities" },
            { name: "floodZone", type: "text", description: "Flood zone classification" }
          ]
        },
        improvements: {
          description: "Property improvements table",
          columns: [
            { name: "id", type: "serial", description: "Unique identifier" },
            { name: "propertyId", type: "text", description: "Property identification code" },
            { name: "improvementType", type: "text", description: "Type of improvement" },
            { name: "yearBuilt", type: "integer", description: "Year of construction" },
            { name: "squareFeet", type: "numeric", description: "Square footage" },
            { name: "bedrooms", type: "integer", description: "Number of bedrooms" },
            { name: "bathrooms", type: "numeric", description: "Number of bathrooms" },
            { name: "quality", type: "text", description: "Construction quality" },
            { name: "condition", type: "text", description: "Current condition" }
          ]
        },
        fields: {
          description: "Custom property fields table",
          columns: [
            { name: "id", type: "serial", description: "Unique identifier" },
            { name: "propertyId", type: "text", description: "Property identification code" },
            { name: "fieldType", type: "text", description: "Type of field" },
            { name: "fieldValue", type: "text", description: "Value of the field" }
          ]
        },
        appeals: {
          description: "Property assessment appeals table",
          columns: [
            { name: "id", type: "serial", description: "Unique identifier" },
            { name: "propertyId", type: "text", description: "Property identification code" },
            { name: "appealNumber", type: "text", description: "Appeal identification number" },
            { name: "userId", type: "integer", description: "User who filed the appeal" },
            { name: "reason", type: "text", description: "Reason for the appeal" },
            { name: "details", type: "text", description: "Detailed explanation" },
            { name: "evidenceUrls", type: "text[]", description: "URLs to supporting evidence" },
            { name: "status", type: "text", description: "Current status of the appeal" },
            { name: "appealType", type: "text", description: "Type of appeal" },
            { name: "requestedValue", type: "text", description: "Value requested by appellant" },
            { name: "assessmentYear", type: "text", description: "Assessment year being appealed" },
            { name: "dateReceived", type: "timestamp", description: "Date appeal was received" },
            { name: "hearingDate", type: "timestamp", description: "Scheduled hearing date" },
            { name: "decision", type: "text", description: "Appeal decision" },
            { name: "decisionDate", type: "timestamp", description: "Date decision was made" },
            { name: "assignedTo", type: "integer", description: "User assigned to review appeal" }
          ]
        }
      },
      relationships: [
        { 
          name: "property_land_records", 
          primaryTable: "properties",
          foreignTable: "land_records",
          primaryKey: "propertyId",
          foreignKey: "propertyId"
        },
        { 
          name: "property_improvements", 
          primaryTable: "properties",
          foreignTable: "improvements",
          primaryKey: "propertyId",
          foreignKey: "propertyId"
        },
        { 
          name: "property_fields", 
          primaryTable: "properties",
          foreignTable: "fields",
          primaryKey: "propertyId",
          foreignKey: "propertyId"
        },
        { 
          name: "property_appeals", 
          primaryTable: "properties",
          foreignTable: "appeals",
          primaryKey: "propertyId",
          foreignKey: "propertyId"
        }
      ]
    };
  }
  
  /**
   * Tool: Get properties with optional filtering
   */
  private async getProperties(params: any): Promise<Property[]> {
    let properties = await storage.getAllProperties();
    
    // Apply filters
    if (params.address) {
      properties = properties.filter(p => 
        p.address.toLowerCase().includes(params.address.toLowerCase())
      );
    }
    
    if (params.propertyType) {
      properties = properties.filter(p => 
        p.propertyType.toLowerCase() === params.propertyType.toLowerCase()
      );
    }
    
    if (params.status) {
      properties = properties.filter(p => 
        p.status.toLowerCase() === params.status.toLowerCase()
      );
    }
    
    if (params.minValue !== undefined) {
      properties = properties.filter(p => 
        p.value !== null && Number(p.value) >= Number(params.minValue)
      );
    }
    
    if (params.maxValue !== undefined) {
      properties = properties.filter(p => 
        p.value !== null && Number(p.value) <= Number(params.maxValue)
      );
    }
    
    // Apply limit
    if (params.limit && !isNaN(params.limit)) {
      properties = properties.slice(0, Number(params.limit));
    }
    
    return properties;
  }
  
  /**
   * Tool: Get property by ID
   */
  private async getPropertyById(propertyId: string): Promise<Property | null> {
    const property = await storage.getPropertyByPropertyId(propertyId);
    return property || null;
  }
  
  /**
   * Tool: Generate map URL for property
   */
  private async generateMapUrl(params: any): Promise<any> {
    const { propertyId, address, mapType } = params;
    
    if (!mapType) {
      throw new Error("Map type is required");
    }
    
    if (!propertyId && !address) {
      throw new Error("Either propertyId or address is required");
    }
    
    let result: any = {};
    
    if (propertyId) {
      const property = await storage.getPropertyByPropertyId(propertyId);
      
      if (!property) {
        throw new Error(`Property not found with ID: ${propertyId}`);
      }
      
      if (mapType === 'esri') {
        result.url = mappingIntegration.generateEsriMapUrl(propertyId, property.parcelNumber);
      } else if (mapType === 'google') {
        result.url = mappingIntegration.generateGoogleMapsUrl(property.address);
      } else if (mapType === 'pictometry') {
        // This would need geocoding in a real implementation
        // For now, we'll use dummy coordinates based on the property ID
        const lat = 46.2 + (parseInt(propertyId.replace(/\D/g, '')) % 10) / 100;
        const lng = -119.2 - (parseInt(propertyId.replace(/\D/g, '')) % 10) / 100;
        result.url = mappingIntegration.generatePictometryUrl(lat, lng);
      } else {
        throw new Error(`Unsupported map type: ${mapType}`);
      }
      
      result.propertyId = propertyId;
      result.address = property.address;
    } else if (address) {
      if (mapType === 'google') {
        result.url = mappingIntegration.generateGoogleMapsUrl(address);
      } else {
        throw new Error(`Map type ${mapType} requires a property ID`);
      }
      
      result.address = address;
    }
    
    return result;
  }
  
  /**
   * Tool: Get PACS modules
   */
  private async getPacsModules(params: any): Promise<PacsModule[]> {
    let modules = await storage.getAllPacsModules();
    
    // Handle filters passed in the filter object or directly
    const filter = params.filter || params;
    
    // Apply moduleName filter
    if (filter.moduleName) {
      modules = modules.filter(m => 
        m.moduleName.toLowerCase().includes(filter.moduleName.toLowerCase())
      );
    }
    
    // Apply integration filter
    if (filter.integration) {
      modules = modules.filter(m => 
        m.integration.toLowerCase() === filter.integration.toLowerCase()
      );
    }
    
    console.log(`Found ${modules.length} modules with filter:`, filter);
    return modules;
  }
}

export const mcpService = new MCPService();
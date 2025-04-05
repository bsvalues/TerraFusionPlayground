/**
 * Property Assessment Agent
 * 
 * This agent specializes in property assessment and valuation.
 * It performs CAMA (Computer Assisted Mass Appraisal) operations
 * and helps with property valuations based on comparable properties,
 * improvements, and market trends.
 */

import { BaseAgent, AgentConfig, AgentCapability } from './base-agent';
import { IStorage } from '../../storage';
import { MCPService } from '../mcp';
import { PropertyStoryGenerator, PropertyStoryOptions } from '../property-story-generator';
import { Property, ComparableSale, ComparableSalesAnalysis } from '../../../shared/schema';

export class PropertyAssessmentAgent extends BaseAgent {
  private propertyStoryGenerator: PropertyStoryGenerator;
  
  constructor(storage: IStorage, mcpService: MCPService, propertyStoryGenerator: PropertyStoryGenerator) {
    // Define agent configuration
    const config: AgentConfig = {
      id: 1, // Assuming ID 1 for this primary agent
      name: 'Property Assessment Agent',
      description: 'Specializes in property assessment, valuation, and CAMA operations',
      permissions: [
        'authenticated',
        'property.read',
        'property.write',
        'pacs.read',
        'appeal.read',
        'appeal.write'
      ],
      capabilities: [
        // Define core capabilities
        {
          name: 'analyzeProperty',
          description: 'Perform a comprehensive analysis of a property',
          parameters: {
            propertyId: 'string'
          },
          handler: async (parameters, agent) => await this.analyzeProperty(parameters.propertyId)
        },
        {
          name: 'generatePropertyStory',
          description: 'Generate a narrative story about a property',
          parameters: {
            propertyId: 'string',
            options: 'object?'
          },
          handler: async (parameters, agent) => await this.generatePropertyStory(parameters.propertyId, parameters.options)
        },
        {
          name: 'findComparableProperties',
          description: 'Find properties comparable to the given property',
          parameters: {
            propertyId: 'string',
            count: 'number?',
            radius: 'number?'
          },
          handler: async (parameters, agent) => await this.findComparableProperties(parameters.propertyId, parameters.count, parameters.radius)
        },
        {
          name: 'calculatePropertyValue',
          description: 'Calculate the estimated value of a property',
          parameters: {
            propertyId: 'string',
            useComparables: 'boolean?'
          },
          handler: async (parameters, agent) => await this.calculatePropertyValue(parameters.propertyId, parameters.useComparables)
        },
        {
          name: 'analyzePropertyTrends',
          description: 'Analyze property value trends over time',
          parameters: {
            propertyId: 'string',
            timeframe: 'string?'
          },
          handler: async (parameters, agent) => await this.analyzePropertyTrends(parameters.propertyId, parameters.timeframe)
        },
        {
          name: 'generateComparableAnalysis',
          description: 'Generate an analysis based on comparable properties',
          parameters: {
            propertyId: 'string',
            comparableIds: 'string[]?'
          },
          handler: async (parameters, agent) => await this.generateComparableAnalysis(parameters.propertyId, parameters.comparableIds)
        }
      ]
    };
    
    super(config, storage, mcpService);
    this.propertyStoryGenerator = propertyStoryGenerator;
  }
  
  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    // Log initialization
    await this.logActivity('agent_initialization', 'Property Assessment Agent initializing');
    
    // Check for required MCP tools
    const availableTools = await this.getAvailableMCPTools();
    const requiredTools = [
      'property.getAll',
      'property.getById',
      'property.getByPropertyId',
      'landRecord.getByPropertyId',
      'improvement.getByPropertyId'
    ];
    
    // Verify all required tools are available
    for (const tool of requiredTools) {
      if (!availableTools.find(t => t.name === tool)) {
        throw new Error(`Required MCP tool '${tool}' not available`);
      }
    }
    
    // Register any additional capabilities specific to this implementation
    // (none for now, but can be added as the system grows)
    
    await this.logActivity('agent_initialization', 'Property Assessment Agent initialized successfully');
  }
  
  /**
   * Analyze a property
   */
  private async analyzeProperty(propertyId: string): Promise<any> {
    // Log the analysis request
    await this.logActivity('property_analysis', `Analyzing property ${propertyId}`);
    
    try {
      // Get property details through MCP
      const propertyResult = await this.executeMCPTool('property.getByPropertyId', { 
        propertyId 
      });
      
      if (!propertyResult.success || !propertyResult.result) {
        throw new Error(`Property ${propertyId} not found`);
      }
      
      const property = propertyResult.result;
      
      // Get land records through MCP
      const landRecordsResult = await this.executeMCPTool('landRecord.getByPropertyId', { 
        propertyId 
      });
      
      // Get improvements through MCP
      const improvementsResult = await this.executeMCPTool('improvement.getByPropertyId', { 
        propertyId 
      });
      
      // Get any field data through MCP
      const fieldsResult = await this.executeMCPTool('field.getByPropertyId', { 
        propertyId 
      });
      
      // Compile analysis
      const analysis = {
        property,
        landRecords: landRecordsResult.success ? landRecordsResult.result : [],
        improvements: improvementsResult.success ? improvementsResult.result : [],
        fields: fieldsResult.success ? fieldsResult.result : [],
        summary: {
          propertyType: property.propertyType,
          acres: property.acres,
          value: property.value,
          improvementCount: improvementsResult.success ? improvementsResult.result.length : 0,
          landUse: landRecordsResult.success && landRecordsResult.result.length > 0 
            ? landRecordsResult.result[0].landUseCode 
            : 'Unknown'
        },
        analysisTimestamp: new Date()
      };
      
      // Log successful analysis
      await this.logActivity('property_analysis', `Successfully analyzed property ${propertyId}`, {
        summary: analysis.summary
      });
      
      return analysis;
    } catch (error) {
      await this.logActivity('property_analysis_error', `Error analyzing property ${propertyId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Generate a property story
   */
  private async generatePropertyStory(propertyId: string, options?: PropertyStoryOptions): Promise<any> {
    try {
      // Get the property first to ensure it exists
      const propertyResult = await this.executeMCPTool('property.getByPropertyId', { 
        propertyId 
      });
      
      if (!propertyResult.success || !propertyResult.result) {
        throw new Error(`Property ${propertyId} not found`);
      }
      
      // Use the PropertyStoryGenerator to generate the story
      const story = await this.propertyStoryGenerator.generatePropertyStory(propertyId, options);
      
      // Log activity
      await this.logActivity('property_story_generation', `Generated property story for ${propertyId}`, {
        options
      });
      
      return story;
    } catch (error) {
      await this.logActivity('property_story_error', `Error generating property story for ${propertyId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Find comparable properties
   */
  private async findComparableProperties(
    propertyId: string, 
    count: number = 5, 
    radius: number = 1
  ): Promise<any> {
    try {
      // Get the source property
      const propertyResult = await this.executeMCPTool('property.getByPropertyId', { 
        propertyId 
      });
      
      if (!propertyResult.success || !propertyResult.result) {
        throw new Error(`Property ${propertyId} not found`);
      }
      
      const sourceProperty = propertyResult.result as Property;
      
      // Get all properties to filter for comparables
      const propertiesResult = await this.executeMCPTool('property.getAll', {});
      
      if (!propertiesResult.success) {
        throw new Error('Failed to retrieve properties for comparison');
      }
      
      const allProperties = propertiesResult.result as Property[];
      
      // Filter and score comparable properties
      // This is a simplified algorithm and would be much more sophisticated in a real system
      const comparables = allProperties
        .filter(p => p.propertyId !== propertyId && p.propertyType === sourceProperty.propertyType)
        .map(p => {
          // Calculate a simple similarity score
          // In a real system, this would use geospatial data, sale date proximity, etc.
          const valueRatio = p.value && sourceProperty.value 
            ? Math.min(p.value, sourceProperty.value) / Math.max(p.value, sourceProperty.value)
            : 0.5;
            
          const acreageRatio = Math.min(p.acres, sourceProperty.acres) / Math.max(p.acres, sourceProperty.acres);
          
          const score = (valueRatio * 0.7) + (acreageRatio * 0.3);
          
          return {
            property: p,
            similarityScore: score
          };
        })
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, count);
      
      // Log activity
      await this.logActivity('comparable_property_search', `Found ${comparables.length} comparable properties for ${propertyId}`);
      
      return {
        sourceProperty,
        comparables
      };
    } catch (error) {
      await this.logActivity('comparable_property_error', `Error finding comparable properties for ${propertyId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Calculate property value
   */
  private async calculatePropertyValue(propertyId: string, useComparables: boolean = true): Promise<any> {
    try {
      // Get the property
      const propertyResult = await this.executeMCPTool('property.getByPropertyId', { 
        propertyId 
      });
      
      if (!propertyResult.success || !propertyResult.result) {
        throw new Error(`Property ${propertyId} not found`);
      }
      
      const property = propertyResult.result as Property;
      
      // Get improvements
      const improvementsResult = await this.executeMCPTool('improvement.getByPropertyId', { 
        propertyId 
      });
      
      const improvements = improvementsResult.success ? improvementsResult.result : [];
      
      // Calculate base value based on property characteristics
      let baseValue = property.value || 0;
      
      // If comparables are requested, adjust the value based on them
      if (useComparables) {
        const comparablesResult = await this.findComparableProperties(propertyId, 3);
        const comparables = comparablesResult.comparables;
        
        if (comparables && comparables.length > 0) {
          // Calculate average value of comparables
          const avgComparableValue = comparables.reduce(
            (sum, c) => sum + (c.property.value || 0), 
            0
          ) / comparables.length;
          
          // Adjust base value using a weighted average of direct value and comparable average
          baseValue = (baseValue * 0.7) + (avgComparableValue * 0.3);
        }
      }
      
      // Apply adjustment factors
      let adjustedValue = baseValue;
      
      // Apply improvements value
      const improvementsValue = improvements.reduce((sum, imp) => {
        // In a real system, this would be a sophisticated calculation based on
        // improvement type, age, quality, etc.
        const baseImprovementValue = 10000; // Placeholder value
        
        // Age adjustment - newer is worth more
        const yearBuilt = imp.yearBuilt || 2000;
        const age = new Date().getFullYear() - yearBuilt;
        const ageMultiplier = Math.max(0.5, 1 - (age / 100));
        
        // Size adjustment
        const sqFtMultiplier = imp.squareFeet ? (imp.squareFeet / 1000) : 1;
        
        return sum + (baseImprovementValue * ageMultiplier * sqFtMultiplier);
      }, 0);
      
      adjustedValue += improvementsValue;
      
      // Log the valuation
      await this.logActivity('property_valuation', `Calculated value for property ${propertyId}: ${adjustedValue}`, {
        baseValue,
        improvementsValue,
        adjustedValue
      });
      
      return {
        propertyId,
        baseValue,
        improvementsValue,
        adjustedValue,
        valuationMethod: useComparables ? 'comparable_sales_adjusted' : 'cost_approach',
        valuationDate: new Date()
      };
    } catch (error) {
      await this.logActivity('property_valuation_error', `Error calculating property value for ${propertyId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Analyze property trends
   */
  private async analyzePropertyTrends(propertyId: string, timeframe: string = '1year'): Promise<any> {
    try {
      // Get the property
      const propertyResult = await this.executeMCPTool('property.getByPropertyId', { 
        propertyId 
      });
      
      if (!propertyResult.success || !propertyResult.result) {
        throw new Error(`Property ${propertyId} not found`);
      }
      
      // Get comparable sales for trend analysis
      // In a real system, this would query historical sales and values
      
      // For this simplified demo, we'll generate simulated trend data
      const currentDate = new Date();
      const currentValue = propertyResult.result.value || 100000;
      
      // Create simulated historical data points
      const dataPoints = [];
      const months = timeframe === '1year' ? 12 : timeframe === '5years' ? 60 : 24;
      
      // Generate simulated values with realistic fluctuations
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        
        // Create realistic fluctuations with seasonal patterns and slight upward trend
        const seasonalFactor = 1 + (0.05 * Math.sin((i % 12) / 12 * 2 * Math.PI));
        const trendFactor = 1 + (0.02 * (months - i) / months);
        const randomFactor = 0.99 + (0.02 * Math.random());
        
        const historicalValue = currentValue * seasonalFactor * trendFactor * randomFactor;
        
        dataPoints.push({
          date: date.toISOString().split('T')[0],
          value: Math.round(historicalValue)
        });
      }
      
      // Calculate trend statistics
      const firstValue = dataPoints[0].value;
      const lastValue = dataPoints[dataPoints.length - 1].value;
      const valueChange = lastValue - firstValue;
      const percentChange = (valueChange / firstValue) * 100;
      
      // Log the trend analysis
      await this.logActivity('property_trend_analysis', `Analyzed ${timeframe} trends for property ${propertyId}`, {
        percentChange,
        dataPointCount: dataPoints.length
      });
      
      return {
        propertyId,
        timeframe,
        dataPoints,
        summary: {
          startValue: firstValue,
          endValue: lastValue,
          valueChange,
          percentChange: Math.round(percentChange * 100) / 100,
          annualizedGrowthRate: Math.round((Math.pow(lastValue / firstValue, 12 / months) - 1) * 100 * 100) / 100
        },
        analysisDate: new Date()
      };
    } catch (error) {
      await this.logActivity('property_trend_error', `Error analyzing property trends for ${propertyId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Generate comparable analysis
   */
  private async generateComparableAnalysis(
    propertyId: string, 
    comparableIds?: string[]
  ): Promise<any> {
    try {
      // Get the source property
      const propertyResult = await this.executeMCPTool('property.getByPropertyId', { 
        propertyId 
      });
      
      if (!propertyResult.success || !propertyResult.result) {
        throw new Error(`Property ${propertyId} not found`);
      }
      
      const sourceProperty = propertyResult.result as Property;
      
      // If comparableIds are not provided, find them
      let comparableProperties: Property[] = [];
      
      if (comparableIds && comparableIds.length > 0) {
        // Get specified comparable properties
        for (const id of comparableIds) {
          const result = await this.executeMCPTool('property.getByPropertyId', { propertyId: id });
          if (result.success && result.result) {
            comparableProperties.push(result.result);
          }
        }
      } else {
        // Find comparable properties
        const comparablesResult = await this.findComparableProperties(propertyId, 3);
        comparableProperties = comparablesResult.comparables.map(c => c.property);
      }
      
      if (comparableProperties.length === 0) {
        throw new Error('No comparable properties available for analysis');
      }
      
      // Create a comparable analysis record
      const analysisId = `ca-${Date.now()}`;
      const analysis: ComparableSalesAnalysis = {
        id: 0, // Will be set by storage
        analysisId,
        propertyId,
        analysisDate: new Date(),
        comparableCount: comparableProperties.length,
        adjustedValue: 0, // Will be calculated
        confidence: 0, // Will be calculated
        methodology: 'sales_comparison',
        adjustmentFactors: {
          location: 0.2,
          size: 0.3,
          age: 0.15,
          quality: 0.2,
          amenities: 0.15
        },
        status: 'completed',
        createdAt: new Date()
      };
      
      // Create analysis entries for each comparable
      const entries = [];
      let totalAdjustedValue = 0;
      
      for (const comparable of comparableProperties) {
        // Calculate adjustment factors
        // In a real system, these would be much more sophisticated
        
        // Size adjustment
        const sizeAdjustment = sourceProperty.acres && comparable.acres
          ? ((sourceProperty.acres - comparable.acres) / comparable.acres) * analysis.adjustmentFactors.size
          : 0;
        
        // Location adjustment (placeholder - would use actual location data)
        const locationAdjustment = 0;
        
        // Get improvements for age and quality adjustments
        const sourceImpsResult = await this.executeMCPTool('improvement.getByPropertyId', { 
          propertyId: sourceProperty.propertyId 
        });
        
        const compImpsResult = await this.executeMCPTool('improvement.getByPropertyId', { 
          propertyId: comparable.propertyId 
        });
        
        const sourceImps = sourceImpsResult.success ? sourceImpsResult.result : [];
        const compImps = compImpsResult.success ? compImpsResult.result : [];
        
        // Age adjustment
        const sourceAvgYear = sourceImps.length > 0 
          ? sourceImps.reduce((sum, imp) => sum + (imp.yearBuilt || 2000), 0) / sourceImps.length
          : 2000;
          
        const compAvgYear = compImps.length > 0 
          ? compImps.reduce((sum, imp) => sum + (imp.yearBuilt || 2000), 0) / compImps.length
          : 2000;
          
        const ageAdjustment = ((sourceAvgYear - compAvgYear) / 100) * analysis.adjustmentFactors.age;
        
        // Calculate total adjustment
        const totalAdjustment = sizeAdjustment + locationAdjustment + ageAdjustment;
        
        // Calculate adjusted value
        const adjustedValue = comparable.value 
          ? comparable.value * (1 + totalAdjustment)
          : 0;
          
        totalAdjustedValue += adjustedValue;
        
        // Create the entry
        const entry = {
          id: 0, // Will be set by storage
          analysisId,
          comparablePropertyId: comparable.propertyId,
          baseValue: comparable.value || 0,
          adjustments: {
            size: sizeAdjustment,
            location: locationAdjustment,
            age: ageAdjustment
          },
          totalAdjustment,
          adjustedValue,
          weight: 1, // Equal weighting for now
          createdAt: new Date()
        };
        
        entries.push(entry);
      }
      
      // Calculate final adjusted value
      analysis.adjustedValue = totalAdjustedValue / comparableProperties.length;
      
      // Calculate confidence based on variance
      const variance = entries.reduce(
        (sum, entry) => sum + Math.pow(entry.adjustedValue - analysis.adjustedValue, 2), 
        0
      ) / entries.length;
      
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / analysis.adjustedValue;
      
      // Higher coefficient of variation = lower confidence
      analysis.confidence = Math.max(0, Math.min(1, 1 - coefficientOfVariation));
      
      // Log the analysis
      await this.logActivity('comparable_analysis', `Generated comparable analysis for property ${propertyId}`, {
        analysisId,
        comparableCount: comparableProperties.length,
        adjustedValue: analysis.adjustedValue,
        confidence: analysis.confidence
      });
      
      // Store the analysis and entries in the database
      // In a real implementation, this would call the appropriate storage methods
      
      return {
        analysis,
        entries,
        comparableProperties
      };
    } catch (error) {
      await this.logActivity('comparable_analysis_error', `Error generating comparable analysis for ${propertyId}: ${error.message}`);
      throw error;
    }
  }
}
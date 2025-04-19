/**
 * AI Insights Agent
 * 
 * This agent uses machine learning models to provide predictive insights,
 * detect anomalies, and suggest optimizations based on spatial data patterns.
 */

import { IStorage } from '../../../storage';
import { BaseGISAgent } from './base-gis-agent';
import { sql } from 'drizzle-orm';
import { db } from '../../../db';
import { OpenAI } from "openai";
import path from 'path';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Create an AI Insights Agent
 * @param storage The storage implementation
 * @returns A new AIInsightsAgent instance
 */
export function createAIInsightsAgent(storage: IStorage) {
  // Generate a unique ID for this agent instance
  const agentId = `ai-insights-agent-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  
  return new AIInsightsAgent(storage, agentId);
}

/**
 * Interface for prediction results
 */
interface PredictionResult {
  value: number;
  confidence: number;
  model: string;
  features: any;
}

/**
 * Interface for anomaly detection results
 */
interface AnomalyDetectionResult {
  isAnomaly: boolean;
  score: number;
  reason: string;
  features: any;
}

/**
 * Interface for pattern detection results
 */
interface PatternDetectionResult {
  patterns: any[];
  confidence: number;
  explanation: string;
}

class AIInsightsAgent extends BaseGISAgent {
  constructor(storage: IStorage, agentId: string) {
    super(storage, {
      id: agentId,
      name: 'AI Insights Agent',
      description: 'Provides ML-based insights from spatial data analysis',
      capabilities: [
        {
          name: 'predictPropertyValues',
          description: 'Predict property values based on location and attributes',
          parameters: {
            propertyId: { type: 'string', description: 'ID of the property to analyze' },
            includeNeighborhood: { type: 'boolean', optional: true, description: 'Include neighborhood analysis' },
            options: { type: 'object', optional: true, description: 'Additional prediction options' }
          },
          handler: this.predictPropertyValues.bind(this)
        },
        {
          name: 'detectValueAnomalies',
          description: 'Detect anomalies in property values',
          parameters: {
            layerId: { type: 'number', description: 'ID of the layer containing properties' },
            radius: { type: 'number', optional: true, description: 'Radius to consider for neighborhood analysis' },
            options: { type: 'object', optional: true, description: 'Additional anomaly detection options' }
          },
          handler: this.detectValueAnomalies.bind(this)
        },
        {
          name: 'discoverSpatialPatterns',
          description: 'Discover spatial patterns in data',
          parameters: {
            layerId: { type: 'number', description: 'ID of the layer to analyze' },
            attributes: { type: 'array', items: { type: 'string' }, description: 'Attributes to analyze for patterns' },
            options: { type: 'object', optional: true, description: 'Additional pattern discovery options' }
          },
          handler: this.discoverSpatialPatterns.bind(this)
        },
        {
          name: 'generateValueHeatmap',
          description: 'Generate a property value heatmap',
          parameters: {
            layerId: { type: 'number', description: 'ID of the layer containing properties' },
            valueAttribute: { type: 'string', description: 'Attribute containing the value' },
            options: { type: 'object', optional: true, description: 'Additional heatmap options' }
          },
          handler: this.generateValueHeatmap.bind(this)
        },
        {
          name: 'suggestZoningOptimizations',
          description: 'Suggest optimizations for zoning based on spatial analysis',
          parameters: {
            layerId: { type: 'number', description: 'ID of the layer containing zoning data' },
            criteria: { type: 'array', items: { type: 'string' }, description: 'Criteria to consider for optimization' },
            options: { type: 'object', optional: true, description: 'Additional optimization options' }
          },
          handler: this.suggestZoningOptimizations.bind(this)
        }
      ],
      permissions: ['gis:read', 'gis:analyze', 'ai:generate', 'ai:analyze']
    });
  }

  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    try {
      await this.baseInitialize();
      
      // Log the initialization
      await this.createAgentMessage({
        type: 'INFO',
        content: `Agent ${this.name} (${this.agentId}) initialized`,
        agentId: this.agentId
      });
      
      console.log(`AI Insights Agent (${this.agentId}) initialized successfully`);
    } catch (error) {
      console.error(`Error initializing AI Insights Agent:`, error);
      throw error;
    }
  }

  /**
   * Predict property values based on location and attributes
   */
  private async predictPropertyValues(params: any): Promise<any> {
    try {
      const { propertyId, includeNeighborhood = true, options = {} } = params;
      
      // Validate parameters
      if (!propertyId) {
        throw new Error('Property ID is required');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Predicting property value for property ${propertyId}`,
        agentId: this.agentId,
        metadata: { propertyId, includeNeighborhood, options }
      });
      
      // Retrieve property data
      const property = await this.storage.getProperty(propertyId);
      
      if (!property) {
        throw new Error(`Property with ID ${propertyId} not found`);
      }
      
      // Get property improvements
      const improvements = await this.storage.getImprovementsByPropertyId(propertyId);
      
      // Get property land records
      const landRecords = await this.storage.getLandRecordsByPropertyId(propertyId);
      
      // Retrieve neighborhood properties if requested
      let neighborhoodProperties = [];
      if (includeNeighborhood) {
        // This would typically use spatial queries to find nearby properties
        const radius = options.radius || 1000; // Default 1km radius
        
        // Simulated neighborhood query
        neighborhoodProperties = await this.getPropertiesInRadius(property, radius);
      }
      
      // Extract features for prediction
      const features = this.extractPropertyFeatures(property, improvements, landRecords);
      
      // Add neighborhood features if available
      if (includeNeighborhood && neighborhoodProperties.length > 0) {
        features.neighborhood = this.extractNeighborhoodFeatures(neighborhoodProperties);
      }
      
      // Make prediction using AI/ML model
      // In a real implementation, this would use a trained model
      // For this example, we'll use a simulated prediction
      const predictedValue = await this.makePrediction(property, features, options);
      
      // Format the predicted value with analysis
      const analysis = await this.generatePropertyValueAnalysis(property, predictedValue, features);
      
      // Create a historical record of this prediction
      await this.storage.createPropertyValuePrediction({
        property_id: propertyId,
        predicted_value: predictedValue.value,
        confidence: predictedValue.confidence,
        features: JSON.stringify(features),
        model_type: predictedValue.model,
        created_at: new Date()
      });
      
      return {
        success: true,
        property: {
          id: property.propertyId,
          address: property.address,
          type: property.propertyType,
          currentValue: parseFloat(property.value || '0'),
        },
        prediction: {
          value: predictedValue.value,
          confidence: predictedValue.confidence,
          model: predictedValue.model,
          timestamp: new Date()
        },
        analysis,
        features: predictedValue.features,
        metadata: {
          operation: 'predict_property_value',
          includeNeighborhood,
          neighborhoodRadius: options.radius || 1000,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in predictPropertyValues:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error predicting property values: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Detect anomalies in property values
   */
  private async detectValueAnomalies(params: any): Promise<any> {
    try {
      const { layerId, radius = 1000, options = {} } = params;
      
      // Validate parameters
      if (!layerId) {
        throw new Error('Layer ID is required');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Detecting value anomalies in layer ${layerId}`,
        agentId: this.agentId,
        metadata: { layerId, radius, options }
      });
      
      // Get the layer
      const layer = await this.storage.getGISLayer(layerId);
      
      if (!layer) {
        throw new Error(`Layer with ID ${layerId} not found`);
      }
      
      // Get properties from the layer
      // For a real implementation, this would use spatial queries
      // Here, we'll use a simulated approach
      const properties = await this.getPropertiesFromLayer(layer);
      
      if (!properties || properties.length === 0) {
        throw new Error(`No properties found in layer ${layerId}`);
      }
      
      // Detect anomalies in the properties
      const anomalies = await Promise.all(
        properties.map(property => this.detectPropertyValueAnomaly(property, properties, radius, options))
      );
      
      // Filter to only actual anomalies
      const actualAnomalies = anomalies
        .filter(result => result.isAnomaly)
        .map(result => ({
          propertyId: result.features.propertyId,
          address: result.features.address,
          value: result.features.value,
          anomalyScore: result.score,
          reason: result.reason
        }));
      
      // Create a visualization layer for the anomalies
      const visualizationLayer = await this.createAnomalyVisualizationLayer(layer, actualAnomalies);
      
      return {
        success: true,
        layerId,
        layerName: layer.name,
        totalProperties: properties.length,
        anomaliesCount: actualAnomalies.length,
        anomalies: actualAnomalies,
        visualizationLayerId: visualizationLayer.id,
        metadata: {
          operation: 'detect_value_anomalies',
          radius,
          threshold: options.threshold || 0.8,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in detectValueAnomalies:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error detecting value anomalies: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Discover spatial patterns in data
   */
  private async discoverSpatialPatterns(params: any): Promise<any> {
    try {
      const { layerId, attributes, options = {} } = params;
      
      // Validate parameters
      if (!layerId || !attributes || !Array.isArray(attributes) || attributes.length === 0) {
        throw new Error('Layer ID and at least one attribute are required');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Discovering spatial patterns in layer ${layerId} for attributes: ${attributes.join(', ')}`,
        agentId: this.agentId,
        metadata: { layerId, attributes, options }
      });
      
      // Get the layer
      const layer = await this.storage.getGISLayer(layerId);
      
      if (!layer) {
        throw new Error(`Layer with ID ${layerId} not found`);
      }
      
      // Get features from the layer
      const features = await this.getFeaturesFromLayer(layer);
      
      if (!features || features.length === 0) {
        throw new Error(`No features found in layer ${layerId}`);
      }
      
      // Define the pattern types to look for
      const patternTypes = options.patternTypes || ['clustering', 'dispersion', 'trend'];
      
      // Discover patterns for each attribute
      const results = await Promise.all(
        attributes.map(attribute => this.discoverPatternsForAttribute(layer, features, attribute, patternTypes, options))
      );
      
      // Create a visual representation of the patterns
      const visualizationLayers = await Promise.all(
        results.map((result, index) => this.createPatternVisualizationLayer(layer, result, attributes[index]))
      );
      
      return {
        success: true,
        layerId,
        layerName: layer.name,
        totalFeatures: features.length,
        patternResults: results.map((result, index) => ({
          attribute: attributes[index],
          patterns: result.patterns,
          confidence: result.confidence,
          explanation: result.explanation,
          visualizationLayerId: visualizationLayers[index].id
        })),
        metadata: {
          operation: 'discover_spatial_patterns',
          patternTypes,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in discoverSpatialPatterns:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error discovering spatial patterns: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Generate a property value heatmap
   */
  private async generateValueHeatmap(params: any): Promise<any> {
    try {
      const { layerId, valueAttribute, options = {} } = params;
      
      // Validate parameters
      if (!layerId || !valueAttribute) {
        throw new Error('Layer ID and value attribute are required');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Generating property value heatmap for layer ${layerId} using attribute ${valueAttribute}`,
        agentId: this.agentId,
        metadata: { layerId, valueAttribute, options }
      });
      
      // Get the layer
      const layer = await this.storage.getGISLayer(layerId);
      
      if (!layer) {
        throw new Error(`Layer with ID ${layerId} not found`);
      }
      
      // Get features from the layer
      const features = await this.getFeaturesFromLayer(layer);
      
      if (!features || features.length === 0) {
        throw new Error(`No features found in layer ${layerId}`);
      }
      
      // Generate heatmap configuration
      const heatmapConfig = {
        attribute: valueAttribute,
        radius: options.radius || 25,
        blur: options.blur || 15,
        gradient: options.gradient || {
          0.1: 'blue',
          0.3: 'cyan',
          0.5: 'lime',
          0.7: 'yellow',
          0.9: 'red'
        },
        minOpacity: options.minOpacity || 0.1,
        maxZoom: options.maxZoom || 18
      };
      
      // Create a heatmap layer
      const heatmapLayer = await this.createHeatmapLayer(layer, features, valueAttribute, heatmapConfig);
      
      // Extract value statistics
      const values = features
        .map(feature => feature.properties[valueAttribute])
        .filter(value => value !== undefined && value !== null);
      
      const statistics = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        count: values.length
      };
      
      return {
        success: true,
        layerId,
        layerName: layer.name,
        attribute: valueAttribute,
        heatmapLayerId: heatmapLayer.id,
        heatmapLayerName: heatmapLayer.name,
        statistics,
        config: heatmapConfig,
        metadata: {
          operation: 'generate_value_heatmap',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in generateValueHeatmap:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error generating value heatmap: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Suggest optimizations for zoning based on spatial analysis
   */
  private async suggestZoningOptimizations(params: any): Promise<any> {
    try {
      const { layerId, criteria, options = {} } = params;
      
      // Validate parameters
      if (!layerId || !criteria || !Array.isArray(criteria) || criteria.length === 0) {
        throw new Error('Layer ID and at least one optimization criterion are required');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Suggesting zoning optimizations for layer ${layerId} using criteria: ${criteria.join(', ')}`,
        agentId: this.agentId,
        metadata: { layerId, criteria, options }
      });
      
      // Get the layer
      const layer = await this.storage.getGISLayer(layerId);
      
      if (!layer) {
        throw new Error(`Layer with ID ${layerId} not found`);
      }
      
      // Get zoning features from the layer
      const zoningFeatures = await this.getFeaturesFromLayer(layer);
      
      if (!zoningFeatures || zoningFeatures.length === 0) {
        throw new Error(`No zoning features found in layer ${layerId}`);
      }
      
      // Get related layers if needed
      let relatedLayers = [];
      if (options.relatedLayerIds && Array.isArray(options.relatedLayerIds)) {
        relatedLayers = await Promise.all(
          options.relatedLayerIds.map(async (id) => {
            const relatedLayer = await this.storage.getGISLayer(id);
            if (relatedLayer) {
              const features = await this.getFeaturesFromLayer(relatedLayer);
              return { layer: relatedLayer, features };
            }
            return null;
          })
        );
        relatedLayers = relatedLayers.filter(layer => layer !== null);
      }
      
      // Analyze zoning and generate optimization suggestions
      const optimizationResults = await this.analyzeZoningOptimizations(
        layer,
        zoningFeatures,
        criteria,
        relatedLayers,
        options
      );
      
      // Create visualization layers for the suggestions
      const visualizationLayer = await this.createZoningOptimizationLayer(
        layer,
        optimizationResults.suggestions,
        criteria
      );
      
      return {
        success: true,
        layerId,
        layerName: layer.name,
        criteria,
        optimizationResults,
        visualizationLayerId: visualizationLayer.id,
        metadata: {
          operation: 'suggest_zoning_optimizations',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in suggestZoningOptimizations:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error suggesting zoning optimizations: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Extract features from a property for prediction
   */
  private extractPropertyFeatures(property: any, improvements: any[], landRecords: any[]): any {
    // Basic property features
    const features = {
      propertyId: property.propertyId,
      propertyType: property.propertyType,
      address: property.address,
      value: parseFloat(property.value || '0'),
      acres: parseFloat(property.acres || '0'),
      zoneCode: property.zoneCode || 'unknown',
      assessmentYear: property.assessmentYear || new Date().getFullYear(),
      hasAppeal: property.hasActiveAppeal || false,
      improvementsCount: improvements.length,
      improvementsValue: improvements.reduce((sum, imp) => sum + parseFloat(imp.value || '0'), 0),
      landRecordsCount: landRecords.length,
      landValue: landRecords.reduce((sum, land) => sum + parseFloat(land.value || '0'), 0),
      extraFields: property.extraFields || {}
    };
    
    // Extract year built from improvements
    if (improvements.length > 0) {
      const yearBuiltValues = improvements
        .map(imp => imp.yearBuilt)
        .filter(year => year !== null && year !== undefined);
      
      if (yearBuiltValues.length > 0) {
        features.yearBuilt = Math.min(...yearBuiltValues);
      }
    }
    
    return features;
  }

  /**
   * Extract features from neighborhood properties
   */
  private extractNeighborhoodFeatures(properties: any[]): any {
    // Calculate median and average values
    const values = properties.map(p => parseFloat(p.value || '0')).filter(v => !isNaN(v));
    const acres = properties.map(p => parseFloat(p.acres || '0')).filter(a => !isNaN(a));
    
    // Count property types
    const propertyTypes = {};
    properties.forEach(p => {
      if (p.propertyType) {
        propertyTypes[p.propertyType] = (propertyTypes[p.propertyType] || 0) + 1;
      }
    });
    
    // Count zone codes
    const zoneCodes = {};
    properties.forEach(p => {
      if (p.zoneCode) {
        zoneCodes[p.zoneCode] = (zoneCodes[p.zoneCode] || 0) + 1;
      }
    });
    
    return {
      count: properties.length,
      averageValue: values.reduce((sum, val) => sum + val, 0) / values.length,
      medianValue: this.calculateMedian(values),
      maxValue: Math.max(...values),
      minValue: Math.min(...values),
      averageAcres: acres.reduce((sum, acre) => sum + acre, 0) / acres.length,
      propertyTypes,
      zoneCodes,
      appealRatio: properties.filter(p => p.hasActiveAppeal).length / properties.length
    };
  }

  /**
   * Calculate the median of an array of numbers
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Get properties in a given radius around a center property
   */
  private async getPropertiesInRadius(centerProperty: any, radius: number): Promise<any[]> {
    // In a real implementation, this would use spatial queries with ST_DWithin
    // For this example, we'll return a simulated set of properties
    return [
      {
        propertyId: 'P123',
        value: '320000',
        acres: '0.25',
        propertyType: 'Residential',
        zoneCode: 'R1'
      },
      {
        propertyId: 'P124',
        value: '350000',
        acres: '0.3',
        propertyType: 'Residential',
        zoneCode: 'R1'
      },
      {
        propertyId: 'P125',
        value: '290000',
        acres: '0.2',
        propertyType: 'Residential',
        zoneCode: 'R1'
      }
    ];
  }

  /**
   * Make a prediction for property value
   */
  private async makePrediction(property: any, features: any, options: any): Promise<PredictionResult> {
    // In a real implementation, this would use a trained ML model
    // For this example, we'll simulate a prediction
    
    // Key factors that typically impact property values
    const baseValue = parseFloat(property.value || '0');
    const adjustmentFactors = {
      size: features.acres > 0.5 ? 1.2 : (features.acres > 0.25 ? 1.1 : 1.0),
      improvements: features.improvementsCount > 0 ? 1.15 : 1.0,
      zoning: features.zoneCode === 'R1' ? 1.1 : (features.zoneCode === 'C1' ? 1.3 : 1.0),
      neighborhood: features.neighborhood 
        ? (features.neighborhood.averageValue > baseValue ? 1.05 : 0.95)
        : 1.0
    };
    
    // Apply adjustments
    const predictedValue = baseValue * 
      adjustmentFactors.size * 
      adjustmentFactors.improvements * 
      adjustmentFactors.zoning * 
      adjustmentFactors.neighborhood;
    
    // Round to nearest 1000
    const roundedValue = Math.round(predictedValue / 1000) * 1000;
    
    // Simulate confidence based on data quality
    const confidence = 0.85; // 85% confidence
    
    return {
      value: roundedValue,
      confidence,
      model: 'ensemble_regression',
      features: {
        adjustmentFactors,
        baseValue,
        propertyId: property.propertyId,
        address: property.address
      }
    };
  }

  /**
   * Generate a natural language analysis of property value prediction
   */
  private async generatePropertyValueAnalysis(property: any, prediction: PredictionResult, features: any): Promise<any> {
    // In a real implementation, you might use an LLM or rule-based system
    // For this example, we'll use a mix
    
    const baseValue = parseFloat(property.value || '0');
    const predictedValue = prediction.value;
    const valueDifference = predictedValue - baseValue;
    const percentChange = (valueDifference / baseValue) * 100;
    
    try {
      // Check if OpenAI API key is available
      if (process.env.OPENAI_API_KEY) {
        // Use OpenAI for analysis
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a property valuation expert. Provide a concise, factual analysis of property valuation prediction in 3-5 sentences."
            },
            {
              role: "user",
              content: `
                Analyze this property valuation prediction:
                
                Property: ${property.address} (ID: ${property.propertyId})
                Current Value: $${baseValue.toLocaleString()}
                Predicted Value: $${predictedValue.toLocaleString()}
                Change: ${percentChange.toFixed(1)}%
                
                Property type: ${property.propertyType}
                Zone code: ${features.zoneCode}
                Acres: ${features.acres}
                Improvements count: ${features.improvementsCount}
                
                Neighborhood average value: ${features.neighborhood ? '$' + features.neighborhood.averageValue.toLocaleString() : 'Unknown'}
                
                Key factor weights:
                ${Object.entries(prediction.features.adjustmentFactors)
                  .map(([factor, weight]) => `- ${factor}: ${weight}`)
                  .join('\n')}
              `
            }
          ],
          max_tokens: 300
        });
        
        return {
          text: response.choices[0].message.content,
          factors: Object.entries(prediction.features.adjustmentFactors)
            .map(([factor, weight]) => ({
              factor,
              weight,
              contribution: ((Number(weight) - 1) * 100).toFixed(1) + '%'
            }))
            .sort((a, b) => Number(b.weight) - Number(a.weight)),
          valueDifference,
          percentChange
        };
      }
    } catch (error) {
      console.warn("Failed to generate analysis using OpenAI:", error);
    }
    
    // Fallback to rule-based analysis if OpenAI fails
    let analysisText = `The predicted value of $${predictedValue.toLocaleString()} represents a ${Math.abs(percentChange).toFixed(1)}% ${percentChange >= 0 ? 'increase' : 'decrease'} from the current assessment of $${baseValue.toLocaleString()}.`;
    
    // Add factor analysis
    const factorAnalysis = [];
    const factors = prediction.features.adjustmentFactors;
    
    if (factors.size > 1.1) {
      factorAnalysis.push(`The property's size (${features.acres} acres) positively impacts its value.`);
    }
    
    if (factors.improvements > 1.1) {
      factorAnalysis.push(`The ${features.improvementsCount} improvements add significant value to the property.`);
    }
    
    if (factors.zoning > 1.1) {
      factorAnalysis.push(`The ${features.zoneCode} zoning classification is favorable for value.`);
    }
    
    if (features.neighborhood && factors.neighborhood !== 1.0) {
      factorAnalysis.push(`The neighborhood's average value ${factors.neighborhood > 1 ? 'positively' : 'negatively'} affects this property's valuation.`);
    }
    
    return {
      text: analysisText + ' ' + factorAnalysis.join(' '),
      factors: Object.entries(prediction.features.adjustmentFactors)
        .map(([factor, weight]) => ({
          factor,
          weight,
          contribution: ((Number(weight) - 1) * 100).toFixed(1) + '%'
        }))
        .sort((a, b) => Number(b.weight) - Number(a.weight)),
      valueDifference,
      percentChange
    };
  }

  /**
   * Get properties from a GIS layer
   */
  private async getPropertiesFromLayer(layer: any): Promise<any[]> {
    // In a real implementation, this would query the database table
    // For this example, we'll return simulated properties
    return [
      {
        id: 1,
        properties: {
          propertyId: 'P101',
          address: '123 Main St',
          value: 350000,
          acres: 0.25,
          zoneCode: 'R1'
        },
        geometry: { type: 'Point', coordinates: [-122.0, 47.0] }
      },
      {
        id: 2,
        properties: {
          propertyId: 'P102',
          address: '456 Oak Ave',
          value: 425000,
          acres: 0.33,
          zoneCode: 'R1'
        },
        geometry: { type: 'Point', coordinates: [-122.01, 47.01] }
      },
      {
        id: 3,
        properties: {
          propertyId: 'P103',
          address: '789 Pine St',
          value: 290000,
          acres: 0.2,
          zoneCode: 'R2'
        },
        geometry: { type: 'Point', coordinates: [-122.02, 47.02] }
      }
    ];
  }

  /**
   * Get features from a GIS layer
   */
  private async getFeaturesFromLayer(layer: any): Promise<any[]> {
    // In a real implementation, this would query the database table
    // For this example, we'll return simulated features
    return [
      {
        id: 1,
        properties: {
          name: 'Feature 1',
          value: 100,
          category: 'A',
          zoneType: 'Residential'
        },
        geometry: { type: 'Polygon', coordinates: [[[-122.0, 47.0], [-122.1, 47.0], [-122.1, 47.1], [-122.0, 47.1], [-122.0, 47.0]]] }
      },
      {
        id: 2,
        properties: {
          name: 'Feature 2',
          value: 150,
          category: 'B',
          zoneType: 'Commercial'
        },
        geometry: { type: 'Polygon', coordinates: [[[-122.2, 47.2], [-122.3, 47.2], [-122.3, 47.3], [-122.2, 47.3], [-122.2, 47.2]]] }
      },
      {
        id: 3,
        properties: {
          name: 'Feature 3',
          value: 75,
          category: 'A',
          zoneType: 'Industrial'
        },
        geometry: { type: 'Polygon', coordinates: [[[-122.4, 47.4], [-122.5, 47.4], [-122.5, 47.5], [-122.4, 47.5], [-122.4, 47.4]]] }
      }
    ];
  }

  /**
   * Detect anomalies in property values
   */
  private async detectPropertyValueAnomaly(
    property: any,
    allProperties: any[],
    radius: number,
    options: any
  ): Promise<AnomalyDetectionResult> {
    // Get property value
    const value = property.properties.value;
    
    // Find nearby properties
    const nearbyProperties = this.findNearbyProperties(property, allProperties, radius);
    
    // Calculate statistics for nearby properties
    const values = nearbyProperties.map(p => p.properties.value);
    
    if (values.length < 2) {
      return {
        isAnomaly: false,
        score: 0,
        reason: 'Insufficient nearby properties for comparison',
        features: property.properties
      };
    }
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate z-score
    const zScore = Math.abs((value - mean) / stdDev);
    
    // Determine if it's an anomaly
    const threshold = options.threshold || 2.0; // Default: values more than 2 standard deviations from mean
    const isAnomaly = zScore > threshold;
    
    // Generate reason for anomaly
    let reason = '';
    if (isAnomaly) {
      reason = value > mean
        ? `Value is ${zScore.toFixed(2)} standard deviations higher than nearby properties`
        : `Value is ${zScore.toFixed(2)} standard deviations lower than nearby properties`;
    } else {
      reason = 'Value is within normal range for the area';
    }
    
    return {
      isAnomaly,
      score: zScore,
      reason,
      features: {
        propertyId: property.properties.propertyId,
        address: property.properties.address,
        value,
        mean,
        stdDev,
        nearbyCount: nearbyProperties.length
      }
    };
  }

  /**
   * Find nearby properties using simple distance calculation
   */
  private findNearbyProperties(center: any, allProperties: any[], radius: number): any[] {
    // Extract center coordinates
    const centerCoords = center.geometry.coordinates;
    
    // Find properties within radius
    return allProperties.filter(property => {
      // Skip the center property itself
      if (property.id === center.id) return false;
      
      // Calculate distance
      const coords = property.geometry.coordinates;
      const distance = this.calculateDistance(centerCoords, coords);
      
      // Return true if within radius
      return distance <= radius;
    });
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(coords1: number[], coords2: number[]): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (coords1[1] * Math.PI) / 180;
    const φ2 = (coords2[1] * Math.PI) / 180;
    const Δφ = ((coords2[1] - coords1[1]) * Math.PI) / 180;
    const Δλ = ((coords2[0] - coords1[0]) * Math.PI) / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }

  /**
   * Create a visualization layer for anomalies
   */
  private async createAnomalyVisualizationLayer(baseLayer: any, anomalies: any[]): Promise<any> {
    // Create a new derived layer for anomalies
    const layer = {
      name: `${baseLayer.name} - Value Anomalies`,
      description: `Anomalies detected in ${baseLayer.name}`,
      project_id: baseLayer.project_id,
      layer_type: 'derived',
      geometry_type: baseLayer.geometry_type,
      source_layer_id: baseLayer.id,
      table_name: `anomalies_${baseLayer.id}_${Date.now()}`,
      visible: true,
      display_order: (baseLayer.display_order || 0) + 1,
      style: JSON.stringify({
        radius: 8,
        fillColor: '#ff0000',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }),
      metadata: JSON.stringify({
        derivationType: 'anomaly_detection',
        anomalyCount: anomalies.length,
        sourceLayer: {
          id: baseLayer.id,
          name: baseLayer.name
        }
      }),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Create the layer in storage
    const createdLayer = await this.storage.createGISLayer(layer);
    
    // In a real implementation, this would create a table and populate it with anomalies
    
    return createdLayer;
  }

  /**
   * Discover patterns for a specific attribute
   */
  private async discoverPatternsForAttribute(
    layer: any,
    features: any[],
    attribute: string,
    patternTypes: string[],
    options: any
  ): Promise<PatternDetectionResult> {
    // Extract attribute values from features
    const values = features
      .map(feature => feature.properties[attribute])
      .filter(value => value !== undefined && value !== null);
    
    if (values.length === 0) {
      return {
        patterns: [],
        confidence: 0,
        explanation: `No data found for attribute "${attribute}"`
      };
    }
    
    // Initialize patterns array
    const patterns = [];
    
    // Check for clustering pattern
    if (patternTypes.includes('clustering')) {
      const clustering = this.detectClusteringPattern(features, attribute);
      if (clustering) {
        patterns.push(clustering);
      }
    }
    
    // Check for dispersion pattern
    if (patternTypes.includes('dispersion')) {
      const dispersion = this.detectDispersionPattern(features, attribute);
      if (dispersion) {
        patterns.push(dispersion);
      }
    }
    
    // Check for trend pattern
    if (patternTypes.includes('trend')) {
      const trend = this.detectTrendPattern(features, attribute);
      if (trend) {
        patterns.push(trend);
      }
    }
    
    // Generate explanation
    let explanation = '';
    if (patterns.length > 0) {
      explanation = `Found ${patterns.length} patterns in attribute "${attribute}": ${patterns.map(p => p.type).join(', ')}`;
    } else {
      explanation = `No significant patterns detected in attribute "${attribute}"`;
    }
    
    return {
      patterns,
      confidence: patterns.length > 0 ? 0.75 : 0,
      explanation
    };
  }

  /**
   * Detect clustering pattern in spatial data
   */
  private detectClusteringPattern(features: any[], attribute: string): any {
    // In a real implementation, this would use spatial statistics (Moran's I, etc.)
    // For this example, we'll use a simplified approach
    
    // Simulate finding a cluster
    return {
      type: 'clustering',
      attribute,
      location: 'Northeast quadrant',
      significance: 0.85,
      description: `High values of ${attribute} are clustered in the northeast quadrant`,
      bounds: [[-122.1, 47.0], [-122.0, 47.1]]
    };
  }

  /**
   * Detect dispersion pattern in spatial data
   */
  private detectDispersionPattern(features: any[], attribute: string): any {
    // In a real implementation, this would use spatial statistics
    
    // For this example, return null (no dispersion pattern)
    return null;
  }

  /**
   * Detect trend pattern in spatial data
   */
  private detectTrendPattern(features: any[], attribute: string): any {
    // In a real implementation, this would use regression analysis
    
    // Simulate finding a trend
    return {
      type: 'trend',
      attribute,
      direction: 'north-south',
      slope: 0.023,
      significance: 0.78,
      description: `Values of ${attribute} gradually increase from south to north`,
      r2: 0.65
    };
  }

  /**
   * Create a pattern visualization layer
   */
  private async createPatternVisualizationLayer(baseLayer: any, patternResult: any, attribute: string): Promise<any> {
    // Create a new derived layer for pattern visualization
    const layer = {
      name: `${baseLayer.name} - ${attribute} Patterns`,
      description: `Spatial patterns of ${attribute} in ${baseLayer.name}`,
      project_id: baseLayer.project_id,
      layer_type: 'derived',
      geometry_type: baseLayer.geometry_type,
      source_layer_id: baseLayer.id,
      table_name: `patterns_${baseLayer.id}_${attribute}_${Date.now()}`,
      visible: true,
      display_order: (baseLayer.display_order || 0) + 1,
      style: JSON.stringify({
        fillColor: '#0000ff',
        color: '#ffffff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.6
      }),
      metadata: JSON.stringify({
        derivationType: 'pattern_detection',
        attribute,
        patternCount: patternResult.patterns.length,
        patterns: patternResult.patterns,
        sourceLayer: {
          id: baseLayer.id,
          name: baseLayer.name
        }
      }),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Create the layer in storage
    const createdLayer = await this.storage.createGISLayer(layer);
    
    // In a real implementation, this would create a table and populate it
    
    return createdLayer;
  }

  /**
   * Create a heatmap layer
   */
  private async createHeatmapLayer(baseLayer: any, features: any[], attribute: string, config: any): Promise<any> {
    // Create a new derived layer for heatmap
    const layer = {
      name: `${baseLayer.name} - ${attribute} Heatmap`,
      description: `Heatmap of ${attribute} values in ${baseLayer.name}`,
      project_id: baseLayer.project_id,
      layer_type: 'heatmap',
      geometry_type: 'Point',
      source_layer_id: baseLayer.id,
      table_name: `heatmap_${baseLayer.id}_${attribute}_${Date.now()}`,
      visible: true,
      display_order: (baseLayer.display_order || 0) + 1,
      style: JSON.stringify({
        type: 'heatmap',
        radius: config.radius,
        blur: config.blur,
        gradient: config.gradient,
        minOpacity: config.minOpacity,
        maxZoom: config.maxZoom
      }),
      metadata: JSON.stringify({
        derivationType: 'heatmap',
        attribute,
        config,
        sourceLayer: {
          id: baseLayer.id,
          name: baseLayer.name
        }
      }),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Create the layer in storage
    const createdLayer = await this.storage.createGISLayer(layer);
    
    // In a real implementation, this would create a table and populate it
    
    return createdLayer;
  }

  /**
   * Analyze and generate zoning optimization suggestions
   */
  private async analyzeZoningOptimizations(
    layer: any,
    zoningFeatures: any[],
    criteria: string[],
    relatedLayers: any[],
    options: any
  ): Promise<any> {
    // In a real implementation, this would use spatial analysis and optimization algorithms
    // For this example, we'll simulate recommendations
    
    // Generate suggestions based on criteria
    const suggestions = [];
    
    if (criteria.includes('density')) {
      suggestions.push({
        id: 'den-1',
        area: 'Downtown core',
        currentZoning: 'C1',
        suggestedZoning: 'C1-HD',
        reason: 'Increase density allowances in downtown core to promote urban infill',
        impact: 'Could increase housing capacity by 25% and reduce sprawl',
        priority: 'high',
        bounds: [[-122.15, 47.05], [-122.10, 47.10]]
      });
    }
    
    if (criteria.includes('mixedUse')) {
      suggestions.push({
        id: 'mix-1',
        area: 'Elmwood neighborhood',
        currentZoning: 'R2',
        suggestedZoning: 'MU-1',
        reason: 'Convert single-use residential to mixed-use to improve walkability',
        impact: 'Would add neighborhood services and reduce car trips',
        priority: 'medium',
        bounds: [[-122.25, 47.15], [-122.20, 47.20]]
      });
    }
    
    if (criteria.includes('transit')) {
      suggestions.push({
        id: 'tra-1',
        area: 'Light rail corridor',
        currentZoning: 'R1',
        suggestedZoning: 'TOD',
        reason: 'Implement Transit-Oriented Development zoning along light rail',
        impact: 'Could increase transit ridership by 35% and reduce parking demand',
        priority: 'high',
        bounds: [[-122.35, 47.25], [-122.30, 47.30]]
      });
    }
    
    return {
      suggestions,
      summary: `Generated ${suggestions.length} optimization suggestions based on ${criteria.join(', ')} criteria.`,
      impactAssessment: 'Overall, these changes could increase housing capacity, improve walkability, and enhance transit usage.'
    };
  }

  /**
   * Create a zoning optimization visualization layer
   */
  private async createZoningOptimizationLayer(baseLayer: any, suggestions: any[], criteria: string[]): Promise<any> {
    // Create a new derived layer for zoning optimization visualization
    const layer = {
      name: `${baseLayer.name} - Zoning Optimization`,
      description: `Suggested zoning optimizations for ${baseLayer.name} based on ${criteria.join(', ')}`,
      project_id: baseLayer.project_id,
      layer_type: 'derived',
      geometry_type: 'Polygon',
      source_layer_id: baseLayer.id,
      table_name: `zoning_opt_${baseLayer.id}_${Date.now()}`,
      visible: true,
      display_order: (baseLayer.display_order || 0) + 1,
      style: JSON.stringify({
        fillColor: '#ff9900',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.6
      }),
      metadata: JSON.stringify({
        derivationType: 'zoning_optimization',
        criteria,
        suggestionCount: suggestions.length,
        suggestions,
        sourceLayer: {
          id: baseLayer.id,
          name: baseLayer.name
        }
      }),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Create the layer in storage
    const createdLayer = await this.storage.createGISLayer(layer);
    
    // In a real implementation, this would create a table and populate it
    
    return createdLayer;
  }
}
/**
 * Spatial GIS Agent
 * 
 * This agent specializes in spatial analysis and mapping operations using
 * authentic Benton County GIS data from the ArcGIS REST services.
 * 
 * The agent provides capabilities for parcel mapping, spatial searches,
 * neighborhood analysis, and other GIS-related operations.
 */

import { BaseAgent, AgentConfig } from './base-agent';
import { IStorage } from '../../storage';
import { MCPService } from '../mcp';
import { ArcGISService } from '../arcgis-service';
import { BentonMarketFactorService } from '../benton-market-factor-service';

interface SpatialAnalysisOptions {
  includeNeighbors?: boolean;
  radius?: number;
  includeValue?: boolean;
  includeOwnership?: boolean;
  includeDemographics?: boolean;
  includeZoning?: boolean;
}

export class SpatialGISAgent extends BaseAgent {
  private arcgisService: ArcGISService;
  private marketFactorService: BentonMarketFactorService;
  
  constructor(
    storage: IStorage,
    mcpService: MCPService,
    arcgisService: ArcGISService,
    marketFactorService: BentonMarketFactorService
  ) {
    // Define agent configuration
    const config: AgentConfig = {
      id: 'spatial_gis',
      name: 'Spatial GIS Agent',
      description: 'Specializes in spatial analysis and mapping operations for Benton County properties',
      capabilities: [],
      permissions: []
    };
    
    // Initialize the base agent
    super(storage, mcpService, config);
    
    // Store service references
    this.arcgisService = arcgisService;
    this.marketFactorService = marketFactorService;
    
    // Add capabilities
    this.config.capabilities = [
      {
        name: 'getSpatialInfo',
        description: 'Get spatial information for a property including GIS data',
        handler: this.getSpatialInfo.bind(this)
      },
      {
        name: 'getNeighborhoodMap',
        description: 'Generate a neighborhood map and analysis for a property',
        handler: this.getNeighborhoodMap.bind(this)
      },
      {
        name: 'searchByLocation',
        description: 'Search for properties by geographic location or proximity',
        handler: this.searchByLocation.bind(this)
      },
      {
        name: 'analyzeZoning',
        description: 'Analyze zoning information and land use for a property',
        handler: this.analyzeZoning.bind(this)
      },
      {
        name: 'generateHeatmap',
        description: 'Generate a property value heatmap for an area',
        handler: this.generateHeatmap.bind(this)
      }
    ];
  }
  
  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    await this.baseInitialize();
    
    // Register MCP tools
    await this.registerMCPTools([
      {
        name: 'gis.getParcel',
        description: 'Get parcel information from the GIS system',
        handler: async (params: any) => {
          const { parcelId } = params;
          
          if (!parcelId) {
            return { success: false, error: 'Parcel ID is required' };
          }
          
          const parcel = await this.arcgisService.getParcelByParcelId(parcelId);
          
          if (!parcel) {
            return { success: false, error: 'Parcel not found' };
          }
          
          return { success: true, result: parcel };
        }
      },
      {
        name: 'gis.searchParcels',
        description: 'Search for parcels in the GIS system',
        handler: async (params: any) => {
          const results = await this.arcgisService.searchParcels(params);
          return { success: true, result: results };
        }
      },
      {
        name: 'gis.getNeighboringParcels',
        description: 'Get neighboring parcels for a given parcel',
        handler: async (params: any) => {
          const { parcelId } = params;
          
          if (!parcelId) {
            return { success: false, error: 'Parcel ID is required' };
          }
          
          const neighbors = await this.arcgisService.getNeighboringParcels(parcelId);
          return { success: true, result: neighbors };
        }
      }
    ]);
    
    // Log successful initialization
    await this.logActivity('initialization', 'Spatial GIS Agent initialized successfully');
  }
  
  /**
   * Get spatial information for a property
   */
  private async getSpatialInfo(params: any): Promise<any> {
    try {
      const { propertyId } = params;
      
      if (!propertyId) {
        return { success: false, error: 'Property ID is required' };
      }
      
      // Get the property to extract the parcel number
      const property = await this.executeMCPTool('property.getByPropertyId', { propertyId });
      
      if (!property?.success || !property.result) {
        return { success: false, error: 'Property not found' };
      }
      
      const parcelNumber = property.result.parcelNumber;
      
      // Get GIS parcel information
      const parcel = await this.executeMCPTool('gis.getParcel', { parcelId: parcelNumber });
      
      if (!parcel?.success || !parcel.result) {
        return { success: false, error: 'GIS parcel information not found' };
      }
      
      // Convert parcel to a simplified format with relevant spatial information
      const spatialInfo = {
        propertyId,
        parcelId: parcelNumber,
        address: property.result.address,
        coordinates: this.extractCoordinates(parcel.result),
        area: {
          acres: parcel.result.attributes.ACRES || property.result.acres,
          squareFeet: (parcel.result.attributes.ACRES || property.result.acres) * 43560
        },
        zoning: parcel.result.attributes.ZONING || 'Unknown',
        shape: {
          type: 'Polygon',
          rings: parcel.result.geometry?.rings || []
        }
      };
      
      await this.logActivity('spatial_info_generated', 'Spatial information generated', { propertyId });
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'getSpatialInfo',
        result: spatialInfo
      };
    } catch (error: any) {
      await this.logActivity('spatial_info_error', `Error generating spatial information: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'getSpatialInfo',
        error: `Failed to get spatial information: ${error.message}`
      };
    }
  }
  
  /**
   * Generate a neighborhood map and analysis for a property
   */
  private async getNeighborhoodMap(params: any): Promise<any> {
    try {
      const { propertyId, options = {} } = params;
      
      if (!propertyId) {
        return { success: false, error: 'Property ID is required' };
      }
      
      // Get the property to extract the parcel number
      const property = await this.executeMCPTool('property.getByPropertyId', { propertyId });
      
      if (!property?.success || !property.result) {
        return { success: false, error: 'Property not found' };
      }
      
      const parcelNumber = property.result.parcelNumber;
      
      // Get neighboring parcels
      const neighbors = await this.executeMCPTool('gis.getNeighboringParcels', { parcelId: parcelNumber });
      
      if (!neighbors?.success) {
        return { success: false, error: 'Failed to get neighboring parcels' };
      }
      
      // Convert neighboring parcels to properties
      const neighboringProperties = neighbors.result.map((parcel: any) => 
        this.arcgisService.convertToProperty(parcel)
      ).filter(Boolean);
      
      // Get market factors for context
      const marketFactors = await this.marketFactorService.getPropertyMarketFactors(propertyId);
      const marketImpact = this.marketFactorService.calculateMarketFactorImpact(marketFactors);
      
      // Analyze neighborhood characteristics
      const neighborhoodAnalysis = this.analyzeNeighborhood(property.result, neighboringProperties);
      
      // Create map bounds that include the property and all neighbors
      const mapBounds = this.calculateMapBounds([property.result, ...neighboringProperties]);
      
      // Generate result
      const result = {
        propertyId,
        address: property.result.address,
        neighborhood: {
          name: this.deriveNeighborhoodName(property.result.address),
          properties: neighboringProperties.length,
          medianValue: neighborhoodAnalysis.medianValue,
          valueRange: neighborhoodAnalysis.valueRange,
          predominantPropertyType: neighborhoodAnalysis.predominantPropertyType,
          averageYearBuilt: neighborhoodAnalysis.averageYearBuilt
        },
        market: {
          outlook: marketImpact.marketOutlook,
          keyFactors: marketImpact.dominantFactors.map(f => f.name)
        },
        map: {
          centroid: this.calculateCentroid(property.result),
          bounds: mapBounds,
          zoomLevel: 17
        }
      };
      
      await this.logActivity('neighborhood_map_generated', 'Neighborhood map generated', { propertyId });
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'getNeighborhoodMap',
        result
      };
    } catch (error: any) {
      await this.logActivity('neighborhood_map_error', `Error generating neighborhood map: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'getNeighborhoodMap',
        error: `Failed to generate neighborhood map: ${error.message}`
      };
    }
  }
  
  /**
   * Search for properties by geographic location or proximity
   */
  private async searchByLocation(params: any): Promise<any> {
    try {
      const { 
        latitude, 
        longitude, 
        address, 
        radius = 1000, 
        maxResults = 20 
      } = params;
      
      // Search by coordinates if provided
      if (latitude && longitude) {
        // Search in a radius around the provided coordinates
        const results = await this.executeMCPTool('gis.searchParcels', {
          geometryType: 'esriGeometryPoint',
          geometry: `${longitude},${latitude}`,
          distance: radius.toString(),
          units: 'esriSRUnit_Meter',
          spatialRel: 'esriSpatialRelIntersects',
          maxRecordCount: maxResults
        });
        
        if (!results?.success) {
          return { success: false, error: 'Failed to search by coordinates' };
        }
        
        const properties = results.result
          .map((parcel: any) => this.arcgisService.convertToProperty(parcel))
          .filter(Boolean);
        
        return {
          success: true,
          agent: this.config.name,
          capability: 'searchByLocation',
          result: properties
        };
      }
      
      // Search by address if provided
      if (address) {
        const results = await this.executeMCPTool('gis.searchParcels', {
          address: address
        });
        
        if (!results?.success) {
          return { success: false, error: 'Failed to search by address' };
        }
        
        const properties = results.result
          .map((parcel: any) => this.arcgisService.convertToProperty(parcel))
          .filter(Boolean);
        
        return {
          success: true,
          agent: this.config.name,
          capability: 'searchByLocation',
          result: properties
        };
      }
      
      return { success: false, error: 'Either latitude/longitude or address is required' };
    } catch (error: any) {
      await this.logActivity('location_search_error', `Error searching by location: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'searchByLocation',
        error: `Failed to search by location: ${error.message}`
      };
    }
  }
  
  /**
   * Analyze zoning information and land use for a property
   */
  private async analyzeZoning(params: any): Promise<any> {
    try {
      const { propertyId } = params;
      
      if (!propertyId) {
        return { success: false, error: 'Property ID is required' };
      }
      
      // Get the property to extract the parcel number
      const property = await this.executeMCPTool('property.getByPropertyId', { propertyId });
      
      if (!property?.success || !property.result) {
        return { success: false, error: 'Property not found' };
      }
      
      const parcelNumber = property.result.parcelNumber;
      
      // Get GIS parcel information
      const parcel = await this.executeMCPTool('gis.getParcel', { parcelId: parcelNumber });
      
      if (!parcel?.success || !parcel.result) {
        return { success: false, error: 'GIS parcel information not found' };
      }
      
      const zoning = parcel.result.attributes.ZONING || property.result.extraFields?.zoning || 'Unknown';
      
      // Get zoning regulations and description
      const zoningInfo = this.getZoningInfo(zoning);
      
      // Get land use impacts from market factor service
      const marketFactors = await this.marketFactorService.getPropertyMarketFactors(propertyId);
      const landUseFactors = marketFactors.filter(f => 
        f.name.includes('Development') || 
        f.name.includes('Zoning') || 
        f.name.includes('Land')
      );
      
      // Generate result
      const result = {
        propertyId,
        address: property.result.address,
        zoning: {
          code: zoning,
          description: zoningInfo.description,
          allowedUses: zoningInfo.allowedUses,
          restrictions: zoningInfo.restrictions
        },
        landUse: {
          current: zoningInfo.currentUse,
          potential: zoningInfo.potentialUses,
          restrictions: zoningInfo.restrictions
        },
        marketFactors: landUseFactors
      };
      
      await this.logActivity('zoning_analysis_generated', 'Zoning analysis generated', { propertyId });
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'analyzeZoning',
        result
      };
    } catch (error: any) {
      await this.logActivity('zoning_analysis_error', `Error analyzing zoning: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'analyzeZoning',
        error: `Failed to analyze zoning: ${error.message}`
      };
    }
  }
  
  /**
   * Generate a property value heatmap for an area
   */
  private async generateHeatmap(params: any): Promise<any> {
    try {
      const { 
        center, 
        zipCode,
        radius = 2000,
        valueType = 'assessed' // 'assessed', 'land', 'improvement', 'sqft_price'
      } = params;
      
      if (!center && !zipCode) {
        return { success: false, error: 'Either center coordinates or zipCode is required' };
      }
      
      let searchParams: any = {};
      
      // Search by center coordinates if provided
      if (center && center.latitude && center.longitude) {
        searchParams = {
          geometryType: 'esriGeometryPoint',
          geometry: `${center.longitude},${center.latitude}`,
          distance: radius.toString(),
          units: 'esriSRUnit_Meter',
          spatialRel: 'esriSpatialRelIntersects',
          maxRecordCount: 500
        };
      } 
      // Otherwise search by address with zipCode
      else if (zipCode) {
        searchParams = {
          address: zipCode
        };
      }
      
      // Execute search
      const results = await this.executeMCPTool('gis.searchParcels', searchParams);
      
      if (!results?.success) {
        return { success: false, error: 'Failed to search parcels for heatmap' };
      }
      
      // Convert to properties
      const properties = results.result
        .map((parcel: any) => this.arcgisService.convertToProperty(parcel))
        .filter(Boolean);
      
      // Create heatmap data points
      const heatmapData = properties.map(property => {
        // Determine value to use based on valueType
        let value = property.value; // Default to assessed value
        
        if (valueType === 'land' && property.extraFields?.landValue) {
          value = property.extraFields.landValue;
        } else if (valueType === 'improvement' && property.extraFields?.improvementValue) {
          value = property.extraFields.improvementValue;
        } else if (valueType === 'sqft_price' && property.extraFields?.squareFootage) {
          value = property.value / (property.extraFields.squareFootage || 1);
        }
        
        // Extract coordinates from property
        const coordinates = this.calculateCentroid(property);
        
        return {
          location: coordinates,
          value,
          propertyId: property.propertyId
        };
      });
      
      // Calculate map bounds
      const mapBounds = this.calculateMapBounds(properties);
      
      // Generate value ranges for legend
      const values = heatmapData.map(point => point.value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const valueRange = maxValue - minValue;
      
      const colorRanges = [
        { min: minValue, max: minValue + valueRange * 0.2, color: '#00ff00' }, // Green
        { min: minValue + valueRange * 0.2, max: minValue + valueRange * 0.4, color: '#66ff33' }, // Light green
        { min: minValue + valueRange * 0.4, max: minValue + valueRange * 0.6, color: '#ffff00' }, // Yellow
        { min: minValue + valueRange * 0.6, max: minValue + valueRange * 0.8, color: '#ff9900' }, // Orange
        { min: minValue + valueRange * 0.8, max: maxValue, color: '#ff0000' }  // Red
      ];
      
      // Generate result
      const result = {
        valueType,
        dataPoints: heatmapData,
        mapBounds,
        legend: {
          title: this.getValueTypeLabel(valueType),
          ranges: colorRanges,
          minValue,
          maxValue
        },
        summary: {
          count: properties.length,
          averageValue: values.reduce((sum, val) => sum + val, 0) / values.length,
          medianValue: this.calculateMedian(values)
        }
      };
      
      await this.logActivity('heatmap_generated', 'Property value heatmap generated');
      
      return {
        success: true,
        agent: this.config.name,
        capability: 'generateHeatmap',
        result
      };
    } catch (error: any) {
      await this.logActivity('heatmap_error', `Error generating heatmap: ${error.message}`);
      
      return {
        success: false,
        agent: this.config.name,
        capability: 'generateHeatmap',
        error: `Failed to generate heatmap: ${error.message}`
      };
    }
  }
  
  // Helper functions
  
  /**
   * Extract coordinates from a parcel feature
   */
  private extractCoordinates(parcel: any): [number, number] | null {
    if (!parcel?.geometry?.rings || !parcel.geometry.rings.length) {
      return null;
    }
    
    return this.calculateCentroid(parcel);
  }
  
  /**
   * Calculate centroid of a property or parcel
   */
  private calculateCentroid(property: any): [number, number] {
    // If it's a parcel from ArcGIS with geometry.rings
    if (property?.geometry?.rings && property.geometry.rings.length > 0) {
      const ring = property.geometry.rings[0];
      let sumX = 0;
      let sumY = 0;
      
      ring.forEach((point: [number, number]) => {
        sumX += point[0];
        sumY += point[1];
      });
      
      return [sumX / ring.length, sumY / ring.length];
    }
    
    // If it's a property with a parsed address, try to extract coordinates
    // This is a very simplified implementation - in a real system, we would use a geocoding service
    if (property?.address) {
      const zipCode = property.address.match(/\d{5}(?:-\d{4})?/)?.[0] || '';
      
      // Default coordinates for common Benton County zip codes
      const zipCodeCoordinates: { [key: string]: [number, number] } = {
        '99336': [-119.1678, 46.2087], // Kennewick
        '99352': [-119.2846, 46.2779], // Richland
        '99323': [-118.6756, 46.0514], // Benton City
        '99320': [-119.2710, 46.2263], // Prosser
        '99337': [-119.1375, 46.1771]  // South Kennewick
      };
      
      if (zipCode && zipCodeCoordinates[zipCode]) {
        return zipCodeCoordinates[zipCode];
      }
    }
    
    // Default to center of Benton County if we can't determine coordinates
    return [-119.1678, 46.2087]; // Central Kennewick coordinates
  }
  
  /**
   * Calculate map bounds that include all properties
   */
  private calculateMapBounds(properties: any[]): {
    southwest: [number, number];
    northeast: [number, number];
  } {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    
    properties.forEach(property => {
      const coords = this.calculateCentroid(property);
      minLng = Math.min(minLng, coords[0]);
      maxLng = Math.max(maxLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLat = Math.max(maxLat, coords[1]);
    });
    
    // Add padding to bounds
    const padding = 0.01; // about 1km
    
    return {
      southwest: [minLng - padding, minLat - padding],
      northeast: [maxLng + padding, maxLat + padding]
    };
  }
  
  /**
   * Analyze neighborhood characteristics
   */
  private analyzeNeighborhood(property: any, neighbors: any[]): {
    medianValue: number;
    valueRange: { min: number; max: number };
    predominantPropertyType: string;
    averageYearBuilt: number;
  } {
    // Calculate median property value
    const values = neighbors.map(n => n.value);
    const medianValue = this.calculateMedian(values);
    
    // Calculate value range
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // Determine predominant property type
    const propertyTypes: { [key: string]: number } = {};
    neighbors.forEach(n => {
      const type = n.propertyType || 'Unknown';
      propertyTypes[type] = (propertyTypes[type] || 0) + 1;
    });
    
    let predominantPropertyType = 'Unknown';
    let maxCount = 0;
    
    Object.entries(propertyTypes).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        predominantPropertyType = type;
      }
    });
    
    // Calculate average year built
    const yearsBuilt = neighbors
      .map(n => n.extraFields?.yearBuilt)
      .filter(Boolean) as number[];
    
    const averageYearBuilt = yearsBuilt.length > 0 
      ? Math.round(yearsBuilt.reduce((sum, year) => sum + year, 0) / yearsBuilt.length)
      : 0;
    
    return {
      medianValue,
      valueRange: { min: minValue, max: maxValue },
      predominantPropertyType,
      averageYearBuilt
    };
  }
  
  /**
   * Calculate median of a numeric array
   */
  private calculateMedian(values: number[]): number {
    if (!values.length) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    
    return sorted[middle];
  }
  
  /**
   * Derive neighborhood name from an address
   */
  private deriveNeighborhoodName(address: string): string {
    // Extract city if available
    const cityMatch = address.match(/([^,]+),\s*WA/i);
    const city = cityMatch ? cityMatch[1].trim() : 'Benton County';
    
    // Simple mapping for common Benton County cities to neighborhoods
    const neighborhoodMap: { [key: string]: string[] } = {
      'Kennewick': ['Downtown Kennewick', 'South Kennewick', 'East Kennewick', 'Southridge', 'Canyon Lakes'],
      'Richland': ['Downtown Richland', 'North Richland', 'South Richland', 'Horn Rapids', 'Badger Mountain'],
      'West Richland': ['Benton City', 'Red Mountain', 'West Richland Heights'],
      'Prosser': ['Downtown Prosser', 'Wine Country', 'Prosser Heights'],
      'Benton City': ['Downtown Benton City', 'Red Mountain']
    };
    
    // If we have neighborhoods for this city, choose one based on the hash of the address
    if (neighborhoodMap[city]) {
      const neighborhoods = neighborhoodMap[city];
      // Use a simple hash of the address to consistently pick a neighborhood
      const hashCode = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const index = hashCode % neighborhoods.length;
      return neighborhoods[index];
    }
    
    // Default
    return `${city} Area`;
  }
  
  /**
   * Get zoning information for a zoning code
   */
  private getZoningInfo(zoning: string): {
    description: string;
    allowedUses: string[];
    currentUse: string;
    potentialUses: string[];
    restrictions: string[];
  } {
    // Benton County zoning information
    const zoningInfo: { [key: string]: any } = {
      'R-1': {
        description: 'Single-Family Residential District',
        allowedUses: ['Single Family Homes', 'Accessory Dwellings', 'Parks', 'Schools', 'Religious Institutions'],
        currentUse: 'Single Family Residential',
        potentialUses: ['Accessory Dwelling Unit', 'Home Office', 'Guest House'],
        restrictions: ['Minimum lot size of 7,500 sq ft', 'Maximum height of 35 feet', 'Minimum setbacks: 20 ft front, 5 ft side, 20 ft rear']
      },
      'R-2': {
        description: 'Medium Density Residential District',
        allowedUses: ['Single Family Homes', 'Duplexes', 'Townhouses', 'Parks', 'Schools'],
        currentUse: 'Medium Density Residential',
        potentialUses: ['Duplex', 'Townhouse', 'ADU', 'Small Multi-Family'],
        restrictions: ['Minimum lot size of 5,000 sq ft', 'Maximum height of 35 feet', 'Minimum setbacks: 15 ft front, 5 ft side, 15 ft rear']
      },
      'R-3': {
        description: 'High Density Residential District',
        allowedUses: ['Apartments', 'Condominiums', 'Townhouses', 'Duplexes', 'Parks'],
        currentUse: 'Multi-Family Residential',
        potentialUses: ['Apartment Complex', 'Condominium Development', 'Senior Housing'],
        restrictions: ['Minimum lot size of 2,000 sq ft per unit', 'Maximum height of 45 feet', 'Minimum setbacks: 10 ft front, 5 ft side, 10 ft rear']
      },
      'C-1': {
        description: 'Neighborhood Commercial District',
        allowedUses: ['Retail Stores', 'Professional Offices', 'Personal Services', 'Restaurants', 'Banks'],
        currentUse: 'Neighborhood Commercial',
        potentialUses: ['Small Retail', 'Office Space', 'Restaurant', 'Mixed Use'],
        restrictions: ['Maximum floor area ratio of 0.5', 'Maximum height of 30 feet', 'Minimum setbacks: 10 ft front, 5 ft side, 10 ft rear']
      },
      'C-2': {
        description: 'General Commercial District',
        allowedUses: ['Retail Stores', 'Shopping Centers', 'Hotels', 'Restaurants', 'Entertainment Venues'],
        currentUse: 'General Commercial',
        potentialUses: ['Retail Center', 'Office Complex', 'Hotel/Motel', 'Entertainment Venue'],
        restrictions: ['Maximum floor area ratio of 1.0', 'Maximum height of 45 feet', 'Minimum setbacks: 5 ft front, 0 ft side, 10 ft rear']
      },
      'I-1': {
        description: 'Light Industrial District',
        allowedUses: ['Manufacturing', 'Warehousing', 'Research Facilities', 'Distribution Centers'],
        currentUse: 'Light Industrial',
        potentialUses: ['Light Manufacturing', 'Warehouse', 'Research & Development', 'Self-Storage'],
        restrictions: ['Maximum floor area ratio of 0.75', 'Maximum height of 50 feet', 'Minimum setbacks: 20 ft front, 10 ft side, 20 ft rear']
      },
      'I-2': {
        description: 'Heavy Industrial District',
        allowedUses: ['Manufacturing', 'Processing', 'Storage', 'Distribution', 'Utilities'],
        currentUse: 'Heavy Industrial',
        potentialUses: ['Manufacturing', 'Processing Facility', 'Logistics Center'],
        restrictions: ['Maximum floor area ratio of 1.0', 'Maximum height of 75 feet', 'Minimum setbacks: 30 ft front, 15 ft side, 30 ft rear']
      },
      'A-1': {
        description: 'Agricultural District',
        allowedUses: ['Farming', 'Ranching', 'Wineries', 'Single Family Homes', 'Agricultural Support Services'],
        currentUse: 'Agricultural',
        potentialUses: ['Farm', 'Ranch', 'Winery', 'Orchard', 'Agricultural Tourism'],
        restrictions: ['Minimum lot size of 5 acres', 'Maximum height of 35 feet for residences', 'Minimum setbacks: 50 ft front, 20 ft side, 50 ft rear']
      }
    };
    
    // Return zoning info if available, or a default
    return zoningInfo[zoning] || {
      description: 'Unknown Zoning Classification',
      allowedUses: ['Verify with Benton County Planning Department'],
      currentUse: 'Unknown',
      potentialUses: ['Verify with Benton County Planning Department'],
      restrictions: ['Verify with Benton County Planning Department']
    };
  }
  
  /**
   * Get label for value type
   */
  private getValueTypeLabel(valueType: string): string {
    const labels: { [key: string]: string } = {
      'assessed': 'Assessed Value',
      'land': 'Land Value',
      'improvement': 'Improvement Value',
      'sqft_price': 'Price per Square Foot'
    };
    
    return labels[valueType] || 'Property Value';
  }
}

// Don't export a default instance - we'll create it in the agent system
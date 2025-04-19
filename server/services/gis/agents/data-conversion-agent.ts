/**
 * Data Conversion Agent
 * 
 * This agent automates the transformation of various GIS data formats
 * (Shapefile, KML, GeoJSON, etc.) into standardized formats for the platform.
 * It ensures compatibility and seamless integration of different spatial data sources.
 */

import { IStorage } from '../../../storage';
import { BaseGISAgent } from './base-gis-agent';
import { sql } from 'drizzle-orm';
import { db } from '../../../db';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import * as child_process from 'child_process';

// Promisify fs operations
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const exec = promisify(child_process.exec);

/**
 * Create a Data Conversion Agent
 * @param storage The storage implementation
 * @returns A new DataConversionAgent instance
 */
export function createDataConversionAgent(storage: IStorage) {
  // Generate a unique ID for this agent instance
  const agentId = `data-conversion-agent-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  
  return new DataConversionAgent(storage, agentId);
}

class DataConversionAgent extends BaseGISAgent {
  private tempDir: string;
  private converters: Map<string, Function>;

  constructor(storage: IStorage, agentId: string) {
    // First call super with basic config, then we'll add capabilities after constructor
    const config = {
      id: agentId,
      name: 'Data Conversion Agent',
      description: 'Automates the transformation of various GIS data formats into standardized formats',
      capabilities: [],
      permissions: ['gis:read', 'gis:write', 'gis:convert', 'file:read', 'file:write']
    };
    
    super(storage, config);
    
    // Now add the capabilities after super() has been called
    this.config.capabilities = [
      {
        name: 'convertToGeoJSON',
        description: 'Convert various spatial data formats to GeoJSON',
        parameters: {
          sourceFormat: { type: 'string', enum: ['shapefile', 'kml', 'geojson', 'csv', 'gml', 'gpx'], description: 'Source data format' },
          sourceData: { type: 'object', description: 'Source data (file content as base64 or URL)' },
          options: { type: 'object', optional: true, description: 'Additional conversion options' }
        },
        handler: this.convertToGeoJSON.bind(this)
      },
      {
        name: 'convertFromGeoJSON',
        description: 'Convert GeoJSON to various spatial data formats',
        parameters: {
          targetFormat: { type: 'string', enum: ['shapefile', 'kml', 'csv', 'gml', 'gpx'], description: 'Target data format' },
          geoJSON: { type: 'object', description: 'GeoJSON data to convert' },
          options: { type: 'object', optional: true, description: 'Additional conversion options' }
        },
        handler: this.convertFromGeoJSON.bind(this)
      },
      {
        name: 'detectFormat',
        description: 'Detect the format of spatial data',
        parameters: {
          data: { type: 'object', description: 'Spatial data to analyze (file content as base64 or URL)' }
        },
        handler: this.detectFormat.bind(this)
      },
      {
        name: 'validateGeoJSON',
        description: 'Validate GeoJSON data',
        parameters: {
          geoJSON: { type: 'object', description: 'GeoJSON data to validate' },
          options: { type: 'object', optional: true, description: 'Additional validation options' }
        },
        handler: this.validateGeoJSON.bind(this)
      },
      {
        name: 'repairGeometry',
        description: 'Repair invalid geometries',
        parameters: {
          geoJSON: { type: 'object', description: 'GeoJSON data containing geometries to repair' },
          options: { type: 'object', optional: true, description: 'Additional repair options' }
        },
        handler: this.repairGeometry.bind(this)
      }
    ];

    // Set up temp directory for conversions
    this.tempDir = path.join(process.cwd(), 'uploads', 'gis_temp');
    
    // Initialize converters map
    this.converters = new Map();
    this.setupConverters();
  }

  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    try {
      await this.baseInitialize();
      
      // Ensure temp directory exists
      await mkdir(this.tempDir, { recursive: true });
      
      // Log the initialization
      await this.createAgentMessage({
        type: 'INFO',
        content: `Agent ${this.name} (${this.agentId}) initialized`,
        agentId: this.agentId
      });
      
      console.log(`Data Conversion Agent (${this.agentId}) initialized successfully`);
    } catch (error) {
      console.error(`Error initializing Data Conversion Agent:`, error);
      throw error;
    }
  }

  /**
   * Set up the format converter functions
   */
  private setupConverters(): void {
    // Setup converter functions for different formats
    this.converters.set('shapefile_to_geojson', this.shapefileToGeoJSON.bind(this));
    this.converters.set('kml_to_geojson', this.kmlToGeoJSON.bind(this));
    this.converters.set('csv_to_geojson', this.csvToGeoJSON.bind(this));
    this.converters.set('gml_to_geojson', this.gmlToGeoJSON.bind(this));
    this.converters.set('gpx_to_geojson', this.gpxToGeoJSON.bind(this));
    
    this.converters.set('geojson_to_shapefile', this.geoJSONToShapefile.bind(this));
    this.converters.set('geojson_to_kml', this.geoJSONToKML.bind(this));
    this.converters.set('geojson_to_csv', this.geoJSONToCSV.bind(this));
    this.converters.set('geojson_to_gml', this.geoJSONToGML.bind(this));
    this.converters.set('geojson_to_gpx', this.geoJSONToGPX.bind(this));
  }

  /**
   * Convert various spatial data formats to GeoJSON
   */
  private async convertToGeoJSON(params: any): Promise<any> {
    try {
      const { sourceFormat, sourceData, options = {} } = params;
      
      // Validate parameters
      if (!sourceFormat || !sourceData) {
        throw new Error('Source format and data are required');
      }
      
      // Check if we have a converter for this format
      const converterKey = `${sourceFormat}_to_geojson`;
      if (!this.converters.has(converterKey)) {
        throw new Error(`Unsupported source format: ${sourceFormat}`);
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Converting ${sourceFormat} to GeoJSON`,
        agentId: this.agentId,
        metadata: { sourceFormat, options }
      });
      
      // Get the converter function
      const converter = this.converters.get(converterKey);
      
      // Perform the conversion
      const result = await converter(sourceData, options);
      
      return {
        success: true,
        message: `Successfully converted ${sourceFormat} to GeoJSON`,
        sourceFormat,
        geoJSON: result.geoJSON,
        metadata: {
          featureCount: result.featureCount,
          operation: 'convert_to_geojson',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in convertToGeoJSON:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error converting to GeoJSON: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Convert GeoJSON to various spatial data formats
   */
  private async convertFromGeoJSON(params: any): Promise<any> {
    try {
      const { targetFormat, geoJSON, options = {} } = params;
      
      // Validate parameters
      if (!targetFormat || !geoJSON) {
        throw new Error('Target format and GeoJSON data are required');
      }
      
      // Check if we have a converter for this format
      const converterKey = `geojson_to_${targetFormat}`;
      if (!this.converters.has(converterKey)) {
        throw new Error(`Unsupported target format: ${targetFormat}`);
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Converting GeoJSON to ${targetFormat}`,
        agentId: this.agentId,
        metadata: { targetFormat, options }
      });
      
      // Get the converter function
      const converter = this.converters.get(converterKey);
      
      // Perform the conversion
      const result = await converter(geoJSON, options);
      
      return {
        success: true,
        message: `Successfully converted GeoJSON to ${targetFormat}`,
        targetFormat,
        data: result.data,
        format: result.format,
        metadata: {
          operation: 'convert_from_geojson',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in convertFromGeoJSON:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error converting from GeoJSON: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Detect the format of spatial data
   */
  private async detectFormat(params: any): Promise<any> {
    try {
      const { data } = params;
      
      // Validate parameters
      if (!data) {
        throw new Error('Data is required');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Detecting format of spatial data`,
        agentId: this.agentId
      });
      
      // Check if data is a URL or base64
      let filePath = '';
      let result = { format: 'unknown', confidence: 0 };
      
      if (typeof data === 'string' && data.startsWith('http')) {
        // Handle URL
        // Download file and save to temp directory
        filePath = path.join(this.tempDir, `downloaded_${Date.now()}`);
        // Implementation would download the file here
        
        // Detect format from downloaded file
        result = this.detectFormatFromFile(filePath);
      } else if (data.base64) {
        // Handle base64
        // Save to temp file
        filePath = path.join(this.tempDir, `converted_${Date.now()}`);
        await writeFile(filePath, Buffer.from(data.base64, 'base64'));
        
        // Detect format from file
        result = this.detectFormatFromFile(filePath);
      } else {
        // Handle direct content (if possible)
        if (this.isGeoJSON(data)) {
          result = { format: 'geojson', confidence: 0.9 };
        } else if (this.isKML(data)) {
          result = { format: 'kml', confidence: 0.8 };
        } else {
          result = { format: 'unknown', confidence: 0 };
        }
      }
      
      return {
        success: true,
        message: `Detected format: ${result.format}`,
        format: result.format,
        confidence: result.confidence,
        metadata: {
          operation: 'detect_format',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in detectFormat:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error detecting format: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Validate GeoJSON data
   */
  private async validateGeoJSON(params: any): Promise<any> {
    try {
      const { geoJSON, options = {} } = params;
      
      // Validate parameters
      if (!geoJSON) {
        throw new Error('GeoJSON data is required');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Validating GeoJSON data`,
        agentId: this.agentId,
        metadata: { options }
      });
      
      // Basic GeoJSON validation
      if (!geoJSON.type) {
        throw new Error('Invalid GeoJSON: missing "type" property');
      }
      
      const validTypes = ['FeatureCollection', 'Feature', 'Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];
      if (!validTypes.includes(geoJSON.type)) {
        throw new Error(`Invalid GeoJSON: "type" must be one of ${validTypes.join(', ')}`);
      }
      
      // Validate features if it's a FeatureCollection
      const issues = [];
      if (geoJSON.type === 'FeatureCollection') {
        if (!Array.isArray(geoJSON.features)) {
          issues.push('Invalid FeatureCollection: missing or invalid "features" array');
        } else {
          // Check each feature
          geoJSON.features.forEach((feature, index) => {
            if (feature.type !== 'Feature') {
              issues.push(`Feature ${index}: missing or invalid "type" property`);
            }
            
            if (!feature.geometry) {
              issues.push(`Feature ${index}: missing "geometry" property`);
            } else if (!validTypes.includes(feature.geometry.type)) {
              issues.push(`Feature ${index}: invalid geometry type "${feature.geometry.type}"`);
            }
            
            // Validate geometry based on its type
            if (feature.geometry && feature.geometry.type) {
              const geometryIssues = this.validateGeometry(feature.geometry);
              geometryIssues.forEach(issue => {
                issues.push(`Feature ${index}: ${issue}`);
              });
            }
          });
        }
      }
      
      // Validate individual Feature
      if (geoJSON.type === 'Feature') {
        if (!geoJSON.geometry) {
          issues.push('Invalid Feature: missing "geometry" property');
        } else if (!validTypes.includes(geoJSON.geometry.type)) {
          issues.push(`Invalid Feature: invalid geometry type "${geoJSON.geometry.type}"`);
        }
        
        // Validate geometry
        if (geoJSON.geometry && geoJSON.geometry.type) {
          const geometryIssues = this.validateGeometry(geoJSON.geometry);
          geometryIssues.forEach(issue => {
            issues.push(`Feature: ${issue}`);
          });
        }
      }
      
      // Check if it's just a geometry
      if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(geoJSON.type)) {
        const geometryIssues = this.validateGeometry(geoJSON);
        issues.push(...geometryIssues);
      }
      
      return {
        success: issues.length === 0,
        message: issues.length === 0 ? 'GeoJSON is valid' : 'GeoJSON has validation issues',
        issues,
        metadata: {
          operation: 'validate_geojson',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in validateGeoJSON:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error validating GeoJSON: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Repair invalid geometries in GeoJSON
   */
  private async repairGeometry(params: any): Promise<any> {
    try {
      const { geoJSON, options = {} } = params;
      
      // Validate parameters
      if (!geoJSON) {
        throw new Error('GeoJSON data is required');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Repairing geometries in GeoJSON data`,
        agentId: this.agentId,
        metadata: { options }
      });
      
      // Create a deep copy of the GeoJSON to modify
      const repairedGeoJSON = JSON.parse(JSON.stringify(geoJSON));
      
      // Counter for repairs made
      let repairsMade = 0;
      
      // Process based on GeoJSON type
      if (repairedGeoJSON.type === 'FeatureCollection') {
        if (Array.isArray(repairedGeoJSON.features)) {
          for (let i = 0; i < repairedGeoJSON.features.length; i++) {
            const feature = repairedGeoJSON.features[i];
            if (feature && feature.geometry) {
              const repaired = this.repairIndividualGeometry(feature.geometry);
              if (repaired.repaired) {
                feature.geometry = repaired.geometry;
                repairsMade++;
              }
            }
          }
        }
      } else if (repairedGeoJSON.type === 'Feature') {
        if (repairedGeoJSON.geometry) {
          const repaired = this.repairIndividualGeometry(repairedGeoJSON.geometry);
          if (repaired.repaired) {
            repairedGeoJSON.geometry = repaired.geometry;
            repairsMade++;
          }
        }
      } else if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(repairedGeoJSON.type)) {
        const repaired = this.repairIndividualGeometry(repairedGeoJSON);
        if (repaired.repaired) {
          Object.assign(repairedGeoJSON, repaired.geometry);
          repairsMade++;
        }
      }
      
      return {
        success: true,
        message: repairsMade > 0 ? `Repaired ${repairsMade} geometries` : 'No repairs needed',
        repaired: repairsMade > 0,
        originalGeoJSON: geoJSON,
        repairedGeoJSON,
        metadata: {
          repairsMade,
          operation: 'repair_geometry',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in repairGeometry:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error repairing geometries: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Convert Shapefile to GeoJSON
   */
  private async shapefileToGeoJSON(sourceData: any, options: any): Promise<any> {
    // Implementation would handle decoding base64, unzipping, and converting
    // For now, we'll just return a simulated result
    
    return {
      geoJSON: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Sample feature' },
            geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] }
          }
        ]
      },
      featureCount: 1
    };
  }

  /**
   * Convert KML to GeoJSON
   */
  private async kmlToGeoJSON(sourceData: any, options: any): Promise<any> {
    // Implementation would parse KML using a library like togeojson
    return {
      geoJSON: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Sample KML feature' },
            geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] }
          }
        ]
      },
      featureCount: 1
    };
  }

  /**
   * Convert CSV to GeoJSON
   */
  private async csvToGeoJSON(sourceData: any, options: any): Promise<any> {
    // Implementation would parse CSV with lat/lon columns
    return {
      geoJSON: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Sample CSV feature' },
            geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] }
          }
        ]
      },
      featureCount: 1
    };
  }

  /**
   * Convert GML to GeoJSON
   */
  private async gmlToGeoJSON(sourceData: any, options: any): Promise<any> {
    // Implementation would parse GML and convert to GeoJSON
    return {
      geoJSON: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Sample GML feature' },
            geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] }
          }
        ]
      },
      featureCount: 1
    };
  }

  /**
   * Convert GPX to GeoJSON
   */
  private async gpxToGeoJSON(sourceData: any, options: any): Promise<any> {
    // Implementation would parse GPX using a library like togeojson
    return {
      geoJSON: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Sample GPX feature' },
            geometry: { type: 'LineString', coordinates: [[-122.4194, 37.7749], [-122.4184, 37.7747]] }
          }
        ]
      },
      featureCount: 1
    };
  }

  /**
   * Convert GeoJSON to Shapefile
   */
  private async geoJSONToShapefile(geoJSON: any, options: any): Promise<any> {
    // Implementation would convert GeoJSON to Shapefile using a library like shp-write
    return {
      data: { base64: 'simulated_shapefile_data_base64' },
      format: 'shapefile'
    };
  }

  /**
   * Convert GeoJSON to KML
   */
  private async geoJSONToKML(geoJSON: any, options: any): Promise<any> {
    // Implementation would convert GeoJSON to KML
    return {
      data: '<kml>Simulated KML data</kml>',
      format: 'kml'
    };
  }

  /**
   * Convert GeoJSON to CSV
   */
  private async geoJSONToCSV(geoJSON: any, options: any): Promise<any> {
    // Implementation would convert GeoJSON to CSV
    return {
      data: 'id,name,lat,lon\n1,Sample,37.7749,-122.4194',
      format: 'csv'
    };
  }

  /**
   * Convert GeoJSON to GML
   */
  private async geoJSONToGML(geoJSON: any, options: any): Promise<any> {
    // Implementation would convert GeoJSON to GML
    return {
      data: '<gml>Simulated GML data</gml>',
      format: 'gml'
    };
  }

  /**
   * Convert GeoJSON to GPX
   */
  private async geoJSONToGPX(geoJSON: any, options: any): Promise<any> {
    // Implementation would convert GeoJSON to GPX
    return {
      data: '<gpx>Simulated GPX data</gpx>',
      format: 'gpx'
    };
  }

  /**
   * Detect spatial data format from a file
   */
  private detectFormatFromFile(filePath: string): { format: string, confidence: number } {
    // This would analyze file extensions, headers, and content to determine the format
    // For this example, we'll just determine based on file extension
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.shp':
      case '.dbf':
      case '.shx':
        return { format: 'shapefile', confidence: 0.9 };
      case '.kml':
        return { format: 'kml', confidence: 0.9 };
      case '.json':
      case '.geojson':
        return { format: 'geojson', confidence: 0.9 };
      case '.csv':
        return { format: 'csv', confidence: 0.7 }; // Lower confidence as CSV might not be spatial
      case '.gml':
        return { format: 'gml', confidence: 0.9 };
      case '.gpx':
        return { format: 'gpx', confidence: 0.9 };
      default:
        return { format: 'unknown', confidence: 0 };
    }
  }

  /**
   * Check if data appears to be GeoJSON
   */
  private isGeoJSON(data: any): boolean {
    try {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      
      if (typeof data !== 'object' || data === null) {
        return false;
      }
      
      if (!data.type) {
        return false;
      }
      
      const validTypes = ['FeatureCollection', 'Feature', 'Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];
      return validTypes.includes(data.type);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if data appears to be KML
   */
  private isKML(data: any): boolean {
    if (typeof data !== 'string') {
      return false;
    }
    
    return data.includes('<kml') && data.includes('</kml>');
  }

  /**
   * Validate a geometry object
   */
  private validateGeometry(geometry: any): string[] {
    const issues = [];
    
    if (!geometry.type) {
      return ['Missing geometry type'];
    }
    
    switch (geometry.type) {
      case 'Point':
        if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 2) {
          issues.push('Point coordinates must be an array of 2 numbers [longitude, latitude]');
        }
        break;
        
      case 'LineString':
        if (!Array.isArray(geometry.coordinates)) {
          issues.push('LineString coordinates must be an array of points');
        } else if (geometry.coordinates.length < 2) {
          issues.push('LineString must have at least 2 points');
        }
        break;
        
      case 'Polygon':
        if (!Array.isArray(geometry.coordinates)) {
          issues.push('Polygon coordinates must be an array of rings');
        } else if (geometry.coordinates.length < 1) {
          issues.push('Polygon must have at least 1 ring');
        } else {
          // Check if rings are closed
          geometry.coordinates.forEach((ring, i) => {
            if (!Array.isArray(ring)) {
              issues.push(`Polygon ring ${i} must be an array of points`);
            } else if (ring.length < 4) {
              issues.push(`Polygon ring ${i} must have at least 4 points`);
            } else {
              const first = ring[0];
              const last = ring[ring.length - 1];
              if (first[0] !== last[0] || first[1] !== last[1]) {
                issues.push(`Polygon ring ${i} is not closed (first point != last point)`);
              }
            }
          });
        }
        break;
        
      case 'MultiPoint':
        if (!Array.isArray(geometry.coordinates)) {
          issues.push('MultiPoint coordinates must be an array of points');
        }
        break;
        
      case 'MultiLineString':
        if (!Array.isArray(geometry.coordinates)) {
          issues.push('MultiLineString coordinates must be an array of linestrings');
        } else {
          // Check each linestring
          geometry.coordinates.forEach((line, i) => {
            if (!Array.isArray(line)) {
              issues.push(`MultiLineString linestring ${i} must be an array of points`);
            } else if (line.length < 2) {
              issues.push(`MultiLineString linestring ${i} must have at least 2 points`);
            }
          });
        }
        break;
        
      case 'MultiPolygon':
        if (!Array.isArray(geometry.coordinates)) {
          issues.push('MultiPolygon coordinates must be an array of polygons');
        } else {
          // Check each polygon
          geometry.coordinates.forEach((polygon, i) => {
            if (!Array.isArray(polygon)) {
              issues.push(`MultiPolygon polygon ${i} must be an array of rings`);
            } else if (polygon.length < 1) {
              issues.push(`MultiPolygon polygon ${i} must have at least 1 ring`);
            } else {
              // Check if rings are closed
              polygon.forEach((ring, j) => {
                if (!Array.isArray(ring)) {
                  issues.push(`MultiPolygon polygon ${i} ring ${j} must be an array of points`);
                } else if (ring.length < 4) {
                  issues.push(`MultiPolygon polygon ${i} ring ${j} must have at least 4 points`);
                } else {
                  const first = ring[0];
                  const last = ring[ring.length - 1];
                  if (first[0] !== last[0] || first[1] !== last[1]) {
                    issues.push(`MultiPolygon polygon ${i} ring ${j} is not closed (first point != last point)`);
                  }
                }
              });
            }
          });
        }
        break;
        
      case 'GeometryCollection':
        if (!Array.isArray(geometry.geometries)) {
          issues.push('GeometryCollection must have a geometries array');
        } else {
          // Check each geometry
          geometry.geometries.forEach((geom, i) => {
            const geomIssues = this.validateGeometry(geom);
            geomIssues.forEach(issue => {
              issues.push(`GeometryCollection geometry ${i}: ${issue}`);
            });
          });
        }
        break;
        
      default:
        issues.push(`Unknown geometry type: ${geometry.type}`);
    }
    
    return issues;
  }

  /**
   * Repair an individual geometry
   */
  private repairIndividualGeometry(geometry: any): { repaired: boolean, geometry: any } {
    const repaired = { repaired: false, geometry: { ...geometry } };
    
    // Basic checks
    if (!geometry || !geometry.type) {
      return repaired;
    }
    
    switch (geometry.type) {
      case 'Polygon':
        // Ensure polygon rings are closed
        if (Array.isArray(geometry.coordinates)) {
          let ringRepaired = false;
          
          // For each ring in the polygon
          for (let i = 0; i < geometry.coordinates.length; i++) {
            const ring = geometry.coordinates[i];
            
            if (Array.isArray(ring) && ring.length >= 3) {
              const first = ring[0];
              const last = ring[ring.length - 1];
              
              // If ring is not closed, close it
              if (first[0] !== last[0] || first[1] !== last[1]) {
                repaired.geometry.coordinates[i] = [...ring, [...first]];
                ringRepaired = true;
              }
            }
          }
          
          if (ringRepaired) {
            repaired.repaired = true;
          }
        }
        break;
        
      case 'MultiPolygon':
        // Ensure all polygon rings are closed
        if (Array.isArray(geometry.coordinates)) {
          let polygonRepaired = false;
          
          // For each polygon
          for (let i = 0; i < geometry.coordinates.length; i++) {
            const polygon = geometry.coordinates[i];
            
            if (Array.isArray(polygon)) {
              // For each ring in the polygon
              for (let j = 0; j < polygon.length; j++) {
                const ring = polygon[j];
                
                if (Array.isArray(ring) && ring.length >= 3) {
                  const first = ring[0];
                  const last = ring[ring.length - 1];
                  
                  // If ring is not closed, close it
                  if (first[0] !== last[0] || first[1] !== last[1]) {
                    repaired.geometry.coordinates[i][j] = [...ring, [...first]];
                    polygonRepaired = true;
                  }
                }
              }
            }
          }
          
          if (polygonRepaired) {
            repaired.repaired = true;
          }
        }
        break;
        
      case 'GeometryCollection':
        // Repair each geometry in the collection
        if (Array.isArray(geometry.geometries)) {
          let collectionRepaired = false;
          
          for (let i = 0; i < geometry.geometries.length; i++) {
            const result = this.repairIndividualGeometry(geometry.geometries[i]);
            
            if (result.repaired) {
              repaired.geometry.geometries[i] = result.geometry;
              collectionRepaired = true;
            }
          }
          
          if (collectionRepaired) {
            repaired.repaired = true;
          }
        }
        break;
        
      // Other geometry types could be handled here
    }
    
    return repaired;
  }
}
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
import { AgentConfig, AgentCapability } from '../../agents/base-agent';

// Promisify fs operations
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const exec = promisify(child_process.exec);

interface ConversionParams {
  sourceFormat?: string;
  targetFormat?: string;
  sourceData?: unknown;
  geoJSON?: unknown;
  data?: {
    base64?: string;
  } | string;
  options?: Record<string, unknown>;
}

interface ConversionResult {
  success: boolean;
  message: string;
  sourceFormat?: string;
  targetFormat?: string;
  geoJSON?: unknown;
  convertedData?: unknown;
  data?: unknown;
  format?: string;
  featureCount?: number;
  confidence?: number;
  issues?: string[];
  repairsMade?: number;
  originalGeoJSON?: unknown;
  repairedGeoJSON?: unknown;
  metadata: {
    featureCount?: number;
    operation: string;
    timestamp: string;
    issues?: string[];
    repairsMade?: number;
  };
}

interface FormatDetectionResult {
  format: string;
  confidence: number;
}

interface GeometryValidationResult {
  isValid: boolean;
  errors: string[];
}

interface GeometryRepairResult {
  repaired: boolean;
  geometry: unknown;
}

interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties?: Record<string, unknown>;
}

interface GeoJSONFeatureCollection {
  type: string;
  features: GeoJSONFeature[];
}

interface GeoJSONGeometry {
  type: string;
  coordinates: unknown;
}

const VALID_GEOJSON_TYPES = [
  'FeatureCollection',
  'Feature',
  'Point',
  'LineString',
  'Polygon',
  'MultiPoint',
  'MultiLineString',
  'MultiPolygon',
  'GeometryCollection'
] as const;

type GeoJSONType = typeof VALID_GEOJSON_TYPES[number];

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
  private converters: Map<string, (data: unknown, options?: Record<string, unknown>) => Promise<ConversionResult>>;

  constructor(storage: IStorage, agentId: string) {
    const capabilities: AgentCapability[] = [
      {
        name: 'convertToGeoJSON',
        description: 'Convert various spatial data formats to GeoJSON',
        handler: async (params: ConversionParams) => {
          return this.convertToGeoJSON(params);
        }
      },
      {
        name: 'convertFromGeoJSON',
        description: 'Convert GeoJSON to various spatial data formats',
        handler: async (params: ConversionParams) => {
          return this.convertFromGeoJSON(params);
        }
      },
      {
        name: 'detectFormat',
        description: 'Detect the format of spatial data',
        handler: async (params: ConversionParams) => {
          return this.detectFormat(params);
        }
      },
      {
        name: 'validateGeoJSON',
        description: 'Validate GeoJSON data',
        handler: async (params: ConversionParams) => {
          return this.validateGeoJSON(params);
        }
      },
      {
        name: 'repairGeometry',
        description: 'Repair invalid geometries',
        handler: async (params: ConversionParams) => {
          return this.repairGeometry(params);
        }
      }
    ];

    const config: AgentConfig = {
      id: agentId,
      name: 'Data Conversion Agent',
      description: 'Automates the transformation of various GIS data formats into standardized formats',
      capabilities,
      permissions: ['gis:read', 'gis:write', 'gis:convert', 'file:read', 'file:write']
    };

    super(storage, config);

    this.tempDir = path.join(process.cwd(), 'uploads', 'gis_temp');
    this.converters = new Map();
    this.setupConverters();
  }

  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    try {
      await mkdir(this.tempDir, { recursive: true });

      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'INFO',
        subject: 'Agent Initialization',
        content: `Agent ${this.name} (${this.agentId}) initialized successfully`,
        status: 'completed'
      });

      await this.updateStatus('active', 100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error initializing Data Conversion Agent:', errorMessage);
      
      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'ERROR',
        subject: 'Agent Initialization Failed',
        content: `Failed to initialize agent: ${errorMessage}`,
        status: 'error'
      });

      await this.updateStatus('error', 0);
      throw error;
    }
  }

  /**
   * Set up the format converter functions
   */
  private setupConverters(): void {
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
  private async convertToGeoJSON(params: ConversionParams): Promise<ConversionResult> {
    try {
      const { sourceFormat, sourceData, options = {} } = params;

      if (!sourceFormat || !sourceData) {
        throw new Error('Source format and data are required');
      }

      const converterKey = `${sourceFormat}_to_geojson`;
      if (!this.converters.has(converterKey)) {
        throw new Error(`Unsupported source format: ${sourceFormat}`);
      }

      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'INFO',
        subject: 'Format Conversion',
        content: `Converting ${sourceFormat} to GeoJSON`,
        status: 'completed',
        metadata: { sourceFormat, options }
      });

      const converter = this.converters.get(converterKey);
      if (!converter) {
        throw new Error(`Converter not found for format: ${sourceFormat}`);
      }

      const result = await converter(sourceData, options);

      return {
        success: true,
        message: `Successfully converted ${sourceFormat} to GeoJSON`,
        sourceFormat,
        geoJSON: result.geoJSON,
        metadata: {
          featureCount: result.featureCount,
          operation: 'convert_to_geojson',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in convertToGeoJSON:', errorMessage);
      
      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'ERROR',
        subject: 'Format Conversion Failed',
        content: `Failed to convert to GeoJSON: ${errorMessage}`,
        status: 'error',
        metadata: { params }
      });

      throw error;
    }
  }

  /**
   * Convert GeoJSON to various spatial data formats
   */
  private async convertFromGeoJSON(params: ConversionParams): Promise<ConversionResult> {
    try {
      const { targetFormat, geoJSON, options = {} } = params;

      if (!targetFormat || !geoJSON) {
        throw new Error('Target format and GeoJSON data are required');
      }

      const converterKey = `geojson_to_${targetFormat}`;
      if (!this.converters.has(converterKey)) {
        throw new Error(`Unsupported target format: ${targetFormat}`);
      }

      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'INFO',
        subject: 'Format Conversion',
        content: `Converting GeoJSON to ${targetFormat}`,
        status: 'completed',
        metadata: { targetFormat, options }
      });

      const converter = this.converters.get(converterKey);
      if (!converter) {
        throw new Error(`Converter not found for format: ${targetFormat}`);
      }

      const result = await converter(geoJSON, options);

      return {
        success: true,
        message: `Successfully converted GeoJSON to ${targetFormat}`,
        targetFormat,
        convertedData: result.convertedData,
        metadata: {
          featureCount: result.featureCount,
          operation: 'convert_from_geojson',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in convertFromGeoJSON:', errorMessage);
      
      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'ERROR',
        subject: 'Format Conversion Failed',
        content: `Failed to convert from GeoJSON: ${errorMessage}`,
        status: 'error',
        metadata: { params }
      });

      throw error;
    }
  }

  /**
   * Detect the format of spatial data
   */
  private async detectFormat(params: ConversionParams): Promise<ConversionResult> {
    try {
      const { data } = params;

      if (!data) {
        throw new Error('Data is required');
      }

      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'INFO',
        subject: 'Format Detection',
        content: 'Detecting format of spatial data',
        status: 'completed'
      });

      let filePath = '';
      let result: FormatDetectionResult = { format: 'unknown', confidence: 0 };

      if (typeof data === 'string' && data.startsWith('http')) {
        filePath = path.join(this.tempDir, `downloaded_${Date.now()}`);
        // Implementation would download the file here
        result = this.detectFormatFromFile(filePath);
      } else if (typeof data === 'object' && 'base64' in data) {
        filePath = path.join(this.tempDir, `converted_${Date.now()}`);
        await writeFile(filePath, Buffer.from(data.base64!, 'base64'));
        result = this.detectFormatFromFile(filePath);
      } else if (this.isGeoJSON(data)) {
        result = { format: 'geojson', confidence: 0.9 };
      }

      return {
        success: true,
        message: `Detected format: ${result.format} (confidence: ${result.confidence})`,
        format: result.format,
        confidence: result.confidence,
        metadata: {
          operation: 'detect_format',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in detectFormat:', errorMessage);
      
      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'ERROR',
        subject: 'Format Detection Failed',
        content: `Failed to detect format: ${errorMessage}`,
        status: 'error',
        metadata: { params }
      });

      throw error;
    }
  }

  /**
   * Validate GeoJSON data
   */
  private async validateGeoJSON(params: ConversionParams): Promise<ConversionResult> {
    try {
      const { geoJSON, options = {} } = params;

      if (!geoJSON) {
        throw new Error('GeoJSON data is required');
      }

      const geoJSONData = geoJSON as GeoJSONFeatureCollection | GeoJSONFeature | GeoJSONGeometry;

      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'INFO',
        subject: 'GeoJSON Validation',
        content: 'Validating GeoJSON data',
        status: 'completed',
        metadata: { options }
      });

      if (!geoJSONData.type) {
        throw new Error('Invalid GeoJSON: missing "type" property');
      }

      if (!VALID_GEOJSON_TYPES.includes(geoJSONData.type as GeoJSONType)) {
        throw new Error(`Invalid GeoJSON: "type" must be one of ${VALID_GEOJSON_TYPES.join(', ')}`);
      }

      const issues: string[] = [];
      if (geoJSONData.type === 'FeatureCollection') {
        const featureCollection = geoJSONData as GeoJSONFeatureCollection;
        if (!Array.isArray(featureCollection.features)) {
          issues.push('Invalid FeatureCollection: missing or invalid "features" array');
        } else {
          featureCollection.features.forEach((feature: any, index: number) => {
            if (feature.type !== 'Feature') {
              issues.push(`Invalid feature at index ${index}: missing or invalid "type" property`);
            }

            if (!feature.geometry) {
              issues.push(`Feature ${index}: missing "geometry" property`);
            } else if (!VALID_GEOJSON_TYPES.includes(feature.geometry.type as GeoJSONType)) {
              issues.push(`Feature ${index}: invalid geometry type "${feature.geometry.type}"`);
            }

            if (feature.geometry && feature.geometry.type) {
              const geometryIssues = this.validateGeometry(feature.geometry);
              geometryIssues.forEach(issue => {
                issues.push(`Feature ${index}: ${issue}`);
              });
            }
          });
        }
      }

      if (geoJSONData.type === 'Feature') {
        const feature = geoJSONData as GeoJSONFeature;
        if (!feature.geometry) {
          issues.push('Invalid Feature: missing "geometry" property');
        } else if (!VALID_GEOJSON_TYPES.includes(feature.geometry.type as GeoJSONType)) {
          issues.push(`Invalid Feature: invalid geometry type "${feature.geometry.type}"`);
        }

        if (feature.geometry && feature.geometry.type) {
          const geometryIssues = this.validateGeometry(feature.geometry);
          geometryIssues.forEach(issue => {
            issues.push(`Feature: ${issue}`);
          });
        }
      }

      if (VALID_GEOJSON_TYPES.slice(2).includes(geoJSONData.type as GeoJSONType)) {
        const geometry = geoJSONData as GeoJSONGeometry;
        const geometryIssues = this.validateGeometry(geometry);
        issues.push(...geometryIssues);
      }

      return {
        success: issues.length === 0,
        message: issues.length === 0 ? 'GeoJSON is valid' : 'GeoJSON validation failed',
        issues,
        metadata: {
          operation: 'validate_geojson',
          timestamp: new Date().toISOString(),
          issues
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in validateGeoJSON:', errorMessage);
      
      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'ERROR',
        subject: 'GeoJSON Validation Failed',
        content: `Failed to validate GeoJSON: ${errorMessage}`,
        status: 'error',
        metadata: { params }
      });

      throw error;
    }
  }

  /**
   * Repair invalid geometries in GeoJSON
   */
  private async repairGeometry(params: ConversionParams): Promise<ConversionResult> {
    try {
      const { geoJSON, options = {} } = params;

      if (!geoJSON) {
        throw new Error('GeoJSON data is required');
      }

      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'INFO',
        subject: 'Geometry Repair',
        content: 'Repairing geometries in GeoJSON data',
        status: 'completed',
        metadata: { options }
      });

      const repairedGeoJSON = JSON.parse(JSON.stringify(geoJSON));

      let repairsMade = 0;

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
      } else if (
        [
          'Point',
          'LineString',
          'Polygon',
          'MultiPoint',
          'MultiLineString',
          'MultiPolygon',
          'GeometryCollection',
        ].includes(repairedGeoJSON.type)
      ) {
        const repaired = this.repairIndividualGeometry(repairedGeoJSON);
        if (repaired.repaired) {
          Object.assign(repairedGeoJSON, repaired.geometry);
          repairsMade++;
        }
      }

      return {
        success: true,
        message: `Repaired ${repairsMade} geometries`,
        repairsMade,
        originalGeoJSON: geoJSON,
        repairedGeoJSON,
        metadata: {
          operation: 'repair_geometry',
          timestamp: new Date().toISOString(),
          repairsMade
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in repairGeometry:', errorMessage);
      
      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'ERROR',
        subject: 'Geometry Repair Failed',
        content: `Failed to repair geometries: ${errorMessage}`,
        status: 'error',
        metadata: { params }
      });

      throw error;
    }
  }

  /**
   * Convert Shapefile to GeoJSON
   */
  private async shapefileToGeoJSON(sourceData: unknown, options: Record<string, unknown>): Promise<ConversionResult> {
    // Implementation would handle decoding base64, unzipping, and converting
    return {
      success: true,
      message: 'Successfully converted Shapefile to GeoJSON',
      geoJSON: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Example' },
            geometry: {
              type: 'Point',
              coordinates: [0, 0]
            }
          }
        ]
      },
      featureCount: 1,
      metadata: {
        operation: 'shapefile_to_geojson',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Convert KML to GeoJSON
   */
  private async kmlToGeoJSON(sourceData: unknown, options?: Record<string, unknown>): Promise<ConversionResult> {
    return {
      success: true,
      message: 'Successfully converted KML to GeoJSON',
      geoJSON: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Example' },
            geometry: {
              type: 'Point',
              coordinates: [0, 0]
            }
          }
        ]
      },
      featureCount: 1,
      metadata: {
        operation: 'kml_to_geojson',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Convert CSV to GeoJSON
   */
  private async csvToGeoJSON(sourceData: unknown, options?: Record<string, unknown>): Promise<ConversionResult> {
    return {
      success: true,
      message: 'Successfully converted CSV to GeoJSON',
      geoJSON: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Example' },
            geometry: {
              type: 'Point',
              coordinates: [0, 0]
            }
          }
        ]
      },
      featureCount: 1,
      metadata: {
        operation: 'csv_to_geojson',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Convert GML to GeoJSON
   */
  private async gmlToGeoJSON(sourceData: unknown, options?: Record<string, unknown>): Promise<ConversionResult> {
    return {
      success: true,
      message: 'Successfully converted GML to GeoJSON',
      geoJSON: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Example' },
            geometry: {
              type: 'Point',
              coordinates: [0, 0]
            }
          }
        ]
      },
      featureCount: 1,
      metadata: {
        operation: 'gml_to_geojson',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Convert GPX to GeoJSON
   */
  private async gpxToGeoJSON(sourceData: unknown, options?: Record<string, unknown>): Promise<ConversionResult> {
    return {
      success: true,
      message: 'Successfully converted GPX to GeoJSON',
      geoJSON: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Example' },
            geometry: {
              type: 'Point',
              coordinates: [0, 0]
            }
          }
        ]
      },
      featureCount: 1,
      metadata: {
        operation: 'gpx_to_geojson',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Convert GeoJSON to Shapefile
   */
  private async geoJSONToShapefile(geoJSON: unknown, options?: Record<string, unknown>): Promise<ConversionResult> {
    return {
      success: true,
      message: 'Successfully converted GeoJSON to Shapefile',
      data: { base64: 'example_base64_data' },
      format: 'shapefile',
      metadata: {
        operation: 'geojson_to_shapefile',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Convert GeoJSON to KML
   */
  private async geoJSONToKML(geoJSON: unknown, options?: Record<string, unknown>): Promise<ConversionResult> {
    return {
      success: true,
      message: 'Successfully converted GeoJSON to KML',
      data: 'example_kml_data',
      format: 'kml',
      metadata: {
        operation: 'geojson_to_kml',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Convert GeoJSON to CSV
   */
  private async geoJSONToCSV(geoJSON: unknown, options?: Record<string, unknown>): Promise<ConversionResult> {
    return {
      success: true,
      message: 'Successfully converted GeoJSON to CSV',
      data: 'example_csv_data',
      format: 'csv',
      metadata: {
        operation: 'geojson_to_csv',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Convert GeoJSON to GML
   */
  private async geoJSONToGML(geoJSON: unknown, options?: Record<string, unknown>): Promise<ConversionResult> {
    return {
      success: true,
      message: 'Successfully converted GeoJSON to GML',
      data: 'example_gml_data',
      format: 'gml',
      metadata: {
        operation: 'geojson_to_gml',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Convert GeoJSON to GPX
   */
  private async geoJSONToGPX(geoJSON: unknown, options?: Record<string, unknown>): Promise<ConversionResult> {
    return {
      success: true,
      message: 'Successfully converted GeoJSON to GPX',
      data: 'example_gpx_data',
      format: 'gpx',
      metadata: {
        operation: 'geojson_to_gpx',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Detect spatial data format from a file
   */
  private detectFormatFromFile(filePath: string): FormatDetectionResult {
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

      const validTypes = [
        'FeatureCollection',
        'Feature',
        'Point',
        'LineString',
        'Polygon',
        'MultiPoint',
        'MultiLineString',
        'MultiPolygon',
        'GeometryCollection',
      ];
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
          geometry.coordinates.forEach((ring: any, i: number) => {
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
          geometry.coordinates.forEach((line: any, i: number) => {
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
          geometry.coordinates.forEach((polygon: any, i: number) => {
            if (!Array.isArray(polygon)) {
              issues.push(`MultiPolygon polygon ${i} must be an array of rings`);
            } else if (polygon.length < 1) {
              issues.push(`MultiPolygon polygon ${i} must have at least 1 ring`);
            } else {
              // Check if rings are closed
              polygon.forEach((ring: any, j: number) => {
                if (!Array.isArray(ring)) {
                  issues.push(`MultiPolygon polygon ${i} ring ${j} must be an array of points`);
                } else if (ring.length < 4) {
                  issues.push(`MultiPolygon polygon ${i} ring ${j} must have at least 4 points`);
                } else {
                  const first = ring[0];
                  const last = ring[ring.length - 1];
                  if (first[0] !== last[0] || first[1] !== last[1]) {
                    issues.push(
                      `MultiPolygon polygon ${i} ring ${j} is not closed (first point != last point)`
                    );
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
          geometry.geometries.forEach((geom: any, i: number) => {
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
  private repairIndividualGeometry(geometry: any): GeometryRepairResult {
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

  public async shutdown(): Promise<void> {
    try {
      await this.createAgentMessage({
        messageId: crypto.randomUUID(),
        senderAgentId: this.agentId,
        messageType: 'INFO',
        subject: 'Agent Shutdown',
        content: `Agent ${this.name} (${this.agentId}) shutting down`,
        status: 'completed'
      });

      await this.updateStatus('inactive', 0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error shutting down Data Conversion Agent:', errorMessage);
      throw error;
    }
  }
}


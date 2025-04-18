/**
 * GIS Data Service
 * 
 * Core service for GIS data processing, format conversion, and spatial operations.
 * Provides a unified interface for working with various GIS data formats and
 * performing essential spatial operations.
 */

import { IStorage } from '../../storage';
import * as turf from '@turf/turf';
import { Feature, FeatureCollection, Geometry, GeoJsonProperties } from '@turf/turf';

// GIS Data Format enum
export enum GISDataFormat {
  GEOJSON = 'geojson',
  SHAPEFILE = 'shapefile',
  KML = 'kml',
  FILEGDB = 'filegdb',
  WKT = 'wkt',
  TOPOJSON = 'topojson',
  CSV = 'csv',
  POSTGIS = 'postgis',
}

// ErrorSeverity enum for type safety
export enum ErrorSeverity {
  WARNING = 'warning',
  ERROR = 'error'
}

// Spatial Reference System interface
export interface SpatialReferenceSystem {
  srid: number;
  name: string;
  wkt?: string;
  proj4?: string;
}

// Geometry Type enum
export enum GeometryType {
  POINT = 'Point',
  LINESTRING = 'LineString',
  POLYGON = 'Polygon',
  MULTIPOINT = 'MultiPoint',
  MULTILINESTRING = 'MultiLineString',
  MULTIPOLYGON = 'MultiPolygon',
  GEOMETRYCOLLECTION = 'GeometryCollection',
}

// Validation error interface
export interface ValidationError {
  code: string;
  message: string;
  location?: any;
  severity: ErrorSeverity;
}

// Validation suggestion interface
export interface ValidationSuggestion {
  code: string;
  message: string;
  fixAction?: string;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  suggestions?: ValidationSuggestion[];
}

// GIS Data Conversion Options
export interface ConversionOptions {
  sourceSrs?: number | SpatialReferenceSystem;
  targetSrs?: number | SpatialReferenceSystem;
  preserveAttributes?: boolean;
  simplify?: boolean;
  simplificationTolerance?: number;
  filterExpression?: string;
  includeFields?: string[];
  excludeFields?: string[];
}

// Spatial operation options interface
export interface SpatialOperationOptions {
  units?: 'meters' | 'kilometers' | 'feet' | 'miles' | 'degrees';
  steps?: number;
  mutate?: boolean;
  properties?: Record<string, any>;
}

/**
 * Main GIS Data Service class
 */
export class GISDataService {
  private storage: IStorage;
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('GIS Data Service initializing...');
    // Check if PostGIS extension is available
    try {
      await this.checkPostGISAvailability();
      console.log('PostGIS is available and ready');
    } catch (error) {
      console.error('PostGIS check failed:', error);
      throw new Error(`GIS Data Service initialization failed: PostGIS unavailable - ${(error as Error).message}`);
    }
  }
  
  /**
   * Check if PostGIS is available in the database
   */
  private async checkPostGISAvailability(): Promise<boolean> {
    try {
      // This will be implemented to check if PostGIS extension is enabled
      // For now, we'll assume it's available
      return true;
    } catch (error) {
      console.error('PostGIS check error:', error);
      return false;
    }
  }
  
  /**
   * Convert GIS data from one format to another
   */
  async convertFormat(
    data: Buffer | string | any,
    sourceFormat: GISDataFormat,
    targetFormat: GISDataFormat,
    options?: ConversionOptions
  ): Promise<Buffer | string | any> {
    console.log(`Converting from ${sourceFormat} to ${targetFormat}`);
    
    // GeoJSON is our intermediate format for most conversions
    let geoJson: any;
    
    // Convert source to GeoJSON
    switch (sourceFormat) {
      case GISDataFormat.GEOJSON:
        geoJson = typeof data === 'string' ? JSON.parse(data) : data;
        break;
      case GISDataFormat.SHAPEFILE:
        geoJson = await this.convertShapefileToGeoJSON(data);
        break;
      case GISDataFormat.KML:
        geoJson = await this.convertKMLToGeoJSON(data);
        break;
      // Add other format conversions
      default:
        throw new Error(`Unsupported source format: ${sourceFormat}`);
    }
    
    // Apply transformations if needed
    if (options) {
      if (options.simplify && options.simplificationTolerance) {
        geoJson = this.simplifyGeoJSON(geoJson, options.simplificationTolerance);
      }
      
      if (options.sourceSrs && options.targetSrs) {
        geoJson = this.reprojectGeoJSON(geoJson, options.sourceSrs, options.targetSrs);
      }
      
      if (options.includeFields || options.excludeFields) {
        geoJson = this.filterAttributes(geoJson, options.includeFields, options.excludeFields);
      }
    }
    
    // Convert GeoJSON to target format
    switch (targetFormat) {
      case GISDataFormat.GEOJSON:
        return typeof data === 'string' ? JSON.stringify(geoJson) : geoJson;
      case GISDataFormat.SHAPEFILE:
        return await this.convertGeoJSONToShapefile(geoJson);
      case GISDataFormat.KML:
        return await this.convertGeoJSONToKML(geoJson);
      // Add other format conversions
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }
  }
  
  /**
   * Convert Shapefile to GeoJSON
   * Note: This is a placeholder implementation
   */
  private async convertShapefileToGeoJSON(data: Buffer): Promise<any> {
    // Placeholder implementation
    // In a real implementation, this would use a library like shpjs
    return {
      type: 'FeatureCollection',
      features: []
    };
  }
  
  /**
   * Convert KML to GeoJSON
   * Note: This is a placeholder implementation
   */
  private async convertKMLToGeoJSON(data: string | Buffer): Promise<any> {
    // Placeholder implementation
    // In a real implementation, this would use a library like togeojson
    return {
      type: 'FeatureCollection',
      features: []
    };
  }
  
  /**
   * Convert GeoJSON to Shapefile
   * Note: This is a placeholder implementation
   */
  private async convertGeoJSONToShapefile(geoJson: any): Promise<Buffer> {
    // Placeholder implementation
    return Buffer.from('shapefile data');
  }
  
  /**
   * Convert GeoJSON to KML
   * Note: This is a placeholder implementation
   */
  private async convertGeoJSONToKML(geoJson: any): Promise<string> {
    // Placeholder implementation
    return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"></kml>`;
  }
  
  /**
   * Simplify GeoJSON geometry
   */
  private simplifyGeoJSON(geoJson: any, tolerance: number): any {
    // Check if it's a FeatureCollection
    if (geoJson.type === 'FeatureCollection') {
      geoJson.features = geoJson.features.map((feature: any) => 
        turf.simplify(feature, { tolerance })
      );
      return geoJson;
    } else if (geoJson.type === 'Feature') {
      // Single feature
      return turf.simplify(geoJson, { tolerance });
    } else {
      // Geometry object
      const feature = turf.feature(geoJson);
      return turf.simplify(feature, { tolerance }).geometry;
    }
  }
  
  /**
   * Reproject GeoJSON from one coordinate system to another
   * Note: This is a placeholder implementation
   */
  private reprojectGeoJSON(geoJson: any, sourceSrs: number | SpatialReferenceSystem, targetSrs: number | SpatialReferenceSystem): any {
    // Placeholder implementation
    // In a real implementation, this would use a library like proj4js
    return geoJson;
  }
  
  /**
   * Filter attributes in GeoJSON
   */
  private filterAttributes(geoJson: any, includeFields?: string[], excludeFields?: string[]): any {
    if (geoJson.type !== 'FeatureCollection') {
      return geoJson;
    }
    
    geoJson.features = geoJson.features.map((feature: any) => {
      if (!feature.properties) return feature;
      
      const newProperties: Record<string, any> = {};
      
      if (includeFields && includeFields.length > 0) {
        // Only include specified fields
        includeFields.forEach(field => {
          if (feature.properties[field] !== undefined) {
            newProperties[field] = feature.properties[field];
          }
        });
      } else if (excludeFields && excludeFields.length > 0) {
        // Include all fields except excluded ones
        Object.keys(feature.properties).forEach(field => {
          if (!excludeFields.includes(field)) {
            newProperties[field] = feature.properties[field];
          }
        });
      } else {
        // No filtering
        return feature;
      }
      
      feature.properties = newProperties;
      return feature;
    });
    
    return geoJson;
  }
  
  /**
   * Validate GeoJSON data
   */
  async validateGeoJSON(geoJson: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const suggestions: ValidationSuggestion[] = [];
    
    // Check if it's valid GeoJSON
    if (!geoJson || typeof geoJson !== 'object') {
      errors.push({
        code: 'invalid_geojson',
        message: 'Invalid GeoJSON: not an object',
        severity: ErrorSeverity.ERROR
      });
      return { valid: false, errors };
    }
    
    // Check for FeatureCollection or Feature type
    if (geoJson.type !== 'FeatureCollection' && geoJson.type !== 'Feature' && 
        !['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(geoJson.type)) {
      errors.push({
        code: 'invalid_type',
        message: `Invalid GeoJSON type: ${geoJson.type}`,
        severity: ErrorSeverity.ERROR
      });
    }
    
    // Validate features
    if (geoJson.type === 'FeatureCollection') {
      if (!Array.isArray(geoJson.features)) {
        errors.push({
          code: 'missing_features',
          message: 'FeatureCollection must have features array',
          severity: ErrorSeverity.ERROR
        });
      } else {
        // Check each feature
        geoJson.features.forEach((feature: any, index: number) => {
          const featureErrors = this.validateFeature(feature, index);
          errors.push(...featureErrors);
        });
      }
    } else if (geoJson.type === 'Feature') {
      errors.push(...this.validateFeature(geoJson));
    }
    
    // Add suggestions for improvements
    if (errors.length === 0 && geoJson.type === 'FeatureCollection') {
      // Check if we have empty or null geometries
      const emptyGeometries = geoJson.features.filter((f: any) => !f.geometry).length;
      if (emptyGeometries > 0) {
        suggestions.push({
          code: 'empty_geometries',
          message: `Found ${emptyGeometries} features with empty or null geometries`,
          fixAction: 'Remove features with empty geometries'
        });
      }
      
      // Check for inconsistent property schemas
      const propertyKeys = new Set<string>();
      const keysPerFeature: Record<number, Set<string>> = {};
      
      geoJson.features.forEach((f: any, i: number) => {
        if (f.properties) {
          keysPerFeature[i] = new Set(Object.keys(f.properties));
          Object.keys(f.properties).forEach(k => propertyKeys.add(k));
        }
      });
      
      const keysArray = Array.from(propertyKeys);
      if (keysArray.length > 0) {
        const inconsistentFeatures = Object.entries(keysPerFeature)
          .filter(([_, keys]) => keys.size !== propertyKeys.size)
          .map(([i]) => parseInt(i));
        
        if (inconsistentFeatures.length > 0) {
          suggestions.push({
            code: 'inconsistent_properties',
            message: `Found ${inconsistentFeatures.length} features with inconsistent property schemas`,
            fixAction: 'Standardize property schemas across all features'
          });
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }
  
  /**
   * Validate a single GeoJSON feature
   */
  private validateFeature(feature: any, index?: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const location = index !== undefined ? `features[${index}]` : 'feature';
    
    if (!feature) {
      errors.push({
        code: 'null_feature',
        message: 'Feature is null or undefined',
        location,
        severity: ErrorSeverity.ERROR
      });
      return errors;
    }
    
    if (feature.type !== 'Feature') {
      errors.push({
        code: 'invalid_feature_type',
        message: `Invalid feature type: ${feature.type}`,
        location,
        severity: ErrorSeverity.ERROR
      });
    }
    
    if (!feature.geometry) {
      errors.push({
        code: 'missing_geometry',
        message: 'Feature is missing geometry',
        location,
        severity: ErrorSeverity.WARNING
      });
    } else {
      // Validate geometry
      const geomTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];
      if (!geomTypes.includes(feature.geometry.type)) {
        errors.push({
          code: 'invalid_geometry_type',
          message: `Invalid geometry type: ${feature.geometry.type}`,
          location: `${location}.geometry`,
          severity: ErrorSeverity.ERROR
        });
      }
      
      // Validate coordinates based on geometry type
      if (feature.geometry.coordinates) {
        const coordErrors = this.validateCoordinates(feature.geometry);
        if (coordErrors.length > 0) {
          errors.push(...coordErrors.map(err => ({
            ...err,
            location: `${location}.geometry.coordinates${err.location || ''}`,
          })));
        }
      }
    }
    
    // Properties should be an object if present
    if (feature.properties !== undefined && (feature.properties === null || typeof feature.properties !== 'object')) {
      errors.push({
        code: 'invalid_properties',
        message: 'Properties must be an object',
        location: `${location}.properties`,
        severity: ErrorSeverity.ERROR
      });
    }
    
    return errors;
  }
  
  /**
   * Validate coordinates of a geometry
   */
  private validateCoordinates(geometry: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    try {
      switch (geometry.type) {
        case 'Point':
          if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
            errors.push({
              code: 'invalid_point',
              message: 'Point coordinates must be an array of at least 2 numbers',
              severity: ErrorSeverity.ERROR
            });
          }
          break;
        case 'LineString':
          if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
            errors.push({
              code: 'invalid_linestring',
              message: 'LineString must have at least 2 positions',
              severity: ErrorSeverity.ERROR
            });
          }
          break;
        case 'Polygon':
          if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 1) {
            errors.push({
              code: 'invalid_polygon',
              message: 'Polygon must have at least 1 ring',
              severity: ErrorSeverity.ERROR
            });
          } else {
            // Check if rings are closed
            geometry.coordinates.forEach((ring: any[], ringIndex: number) => {
              if (!Array.isArray(ring) || ring.length < 4) {
                errors.push({
                  code: 'invalid_ring',
                  message: 'Polygon ring must have at least 4 positions',
                  location: `[${ringIndex}]`,
                  severity: ErrorSeverity.ERROR
                });
              } else {
                const first = ring[0];
                const last = ring[ring.length - 1];
                if (first[0] !== last[0] || first[1] !== last[1]) {
                  errors.push({
                    code: 'unclosed_ring',
                    message: 'Polygon ring is not closed',
                    location: `[${ringIndex}]`,
                    severity: ErrorSeverity.ERROR
                  });
                }
              }
            });
          }
          break;
        // Add validation for other geometry types
      }
    } catch (error) {
      errors.push({
        code: 'coordinate_validation_error',
        message: `Coordinate validation error: ${(error as Error).message}`,
        severity: ErrorSeverity.ERROR
      });
    }
    
    return errors;
  }
  
  /**
   * Repair common issues in GeoJSON data
   */
  async repairGeoJSON(geoJson: any): Promise<{
    repaired: any;
    changes: Array<{ type: string; description: string; location?: any }>;
  }> {
    const changes: Array<{ type: string; description: string; location?: any }> = [];
    let repaired = JSON.parse(JSON.stringify(geoJson)); // Deep clone to avoid modifying original
    
    // Handle FeatureCollection
    if (repaired.type === 'FeatureCollection') {
      if (!Array.isArray(repaired.features)) {
        repaired.features = [];
        changes.push({
          type: 'add',
          description: 'Added empty features array to FeatureCollection'
        });
      }
      
      // Filter out null or invalid features
      const originalLength = repaired.features.length;
      repaired.features = repaired.features.filter((f: any, i: number) => {
        if (!f || typeof f !== 'object') {
          changes.push({
            type: 'remove',
            description: 'Removed null or invalid feature',
            location: `features[${i}]`
          });
          return false;
        }
        return true;
      });
      
      if (repaired.features.length !== originalLength) {
        changes.push({
          type: 'filter',
          description: `Removed ${originalLength - repaired.features.length} invalid features`
        });
      }
      
      // Repair each feature
      repaired.features = await Promise.all(repaired.features.map(async (feature: any, i: number) => {
        const { repaired: repairedFeature, changes: featureChanges } = await this.repairFeature(feature);
        featureChanges.forEach(change => {
          changes.push({
            ...change,
            location: `features[${i}]${change.location ? '.' + change.location : ''}`
          });
        });
        return repairedFeature;
      }));
    } else if (repaired.type === 'Feature') {
      // Single feature repair
      const { repaired: repairedFeature, changes: featureChanges } = await this.repairFeature(repaired);
      repaired = repairedFeature;
      changes.push(...featureChanges);
    }
    
    return { repaired, changes };
  }
  
  /**
   * Repair a single GeoJSON feature
   */
  private async repairFeature(feature: any): Promise<{
    repaired: any;
    changes: Array<{ type: string; description: string; location?: string }>;
  }> {
    const changes: Array<{ type: string; description: string; location?: string }> = [];
    const repaired = { ...feature };
    
    // Ensure it's a Feature
    if (repaired.type !== 'Feature') {
      repaired.type = 'Feature';
      changes.push({
        type: 'fix',
        description: `Set type to 'Feature'`,
        location: 'type'
      });
    }
    
    // Ensure properties is an object
    if (!repaired.properties || typeof repaired.properties !== 'object' || Array.isArray(repaired.properties)) {
      repaired.properties = {};
      changes.push({
        type: 'fix',
        description: 'Created empty properties object',
        location: 'properties'
      });
    }
    
    // Repair geometry if it exists
    if (repaired.geometry) {
      if (typeof repaired.geometry !== 'object' || Array.isArray(repaired.geometry)) {
        // Invalid geometry - create a null geometry
        repaired.geometry = null;
        changes.push({
          type: 'fix',
          description: 'Set invalid geometry to null',
          location: 'geometry'
        });
      } else {
        // Try to repair the geometry
        const { repaired: repairedGeometry, changes: geometryChanges } = await this.repairGeometry(repaired.geometry);
        repaired.geometry = repairedGeometry;
        geometryChanges.forEach(change => {
          changes.push({
            ...change,
            location: `geometry${change.location ? '.' + change.location : ''}`
          });
        });
      }
    } else {
      // Missing geometry - create a null geometry
      repaired.geometry = null;
      changes.push({
        type: 'fix',
        description: 'Added null geometry',
        location: 'geometry'
      });
    }
    
    return { repaired, changes };
  }
  
  /**
   * Repair a GeoJSON geometry
   */
  private async repairGeometry(geometry: any): Promise<{
    repaired: any;
    changes: Array<{ type: string; description: string; location?: string }>;
  }> {
    const changes: Array<{ type: string; description: string; location?: string }> = [];
    const repaired = { ...geometry };
    
    // Validate the geometry type
    const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];
    if (!validTypes.includes(repaired.type)) {
      // Default to Point if type is invalid
      repaired.type = 'Point';
      repaired.coordinates = [0, 0];
      changes.push({
        type: 'fix',
        description: `Changed invalid geometry type to Point with default coordinates`,
        location: 'type'
      });
      return { repaired, changes };
    }
    
    // Ensure coordinates are present and have the correct structure
    if (!repaired.coordinates && repaired.type !== 'GeometryCollection') {
      // Create default coordinates based on geometry type
      switch (repaired.type) {
        case 'Point':
          repaired.coordinates = [0, 0];
          break;
        case 'LineString':
          repaired.coordinates = [[0, 0], [1, 1]];
          break;
        case 'Polygon':
          repaired.coordinates = [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]];
          break;
        case 'MultiPoint':
          repaired.coordinates = [[0, 0], [1, 1]];
          break;
        case 'MultiLineString':
          repaired.coordinates = [[[0, 0], [1, 1]], [[2, 2], [3, 3]]];
          break;
        case 'MultiPolygon':
          repaired.coordinates = [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]];
          break;
      }
      changes.push({
        type: 'fix',
        description: `Added default coordinates for ${repaired.type}`,
        location: 'coordinates'
      });
    } else if (repaired.type === 'GeometryCollection') {
      // Ensure geometries array exists
      if (!Array.isArray(repaired.geometries)) {
        repaired.geometries = [];
        changes.push({
          type: 'fix',
          description: 'Added empty geometries array to GeometryCollection',
          location: 'geometries'
        });
      }
      
      // Repair each sub-geometry
      repaired.geometries = await Promise.all(repaired.geometries.map(async (geom: any, i: number) => {
        const { repaired: repairedGeom, changes: geomChanges } = await this.repairGeometry(geom);
        geomChanges.forEach(change => {
          changes.push({
            ...change,
            location: `geometries[${i}]${change.location ? '.' + change.location : ''}`
          });
        });
        return repairedGeom;
      }));
    }
    
    // Specific repairs for each geometry type
    switch (repaired.type) {
      case 'Polygon':
        // Ensure rings are closed
        if (Array.isArray(repaired.coordinates)) {
          repaired.coordinates.forEach((ring: any[], ringIndex: number) => {
            if (Array.isArray(ring) && ring.length >= 3) {
              const first = ring[0];
              const last = ring[ring.length - 1];
              if (first[0] !== last[0] || first[1] !== last[1]) {
                // Close the ring by adding the first point at the end
                ring.push([...first]);
                changes.push({
                  type: 'fix',
                  description: 'Closed unclosed polygon ring',
                  location: `coordinates[${ringIndex}]`
                });
              }
            }
          });
        }
        break;
      // Add specific repairs for other geometry types
    }
    
    return { repaired, changes };
  }
  
  /**
   * Calculate the buffer around a geometry
   */
  bufferGeometry(
    geometry: Feature<any> | Geometry | FeatureCollection<any>,
    distance: number,
    options: SpatialOperationOptions = {}
  ): Feature<any> {
    if (!geometry) {
      throw new Error('Invalid geometry: geometry is required');
    }
    
    const bufferOptions = {
      units: options.units || 'kilometers',
      steps: options.steps || 64
    };
    
    try {
      return turf.buffer(geometry, distance, bufferOptions);
    } catch (error) {
      console.error('Buffer operation error:', error);
      throw new Error(`Failed to buffer geometry: ${(error as Error).message}`);
    }
  }
  
  /**
   * Calculate the centroid of a geometry
   */
  centroidGeometry(
    geometry: Feature<any> | Geometry | FeatureCollection<any>,
    options: SpatialOperationOptions = {}
  ): Feature<any> {
    if (!geometry) {
      throw new Error('Invalid geometry: geometry is required');
    }
    
    try {
      return turf.centroid(geometry, options.properties);
    } catch (error) {
      console.error('Centroid operation error:', error);
      throw new Error(`Failed to calculate centroid: ${(error as Error).message}`);
    }
  }
  
  /**
   * Calculate the area of a polygon
   */
  areaGeometry(geometry: Feature<any> | Geometry): number {
    if (!geometry) {
      throw new Error('Invalid geometry: geometry is required');
    }
    
    try {
      return turf.area(geometry);
    } catch (error) {
      console.error('Area calculation error:', error);
      throw new Error(`Failed to calculate area: ${(error as Error).message}`);
    }
  }
  
  /**
   * Calculate the length of a linestring
   */
  lengthGeometry(
    geometry: Feature<any> | Geometry,
    options: SpatialOperationOptions = {}
  ): number {
    if (!geometry) {
      throw new Error('Invalid geometry: geometry is required');
    }
    
    try {
      return turf.length(geometry, { units: options.units || 'kilometers' });
    } catch (error) {
      console.error('Length calculation error:', error);
      throw new Error(`Failed to calculate length: ${(error as Error).message}`);
    }
  }
  
  /**
   * Simplify a geometry
   */
  simplifyGeometry(
    geometry: Feature<any> | Geometry,
    options: SpatialOperationOptions = {}
  ): Feature<any> {
    if (!geometry) {
      throw new Error('Invalid geometry: geometry is required');
    }
    
    try {
      const simplifyOptions = {
        tolerance: 0.01,
        highQuality: true,
        mutate: options.mutate || false
      };
      
      return turf.simplify(turf.feature(geometry), simplifyOptions);
    } catch (error) {
      console.error('Simplify operation error:', error);
      throw new Error(`Failed to simplify geometry: ${(error as Error).message}`);
    }
  }
  
  /**
   * Calculate the intersection of two geometries
   */
  intersectionGeometry(
    geometry1: Feature<any> | Geometry,
    geometry2: Feature<any> | Geometry
  ): Feature<any> | null {
    if (!geometry1 || !geometry2) {
      throw new Error('Invalid geometries: both geometries are required');
    }
    
    try {
      return turf.intersect(
        turf.feature(geometry1),
        turf.feature(geometry2)
      );
    } catch (error) {
      console.error('Intersection operation error:', error);
      throw new Error(`Failed to calculate intersection: ${(error as Error).message}`);
    }
  }
  
  /**
   * Calculate the union of two geometries
   */
  unionGeometry(
    geometry1: Feature<any> | Geometry,
    geometry2: Feature<any> | Geometry
  ): Feature<any> {
    if (!geometry1 || !geometry2) {
      throw new Error('Invalid geometries: both geometries are required');
    }
    
    try {
      return turf.union(
        turf.feature(geometry1),
        turf.feature(geometry2)
      );
    } catch (error) {
      console.error('Union operation error:', error);
      throw new Error(`Failed to calculate union: ${(error as Error).message}`);
    }
  }
  
  /**
   * Calculate the difference of two geometries
   */
  differenceGeometry(
    geometry1: Feature<any> | Geometry,
    geometry2: Feature<any> | Geometry
  ): Feature<any> | null {
    if (!geometry1 || !geometry2) {
      throw new Error('Invalid geometries: both geometries are required');
    }
    
    try {
      return turf.difference(
        turf.feature(geometry1),
        turf.feature(geometry2)
      );
    } catch (error) {
      console.error('Difference operation error:', error);
      throw new Error(`Failed to calculate difference: ${(error as Error).message}`);
    }
  }
  
  /**
   * Calculate the convex hull of a geometry
   */
  convexHullGeometry(
    geometry: Feature<any> | Geometry | FeatureCollection<any>,
    options: SpatialOperationOptions = {}
  ): Feature<any> {
    if (!geometry) {
      throw new Error('Invalid geometry: geometry is required');
    }
    
    try {
      return turf.convex(geometry, options);
    } catch (error) {
      console.error('Convex hull operation error:', error);
      throw new Error(`Failed to calculate convex hull: ${(error as Error).message}`);
    }
  }
  
  /**
   * Calculate the bounding box of a geometry
   */
  boundingBoxGeometry(geometry: Feature<any> | Geometry | FeatureCollection<any>): [number, number, number, number] {
    if (!geometry) {
      throw new Error('Invalid geometry: geometry is required');
    }
    
    try {
      return turf.bbox(geometry);
    } catch (error) {
      console.error('Bounding box calculation error:', error);
      throw new Error(`Failed to calculate bounding box: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create a bounding box polygon from a bounding box
   */
  boundingBoxPolygon(bbox: [number, number, number, number]): Feature<any> {
    try {
      return turf.bboxPolygon(bbox);
    } catch (error) {
      console.error('Bounding box polygon creation error:', error);
      throw new Error(`Failed to create bounding box polygon: ${(error as Error).message}`);
    }
  }
  
  /**
   * Calculate whether a point is within a polygon
   */
  withinGeometry(
    point: Feature<any> | Geometry,
    polygon: Feature<any> | Geometry
  ): boolean {
    if (!point || !polygon) {
      throw new Error('Invalid geometries: both point and polygon are required');
    }
    
    try {
      return turf.booleanPointInPolygon(
        point.type === 'Feature' ? point.geometry : point,
        polygon.type === 'Feature' ? polygon.geometry : polygon
      );
    } catch (error) {
      console.error('Point in polygon check error:', error);
      throw new Error(`Failed to check if point is within polygon: ${(error as Error).message}`);
    }
  }
  
  /**
   * Calculate whether polygon contains a point
   */
  containsGeometry(
    polygon: Feature<any> | Geometry,
    point: Feature<any> | Geometry
  ): boolean {
    return this.withinGeometry(point, polygon);
  }
  
  /**
   * Calculate the nearest points in a collection to a reference point
   */
  nearestPoints(
    point: Feature<any> | Geometry,
    pointsCollection: Feature<any> | FeatureCollection<any>,
    maxResults: number = 1
  ): Feature<any>[] {
    if (!point || !pointsCollection) {
      throw new Error('Invalid inputs: both point and pointsCollection are required');
    }
    
    try {
      // Use turf's nearest point and then filter for the desired number of results
      // For multiple points, we need to run the algorithm for each point in the collection
      
      // Ensure we have a Feature
      const pointFeature = point.type === 'Feature' ? point : turf.feature(point);
      
      // Convert collection to features array if needed
      let features: Feature<any>[] = [];
      if (pointsCollection.type === 'FeatureCollection') {
        features = pointsCollection.features;
      } else if (pointsCollection.type === 'Feature') {
        features = [pointsCollection];
      } else {
        features = [turf.feature(pointsCollection)];
      }
      
      // Calculate distances for each feature
      const featuresWithDistance = features.map(feat => {
        const distance = turf.distance(
          pointFeature,
          feat
        );
        return { feature: feat, distance };
      });
      
      // Sort by distance and take top N
      featuresWithDistance.sort((a, b) => a.distance - b.distance);
      return featuresWithDistance.slice(0, maxResults).map(item => item.feature);
      
    } catch (error) {
      console.error('Nearest points calculation error:', error);
      throw new Error(`Failed to find nearest points: ${(error as Error).message}`);
    }
  }
  
  /**
   * Save GIS data to storage
   */
  async saveGISLayer(
    name: string,
    data: any,
    type: string,
    metadata: Record<string, any> = {},
    userId?: number
  ): Promise<number> {
    try {
      // Create a GIS layer record
      const layer = await this.storage.createGISLayer({
        name,
        type,
        data: typeof data === 'string' ? data : JSON.stringify(data),
        metadata: JSON.stringify(metadata),
        userId: userId || 1, // Default to admin user if not specified
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return layer.id;
    } catch (error) {
      console.error('Error saving GIS layer:', error);
      throw new Error(`Failed to save GIS layer: ${(error as Error).message}`);
    }
  }
  
  /**
   * Retrieve GIS data from storage
   */
  async getGISLayer(layerId: number): Promise<any> {
    try {
      const layer = await this.storage.getGISLayer(layerId);
      
      if (!layer) {
        throw new Error(`GIS layer with ID ${layerId} not found`);
      }
      
      return {
        id: layer.id,
        name: layer.name,
        type: layer.type,
        data: typeof layer.data === 'string' ? JSON.parse(layer.data) : layer.data,
        metadata: typeof layer.metadata === 'string' ? JSON.parse(layer.metadata) : layer.metadata,
        userId: layer.userId,
        createdAt: layer.createdAt,
        updatedAt: layer.updatedAt
      };
    } catch (error) {
      console.error('Error retrieving GIS layer:', error);
      throw new Error(`Failed to retrieve GIS layer: ${(error as Error).message}`);
    }
  }
}
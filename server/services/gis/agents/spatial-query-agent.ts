/**
 * Spatial Query Agent
 * 
 * This agent handles spatial operations like intersections, buffering, and overlays.
 * It receives requests from the frontend, processes them using PostGIS functions,
 * and returns results in GeoJSON or vector tile formats.
 */

import { IStorage } from '../../../storage';
import { BaseGISAgent } from './base-gis-agent';
import { sql } from 'drizzle-orm';
import { db } from '../../../db';

/**
 * Create a Spatial Query Agent
 * @param storage The storage implementation
 * @returns A new SpatialQueryAgent instance
 */
export function createSpatialQueryAgent(storage: IStorage) {
  // Generate a unique ID for this agent instance
  const agentId = `spatial-query-agent-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  
  return new SpatialQueryAgent(storage, agentId);
}

class SpatialQueryAgent extends BaseGISAgent {
  constructor(storage: IStorage, agentId: string) {
    super(storage, {
      id: agentId,
      name: 'Spatial Query Agent',
      description: 'Processes spatial operations like intersections, buffering, and overlays using PostGIS',
      capabilities: [
        {
          name: 'performIntersection',
          description: 'Find the intersection between two geometries or layers',
          parameters: {
            sourceLayerId: { type: 'number', description: 'ID of the source layer' },
            targetLayerId: { type: 'number', description: 'ID of the target layer' },
            options: { type: 'object', optional: true, description: 'Additional options for the intersection operation' }
          },
          handler: this.performIntersection.bind(this)
        },
        {
          name: 'createBuffer',
          description: 'Create a buffer around geometries',
          parameters: {
            layerId: { type: 'number', description: 'ID of the layer to buffer' },
            distance: { type: 'number', description: 'Buffer distance in the layer\'s unit of measure' },
            options: { type: 'object', optional: true, description: 'Additional options for the buffer operation' }
          },
          handler: this.createBuffer.bind(this)
        },
        {
          name: 'performSpatialOverlay',
          description: 'Perform a spatial overlay operation (union, difference, etc.)',
          parameters: {
            sourceLayerId: { type: 'number', description: 'ID of the source layer' },
            targetLayerId: { type: 'number', description: 'ID of the target layer' },
            operation: { type: 'string', enum: ['union', 'difference', 'symmetric_difference'], description: 'Type of overlay operation' },
            options: { type: 'object', optional: true, description: 'Additional options for the overlay operation' }
          },
          handler: this.performSpatialOverlay.bind(this)
        },
        {
          name: 'nearestNeighborAnalysis',
          description: 'Find nearest neighbors for points in a layer',
          parameters: {
            layerId: { type: 'number', description: 'ID of the layer containing points' },
            targetLayerId: { type: 'number', optional: true, description: 'Optional target layer to find neighbors from' },
            maxDistance: { type: 'number', optional: true, description: 'Maximum distance to search for neighbors' },
            maxResults: { type: 'number', optional: true, description: 'Maximum number of results per point' }
          },
          handler: this.nearestNeighborAnalysis.bind(this)
        },
        {
          name: 'convertGeoJSONToSQL',
          description: 'Convert GeoJSON to PostGIS SQL queries',
          parameters: {
            geoJSON: { type: 'object', description: 'GeoJSON object to convert' },
            tableName: { type: 'string', description: 'Target table name' },
            options: { type: 'object', optional: true, description: 'Additional options for the conversion' }
          },
          handler: this.convertGeoJSONToSQL.bind(this)
        }
      ],
      permissions: ['gis:read', 'gis:write', 'gis:analyze']
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
      
      console.log(`Spatial Query Agent (${this.agentId}) initialized successfully`);
    } catch (error) {
      console.error(`Error initializing Spatial Query Agent:`, error);
      throw error;
    }
  }

  /**
   * Find the intersection between two geometries or layers
   */
  private async performIntersection(params: any): Promise<any> {
    try {
      const { sourceLayerId, targetLayerId, options = {} } = params;
      
      // Validate parameters
      if (!sourceLayerId || !targetLayerId) {
        throw new Error('Source and target layer IDs are required');
      }
      
      // Get the source and target layers
      const sourceLayer = await this.storage.getGISLayer(sourceLayerId);
      const targetLayer = await this.storage.getGISLayer(targetLayerId);
      
      if (!sourceLayer || !targetLayer) {
        throw new Error('One or both layers do not exist');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Performing intersection between layers ${sourceLayer.name} and ${targetLayer.name}`,
        agentId: this.agentId,
        metadata: { sourceLayerId, targetLayerId, options }
      });
      
      // Perform intersection using PostGIS
      // Note: This would typically involve a JOIN with ST_Intersects and ST_Intersection
      const result = await db.execute(sql`
        SELECT 
          source.id as source_id, 
          target.id as target_id,
          ST_AsGeoJSON(ST_Intersection(source.geometry, target.geometry)) as intersection_geom
        FROM 
          ${sql.identifier(sourceLayer.table_name)} source,
          ${sql.identifier(targetLayer.table_name)} target
        WHERE 
          ST_Intersects(source.geometry, target.geometry)
      `);
      
      // Processing and format conversion would happen here
      // This is a simplified implementation
      
      return {
        success: true,
        message: `Successfully performed intersection between layers ${sourceLayer.name} and ${targetLayer.name}`,
        sourceLayer: sourceLayer.name,
        targetLayer: targetLayer.name,
        results: result.rows,
        metadata: {
          count: result.rows.length,
          operation: 'intersection',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in performIntersection:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error performing intersection: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Create a buffer around geometries in a layer
   */
  private async createBuffer(params: any): Promise<any> {
    try {
      const { layerId, distance, options = {} } = params;
      
      // Validate parameters
      if (!layerId || distance === undefined) {
        throw new Error('Layer ID and distance are required');
      }
      
      // Get the layer
      const layer = await this.storage.getGISLayer(layerId);
      
      if (!layer) {
        throw new Error('Layer does not exist');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Creating buffer of distance ${distance} around geometries in layer ${layer.name}`,
        agentId: this.agentId,
        metadata: { layerId, distance, options }
      });
      
      // Create buffer using PostGIS
      const result = await db.execute(sql`
        SELECT 
          id,
          ST_AsGeoJSON(ST_Buffer(geometry, ${distance}, 'quad_segs=${options.quadSegs || 8}')) as buffered_geom
        FROM 
          ${sql.identifier(layer.table_name)}
      `);
      
      return {
        success: true,
        message: `Successfully created buffer around geometries in layer ${layer.name}`,
        layer: layer.name,
        distance,
        results: result.rows,
        metadata: {
          count: result.rows.length,
          operation: 'buffer',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in createBuffer:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error creating buffer: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Perform a spatial overlay operation (union, difference, etc.)
   */
  private async performSpatialOverlay(params: any): Promise<any> {
    try {
      const { sourceLayerId, targetLayerId, operation, options = {} } = params;
      
      // Validate parameters
      if (!sourceLayerId || !targetLayerId || !operation) {
        throw new Error('Source layer ID, target layer ID, and operation are required');
      }
      
      // Validate operation
      const validOperations = ['union', 'difference', 'symmetric_difference'];
      if (!validOperations.includes(operation)) {
        throw new Error(`Invalid operation: ${operation}. Must be one of: ${validOperations.join(', ')}`);
      }
      
      // Get the source and target layers
      const sourceLayer = await this.storage.getGISLayer(sourceLayerId);
      const targetLayer = await this.storage.getGISLayer(targetLayerId);
      
      if (!sourceLayer || !targetLayer) {
        throw new Error('One or both layers do not exist');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Performing ${operation} overlay between layers ${sourceLayer.name} and ${targetLayer.name}`,
        agentId: this.agentId,
        metadata: { sourceLayerId, targetLayerId, operation, options }
      });
      
      // Map operation to PostGIS function
      let pgisFunction: string;
      switch (operation) {
        case 'union':
          pgisFunction = 'ST_Union';
          break;
        case 'difference':
          pgisFunction = 'ST_Difference';
          break;
        case 'symmetric_difference':
          pgisFunction = 'ST_SymDifference';
          break;
      }
      
      // Perform overlay using PostGIS
      const result = await db.execute(sql`
        SELECT 
          source.id as source_id, 
          target.id as target_id,
          ST_AsGeoJSON(${sql.raw(pgisFunction)}(source.geometry, target.geometry)) as result_geom
        FROM 
          ${sql.identifier(sourceLayer.table_name)} source,
          ${sql.identifier(targetLayer.table_name)} target
        WHERE 
          ST_Intersects(source.geometry, target.geometry)
      `);
      
      return {
        success: true,
        message: `Successfully performed ${operation} between layers ${sourceLayer.name} and ${targetLayer.name}`,
        sourceLayer: sourceLayer.name,
        targetLayer: targetLayer.name,
        operation,
        results: result.rows,
        metadata: {
          count: result.rows.length,
          operation,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in performSpatialOverlay:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error performing spatial overlay: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Find nearest neighbors for points in a layer
   */
  private async nearestNeighborAnalysis(params: any): Promise<any> {
    try {
      const { layerId, targetLayerId, maxDistance = 1000, maxResults = 5 } = params;
      
      // Validate parameters
      if (!layerId) {
        throw new Error('Layer ID is required');
      }
      
      // Get the layer
      const layer = await this.storage.getGISLayer(layerId);
      
      if (!layer) {
        throw new Error('Layer does not exist');
      }
      
      // Get target layer if specified
      let targetLayer;
      if (targetLayerId) {
        targetLayer = await this.storage.getGISLayer(targetLayerId);
        if (!targetLayer) {
          throw new Error('Target layer does not exist');
        }
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: targetLayer 
          ? `Finding nearest neighbors between layers ${layer.name} and ${targetLayer.name}`
          : `Finding nearest neighbors within layer ${layer.name}`,
        agentId: this.agentId,
        metadata: { layerId, targetLayerId, maxDistance, maxResults }
      });
      
      let result;
      
      if (targetLayer) {
        // Find nearest neighbors between two layers
        result = await db.execute(sql`
          SELECT 
            source.id as source_id, 
            target.id as target_id,
            ST_Distance(source.geometry, target.geometry) as distance
          FROM 
            ${sql.identifier(layer.table_name)} source,
            ${sql.identifier(targetLayer.table_name)} target
          WHERE 
            ST_DWithin(source.geometry, target.geometry, ${maxDistance})
          ORDER BY 
            source.id, distance
          LIMIT 
            ${maxResults * layer.feature_count || 1000}
        `);
      } else {
        // Find nearest neighbors within the same layer
        result = await db.execute(sql`
          SELECT 
            a.id as source_id, 
            b.id as target_id,
            ST_Distance(a.geometry, b.geometry) as distance
          FROM 
            ${sql.identifier(layer.table_name)} a,
            ${sql.identifier(layer.table_name)} b
          WHERE 
            a.id <> b.id AND
            ST_DWithin(a.geometry, b.geometry, ${maxDistance})
          ORDER BY 
            a.id, distance
          LIMIT 
            ${maxResults * layer.feature_count || 1000}
        `);
      }
      
      return {
        success: true,
        message: targetLayer 
          ? `Successfully found nearest neighbors between layers ${layer.name} and ${targetLayer.name}`
          : `Successfully found nearest neighbors within layer ${layer.name}`,
        sourceLayer: layer.name,
        targetLayer: targetLayer?.name,
        results: result.rows,
        metadata: {
          count: result.rows.length,
          operation: 'nearest_neighbor',
          maxDistance,
          maxResults,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in nearestNeighborAnalysis:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error performing nearest neighbor analysis: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Convert GeoJSON to PostGIS SQL queries
   */
  private async convertGeoJSONToSQL(params: any): Promise<any> {
    try {
      const { geoJSON, tableName, options = {} } = params;
      
      // Validate parameters
      if (!geoJSON || !tableName) {
        throw new Error('GeoJSON and table name are required');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Converting GeoJSON to SQL for table ${tableName}`,
        agentId: this.agentId,
        metadata: { tableName, options }
      });
      
      // Extract features from GeoJSON
      const features = geoJSON.features || [];
      
      if (features.length === 0) {
        throw new Error('No features found in GeoJSON');
      }
      
      // Generate SQL statements for each feature
      const sqlStatements = features.map((feature, index) => {
        // Get properties
        const properties = feature.properties || {};
        
        // Create property columns and values
        const propertyColumns = Object.keys(properties);
        const propertyValues = Object.values(properties);
        
        // Generate SQL insert statement
        return `
          INSERT INTO ${tableName} (
            id, 
            ${propertyColumns.join(', ')}, 
            geometry
          ) VALUES (
            ${options.idStart || 1} + ${index}, 
            ${propertyValues.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')}, 
            ST_GeomFromGeoJSON('${JSON.stringify(feature.geometry)}')
          );
        `;
      });
      
      // Create table creation SQL if requested
      let createTableSQL = '';
      if (options.createTable) {
        // Sample first feature to get properties
        const sampleFeature = features[0];
        const properties = sampleFeature.properties || {};
        
        // Generate column definitions
        const columnDefs = Object.entries(properties).map(([key, value]) => {
          let type = 'text';
          if (typeof value === 'number') {
            type = Number.isInteger(value) ? 'integer' : 'float';
          } else if (typeof value === 'boolean') {
            type = 'boolean';
          }
          return `${key} ${type}`;
        });
        
        // Generate create table statement
        createTableSQL = `
          CREATE TABLE ${tableName} (
            id SERIAL PRIMARY KEY,
            ${columnDefs.join(',\n            ')},
            geometry GEOMETRY(GEOMETRY, 4326)
          );
          CREATE INDEX ${tableName}_geom_idx ON ${tableName} USING GIST (geometry);
        `;
      }
      
      return {
        success: true,
        message: `Successfully converted GeoJSON to SQL for table ${tableName}`,
        createTableSQL,
        insertSQL: sqlStatements,
        metadata: {
          featureCount: features.length,
          operation: 'geojson_to_sql',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in convertGeoJSONToSQL:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error converting GeoJSON to SQL: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }
}
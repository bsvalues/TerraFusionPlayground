/**
 * Visualization Agent
 * 
 * This agent is responsible for dynamically generating and rendering layers,
 * managing the visualization stack, and ensuring smooth stacking and rendering
 * of multiple layers, including the Venn diagram effect.
 */

import { IStorage } from '../../../storage';
import { BaseGISAgent } from './base-gis-agent';
import { sql } from 'drizzle-orm';
import { db } from '../../../db';

/**
 * Create a Visualization Agent
 * @param storage The storage implementation
 * @returns A new VisualizationAgent instance
 */
export function createVisualizationAgent(storage: IStorage) {
  // Generate a unique ID for this agent instance
  const agentId = `visualization-agent-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  
  return new VisualizationAgent(storage, agentId);
}

class VisualizationAgent extends BaseGISAgent {
  private readonly DEFAULT_STYLES = {
    point: {
      radius: 6,
      fillColor: '#3388ff',
      color: '#fff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    },
    line: {
      color: '#3388ff',
      weight: 3,
      opacity: 1
    },
    polygon: {
      fillColor: '#3388ff',
      color: '#3388ff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.6
    }
  };

  constructor(storage: IStorage, agentId: string) {
    // First call super with basic config, then we'll add capabilities after constructor
    const config = {
      id: agentId,
      name: 'Visualization Agent',
      description: 'Manages dynamic layer rendering and visualization effects',
      capabilities: [],
      permissions: ['gis:read', 'gis:write', 'gis:visualize']
    };
    
    super(storage, config);
    
    // Now add the capabilities after super() has been called
    this.config.capabilities = [
      {
        name: 'generateMapVisualization',
        description: 'Generate a complete map visualization with multiple layers',
        parameters: {
          projectId: { type: 'number', description: 'ID of the map project' },
          options: { type: 'object', optional: true, description: 'Visualization options' }
        },
        handler: this.generateMapVisualization.bind(this)
      },
      {
        name: 'applyLayerStyle',
        description: 'Apply a style to a GIS layer',
        parameters: {
          layerId: { type: 'number', description: 'ID of the layer to style' },
          style: { type: 'object', description: 'Style properties to apply' }
        },
        handler: this.applyLayerStyle.bind(this)
      },
      {
        name: 'createThematicLayer',
        description: 'Create a thematic layer based on data attributes',
        parameters: {
          layerId: { type: 'number', description: 'ID of the base layer' },
          attribute: { type: 'string', description: 'Attribute to use for theming' },
          method: { type: 'string', enum: ['categorized', 'graduated', 'heatmap', 'choropleth'], description: 'Thematic mapping method' },
          options: { type: 'object', optional: true, description: 'Additional styling options' }
        },
        handler: this.createThematicLayer.bind(this)
      },
      {
        name: 'createLayerGroup',
        description: 'Create a group of layers with synchronized visualization',
        parameters: {
          layerIds: { type: 'array', items: { type: 'number' }, description: 'IDs of layers to group' },
          groupOptions: { type: 'object', optional: true, description: 'Group configuration options' }
        },
        handler: this.createLayerGroup.bind(this)
      },
      {
        name: 'generateVennDiagramLayers',
        description: 'Generate layers for a spatial Venn diagram visualization',
        parameters: {
          layerIds: { type: 'array', items: { type: 'number' }, description: 'IDs of layers to use in the Venn diagram' },
          options: { type: 'object', optional: true, description: 'Venn diagram options' }
        },
        handler: this.generateVennDiagramLayers.bind(this)
      }
    ];
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
      
      console.log(`Visualization Agent (${this.agentId}) initialized successfully`);
    } catch (error) {
      console.error(`Error initializing Visualization Agent:`, error);
      throw error;
    }
  }

  /**
   * Generate a complete map visualization with multiple layers
   */
  private async generateMapVisualization(params: any): Promise<any> {
    try {
      const { projectId, options = {} } = params;
      
      // Validate parameters
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      // Get the map project
      const project = await this.storage.getGISMapProject(projectId);
      
      if (!project) {
        throw new Error(`Map project with ID ${projectId} not found`);
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Generating map visualization for project ${project.name}`,
        agentId: this.agentId,
        metadata: { projectId, options }
      });
      
      // Get all layers in the project
      const layers = await this.storage.getGISLayersByProject(projectId);
      
      if (!layers || layers.length === 0) {
        throw new Error(`No layers found for project ${projectId}`);
      }
      
      // Process each layer to prepare visualization data
      const visualizationLayers = await Promise.all(layers.map(async (layer) => {
        // Get layer style or use default style based on geometry type
        const style = layer.style || this.getDefaultStyle(layer.geometry_type);
        
        // Process layer based on its type
        return {
          id: layer.id,
          name: layer.name,
          type: layer.layer_type,
          geometryType: layer.geometry_type,
          tableName: layer.table_name,
          visible: layer.visible,
          style,
          metadata: layer.metadata,
          order: layer.display_order
        };
      }));
      
      // Sort layers by display order
      visualizationLayers.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Generate visualization settings
      const visualizationSettings = {
        center: project.center_point ? JSON.parse(project.center_point) : [0, 0],
        zoom: project.default_zoom || 2,
        basemap: project.basemap || 'osm',
        projection: project.projection || 'EPSG:3857',
        maxBounds: project.bounds ? JSON.parse(project.bounds) : null,
        backgroundColor: options.backgroundColor || project.background_color || '#ffffff'
      };
      
      return {
        success: true,
        projectId,
        projectName: project.name,
        description: project.description,
        settings: visualizationSettings,
        layers: visualizationLayers,
        metadata: {
          layerCount: visualizationLayers.length,
          operation: 'generate_map_visualization',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in generateMapVisualization:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error generating map visualization: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Apply a style to a GIS layer
   */
  private async applyLayerStyle(params: any): Promise<any> {
    try {
      const { layerId, style } = params;
      
      // Validate parameters
      if (!layerId || !style || typeof style !== 'object') {
        throw new Error('Layer ID and style object are required');
      }
      
      // Get the layer
      const layer = await this.storage.getGISLayer(layerId);
      
      if (!layer) {
        throw new Error(`Layer with ID ${layerId} not found`);
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Applying style to layer ${layer.name}`,
        agentId: this.agentId,
        metadata: { layerId, style }
      });
      
      // Validate style based on geometry type
      this.validateStyleForGeometryType(style, layer.geometry_type);
      
      // Update the layer with the new style
      const updatedLayer = await this.storage.updateGISLayer(layerId, {
        style: JSON.stringify(style),
        updated_at: new Date()
      });
      
      return {
        success: true,
        message: `Successfully applied style to layer ${layer.name}`,
        layerId,
        layerName: layer.name,
        style,
        metadata: {
          operation: 'apply_layer_style',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in applyLayerStyle:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error applying layer style: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Create a thematic layer based on data attributes
   */
  private async createThematicLayer(params: any): Promise<any> {
    try {
      const { layerId, attribute, method, options = {} } = params;
      
      // Validate parameters
      if (!layerId || !attribute || !method) {
        throw new Error('Layer ID, attribute, and method are required');
      }
      
      // Get the layer
      const layer = await this.storage.getGISLayer(layerId);
      
      if (!layer) {
        throw new Error(`Layer with ID ${layerId} not found`);
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Creating ${method} thematic layer based on ${layer.name} using attribute ${attribute}`,
        agentId: this.agentId,
        metadata: { layerId, attribute, method, options }
      });
      
      // Get attribute statistics for the layer
      const stats = await this.getAttributeStatistics(layer.table_name, attribute);
      
      if (!stats) {
        throw new Error(`Failed to get statistics for attribute ${attribute}`);
      }
      
      // Generate theme settings based on the method
      let themeSettings;
      switch (method) {
        case 'categorized':
          themeSettings = this.generateCategorizedTheme(stats, options);
          break;
        case 'graduated':
          themeSettings = this.generateGraduatedTheme(stats, options);
          break;
        case 'heatmap':
          themeSettings = this.generateHeatmapTheme(stats, options);
          break;
        case 'choropleth':
          themeSettings = this.generateChoroplethTheme(stats, options);
          break;
        default:
          throw new Error(`Unsupported thematic method: ${method}`);
      }
      
      // Create a new derived layer with the theme settings
      const newLayerData = {
        name: `${layer.name} - ${method} by ${attribute}`,
        description: `Thematic layer based on ${layer.name} using ${attribute}`,
        project_id: layer.project_id,
        layer_type: 'thematic',
        geometry_type: layer.geometry_type,
        source_layer_id: layerId,
        table_name: layer.table_name,
        visible: true,
        display_order: (layer.display_order || 0) + 1,
        style: JSON.stringify(themeSettings.style),
        metadata: JSON.stringify({
          thematic: {
            method,
            attribute,
            settings: themeSettings.settings
          },
          parentLayer: {
            id: layerId,
            name: layer.name
          }
        }),
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Create the new layer
      const newLayer = await this.storage.createGISLayer(newLayerData);
      
      return {
        success: true,
        message: `Successfully created ${method} thematic layer based on ${layer.name}`,
        sourceLayerId: layerId,
        newLayerId: newLayer.id,
        newLayerName: newLayer.name,
        themeMethod: method,
        attribute,
        themeSettings,
        metadata: {
          operation: 'create_thematic_layer',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in createThematicLayer:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error creating thematic layer: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Create a group of layers with synchronized visualization
   */
  private async createLayerGroup(params: any): Promise<any> {
    try {
      const { layerIds, groupOptions = {} } = params;
      
      // Validate parameters
      if (!layerIds || !Array.isArray(layerIds) || layerIds.length === 0) {
        throw new Error('At least one layer ID is required');
      }
      
      // Get the layers
      const layers = await Promise.all(layerIds.map(id => this.storage.getGISLayer(id)));
      
      // Filter out any null values (layers that don't exist)
      const validLayers = layers.filter(layer => layer !== null && layer !== undefined);
      
      if (validLayers.length === 0) {
        throw new Error('None of the specified layers exist');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Creating layer group with ${validLayers.length} layers`,
        agentId: this.agentId,
        metadata: { layerIds, groupOptions }
      });
      
      // Ensure all layers belong to the same project
      const projectIds = new Set(validLayers.map(layer => layer.project_id));
      if (projectIds.size > 1) {
        throw new Error('All layers in a group must belong to the same project');
      }
      
      // Get the project
      const projectId = validLayers[0].project_id;
      const project = await this.storage.getGISMapProject(projectId);
      
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }
      
      // Create the layer group
      const layerGroup = {
        name: groupOptions.name || `Layer Group ${Date.now()}`,
        description: groupOptions.description || `Group containing ${validLayers.length} layers`,
        project_id: projectId,
        layer_ids: JSON.stringify(validLayers.map(layer => layer.id)),
        is_visible: groupOptions.visible !== undefined ? groupOptions.visible : true,
        display_order: groupOptions.displayOrder || 0,
        group_type: groupOptions.groupType || 'standard',
        metadata: JSON.stringify(groupOptions.metadata || {}),
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Create the group in storage
      const createdGroup = await this.storage.createGISLayerGroup(layerGroup);
      
      return {
        success: true,
        message: `Successfully created layer group ${layerGroup.name}`,
        groupId: createdGroup.id,
        groupName: createdGroup.name,
        projectId,
        projectName: project.name,
        layerIds: validLayers.map(layer => layer.id),
        layerNames: validLayers.map(layer => layer.name),
        metadata: {
          operation: 'create_layer_group',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in createLayerGroup:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error creating layer group: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Generate layers for a spatial Venn diagram visualization
   */
  private async generateVennDiagramLayers(params: any): Promise<any> {
    try {
      const { layerIds, options = {} } = params;
      
      // Validate parameters
      if (!layerIds || !Array.isArray(layerIds) || layerIds.length < 2) {
        throw new Error('At least two layer IDs are required for a Venn diagram');
      }
      
      if (layerIds.length > 3) {
        throw new Error('A maximum of three layers is supported for Venn diagrams');
      }
      
      // Get the layers
      const layers = await Promise.all(layerIds.map(id => this.storage.getGISLayer(id)));
      
      // Filter out any null values (layers that don't exist)
      const validLayers = layers.filter(layer => layer !== null && layer !== undefined);
      
      if (validLayers.length < 2) {
        throw new Error('At least two valid layers are required for a Venn diagram');
      }
      
      // Log the operation
      await this.createAgentMessage({
        type: 'INFO',
        content: `Generating spatial Venn diagram for ${validLayers.length} layers`,
        agentId: this.agentId,
        metadata: { layerIds, options }
      });
      
      // Ensure all layers belong to the same project
      const projectIds = new Set(validLayers.map(layer => layer.project_id));
      if (projectIds.size > 1) {
        throw new Error('All layers in a Venn diagram must belong to the same project');
      }
      
      // Ensure all layers have polygon geometry
      for (const layer of validLayers) {
        if (layer.geometry_type !== 'Polygon' && layer.geometry_type !== 'MultiPolygon') {
          throw new Error(`Layer ${layer.name} has geometry type ${layer.geometry_type}, but Venn diagrams require Polygon or MultiPolygon geometry`);
        }
      }
      
      // Get the project
      const projectId = validLayers[0].project_id;
      const project = await this.storage.getGISMapProject(projectId);
      
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }
      
      // Generate Venn diagram layers
      const vennLayers = [];
      const intersectionStyles = options.intersectionStyles || this.generateVennDiagramStyles(validLayers.length);
      
      // Create intersection layers
      const layerA = validLayers[0];
      const layerB = validLayers[1];
      
      // A ∩ B (intersection of layers A and B)
      const intersectionAB = await this.createIntersectionLayer(
        layerA, 
        layerB, 
        `${layerA.name} ∩ ${layerB.name}`, 
        intersectionStyles.ab
      );
      vennLayers.push(intersectionAB);
      
      // If we have a third layer, create additional intersections
      if (validLayers.length === 3) {
        const layerC = validLayers[2];
        
        // A ∩ C (intersection of layers A and C)
        const intersectionAC = await this.createIntersectionLayer(
          layerA, 
          layerC, 
          `${layerA.name} ∩ ${layerC.name}`, 
          intersectionStyles.ac
        );
        vennLayers.push(intersectionAC);
        
        // B ∩ C (intersection of layers B and C)
        const intersectionBC = await this.createIntersectionLayer(
          layerB, 
          layerC, 
          `${layerB.name} ∩ ${layerC.name}`, 
          intersectionStyles.bc
        );
        vennLayers.push(intersectionBC);
        
        // A ∩ B ∩ C (intersection of all three layers)
        const intersectionABC = await this.createTripleIntersectionLayer(
          layerA, 
          layerB, 
          layerC, 
          `${layerA.name} ∩ ${layerB.name} ∩ ${layerC.name}`, 
          intersectionStyles.abc
        );
        vennLayers.push(intersectionABC);
      }
      
      // Create a layer group for the Venn diagram
      const vennGroupName = options.groupName || `Venn Diagram ${Date.now()}`;
      const layerGroup = {
        name: vennGroupName,
        description: `Spatial Venn diagram for layers: ${validLayers.map(l => l.name).join(', ')}`,
        project_id: projectId,
        layer_ids: JSON.stringify(vennLayers.map(layer => layer.id)),
        is_visible: true,
        display_order: options.displayOrder || 0,
        group_type: 'venn_diagram',
        metadata: JSON.stringify({
          vennDiagram: {
            sourceLayers: validLayers.map(l => ({ id: l.id, name: l.name })),
            intersectionStyles
          },
          ...options.metadata || {}
        }),
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Create the group in storage
      const createdGroup = await this.storage.createGISLayerGroup(layerGroup);
      
      return {
        success: true,
        message: `Successfully created Venn diagram layers and group "${vennGroupName}"`,
        groupId: createdGroup.id,
        groupName: createdGroup.name,
        projectId,
        projectName: project.name,
        sourceLayers: validLayers.map(layer => ({ id: layer.id, name: layer.name })),
        vennLayers: vennLayers.map(layer => ({ id: layer.id, name: layer.name, type: layer.layer_type })),
        metadata: {
          operation: 'generate_venn_diagram_layers',
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error(`Error in generateVennDiagramLayers:`, error);
      
      // Log the error
      await this.createAgentMessage({
        type: 'ERROR',
        content: `Error generating Venn diagram layers: ${error.message}`,
        agentId: this.agentId,
        metadata: { error: error.message, params }
      });
      
      throw error;
    }
  }

  /**
   * Get default style based on geometry type
   */
  private getDefaultStyle(geometryType: string): any {
    if (!geometryType) {
      return this.DEFAULT_STYLES.polygon;
    }
    
    switch (geometryType.toLowerCase()) {
      case 'point':
      case 'multipoint':
        return this.DEFAULT_STYLES.point;
      case 'linestring':
      case 'multilinestring':
        return this.DEFAULT_STYLES.line;
      case 'polygon':
      case 'multipolygon':
        return this.DEFAULT_STYLES.polygon;
      default:
        return this.DEFAULT_STYLES.polygon;
    }
  }

  /**
   * Validate a style object for a specific geometry type
   */
  private validateStyleForGeometryType(style: any, geometryType: string): void {
    // Basic validation to ensure style properties make sense for the geometry type
    // This could be expanded with more detailed checks
    
    if (!geometryType) {
      return;
    }
    
    switch (geometryType.toLowerCase()) {
      case 'point':
      case 'multipoint':
        // Points should have radius
        if (style.radius !== undefined && typeof style.radius !== 'number') {
          throw new Error('Point style "radius" must be a number');
        }
        break;
        
      case 'linestring':
      case 'multilinestring':
        // Lines should have weight/width
        if (style.weight !== undefined && typeof style.weight !== 'number') {
          throw new Error('Line style "weight" must be a number');
        }
        break;
        
      case 'polygon':
      case 'multipolygon':
        // Polygons should have fillColor and fillOpacity
        if (style.fillColor !== undefined && typeof style.fillColor !== 'string') {
          throw new Error('Polygon style "fillColor" must be a string');
        }
        if (style.fillOpacity !== undefined && typeof style.fillOpacity !== 'number') {
          throw new Error('Polygon style "fillOpacity" must be a number');
        }
        break;
    }
  }

  /**
   * Get statistics for an attribute in a table
   */
  private async getAttributeStatistics(tableName: string, attribute: string): Promise<any> {
    try {
      // Get attribute statistics using SQL
      const result = await db.execute(sql`
        SELECT 
          MIN(${sql.raw(attribute)}) AS min_val,
          MAX(${sql.raw(attribute)}) AS max_val,
          AVG(${sql.raw(attribute)})::FLOAT AS avg_val,
          COUNT(${sql.raw(attribute)}) AS count_val,
          COUNT(DISTINCT ${sql.raw(attribute)}) AS unique_count
        FROM ${sql.identifier(tableName)}
        WHERE ${sql.raw(attribute)} IS NOT NULL
      `);
      
      if (!result.rows || result.rows.length === 0) {
        return null;
      }
      
      const stats = result.rows[0];
      
      // Get the unique values if needed
      let uniqueValues = [];
      if (stats.unique_count < 20) {  // Only get unique values if there aren't too many
        const uniqueResult = await db.execute(sql`
          SELECT DISTINCT ${sql.raw(attribute)} AS value
          FROM ${sql.identifier(tableName)}
          WHERE ${sql.raw(attribute)} IS NOT NULL
          ORDER BY ${sql.raw(attribute)}
        `);
        
        uniqueValues = uniqueResult.rows.map(row => row.value);
      }
      
      // Determine data type
      let dataType = 'string';
      if (!isNaN(parseFloat(stats.min_val)) && !isNaN(parseFloat(stats.max_val))) {
        dataType = 'number';
      } else if (stats.min_val instanceof Date && stats.max_val instanceof Date) {
        dataType = 'date';
      }
      
      return {
        attribute,
        dataType,
        min: stats.min_val,
        max: stats.max_val,
        average: stats.avg_val,
        count: stats.count_val,
        uniqueCount: stats.unique_count,
        uniqueValues
      };
    } catch (error) {
      console.error(`Error getting attribute statistics:`, error);
      return null;
    }
  }

  /**
   * Generate a categorized theme based on attribute statistics
   */
  private generateCategorizedTheme(stats: any, options: any): any {
    const { attribute, uniqueValues, dataType } = stats;
    
    // Generate a color for each unique value
    const categories = [];
    const colorScheme = options.colorScheme || ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
    
    uniqueValues.forEach((value, index) => {
      categories.push({
        value,
        color: colorScheme[index % colorScheme.length],
        label: options.labels ? options.labels[index] : String(value)
      });
    });
    
    // Create a style function based on categories
    const styleFunction = {
      type: 'categorized',
      attribute,
      categories
    };
    
    return {
      style: {
        type: 'function',
        function: styleFunction
      },
      settings: {
        attribute,
        dataType,
        categories,
        defaultColor: options.defaultColor || '#cccccc'
      }
    };
  }

  /**
   * Generate a graduated theme based on attribute statistics
   */
  private generateGraduatedTheme(stats: any, options: any): any {
    const { attribute, min, max, dataType } = stats;
    
    if (dataType !== 'number') {
      throw new Error('Graduated themes can only be applied to numeric attributes');
    }
    
    // Determine classification method and classes
    const method = options.method || 'equal_interval';
    const classCount = options.classCount || 5;
    
    // Generate classes based on method
    let classes = [];
    const colorScheme = options.colorScheme || ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026'];
    
    // Different classification methods (simple implementation)
    if (method === 'equal_interval') {
      const interval = (max - min) / classCount;
      
      for (let i = 0; i < classCount; i++) {
        const lowerBound = min + (i * interval);
        const upperBound = min + ((i + 1) * interval);
        
        classes.push({
          lowerBound,
          upperBound: i === classCount - 1 ? max : upperBound,
          color: colorScheme[i % colorScheme.length],
          label: options.labels ? options.labels[i] : `${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)}`
        });
      }
    } else if (method === 'quantile') {
      // Quantile would require actual data distribution
      // This is a placeholder for demonstration
      classes = [
        { lowerBound: min, upperBound: min + (max - min) * 0.2, color: colorScheme[0] },
        { lowerBound: min + (max - min) * 0.2, upperBound: min + (max - min) * 0.4, color: colorScheme[1] },
        { lowerBound: min + (max - min) * 0.4, upperBound: min + (max - min) * 0.6, color: colorScheme[2] },
        { lowerBound: min + (max - min) * 0.6, upperBound: min + (max - min) * 0.8, color: colorScheme[3] },
        { lowerBound: min + (max - min) * 0.8, upperBound: max, color: colorScheme[4] }
      ];
    }
    
    // Create a style function based on classes
    const styleFunction = {
      type: 'graduated',
      attribute,
      classes
    };
    
    return {
      style: {
        type: 'function',
        function: styleFunction
      },
      settings: {
        attribute,
        dataType,
        method,
        classes,
        defaultColor: options.defaultColor || '#cccccc'
      }
    };
  }

  /**
   * Generate a heatmap theme based on attribute statistics
   */
  private generateHeatmapTheme(stats: any, options: any): any {
    const { attribute } = stats;
    
    // Heatmap settings
    const heatmapSettings = {
      radius: options.radius || 25,
      blur: options.blur || 15,
      gradient: options.gradient || {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      },
      minOpacity: options.minOpacity || 0.05,
      maxZoom: options.maxZoom || 18
    };
    
    // Create a style function for heatmap
    const styleFunction = {
      type: 'heatmap',
      attribute,
      settings: heatmapSettings
    };
    
    return {
      style: {
        type: 'function',
        function: styleFunction
      },
      settings: {
        attribute,
        heatmap: heatmapSettings
      }
    };
  }

  /**
   * Generate a choropleth theme based on attribute statistics
   */
  private generateChoroplethTheme(stats: any, options: any): any {
    const { attribute, min, max, dataType } = stats;
    
    if (dataType !== 'number') {
      throw new Error('Choropleth themes can only be applied to numeric attributes');
    }
    
    // Choropleth settings (similar to graduated, but specifically for polygons)
    const classCount = options.classCount || 5;
    const colorScheme = options.colorScheme || ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'];
    
    // Generate classes
    const interval = (max - min) / classCount;
    const classes = [];
    
    for (let i = 0; i < classCount; i++) {
      const lowerBound = min + (i * interval);
      const upperBound = min + ((i + 1) * interval);
      
      classes.push({
        lowerBound,
        upperBound: i === classCount - 1 ? max : upperBound,
        color: colorScheme[i % colorScheme.length],
        label: options.labels ? options.labels[i] : `${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)}`
      });
    }
    
    // Create a style function for choropleth
    const styleFunction = {
      type: 'choropleth',
      attribute,
      classes
    };
    
    return {
      style: {
        type: 'function',
        function: styleFunction
      },
      settings: {
        attribute,
        dataType,
        classes,
        defaultColor: options.defaultColor || '#cccccc',
        outlineColor: options.outlineColor || '#333333',
        outlineWidth: options.outlineWidth || 1
      }
    };
  }

  /**
   * Generate styles for a Venn diagram
   */
  private generateVennDiagramStyles(layerCount: number): any {
    // Default styles for Venn diagram intersections
    if (layerCount === 2) {
      return {
        ab: {
          fillColor: '#9467bd',
          color: '#333',
          weight: 1,
          fillOpacity: 0.7
        }
      };
    } else if (layerCount === 3) {
      return {
        ab: {
          fillColor: '#9467bd',
          color: '#333',
          weight: 1,
          fillOpacity: 0.7
        },
        ac: {
          fillColor: '#8c564b',
          color: '#333',
          weight: 1,
          fillOpacity: 0.7
        },
        bc: {
          fillColor: '#e377c2',
          color: '#333',
          weight: 1,
          fillOpacity: 0.7
        },
        abc: {
          fillColor: '#7f7f7f',
          color: '#333',
          weight: 1,
          fillOpacity: 0.9
        }
      };
    }
    
    return {};
  }

  /**
   * Create an intersection layer between two layers
   */
  private async createIntersectionLayer(layerA: any, layerB: any, name: string, style: any): Promise<any> {
    // Create a new layer representing the intersection
    const intersectionLayer = {
      name,
      description: `Intersection between ${layerA.name} and ${layerB.name}`,
      project_id: layerA.project_id,
      layer_type: 'derived',
      geometry_type: 'Polygon',
      source_layer_id: layerA.id,
      table_name: `intersection_${layerA.id}_${layerB.id}`,
      visible: true,
      display_order: Math.max(layerA.display_order || 0, layerB.display_order || 0) + 1,
      style: JSON.stringify(style),
      metadata: JSON.stringify({
        derivationType: 'intersection',
        sourceLayers: [
          { id: layerA.id, name: layerA.name },
          { id: layerB.id, name: layerB.name }
        ]
      }),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Create the layer in storage
    const createdLayer = await this.storage.createGISLayer(intersectionLayer);
    
    // Create the intersection table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${sql.identifier(intersectionLayer.table_name)} (
        id SERIAL PRIMARY KEY,
        geometry GEOMETRY(Polygon, 4326),
        source_a_id INTEGER,
        source_b_id INTEGER
      )
    `);
    
    // Populate the intersection table
    await db.execute(sql`
      INSERT INTO ${sql.identifier(intersectionLayer.table_name)} (geometry, source_a_id, source_b_id)
      SELECT 
        ST_Intersection(a.geometry, b.geometry) as geometry,
        a.id as source_a_id,
        b.id as source_b_id
      FROM 
        ${sql.identifier(layerA.table_name)} a,
        ${sql.identifier(layerB.table_name)} b
      WHERE 
        ST_Intersects(a.geometry, b.geometry)
    `);
    
    return createdLayer;
  }

  /**
   * Create a triple intersection layer between three layers
   */
  private async createTripleIntersectionLayer(layerA: any, layerB: any, layerC: any, name: string, style: any): Promise<any> {
    // Create a new layer representing the intersection of all three layers
    const intersectionLayer = {
      name,
      description: `Intersection between ${layerA.name}, ${layerB.name}, and ${layerC.name}`,
      project_id: layerA.project_id,
      layer_type: 'derived',
      geometry_type: 'Polygon',
      source_layer_id: layerA.id,
      table_name: `intersection_${layerA.id}_${layerB.id}_${layerC.id}`,
      visible: true,
      display_order: Math.max(layerA.display_order || 0, layerB.display_order || 0, layerC.display_order || 0) + 1,
      style: JSON.stringify(style),
      metadata: JSON.stringify({
        derivationType: 'intersection',
        sourceLayers: [
          { id: layerA.id, name: layerA.name },
          { id: layerB.id, name: layerB.name },
          { id: layerC.id, name: layerC.name }
        ]
      }),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Create the layer in storage
    const createdLayer = await this.storage.createGISLayer(intersectionLayer);
    
    // Create the intersection table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${sql.identifier(intersectionLayer.table_name)} (
        id SERIAL PRIMARY KEY,
        geometry GEOMETRY(Polygon, 4326),
        source_a_id INTEGER,
        source_b_id INTEGER,
        source_c_id INTEGER
      )
    `);
    
    // Populate the intersection table
    await db.execute(sql`
      INSERT INTO ${sql.identifier(intersectionLayer.table_name)} (geometry, source_a_id, source_b_id, source_c_id)
      SELECT 
        ST_Intersection(ST_Intersection(a.geometry, b.geometry), c.geometry) as geometry,
        a.id as source_a_id,
        b.id as source_b_id,
        c.id as source_c_id
      FROM 
        ${sql.identifier(layerA.table_name)} a,
        ${sql.identifier(layerB.table_name)} b,
        ${sql.identifier(layerC.table_name)} c
      WHERE 
        ST_Intersects(a.geometry, b.geometry) AND
        ST_Intersects(b.geometry, c.geometry) AND
        ST_Intersects(a.geometry, c.geometry)
    `);
    
    return createdLayer;
  }
}
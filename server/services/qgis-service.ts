/**
 * QGIS Service
 * 
 * This service handles interaction with QGIS Server for map rendering and spatial operations.
 * It provides functionality to work with QGIS project files, layers, and WMS/WFS services.
 */

import { IStorage } from '../storage';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { promisify } from 'util';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream';

const streamPipeline = promisify(pipeline);

interface QGISLayerDefinition {
  id: string;
  name: string;
  type: string;
  source: string;
  projection: string;
  minZoom?: number;
  maxZoom?: number;
  style?: any;
}

interface QGISProjectDefinition {
  id: string;
  name: string;
  description?: string;
  layers: QGISLayerDefinition[];
  extent: [number, number, number, number];
  projection: string;
}

/**
 * QGIS Service main class
 */
export class QGISService {
  private storage: IStorage;
  private projectsDir: string;
  private layerStyles: Map<string, any>;
  private qgisServerUrl: string;
  
  constructor(storage: IStorage) {
    this.storage = storage;
    this.projectsDir = path.join(process.cwd(), 'gis-projects');
    this.layerStyles = new Map();
    
    // Default to a mock server URL - in production this would be the actual QGIS server
    this.qgisServerUrl = process.env.QGIS_SERVER_URL || 'http://localhost:8080/qgis-server';
    
    // Ensure projects directory exists
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('Initializing QGIS Service');
    
    // Load default layer styles
    await this.loadDefaultStyles();
    
    // Create default project if it doesn't exist
    await this.ensureDefaultProject();
    
    console.log('QGIS Service initialized');
  }

  /**
   * Load default layer styles for QGIS
   */
  private async loadDefaultStyles(): Promise<void> {
    // For demo purposes, we're defining simple styles
    // In a production environment, these would be loaded from actual QGIS style files
    this.layerStyles.set('parcel', {
      fillColor: '#3388ff',
      fillOpacity: 0.4,
      strokeColor: '#3388ff',
      strokeWidth: 1
    });
    
    this.layerStyles.set('zoning', {
      fillColor: '#33cc33',
      fillOpacity: 0.4,
      strokeColor: '#33cc33',
      strokeWidth: 1
    });
    
    this.layerStyles.set('flood', {
      fillColor: '#0099ff',
      fillOpacity: 0.4,
      strokeColor: '#0099ff',
      strokeWidth: 1
    });
  }

  /**
   * Ensure the default QGIS project exists
   */
  private async ensureDefaultProject(): Promise<void> {
    const defaultProjectPath = path.join(this.projectsDir, 'default_project.qgs');
    
    // Check if the default project already exists
    if (!fs.existsSync(defaultProjectPath)) {
      // In a real implementation, we would create an actual QGIS project file
      // For now, we'll just create a placeholder file
      const placeholderContent = `<?xml version="1.0" encoding="UTF-8"?>
<qgis projectname="TerraFusion GIS Project">
  <title>TerraFusion GIS Project</title>
  <autotransaction active="0"/>
  <evaluateDefaultValues active="0"/>
  <trust active="0"/>
  <projectCrs>
    <spatialrefsys>
      <wkt>GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]</wkt>
      <proj4>+proj=longlat +datum=WGS84 +no_defs</proj4>
      <srsid>3452</srsid>
      <srid>4326</srid>
      <authid>EPSG:4326</authid>
      <description>WGS 84</description>
      <projectionacronym>longlat</projectionacronym>
      <ellipsoidacronym>WGS84</ellipsoidacronym>
      <geographicflag>true</geographicflag>
    </spatialrefsys>
  </projectCrs>
  <mapcanvas>
    <units>degrees</units>
    <extent>
      <xmin>-119.4</xmin>
      <ymin>46.0</ymin>
      <xmax>-119.0</xmax>
      <ymax>46.4</ymax>
    </extent>
    <rotation>0</rotation>
    <destinationsrs>
      <spatialrefsys>
        <wkt>GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]</wkt>
        <proj4>+proj=longlat +datum=WGS84 +no_defs</proj4>
        <srsid>3452</srsid>
        <srid>4326</srid>
        <authid>EPSG:4326</authid>
        <description>WGS 84</description>
        <projectionacronym>longlat</projectionacronym>
        <ellipsoidacronym>WGS84</ellipsoidacronym>
        <geographicflag>true</geographicflag>
      </spatialrefsys>
    </destinationsrs>
  </mapcanvas>
  <layer-tree-group>
    <customproperties/>
    <layer-tree-layer expanded="1" checked="Qt::Checked" id="parcels" name="Parcels">
      <customproperties/>
    </layer-tree-layer>
    <layer-tree-layer expanded="1" checked="Qt::Checked" id="zoning" name="Zoning">
      <customproperties/>
    </layer-tree-layer>
    <layer-tree-layer expanded="1" checked="Qt::Checked" id="flood" name="Flood Zones">
      <customproperties/>
    </layer-tree-layer>
  </layer-tree-group>
</qgis>`;
      
      // Write the placeholder content to the file
      fs.writeFileSync(defaultProjectPath, placeholderContent);
      console.log(`Created default QGIS project at ${defaultProjectPath}`);
    }
  }

  /**
   * Get list of available QGIS projects
   */
  async getProjects(): Promise<QGISProjectDefinition[]> {
    // In a real implementation, this would discover and parse actual QGIS project files
    // For demo purposes, we'll return a static list with our default project
    
    return [
      {
        id: 'default_project',
        name: 'TerraFusion GIS Project',
        description: 'Default QGIS project for the TerraFusion platform',
        layers: [
          {
            id: 'parcels',
            name: 'Parcels',
            type: 'vector',
            source: 'local',
            projection: 'EPSG:4326'
          },
          {
            id: 'zoning',
            name: 'Zoning',
            type: 'vector',
            source: 'local',
            projection: 'EPSG:4326'
          },
          {
            id: 'flood',
            name: 'Flood Zones',
            type: 'vector',
            source: 'local',
            projection: 'EPSG:4326'
          }
        ],
        extent: [-119.4, 46.0, -119.0, 46.4], // Benton County, WA approximate extent
        projection: 'EPSG:4326'
      }
    ];
  }

  /**
   * Get layers for a specific QGIS project
   */
  async getProjectLayers(projectId: string): Promise<QGISLayerDefinition[]> {
    const projects = await this.getProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    
    return project.layers;
  }

  /**
   * Get WMS URL for a QGIS project
   */
  getProjectWmsUrl(projectId: string): string {
    // In a real implementation, this would construct the actual WMS URL for the QGIS Server
    return `${this.qgisServerUrl}?MAP=${projectId}.qgs&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;
  }

  /**
   * Get WFS URL for a QGIS project
   */
  getProjectWfsUrl(projectId: string): string {
    // In a real implementation, this would construct the actual WFS URL for the QGIS Server
    return `${this.qgisServerUrl}?MAP=${projectId}.qgs&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetCapabilities`;
  }

  /**
   * Upload a QGIS project file
   */
  async uploadProject(projectName: string, projectFile: Buffer): Promise<string> {
    // Generate a safe filename from the project name
    const safeProjectName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');
    
    const projectId = `${safeProjectName}_${Date.now()}`;
    const projectPath = path.join(this.projectsDir, `${projectId}.qgs`);
    
    // Write the file
    fs.writeFileSync(projectPath, projectFile);
    
    return projectId;
  }

  /**
   * Create a map image for a specific area (WMS GetMap)
   */
  async createMapImage(
    projectId: string,
    bbox: [number, number, number, number],
    width: number,
    height: number,
    layers: string[],
    format: string = 'image/png'
  ): Promise<Buffer> {
    // In a real implementation, this would make a WMS GetMap request to the QGIS Server
    // For demo purposes, we're creating a mock image
    
    // Mock implementation - in a real scenario, we would fetch the image from QGIS Server
    const wmsUrl = `${this.qgisServerUrl}?MAP=${projectId}.qgs&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=${bbox.join(',')}&CRS=EPSG:4326&WIDTH=${width}&HEIGHT=${height}&LAYERS=${layers.join(',')}&STYLES=&FORMAT=${format}`;
    
    // Return a placeholder image buffer
    // In a real implementation, we would fetch and return the actual WMS image
    return Buffer.from('Mock WMS image data');
  }
}

/**
 * Initialize QGIS service
 */
export async function initializeQGISService(storage: IStorage): Promise<QGISService> {
  const qgisService = new QGISService(storage);
  await qgisService.initialize();
  return qgisService;
}
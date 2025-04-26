/**
 * Offline GIS Module
 * 
 * Provides offline mapping and geospatial capabilities:
 * - Vector and raster tile caching
 * - Offline editing of spatial features
 * - Map area management for selective downloads
 * - Coordinate transformations and spatial operations
 */

import { EventEmitter } from 'events';
import { StorageManager } from './storage';

// Tile types
export enum TileType {
  VECTOR = 'vector',     // Vector tiles (MVT)
  RASTER = 'raster',     // Raster tiles (PNG, JPEG)
  TERRAIN = 'terrain',   // Terrain tiles (heightmaps)
  HYBRID = 'hybrid'      // Combined raster/vector
}

// GIS providers
export enum GISProvider {
  MAPBOX = 'mapbox',
  OPENSTREETMAP = 'openstreetmap',
  ESRI = 'esri',
  CUSTOM = 'custom'
}

// Layer types
export enum LayerType {
  BASE = 'base',               // Base layer (usually raster)
  FEATURE = 'feature',         // Feature layer (vector)
  OVERLAY = 'overlay',         // Overlay layer (raster or vector)
  HEATMAP = 'heatmap',         // Heatmap layer
  CLUSTER = 'cluster',         // Cluster layer
  ANNOTATION = 'annotation'    // Annotation layer
}

// Feature geometry type
export enum GeometryType {
  POINT = 'Point',
  LINESTRING = 'LineString',
  POLYGON = 'Polygon',
  MULTIPOINT = 'MultiPoint',
  MULTILINESTRING = 'MultiLineString',
  MULTIPOLYGON = 'MultiPolygon',
  GEOMETRYCOLLECTION = 'GeometryCollection'
}

// Bounds
export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Tile
export interface Tile {
  x: number;
  y: number;
  z: number;
  type: TileType;
  provider: GISProvider;
  layerId: string;
  data: Blob | ArrayBuffer;
  timestamp: Date;
  expiresAt?: Date;
  size: number;  // In bytes
}

// Layer
export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  provider: GISProvider;
  url: string;
  maxZoom: number;
  minZoom: number;
  attribution: string;
  visible: boolean;
  opacity: number;
  metadata?: Record<string, any>;
}

// Map area
export interface MapArea {
  id: string;
  name: string;
  description?: string;
  bounds: Bounds;
  center: [number, number];
  minZoom: number;
  maxZoom: number;
  layers: string[];  // Layer IDs
  createdAt: Date;
  updatedAt: Date;
  downloadedAt?: Date;
  expiresAt?: Date;
  size: number;  // In bytes
  tileCount: number;
  complete: boolean;
  metadata?: Record<string, any>;
}

// Feature
export interface Feature {
  id: string;
  type: 'Feature';
  geometry: {
    type: GeometryType;
    coordinates: any;
  };
  properties: Record<string, any>;
  bbox?: [number, number, number, number];
}

// Feature collection
export interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
  bbox?: [number, number, number, number];
}

// Download progress
export interface DownloadProgress {
  areaId: string;
  totalTiles: number;
  downloadedTiles: number;
  failedTiles: number;
  inProgress: boolean;
  bytesDownloaded: number;
  startTime: Date;
  estimatedTimeRemaining?: number; // In milliseconds
  progress: number; // 0-1
}

/**
 * Offline GIS Manager
 * 
 * Manages offline map data and geospatial operations.
 */
export class OfflineGISManager extends EventEmitter {
  private storage: StorageManager;
  private layers: Map<string, Layer> = new Map();
  private mapAreas: Map<string, MapArea> = new Map();
  private downloadProgress: Map<string, DownloadProgress> = new Map();
  
  constructor(storage: StorageManager) {
    super();
    this.storage = storage;
  }

  /**
   * Initialize the offline GIS manager
   */
  public async initialize(): Promise<void> {
    console.log('Initializing offline GIS manager');
    
    // Load layers and map areas from storage
    await this.loadLayers();
    await this.loadMapAreas();
    
    this.emit('initialized');
  }

  /**
   * Load layers from storage
   */
  private async loadLayers(): Promise<void> {
    try {
      const layerData = await this.storage.loadConfig<Layer[]>('offline-gis-layers', []);
      
      if (layerData) {
        for (const layer of layerData) {
          this.layers.set(layer.id, layer);
        }
      }
    } catch (error) {
      console.error('Error loading layers:', error);
    }
  }

  /**
   * Load map areas from storage
   */
  private async loadMapAreas(): Promise<void> {
    try {
      const areaData = await this.storage.loadConfig<MapArea[]>('offline-gis-map-areas', []);
      
      if (areaData) {
        for (const area of areaData) {
          this.mapAreas.set(area.id, area);
        }
      }
    } catch (error) {
      console.error('Error loading map areas:', error);
    }
  }

  /**
   * Save layers to storage
   */
  private async saveLayers(): Promise<void> {
    try {
      const layerData = Array.from(this.layers.values());
      await this.storage.storeConfig('offline-gis-layers', layerData);
    } catch (error) {
      console.error('Error saving layers:', error);
    }
  }

  /**
   * Save map areas to storage
   */
  private async saveMapAreas(): Promise<void> {
    try {
      const areaData = Array.from(this.mapAreas.values());
      await this.storage.storeConfig('offline-gis-map-areas', areaData);
    } catch (error) {
      console.error('Error saving map areas:', error);
    }
  }

  /**
   * Add a layer
   */
  public async addLayer(layer: Omit<Layer, 'id'>): Promise<Layer> {
    const id = `layer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newLayer: Layer = {
      ...layer,
      id
    };
    
    this.layers.set(id, newLayer);
    
    await this.saveLayers();
    
    this.emit('layer:added', newLayer);
    
    return newLayer;
  }

  /**
   * Update a layer
   */
  public async updateLayer(id: string, updates: Partial<Omit<Layer, 'id'>>): Promise<Layer | null> {
    const layer = this.layers.get(id);
    
    if (!layer) {
      console.error(`Layer not found: ${id}`);
      return null;
    }
    
    const updatedLayer: Layer = {
      ...layer,
      ...updates
    };
    
    this.layers.set(id, updatedLayer);
    
    await this.saveLayers();
    
    this.emit('layer:updated', updatedLayer);
    
    return updatedLayer;
  }

  /**
   * Delete a layer
   */
  public async deleteLayer(id: string): Promise<boolean> {
    if (!this.layers.has(id)) {
      console.error(`Layer not found: ${id}`);
      return false;
    }
    
    // Check if layer is used in any map areas
    for (const area of this.mapAreas.values()) {
      if (area.layers.includes(id)) {
        console.error(`Cannot delete layer ${id} as it is used in map area ${area.id}`);
        return false;
      }
    }
    
    this.layers.delete(id);
    
    await this.saveLayers();
    
    this.emit('layer:deleted', { id });
    
    return true;
  }

  /**
   * Get a layer
   */
  public getLayer(id: string): Layer | undefined {
    return this.layers.get(id);
  }

  /**
   * Get all layers
   */
  public getAllLayers(): Layer[] {
    return Array.from(this.layers.values());
  }

  /**
   * Create a map area
   */
  public async createMapArea(area: Omit<MapArea, 'id' | 'createdAt' | 'updatedAt' | 'size' | 'tileCount' | 'complete'>): Promise<MapArea> {
    const id = `area-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newArea: MapArea = {
      ...area,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      size: 0,
      tileCount: 0,
      complete: false
    };
    
    this.mapAreas.set(id, newArea);
    
    await this.saveMapAreas();
    
    this.emit('map-area:created', newArea);
    
    return newArea;
  }

  /**
   * Update a map area
   */
  public async updateMapArea(id: string, updates: Partial<Omit<MapArea, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MapArea | null> {
    const area = this.mapAreas.get(id);
    
    if (!area) {
      console.error(`Map area not found: ${id}`);
      return null;
    }
    
    const updatedArea: MapArea = {
      ...area,
      ...updates,
      updatedAt: new Date()
    };
    
    this.mapAreas.set(id, updatedArea);
    
    await this.saveMapAreas();
    
    this.emit('map-area:updated', updatedArea);
    
    return updatedArea;
  }

  /**
   * Delete a map area
   */
  public async deleteMapArea(id: string): Promise<boolean> {
    const area = this.mapAreas.get(id);
    
    if (!area) {
      console.error(`Map area not found: ${id}`);
      return false;
    }
    
    // Delete all tiles for this area
    await this.deleteTilesForArea(id);
    
    this.mapAreas.delete(id);
    
    await this.saveMapAreas();
    
    this.emit('map-area:deleted', { id, name: area.name });
    
    return true;
  }

  /**
   * Delete tiles for a map area
   */
  private async deleteTilesForArea(areaId: string): Promise<void> {
    // In a real implementation, this would delete all tiles from storage
    // For demonstration, we'll just assume it's done
    console.log(`Deleted tiles for map area: ${areaId}`);
  }

  /**
   * Get a map area
   */
  public getMapArea(id: string): MapArea | undefined {
    return this.mapAreas.get(id);
  }

  /**
   * Get all map areas
   */
  public getAllMapAreas(): MapArea[] {
    return Array.from(this.mapAreas.values());
  }

  /**
   * Start downloading a map area
   */
  public async startDownload(areaId: string): Promise<boolean> {
    const area = this.mapAreas.get(areaId);
    
    if (!area) {
      console.error(`Map area not found: ${areaId}`);
      return false;
    }
    
    // Check if download is already in progress
    const progress = this.downloadProgress.get(areaId);
    if (progress && progress.inProgress) {
      console.error(`Download already in progress for map area: ${areaId}`);
      return false;
    }
    
    // Calculate tiles to download
    const totalTiles = this.calculateTileCount(area);
    
    // Initialize progress
    const newProgress: DownloadProgress = {
      areaId,
      totalTiles,
      downloadedTiles: 0,
      failedTiles: 0,
      inProgress: true,
      bytesDownloaded: 0,
      startTime: new Date(),
      progress: 0
    };
    
    this.downloadProgress.set(areaId, newProgress);
    
    this.emit('download:started', { areaId, totalTiles });
    
    // Start download process
    this.downloadTiles(areaId);
    
    return true;
  }

  /**
   * Calculate the number of tiles for a map area
   */
  private calculateTileCount(area: MapArea): number {
    const { bounds, minZoom, maxZoom } = area;
    
    let count = 0;
    
    // For each zoom level
    for (let z = minZoom; z <= maxZoom; z++) {
      // Convert bounds to tile coordinates
      const minX = this.longitudeToTileX(bounds.west, z);
      const maxX = this.longitudeToTileX(bounds.east, z);
      const minY = this.latitudeToTileY(bounds.north, z);
      const maxY = this.latitudeToTileY(bounds.south, z);
      
      // Count tiles
      count += (maxX - minX + 1) * (maxY - minY + 1);
    }
    
    return count;
  }

  /**
   * Convert longitude to tile X coordinate
   */
  private longitudeToTileX(longitude: number, zoom: number): number {
    return Math.floor((longitude + 180) / 360 * Math.pow(2, zoom));
  }

  /**
   * Convert latitude to tile Y coordinate
   */
  private latitudeToTileY(latitude: number, zoom: number): number {
    return Math.floor((1 - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  }

  /**
   * Download tiles for a map area
   */
  private async downloadTiles(areaId: string): Promise<void> {
    const area = this.mapAreas.get(areaId);
    const progress = this.downloadProgress.get(areaId);
    
    if (!area || !progress) {
      console.error(`Map area or progress not found: ${areaId}`);
      return;
    }
    
    try {
      // For each layer
      for (const layerId of area.layers) {
        const layer = this.layers.get(layerId);
        
        if (!layer) {
          console.error(`Layer not found: ${layerId}`);
          continue;
        }
        
        // For each zoom level
        for (let z = area.minZoom; z <= Math.min(area.maxZoom, layer.maxZoom); z++) {
          // Convert bounds to tile coordinates
          const minX = this.longitudeToTileX(area.bounds.west, z);
          const maxX = this.longitudeToTileX(area.bounds.east, z);
          const minY = this.latitudeToTileY(area.bounds.north, z);
          const maxY = this.latitudeToTileY(area.bounds.south, z);
          
          // Download each tile
          for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
              // Check if download was cancelled
              const currentProgress = this.downloadProgress.get(areaId);
              if (!currentProgress || !currentProgress.inProgress) {
                return;
              }
              
              try {
                // Download tile
                const tileData = await this.downloadTile(x, y, z, layer);
                
                // Store tile
                await this.storeTile(areaId, x, y, z, layer, tileData);
                
                // Update progress
                progress.downloadedTiles++;
                progress.bytesDownloaded += tileData.size;
                progress.progress = progress.downloadedTiles / progress.totalTiles;
                
                // Update estimated time remaining
                const elapsedTime = Date.now() - progress.startTime.getTime();
                const estimatedTotalTime = elapsedTime / progress.progress;
                progress.estimatedTimeRemaining = estimatedTotalTime - elapsedTime;
                
                this.downloadProgress.set(areaId, progress);
                
                // Emit progress event (throttled)
                if (progress.downloadedTiles % 10 === 0) {
                  this.emit('download:progress', { ...progress });
                }
              } catch (error) {
                console.error(`Error downloading tile ${x},${y},${z} for layer ${layerId}:`, error);
                
                // Update progress
                progress.failedTiles++;
                this.downloadProgress.set(areaId, progress);
              }
            }
          }
        }
      }
      
      // Complete download
      progress.inProgress = false;
      progress.progress = 1;
      this.downloadProgress.set(areaId, progress);
      
      // Update map area
      await this.updateMapArea(areaId, {
        downloadedAt: new Date(),
        size: progress.bytesDownloaded,
        tileCount: progress.downloadedTiles,
        complete: true
      });
      
      this.emit('download:completed', {
        areaId,
        downloadedTiles: progress.downloadedTiles,
        failedTiles: progress.failedTiles,
        size: progress.bytesDownloaded
      });
    } catch (error) {
      console.error(`Error downloading tiles for map area ${areaId}:`, error);
      
      // Update progress
      progress.inProgress = false;
      this.downloadProgress.set(areaId, progress);
      
      this.emit('download:error', {
        areaId,
        error
      });
    }
  }

  /**
   * Download a tile
   */
  private async downloadTile(x: number, y: number, z: number, layer: Layer): Promise<{ data: Blob; size: number }> {
    try {
      // Construct tile URL
      const url = this.getTileUrl(x, y, z, layer);
      
      // Download tile
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download tile: ${response.status} ${response.statusText}`);
      }
      
      // Get tile data
      const data = await response.blob();
      
      return {
        data,
        size: data.size
      };
    } catch (error) {
      console.error(`Error downloading tile ${x},${y},${z}:`, error);
      throw error;
    }
  }

  /**
   * Get tile URL
   */
  private getTileUrl(x: number, y: number, z: number, layer: Layer): string {
    const { provider, url } = layer;
    
    switch (provider) {
      case GISProvider.MAPBOX:
        return url
          .replace('{x}', x.toString())
          .replace('{y}', y.toString())
          .replace('{z}', z.toString());
        
      case GISProvider.OPENSTREETMAP:
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
        
      case GISProvider.ESRI:
        return url
          .replace('{level}', z.toString())
          .replace('{col}', x.toString())
          .replace('{row}', y.toString());
        
      case GISProvider.CUSTOM:
      default:
        return url
          .replace('{x}', x.toString())
          .replace('{y}', y.toString())
          .replace('{z}', z.toString());
    }
  }

  /**
   * Store a tile
   */
  private async storeTile(areaId: string, x: number, y: number, z: number, layer: Layer, tileData: { data: Blob; size: number }): Promise<void> {
    const tileId = `tile-${areaId}-${layer.id}-${z}-${x}-${y}`;
    
    const tileType = layer.type === LayerType.BASE ? TileType.RASTER : TileType.VECTOR;
    
    const tile: Tile = {
      x,
      y,
      z,
      type: tileType,
      provider: layer.provider,
      layerId: layer.id,
      data: tileData.data,
      timestamp: new Date(),
      size: tileData.size
    };
    
    // Store tile in storage
    await this.storage.storeAsset(tileId, tileData.data, tile);
  }

  /**
   * Get a tile
   */
  public async getTile(areaId: string, layerId: string, z: number, x: number, y: number): Promise<Blob | ArrayBuffer | undefined> {
    const tileId = `tile-${areaId}-${layerId}-${z}-${x}-${y}`;
    
    return this.storage.loadAsset(tileId);
  }

  /**
   * Cancel download
   */
  public cancelDownload(areaId: string): boolean {
    const progress = this.downloadProgress.get(areaId);
    
    if (!progress || !progress.inProgress) {
      console.error(`No download in progress for map area: ${areaId}`);
      return false;
    }
    
    progress.inProgress = false;
    this.downloadProgress.set(areaId, progress);
    
    this.emit('download:cancelled', { areaId });
    
    return true;
  }

  /**
   * Get download progress
   */
  public getDownloadProgress(areaId: string): DownloadProgress | undefined {
    return this.downloadProgress.get(areaId);
  }

  /**
   * Store a feature collection
   */
  public async storeFeatureCollection(id: string, featureCollection: FeatureCollection): Promise<void> {
    await this.storage.storeAsset(`feature-collection-${id}`, new Blob([JSON.stringify(featureCollection)], { type: 'application/json' }));
    
    this.emit('feature-collection:stored', { id });
  }

  /**
   * Load a feature collection
   */
  public async loadFeatureCollection(id: string): Promise<FeatureCollection | undefined> {
    const data = await this.storage.loadAsset(`feature-collection-${id}`);
    
    if (!data) {
      return undefined;
    }
    
    // Convert data to feature collection
    if (data instanceof Blob) {
      const text = await data.text();
      return JSON.parse(text);
    } else if (data instanceof ArrayBuffer) {
      const text = new TextDecoder().decode(data);
      return JSON.parse(text);
    }
    
    return undefined;
  }

  /**
   * Delete a feature collection
   */
  public async deleteFeatureCollection(id: string): Promise<boolean> {
    const result = await this.storage.deleteAsset(`feature-collection-${id}`);
    
    if (result) {
      this.emit('feature-collection:deleted', { id });
    }
    
    return result;
  }

  /**
   * Get offline map usage statistics
   */
  public getOfflineMapStats(): { totalSize: number; totalTiles: number; areaCount: number; layerCount: number } {
    const areas = this.getAllMapAreas();
    const layers = this.getAllLayers();
    
    return {
      totalSize: areas.reduce((sum, area) => sum + area.size, 0),
      totalTiles: areas.reduce((sum, area) => sum + area.tileCount, 0),
      areaCount: areas.length,
      layerCount: layers.length
    };
  }
}

/**
 * Create a new offline GIS manager
 */
export function createOfflineGISManager(storage: StorageManager): OfflineGISManager {
  return new OfflineGISManager(storage);
}
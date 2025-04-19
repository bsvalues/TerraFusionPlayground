/**
 * Map Provider Service
 * 
 * This service provides an abstraction layer for different map providers:
 * - OpenLayers (default)
 * - QGIS (through OpenLayers)
 * - Mapbox (optional)
 * 
 * It handles token management, provider-specific operations, and
 * provides a consistent interface for working with different map providers.
 */

import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import { Options as TileLayerOptions } from 'ol/layer/BaseTile';
import { Options as XYZOptions } from 'ol/source/XYZ';

// Available map providers
export type MapProvider = 'openlayers' | 'qgis' | 'mapbox';

// Base map types
export type BaseMapType = 'osm' | 'satellite' | 'terrain' | 'topo';

// Interface for layer options
export interface MapLayerOptions {
  url?: string;
  maxZoom?: number;
  attributions?: string;
  [key: string]: any;
}

/**
 * Map Provider Service for handling different map providers
 */
export class MapProviderService {
  private provider: MapProvider;
  private tokens: Record<string, string | null> = {
    mapbox: null
  };
  
  /**
   * Create a new MapProviderService
   * 
   * @param provider The map provider to use
   * @param tokens Optional API tokens for map providers
   */
  constructor(provider: MapProvider = 'openlayers', tokens?: Record<string, string>) {
    this.provider = provider;
    
    // Initialize tokens
    if (tokens) {
      this.tokens = { ...this.tokens, ...tokens };
    } else {
      // Try to get tokens from environment variables
      this.tokens.mapbox = import.meta.env.MAPBOX_TOKEN || null;
    }
  }
  
  /**
   * Get the current map provider
   */
  public getProvider(): MapProvider {
    return this.provider;
  }
  
  /**
   * Set the map provider
   * 
   * @param provider The map provider to use
   */
  public setProvider(provider: MapProvider): void {
    this.provider = provider;
  }
  
  /**
   * Get a token for a specific provider
   * 
   * @param provider The provider to get the token for
   */
  public getToken(provider: string): string | null {
    return this.tokens[provider] || null;
  }
  
  /**
   * Set a token for a specific provider
   * 
   * @param provider The provider to set the token for
   * @param token The token to set
   */
  public setToken(provider: string, token: string): void {
    this.tokens[provider] = token;
  }
  
  /**
   * Get a base map layer for the specified type
   * 
   * @param type The type of base map to get
   * @param options Additional options for the layer
   */
  public getBaseMapLayer(type: BaseMapType, options: MapLayerOptions = {}): TileLayer<any> {
    switch (type) {
      case 'osm':
        return this.getOSMLayer(options);
        
      case 'satellite':
        return this.getSatelliteLayer(options);
        
      case 'terrain':
        return this.getTerrainLayer(options);
        
      case 'topo':
        return this.getTopoLayer(options);
        
      default:
        return this.getOSMLayer(options);
    }
  }
  
  /**
   * Get an OpenStreetMap layer
   * 
   * @param options Additional options for the layer
   */
  private getOSMLayer(options: MapLayerOptions = {}): TileLayer<OSM> {
    return new TileLayer({
      source: new OSM({
        attributions: options.attributions || 'OpenStreetMap contributors',
        maxZoom: options.maxZoom || 19,
        ...options
      }),
      ...options
    });
  }
  
  /**
   * Get a satellite imagery layer
   * 
   * @param options Additional options for the layer
   */
  private getSatelliteLayer(options: MapLayerOptions = {}): TileLayer<XYZ> {
    // Check for Mapbox token
    const mapboxToken = this.tokens.mapbox;
    
    if (mapboxToken) {
      // Use Mapbox satellite imagery if token is available
      return new TileLayer({
        source: new XYZ({
          url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
          maxZoom: options.maxZoom || 19,
          attributions: options.attributions || '© Mapbox, © OpenStreetMap',
          ...options
        }),
        ...options
      });
    }
    
    // Fallback to USGS satellite imagery if no Mapbox token
    return new TileLayer({
      source: new XYZ({
        url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
        maxZoom: options.maxZoom || 16,
        attributions: options.attributions || 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>',
        ...options
      }),
      ...options
    });
  }
  
  /**
   * Get a terrain layer
   * 
   * @param options Additional options for the layer
   */
  private getTerrainLayer(options: MapLayerOptions = {}): TileLayer<XYZ> {
    // Check for Mapbox token
    const mapboxToken = this.tokens.mapbox;
    
    if (mapboxToken) {
      // Use Mapbox terrain-rgb if token is available
      return new TileLayer({
        source: new XYZ({
          url: `https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token=${mapboxToken}`,
          maxZoom: options.maxZoom || 15,
          attributions: options.attributions || 'Elevation data © <a href="https://www.mapbox.com/">Mapbox</a>',
          ...options
        }),
        ...options
      });
    }
    
    // Fallback to USGS terrain if no Mapbox token
    return new TileLayer({
      source: new XYZ({
        url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
        maxZoom: options.maxZoom || 16,
        attributions: options.attributions || 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>',
        ...options
      }),
      ...options
    });
  }
  
  /**
   * Get a topographic map layer
   * 
   * @param options Additional options for the layer
   */
  private getTopoLayer(options: MapLayerOptions = {}): TileLayer<XYZ> {
    // Check for Mapbox token
    const mapboxToken = this.tokens.mapbox;
    
    if (mapboxToken) {
      // Use Mapbox outdoors style if token is available
      return new TileLayer({
        source: new XYZ({
          url: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
          maxZoom: options.maxZoom || 19,
          attributions: options.attributions || '© Mapbox, © OpenStreetMap',
          ...options
        }),
        ...options
      });
    }
    
    // Fallback to USGS topo if no Mapbox token
    return new TileLayer({
      source: new XYZ({
        url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
        maxZoom: options.maxZoom || 16,
        attributions: options.attributions || 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>',
        ...options
      }),
      ...options
    });
  }
  
  /**
   * Create a custom XYZ tile layer
   * 
   * @param url The URL template for the tile layer
   * @param options Additional options for the layer
   */
  public createXYZLayer(url: string, options: MapLayerOptions = {}): TileLayer<XYZ> {
    return new TileLayer({
      source: new XYZ({
        url,
        maxZoom: options.maxZoom || 19,
        attributions: options.attributions,
        ...options
      }),
      ...options
    });
  }
  
  /**
   * Create a QGIS WMS layer
   * 
   * @param url The URL of the QGIS Server WMS
   * @param layers The layers to include
   * @param options Additional options for the layer
   */
  public createQGISLayer(url: string, layers: string[], options: MapLayerOptions = {}): TileLayer<XYZ> {
    // Build WMS URL
    const wmsUrl = `${url}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=${layers.join(',')}&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&STYLES=&BBOX={bbox-epsg-3857}`;
    
    return this.createXYZLayer(wmsUrl, options);
  }
}
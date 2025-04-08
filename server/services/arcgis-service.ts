/**
 * ArcGIS REST Service Connector for Benton County
 * 
 * This service connects to the Benton County ArcGIS REST services to fetch
 * authentic GIS data for property assessment and mapping.
 * 
 * Endpoint: https://services7.arcgis.com/NURlY7V8UHl6XumF/ArcGIS/rest/services
 */

import fetch from 'node-fetch';
import { IStorage } from '../storage';

interface ArcGISServiceConfig {
  baseUrl: string;
  apiKey?: string;
  serviceUrl: string;
  featureServer: string;
  layerId: number;
}

interface BentonParcelProperties {
  OBJECTID: number;
  PARCELID: string;
  SITUS: string;
  OWNER: string;
  ZONING: string;
  ACRES: number;
  TAXCODE: string;
  ASSESSEDVALUE: number;
  LANDVALUE: number;
  IMPROVEMENTVALUE: number;
  YEARBUILT?: number;
  LASTUPDATE: string;
  [key: string]: any;
}

interface BentonParcelFeature {
  attributes: BentonParcelProperties;
  geometry: {
    rings: number[][][];
  };
}

export class ArcGISService {
  private storage: IStorage;
  private config: ArcGISServiceConfig;
  
  constructor(storage: IStorage) {
    this.storage = storage;
    
    // Benton County ArcGIS REST service configuration
    this.config = {
      baseUrl: 'https://services7.arcgis.com/NURlY7V8UHl6XumF/ArcGIS',
      serviceUrl: 'rest/services',
      featureServer: 'Parcels_and_Assess/FeatureServer',
      layerId: 0
    };
  }
  
  /**
   * Test the connection to the ArcGIS REST service
   */
  public async testConnection(): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}/${this.config.serviceUrl}/${this.config.featureServer}/${this.config.layerId}?f=json`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        return data && data.name ? true : false;
      }
      
      return false;
    } catch (error) {
      console.error('Error testing ArcGIS connection:', error);
      return false;
    }
  }
  
  /**
   * Get available layers from the Benton County ArcGIS service
   */
  public async getLayers(): Promise<any[]> {
    try {
      const url = `${this.config.baseUrl}/${this.config.serviceUrl}/${this.config.featureServer}?f=json`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        return data.layers || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching ArcGIS layers:', error);
      return [];
    }
  }
  
  /**
   * Get a parcel by its Parcel ID
   */
  public async getParcelByParcelId(parcelId: string): Promise<BentonParcelFeature | null> {
    try {
      const url = `${this.config.baseUrl}/${this.config.serviceUrl}/${this.config.featureServer}/${this.config.layerId}/query`;
      
      const params = new URLSearchParams({
        where: `PARCELID='${parcelId}'`,
        outFields: '*',
        returnGeometry: 'true',
        f: 'json'
      });
      
      const response = await fetch(`${url}?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          return data.features[0];
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching parcel ${parcelId} from ArcGIS:`, error);
      return null;
    }
  }
  
  /**
   * Search for parcels by various criteria
   */
  public async searchParcels(query: {
    parcelId?: string;
    owner?: string;
    address?: string;
    minValue?: number;
    maxValue?: number;
    zoning?: string;
  }): Promise<BentonParcelFeature[]> {
    try {
      const url = `${this.config.baseUrl}/${this.config.serviceUrl}/${this.config.featureServer}/${this.config.layerId}/query`;
      
      // Build WHERE clause based on query parameters
      const whereConditions: string[] = [];
      
      if (query.parcelId) {
        whereConditions.push(`PARCELID='${query.parcelId}'`);
      }
      
      if (query.owner) {
        whereConditions.push(`OWNER LIKE '%${query.owner}%'`);
      }
      
      if (query.address) {
        whereConditions.push(`SITUS LIKE '%${query.address}%'`);
      }
      
      if (query.minValue) {
        whereConditions.push(`ASSESSEDVALUE >= ${query.minValue}`);
      }
      
      if (query.maxValue) {
        whereConditions.push(`ASSESSEDVALUE <= ${query.maxValue}`);
      }
      
      if (query.zoning) {
        whereConditions.push(`ZONING='${query.zoning}'`);
      }
      
      const where = whereConditions.length > 0 
        ? whereConditions.join(' AND ')
        : '1=1'; // Return all parcels if no conditions
      
      const params = new URLSearchParams({
        where,
        outFields: '*',
        returnGeometry: 'true',
        f: 'json'
      });
      
      const response = await fetch(`${url}?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.features || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error searching parcels in ArcGIS:', error);
      return [];
    }
  }
  
  /**
   * Get neighboring parcels for a given parcel
   */
  public async getNeighboringParcels(parcelId: string): Promise<BentonParcelFeature[]> {
    try {
      // First, get the target parcel to extract its geometry
      const targetParcel = await this.getParcelByParcelId(parcelId);
      
      if (!targetParcel) {
        return [];
      }
      
      // Create a buffer around the parcel geometry
      // This is a simplification - in a real implementation, we would use the ArcGIS geometry service
      // to create a buffer, but for now we'll use a simpler approach
      
      const url = `${this.config.baseUrl}/${this.config.serviceUrl}/${this.config.featureServer}/${this.config.layerId}/query`;
      
      // Get the centroid of the parcel (simplified approach)
      let centroidX = 0;
      let centroidY = 0;
      
      if (targetParcel.geometry && targetParcel.geometry.rings && targetParcel.geometry.rings.length > 0) {
        const ring = targetParcel.geometry.rings[0];
        let sumX = 0;
        let sumY = 0;
        
        ring.forEach(point => {
          sumX += point[0];
          sumY += point[1];
        });
        
        centroidX = sumX / ring.length;
        centroidY = sumY / ring.length;
      }
      
      // Search for parcels within a certain distance of the centroid
      const params = new URLSearchParams({
        geometryType: 'esriGeometryPoint',
        geometry: `${centroidX},${centroidY}`,
        distance: '100', // 100 meters buffer
        units: 'esriSRUnit_Meter',
        inSR: '4326',
        outSR: '4326',
        outFields: '*',
        returnGeometry: 'true',
        where: `PARCELID <> '${parcelId}'`, // Exclude the target parcel
        f: 'json'
      });
      
      const response = await fetch(`${url}?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.features || [];
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching neighboring parcels for ${parcelId}:`, error);
      return [];
    }
  }
  
  /**
   * Convert ArcGIS parcel to our internal property format
   */
  public convertToProperty(parcel: BentonParcelFeature): any {
    if (!parcel || !parcel.attributes) {
      return null;
    }
    
    const attr = parcel.attributes;
    
    return {
      propertyId: `BC-${attr.PARCELID.replace(/[^0-9]/g, '')}`,
      address: attr.SITUS || '',
      parcelNumber: attr.PARCELID || '',
      propertyType: this.determinePropertyType(attr.ZONING || ''),
      acres: attr.ACRES || 0,
      value: attr.ASSESSEDVALUE || 0,
      status: 'active',
      extraFields: {
        yearBuilt: attr.YEARBUILT || 0,
        squareFootage: attr.SQFOOT || 0,
        owner: attr.OWNER || '',
        zoning: attr.ZONING || '',
        taxCode: attr.TAXCODE || '',
        lastUpdateDate: attr.LASTUPDATE || '',
        landValue: attr.LANDVALUE || 0,
        improvementValue: attr.IMPROVEMENTVALUE || 0,
        dataSource: 'Benton County ArcGIS REST Service'
      }
    };
  }
  
  /**
   * Determine property type based on zoning code
   */
  private determinePropertyType(zoning: string): string {
    // Simplified mapping of zoning codes to property types
    const zoningMap: { [key: string]: string } = {
      'R-1': 'Residential',
      'R-2': 'Residential',
      'R-3': 'Residential',
      'C-1': 'Commercial',
      'C-2': 'Commercial',
      'I-1': 'Industrial',
      'I-2': 'Industrial',
      'A-1': 'Agricultural'
    };
    
    return zoningMap[zoning] || 'Unknown';
  }
}

// Export singleton instance
export const arcgisService = new ArcGISService(null as any);
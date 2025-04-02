/**
 * PACS Integration Service
 * 
 * This service provides integration with the Property Appraisal and Collection System (PACS)
 * database for Benton County, Washington. It implements the specific database queries and
 * operations needed for accessing property assessment data.
 */

// Database connection would be imported here in a full implementation
// import { pool } from "../db";
import { storage } from "../storage";
import { PacsModule, InsertPacsModule } from "@shared/schema";

// Standard query templates based on the Benton County configuration
const PACSQueries = {
  // Property queries
  PROPERTY_BY_ID: `
    SELECT * FROM properties 
    WHERE propertyId = $1
  `,
  PROPERTIES_BY_VALUE_RANGE: `
    SELECT * FROM properties 
    WHERE value >= $1 AND value <= $2
  `,
  PROPERTIES_BY_TYPE: `
    SELECT * FROM properties 
    WHERE propertyType = $1
  `,
  PROPERTIES_BY_STATUS: `
    SELECT * FROM properties 
    WHERE status = $1
  `,
  
  // Land record queries
  LAND_BY_PROPERTY_ID: `
    SELECT * FROM land_records 
    WHERE propertyId = $1
  `,
  LAND_BY_ZONE: `
    SELECT l.*, p.address, p.parcelNumber 
    FROM land_records l
    JOIN properties p ON l.propertyId = p.propertyId
    WHERE l.zoning = $1
  `,
  LAND_BY_FLOOD_ZONE: `
    SELECT l.*, p.address, p.parcelNumber 
    FROM land_records l
    JOIN properties p ON l.propertyId = p.propertyId
    WHERE l.floodZone = $1
  `,
  
  // Improvement queries
  IMPROVEMENTS_BY_PROPERTY_ID: `
    SELECT * FROM improvements 
    WHERE propertyId = $1
  `,
  IMPROVEMENTS_BY_TYPE: `
    SELECT i.*, p.address, p.parcelNumber 
    FROM improvements i
    JOIN properties p ON i.propertyId = p.propertyId
    WHERE i.improvementType = $1
  `,
  IMPROVEMENTS_BY_YEAR_BUILT_RANGE: `
    SELECT i.*, p.address, p.parcelNumber 
    FROM improvements i
    JOIN properties p ON i.propertyId = p.propertyId
    WHERE i.yearBuilt >= $1 AND i.yearBuilt <= $2
  `,
  
  // Complex queries
  PROPERTY_FULL_DETAILS: `
    SELECT 
      p.*,
      json_agg(DISTINCT l) AS land_records,
      json_agg(DISTINCT i) AS improvements,
      json_agg(DISTINCT f) AS fields
    FROM properties p
    LEFT JOIN land_records l ON p.propertyId = l.propertyId
    LEFT JOIN improvements i ON p.propertyId = i.propertyId
    LEFT JOIN fields f ON p.propertyId = f.propertyId
    WHERE p.propertyId = $1
    GROUP BY p.id, p.propertyId, p.address, p.parcelNumber, p.propertyType, p.acres, p.value, p.status, p.lastUpdated, p.createdAt
  `,
  RECENT_PROPERTY_CHANGES: `
    SELECT * FROM properties
    WHERE lastUpdated >= NOW() - INTERVAL '30 days'
    ORDER BY lastUpdated DESC
  `,
  
  // Protest and appeals tracking
  ACTIVE_PROTESTS: `
    SELECT 
      pr.*,
      p.address,
      p.parcelNumber,
      p.propertyType,
      u.name as protestor_name
    FROM protests pr
    JOIN properties p ON pr.propertyId = p.propertyId
    JOIN users u ON pr.userId = u.id
    WHERE pr.status = 'pending' OR pr.status = 'under_review'
  `
};

/**
 * Main class for PACS integration
 */
export class PacsIntegration {
  
  /**
   * Initialize PACS modules based on the Benton County configuration
   */
  async initializeModules(): Promise<PacsModule[]> {
    const pacsModules: InsertPacsModule[] = [
      { moduleName: "Land", source: "PACS WA", integration: "active", description: "Land record management for Benton County" },
      { moduleName: "Improvements", source: "PACS WA", integration: "active", description: "Benton County property improvements tracking" },
      { moduleName: "Fields", source: "PACS WA", integration: "active", description: "Custom field definitions for Benton County properties" },
      { moduleName: "Destroyed Property", source: "PACS WA", integration: "active", description: "Tracking of destroyed properties in Benton County" },
      { moduleName: "Imports", source: "PACS WA", integration: "active", description: "Data import functionality for Benton County" },
      { moduleName: "GIS", source: "PACS WA", integration: "active", description: "Geographic Information System integration" },
      { moduleName: "Valuation Methods", source: "PACS WA", integration: "active", description: "Property valuation methodologies" },
      { moduleName: "Comparable Sales", source: "PACS WA", integration: "active", description: "Comparable property sales data" },
      { moduleName: "Land Schedules", source: "PACS WA", integration: "active", description: "Schedules for land valuation" },
      { moduleName: "Improvement Schedules", source: "PACS WA", integration: "active", description: "Schedules for improvement valuation" },
      { moduleName: "Income", source: "PACS WA", integration: "pending", description: "Income approach for commercial property assessment" },
      { moduleName: "Building Permits", source: "PACS WA", integration: "active", description: "Building permit tracking and integration" },
      { moduleName: "Protest Processing", source: "PACS WA", integration: "active", description: "Processing property assessment protests" },
      { moduleName: "Inquiry Processing", source: "PACS WA", integration: "active", description: "Processing taxpayer inquiries" },
      { moduleName: "Tax Statements", source: "PACS WA", integration: "active", description: "Generation of tax statements" },
      { moduleName: "DOR Reports", source: "PACS WA", integration: "active", description: "Washington Department of Revenue reports" },
      { moduleName: "Levy Certification", source: "PACS WA", integration: "active", description: "Certification of tax levies" },
      { moduleName: "Current Use Properties", source: "PACS WA", integration: "active", description: "Management of current use properties" },
      { moduleName: "Data Entry", source: "PACS WA", integration: "active", description: "Data entry interface and validation" },
      { moduleName: "Panel Information", source: "PACS WA", integration: "active", description: "Property panel information management" }
    ];
    
    const result: PacsModule[] = [];
    
    for (const module of pacsModules) {
      const savedModule = await storage.upsertPacsModule(module);
      result.push(savedModule);
    }
    
    return result;
  }
  
  /**
   * Get a property by its ID with full details
   */
  async getPropertyFullDetails(propertyId: string) {
    try {
      // For now, use the in-memory storage
      const property = await storage.getPropertyByPropertyId(propertyId);
      
      if (!property) {
        return null;
      }
      
      // Get related data
      const landRecords = await storage.getLandRecordsByPropertyId(propertyId);
      const improvements = await storage.getImprovementsByPropertyId(propertyId);
      const fields = await storage.getFieldsByPropertyId(propertyId);
      
      // Combine into a single response
      return {
        ...property,
        land_records: landRecords,
        improvements: improvements,
        fields: fields
      };
    } catch (error) {
      console.error('Error fetching property full details:', error);
      throw new Error('Failed to fetch property full details');
    }
  }
  
  /**
   * Get properties by value range
   */
  async getPropertiesByValueRange(minValue: number, maxValue: number) {
    try {
      // For now, use the in-memory storage
      const allProperties = await storage.getAllProperties();
      
      // Filter by value range
      return allProperties.filter(property => {
        if (property.value === null) return false;
        return Number(property.value) >= minValue && Number(property.value) <= maxValue;
      });
    } catch (error) {
      console.error('Error fetching properties by value range:', error);
      throw new Error('Failed to fetch properties by value range');
    }
  }
  
  /**
   * Get properties by type
   */
  async getPropertiesByType(propertyType: string) {
    try {
      // For now, use the in-memory storage
      const allProperties = await storage.getAllProperties();
      
      // Filter by property type
      return allProperties.filter(property => 
        property.propertyType.toLowerCase() === propertyType.toLowerCase()
      );
    } catch (error) {
      console.error('Error fetching properties by type:', error);
      throw new Error('Failed to fetch properties by type');
    }
  }
  
  /**
   * Get properties by status
   */
  async getPropertiesByStatus(status: string) {
    try {
      // For now, use the in-memory storage
      const allProperties = await storage.getAllProperties();
      
      // Filter by status
      return allProperties.filter(property => 
        property.status.toLowerCase() === status.toLowerCase()
      );
    } catch (error) {
      console.error('Error fetching properties by status:', error);
      throw new Error('Failed to fetch properties by status');
    }
  }
  
  /**
   * Get land records by zoning
   */
  async getLandRecordsByZone(zoning: string) {
    try {
      // For now, use the in-memory storage
      const allProperties = await storage.getAllProperties();
      const result = [];
      
      for (const property of allProperties) {
        const landRecords = await storage.getLandRecordsByPropertyId(property.propertyId);
        
        // Filter by zoning
        const filteredLandRecords = landRecords.filter(record => 
          record.zoning.toLowerCase() === zoning.toLowerCase()
        );
        
        // Add property information to each matching land record
        for (const record of filteredLandRecords) {
          result.push({
            ...record,
            property: {
              propertyId: property.propertyId,
              address: property.address,
              parcelNumber: property.parcelNumber
            }
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching land records by zone:', error);
      throw new Error('Failed to fetch land records by zone');
    }
  }
  
  /**
   * Get improvements by type
   */
  async getImprovementsByType(improvementType: string) {
    try {
      // For now, use the in-memory storage
      const allProperties = await storage.getAllProperties();
      const result = [];
      
      for (const property of allProperties) {
        const improvements = await storage.getImprovementsByPropertyId(property.propertyId);
        
        // Filter by improvement type
        const filteredImprovements = improvements.filter(improvement => 
          improvement.improvementType.toLowerCase() === improvementType.toLowerCase()
        );
        
        // Add property information to each matching improvement
        for (const improvement of filteredImprovements) {
          result.push({
            ...improvement,
            property: {
              propertyId: property.propertyId,
              address: property.address,
              parcelNumber: property.parcelNumber
            }
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching improvements by type:', error);
      throw new Error('Failed to fetch improvements by type');
    }
  }
  
  /**
   * Get improvements by year built range
   */
  async getImprovementsByYearBuiltRange(minYear: number, maxYear: number) {
    try {
      // For now, use the in-memory storage
      const allProperties = await storage.getAllProperties();
      const result = [];
      
      for (const property of allProperties) {
        const improvements = await storage.getImprovementsByPropertyId(property.propertyId);
        
        // Filter by year built range
        const filteredImprovements = improvements.filter(improvement => 
          improvement.yearBuilt !== null && 
          improvement.yearBuilt >= minYear && 
          improvement.yearBuilt <= maxYear
        );
        
        // Add property information to each matching improvement
        for (const improvement of filteredImprovements) {
          result.push({
            ...improvement,
            property: {
              propertyId: property.propertyId,
              address: property.address,
              parcelNumber: property.parcelNumber
            }
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching improvements by year built range:', error);
      throw new Error('Failed to fetch improvements by year built range');
    }
  }
  
  /**
   * Get active protests with property information
   */
  async getActiveProtests() {
    try {
      // For now, use the in-memory storage
      const allProperties = await storage.getAllProperties();
      const result = [];
      
      for (const property of allProperties) {
        const protests = await storage.getProtestsByPropertyId(property.propertyId);
        
        // Filter by active status
        const activeProtests = protests.filter(protest => 
          protest.status === 'pending' || protest.status === 'under_review'
        );
        
        // Add property information to each active protest
        for (const protest of activeProtests) {
          const user = await storage.getUser(protest.userId);
          
          result.push({
            ...protest,
            property: {
              propertyId: property.propertyId,
              address: property.address,
              parcelNumber: property.parcelNumber,
              propertyType: property.propertyType
            },
            protestor_name: user ? user.name : 'Unknown'
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching active protests:', error);
      throw new Error('Failed to fetch active protests');
    }
  }
  
  /**
   * Get recent property changes (within last 30 days)
   */
  async getRecentPropertyChanges() {
    try {
      // For now, use the in-memory storage
      const allProperties = await storage.getAllProperties();
      
      // Filter by last updated date (within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentlyUpdated = allProperties.filter(property => {
        const lastUpdatedDate = new Date(property.lastUpdated);
        return lastUpdatedDate >= thirtyDaysAgo;
      });
      
      // Sort by most recently updated
      return recentlyUpdated.sort((a, b) => {
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      });
    } catch (error) {
      console.error('Error fetching recent property changes:', error);
      throw new Error('Failed to fetch recent property changes');
    }
  }
}

export const pacsIntegration = new PacsIntegration();
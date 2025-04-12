import { format } from 'date-fns';
import { apiRequest } from './queryClient';

// Possible data sources that can create changes
export type LineageSource = 'validated' | 'import' | 'manual' | 'api' | 'calculated' | 'correction';

// A single data lineage record tracking a change to a property field
export interface DataLineageRecord {
  id: number;
  propertyId: string;
  fieldName: string;
  source: LineageSource;
  userId: number;
  oldValue: string;
  newValue: string;
  changeTimestamp: Date;
  createdAt: Date;
  sourceDetails: any;
}

// Property lineage response groups records by field
export interface PropertyLineageResponse {
  propertyId: string;
  lineage: { [fieldName: string]: DataLineageRecord[] };
}

// Lineage list response for filtered queries
export interface LineageListResponse {
  lineage: DataLineageRecord[];
}

/**
 * Get lineage data for a specific property
 */
export async function getPropertyLineage(propertyId: string): Promise<PropertyLineageResponse> {
  const response = await apiRequest(`/api/data-lineage/property/${propertyId}`, {
    method: 'GET',
  });
  
  // Parse dates in the response
  if (response.lineage) {
    Object.keys(response.lineage).forEach(field => {
      response.lineage[field] = response.lineage[field].map(parseLineageRecord);
    });
  }
  
  return response;
}

/**
 * Get lineage data by date range
 */
export async function getDateRangeLineage(startDate: string, endDate: string): Promise<LineageListResponse> {
  const response = await apiRequest(`/api/data-lineage/date-range?startDate=${startDate}&endDate=${endDate}`, {
    method: 'GET',
  });
  
  // Parse dates in the response
  if (response.lineage) {
    response.lineage = response.lineage.map(parseLineageRecord);
  }
  
  return response;
}

/**
 * Get lineage data by source type
 */
export async function getSourceLineage(source: string): Promise<LineageListResponse> {
  const response = await apiRequest(`/api/data-lineage/source/${source}`, {
    method: 'GET',
  });
  
  // Parse dates in the response
  if (response.lineage) {
    response.lineage = response.lineage.map(parseLineageRecord);
  }
  
  return response;
}

/**
 * Get lineage data by user
 */
export async function getUserLineage(userId: number): Promise<LineageListResponse> {
  const response = await apiRequest(`/api/data-lineage/user/${userId}`, {
    method: 'GET',
  });
  
  // Parse dates in the response
  if (response.lineage) {
    response.lineage = response.lineage.map(parseLineageRecord);
  }
  
  return response;
}

/**
 * Helper function to parse string dates into Date objects
 */
function parseLineageRecord(record: any): DataLineageRecord {
  return {
    ...record,
    changeTimestamp: new Date(record.changeTimestamp),
    createdAt: new Date(record.createdAt)
  };
}

/**
 * Format lineage timestamp for display
 */
export function formatLineageTimestamp(timestamp: Date): string {
  return format(timestamp, 'MMM d, yyyy h:mm a');
}

/**
 * Get user-friendly label for a source type
 */
export function getSourceLabel(source: string): string {
  switch (source) {
    case 'validated':
      return 'Validated';
    case 'import':
      return 'Data Import';
    case 'manual':
      return 'Manual Entry';
    case 'api':
      return 'API Update';
    case 'calculated':
      return 'Calculated Value';
    case 'correction':
      return 'Data Correction';
    default:
      return source.charAt(0).toUpperCase() + source.slice(1);
  }
}
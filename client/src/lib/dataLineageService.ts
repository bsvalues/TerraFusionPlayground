import { format } from 'date-fns';
import { apiRequest } from './queryClient';

export type LineageSource = 'validated' | 'import' | 'manual' | 'api' | 'calculated' | 'correction';

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

export interface PropertyLineageResponse {
  propertyId: string;
  lineage: { [fieldName: string]: DataLineageRecord[] };
}

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
  
  // Convert string timestamps to Date objects
  if (response.lineage) {
    Object.keys(response.lineage).forEach(fieldName => {
      response.lineage[fieldName] = response.lineage[fieldName].map(record => ({
        ...record,
        changeTimestamp: new Date(record.changeTimestamp),
        createdAt: new Date(record.createdAt)
      }));
    });
  }
  
  return response;
}

/**
 * Get lineage data by date range
 */
export async function getDateRangeLineage(startDate: string, endDate: string): Promise<LineageListResponse> {
  const response = await apiRequest('/api/data-lineage/date-range', {
    method: 'POST',
    body: JSON.stringify({ startDate, endDate }),
  });
  
  // Convert string timestamps to Date objects
  if (response.lineage) {
    response.lineage = response.lineage.map((record: any) => ({
      ...record,
      changeTimestamp: new Date(record.changeTimestamp),
      createdAt: new Date(record.createdAt)
    }));
  }
  
  return response;
}

/**
 * Get lineage data by source type
 */
export async function getSourceLineage(source: string): Promise<LineageListResponse> {
  const response = await apiRequest('/api/data-lineage/source', {
    method: 'POST',
    body: JSON.stringify({ source }),
  });
  
  // Convert string timestamps to Date objects
  if (response.lineage) {
    response.lineage = response.lineage.map((record: any) => ({
      ...record,
      changeTimestamp: new Date(record.changeTimestamp),
      createdAt: new Date(record.createdAt)
    }));
  }
  
  return response;
}

/**
 * Get lineage data by user
 */
export async function getUserLineage(userId: number): Promise<LineageListResponse> {
  const response = await apiRequest('/api/data-lineage/user', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  
  // Convert string timestamps to Date objects
  if (response.lineage) {
    response.lineage = response.lineage.map((record: any) => ({
      ...record,
      changeTimestamp: new Date(record.changeTimestamp),
      createdAt: new Date(record.createdAt)
    }));
  }
  
  return response;
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
      return 'API Change';
    case 'calculated':
      return 'Calculated Value';
    case 'correction':
      return 'Data Correction';
    default:
      return source.charAt(0).toUpperCase() + source.slice(1);
  }
}
import { apiRequest } from './queryClient';

// Types for data lineage
export interface DataLineageRecord {
  id: number;
  propertyId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changeTimestamp: string;
  source: 'validated' | 'import' | 'manual' | 'api' | 'calculated' | 'correction';
  userId: number;
  sourceDetails: any;
  createdAt: string;
}

export interface PropertyLineageResponse {
  propertyId: string;
  lineage: {
    [fieldName: string]: DataLineageRecord[];
  };
  totalRecords: number;
}

export interface FieldLineageResponse {
  propertyId: string;
  fieldName: string;
  lineage: DataLineageRecord[];
  totalRecords: number;
}

export interface SourceLineageResponse {
  source: string;
  lineage: DataLineageRecord[];
  totalRecords: number;
}

export interface DateRangeLineageResponse {
  startDate: string;
  endDate: string;
  lineage: DataLineageRecord[];
  totalRecords: number;
}

export interface UserLineageResponse {
  userId: number;
  lineage: DataLineageRecord[];
  totalRecords: number;
}

/**
 * Gets the lineage history for a specific property
 */
export const getPropertyLineage = async (propertyId: string): Promise<PropertyLineageResponse> => {
  return apiRequest(`/api/data-lineage/property/${propertyId}`);
};

/**
 * Gets the lineage history for a specific field of a property
 */
export const getFieldLineage = async (propertyId: string, fieldName: string): Promise<FieldLineageResponse> => {
  return apiRequest(`/api/data-lineage/property/${propertyId}/field/${fieldName}`);
};

/**
 * Gets the lineage history for a specific source type
 */
export const getSourceLineage = async (source: string): Promise<SourceLineageResponse> => {
  return apiRequest(`/api/data-lineage/source/${source}`);
};

/**
 * Gets the lineage history for a specific date range
 */
export const getDateRangeLineage = async (startDate: string, endDate: string): Promise<DateRangeLineageResponse> => {
  return apiRequest(`/api/data-lineage/date-range?startDate=${startDate}&endDate=${endDate}`);
};

/**
 * Gets the lineage history for a specific user
 */
export const getUserLineage = async (userId: number): Promise<UserLineageResponse> => {
  return apiRequest(`/api/data-lineage/user/${userId}`);
};

/**
 * Get formatted source label for display
 */
export const getSourceLabel = (source: string): string => {
  switch (source) {
    case 'validated':
      return 'System Validation';
    case 'import':
      return 'Data Import';
    case 'manual':
      return 'Manual Update';
    case 'api':
      return 'API Integration';
    case 'calculated':
      return 'Calculated Value';
    case 'correction':
      return 'Data Correction';
    default:
      return source.charAt(0).toUpperCase() + source.slice(1);
  }
};

/**
 * Formats a timestamp for display
 */
export const formatLineageTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};
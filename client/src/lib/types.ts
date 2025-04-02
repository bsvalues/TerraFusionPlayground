// Property Types
export interface Property {
  id: number;
  propertyId: string;
  address: string;
  parcelNumber: string;
  propertyType: string;
  acres: number;
  value: number | null;
  status: string;
  lastUpdated: string;
  createdAt: string;
}

// Land Record Types
export interface LandRecord {
  id: number;
  propertyId: string;
  landUseCode: string;
  zoning: string;
  topography: string | null;
  frontage: number | null;
  depth: number | null;
  shape: string | null;
  utilities: string | null;
  floodZone: string | null;
  createdAt: string;
  lastUpdated: string;
}

// Improvement Types
export interface Improvement {
  id: number;
  propertyId: string;
  improvementType: string;
  yearBuilt: number | null;
  squareFeet: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  quality: string | null;
  condition: string | null;
  createdAt: string;
  lastUpdated: string;
}

// Field Types
export interface Field {
  id: number;
  propertyId: string;
  fieldType: string;
  fieldValue: string | null;
  createdAt: string;
  lastUpdated: string;
}

// Protest Types
export interface Protest {
  id: number;
  propertyId: string;
  userId: number;
  reason: string;
  evidenceUrls: string[];
  status: string;
  createdAt: string;
  lastUpdated: string;
}

// Audit Log Types
export interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: any;
  timestamp: string;
  ipAddress: string | null;
}

// AI Agent Types
export interface AIAgent {
  id: number;
  name: string;
  type: string;
  status: 'active' | 'syncing' | 'error' | 'inactive';
  lastActivity: string;
  performance: number;
  createdAt: string;
}

// System Activity Types
export interface SystemActivity {
  id: number;
  agentId: number | null;
  activity: string;
  entityType: string | null;
  entityId: string | null;
  timestamp: string;
}

// PACS Module Types
export interface PacsModule {
  id: number;
  moduleName: string;
  source: string;
  integration: 'active' | 'pending' | 'failed';
  description: string | null;
  createdAt: string;
}

// Dashboard KPI Types
export interface DashboardKPI {
  propertiesProcessed: number;
  valueIncrease: string;
  protestsSubmitted: number;
  complianceScore: string;
}

// User Types
export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  email: string | null;
}

/**
 * Supabase Schema Constants
 * 
 * This file defines constants for table names and common values 
 * used throughout the application when interacting with Supabase.
 */

export const TABLES = {
  PROPERTIES: 'properties',
  PROPERTY_ANALYSES: 'property_analyses',
  PROPERTY_APPEALS: 'property_appeals',
  PROPERTY_DATA_CHANGES: 'property_data_changes',
  PROPERTY_INSIGHT_SHARES: 'property_insight_shares',
  AGENT_EXPERIENCES: 'agent_experiences',
  USER_PROFILES: 'user_profiles',
  ORGANIZATIONS: 'organizations',
  PROPERTY_MARKET_TRENDS: 'property_market_trends',
  COMPLIANCE_REPORTS: 'compliance_reports'
};

export const PROPERTY_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  EXEMPT: 'exempt',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
};

export const PROPERTY_TYPES = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  INDUSTRIAL: 'industrial',
  AGRICULTURAL: 'agricultural',
  RECREATIONAL: 'recreational',
  MIXED_USE: 'mixed_use',
  VACANT_LAND: 'vacant_land',
  SPECIAL_PURPOSE: 'special_purpose'
};

export const ANALYSIS_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
};

export const ANALYSIS_METHODOLOGY = {
  SALES_COMPARISON: 'sales_comparison',
  COST_APPROACH: 'cost_approach',
  INCOME_APPROACH: 'income_approach',
  MASS_APPRAISAL: 'mass_appraisal',
  AUTOMATED_VALUATION: 'automated_valuation',
  HYBRID: 'hybrid'
};

export const APPEAL_STATUS = {
  FILED: 'filed',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  UNDER_REVIEW: 'under_review',
  DECIDED: 'decided',
  WITHDRAWN: 'withdrawn',
  CLOSED: 'closed'
};

export const APPEAL_TYPES = {
  VALUE: 'value',
  CLASSIFICATION: 'classification',
  EXEMPTION: 'exemption',
  SPECIAL_ASSESSMENT: 'special_assessment',
  CLERICAL_ERROR: 'clerical_error'
};

export const USER_ROLES = {
  ADMIN: 'admin',
  APPRAISER: 'appraiser',
  REVIEWER: 'reviewer',
  PROPERTY_OWNER: 'property_owner',
  TAX_AGENT: 'tax_agent',
  GUEST: 'guest'
};

export const ORGANIZATION_TYPES = {
  COUNTY: 'county',
  MUNICIPALITY: 'municipality',
  STATE_AGENCY: 'state_agency',
  APPRAISAL_FIRM: 'appraisal_firm',
  TAX_FIRM: 'tax_firm',
  PROPERTY_MANAGEMENT: 'property_management'
};

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
  GOVERNMENT: 'government'
};

export const CONFIDENCE_LEVELS = {
  VERY_LOW: 'very_low',
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  VERY_HIGH: 'very_high'
};

export const DATA_CHANGE_SOURCES = {
  USER: 'user',
  SYSTEM: 'system',
  IMPORT: 'import',
  API: 'api',
  FTP: 'ftp',
  AGENT: 'agent'
};

export const COMPLIANCE_REPORT_TYPES = {
  EQUALIZATION: 'equalization',
  REVALUATION_CYCLE: 'revaluation_cycle',
  EXEMPTION_VERIFICATION: 'exemption_verification',
  APPEALS_COMPLIANCE: 'appeals_compliance'
};

export const COMPLIANCE_REPORT_STATUS = {
  DRAFT: 'draft',
  GENERATED: 'generated',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
};
/**
 * Supabase Schema Constants
 * 
 * This file defines constants for Supabase table names, column values, and other schema-related information.
 * Using these constants helps maintain consistency when interacting with the database.
 */

// Table names
export const TABLES = {
  PROPERTIES: 'properties',
  PROPERTY_ANALYSES: 'property_analyses',
  PROPERTY_APPEALS: 'property_appeals',
  PROPERTY_DATA_CHANGES: 'property_data_changes',
  PROPERTY_INSIGHT_SHARES: 'property_insight_shares',
  PROPERTY_MARKET_TRENDS: 'property_market_trends',
  AGENT_EXPERIENCES: 'agent_experiences',
  USER_PROFILES: 'user_profiles',
  ORGANIZATIONS: 'organizations',
  COMPLIANCE_REPORTS: 'compliance_reports'
};

// Property status values
export const PROPERTY_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  ARCHIVED: 'archived',
  UNDER_APPEAL: 'under_appeal',
  UNDER_REVIEW: 'under_review'
};

// Property types
export const PROPERTY_TYPES = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  INDUSTRIAL: 'industrial',
  AGRICULTURAL: 'agricultural',
  VACANT_LAND: 'vacant_land',
  MIXED_USE: 'mixed_use',
  SPECIAL_PURPOSE: 'special_purpose'
};

// Analysis status values
export const ANALYSIS_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
};

// Analysis methodologies
export const ANALYSIS_METHODOLOGY = {
  SALES_COMPARISON: 'sales_comparison',
  COST_APPROACH: 'cost_approach',
  INCOME_APPROACH: 'income_approach',
  MACHINE_LEARNING: 'machine_learning',
  HYBRID: 'hybrid'
};

// Appeal status values
export const APPEAL_STATUS = {
  FILED: 'filed',
  UNDER_REVIEW: 'under_review',
  HEARING_SCHEDULED: 'hearing_scheduled',
  DECISION_PENDING: 'decision_pending',
  APPROVED: 'approved',
  PARTIALLY_APPROVED: 'partially_approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  CLOSED: 'closed'
};

// Appeal types
export const APPEAL_TYPES = {
  VALUE: 'value',
  CLASSIFICATION: 'classification',
  EXEMPTION: 'exemption',
  OWNERSHIP: 'ownership',
  SPECIAL_ASSESSMENT: 'special_assessment'
};

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  ASSESSOR: 'assessor',
  REVIEWER: 'reviewer',
  PROPERTY_OWNER: 'property_owner',
  GUEST: 'guest',
  API: 'api'
};

// Organization types
export const ORGANIZATION_TYPES = {
  GOVERNMENT: 'government',
  ASSESSMENT_OFFICE: 'assessment_office',
  PROPERTY_MANAGEMENT: 'property_management',
  REAL_ESTATE_FIRM: 'real_estate_firm',
  INDIVIDUAL: 'individual',
  OTHER: 'other'
};

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  STANDARD: 'standard',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
};

// Confidence levels for analyses
export const CONFIDENCE_LEVELS = {
  VERY_LOW: 'very_low',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high'
};

// Data change sources
export const DATA_CHANGE_SOURCES = {
  USER_INPUT: 'user_input',
  SYSTEM_UPDATE: 'system_update',
  API_IMPORT: 'api_import',
  FTP_IMPORT: 'ftp_import',
  DATA_CORRECTION: 'data_correction',
  AGENT_PREDICTION: 'agent_prediction'
};

// Compliance report types
export const COMPLIANCE_REPORT_TYPES = {
  EQUALIZATION: 'equalization',
  REVALUATION_CYCLE: 'revaluation_cycle',
  EXEMPTION_VERIFICATION: 'exemption_verification',
  APPEAL_COMPLIANCE: 'appeal_compliance',
  ANNUAL_ASSESSMENT: 'annual_assessment'
};

// Compliance report status values
export const COMPLIANCE_REPORT_STATUS = {
  DRAFT: 'draft',
  GENERATED: 'generated',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REQUIRES_REVISION: 'requires_revision'
};
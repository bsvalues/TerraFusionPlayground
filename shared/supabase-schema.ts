/**
 * Supabase Schema Definitions
 * 
 * This file defines the database schema for our Supabase tables and provides
 * TypeScript interfaces for strongly typed access to the database.
 */

// Property Types
export interface Property {
  id: string;
  property_id: string;
  address: string;
  parcel_number: string;
  property_type: string;
  status: string;
  acres: number;
  value: number | null;
  extra_fields: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyInsert extends Omit<Property, 'id' | 'created_at' | 'updated_at'> {}

// Property Analysis Types
export interface PropertyAnalysis {
  id: string;
  property_id: string;
  analysis_id: string;
  title: string;
  description: string | null;
  methodology: string;
  value_conclusion: number | null;
  confidence_level: string | null;
  comparable_properties: string[] | null;
  adjustment_notes: string | null;
  created_by: string;
  approved_by: string | null;
  review_date: string | null;
  created_at: string;
  updated_at: string;
  status: string;
}

export interface PropertyAnalysisInsert extends Omit<PropertyAnalysis, 'id' | 'created_at' | 'updated_at'> {}

// Property Appeal Types
export interface PropertyAppeal {
  id: string;
  property_id: string;
  user_id: string;
  appeal_number: string;
  appeal_type: string;
  reason: string;
  evidence_urls: string[] | null;
  hearing_date: string | null;
  decision: string | null;
  decision_date: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  notification_sent: boolean | null;
}

export interface PropertyAppealInsert extends Omit<PropertyAppeal, 'id' | 'created_at' | 'updated_at'> {}

// Property Data Changes for Tracking History
export interface PropertyDataChange {
  id: string;
  property_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  change_timestamp: string;
  source: string;
  user_id: string;
  source_details: Record<string, any> | null;
  created_at: string;
}

export interface PropertyDataChangeInsert extends Omit<PropertyDataChange, 'id' | 'created_at'> {}

// Property Insight Shares for Sharing Links
export interface PropertyInsightShare {
  id: string;
  share_id: string;
  property_id: string;
  property_name: string;
  property_address: string;
  analysis_ids: string[] | null;
  created_by: string;
  access_token: string;
  expires_at: string | null;
  created_at: string;
  access_count: number;
  last_accessed_at: string | null;
}

export interface PropertyInsightShareInsert extends Omit<PropertyInsightShare, 'id' | 'created_at'> {}

// Agent Experience Records for AI Learning
export interface AgentExperience {
  id: string;
  agent_id: string;
  agent_name: string;
  experience_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  state: Record<string, any>;
  reward: number;
  priority: number;
  feedback: string | null;
  timestamp: string;
  created_at: string;
  used_for_training: boolean;
}

export interface AgentExperienceInsert extends Omit<AgentExperience, 'id' | 'created_at'> {}

// User Profiles
export interface UserProfile {
  id: string;
  auth_id: string;
  email: string;
  display_name: string;
  role: string;
  organization_id: string | null;
  preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface UserProfileInsert extends Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> {}

// Organization data
export interface Organization {
  id: string;
  name: string;
  type: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  subscription_tier: string;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInsert extends Omit<Organization, 'id' | 'created_at' | 'updated_at'> {}

// Property Market Trends - Time series data for market trends
export interface PropertyMarketTrend {
  id: string;
  property_id: string;
  timestamp: string;
  value: number;
  percent_change: number;
  comparable_sales: string[] | null;
  market_indicators: Record<string, any>;
  prediction_factors: Record<string, any> | null;
  confidence_score: number;
  created_at: string;
}

export interface PropertyMarketTrendInsert extends Omit<PropertyMarketTrend, 'id' | 'created_at'> {}

// Compliance Reports
export interface ComplianceReport {
  id: string;
  report_id: string;
  year: number;
  county_code: string;
  report_type: string;
  generated_at: string;
  submitted_by: string | null;
  submitted_at: string | null;
  status: string;
  issues: Record<string, any> | null;
  summary: Record<string, any>;
  created_at: string;
}

export interface ComplianceReportInsert extends Omit<ComplianceReport, 'id' | 'created_at'> {}

// Table Names - For consistent reference to Supabase tables
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
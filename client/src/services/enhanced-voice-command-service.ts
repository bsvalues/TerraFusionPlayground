/**
 * Enhanced Voice Command Service (Client-side)
 * 
 * This service extends the base voice command service with advanced features:
 * - Voice command shortcuts
 * - Voice command analytics
 * - Contextual help for voice commands
 * - Error handling and correction
 */

import { apiRequest } from '@/lib/queryClient';
import { DateRange } from 'react-day-picker';

// ========== Shortcut Types ==========

export interface VoiceCommandShortcut {
  id: number;
  userId: number;
  shortcutPhrase: string;
  expandedCommand: string;
  commandType: string;
  description?: string;
  priority: number;
  isEnabled: boolean;
  isGlobal: boolean;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoiceCommandShortcut {
  userId: number;
  shortcutPhrase: string;
  expandedCommand: string;
  commandType: string;
  description?: string;
  priority: number;
  isEnabled: boolean;
  isGlobal: boolean;
}

// ========== Analytics Types ==========

export interface VoiceCommandAnalyticsSummary {
  totalCommands: number;
  successRate: number;
  averageResponseTime: number;
  mostUsedCommands: Array<{commandText: string, count: number}>;
  commandCounts: {
    [key: string]: number;
  };
  errorRates: {
    [key: string]: number;
  };
}

export interface VoiceCommandAnalyticsTimeframe {
  startDate: string;
  endDate: string;
  userId?: number;
}

export interface VoiceCommandAnalyticsFilters {
  timeframe: VoiceCommandAnalyticsTimeframe;
  commandTypes?: string[];
  successful?: boolean;
}

export interface DailyVoiceCommandStats {
  date: string;
  commandCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
}

export interface CommandTypeDistribution {
  commandType: string;
  count: number;
  percentage: number;
}

export interface VoiceCommandAnalyticsDetails {
  summary: VoiceCommandAnalyticsSummary;
  dailyStats: DailyVoiceCommandStats[];
  commandTypeDistribution: CommandTypeDistribution[];
  commonErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
}

// ========== Help Content Types ==========

export interface VoiceCommandHelpContent {
  id: number;
  title: string;
  description: string;
  commandType: string;
  context: string;
  examplePhrases: string[];
  parameters?: Record<string, string>;
  responseExample?: string;
  isHidden: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// ========== Shortcut Functions ==========

/**
 * Get all shortcuts for a user
 */
export async function getUserShortcuts(userId: number): Promise<VoiceCommandShortcut[]> {
  try {
    const response = await apiRequest('GET', `/api/voice-command/shortcuts?userId=${userId}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get shortcuts: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting shortcuts:', error);
    throw error;
  }
}

/**
 * Create a new shortcut
 */
export async function createShortcut(shortcut: CreateVoiceCommandShortcut): Promise<VoiceCommandShortcut> {
  try {
    const response = await apiRequest('POST', '/api/voice-command/shortcuts', shortcut);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create shortcut: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating shortcut:', error);
    throw error;
  }
}

/**
 * Update an existing shortcut
 */
export async function updateShortcut(id: number, shortcut: Partial<CreateVoiceCommandShortcut>): Promise<VoiceCommandShortcut> {
  try {
    const response = await apiRequest('PUT', `/api/voice-command/shortcuts/${id}`, shortcut);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update shortcut: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating shortcut:', error);
    throw error;
  }
}

/**
 * Delete a shortcut
 */
export async function deleteShortcut(id: number): Promise<void> {
  try {
    const response = await apiRequest('DELETE', `/api/voice-command/shortcuts/${id}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete shortcut: ${error}`);
    }
  } catch (error) {
    console.error('Error deleting shortcut:', error);
    throw error;
  }
}

/**
 * Create default shortcuts for a new user
 */
export async function createDefaultShortcuts(userId: number): Promise<VoiceCommandShortcut[]> {
  try {
    const response = await apiRequest('POST', `/api/voice-command/shortcuts/defaults?userId=${userId}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create default shortcuts: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating default shortcuts:', error);
    throw error;
  }
}

/**
 * Apply shortcuts to a command text
 * Expands any shortcut phrases found in the command
 */
export async function expandShortcuts(command: string, userId: number): Promise<string> {
  try {
    const response = await apiRequest('POST', '/api/voice-command/shortcuts/expand', {
      command,
      userId
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to expand shortcuts: ${error}`);
    }
    
    const result = await response.json();
    return result.expandedCommand;
  } catch (error) {
    console.error('Error expanding shortcuts:', error);
    // Return original command if expansion fails
    return command;
  }
}

// ========== Analytics Functions ==========

/**
 * Get voice command analytics for a time period
 */
export async function getVoiceCommandAnalytics(
  userId: number,
  dateRange: DateRange
): Promise<VoiceCommandAnalyticsDetails> {
  try {
    const startDate = dateRange.from?.toISOString() || new Date().toISOString();
    const endDate = dateRange.to?.toISOString() || new Date().toISOString();
    
    const response = await apiRequest('GET', 
      `/api/voice-command/analytics?userId=${userId}&startDate=${startDate}&endDate=${endDate}`
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get analytics: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting analytics:', error);
    throw error;
  }
}

/**
 * Get voice command statistics 
 */
export async function getVoiceCommandStats(userId: number): Promise<VoiceCommandAnalyticsSummary> {
  try {
    const response = await apiRequest('GET', `/api/voice-command/analytics/summary?userId=${userId}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get command stats: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting command stats:', error);
    throw error;
  }
}

// ========== Help Functions ==========

/**
 * Get contextual help for voice commands
 */
export async function getContextualHelp(contextId: string = 'global'): Promise<VoiceCommandHelpContent[]> {
  try {
    const response = await apiRequest('GET', `/api/voice-command/help?context=${contextId}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get help content: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting help content:', error);
    throw error;
  }
}

/**
 * Get specific help content by ID
 */
export async function getHelpContentById(id: number): Promise<VoiceCommandHelpContent> {
  try {
    const response = await apiRequest('GET', `/api/voice-command/help/${id}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get help content: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting help content:', error);
    throw error;
  }
}

/**
 * Initialize default help content
 */
export async function initializeHelpContent(): Promise<VoiceCommandHelpContent[]> {
  try {
    const response = await apiRequest('POST', '/api/voice-command/help/initialize');
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to initialize help content: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error initializing help content:', error);
    throw error;
  }
}

/**
 * Get relevant help topics based on partial command
 */
export async function getSuggestedHelp(partialCommand: string, contextId: string = 'global'): Promise<VoiceCommandHelpContent[]> {
  try {
    const response = await apiRequest('GET', 
      `/api/voice-command/help/suggest?command=${encodeURIComponent(partialCommand)}&context=${contextId}`
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get suggested help: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting suggested help:', error);
    throw error;
  }
}

// ========== Error Correction Functions ==========

/**
 * Get suggestions for correcting a command
 */
export async function getCommandCorrections(
  command: string, 
  contextId: string = 'global'
): Promise<string[]> {
  try {
    const response = await apiRequest('POST', '/api/voice-command/correction', {
      command,
      contextId
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get command corrections: ${error}`);
    }
    
    const result = await response.json();
    return result.suggestions || [];
  } catch (error) {
    console.error('Error getting command corrections:', error);
    return [];
  }
}
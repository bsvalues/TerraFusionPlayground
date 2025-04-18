/**
 * Enhanced Voice Command Service (Client-side)
 * 
 * This service provides enhanced voice command functionality including:
 * - Analytics
 * - Shortcuts
 * - Error handling
 * - Contextual help
 * - Domain-specific commands
 */

import { VoiceCommandResult, RecordingState, VoiceCommandContext } from './agent-voice-command-service';

export interface EnhancedVoiceCommandContext extends VoiceCommandContext {
  contextId?: string;
  deviceInfo?: any;
}

export interface VoiceCommandShortcut {
  id: number;
  userId: number;
  shortcutPhrase: string;
  expandedCommand: string;
  commandType: string;
  description?: string;
  priority: number;
  isEnabled: boolean;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
  isGlobal: boolean;
}

export interface VoiceCommandHelpContent {
  id: number;
  commandType: string;
  contextId?: string;
  title: string;
  examplePhrases: string[];
  description: string;
  parameters?: Record<string, string>;
  responseExample?: string;
  priority: number;
  isHidden: boolean;
}

export interface EnhancedVoiceCommandResult extends VoiceCommandResult {
  suggestions?: string[];
  alternativeCommands?: string[];
  helpContent?: VoiceCommandHelpContent[];
  confidenceScore?: number;
}

// Base URL for voice command API
const API_BASE_URL = '/api/voice-command';

/**
 * Process a voice command using the enhanced voice command API
 */
export async function processEnhancedCommand(
  command: string,
  context: EnhancedVoiceCommandContext
): Promise<EnhancedVoiceCommandResult> {
  try {
    // Prepare the request
    const requestData = {
      command,
      userId: context.userId || 1, // Default to user ID 1 if not provided
      sessionId: context.sessionId,
      contextId: context.contextId,
      deviceInfo: context.deviceInfo || {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    };
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/enhanced/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      throw new Error(`Error processing command: ${response.statusText}`);
    }
    
    // Parse the response
    const result = await response.json();
    
    // Return the result
    return {
      command,
      processed: true,
      successful: result.success,
      response: result.message,
      error: result.error,
      timestamp: Date.now(),
      actions: result.actions || [],
      data: result.result,
      suggestions: result.suggestions,
      alternativeCommands: result.alternativeCommands,
      helpContent: result.helpContent,
      confidenceScore: result.confidenceScore
    };
  } catch (error) {
    console.error('Error processing enhanced voice command:', error);
    
    // Return error result
    return {
      command,
      processed: false,
      successful: false,
      error: error.message || 'Failed to process command',
      timestamp: Date.now(),
      actions: []
    };
  }
}

/**
 * Process a voice command from audio using the enhanced voice command API
 */
export async function processEnhancedAudioCommand(
  audio: string,
  context: EnhancedVoiceCommandContext
): Promise<EnhancedVoiceCommandResult> {
  try {
    // Prepare the request
    const requestData = {
      audio,
      userId: context.userId || 1, // Default to user ID 1 if not provided
      sessionId: context.sessionId,
      contextId: context.contextId,
      deviceInfo: context.deviceInfo || {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    };
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/enhanced/process-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      throw new Error(`Error processing audio command: ${response.statusText}`);
    }
    
    // Parse the response
    const result = await response.json();
    
    // Return the result
    return {
      command: result.transcribedText || '',
      processed: true,
      successful: result.success,
      response: result.message,
      error: result.error,
      timestamp: Date.now(),
      actions: result.actions || [],
      data: result.result,
      suggestions: result.suggestions,
      alternativeCommands: result.alternativeCommands,
      helpContent: result.helpContent,
      confidenceScore: result.confidenceScore
    };
  } catch (error) {
    console.error('Error processing enhanced audio command:', error);
    
    // Return error result
    return {
      command: '',
      processed: false,
      successful: false,
      error: error.message || 'Failed to process audio command',
      timestamp: Date.now(),
      actions: []
    };
  }
}

/**
 * Get available commands for the current context
 */
export async function getAvailableCommands(contextId?: string): Promise<any> {
  try {
    // Make the API request
    const url = new URL(`${API_BASE_URL}/enhanced/available-commands`, window.location.origin);
    
    // Add context ID if provided
    if (contextId) {
      url.searchParams.append('contextId', contextId);
    }
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Error getting available commands: ${response.statusText}`);
    }
    
    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error('Error getting available commands:', error);
    throw error;
  }
}

/**
 * Get shortcuts for a user
 */
export async function getUserShortcuts(userId: number): Promise<VoiceCommandShortcut[]> {
  try {
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/shortcuts/user/${userId}`);
    
    if (!response.ok) {
      throw new Error(`Error getting user shortcuts: ${response.statusText}`);
    }
    
    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error('Error getting user shortcuts:', error);
    return [];
  }
}

/**
 * Create a new shortcut
 */
export async function createShortcut(shortcutData: Omit<VoiceCommandShortcut, 'id' | 'createdAt' | 'lastUsed' | 'usageCount'>): Promise<VoiceCommandShortcut> {
  try {
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/shortcuts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shortcutData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error creating shortcut: ${response.statusText}`);
    }
    
    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error('Error creating shortcut:', error);
    throw error;
  }
}

/**
 * Update an existing shortcut
 */
export async function updateShortcut(
  shortcutId: number,
  shortcutData: Partial<Omit<VoiceCommandShortcut, 'id' | 'createdAt' | 'lastUsed' | 'usageCount'>>
): Promise<VoiceCommandShortcut> {
  try {
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/shortcuts/${shortcutId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shortcutData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error updating shortcut: ${response.statusText}`);
    }
    
    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error('Error updating shortcut:', error);
    throw error;
  }
}

/**
 * Delete a shortcut
 */
export async function deleteShortcut(shortcutId: number): Promise<boolean> {
  try {
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/shortcuts/${shortcutId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error deleting shortcut: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting shortcut:', error);
    throw error;
  }
}

/**
 * Get contextual help
 */
export async function getContextualHelp(contextId: string): Promise<VoiceCommandHelpContent[]> {
  try {
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/help/context/${contextId}`);
    
    if (!response.ok) {
      throw new Error(`Error getting contextual help: ${response.statusText}`);
    }
    
    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error('Error getting contextual help:', error);
    return [];
  }
}

/**
 * Get voice command analytics for a user
 */
export async function getUserAnalytics(
  userId: number,
  dateRange: { start: string, end: string }
): Promise<any> {
  try {
    // Prepare URL with query parameters
    const url = new URL(`${API_BASE_URL}/analytics/user/${userId}`, window.location.origin);
    url.searchParams.append('start', dateRange.start);
    url.searchParams.append('end', dateRange.end);
    
    // Make the API request
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Error getting user analytics: ${response.statusText}`);
    }
    
    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error('Error getting user analytics:', error);
    throw error;
  }
}

/**
 * Create default shortcuts for a user
 */
export async function createDefaultShortcuts(userId: number): Promise<VoiceCommandShortcut[]> {
  try {
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/shortcuts/defaults/${userId}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Error creating default shortcuts: ${response.statusText}`);
    }
    
    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error('Error creating default shortcuts:', error);
    return [];
  }
}

/**
 * Initialize help content
 */
export async function initializeHelpContent(): Promise<any> {
  try {
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/help/initialize-defaults`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Error initializing help content: ${response.statusText}`);
    }
    
    // Parse and return the response
    return await response.json();
  } catch (error) {
    console.error('Error initializing help content:', error);
    throw error;
  }
}
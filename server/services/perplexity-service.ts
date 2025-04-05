/**
 * Perplexity Service
 * 
 * This service provides an interface for interacting with Perplexity's API.
 * It handles API key management, request formatting, and response parsing.
 * Includes robust error handling for rate limits and other common API issues.
 */

/**
 * Validate the Perplexity API key
 * @returns True if the API key is valid and present, false otherwise
 */
export function isPerplexityApiKeyValid(): boolean {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  // Basic validation check
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return false;
  }
  
  // Perplexity API keys have a specific format
  // They typically start with "pplx-" and are followed by a string
  if (!apiKey.startsWith('pplx-')) {
    return false;
  }
  
  return true;
}

/**
 * Perplexity API Error Types
 */
export enum PerplexityErrorType {
  RATE_LIMIT = 'rate_limit',
  QUOTA_EXCEEDED = 'quota_exceeded',
  INVALID_API_KEY = 'invalid_api_key',
  SERVER_ERROR = 'server_error',
  OTHER = 'other'
}

/**
 * Perplexity Error Response
 */
export interface PerplexityError {
  type: PerplexityErrorType;
  message: string;
  retryAfter?: number;
}

/**
 * Perplexity API Response Shape
 */
interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    text: string;
    index: number;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Perplexity Service Interface
 */
export interface IPerplexityService {
  generateText(prompt: string, systemPrompt?: string, maxTokens?: number): Promise<string>;
  isRateLimitError(error: any): boolean;
  getErrorDetails(error: any): PerplexityError;
}

/**
 * Perplexity Service Implementation
 */
export class PerplexityService implements IPerplexityService {
  // Track API call attempts for backoff strategy
  private apiCallAttempts = 0;
  private lastErrorTimestamp = 0;
  
  // Base URL for Perplexity API
  private baseUrl = 'https://api.perplexity.ai/chat/completions';
  
  /**
   * Classify the Perplexity error type from the error object
   */
  isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    // Check for rate limit status codes
    if (error.status === 429) return true;
    
    // Check error message content as fallback
    const errorMessage = error.message || '';
    return errorMessage.includes('rate limit') || 
           errorMessage.includes('quota') ||
           errorMessage.includes('too many requests');
  }
  
  /**
   * Get detailed error information from Perplexity error
   */
  getErrorDetails(error: any): PerplexityError {
    if (!error) {
      return {
        type: PerplexityErrorType.OTHER,
        message: 'Unknown error'
      };
    }
    
    // Extract retry-after header if available
    let retryAfter: number | undefined = undefined;
    if (error.headers && error.headers['retry-after']) {
      retryAfter = parseInt(error.headers['retry-after'], 10);
    }
    
    // Check for rate limit errors
    if (error.status === 429) {
      // Differentiate between rate limits and quota limits if possible
      if (error.message && error.message.toLowerCase().includes('quota')) {
        return {
          type: PerplexityErrorType.QUOTA_EXCEEDED,
          message: 'API quota exceeded. Please check your Perplexity account billing settings.',
          retryAfter
        };
      }
      return {
        type: PerplexityErrorType.RATE_LIMIT,
        message: 'Too many API requests. Please try again after a short delay.',
        retryAfter
      };
    }
    
    // Check for invalid API key
    if (error.status === 401) {
      return {
        type: PerplexityErrorType.INVALID_API_KEY,
        message: 'Invalid API key. Please check your Perplexity API key configuration.'
      };
    }
    
    // Check for server errors
    if (error.status >= 500) {
      return {
        type: PerplexityErrorType.SERVER_ERROR,
        message: 'Perplexity server error. Please try again later.'
      };
    }
    
    // Default error
    return {
      type: PerplexityErrorType.OTHER,
      message: error.message || 'Unknown Perplexity API error'
    };
  }
  
  /**
   * Generate text response from a prompt using Perplexity
   * 
   * @param prompt The user prompt
   * @param systemPrompt Optional system prompt to set context
   * @param maxTokens Maximum number of tokens in the response
   * @returns Generated text
   */
  async generateText(
    prompt: string, 
    systemPrompt: string = "You are a helpful AI assistant specialized in property assessment and real estate analysis.", 
    maxTokens: number = 1000
  ): Promise<string> {
    try {
      if (!isPerplexityApiKeyValid()) {
        throw new Error('Perplexity API key is missing or invalid. Please add a valid PERPLEXITY_API_KEY to your environment variables.');
      }
      
      // Reset attempt counter if it's been more than 10 seconds since the last error
      const now = Date.now();
      if (now - this.lastErrorTimestamp > 10000) {
        this.apiCallAttempts = 0;
      }
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: 'sonar-medium-online', // Use Perplexity's online model that can access up-to-date information
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.5
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw {
          status: response.status,
          message: errorText,
          headers: Object.fromEntries(response.headers.entries())
        };
      }
      
      const data = await response.json() as PerplexityResponse;
      
      if (!data.choices || data.choices.length === 0 || !data.choices[0].text) {
        throw new Error("Perplexity returned empty response");
      }
      
      // Reset attempt counter on success
      this.apiCallAttempts = 0;
      return data.choices[0].text;
    } catch (error: any) {
      // Track error for backoff strategy
      this.lastErrorTimestamp = Date.now();
      this.apiCallAttempts++;
      
      // Get detailed error information
      const errorDetails = this.getErrorDetails(error);
      console.error(`Error in Perplexity text generation: ${errorDetails.type} - ${errorDetails.message}`, error);
      
      throw new Error(`Perplexity text generation failed: ${errorDetails.message}`);
    }
  }
}

// Export singleton instance
export const perplexityService = new PerplexityService();
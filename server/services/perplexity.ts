/**
 * Perplexity API Integration Service
 * 
 * This service provides integration with Perplexity's API for natural language processing
 * and adds it as a third AI provider alongside OpenAI and Anthropic Claude in our 
 * multi-model architecture.
 */

import { z } from "zod";
import fetch from "node-fetch";

// Message schema for Perplexity API
const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string()
});

export type Message = z.infer<typeof messageSchema>;

// Define Perplexity API response interface
export interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Main class for Perplexity API integration
 */
export class PerplexityService {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || "";
    this.baseUrl = "https://api.perplexity.ai/chat/completions";
    // the newest Perplexity model is "llama-3.1-sonar-small-128k-online"
    this.defaultModel = "llama-3.1-sonar-small-128k-online";
  }

  /**
   * Send a query to Perplexity API
   */
  async query(messages: Message[], options: {
    model?: string,
    temperature?: number,
    maxTokens?: number,
    systemPrompt?: string
  } = {}): Promise<PerplexityResponse> {
    // Add system prompt if provided and not already included
    const hasSystemMsg = messages.some(msg => msg.role === "system");
    const finalMessages = [...messages];
    
    if (options.systemPrompt && !hasSystemMsg) {
      finalMessages.unshift({
        role: "system",
        content: options.systemPrompt
      });
    }

    // Validate that user and assistant roles alternate properly ending with user
    let isValidSequence = true;
    let expectedRole = "user";
    
    for (let i = hasSystemMsg ? 1 : 0; i < finalMessages.length; i++) {
      if (finalMessages[i].role !== expectedRole) {
        isValidSequence = false;
        break;
      }
      expectedRole = expectedRole === "user" ? "assistant" : "user";
    }
    
    // If sequence doesn't end with user or has invalid alternation, fix it
    if (!isValidSequence || finalMessages[finalMessages.length - 1].role !== "user") {
      console.warn("Invalid message sequence, restructuring to ensure proper format");
      // Filter to just user messages if sequence is invalid
      const userMessages = finalMessages.filter(msg => msg.role === "user");
      finalMessages.length = 0;
      
      // Add back system message if it existed
      if (hasSystemMsg) {
        finalMessages.push(messages[0]);
      } else if (options.systemPrompt) {
        finalMessages.push({
          role: "system",
          content: options.systemPrompt
        });
      }
      
      // Add remaining user messages
      finalMessages.push(...userMessages);
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || this.defaultModel,
          messages: finalMessages,
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature !== undefined ? options.temperature : 0.2,
          top_p: 0.9,
          frequency_penalty: 1,
          presence_penalty: 0,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
      }

      return await response.json() as PerplexityResponse;
    } catch (error) {
      console.error("Error calling Perplexity API:", error);
      throw error;
    }
  }

  /**
   * Create a simple text completion with Perplexity
   */
  async textCompletion(prompt: string, options: {
    model?: string,
    temperature?: number,
    maxTokens?: number,
    systemPrompt?: string
  } = {}): Promise<string> {
    const messages: Message[] = [
      {
        role: "user",
        content: prompt
      }
    ];

    const response = await this.query(messages, options);
    return response.choices[0].message.content;
  }

  /**
   * Analyze property data using Perplexity
   */
  async analyzePropertyData(propertyData: any, analysisType: string): Promise<string> {
    let prompt = "";
    
    switch (analysisType.toLowerCase()) {
      case "value":
        prompt = `Analyze this Benton County, Washington property's value factors. Explain how the assessed value is derived based on land, improvements, and location considerations:\n\n${JSON.stringify(propertyData, null, 2)}`;
        break;
      case "improvements":
        prompt = `Provide a detailed analysis of the improvements on this Benton County, Washington property. Discuss condition, quality, and potential impact on overall property value:\n\n${JSON.stringify(propertyData, null, 2)}`;
        break;
      case "land":
        prompt = `Analyze the land characteristics of this Benton County, Washington property. Discuss zoning, dimensions, topography and how these factors impact overall value:\n\n${JSON.stringify(propertyData, null, 2)}`;
        break;
      case "comparables":
        prompt = `Based on this Benton County, Washington property data, describe what comparable properties in the area might be valued at and why. Consider location, size, improvements and market trends:\n\n${JSON.stringify(propertyData, null, 2)}`;
        break;
      default:
        prompt = `Provide a comprehensive analysis of this Benton County, Washington property, including value assessment, improvements, land characteristics, and market position:\n\n${JSON.stringify(propertyData, null, 2)}`;
    }

    return await this.textCompletion(prompt, {
      systemPrompt: "You are a property assessment expert for Benton County, Washington. Provide accurate, detailed analysis based on the property data.",
      temperature: 0.1
    });
  }

  /**
   * Get property valuation insights using Perplexity
   */
  async getPropertyValuationInsights(propertyId: string, propertyData: any): Promise<string> {
    const prompt = `
    Provide detailed property valuation insights for property ID ${propertyId} in Benton County, Washington.
    
    Include:
    1. Key factors that drive this property's current assessed value
    2. Potential value change factors to monitor in the next assessment period
    3. How this property compares to similar properties in the area
    4. Specific improvements that could increase property value
    5. Any potential appeals considerations based on the current assessment
    
    Property data:
    ${JSON.stringify(propertyData, null, 2)}
    `;

    return await this.textCompletion(prompt, {
      systemPrompt: "You are a property valuation expert for Benton County, Washington. Provide detailed, accurate, and actionable insights based on the property data provided.",
      temperature: 0.1,
      maxTokens: 1500
    });
  }

  /**
   * Handle property search requests via API endpoint
   */
  handlePropertySearch(req: any, res: any): void {
    // This functionality will be implemented in routes.ts
    throw new Error("Method not implemented directly in service");
  }
}

export const perplexityService = new PerplexityService();
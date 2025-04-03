/**
 * OpenAI Service
 * 
 * This service provides a centralized interface for interacting with OpenAI API.
 * It handles API key management, request formatting, and response parsing.
 */

import OpenAI from "openai";

// Initialize OpenAI client with API key from environment variable
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * OpenAI Service Interface
 */
export interface IOpenAIService {
  generateText(prompt: string, systemPrompt?: string, maxTokens?: number): Promise<string>;
  generateCompletion(messages: any[], maxTokens?: number, temperature?: number): Promise<string>;
  generateJson<T>(prompt: string, systemPrompt: string, maxTokens?: number): Promise<T>;
}

/**
 * OpenAI Service Implementation
 */
export class OpenAIService implements IOpenAIService {
  /**
   * Generate text response from a prompt
   * 
   * @param prompt The user prompt
   * @param systemPrompt Optional system prompt to set context
   * @param maxTokens Maximum number of tokens in the response
   * @returns Generated text
   */
  async generateText(
    prompt: string, 
    systemPrompt: string = "You are a helpful assistant.", 
    maxTokens: number = 1000
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.5,
      });
      
      const generatedText = response.choices[0].message.content;
      
      if (!generatedText) {
        throw new Error("OpenAI returned empty response");
      }
      
      return generatedText;
    } catch (error: any) {
      console.error("Error in OpenAI text generation:", error);
      throw new Error(`OpenAI text generation failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Generate completion from a series of messages
   * 
   * @param messages Array of messages in OpenAI format
   * @param maxTokens Maximum number of tokens in the response
   * @param temperature Temperature setting for randomness (0-1)
   * @returns Generated text
   */
  async generateCompletion(
    messages: any[], 
    maxTokens: number = 1000, 
    temperature: number = 0.5
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages,
        max_tokens: maxTokens,
        temperature,
      });
      
      const generatedText = response.choices[0].message.content;
      
      if (!generatedText) {
        throw new Error("OpenAI returned empty response");
      }
      
      return generatedText;
    } catch (error: any) {
      console.error("Error in OpenAI completion generation:", error);
      throw new Error(`OpenAI completion generation failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Generate structured JSON from a prompt
   * 
   * @param prompt The user prompt
   * @param systemPrompt System prompt to set context
   * @param maxTokens Maximum number of tokens in the response
   * @returns JSON object of type T
   */
  async generateJson<T>(
    prompt: string, 
    systemPrompt: string, 
    maxTokens: number = 1000
  ): Promise<T> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
      
      const jsonText = response.choices[0].message.content;
      
      if (!jsonText) {
        throw new Error("OpenAI returned empty JSON response");
      }
      
      return JSON.parse(jsonText) as T;
    } catch (error: any) {
      console.error("Error in OpenAI JSON generation:", error);
      throw new Error(`OpenAI JSON generation failed: ${error.message || 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();
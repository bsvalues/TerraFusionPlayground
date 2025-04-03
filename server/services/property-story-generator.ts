/**
 * AI-Powered Property Story Generator Service
 * 
 * This service generates narrative descriptions of properties using OpenAI.
 * It takes property data as input and returns engaging, human-readable stories.
 */

import OpenAI from "openai";
import { IStorage } from '../storage';
import { Property, Improvement, LandRecord, Field } from '../../shared/schema';

// Property Story Generation Options
export interface PropertyStoryOptions {
  tone?: 'professional' | 'friendly' | 'detailed' | 'concise';
  focus?: 'investment' | 'residential' | 'historical' | 'developmental';
  includeImages?: boolean;
  includeImprovements?: boolean;
  includeLandRecords?: boolean;
  includeFields?: boolean;
  maxLength?: number;
}

// Property Story Result
export interface PropertyStoryResult {
  property: Property;
  story: string;
  prompt: string;
  generationTime: number;
  options: PropertyStoryOptions;
}

// Property Story Generator Service Interface
export interface IPropertyStoryGenerator {
  generatePropertyStory(
    propertyId: string,
    options?: PropertyStoryOptions
  ): Promise<PropertyStoryResult>;
  
  generateMultiplePropertyStories(
    propertyIds: string[],
    options?: PropertyStoryOptions
  ): Promise<PropertyStoryResult[]>;
  
  generateComparisonStory(
    propertyIds: string[],
    options?: PropertyStoryOptions
  ): Promise<PropertyStoryResult>;
}

// Property Story Generator Implementation
export class PropertyStoryGenerator implements IPropertyStoryGenerator {
  private storage: IStorage;
  private openai: OpenAI;
  
  constructor(storage: IStorage) {
    this.storage = storage;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, 
    });
  }
  
  /**
   * Generate a story for a single property
   * 
   * @param propertyId - The property ID
   * @param options - Story generation options
   */
  async generatePropertyStory(
    propertyId: string,
    options: PropertyStoryOptions = {}
  ): Promise<PropertyStoryResult> {
    try {
      const startTime = Date.now();
      
      // Get property data
      const property = await this.storage.getPropertyByPropertyId(propertyId);
      if (!property) {
        throw new Error(`Property with ID ${propertyId} not found`);
      }
      
      // Get related data if requested
      let improvements: Improvement[] = [];
      let landRecords: LandRecord[] = [];
      let fields: Field[] = [];
      
      if (options.includeImprovements) {
        improvements = await this.storage.getImprovementsByPropertyId(propertyId);
      }
      
      if (options.includeLandRecords) {
        landRecords = await this.storage.getLandRecordsByPropertyId(propertyId);
      }
      
      if (options.includeFields) {
        fields = await this.storage.getFieldsByPropertyId(propertyId);
      }
      
      // Build contextual data for the prompt
      const propertyContext = this.buildPropertyContext(
        property,
        improvements,
        landRecords,
        fields
      );
      
      // Generate the prompt
      const prompt = this.buildPrompt(property, options, propertyContext);
      
      // Call OpenAI to generate the story
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a professional property assessor and storyteller for Benton County. You create engaging and informative property narratives based on assessment data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: options.maxLength ? Math.min(options.maxLength, 4000) : 2000,
      });
      
      const story = completion.choices[0].message.content || "Unable to generate story.";
      const generationTime = Date.now() - startTime;
      
      return {
        property,
        story,
        prompt,
        generationTime,
        options
      };
    } catch (error) {
      console.error('Error generating property story:', error);
      throw new Error(`Failed to generate property story: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate stories for multiple properties
   * 
   * @param propertyIds - Array of property IDs
   * @param options - Story generation options
   */
  async generateMultiplePropertyStories(
    propertyIds: string[],
    options: PropertyStoryOptions = {}
  ): Promise<PropertyStoryResult[]> {
    try {
      // Generate stories in parallel
      const storyPromises = propertyIds.map(id => 
        this.generatePropertyStory(id, options)
      );
      
      return await Promise.all(storyPromises);
    } catch (error) {
      console.error('Error generating multiple property stories:', error);
      throw new Error(`Failed to generate multiple property stories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate a comparison story between multiple properties
   * 
   * @param propertyIds - Array of property IDs to compare
   * @param options - Story generation options
   */
  async generateComparisonStory(
    propertyIds: string[],
    options: PropertyStoryOptions = {}
  ): Promise<PropertyStoryResult> {
    try {
      if (propertyIds.length < 2) {
        throw new Error('At least two properties are required for comparison');
      }
      
      const startTime = Date.now();
      
      // Get all properties
      const propertyPromises = propertyIds.map(id => 
        this.storage.getPropertyByPropertyId(id)
      );
      
      const properties = await Promise.all(propertyPromises);
      
      // Make sure all properties were found
      if (properties.some(p => !p)) {
        const missingIds = propertyIds.filter((id, index) => !properties[index]);
        throw new Error(`Properties not found: ${missingIds.join(', ')}`);
      }
      
      // Get additional data for all properties if requested
      let allImprovements: Record<string, Improvement[]> = {};
      let allLandRecords: Record<string, LandRecord[]> = {};
      let allFields: Record<string, Field[]> = {};
      
      if (options.includeImprovements) {
        const improvementPromises = propertyIds.map(id => 
          this.storage.getImprovementsByPropertyId(id)
        );
        const allImprovementArrays = await Promise.all(improvementPromises);
        propertyIds.forEach((id, index) => {
          allImprovements[id] = allImprovementArrays[index];
        });
      }
      
      if (options.includeLandRecords) {
        const landRecordPromises = propertyIds.map(id => 
          this.storage.getLandRecordsByPropertyId(id)
        );
        const allLandRecordArrays = await Promise.all(landRecordPromises);
        propertyIds.forEach((id, index) => {
          allLandRecords[id] = allLandRecordArrays[index];
        });
      }
      
      if (options.includeFields) {
        const fieldPromises = propertyIds.map(id => 
          this.storage.getFieldsByPropertyId(id)
        );
        const allFieldArrays = await Promise.all(fieldPromises);
        propertyIds.forEach((id, index) => {
          allFields[id] = allFieldArrays[index];
        });
      }
      
      // Build the comparison prompt
      const prompt = this.buildComparisonPrompt(
        properties as Property[],
        options,
        allImprovements,
        allLandRecords,
        allFields
      );
      
      // Call OpenAI to generate the comparison story
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a professional property assessor and real estate analyst for Benton County. You create comparative property analyses based on assessment data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: options.maxLength ? Math.min(options.maxLength, 4000) : 3000,
      });
      
      const story = completion.choices[0].message.content || "Unable to generate comparison.";
      const generationTime = Date.now() - startTime;
      
      return {
        property: properties[0] as Property, // Use first property as reference
        story,
        prompt,
        generationTime,
        options
      };
    } catch (error) {
      console.error('Error generating property comparison:', error);
      throw new Error(`Failed to generate property comparison: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Build a property context object with all relevant data
   */
  private buildPropertyContext(
    property: Property,
    improvements: Improvement[],
    landRecords: LandRecord[],
    fields: Field[]
  ): any {
    return {
      property,
      improvements,
      landRecords,
      fields,
      improvementsSummary: this.summarizeImprovements(improvements),
      landRecordsSummary: this.summarizeLandRecords(landRecords),
      fieldsSummary: this.summarizeFields(fields)
    };
  }
  
  /**
   * Summarize improvements data
   */
  private summarizeImprovements(improvements: Improvement[]): string {
    if (!improvements.length) return 'No improvements recorded.';
    
    // Updated to match the camelCase schema fields
    const types = Array.from(new Set(improvements.map(i => i.improvementType)));
    const oldestYear = Math.min(...improvements
      .filter(i => i.yearBuilt)
      .map(i => i.yearBuilt || 9999));
    const newestYear = Math.max(...improvements
      .filter(i => i.yearBuilt)
      .map(i => i.yearBuilt || 0));
    
    return `${improvements.length} improvements recorded. ` +
      `Types include ${types.join(', ')}. ` +
      `Construction years range from ${oldestYear !== 9999 ? oldestYear : 'unknown'} ` +
      `to ${newestYear !== 0 ? newestYear : 'unknown'}.`;
  }
  
  /**
   * Summarize land records data
   */
  private summarizeLandRecords(landRecords: LandRecord[]): string {
    if (!landRecords.length) return 'No land records available.';
    
    // Updated to match the camelCase schema fields
    const zonings = Array.from(new Set(landRecords.map(l => l.zoning)));
    const landTypes = Array.from(new Set(landRecords.map(l => l.landUseCode)));
    
    return `${landRecords.length} land records available. ` +
      `Zoning: ${zonings.join(', ')}. ` +
      `Land types: ${landTypes.join(', ')}.`;
  }
  
  /**
   * Summarize fields data
   */
  private summarizeFields(fields: Field[]): string {
    if (!fields.length) return 'No field data available.';
    
    // Updated to match the camelCase schema fields
    const fieldTypes = Array.from(new Set(fields.map(f => f.fieldType)));
    
    return `${fields.length} agricultural fields available. ` +
      `Field types include ${fieldTypes.join(', ')}.`;
  }
  
  /**
   * Build the prompt for a single property story
   */
  private buildPrompt(
    property: Property,
    options: PropertyStoryOptions,
    context: any
  ): string {
    // Base prompt structure
    let prompt = `Generate a${options.tone ? ' ' + options.tone : ''} property story for the following Benton County property:\n\n`;
    
    // Add property details
    prompt += `Property ID: ${property.propertyId}\n`;
    prompt += `Address: ${property.address}\n`;
    prompt += `City: ${property.address?.split(', ')[1] || 'Unknown'}\n`;
    prompt += `County: Benton\n`;
    prompt += `State: ${property.address?.split(', ')[2]?.split(' ')[0] || 'WA'}\n`;
    prompt += `Zip: ${property.address?.split(', ')[2]?.split(' ')[1] || 'Unknown'}\n`;
    prompt += `Property Type: ${property.propertyType}\n`;
    prompt += `Market Value: $${property.value || 'Not assessed'}\n`;
    prompt += `Tax Value: $${property.value || 'Not assessed'}\n`;
    prompt += `Year Built: Unknown\n`;
    prompt += `Last Sale Date: Unknown\n`;
    prompt += `Last Sale Price: Unknown\n\n`;
    
    // Add summary data from related entities
    if (options.includeImprovements) {
      prompt += `Improvements: ${context.improvementsSummary}\n\n`;
      
      // Add more detailed improvement data if available
      if (context.improvements.length) {
        prompt += "Improvement Details:\n";
        context.improvements.forEach((imp: Improvement, index: number) => {
          prompt += `${index + 1}. ${imp.improvementType} (${imp.yearBuilt || 'Unknown year'}): ${imp.squareFeet || 'Unknown'} sqft`;
          if (imp.quality) prompt += ` - ${imp.quality} quality`;
          if (imp.condition) prompt += `, ${imp.condition} condition`;
          prompt += '\n';
        });
        prompt += '\n';
      }
    }
    
    if (options.includeLandRecords) {
      prompt += `Land Records: ${context.landRecordsSummary}\n\n`;
      
      // Add more detailed land record data if available
      if (context.landRecords.length) {
        prompt += "Land Record Details:\n";
        context.landRecords.forEach((record: LandRecord, index: number) => {
          prompt += `${index + 1}. Land Use: ${record.landUseCode}, Zoning: ${record.zoning || 'Unknown'}`;
          if (record.topography) prompt += `, Topography: ${record.topography}`;
          if (record.shape) prompt += `, Shape: ${record.shape}`;
          prompt += '\n';
        });
        prompt += '\n';
      }
    }
    
    if (options.includeFields) {
      prompt += `Agricultural Fields: ${context.fieldsSummary}\n\n`;
      
      // Add more detailed field data if available
      if (context.fields.length) {
        prompt += "Field Details:\n";
        context.fields.forEach((field: Field, index: number) => {
          prompt += `${index + 1}. Field Type: ${field.fieldType}, Value: ${field.fieldValue || 'N/A'}`;
          prompt += '\n';
        });
        prompt += '\n';
      }
    }
    
    // Add specific instructions based on options
    if (options.focus) {
      prompt += `Please focus on the property's value as a ${options.focus} opportunity. `;
    }
    
    if (options.tone === 'friendly') {
      prompt += "Use conversational language appropriate for a property owner or buyer. ";
    } else if (options.tone === 'professional') {
      prompt += "Maintain a formal, professional tone suitable for assessment documents. ";
    } else if (options.tone === 'detailed') {
      prompt += "Provide comprehensive details about every aspect of the property. ";
    } else if (options.tone === 'concise') {
      prompt += "Create a brief, factual summary with key points only. ";
    }
    
    // Add structuring guidance
    prompt += "\nPlease structure the story in an engaging way that captures the property's unique characteristics and value. ";
    prompt += "Include relevant history, neighborhood context, and potential future developments if appropriate. ";
    
    if (options.maxLength) {
      prompt += `Keep the response to approximately ${options.maxLength} characters.`;
    }
    
    return prompt;
  }
  
  /**
   * Build the prompt for a property comparison
   */
  private buildComparisonPrompt(
    properties: Property[],
    options: PropertyStoryOptions,
    allImprovements: Record<string, Improvement[]>,
    allLandRecords: Record<string, LandRecord[]>,
    allFields: Record<string, Field[]>
  ): string {
    // Base prompt structure
    let prompt = `Generate a${options.tone ? ' ' + options.tone : ''} comparison between the following ${properties.length} Benton County properties:\n\n`;
    
    // Add each property's details
    properties.forEach((property, index) => {
      prompt += `PROPERTY ${index + 1}:\n`;
      prompt += `Property ID: ${property.propertyId}\n`;
      prompt += `Address: ${property.address}\n`;
      prompt += `City: ${property.address?.split(', ')[1] || 'Unknown'}\n`;
      prompt += `State: ${property.address?.split(', ')[2]?.split(' ')[0] || 'WA'}\n`;
      prompt += `Zip: ${property.address?.split(', ')[2]?.split(' ')[1] || 'Unknown'}\n`;
      prompt += `Property Type: ${property.propertyType}\n`;
      prompt += `Market Value: $${property.value || 'Not assessed'}\n`;
      prompt += `Tax Value: $${property.value || 'Not assessed'}\n`;
      prompt += `Year Built: Unknown\n`;
      prompt += `Last Sale Date: Unknown\n`;
      prompt += `Last Sale Price: Unknown\n`;
      
      // Add summary data from related entities
      if (options.includeImprovements && allImprovements[property.propertyId]) {
        const improvements = allImprovements[property.propertyId];
        prompt += `Improvements: ${this.summarizeImprovements(improvements)}\n`;
      }
      
      if (options.includeLandRecords && allLandRecords[property.propertyId]) {
        const landRecords = allLandRecords[property.propertyId];
        prompt += `Land Records: ${this.summarizeLandRecords(landRecords)}\n`;
      }
      
      if (options.includeFields && allFields[property.propertyId]) {
        const fields = allFields[property.propertyId];
        prompt += `Agricultural Fields: ${this.summarizeFields(fields)}\n`;
      }
      
      prompt += '\n';
    });
    
    // Add comparison instructions
    prompt += "Please compare these properties based on:\n";
    prompt += "1. Market value and potential investment return\n";
    prompt += "2. Physical characteristics and improvements\n";
    prompt += "3. Location and neighborhood context\n";
    prompt += "4. Unique advantages and disadvantages of each\n\n";
    
    // Add specific instructions based on options
    if (options.focus) {
      prompt += `Please focus on the properties' values as ${options.focus} opportunities. `;
    }
    
    if (options.tone === 'friendly') {
      prompt += "Use conversational language appropriate for a property investor. ";
    } else if (options.tone === 'professional') {
      prompt += "Maintain a formal, professional tone suitable for assessment documents. ";
    } else if (options.tone === 'detailed') {
      prompt += "Provide comprehensive details comparing every aspect of the properties. ";
    } else if (options.tone === 'concise') {
      prompt += "Create a brief, factual comparison with key points only. ";
    }
    
    // Add structuring guidance
    prompt += "\nPlease structure the comparison in a clear, organized format that makes it easy to understand the differences and similarities. ";
    prompt += "Include a summary section that provides recommendations based on different potential uses. ";
    
    if (options.maxLength) {
      prompt += `Keep the response to approximately ${options.maxLength} characters.`;
    }
    
    return prompt;
  }
}
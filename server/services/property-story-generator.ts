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
    
    const totalValue = improvements.reduce((sum, i) => sum + (i.value || 0), 0);
    const types = [...new Set(improvements.map(i => i.type))];
    const oldestYear = Math.min(...improvements
      .filter(i => i.year_built)
      .map(i => i.year_built || 9999));
    const newestYear = Math.max(...improvements
      .filter(i => i.year_built)
      .map(i => i.year_built || 0));
    
    return `${improvements.length} improvements totaling $${totalValue.toLocaleString()} in value. ` +
      `Types include ${types.join(', ')}. ` +
      `Construction years range from ${oldestYear !== 9999 ? oldestYear : 'unknown'} ` +
      `to ${newestYear !== 0 ? newestYear : 'unknown'}.`;
  }
  
  /**
   * Summarize land records data
   */
  private summarizeLandRecords(landRecords: LandRecord[]): string {
    if (!landRecords.length) return 'No land records available.';
    
    const totalAcres = landRecords.reduce((sum, l) => sum + (l.acres || 0), 0);
    const zonings = [...new Set(landRecords.map(l => l.zoning))];
    const landTypes = [...new Set(landRecords.map(l => l.land_type))];
    
    return `${landRecords.length} land records totaling ${totalAcres.toFixed(2)} acres. ` +
      `Zoning: ${zonings.join(', ')}. ` +
      `Land types: ${landTypes.join(', ')}.`;
  }
  
  /**
   * Summarize fields data
   */
  private summarizeFields(fields: Field[]): string {
    if (!fields.length) return 'No field data available.';
    
    const cropTypes = [...new Set(fields.map(f => f.crop_type))];
    const totalAcres = fields.reduce((sum, f) => sum + (f.acres || 0), 0);
    
    return `${fields.length} agricultural fields totaling ${totalAcres.toFixed(2)} acres. ` +
      `Crops include ${cropTypes.join(', ')}.`;
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
    prompt += `Property ID: ${property.property_id}\n`;
    prompt += `Address: ${property.address}\n`;
    prompt += `City: ${property.city}\n`;
    prompt += `County: Benton\n`;
    prompt += `State: ${property.state}\n`;
    prompt += `Zip: ${property.zip}\n`;
    prompt += `Property Type: ${property.property_type}\n`;
    prompt += `Market Value: $${property.market_value?.toLocaleString() || 'Not assessed'}\n`;
    prompt += `Tax Value: $${property.tax_value?.toLocaleString() || 'Not assessed'}\n`;
    prompt += `Year Built: ${property.year_built || 'Unknown'}\n`;
    prompt += `Last Sale Date: ${property.last_sale_date || 'Unknown'}\n`;
    prompt += `Last Sale Price: ${property.last_sale_price ? '$' + property.last_sale_price.toLocaleString() : 'Unknown'}\n\n`;
    
    // Add summary data from related entities
    if (options.includeImprovements) {
      prompt += `Improvements: ${context.improvementsSummary}\n\n`;
      
      // Add more detailed improvement data if available
      if (context.improvements.length) {
        prompt += "Improvement Details:\n";
        context.improvements.forEach((imp: Improvement, index: number) => {
          prompt += `${index + 1}. ${imp.type} (${imp.year_built || 'Unknown year'}): $${imp.value?.toLocaleString() || 'Unknown value'}`;
          if (imp.description) prompt += ` - ${imp.description}`;
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
          prompt += `${index + 1}. ${record.land_type} (${record.acres?.toFixed(2) || 'Unknown'} acres): Zoning ${record.zoning || 'Unknown'}`;
          if (record.description) prompt += ` - ${record.description}`;
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
          prompt += `${index + 1}. ${field.crop_type} (${field.acres?.toFixed(2) || 'Unknown'} acres)`;
          if (field.description) prompt += ` - ${field.description}`;
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
      prompt += `Property ID: ${property.property_id}\n`;
      prompt += `Address: ${property.address}\n`;
      prompt += `City: ${property.city}\n`;
      prompt += `State: ${property.state}\n`;
      prompt += `Zip: ${property.zip}\n`;
      prompt += `Property Type: ${property.property_type}\n`;
      prompt += `Market Value: $${property.market_value?.toLocaleString() || 'Not assessed'}\n`;
      prompt += `Tax Value: $${property.tax_value?.toLocaleString() || 'Not assessed'}\n`;
      prompt += `Year Built: ${property.year_built || 'Unknown'}\n`;
      prompt += `Last Sale Date: ${property.last_sale_date || 'Unknown'}\n`;
      prompt += `Last Sale Price: ${property.last_sale_price ? '$' + property.last_sale_price.toLocaleString() : 'Unknown'}\n`;
      
      // Add summary data from related entities
      if (options.includeImprovements && allImprovements[property.property_id]) {
        const improvements = allImprovements[property.property_id];
        prompt += `Improvements: ${this.summarizeImprovements(improvements)}\n`;
      }
      
      if (options.includeLandRecords && allLandRecords[property.property_id]) {
        const landRecords = allLandRecords[property.property_id];
        prompt += `Land Records: ${this.summarizeLandRecords(landRecords)}\n`;
      }
      
      if (options.includeFields && allFields[property.property_id]) {
        const fields = allFields[property.property_id];
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
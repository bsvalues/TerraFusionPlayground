/**
 * LLM Service
 * 
 * This service provides a unified interface for interacting with multiple LLM providers.
 * It supports OpenAI (GPT models), Anthropic (Claude), and offers a flexible architecture
 * for routing different types of property analysis tasks to the most appropriate model.
 */

import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import Anthropic from '@anthropic-ai/sdk';

export interface LLMResponse {
  text: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  raw?: any;
}

export interface PropertyTrendAnalysisRequest {
  propertyId: string;
  propertyData: any;
  historicalData?: any[];
  comparables?: any[];
  timeframe: string;
  marketFactors?: string[];
  analysisDepth: 'basic' | 'detailed' | 'comprehensive';
}

export interface PropertyValuationRequest {
  propertyId: string;
  propertyData: any;
  comparables?: any[];
  improvements?: any[];
  landRecords?: any[];
  marketConditions?: any;
  specialFactors?: string[];
}

export interface NeighborhoodAnalysisRequest {
  zipCode: string;
  properties: any[];
  demographicData?: any;
  economicIndicators?: any;
  timeframe?: string;
}

export interface LLMServiceConfig {
  defaultProvider: 'openai' | 'anthropic';
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultModels: {
    openai: string;
    anthropic: string;
  };
  specializationRouting?: {
    propertyValuation?: 'openai' | 'anthropic';
    trendAnalysis?: 'openai' | 'anthropic';
    neighborhoodAnalysis?: 'openai' | 'anthropic';
    anomalyDetection?: 'openai' | 'anthropic';
    futurePrediction?: 'openai' | 'anthropic';
  };
}

export class LLMService {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private config: LLMServiceConfig;
  
  constructor(config: LLMServiceConfig) {
    this.config = config;
    
    // Initialize OpenAI client if API key provided
    if (config.openaiApiKey || process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
      });
    }
    
    // Initialize Anthropic client if API key provided
    if (config.anthropicApiKey || process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({
        apiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
      });
    }
  }
  
  /**
   * Check if the service is properly configured
   */
  public isConfigured(): boolean {
    return !!(this.openaiClient || this.anthropicClient);
  }
  
  /**
   * Get models available from configured LLM providers
   */
  public getAvailableModels(): { openai: boolean; anthropic: boolean } {
    return {
      openai: !!this.openaiClient,
      anthropic: !!this.anthropicClient,
    };
  }
  
  /**
   * Route a request to the appropriate LLM provider based on task type
   */
  private getProviderForTask(taskType: string): 'openai' | 'anthropic' {
    if (this.config.specializationRouting?.[taskType as keyof typeof this.config.specializationRouting]) {
      const provider = this.config.specializationRouting[taskType as keyof typeof this.config.specializationRouting];
      
      // Check if the specified provider is available
      if (provider === 'openai' && this.openaiClient) {
        return 'openai';
      } else if (provider === 'anthropic' && this.anthropicClient) {
        return 'anthropic';
      }
    }
    
    // Fall back to default provider if specialized routing not specified or provider not available
    if (this.config.defaultProvider === 'openai' && this.openaiClient) {
      return 'openai';
    } else if (this.config.defaultProvider === 'anthropic' && this.anthropicClient) {
      return 'anthropic';
    }
    
    // Final fallback: use whatever is available
    return this.openaiClient ? 'openai' : 'anthropic';
  }
  
  /**
   * Send a prompt to OpenAI
   */
  private async promptOpenAI(
    messages: ChatCompletionMessageParam[],
    model?: string,
    temperature: number = 0.2,
    responseFormat?: { type: 'json_object' | 'text' }
  ): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not configured');
    }
    
    const selectedModel = model || this.config.defaultModels.openai || 'gpt-4o';
    
    try {
      const requestOptions: any = {
        model: selectedModel,
        messages,
        temperature,
      };
      
      if (responseFormat) {
        requestOptions.response_format = responseFormat;
      }
      
      const response = await this.openaiClient.chat.completions.create(requestOptions);
      
      return {
        text: response.choices[0]?.message.content || '',
        model: selectedModel,
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
        },
        raw: response,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Send a prompt to Anthropic
   */
  private async promptAnthropic(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    model?: string,
    temperature: number = 0.2
  ): Promise<LLMResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not configured');
    }
    
    const selectedModel = model || this.config.defaultModels.anthropic || 'claude-3-opus-20240229';
    
    try {
      // Convert messages to Anthropic format
      const formattedMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      }));
      
      const response = await this.anthropicClient.messages.create({
        model: selectedModel,
        messages: formattedMessages,
        temperature,
        max_tokens: 4000,
      });
      
      return {
        text: response.content[0].text,
        model: selectedModel,
        usage: {
          promptTokens: response.usage?.input_tokens,
          completionTokens: response.usage?.output_tokens,
          totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        },
        raw: response,
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generic method to send a prompt to the default or specified LLM provider
   */
  public async prompt(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    options?: {
      provider?: 'openai' | 'anthropic';
      model?: string;
      temperature?: number;
      responseFormat?: { type: 'json_object' | 'text' };
    }
  ): Promise<LLMResponse> {
    const provider = options?.provider || this.config.defaultProvider;
    
    if (provider === 'openai' && this.openaiClient) {
      return this.promptOpenAI(
        messages,
        options?.model,
        options?.temperature,
        options?.responseFormat
      );
    } else if (provider === 'anthropic' && this.anthropicClient) {
      return this.promptAnthropic(
        messages,
        options?.model,
        options?.temperature
      );
    } else {
      throw new Error(`No LLM provider available for ${provider}`);
    }
  }
  
  /**
   * Analyze property trends using the LLM
   */
  public async analyzePropertyTrends(
    request: PropertyTrendAnalysisRequest
  ): Promise<LLMResponse> {
    const provider = this.getProviderForTask('trendAnalysis');
    
    // Create a detailed prompt for the LLM
    const systemPrompt = 
      `You are an expert property value analyst specializing in trend analysis. 
       Analyze the provided property data and historical trends to provide a detailed 
       assessment of value trends over time. Consider market factors, seasonal patterns, 
       and external economic indicators. Your analysis should be data-driven, objective, 
       and include specific growth rates, value patterns, and confidence levels.
       
       Analysis depth requested: ${request.analysisDepth}
       Timeframe: ${request.timeframe}
       
       Please format your response as a structured analysis with the following sections:
       1. Summary of Trends
       2. Growth Rates (annualized, total, and by period)
       3. Pattern Recognition (seasonal, cyclical, or linear)
       4. Key Factors Influencing Value
       5. Future Outlook
       6. Confidence Assessment`;
    
    const userPrompt = 
      `Property ID: ${request.propertyId}
       
       Property Data:
       ${JSON.stringify(request.propertyData, null, 2)}
       
       ${request.historicalData ? `Historical Data:\n${JSON.stringify(request.historicalData, null, 2)}` : ''}
       
       ${request.comparables ? `Comparable Properties:\n${JSON.stringify(request.comparables, null, 2)}` : ''}
       
       ${request.marketFactors ? `Market Factors to Consider:\n${request.marketFactors.join(', ')}` : ''}`;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    
    // Send to the appropriate LLM
    return this.prompt(messages, {
      provider,
      temperature: 0.2,
      // Use a more advanced model for comprehensive analysis
      model: request.analysisDepth === 'comprehensive' 
        ? (provider === 'openai' ? 'gpt-4o' : 'claude-3-opus-20240229')
        : undefined
    });
  }
  
  /**
   * Generate property valuation using the LLM
   */
  public async generatePropertyValuation(
    request: PropertyValuationRequest
  ): Promise<LLMResponse> {
    const provider = this.getProviderForTask('propertyValuation');
    
    // Create a detailed prompt for the LLM
    const systemPrompt = 
      `You are an expert property appraiser with decades of experience in real estate valuation.
       Your task is to analyze the provided property data and generate a comprehensive valuation 
       using multiple methodologies: comparable sales approach, cost approach, and income approach where applicable.
       
       Your valuation should be data-driven, objective, and include:
       1. Estimated fair market value with confidence interval
       2. Breakdown of value factors (land, improvements, location, etc.)
       3. Adjustment calculations for differences from comparables
       4. Strengths and limitations of the valuation methodology
       5. Key value drivers and risk factors
       
       Format your response as a professional appraisal report with clear sections and numerical analysis.`;
    
    const userPrompt = 
      `Property ID: ${request.propertyId}
       
       Property Data:
       ${JSON.stringify(request.propertyData, null, 2)}
       
       ${request.comparables ? `Comparable Properties:\n${JSON.stringify(request.comparables, null, 2)}` : ''}
       
       ${request.improvements ? `Improvements:\n${JSON.stringify(request.improvements, null, 2)}` : ''}
       
       ${request.landRecords ? `Land Records:\n${JSON.stringify(request.landRecords, null, 2)}` : ''}
       
       ${request.marketConditions ? `Market Conditions:\n${JSON.stringify(request.marketConditions, null, 2)}` : ''}
       
       ${request.specialFactors ? `Special Factors to Consider:\n${request.specialFactors.join(', ')}` : ''}`;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    
    // Send to the appropriate LLM
    return this.prompt(messages, {
      provider,
      temperature: 0.2,
      responseFormat: { type: 'text' }
    });
  }
  
  /**
   * Analyze neighborhood data using the LLM
   */
  public async analyzeNeighborhood(
    request: NeighborhoodAnalysisRequest
  ): Promise<LLMResponse> {
    const provider = this.getProviderForTask('neighborhoodAnalysis');
    
    // Create a detailed prompt for the LLM
    const systemPrompt = 
      `You are an expert in neighborhood analysis and real estate market trends.
       Your task is to analyze the provided neighborhood data and generate a comprehensive 
       report on property distribution, value patterns, demographic influences, and future outlook.
       
       Your analysis should be data-driven, objective, and include:
       1. Summary of neighborhood characteristics
       2. Property type and value distribution analysis
       3. Key value drivers in the area
       4. Demographic impact on property values
       5. Development patterns and potential
       6. Future outlook with confidence assessment
       
       Format your response as a structured neighborhood analysis report with clear sections and data-driven insights.
       Include specific numerical analysis where possible.`;
    
    const userPrompt = 
      `Zip Code: ${request.zipCode}
       Timeframe: ${request.timeframe || 'Current'}
       
       Properties in Neighborhood:
       ${JSON.stringify(request.properties, null, 2)}
       
       ${request.demographicData ? `Demographic Data:\n${JSON.stringify(request.demographicData, null, 2)}` : ''}
       
       ${request.economicIndicators ? `Economic Indicators:\n${JSON.stringify(request.economicIndicators, null, 2)}` : ''}`;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    
    // Send to the appropriate LLM
    return this.prompt(messages, {
      provider,
      temperature: 0.3,
      responseFormat: { type: 'text' }
    });
  }
  
  /**
   * Predict future property value using the LLM
   */
  public async predictFutureValue(
    propertyId: string,
    propertyData: any,
    historicalData: any[],
    yearsAhead: number,
    marketFactors?: string[]
  ): Promise<LLMResponse> {
    const provider = this.getProviderForTask('futurePrediction');
    
    // Create a detailed prompt for the LLM
    const systemPrompt = 
      `You are an expert in property value forecasting and predictive analytics.
       Your task is to generate a detailed prediction of future property value based on 
       historical data, current property characteristics, and market factors.
       
       Your prediction should be data-driven and include:
       1. Predicted property values for each year in the forecast period
       2. Growth rates (overall and annual)
       3. Confidence intervals for each prediction
       4. Key factors influencing the forecast
       5. Potential high and low scenarios
       6. Methodological explanation
       
       Format your response as a structured JSON object with the following structure:
       {
         "propertyId": "string",
         "currentValue": number,
         "predictedValues": [
           {"year": number, "predictedValue": number, "growthFromPresent": number}
         ],
         "confidenceIntervals": [
           {"year": number, "low": number, "high": number, "marginOfError": number}
         ],
         "growthFactors": {
           "historicalGrowthRate": number,
           "adjustedGrowthRate": number,
           "propertyTypeAdjustment": number
         },
         "predictionDate": "string (ISO date)",
         "methodology": "string",
         "keyFactors": ["string"],
         "scenarios": {
           "optimistic": {"value": number, "description": "string"},
           "pessimistic": {"value": number, "description": "string"}
         }
       }`;
    
    const userPrompt = 
      `Property ID: ${propertyId}
       Years Ahead to Predict: ${yearsAhead}
       
       Property Data:
       ${JSON.stringify(propertyData, null, 2)}
       
       Historical Data:
       ${JSON.stringify(historicalData, null, 2)}
       
       ${marketFactors ? `Market Factors to Consider:\n${marketFactors.join(', ')}` : ''}`;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    
    // Send to the appropriate LLM with JSON format response
    return this.prompt(messages, {
      provider,
      temperature: 0.2,
      responseFormat: { type: 'json_object' }
    });
  }
  
  /**
   * Detect anomalies in property valuation using the LLM
   */
  public async detectValuationAnomalies(
    propertyId: string,
    propertyData: any,
    comparables: any[],
    threshold: number = 0.25
  ): Promise<LLMResponse> {
    const provider = this.getProviderForTask('anomalyDetection');
    
    // Create a detailed prompt for the LLM
    const systemPrompt = 
      `You are an expert in property valuation and anomaly detection.
       Your task is to analyze the provided property data and identify potential anomalies
       in the property valuation compared to similar properties.
       
       Analyze the data carefully, looking for:
       1. Statistical outliers in valuation
       2. Unusual property characteristics that may explain value differences
       3. Potential valuation errors or inconsistencies
       4. Reasonable explanations for value deviations
       
       The analysis should determine if the property's value is anomalous based on the provided threshold (${threshold * 100}% deviation).
       
       Format your response as a JSON object with the following structure:
       {
         "propertyId": "string",
         "sourceValue": number,
         "comparableStatistics": {
           "count": number,
           "averageValue": number,
           "medianValue": number,
           "standardDeviation": number
         },
         "anomalyMetrics": {
           "deviationFromAverage": number,
           "deviationFromMedian": number,
           "zScore": number
         },
         "anomalyDetection": {
           "isValueAnomaly": boolean,
           "valuationConfidence": "string",
           "otherAnomalies": ["string"],
           "anomalyThreshold": number,
           "possibleExplanations": ["string"]
         },
         "analysisDate": "string (ISO date)"
       }`;
    
    const userPrompt = 
      `Property ID: ${propertyId}
       Anomaly Threshold: ${threshold * 100}%
       
       Property Data:
       ${JSON.stringify(propertyData, null, 2)}
       
       Comparable Properties:
       ${JSON.stringify(comparables, null, 2)}`;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    
    // Send to the appropriate LLM with JSON format response
    return this.prompt(messages, {
      provider,
      temperature: 0.1, // Lower temperature for more deterministic results
      responseFormat: { type: 'json_object' }
    });
  }
}
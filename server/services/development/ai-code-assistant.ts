/**
 * AI Code Assistant Service
 * 
 * Provides AI-powered code generation, completion, and documentation features
 * for the TaxI_AI Development Platform
 */

import { IStorage } from '../../storage';
import { 
  AiCodeGeneration, 
  InsertAiCodeGeneration,
  ProjectFile,
  DevelopmentProject,
  FileType
} from '../../../shared/schema';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

// Import OpenAI or other AI provider SDK
let OpenAI;
try {
  // Using dynamic import to avoid direct dependency
  OpenAI = require('openai');
} catch (err) {
  console.warn('OpenAI SDK not available. AI Code Assistant will use fallback methods.');
}

export interface CodeGenerationResult {
  success: boolean;
  message?: string;
  code?: string;
  generation?: AiCodeGeneration;
  error?: any;
}

export interface CodeCompletionResult {
  success: boolean;
  message?: string;
  completion?: string;
  error?: any;
}

export interface CodeDocumentationResult {
  success: boolean;
  message?: string;
  documentation?: string;
  error?: any;
}

export class AICodeAssistant {
  private openaiClient: any;
  
  constructor(
    private storage: IStorage,
    private apiKey?: string
  ) {
    // Initialize AI provider client if API key is provided
    if (apiKey && OpenAI) {
      this.openaiClient = new OpenAI({ apiKey });
    }
  }

  /**
   * Generate code based on a natural language prompt
   * 
   * @param projectId - Project ID
   * @param prompt - Natural language prompt describing the code to generate
   * @param fileId - Optional file ID for context
   * @param userId - User ID
   * @returns CodeGenerationResult
   */
  async generateCode(
    projectId: string,
    prompt: string,
    fileId: string | null,
    userId: number
  ): Promise<CodeGenerationResult> {
    try {
      // Get project details
      const project = await this.storage.findDevelopmentProjectByProjectId(projectId);
      if (!project) {
        return { success: false, message: `Project with ID ${projectId} not found` };
      }
      
      // Get file context if fileId is provided
      let file: ProjectFile | null = null;
      if (fileId) {
        file = await this.storage.findProjectFileById(parseInt(fileId));
        if (!file || file.projectId !== projectId) {
          return { success: false, message: `File with ID ${fileId} not found in project` };
        }
      }
      
      // Build context for AI
      const context = await this.buildAIContext(project, file);
      
      // Generate code using AI
      const generatedCode = await this.callAICodeGeneration(prompt, context);
      
      if (!generatedCode.success) {
        return generatedCode;
      }
      
      // Create record of the generation
      const codeGeneration: InsertAiCodeGeneration = {
        generationId: uuidv4(),
        projectId,
        fileId: file?.fileId,
        prompt,
        result: generatedCode.code,
        usedContext: context,
        isApplied: false,
        createdBy: userId,
        model: generatedCode.model || 'default'
      };
      
      const generation = await this.storage.createAiCodeGeneration(codeGeneration);
      
      return {
        success: true,
        code: generatedCode.code,
        generation
      };
    } catch (err) {
      console.error('Error generating code:', err);
      return { success: false, message: `Error generating code: ${err.message}`, error: err };
    }
  }

  /**
   * Complete code based on the current context
   * 
   * @param fileId - File ID
   * @param cursorPosition - Cursor position
   * @param userId - User ID
   * @returns CodeCompletionResult
   */
  async completeCode(
    fileId: string,
    cursorPosition: number,
    userId: number
  ): Promise<CodeCompletionResult> {
    try {
      // Get file
      const file = await this.storage.findProjectFileById(parseInt(fileId));
      if (!file) {
        return { success: false, message: `File with ID ${fileId} not found` };
      }
      
      // Get project
      const project = await this.storage.findDevelopmentProjectByProjectId(file.projectId);
      if (!project) {
        return { success: false, message: `Project not found` };
      }
      
      // Extract code before and after cursor
      const codeBefore = file.content.substring(0, cursorPosition);
      const codeAfter = file.content.substring(cursorPosition);
      
      // Build context
      const context = {
        projectType: project.type,
        language: project.language,
        framework: project.framework,
        fileName: file.name,
        fileExtension: path.extname(file.name).substring(1),
        cursorPosition
      };
      
      // Call AI for code completion
      const result = await this.callAICodeCompletion(codeBefore, codeAfter, context);
      
      return result;
    } catch (err) {
      console.error('Error completing code:', err);
      return { success: false, message: `Error completing code: ${err.message}`, error: err };
    }
  }

  /**
   * Generate documentation for code
   * 
   * @param fileId - File ID
   * @param userId - User ID
   * @returns CodeDocumentationResult
   */
  async generateDocumentation(
    fileId: string,
    userId: number
  ): Promise<CodeDocumentationResult> {
    try {
      // Get file
      const file = await this.storage.findProjectFileById(parseInt(fileId));
      if (!file) {
        return { success: false, message: `File with ID ${fileId} not found` };
      }
      
      // Get project
      const project = await this.storage.findDevelopmentProjectByProjectId(file.projectId);
      if (!project) {
        return { success: false, message: `Project not found` };
      }
      
      // Check if file is a code file
      if (file.type !== FileType.CODE) {
        return { success: false, message: `File is not a code file` };
      }
      
      // Build context
      const context = {
        projectType: project.type,
        language: project.language,
        framework: project.framework,
        fileName: file.name,
        fileExtension: path.extname(file.name).substring(1)
      };
      
      // Call AI for documentation generation
      const result = await this.callAIDocumentation(file.content, context);
      
      if (result.success && result.documentation) {
        // Store generation record
        const codeGeneration: InsertAiCodeGeneration = {
          generationId: uuidv4(),
          projectId: file.projectId,
          fileId: file.fileId,
          prompt: `Generate documentation for ${file.name}`,
          result: result.documentation,
          usedContext: context,
          isApplied: false,
          createdBy: userId,
          model: result.model || 'default'
        };
        
        await this.storage.createAiCodeGeneration(codeGeneration);
      }
      
      return result;
    } catch (err) {
      console.error('Error generating documentation:', err);
      return { success: false, message: `Error generating documentation: ${err.message}`, error: err };
    }
  }

  /**
   * Build AI context from project and file information
   * 
   * @param project - Project
   * @param file - Optional file
   * @returns Context object
   */
  private async buildAIContext(
    project: DevelopmentProject,
    file: ProjectFile | null
  ): Promise<any> {
    // Basic project context
    const context: any = {
      projectName: project.name,
      projectType: project.type,
      language: project.language,
      framework: project.framework,
      projectConfig: project.config
    };
    
    // Add file context if provided
    if (file) {
      context.currentFile = {
        name: file.name,
        path: file.path,
        type: file.type,
        content: file.content,
        extension: path.extname(file.name).substring(1)
      };
      
      // Get parent directory files for additional context
      if (file.parentPath) {
        const directoryFiles = await this.storage.findProjectFilesByParentPath(project.projectId, file.parentPath);
        context.directoryFiles = directoryFiles.map(f => ({
          name: f.name,
          path: f.path,
          type: f.type,
          isDirectory: f.isDirectory
        }));
      }
    }
    
    // Get project structure
    const projectFiles = await this.storage.findProjectFilesByProjectId(project.projectId);
    
    // Add summary of project structure
    context.projectStructure = this.summarizeProjectStructure(projectFiles);
    
    // Add domain-specific assessment context
    context.domain = {
      type: 'property_assessment',
      specializedFor: 'tax_assessment_agencies',
      capabilities: [
        'property_valuation',
        'comparable_sales_analysis',
        'appeals_management',
        'compliance_reporting'
      ]
    };
    
    return context;
  }

  /**
   * Create a summary of project structure
   * 
   * @param files - Project files
   * @returns Project structure summary
   */
  private summarizeProjectStructure(files: ProjectFile[]): any {
    const structure: any = {};
    
    // Group files by directory
    for (const file of files) {
      const dirPath = file.isDirectory ? file.path : file.parentPath || '';
      
      if (!structure[dirPath]) {
        structure[dirPath] = {
          path: dirPath,
          files: [],
          directories: []
        };
      }
      
      if (file.isDirectory && file.path !== dirPath) {
        structure[dirPath].directories.push(file.name);
      } else if (!file.isDirectory) {
        structure[dirPath].files.push(file.name);
      }
    }
    
    return Object.values(structure);
  }

  /**
   * Call AI service for code generation
   * 
   * @param prompt - User prompt
   * @param context - Project context
   * @returns CodeGenerationResult
   */
  private async callAICodeGeneration(
    prompt: string,
    context: any
  ): Promise<CodeGenerationResult & { model?: string }> {
    try {
      // Check if OpenAI client is available
      if (this.openaiClient) {
        // Using OpenAI
        const result = await this.openaiCodeGeneration(prompt, context);
        return result;
      } else {
        // Fallback implementation
        return this.fallbackCodeGeneration(prompt, context);
      }
    } catch (err) {
      console.error('Error in AI code generation:', err);
      return { success: false, message: `AI service error: ${err.message}`, error: err };
    }
  }

  /**
   * Use OpenAI for code generation
   * 
   * @param prompt - User prompt
   * @param context - Project context
   * @returns CodeGenerationResult
   */
  private async openaiCodeGeneration(
    prompt: string,
    context: any
  ): Promise<CodeGenerationResult & { model?: string }> {
    try {
      // Building a comprehensive prompt with context
      const enhancedPrompt = this.buildEnhancedPrompt(prompt, context);
      
      // Call OpenAI API
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert programmer specializing in property assessment systems. Generate code that follows best practices and is well-documented. Return only the code without additional explanation.'
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        temperature: 0.2
      });
      
      // Extract code from response
      const generatedCode = response.choices[0].message.content.trim();
      
      // Remove markdown code blocks if present
      const cleanedCode = generatedCode.replace(/^```[\w]*\n([\s\S]*?)```$/m, '$1').trim();
      
      return {
        success: true,
        code: cleanedCode,
        model: response.model
      };
    } catch (err) {
      console.error('OpenAI code generation error:', err);
      return { success: false, message: `OpenAI error: ${err.message}`, error: err };
    }
  }

  /**
   * Fallback code generation when no AI service is available
   * 
   * @param prompt - User prompt
   * @param context - Project context
   * @returns CodeGenerationResult
   */
  private fallbackCodeGeneration(
    prompt: string,
    context: any
  ): Promise<CodeGenerationResult & { model?: string }> {
    // This is a fallback implementation that uses templates and patterns
    // based on the prompt and context to generate code without an external AI service
    
    const language = context.language?.toLowerCase() || 'javascript';
    const projectType = context.projectType?.toLowerCase() || 'web_application';
    let generatedCode = '';
    
    // Identify what kind of code to generate based on the prompt
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('property valuation') || promptLower.includes('calculate value')) {
      if (language === 'python') {
        generatedCode = this.getPropertyValuationPythonTemplate();
      } else if (language === 'javascript' || language === 'typescript') {
        generatedCode = this.getPropertyValuationJsTemplate();
      }
    } else if (promptLower.includes('comparable') || promptLower.includes('comparables') || promptLower.includes('sales comparison')) {
      if (language === 'python') {
        generatedCode = this.getComparableSalesPythonTemplate();
      } else if (language === 'javascript' || language === 'typescript') {
        generatedCode = this.getComparableSalesJsTemplate();
      }
    } else if (promptLower.includes('api') || promptLower.includes('endpoint') || promptLower.includes('route')) {
      if (language === 'python') {
        generatedCode = this.getApiEndpointPythonTemplate();
      } else if (language === 'javascript' || language === 'typescript') {
        generatedCode = this.getApiEndpointJsTemplate();
      }
    } else {
      // Generic function based on language
      if (language === 'python') {
        generatedCode = this.getGenericPythonTemplate(prompt);
      } else if (language === 'javascript' || language === 'typescript') {
        generatedCode = this.getGenericJsTemplate(prompt);
      }
    }
    
    return Promise.resolve({
      success: true,
      code: generatedCode,
      model: 'fallback-template'
    });
  }

  /**
   * Property valuation template for Python
   */
  private getPropertyValuationPythonTemplate(): string {
    return `
def calculate_property_value(property_data, comparable_sales=None, use_cost_approach=False):
    """
    Calculate property value using multiple approaches
    
    Args:
        property_data (dict): Property data including square_feet, bedrooms, bathrooms, etc.
        comparable_sales (list): List of comparable properties with sales data
        use_cost_approach (bool): Whether to include cost approach in calculation
        
    Returns:
        dict: Calculated values and approach details
    """
    # Initialize results
    results = {
        'estimated_value': 0,
        'confidence_score': 0,
        'approaches': {}
    }
    
    # Sales comparison approach (if comparable sales provided)
    if comparable_sales and len(comparable_sales) > 0:
        sales_value, sales_confidence = sales_comparison_approach(property_data, comparable_sales)
        results['approaches']['sales_comparison'] = {
            'value': sales_value,
            'confidence': sales_confidence,
            'weight': 0.7
        }
    
    # Income approach (if income data available)
    if 'annual_income' in property_data and 'expenses' in property_data:
        income_value, income_confidence = income_approach(
            property_data['annual_income'],
            property_data['expenses'],
            property_data.get('cap_rate', 0.08)
        )
        results['approaches']['income'] = {
            'value': income_value,
            'confidence': income_confidence,
            'weight': 0.2
        }
    
    # Cost approach (optional)
    if use_cost_approach:
        cost_value, cost_confidence = cost_approach(
            property_data.get('land_value', 0),
            property_data.get('improvement_value', 0),
            property_data.get('depreciation', 0)
        )
        results['approaches']['cost'] = {
            'value': cost_value,
            'confidence': cost_confidence,
            'weight': 0.1
        }
    
    # Calculate weighted average value and confidence
    total_weight = 0
    weighted_value = 0
    weighted_confidence = 0
    
    for approach_name, approach_data in results['approaches'].items():
        weighted_value += approach_data['value'] * approach_data['weight']
        weighted_confidence += approach_data['confidence'] * approach_data['weight']
        total_weight += approach_data['weight']
    
    if total_weight > 0:
        results['estimated_value'] = round(weighted_value / total_weight, 2)
        results['confidence_score'] = round(weighted_confidence / total_weight, 2)
    
    return results

def sales_comparison_approach(property_data, comparable_sales):
    """
    Estimate property value using sales comparison approach
    
    Args:
        property_data (dict): Subject property data
        comparable_sales (list): List of comparable properties with sales data
        
    Returns:
        tuple: (estimated_value, confidence_score)
    """
    if not comparable_sales:
        return 0, 0
    
    # Calculate adjustments for each comparable
    adjusted_values = []
    
    for comp in comparable_sales:
        # Start with the sale price
        adjusted_value = comp['sale_price']
        
        # Adjust for square footage difference
        if 'square_feet' in property_data and 'square_feet' in comp:
            sf_diff = property_data['square_feet'] - comp['square_feet']
            sf_adjustment = sf_diff * 100  # $100 per square foot adjustment
            adjusted_value += sf_adjustment
        
        # Adjust for bedroom difference
        if 'bedrooms' in property_data and 'bedrooms' in comp:
            bed_diff = property_data['bedrooms'] - comp['bedrooms']
            bed_adjustment = bed_diff * 5000  # $5000 per bedroom adjustment
            adjusted_value += bed_adjustment
        
        # Adjust for bathroom difference
        if 'bathrooms' in property_data and 'bathrooms' in comp:
            bath_diff = property_data['bathrooms'] - comp['bathrooms']
            bath_adjustment = bath_diff * 7500  # $7500 per bathroom adjustment
            adjusted_value += bath_adjustment
        
        # Calculate similarity score (0-1)
        similarity = calculate_similarity(property_data, comp)
        
        adjusted_values.append({
            'value': adjusted_value,
            'similarity': similarity
        })
    
    # Calculate weighted average based on similarity
    total_similarity = sum(item['similarity'] for item in adjusted_values)
    if total_similarity == 0:
        return 0, 0
    
    weighted_value = sum(item['value'] * item['similarity'] for item in adjusted_values) / total_similarity
    
    # Calculate confidence score based on number of comparables and similarity
    confidence = min(0.9, (len(comparable_sales) / 10) + (total_similarity / len(comparable_sales)))
    
    return round(weighted_value, 2), round(confidence, 2)

def calculate_similarity(subject, comparable):
    """Calculate similarity score between subject property and comparable"""
    # Implement similarity calculation logic here
    # Return value between 0 and 1
    return 0.8  # Simplified implementation
`;
  }

  /**
   * Property valuation template for JavaScript
   */
  private getPropertyValuationJsTemplate(): string {
    return `
/**
 * Calculate property value using multiple approaches
 * 
 * @param {Object} propertyData - Property data including squareFeet, bedrooms, bathrooms, etc.
 * @param {Array} comparableSales - List of comparable properties with sales data
 * @param {boolean} useCostApproach - Whether to include cost approach in calculation
 * @returns {Object} Calculated values and approach details
 */
function calculatePropertyValue(propertyData, comparableSales = [], useCostApproach = false) {
  // Initialize results
  const results = {
    estimatedValue: 0,
    confidenceScore: 0,
    approaches: {}
  };
  
  // Sales comparison approach (if comparable sales provided)
  if (comparableSales && comparableSales.length > 0) {
    const [salesValue, salesConfidence] = salesComparisonApproach(propertyData, comparableSales);
    results.approaches.salesComparison = {
      value: salesValue,
      confidence: salesConfidence,
      weight: 0.7
    };
  }
  
  // Income approach (if income data available)
  if (propertyData.annualIncome && propertyData.expenses) {
    const [incomeValue, incomeConfidence] = incomeApproach(
      propertyData.annualIncome,
      propertyData.expenses,
      propertyData.capRate || 0.08
    );
    results.approaches.income = {
      value: incomeValue,
      confidence: incomeConfidence,
      weight: 0.2
    };
  }
  
  // Cost approach (optional)
  if (useCostApproach) {
    const [costValue, costConfidence] = costApproach(
      propertyData.landValue || 0,
      propertyData.improvementValue || 0,
      propertyData.depreciation || 0
    );
    results.approaches.cost = {
      value: costValue,
      confidence: costConfidence,
      weight: 0.1
    };
  }
  
  // Calculate weighted average value and confidence
  let totalWeight = 0;
  let weightedValue = 0;
  let weightedConfidence = 0;
  
  for (const approach in results.approaches) {
    const approachData = results.approaches[approach];
    weightedValue += approachData.value * approachData.weight;
    weightedConfidence += approachData.confidence * approachData.weight;
    totalWeight += approachData.weight;
  }
  
  if (totalWeight > 0) {
    results.estimatedValue = Math.round((weightedValue / totalWeight) * 100) / 100;
    results.confidenceScore = Math.round((weightedConfidence / totalWeight) * 100) / 100;
  }
  
  return results;
}

/**
 * Estimate property value using sales comparison approach
 * 
 * @param {Object} propertyData - Subject property data
 * @param {Array} comparableSales - List of comparable properties with sales data
 * @returns {Array} [estimatedValue, confidenceScore]
 */
function salesComparisonApproach(propertyData, comparableSales) {
  if (!comparableSales || comparableSales.length === 0) {
    return [0, 0];
  }
  
  // Calculate adjustments for each comparable
  const adjustedValues = comparableSales.map(comp => {
    // Start with the sale price
    let adjustedValue = comp.salePrice;
    
    // Adjust for square footage difference
    if (propertyData.squareFeet !== undefined && comp.squareFeet !== undefined) {
      const sfDiff = propertyData.squareFeet - comp.squareFeet;
      const sfAdjustment = sfDiff * 100; // $100 per square foot adjustment
      adjustedValue += sfAdjustment;
    }
    
    // Adjust for bedroom difference
    if (propertyData.bedrooms !== undefined && comp.bedrooms !== undefined) {
      const bedDiff = propertyData.bedrooms - comp.bedrooms;
      const bedAdjustment = bedDiff * 5000; // $5000 per bedroom adjustment
      adjustedValue += bedAdjustment;
    }
    
    // Adjust for bathroom difference
    if (propertyData.bathrooms !== undefined && comp.bathrooms !== undefined) {
      const bathDiff = propertyData.bathrooms - comp.bathrooms;
      const bathAdjustment = bathDiff * 7500; // $7500 per bathroom adjustment
      adjustedValue += bathAdjustment;
    }
    
    // Calculate similarity score (0-1)
    const similarity = calculateSimilarity(propertyData, comp);
    
    return {
      value: adjustedValue,
      similarity
    };
  });
  
  // Calculate weighted average based on similarity
  const totalSimilarity = adjustedValues.reduce((sum, item) => sum + item.similarity, 0);
  if (totalSimilarity === 0) {
    return [0, 0];
  }
  
  const weightedValue = adjustedValues.reduce(
    (sum, item) => sum + (item.value * item.similarity), 
    0
  ) / totalSimilarity;
  
  // Calculate confidence score based on number of comparables and similarity
  const confidence = Math.min(0.9, (comparableSales.length / 10) + (totalSimilarity / comparableSales.length));
  
  return [Math.round(weightedValue * 100) / 100, Math.round(confidence * 100) / 100];
}

/**
 * Calculate similarity score between subject property and comparable
 * 
 * @param {Object} subject - Subject property
 * @param {Object} comparable - Comparable property
 * @returns {number} Similarity score between 0 and 1
 */
function calculateSimilarity(subject, comparable) {
  // Implement similarity calculation logic here
  // Return value between 0 and 1
  return 0.8; // Simplified implementation
}
`;
  }

  /**
   * Comparable sales template for Python
   */
  private getComparableSalesPythonTemplate(): string {
    return `
import math
from datetime import datetime
from typing import List, Dict, Tuple, Any, Optional

class ComparableSalesAnalyzer:
    """
    Analyze comparable property sales to determine estimated property value
    """
    
    def __init__(self, max_distance_miles: float = 5.0, max_time_days: int = 365, min_similarity: float = 0.5):
        """
        Initialize the analyzer with parameters
        
        Args:
            max_distance_miles: Maximum distance in miles to consider comparables
            max_time_days: Maximum time difference in days to consider comparables
            min_similarity: Minimum similarity score (0-1) to consider comparables
        """
        self.max_distance_miles = max_distance_miles
        self.max_time_days = max_time_days
        self.min_similarity = min_similarity
        self.adjustment_factors = {
            'square_feet': 100,      # $100 per sq ft
            'bedrooms': 5000,        # $5000 per bedroom
            'bathrooms': 7500,       # $7500 per bathroom
            'age': -500,             # -$500 per year of age
            'lot_size': 2.5,         # $2.5 per sq ft of lot
            'garage': 10000,         # $10000 per garage space
            'pool': 15000,           # $15000 for pool
            'quality': 10000,        # $10000 per quality level
            'condition': 7500        # $7500 per condition level
        }
    
    def find_comparables(self, subject_property: Dict[str, Any], all_properties: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Find comparable properties based on criteria
        
        Args:
            subject_property: The subject property data
            all_properties: List of all properties to search through
            
        Returns:
            List of comparable properties with similarity scores
        """
        comparables = []
        
        for prop in all_properties:
            # Skip if it's the same property
            if prop.get('property_id') == subject_property.get('property_id'):
                continue
            
            # Calculate distance
            distance = self._calculate_distance(
                subject_property.get('latitude', 0),
                subject_property.get('longitude', 0),
                prop.get('latitude', 0),
                prop.get('longitude', 0)
            )
            
            # Skip if too far away
            if distance > self.max_distance_miles:
                continue
            
            # Calculate time difference if sale date exists
            time_diff_days = None
            if 'sale_date' in prop and prop['sale_date']:
                sale_date = prop['sale_date']
                if isinstance(sale_date, str):
                    sale_date = datetime.strptime(sale_date, '%Y-%m-%d')
                current_date = datetime.now()
                time_diff_days = (current_date - sale_date).days
            
            # Skip if sale is too old
            if time_diff_days and time_diff_days > self.max_time_days:
                continue
            
            # Calculate similarity score
            similarity = self._calculate_similarity(subject_property, prop)
            
            # Skip if not similar enough
            if similarity < self.min_similarity:
                continue
            
            # Calculate adjusted value
            adjusted_value = self._calculate_adjusted_value(subject_property, prop)
            
            comparables.append({
                'property': prop,
                'distance': distance,
                'time_diff_days': time_diff_days,
                'similarity': similarity,
                'adjusted_value': adjusted_value
            })
        
        # Sort by similarity (most similar first)
        comparables.sort(key=lambda x: x['similarity'], reverse=True)
        
        return comparables
    
    def estimate_value(self, subject_property: Dict[str, Any], comparables: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Estimate property value based on comparables
        
        Args:
            subject_property: The subject property data
            comparables: List of comparable properties from find_comparables()
            
        Returns:
            Dictionary with estimated value and confidence score
        """
        if not comparables:
            return {
                'estimated_value': 0,
                'confidence_score': 0,
                'comparables_used': 0,
                'value_range': {'min': 0, 'max': 0}
            }
        
        # Calculate weighted average value
        total_weight = 0
        weighted_value = 0
        values = []
        
        for comp in comparables:
            # Weight by similarity
            weight = comp['similarity']
            adjusted_value = comp['adjusted_value']
            
            weighted_value += adjusted_value * weight
            total_weight += weight
            values.append(adjusted_value)
        
        estimated_value = round(weighted_value / total_weight, 2) if total_weight > 0 else 0
        
        # Calculate value range
        values.sort()
        min_value = values[0]
        max_value = values[-1]
        
        # Calculate confidence score based on:
        # - Number of comparables
        # - Range of values
        # - Average similarity
        num_comparables_factor = min(1.0, len(comparables) / 10)
        
        value_range_factor = 1.0
        if estimated_value > 0:
            range_percent = (max_value - min_value) / estimated_value
            value_range_factor = max(0.0, 1.0 - range_percent)
        
        similarity_factor = sum(comp['similarity'] for comp in comparables) / len(comparables)
        
        confidence_score = (num_comparables_factor * 0.4) + (value_range_factor * 0.3) + (similarity_factor * 0.3)
        confidence_score = round(min(1.0, confidence_score), 2)
        
        return {
            'estimated_value': estimated_value,
            'confidence_score': confidence_score,
            'comparables_used': len(comparables),
            'value_range': {
                'min': min_value,
                'max': max_value
            }
        }
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in miles using Haversine formula"""
        if lat1 == lat2 and lon1 == lon2:
            return 0
            
        # Convert latitude and longitude to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Haversine formula
        dlon = lon2_rad - lon1_rad
        dlat = lat2_rad - lat1_rad
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        # Earth radius in miles
        radius = 3956
        
        # Calculate distance
        distance = radius * c
        
        return round(distance, 2)
    
    def _calculate_similarity(self, subject: Dict[str, Any], comp: Dict[str, Any]) -> float:
        """Calculate similarity score between subject property and comparable"""
        factors = {
            'property_type': 0.25,
            'square_feet': 0.20,
            'bedrooms': 0.05,
            'bathrooms': 0.05,
            'year_built': 0.10,
            'lot_size': 0.10,
            'neighborhood': 0.15,
            'quality': 0.05,
            'condition': 0.05
        }
        
        total_score = 0
        applicable_weight = 0
        
        # Compare each factor
        for factor, weight in factors.items():
            if factor in subject and factor in comp:
                factor_score = self._compare_factor(factor, subject[factor], comp[factor])
                total_score += factor_score * weight
                applicable_weight += weight
        
        # Normalize score based on applicable factors
        if applicable_weight > 0:
            similarity = total_score / applicable_weight
        else:
            similarity = 0
        
        return round(similarity, 2)
    
    def _compare_factor(self, factor: str, subject_value: Any, comp_value: Any) -> float:
        """Compare individual property factors and return similarity (0-1)"""
        if factor == 'property_type':
            return 1.0 if subject_value == comp_value else 0.0
            
        elif factor == 'neighborhood':
            return 1.0 if subject_value == comp_value else 0.0
            
        elif factor in ['square_feet', 'lot_size']:
            # For area measurements, calculate percent difference
            if subject_value == 0 or comp_value == 0:
                return 0.0
                
            ratio = min(subject_value, comp_value) / max(subject_value, comp_value)
            return ratio
            
        elif factor in ['bedrooms', 'bathrooms']:
            # For room counts, use a sliding scale
            diff = abs(subject_value - comp_value)
            if diff == 0:
                return 1.0
            elif diff <= 1:
                return 0.7
            elif diff <= 2:
                return 0.4
            else:
                return 0.0
                
        elif factor == 'year_built':
            # For age, use a sliding scale based on years
            diff = abs(subject_value - comp_value)
            if diff <= 2:
                return 1.0
            elif diff <= 5:
                return 0.8
            elif diff <= 10:
                return 0.6
            elif diff <= 20:
                return 0.4
            else:
                return 0.2
                
        elif factor in ['quality', 'condition']:
            # For ratings, normalize the difference
            diff = abs(subject_value - comp_value)
            max_diff = 5  # Assuming 1-5 scale
            return 1.0 - (diff / max_diff)
            
        return 0.0  # Default if comparison not defined
        
    def _calculate_adjusted_value(self, subject: Dict[str, Any], comp: Dict[str, Any]) -> float:
        """Calculate adjusted value of comparable property based on subject property"""
        if 'sale_price' not in comp:
            return 0
            
        adjusted_value = comp['sale_price']
        
        # Apply adjustments for each factor
        for factor, adjustment_rate in self.adjustment_factors.items():
            if factor in subject and factor in comp:
                diff = subject[factor] - comp[factor]
                adjustment = diff * adjustment_rate
                adjusted_value += adjustment
        
        return round(adjusted_value, 2)
`;
  }

  /**
   * Comparable sales template for JavaScript
   */
  private getComparableSalesJsTemplate(): string {
    return `
/**
 * Analyzes comparable property sales to determine estimated property value
 */
class ComparableSalesAnalyzer {
  /**
   * Initialize the analyzer with parameters
   * 
   * @param {number} maxDistanceMiles - Maximum distance in miles to consider comparables
   * @param {number} maxTimeDays - Maximum time difference in days to consider comparables
   * @param {number} minSimilarity - Minimum similarity score (0-1) to consider comparables
   */
  constructor(maxDistanceMiles = 5.0, maxTimeDays = 365, minSimilarity = 0.5) {
    this.maxDistanceMiles = maxDistanceMiles;
    this.maxTimeDays = maxTimeDays;
    this.minSimilarity = minSimilarity;
    this.adjustmentFactors = {
      squareFeet: 100,    // $100 per sq ft
      bedrooms: 5000,     // $5000 per bedroom
      bathrooms: 7500,    // $7500 per bathroom
      age: -500,          // -$500 per year of age
      lotSize: 2.5,       // $2.5 per sq ft of lot
      garage: 10000,      // $10000 per garage space
      pool: 15000,        // $15000 for pool
      quality: 10000,     // $10000 per quality level
      condition: 7500     // $7500 per condition level
    };
  }

  /**
   * Find comparable properties based on criteria
   * 
   * @param {Object} subjectProperty - The subject property data
   * @param {Array} allProperties - List of all properties to search through
   * @returns {Array} List of comparable properties with similarity scores
   */
  findComparables(subjectProperty, allProperties) {
    const comparables = [];
    
    for (const prop of allProperties) {
      // Skip if it's the same property
      if (prop.propertyId === subjectProperty.propertyId) {
        continue;
      }
      
      // Calculate distance
      const distance = this._calculateDistance(
        subjectProperty.latitude || 0,
        subjectProperty.longitude || 0,
        prop.latitude || 0,
        prop.longitude || 0
      );
      
      // Skip if too far away
      if (distance > this.maxDistanceMiles) {
        continue;
      }
      
      // Calculate time difference if sale date exists
      let timeDiffDays = null;
      if (prop.saleDate) {
        const saleDate = new Date(prop.saleDate);
        const currentDate = new Date();
        timeDiffDays = Math.floor((currentDate - saleDate) / (1000 * 60 * 60 * 24));
      }
      
      // Skip if sale is too old
      if (timeDiffDays !== null && timeDiffDays > this.maxTimeDays) {
        continue;
      }
      
      // Calculate similarity score
      const similarity = this._calculateSimilarity(subjectProperty, prop);
      
      // Skip if not similar enough
      if (similarity < this.minSimilarity) {
        continue;
      }
      
      // Calculate adjusted value
      const adjustedValue = this._calculateAdjustedValue(subjectProperty, prop);
      
      comparables.push({
        property: prop,
        distance,
        timeDiffDays,
        similarity,
        adjustedValue
      });
    }
    
    // Sort by similarity (most similar first)
    comparables.sort((a, b) => b.similarity - a.similarity);
    
    return comparables;
  }

  /**
   * Estimate property value based on comparables
   * 
   * @param {Object} subjectProperty - The subject property data
   * @param {Array} comparables - List of comparable properties from findComparables()
   * @returns {Object} Dictionary with estimated value and confidence score
   */
  estimateValue(subjectProperty, comparables) {
    if (!comparables || comparables.length === 0) {
      return {
        estimatedValue: 0,
        confidenceScore: 0,
        comparablesUsed: 0,
        valueRange: { min: 0, max: 0 }
      };
    }
    
    // Calculate weighted average value
    let totalWeight = 0;
    let weightedValue = 0;
    const values = [];
    
    for (const comp of comparables) {
      // Weight by similarity
      const weight = comp.similarity;
      const adjustedValue = comp.adjustedValue;
      
      weightedValue += adjustedValue * weight;
      totalWeight += weight;
      values.push(adjustedValue);
    }
    
    const estimatedValue = totalWeight > 0 ? Math.round((weightedValue / totalWeight) * 100) / 100 : 0;
    
    // Calculate value range
    values.sort((a, b) => a - b);
    const minValue = values[0];
    const maxValue = values[values.length - 1];
    
    // Calculate confidence score based on:
    // - Number of comparables
    // - Range of values
    // - Average similarity
    const numComparablesFactor = Math.min(1.0, comparables.length / 10);
    
    let valueRangeFactor = 1.0;
    if (estimatedValue > 0) {
      const rangePercent = (maxValue - minValue) / estimatedValue;
      valueRangeFactor = Math.max(0.0, 1.0 - rangePercent);
    }
    
    const similarityFactor = comparables.reduce((sum, comp) => sum + comp.similarity, 0) / comparables.length;
    
    const confidenceScore = (numComparablesFactor * 0.4) + (valueRangeFactor * 0.3) + (similarityFactor * 0.3);
    
    return {
      estimatedValue,
      confidenceScore: Math.round(Math.min(1.0, confidenceScore) * 100) / 100,
      comparablesUsed: comparables.length,
      valueRange: {
        min: minValue,
        max: maxValue
      }
    };
  }

  /**
   * Calculate distance between two points in miles using Haversine formula
   * 
   * @private
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} Distance in miles
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2) {
      return 0;
    }
      
    // Convert latitude and longitude to radians
    const lat1Rad = this._toRadians(lat1);
    const lon1Rad = this._toRadians(lon1);
    const lat2Rad = this._toRadians(lat2);
    const lon2Rad = this._toRadians(lon2);
    
    // Haversine formula
    const dlon = lon2Rad - lon1Rad;
    const dlat = lat2Rad - lat1Rad;
    const a = Math.sin(dlat/2)**2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dlon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    // Earth radius in miles
    const radius = 3956;
    
    // Calculate distance
    const distance = radius * c;
    
    return Math.round(distance * 100) / 100;
  }

  /**
   * Convert degrees to radians
   * 
   * @private
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  _toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate similarity score between subject property and comparable
   * 
   * @private
   * @param {Object} subject - Subject property
   * @param {Object} comp - Comparable property
   * @returns {number} Similarity score between 0 and 1
   */
  _calculateSimilarity(subject, comp) {
    const factors = {
      propertyType: 0.25,
      squareFeet: 0.20,
      bedrooms: 0.05,
      bathrooms: 0.05,
      yearBuilt: 0.10,
      lotSize: 0.10,
      neighborhood: 0.15,
      quality: 0.05,
      condition: 0.05
    };
    
    let totalScore = 0;
    let applicableWeight = 0;
    
    // Compare each factor
    for (const [factor, weight] of Object.entries(factors)) {
      if (subject[factor] !== undefined && comp[factor] !== undefined) {
        const factorScore = this._compareFactor(factor, subject[factor], comp[factor]);
        totalScore += factorScore * weight;
        applicableWeight += weight;
      }
    }
    
    // Normalize score based on applicable factors
    const similarity = applicableWeight > 0 ? totalScore / applicableWeight : 0;
    
    return Math.round(similarity * 100) / 100;
  }

  /**
   * Compare individual property factors and return similarity (0-1)
   * 
   * @private
   * @param {string} factor - Property factor name
   * @param {*} subjectValue - Subject property value
   * @param {*} compValue - Comparable property value
   * @returns {number} Similarity score between 0 and 1
   */
  _compareFactor(factor, subjectValue, compValue) {
    if (factor === 'propertyType') {
      return subjectValue === compValue ? 1.0 : 0.0;
      
    } else if (factor === 'neighborhood') {
      return subjectValue === compValue ? 1.0 : 0.0;
      
    } else if (['squareFeet', 'lotSize'].includes(factor)) {
      // For area measurements, calculate percent difference
      if (subjectValue === 0 || compValue === 0) {
        return 0.0;
      }
        
      const ratio = Math.min(subjectValue, compValue) / Math.max(subjectValue, compValue);
      return ratio;
      
    } else if (['bedrooms', 'bathrooms'].includes(factor)) {
      // For room counts, use a sliding scale
      const diff = Math.abs(subjectValue - compValue);
      if (diff === 0) {
        return 1.0;
      } else if (diff <= 1) {
        return 0.7;
      } else if (diff <= 2) {
        return 0.4;
      } else {
        return 0.0;
      }
        
    } else if (factor === 'yearBuilt') {
      // For age, use a sliding scale based on years
      const diff = Math.abs(subjectValue - compValue);
      if (diff <= 2) {
        return 1.0;
      } else if (diff <= 5) {
        return 0.8;
      } else if (diff <= 10) {
        return 0.6;
      } else if (diff <= 20) {
        return 0.4;
      } else {
        return 0.2;
      }
        
    } else if (['quality', 'condition'].includes(factor)) {
      // For ratings, normalize the difference
      const diff = Math.abs(subjectValue - compValue);
      const maxDiff = 5;  // Assuming 1-5 scale
      return 1.0 - (diff / maxDiff);
    }
    
    return 0.0;  // Default if comparison not defined
  }

  /**
   * Calculate adjusted value of comparable property based on subject property
   * 
   * @private
   * @param {Object} subject - Subject property
   * @param {Object} comp - Comparable property
   * @returns {number} Adjusted value
   */
  _calculateAdjustedValue(subject, comp) {
    if (!comp.salePrice) {
      return 0;
    }
      
    let adjustedValue = comp.salePrice;
    
    // Apply adjustments for each factor
    for (const [factor, adjustmentRate] of Object.entries(this.adjustmentFactors)) {
      if (subject[factor] !== undefined && comp[factor] !== undefined) {
        const diff = subject[factor] - comp[factor];
        const adjustment = diff * adjustmentRate;
        adjustedValue += adjustment;
      }
    }
    
    return Math.round(adjustedValue * 100) / 100;
  }
}

// Export the class
module.exports = ComparableSalesAnalyzer;
`;
  }

  /**
   * API endpoint template for Python
   */
  private getApiEndpointPythonTemplate(): string {
    return `
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import uuid

# Define property models
class PropertyBase(BaseModel):
    property_id: Optional[str] = None
    address: str
    city: str
    state: str
    zip_code: str
    property_type: str
    square_feet: float
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    year_built: Optional[int] = None
    lot_size: Optional[float] = None
    last_sale_price: Optional[float] = None
    last_sale_date: Optional[datetime] = None
    estimated_value: Optional[float] = None
    
class PropertyCreate(PropertyBase):
    pass
    
class PropertyUpdate(PropertyBase):
    pass
    
class PropertyResponse(PropertyBase):
    property_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Value request and response models
class ValueRequest(BaseModel):
    property_id: str
    use_comparables: bool = True
    use_cost_approach: bool = False
    
class ValueResponse(BaseModel):
    property_id: str
    estimated_value: float
    confidence_score: float
    approaches: Dict[str, Any]
    comparable_properties: Optional[List[Dict[str, Any]]] = None
    generated_at: datetime

# Create router
router = APIRouter(
    prefix="/api/properties",
    tags=["properties"],
    responses={404: {"description": "Not found"}}
)

# Dummy storage for demonstration
properties_db = {}

# GET all properties
@router.get("/", response_model=List[PropertyResponse])
async def get_all_properties(
    property_type: Optional[str] = None,
    city: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    limit: int = Query(100, gt=0, le=1000)
):
    """
    Get all properties with optional filtering
    """
    result = list(properties_db.values())
    
    # Apply filters
    if property_type:
        result = [p for p in result if p.get("property_type") == property_type]
    
    if city:
        result = [p for p in result if p.get("city") == city]
    
    if min_value is not None:
        result = [p for p in result if p.get("estimated_value", 0) >= min_value]
    
    if max_value is not None:
        result = [p for p in result if p.get("estimated_value", 0) <= max_value]
    
    # Apply limit
    result = result[:limit]
    
    return result

# GET property by ID
@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str):
    """
    Get a specific property by ID
    """
    if property_id not in properties_db:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return properties_db[property_id]

# POST create new property
@router.post("/", response_model=PropertyResponse, status_code=201)
async def create_property(property_data: PropertyCreate):
    """
    Create a new property
    """
    # Generate ID if not provided
    property_id = property_data.property_id or f"PROP-{uuid.uuid4().hex[:8].upper()}"
    
    # Check if property already exists
    if property_id in properties_db:
        raise HTTPException(status_code=400, detail="Property with this ID already exists")
    
    # Create property record
    now = datetime.now()
    property_record = {
        **property_data.dict(),
        "property_id": property_id,
        "created_at": now,
        "updated_at": now
    }
    
    # Store in dummy database
    properties_db[property_id] = property_record
    
    return property_record

# PUT update property
@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(property_id: str, property_data: PropertyUpdate):
    """
    Update an existing property
    """
    # Check if property exists
    if property_id not in properties_db:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get existing property
    existing_property = properties_db[property_id]
    
    # Update property
    updated_property = {
        **existing_property,
        **property_data.dict(exclude_unset=True),
        "updated_at": datetime.now()
    }
    
    # Store updated property
    properties_db[property_id] = updated_property
    
    return updated_property

# DELETE property
@router.delete("/{property_id}", status_code=204)
async def delete_property(property_id: str):
    """
    Delete a property
    """
    # Check if property exists
    if property_id not in properties_db:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Delete property
    del properties_db[property_id]
    
    return None

# POST calculate property value
@router.post("/{property_id}/value", response_model=ValueResponse)
async def calculate_property_value(property_id: str, request: ValueRequest):
    """
    Calculate the estimated value of a property
    """
    # Check if property exists
    if property_id not in properties_db:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get property
    property_data = properties_db[property_id]
    
    # In a real implementation, this would call a valuation service
    # For demonstration, we'll return a mock response
    
    # Mock valuation result
    value_result = {
        "property_id": property_id,
        "estimated_value": property_data.get("last_sale_price", 0) * 1.05,  # 5% higher than last sale price
        "confidence_score": 0.85,
        "approaches": {
            "sales_comparison": {
                "value": property_data.get("last_sale_price", 0) * 1.03,
                "confidence": 0.9,
                "weight": 0.7
            },
            "cost": {
                "value": property_data.get("last_sale_price", 0) * 1.08,
                "confidence": 0.8,
                "weight": 0.3
            }
        },
        "comparable_properties": [] if not request.use_comparables else [
            # Mock comparables would be included here
        ],
        "generated_at": datetime.now()
    }
    
    return value_result
`;
  }

  /**
   * API endpoint template for JavaScript
   */
  private getApiEndpointJsTemplate(): string {
    return `
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Dummy storage for demonstration
const propertiesDb = new Map();

/**
 * @typedef {Object} Property
 * @property {string} propertyId
 * @property {string} address
 * @property {string} city
 * @property {string} state
 * @property {string} zipCode
 * @property {string} propertyType
 * @property {number} squareFeet
 * @property {number} [bedrooms]
 * @property {number} [bathrooms]
 * @property {number} [yearBuilt]
 * @property {number} [lotSize]
 * @property {number} [lastSalePrice]
 * @property {string} [lastSaleDate]
 * @property {number} [estimatedValue]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ValueRequest
 * @property {string} propertyId
 * @property {boolean} [useComparables=true]
 * @property {boolean} [useCostApproach=false]
 */

/**
 * @typedef {Object} ValueResponse
 * @property {string} propertyId
 * @property {number} estimatedValue
 * @property {number} confidenceScore
 * @property {Object} approaches
 * @property {Array} [comparableProperties]
 * @property {string} generatedAt
 */

/**
 * Middleware to validate property ID
 */
function validatePropertyId(req, res, next) {
  const { propertyId } = req.params;
  
  if (!propertiesDb.has(propertyId)) {
    return res.status(404).json({ error: 'Property not found' });
  }
  
  next();
}

/**
 * GET all properties
 * 
 * @route GET /api/properties
 * @query {string} [propertyType] - Filter by property type
 * @query {string} [city] - Filter by city
 * @query {number} [minValue] - Filter by minimum value
 * @query {number} [maxValue] - Filter by maximum value
 * @query {number} [limit=100] - Maximum number of results
 * @returns {Array<Property>} List of properties
 */
router.get('/', (req, res) => {
  const { propertyType, city, minValue, maxValue, limit = 100 } = req.query;
  
  let result = Array.from(propertiesDb.values());
  
  // Apply filters
  if (propertyType) {
    result = result.filter(p => p.propertyType === propertyType);
  }
  
  if (city) {
    result = result.filter(p => p.city === city);
  }
  
  if (minValue !== undefined) {
    result = result.filter(p => (p.estimatedValue || 0) >= Number(minValue));
  }
  
  if (maxValue !== undefined) {
    result = result.filter(p => (p.estimatedValue || 0) <= Number(maxValue));
  }
  
  // Apply limit
  result = result.slice(0, Math.min(Number(limit), 1000));
  
  res.json(result);
});

/**
 * GET property by ID
 * 
 * @route GET /api/properties/:propertyId
 * @param {string} propertyId - Property ID
 * @returns {Property} Property object
 */
router.get('/:propertyId', validatePropertyId, (req, res) => {
  const { propertyId } = req.params;
  res.json(propertiesDb.get(propertyId));
});

/**
 * POST create new property
 * 
 * @route POST /api/properties
 * @body {Property} property - Property data
 * @returns {Property} Created property
 */
router.post('/', (req, res) => {
  const propertyData = req.body;
  
  // Generate ID if not provided
  const propertyId = propertyData.propertyId || \`PROP-\${uuidv4().substr(0, 8).toUpperCase()}\`;
  
  // Check if property already exists
  if (propertiesDb.has(propertyId)) {
    return res.status(400).json({ error: 'Property with this ID already exists' });
  }
  
  // Create property record
  const now = new Date().toISOString();
  const propertyRecord = {
    ...propertyData,
    propertyId,
    createdAt: now,
    updatedAt: now
  };
  
  // Store in dummy database
  propertiesDb.set(propertyId, propertyRecord);
  
  res.status(201).json(propertyRecord);
});

/**
 * PUT update property
 * 
 * @route PUT /api/properties/:propertyId
 * @param {string} propertyId - Property ID
 * @body {Property} property - Updated property data
 * @returns {Property} Updated property
 */
router.put('/:propertyId', validatePropertyId, (req, res) => {
  const { propertyId } = req.params;
  const propertyData = req.body;
  
  // Get existing property
  const existingProperty = propertiesDb.get(propertyId);
  
  // Update property
  const updatedProperty = {
    ...existingProperty,
    ...propertyData,
    propertyId, // Ensure ID doesn't change
    updatedAt: new Date().toISOString()
  };
  
  // Store updated property
  propertiesDb.set(propertyId, updatedProperty);
  
  res.json(updatedProperty);
});

/**
 * DELETE property
 * 
 * @route DELETE /api/properties/:propertyId
 * @param {string} propertyId - Property ID
 */
router.delete('/:propertyId', validatePropertyId, (req, res) => {
  const { propertyId } = req.params;
  
  // Delete property
  propertiesDb.delete(propertyId);
  
  res.status(204).end();
});

/**
 * POST calculate property value
 * 
 * @route POST /api/properties/:propertyId/value
 * @param {string} propertyId - Property ID
 * @body {ValueRequest} request - Value calculation request
 * @returns {ValueResponse} Value calculation result
 */
router.post('/:propertyId/value', validatePropertyId, (req, res) => {
  const { propertyId } = req.params;
  const { useComparables = true, useCostApproach = false } = req.body;
  
  // Get property
  const propertyData = propertiesDb.get(propertyId);
  
  // In a real implementation, this would call a valuation service
  // For demonstration, we'll return a mock response
  
  // Mock valuation result
  const valueResult = {
    propertyId,
    estimatedValue: (propertyData.lastSalePrice || 250000) * 1.05, // 5% higher than last sale price
    confidenceScore: 0.85,
    approaches: {
      salesComparison: {
        value: (propertyData.lastSalePrice || 250000) * 1.03,
        confidence: 0.9,
        weight: 0.7
      },
      cost: {
        value: (propertyData.lastSalePrice || 250000) * 1.08,
        confidence: 0.8,
        weight: 0.3
      }
    },
    comparableProperties: !useComparables ? [] : [
      // Mock comparables would be included here
    ],
    generatedAt: new Date().toISOString()
  };
  
  res.json(valueResult);
});

module.exports = router;
`;
  }

  /**
   * Generic Python template
   */
  private getGenericPythonTemplate(prompt: string): string {
    const functionName = this.extractFunctionNameFromPrompt(prompt) || 'process_data';
    
    return `
def ${functionName}(input_data):
    """
    Process the input data based on the given parameters
    
    Args:
        input_data: The data to process
        
    Returns:
        Processed data
    """
    # Initialize result
    result = {}
    
    # Process the data
    # This is where your custom logic would go
    
    # For demonstration, just return a simple transformation
    if isinstance(input_data, dict):
        result = {
            "processed": True,
            "original": input_data,
            "summary": f"Processed {len(input_data)} keys"
        }
    elif isinstance(input_data, list):
        result = {
            "processed": True,
            "count": len(input_data),
            "summary": f"Processed {len(input_data)} items"
        }
    else:
        result = {
            "processed": True,
            "value": str(input_data),
            "summary": "Processed single value"
        }
    
    return result

# Example usage
if __name__ == "__main__":
    test_data = {
        "id": "property123",
        "value": 250000,
        "features": ["garage", "pool", "updated kitchen"]
    }
    
    print(${functionName}(test_data))
`;
  }

  /**
   * Generic JavaScript template
   */
  private getGenericJsTemplate(prompt: string): string {
    const functionName = this.extractFunctionNameFromPrompt(prompt) || 'processData';
    
    return `
/**
 * Process the input data based on the given parameters
 * 
 * @param {any} inputData - The data to process
 * @returns {Object} Processed data
 */
function ${functionName}(inputData) {
  // Initialize result
  const result = {};
  
  // Process the data
  // This is where your custom logic would go
  
  // For demonstration, just return a simple transformation
  if (typeof inputData === 'object' && inputData !== null) {
    if (Array.isArray(inputData)) {
      result.processed = true;
      result.count = inputData.length;
      result.summary = \`Processed \${inputData.length} items\`;
    } else {
      result.processed = true;
      result.original = inputData;
      result.summary = \`Processed \${Object.keys(inputData).length} keys\`;
    }
  } else {
    result.processed = true;
    result.value = String(inputData);
    result.summary = "Processed single value";
  }
  
  return result;
}

// Example usage
const testData = {
  id: "property123",
  value: 250000,
  features: ["garage", "pool", "updated kitchen"]
};

console.log(${functionName}(testData));

// Export the function
module.exports = ${functionName};
`;
  }

  /**
   * Extract function name from prompt
   */
  private extractFunctionNameFromPrompt(prompt: string): string | null {
    // Look for patterns like "create a function to...", "implement a function that...", etc.
    const functionPatterns = [
      /function\s+to\s+(\w+)/i, 
      /function\s+that\s+(\w+)s/i,
      /(\w+)\s+function/i,
      /create\s+(\w+)/i,
      /implement\s+(\w+)/i
    ];
    
    for (const pattern of functionPatterns) {
      const match = prompt.match(pattern);
      if (match && match[1]) {
        // Convert to camelCase
        return match[1].toLowerCase().replace(/[^a-z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
      }
    }
    
    return null;
  }

  /**
   * Build enhanced prompt with context
   */
  private buildEnhancedPrompt(prompt: string, context: any): string {
    let enhancedPrompt = `
You are a specialized AI assistant for property assessment code generation. Generate code based on the following request:

${prompt}

### Project Information:
- Project Name: ${context.projectName || 'Unknown'}
- Project Type: ${context.projectType || 'Unknown'}
- Language: ${context.language || 'Unknown'}
- Framework: ${context.framework || 'Unknown'}

### Domain:
This is a property assessment application that handles:
${context.domain ? Object.entries(context.domain).map(([key, value]) => `- ${key}: ${value}`).join('\n') : 'N/A'}

`;

    // Add file context if available
    if (context.currentFile) {
      enhancedPrompt += `
### Current File:
- Name: ${context.currentFile.name}
- Path: ${context.currentFile.path}
- Type: ${context.currentFile.type}
- Extension: ${context.currentFile.extension}

${context.currentFile.content ? '### Current File Content (partial):\n```\n' + this.getContentPreview(context.currentFile.content) + '\n```\n' : ''}
`;
    }

    enhancedPrompt += `
### Additional Instructions:
- Generate well-documented, production-quality code
- Follow best practices for the language and framework
- Include appropriate error handling
- Consider performance and maintainability
- Return ONLY the generated code without additional explanations

Now please generate the code:
`;

    return enhancedPrompt;
  }

  /**
   * Get preview of file content
   */
  private getContentPreview(content: string, maxLines: number = 20): string {
    const lines = content.split('\n');
    if (lines.length <= maxLines) {
      return content;
    }
    return lines.slice(0, maxLines).join('\n') + '\n// ... (content truncated)';
  }

  /**
   * Call AI service for code completion
   */
  private async callAICodeCompletion(
    codeBefore: string,
    codeAfter: string,
    context: any
  ): Promise<CodeCompletionResult & { model?: string }> {
    try {
      // Check if OpenAI client is available
      if (this.openaiClient) {
        // Call OpenAI for completion
        const prompt = `
Complete the following code. Only return the completion, not the entire code:

\`\`\`
${codeBefore}█${codeAfter}
\`\`\`

Context:
- Language: ${context.language}
- File: ${context.fileName}
- Project type: ${context.projectType}
- Framework: ${context.framework || 'N/A'}
`;

        const response = await this.openaiClient.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert programmer specializing in code completion. Complete the code where the █ symbol is placed. Return only the completion code without any additional text, explanation, or the code before/after the completion point.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 150
        });

        return {
          success: true,
          completion: response.choices[0].message.content.trim(),
          model: response.model
        };
      } else {
        // Fallback implementation - very basic completion
        return {
          success: true,
          completion: 'console.log("Auto-completed code");',
          model: 'fallback'
        };
      }
    } catch (err) {
      console.error('Error in AI code completion:', err);
      return { success: false, message: `AI service error: ${err.message}`, error: err };
    }
  }

  /**
   * Call AI service for documentation generation
   */
  private async callAIDocumentation(
    code: string,
    context: any
  ): Promise<CodeDocumentationResult & { model?: string }> {
    try {
      // Check if OpenAI client is available
      if (this.openaiClient) {
        // Call OpenAI for documentation
        const prompt = `
Add comprehensive documentation to the following code in the ${context.language} language:

\`\`\`
${code}
\`\`\`

Add the following documentation:
1. File-level documentation explaining the purpose and usage
2. Function/class documentation in standard format for ${context.language}
3. Add important inline comments for complex logic
4. Ensure parameter types and return values are documented

Return the fully documented code.
`;

        const response = await this.openaiClient.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert programmer specializing in code documentation. Add comprehensive documentation to the provided code according to language-specific best practices. Return only the documented code without additional explanation.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2
        });

        return {
          success: true,
          documentation: response.choices[0].message.content.trim(),
          model: response.model
        };
      } else {
        // Fallback implementation
        // For simplicity, just add a basic comment to the top of the file
        const docComment = context.language === 'python' ? 
          '"""\nDocumentation for this module.\n\nThis module provides functionality for property assessment.\n"""\n\n' :
          '/**\n * Documentation for this module.\n *\n * This module provides functionality for property assessment.\n */\n\n';
          
        return {
          success: true,
          documentation: docComment + code,
          model: 'fallback'
        };
      }
    } catch (err) {
      console.error('Error in AI documentation generation:', err);
      return { success: false, message: `AI service error: ${err.message}`, error: err };
    }
  }
}
import { AIAssistantService } from '../../services/ai-assistant-service';

export interface CodeAssistantInterface {
  generateCodeSuggestion(prompt: string, fileContext?: string): Promise<string>;
  completeCode(codeSnippet: string, language: string): Promise<string>;
  explainCode(code: string): Promise<string>;
  fixBugs(code: string, errorMessage: string): Promise<string>;
  recommendImprovement(code: string): Promise<string>;
  generateAssessmentModel(requirements: string): Promise<string>;
}

/**
 * AI Code Assistant service for code generation, completion, and analysis
 * specifically designed for assessment applications development
 */
class AICodeAssistant implements CodeAssistantInterface {
  private aiAssistantService: AIAssistantService;
  
  constructor(aiAssistantService: AIAssistantService) {
    this.aiAssistantService = aiAssistantService;
  }

  /**
   * Generate code based on a prompt and optional file context
   */
  async generateCodeSuggestion(prompt: string, fileContext?: string): Promise<string> {
    const systemPrompt = `You are an expert programming assistant specialized in property assessment and valuation code. 
    Your task is to generate high-quality, clean, and efficient code based on the user's requirements.
    Focus particularly on assessment terminology and patterns appropriate for property tax administration.
    Generate code that follows best practices and includes appropriate comments.`;
    
    let fullPrompt = prompt;
    if (fileContext) {
      fullPrompt = `Current file context:\n\`\`\`\n${fileContext}\n\`\`\`\n\nUser request: ${prompt}`;
    }
    
    try {
      const response = await this.aiAssistantService.generateResponse({
        systemPrompt,
        userPrompt: fullPrompt,
        provider: 'openai', // default, can be made configurable
        options: {
          temperature: 0.3, // lower temperature for more precise code
          maxTokens: 2000
        }
      });
      
      // Extract code from response if it's wrapped in markdown code blocks
      const codeRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
      const match = codeRegex.exec(response);
      return match ? match[1].trim() : response;
    } catch (error) {
      console.error('Error generating code suggestion:', error);
      throw new Error('Failed to generate code suggestion');
    }
  }

  /**
   * Complete partial code snippet
   */
  async completeCode(codeSnippet: string, language: string): Promise<string> {
    const systemPrompt = `You are an expert code completion assistant for ${language} programming, 
    specializing in property assessment and tax administration code. 
    Complete the provided code snippet with high-quality, efficient code that follows best practices.`;
    
    try {
      const response = await this.aiAssistantService.generateResponse({
        systemPrompt,
        userPrompt: `Complete this ${language} code:\n\`\`\`${language}\n${codeSnippet}\n\`\`\`\nProvide only the completed code without explanations.`,
        provider: 'openai',
        options: {
          temperature: 0.2,
          maxTokens: 1500
        }
      });
      
      // Extract code from response
      const codeRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
      const match = codeRegex.exec(response);
      return match ? match[1].trim() : response;
    } catch (error) {
      console.error('Error completing code:', error);
      throw new Error('Failed to complete code');
    }
  }

  /**
   * Explain code with assessment terminology
   */
  async explainCode(code: string): Promise<string> {
    const systemPrompt = `You are an expert code explainer specializing in property assessment and valuation software.
    Explain the provided code in clear, non-technical terms that assessors and appraisers would understand.
    Focus on what the code does in the context of property assessment, not just the technical implementation.
    Use terminology familiar to the assessment industry.`;
    
    try {
      const response = await this.aiAssistantService.generateResponse({
        systemPrompt,
        userPrompt: `Explain this code in the context of property assessment:\n\`\`\`\n${code}\n\`\`\``,
        provider: 'openai',
        options: {
          temperature: 0.7, // higher temperature for more natural language
          maxTokens: 1000
        }
      });
      
      return response;
    } catch (error) {
      console.error('Error explaining code:', error);
      throw new Error('Failed to explain code');
    }
  }

  /**
   * Fix bugs in code based on error message
   */
  async fixBugs(code: string, errorMessage: string): Promise<string> {
    const systemPrompt = `You are an expert debugging assistant specializing in property assessment software.
    Analyze the provided code and error message to identify and fix the issues.
    Provide the corrected code along with brief explanations of what was wrong and how you fixed it.
    Ensure the fixed code maintains the original functionality and intent.`;
    
    try {
      const response = await this.aiAssistantService.generateResponse({
        systemPrompt,
        userPrompt: `Fix this code that has the following error:\n\nERROR: ${errorMessage}\n\nCODE:\n\`\`\`\n${code}\n\`\`\`\n\nPlease provide the corrected code.`,
        provider: 'openai',
        options: {
          temperature: 0.3,
          maxTokens: 2000
        }
      });
      
      // Extract code from response
      const codeRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
      const match = codeRegex.exec(response);
      return match ? match[1].trim() : response;
    } catch (error) {
      console.error('Error fixing bugs:', error);
      throw new Error('Failed to fix bugs');
    }
  }

  /**
   * Recommend improvements for code
   */
  async recommendImprovement(code: string): Promise<string> {
    const systemPrompt = `You are an expert code reviewer specializing in property assessment and valuation software.
    Analyze the provided code and suggest improvements in terms of:
    1. Performance optimization
    2. Readability and maintainability
    3. Assessment industry best practices
    4. Security considerations
    5. Edge case handling relevant to property data
    Provide specific, actionable recommendations with examples where appropriate.`;
    
    try {
      const response = await this.aiAssistantService.generateResponse({
        systemPrompt,
        userPrompt: `Review this code and suggest improvements specific to assessment software:\n\`\`\`\n${code}\n\`\`\``,
        provider: 'openai',
        options: {
          temperature: 0.6,
          maxTokens: 1500
        }
      });
      
      return response;
    } catch (error) {
      console.error('Error recommending improvements:', error);
      throw new Error('Failed to recommend improvements');
    }
  }

  /**
   * Generate assessment-specific model code
   */
  async generateAssessmentModel(requirements: string): Promise<string> {
    const systemPrompt = `You are an expert in CAMA (Computer Assisted Mass Appraisal) and assessment model development.
    Create high-quality, industry-standard code for property assessment models based on the provided requirements.
    Include appropriate statistical methods, valuation approaches (cost, market, income), and assessment-specific validation.
    Use assessment terminology correctly and implement industry best practices.
    The code should be well-documented with explanations of the valuation methodology.`;
    
    try {
      const response = await this.aiAssistantService.generateResponse({
        systemPrompt,
        userPrompt: `Generate a property assessment model based on these requirements:\n${requirements}\n\nProvide the complete code with appropriate documentation.`,
        provider: 'openai',
        options: {
          temperature: 0.4,
          maxTokens: 3000
        }
      });
      
      // Extract code from response
      const codeRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
      const match = codeRegex.exec(response);
      return match ? match[1].trim() : response;
    } catch (error) {
      console.error('Error generating assessment model:', error);
      throw new Error('Failed to generate assessment model');
    }
  }
}

// Create and export the instance
let aiCodeAssistant: AICodeAssistant;

export function initializeAICodeAssistant(aiAssistantService: AIAssistantService): AICodeAssistant {
  aiCodeAssistant = new AICodeAssistant(aiAssistantService);
  return aiCodeAssistant;
}

export function getAICodeAssistant(): AICodeAssistant {
  if (!aiCodeAssistant) {
    throw new Error('AI Code Assistant not initialized');
  }
  return aiCodeAssistant;
}

export default aiCodeAssistant;
/**
 * Voice Command Coding Assistance Service
 * 
 * This service handles voice commands for coding assistance, integrating with
 * Plandex AI and other coding tools to provide hands-free coding support.
 */

import { db } from '../../db';
import { 
  VoiceCommandType,
  voiceCommandHelpContents,
  InsertVoiceCommandHelpContent
} from '@shared/schema';
import { eq, and, or, sql, desc, asc } from 'drizzle-orm';
import { getPlandexAIService } from '../plandex-ai-factory';
import { logger } from '../../utils/logger';

// Coding command intents
export enum CodingCommandIntent {
  // Code generation
  GENERATE_CODE = 'coding.generate',
  GENERATE_FUNCTION = 'coding.generate.function',
  GENERATE_CLASS = 'coding.generate.class',
  GENERATE_COMPONENT = 'coding.generate.component',
  
  // Code explanation
  EXPLAIN_CODE = 'coding.explain',
  EXPLAIN_FUNCTION = 'coding.explain.function',
  EXPLAIN_CLASS = 'coding.explain.class',
  
  // Bug fixing
  FIX_BUG = 'coding.fix',
  FIX_ERROR = 'coding.fix.error',
  
  // Code optimization
  OPTIMIZE_CODE = 'coding.optimize',
  OPTIMIZE_FUNCTION = 'coding.optimize.function',
  OPTIMIZE_QUERY = 'coding.optimize.query',
  
  // Editor controls
  INSERT_CODE = 'coding.insert',
  DELETE_CODE = 'coding.delete',
  SELECT_CODE = 'coding.select',
  UNDO = 'coding.undo',
  REDO = 'coding.redo',
  
  // File operations
  CREATE_FILE = 'coding.file.create',
  SAVE_FILE = 'coding.file.save',
  OPEN_FILE = 'coding.file.open',
  
  // Other
  RUN_TESTS = 'coding.run.tests',
  COMMIT_CODE = 'coding.commit',
  DEPLOY_CODE = 'coding.deploy'
}

export class VoiceCommandCodingAssistanceService {
  /**
   * Determine the coding intent from a voice command
   */
  determineCodingIntent(command: string): { intent: CodingCommandIntent, parameters: Record<string, any> } {
    // Initialize parameters object
    const parameters: Record<string, any> = {};
    
    // Generate code patterns
    if (/(?:generate|create|write)\s+(?:a|some|new)?\s+code\s+(?:for|to|that)\s+(.*)/i.test(command)) {
      parameters.description = command.match(/(?:generate|create|write)\s+(?:a|some|new)?\s+code\s+(?:for|to|that)\s+(.*)/i)?.[1] || '';
      return { intent: CodingCommandIntent.GENERATE_CODE, parameters };
    }
    
    if (/(?:generate|create|write)\s+(?:a|some|new)?\s+(?:function|method)\s+(?:for|to|that)\s+(.*)/i.test(command)) {
      parameters.description = command.match(/(?:generate|create|write)\s+(?:a|some|new)?\s+(?:function|method)\s+(?:for|to|that)\s+(.*)/i)?.[1] || '';
      parameters.type = 'function';
      return { intent: CodingCommandIntent.GENERATE_FUNCTION, parameters };
    }
    
    if (/(?:generate|create|write)\s+(?:a|some|new)?\s+(?:class|module)\s+(?:for|to|that)\s+(.*)/i.test(command)) {
      parameters.description = command.match(/(?:generate|create|write)\s+(?:a|some|new)?\s+(?:class|module)\s+(?:for|to|that)\s+(.*)/i)?.[1] || '';
      parameters.type = 'class';
      return { intent: CodingCommandIntent.GENERATE_CLASS, parameters };
    }
    
    if (/(?:generate|create|write)\s+(?:a|some|new)?\s+(?:component|react component)\s+(?:for|to|that)\s+(.*)/i.test(command)) {
      parameters.description = command.match(/(?:generate|create|write)\s+(?:a|some|new)?\s+(?:component|react component)\s+(?:for|to|that)\s+(.*)/i)?.[1] || '';
      parameters.type = 'component';
      return { intent: CodingCommandIntent.GENERATE_COMPONENT, parameters };
    }
    
    // Explain code patterns
    if (/(?:explain|describe|tell me about)\s+(?:this|the|current|selected)?\s+(?:code|implementation)/i.test(command)) {
      return { intent: CodingCommandIntent.EXPLAIN_CODE, parameters };
    }
    
    if (/(?:explain|describe|tell me about)\s+(?:this|the|current|selected)?\s+(?:function|method)/i.test(command)) {
      parameters.type = 'function';
      return { intent: CodingCommandIntent.EXPLAIN_FUNCTION, parameters };
    }
    
    // Bug fixing patterns
    if (/(?:fix|resolve|correct|debug)\s+(?:the|this|current)?\s+(?:bug|issue|problem|error)/i.test(command)) {
      return { intent: CodingCommandIntent.FIX_BUG, parameters };
    }
    
    if (/(?:fix|resolve|correct|debug)\s+(?:the|this|current)?\s+(?:error|exception|warning|compiler error)/i.test(command)) {
      return { intent: CodingCommandIntent.FIX_ERROR, parameters };
    }
    
    // Optimization patterns
    if (/(?:optimize|improve|refactor|make better|enhance)\s+(?:the|this|current|selected)?\s+(?:code|implementation)/i.test(command)) {
      return { intent: CodingCommandIntent.OPTIMIZE_CODE, parameters };
    }
    
    if (/(?:optimize|improve|refactor|make better|enhance)\s+(?:the|this|current|selected)?\s+(?:function|method)/i.test(command)) {
      parameters.type = 'function';
      return { intent: CodingCommandIntent.OPTIMIZE_FUNCTION, parameters };
    }
    
    if (/(?:optimize|improve|refactor|make better|enhance)\s+(?:the|this|current|selected)?\s+(?:query|database query|sql)/i.test(command)) {
      parameters.type = 'query';
      return { intent: CodingCommandIntent.OPTIMIZE_QUERY, parameters };
    }
    
    // Editor control patterns
    if (/(?:insert|add|place|put)\s+(?:code|this)\s+(?:here|at cursor|at position)/i.test(command)) {
      return { intent: CodingCommandIntent.INSERT_CODE, parameters };
    }
    
    if (/(?:delete|remove|cut)\s+(?:this|the|current|selected)?\s+(?:code|selection|text)/i.test(command)) {
      return { intent: CodingCommandIntent.DELETE_CODE, parameters };
    }
    
    if (/(?:select|highlight)\s+(?:this|the|current|selected)?\s+(?:code|function|class|section)/i.test(command)) {
      return { intent: CodingCommandIntent.SELECT_CODE, parameters };
    }
    
    if (/(?:undo|revert|go back)/i.test(command)) {
      return { intent: CodingCommandIntent.UNDO, parameters };
    }
    
    if (/(?:redo|repeat)/i.test(command)) {
      return { intent: CodingCommandIntent.REDO, parameters };
    }
    
    // File operations patterns
    if (/(?:create|make|add)\s+(?:a|new)?\s+(?:file|source file)/i.test(command)) {
      // Extract file name if present
      const fileNameMatch = command.match(/(?:named|called)\s+([a-zA-Z0-9_\-.]+)/i);
      if (fileNameMatch) {
        parameters.fileName = fileNameMatch[1];
      }
      return { intent: CodingCommandIntent.CREATE_FILE, parameters };
    }
    
    if (/(?:save|store|write)\s+(?:this|the|current)?\s+(?:file|document|code)/i.test(command)) {
      return { intent: CodingCommandIntent.SAVE_FILE, parameters };
    }
    
    if (/(?:open|load|show)\s+(?:file|document)\s+([a-zA-Z0-9_\-.]+)/i.test(command)) {
      parameters.fileName = command.match(/(?:open|load|show)\s+(?:file|document)\s+([a-zA-Z0-9_\-.]+)/i)?.[1] || '';
      return { intent: CodingCommandIntent.OPEN_FILE, parameters };
    }
    
    // Other coding command patterns
    if (/(?:run|execute|start)\s+(?:the|all)?\s+(?:tests|test suite|unit tests)/i.test(command)) {
      return { intent: CodingCommandIntent.RUN_TESTS, parameters };
    }
    
    if (/(?:commit|save)\s+(?:the|my|these)?\s+(?:changes|code)\s+(?:to git|to repository)?/i.test(command)) {
      // Extract commit message if present
      const messageMatch = command.match(/(?:with message|with commit message|saying)\s+["'](.+)["']/i);
      if (messageMatch) {
        parameters.commitMessage = messageMatch[1];
      } else {
        parameters.commitMessage = "Update code via voice command";
      }
      return { intent: CodingCommandIntent.COMMIT_CODE, parameters };
    }
    
    if (/(?:deploy|publish|ship)\s+(?:the|my|this)?\s+(?:code|application|app|changes)/i.test(command)) {
      return { intent: CodingCommandIntent.DEPLOY_CODE, parameters };
    }
    
    // Default to general code generation if no specific intent is found
    parameters.description = command;
    return { intent: CodingCommandIntent.GENERATE_CODE, parameters };
  }
  
  /**
   * Process a coding assistance voice command
   */
  async processCodingCommand(
    command: string,
    context: any = {}
  ): Promise<{ success: boolean; response: string; actions?: any[]; data?: any }> {
    try {
      // 1. Determine the coding intent and extract parameters
      const { intent, parameters } = this.determineCodingIntent(command);
      
      // 2. Log the intent and parameters
      logger.info(`VoiceCommandCodingAssistance: Processing ${intent} with parameters: ${JSON.stringify(parameters)}`);
      
      // 3. Get the Plandex AI service
      const plandexAIService = getPlandexAIService();
      
      // 4. Process the intent using the appropriate service method
      switch (intent) {
        // Code generation intents
        case CodingCommandIntent.GENERATE_CODE:
        case CodingCommandIntent.GENERATE_FUNCTION:
        case CodingCommandIntent.GENERATE_CLASS:
        case CodingCommandIntent.GENERATE_COMPONENT:
          // Handle code generation
          return this.handleCodeGeneration(intent, parameters, plandexAIService, context);
          
        // Code explanation intents
        case CodingCommandIntent.EXPLAIN_CODE:
        case CodingCommandIntent.EXPLAIN_FUNCTION:
        case CodingCommandIntent.EXPLAIN_CLASS:
          // Handle code explanation
          return this.handleCodeExplanation(intent, parameters, plandexAIService, context);
          
        // Bug fixing intents
        case CodingCommandIntent.FIX_BUG:
        case CodingCommandIntent.FIX_ERROR:
          // Handle bug fixing
          return this.handleBugFix(intent, parameters, plandexAIService, context);
          
        // Code optimization intents
        case CodingCommandIntent.OPTIMIZE_CODE:
        case CodingCommandIntent.OPTIMIZE_FUNCTION:
        case CodingCommandIntent.OPTIMIZE_QUERY:
          // Handle code optimization
          return this.handleCodeOptimization(intent, parameters, plandexAIService, context);
          
        // Editor control intents
        case CodingCommandIntent.INSERT_CODE:
        case CodingCommandIntent.DELETE_CODE:
        case CodingCommandIntent.SELECT_CODE:
        case CodingCommandIntent.UNDO:
        case CodingCommandIntent.REDO:
          // Handle editor controls
          return this.handleEditorControl(intent, parameters, context);
          
        // File operation intents
        case CodingCommandIntent.CREATE_FILE:
        case CodingCommandIntent.SAVE_FILE:
        case CodingCommandIntent.OPEN_FILE:
          // Handle file operations
          return this.handleFileOperation(intent, parameters, context);
          
        // Other coding intents
        case CodingCommandIntent.RUN_TESTS:
        case CodingCommandIntent.COMMIT_CODE:
        case CodingCommandIntent.DEPLOY_CODE:
          // Handle other coding operations
          return this.handleOtherCodingOperation(intent, parameters, context);
          
        default:
          return {
            success: false,
            response: "I didn't understand that coding command. Try something like 'generate a function to sort an array'."
          };
      }
    } catch (error) {
      logger.error(`VoiceCommandCodingAssistance: Error processing command - ${error.message}`);
      return {
        success: false,
        response: `I encountered an error while processing your coding command: ${error.message}`
      };
    }
  }
  
  /**
   * Handle code generation commands
   */
  private async handleCodeGeneration(
    intent: CodingCommandIntent,
    parameters: Record<string, any>,
    plandexAIService: any,
    context: any
  ): Promise<{ success: boolean; response: string; actions?: any[]; data?: any }> {
    try {
      const { description, type = 'code' } = parameters;
      
      let prompt = description;
      let additionalInstructions = '';
      
      // Customize prompt based on intent
      switch (intent) {
        case CodingCommandIntent.GENERATE_FUNCTION:
          additionalInstructions = 'Write this as a function with appropriate parameters.';
          break;
        case CodingCommandIntent.GENERATE_CLASS:
          additionalInstructions = 'Write this as a class with appropriate methods and properties.';
          break;
        case CodingCommandIntent.GENERATE_COMPONENT:
          additionalInstructions = 'Write this as a React component with appropriate props and state.';
          break;
      }
      
      if (additionalInstructions) {
        prompt = `${description}. ${additionalInstructions}`;
      }
      
      // Get current project information from context
      const { projectLanguage = 'javascript', currentFile } = context;
      
      // Call Plandex AI for code generation
      const response = await plandexAIService.generateCode({
        prompt,
        language: projectLanguage,
        currentContext: currentFile || null
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate code');
      }
      
      // Get the generated code
      const generatedCode = response.result?.code || '';
      
      // Build response with actions
      return {
        success: true,
        response: `I've generated ${type} based on your description. Would you like me to insert it at the cursor position?`,
        actions: [
          {
            type: 'DISPLAY_GENERATED_CODE',
            payload: {
              code: generatedCode,
              description: description
            }
          },
          {
            type: 'OFFER_INSERT_CODE',
            payload: {
              code: generatedCode
            }
          }
        ],
        data: {
          generatedCode,
          description,
          type
        }
      };
    } catch (error) {
      logger.error(`VoiceCommandCodingAssistance: Error in code generation - ${error.message}`);
      return {
        success: false,
        response: `I couldn't generate the ${parameters.type || 'code'} you requested. ${error.message}`
      };
    }
  }
  
  /**
   * Handle code explanation commands
   */
  private async handleCodeExplanation(
    intent: CodingCommandIntent,
    parameters: Record<string, any>,
    plandexAIService: any,
    context: any
  ): Promise<{ success: boolean; response: string; actions?: any[]; data?: any }> {
    try {
      const { type = 'code' } = parameters;
      
      // Get current code selection from context
      const { selectedCode, currentFile } = context;
      
      if (!selectedCode) {
        return {
          success: false,
          response: "I don't see any code selected. Please select the code you'd like me to explain and try again."
        };
      }
      
      // Call Plandex AI for code explanation
      const response = await plandexAIService.explainCode({
        code: selectedCode,
        currentContext: currentFile || null
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to explain code');
      }
      
      // Get the explanation
      const explanation = response.result?.explanation || '';
      
      // Build response with actions
      return {
        success: true,
        response: explanation,
        actions: [
          {
            type: 'DISPLAY_CODE_EXPLANATION',
            payload: {
              code: selectedCode,
              explanation
            }
          }
        ],
        data: {
          explanation,
          originalCode: selectedCode
        }
      };
    } catch (error) {
      logger.error(`VoiceCommandCodingAssistance: Error in code explanation - ${error.message}`);
      return {
        success: false,
        response: `I couldn't explain the ${parameters.type || 'code'} you selected. ${error.message}`
      };
    }
  }
  
  /**
   * Handle bug fixing commands
   */
  private async handleBugFix(
    intent: CodingCommandIntent,
    parameters: Record<string, any>,
    plandexAIService: any,
    context: any
  ): Promise<{ success: boolean; response: string; actions?: any[]; data?: any }> {
    try {
      // Get current code and error information from context
      const { selectedCode, currentFile, errorMessage } = context;
      
      if (!selectedCode) {
        return {
          success: false,
          response: "I don't see any code selected. Please select the code with the bug and try again."
        };
      }
      
      // Call Plandex AI for bug fixing
      const response = await plandexAIService.fixBug({
        code: selectedCode,
        errorMessage: errorMessage || '',
        currentContext: currentFile || null
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fix the bug');
      }
      
      // Get the fixed code and explanation
      const fixedCode = response.result?.fixedCode || '';
      const explanation = response.result?.explanation || '';
      
      // Build response with actions
      return {
        success: true,
        response: `I've identified and fixed the issue in your code. ${explanation}`,
        actions: [
          {
            type: 'DISPLAY_CODE_FIX',
            payload: {
              originalCode: selectedCode,
              fixedCode,
              explanation
            }
          },
          {
            type: 'OFFER_REPLACE_CODE',
            payload: {
              originalCode: selectedCode,
              fixedCode
            }
          }
        ],
        data: {
          fixedCode,
          explanation,
          originalCode: selectedCode
        }
      };
    } catch (error) {
      logger.error(`VoiceCommandCodingAssistance: Error in bug fixing - ${error.message}`);
      return {
        success: false,
        response: `I couldn't fix the bug in your code. ${error.message}`
      };
    }
  }
  
  /**
   * Handle code optimization commands
   */
  private async handleCodeOptimization(
    intent: CodingCommandIntent,
    parameters: Record<string, any>,
    plandexAIService: any,
    context: any
  ): Promise<{ success: boolean; response: string; actions?: any[]; data?: any }> {
    try {
      const { type = 'code' } = parameters;
      
      // Get current code selection from context
      const { selectedCode, currentFile } = context;
      
      if (!selectedCode) {
        return {
          success: false,
          response: `I don't see any ${type} selected. Please select the ${type} you'd like me to optimize and try again.`
        };
      }
      
      // Call Plandex AI for code optimization
      const response = await plandexAIService.optimizeCode({
        code: selectedCode,
        type,
        currentContext: currentFile || null
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to optimize code');
      }
      
      // Get the optimized code and explanation
      const optimizedCode = response.result?.optimizedCode || '';
      const explanation = response.result?.explanation || '';
      
      // Build response with actions
      return {
        success: true,
        response: `I've optimized your ${type}. ${explanation}`,
        actions: [
          {
            type: 'DISPLAY_CODE_OPTIMIZATION',
            payload: {
              originalCode: selectedCode,
              optimizedCode,
              explanation
            }
          },
          {
            type: 'OFFER_REPLACE_CODE',
            payload: {
              originalCode: selectedCode,
              optimizedCode
            }
          }
        ],
        data: {
          optimizedCode,
          explanation,
          originalCode: selectedCode
        }
      };
    } catch (error) {
      logger.error(`VoiceCommandCodingAssistance: Error in code optimization - ${error.message}`);
      return {
        success: false,
        response: `I couldn't optimize your ${parameters.type || 'code'}. ${error.message}`
      };
    }
  }
  
  /**
   * Handle editor control commands
   */
  private async handleEditorControl(
    intent: CodingCommandIntent,
    parameters: Record<string, any>,
    context: any
  ): Promise<{ success: boolean; response: string; actions?: any[]; data?: any }> {
    try {
      // Different actions based on intent
      switch (intent) {
        case CodingCommandIntent.INSERT_CODE:
          if (!context.clipboardContent) {
            return {
              success: false,
              response: "I don't see any code to insert. Try generating code first or copying some code."
            };
          }
          
          return {
            success: true,
            response: `Inserting the code at cursor position.`,
            actions: [
              {
                type: 'INSERT_AT_CURSOR',
                payload: {
                  code: context.clipboardContent
                }
              }
            ]
          };
          
        case CodingCommandIntent.DELETE_CODE:
          if (!context.selectedCode) {
            return {
              success: false,
              response: "I don't see any code selected. Please select the code you'd like to delete."
            };
          }
          
          return {
            success: true,
            response: `Deleting the selected code.`,
            actions: [
              {
                type: 'DELETE_SELECTION',
                payload: {}
              }
            ]
          };
          
        case CodingCommandIntent.SELECT_CODE:
          // This would typically require more context about what to select
          // For now, we'll assume simple cases
          if (parameters.target === 'function' && context.currentFunction) {
            return {
              success: true,
              response: `Selecting the current function.`,
              actions: [
                {
                  type: 'SELECT_RANGE',
                  payload: {
                    start: context.currentFunction.start,
                    end: context.currentFunction.end
                  }
                }
              ]
            };
          }
          
          return {
            success: false,
            response: "I'm not sure what code to select. Try being more specific or manually select the code."
          };
          
        case CodingCommandIntent.UNDO:
          return {
            success: true,
            response: `Undoing the last action.`,
            actions: [
              {
                type: 'EDITOR_UNDO',
                payload: {}
              }
            ]
          };
          
        case CodingCommandIntent.REDO:
          return {
            success: true,
            response: `Redoing the last undone action.`,
            actions: [
              {
                type: 'EDITOR_REDO',
                payload: {}
              }
            ]
          };
          
        default:
          return {
            success: false,
            response: "I didn't understand that editor command."
          };
      }
    } catch (error) {
      logger.error(`VoiceCommandCodingAssistance: Error in editor control - ${error.message}`);
      return {
        success: false,
        response: `I couldn't perform that editor action. ${error.message}`
      };
    }
  }
  
  /**
   * Handle file operation commands
   */
  private async handleFileOperation(
    intent: CodingCommandIntent,
    parameters: Record<string, any>,
    context: any
  ): Promise<{ success: boolean; response: string; actions?: any[]; data?: any }> {
    try {
      // Different actions based on intent
      switch (intent) {
        case CodingCommandIntent.CREATE_FILE:
          const fileName = parameters.fileName || 'newFile.js';
          
          return {
            success: true,
            response: `Creating a new file named ${fileName}.`,
            actions: [
              {
                type: 'CREATE_FILE',
                payload: {
                  fileName
                }
              }
            ]
          };
          
        case CodingCommandIntent.SAVE_FILE:
          return {
            success: true,
            response: `Saving the current file.`,
            actions: [
              {
                type: 'SAVE_FILE',
                payload: {}
              }
            ]
          };
          
        case CodingCommandIntent.OPEN_FILE:
          if (!parameters.fileName) {
            return {
              success: false,
              response: "I didn't catch the name of the file to open. Please specify the file name."
            };
          }
          
          return {
            success: true,
            response: `Opening file ${parameters.fileName}.`,
            actions: [
              {
                type: 'OPEN_FILE',
                payload: {
                  fileName: parameters.fileName
                }
              }
            ]
          };
          
        default:
          return {
            success: false,
            response: "I didn't understand that file operation command."
          };
      }
    } catch (error) {
      logger.error(`VoiceCommandCodingAssistance: Error in file operation - ${error.message}`);
      return {
        success: false,
        response: `I couldn't perform that file operation. ${error.message}`
      };
    }
  }
  
  /**
   * Handle other coding operations
   */
  private async handleOtherCodingOperation(
    intent: CodingCommandIntent,
    parameters: Record<string, any>,
    context: any
  ): Promise<{ success: boolean; response: string; actions?: any[]; data?: any }> {
    try {
      // Different actions based on intent
      switch (intent) {
        case CodingCommandIntent.RUN_TESTS:
          return {
            success: true,
            response: `Running tests for the current project.`,
            actions: [
              {
                type: 'RUN_TESTS',
                payload: {}
              }
            ]
          };
          
        case CodingCommandIntent.COMMIT_CODE:
          const commitMessage = parameters.commitMessage || "Update code via voice command";
          
          return {
            success: true,
            response: `Committing changes with message: "${commitMessage}"`,
            actions: [
              {
                type: 'COMMIT_CODE',
                payload: {
                  message: commitMessage
                }
              }
            ]
          };
          
        case CodingCommandIntent.DEPLOY_CODE:
          return {
            success: true,
            response: `Initiating deployment process for the current project.`,
            actions: [
              {
                type: 'DEPLOY_CODE',
                payload: {}
              }
            ]
          };
          
        default:
          return {
            success: false,
            response: "I didn't understand that coding operation command."
          };
      }
    } catch (error) {
      logger.error(`VoiceCommandCodingAssistance: Error in other coding operation - ${error.message}`);
      return {
        success: false,
        response: `I couldn't perform that operation. ${error.message}`
      };
    }
  }
  
  /**
   * Initialize help content for coding commands
   */
  async initializeHelpContent(): Promise<void> {
    try {
      // Define the help content for coding assistance commands
      const helpContents: InsertVoiceCommandHelpContent[] = [
        // General coding help
        {
          commandType: VoiceCommandType.CODING_ASSISTANCE,
          contextId: 'global',
          title: "Coding Assistance Commands",
          examplePhrases: [
            "generate code to sort an array",
            "explain this function",
            "fix this bug",
            "optimize this code"
          ],
          description: "Voice commands for hands-free coding assistance, including code generation, explanation, bug fixing, and optimization.",
          parameters: {},
          priority: 8
        },
        
        // Code generation commands
        {
          commandType: VoiceCommandType.CODING_ASSISTANCE,
          contextId: 'editor',
          title: "Code Generation Commands",
          examplePhrases: [
            "generate a function to calculate fibonacci numbers",
            "create a class for user authentication",
            "write a component for a login form",
            "generate code to parse JSON data"
          ],
          description: "Commands for generating different types of code, including functions, classes, and components.",
          parameters: {
            "description": "Description of the code to generate",
            "type": "Type of code to generate (function, class, component)"
          },
          priority: 9
        },
        
        // Code explanation commands
        {
          commandType: VoiceCommandType.CODING_ASSISTANCE,
          contextId: 'editor',
          title: "Code Explanation Commands",
          examplePhrases: [
            "explain this code",
            "explain this function",
            "describe what this does",
            "tell me about this implementation"
          ],
          description: "Commands for getting explanations of selected code, functions, or classes.",
          parameters: {
            "type": "Type of code to explain (function, class, code)"
          },
          priority: 7
        },
        
        // Bug fixing commands
        {
          commandType: VoiceCommandType.CODING_ASSISTANCE,
          contextId: 'editor',
          title: "Bug Fixing Commands",
          examplePhrases: [
            "fix this bug",
            "correct this error",
            "debug this issue",
            "resolve this problem"
          ],
          description: "Commands for fixing bugs, errors, and issues in your code.",
          parameters: {
            "type": "Type of bug or error to fix"
          },
          priority: 8
        },
        
        // Code optimization commands
        {
          commandType: VoiceCommandType.CODING_ASSISTANCE,
          contextId: 'editor',
          title: "Code Optimization Commands",
          examplePhrases: [
            "optimize this code",
            "optimize this function",
            "improve this query",
            "refactor this implementation"
          ],
          description: "Commands for optimizing and improving your code for better performance or readability.",
          parameters: {
            "type": "Type of code to optimize (function, query, code)"
          },
          priority: 7
        },
        
        // Editor control commands
        {
          commandType: VoiceCommandType.CODING_ASSISTANCE,
          contextId: 'editor',
          title: "Editor Control Commands",
          examplePhrases: [
            "insert code here",
            "delete this code",
            "select this function",
            "undo",
            "redo"
          ],
          description: "Commands for controlling the code editor, including inserting, deleting, and selecting code.",
          parameters: {},
          priority: 6
        },
        
        // File operation commands
        {
          commandType: VoiceCommandType.CODING_ASSISTANCE,
          contextId: 'global',
          title: "File Operation Commands",
          examplePhrases: [
            "create a new file named app.js",
            "save this file",
            "open file config.json"
          ],
          description: "Commands for file operations, including creating, saving, and opening files.",
          parameters: {
            "fileName": "Name of the file to create, save, or open"
          },
          priority: 5
        },
        
        // Other coding commands
        {
          commandType: VoiceCommandType.CODING_ASSISTANCE,
          contextId: 'global',
          title: "Other Coding Commands",
          examplePhrases: [
            "run tests",
            "commit code with message 'fix bug'",
            "deploy code"
          ],
          description: "Other useful coding commands for testing, version control, and deployment.",
          parameters: {
            "commitMessage": "Message for code commits"
          },
          priority: 4
        }
      ];
      
      // Insert all help content
      for (const helpContent of helpContents) {
        // Check if the help content already exists
        const existingContent = await db.select({ count: sql`count(*)` })
          .from(voiceCommandHelpContents)
          .where(
            and(
              eq(voiceCommandHelpContents.commandType, helpContent.commandType),
              eq(voiceCommandHelpContents.contextId, helpContent.contextId || 'global'),
              eq(voiceCommandHelpContents.title, helpContent.title)
            )
          );
          
        // Only insert if it doesn't exist
        if (existingContent[0].count === 0) {
          await db.insert(voiceCommandHelpContents)
            .values({
              ...helpContent,
              contextId: helpContent.contextId || 'global'
            });
            
          logger.info(`VoiceCommandCodingAssistance: Added help content for "${helpContent.title}"`);
        }
      }
      
      logger.info('VoiceCommandCodingAssistance: Successfully initialized help content');
    } catch (error) {
      logger.error(`VoiceCommandCodingAssistance: Error initializing help content - ${error.message}`);
      throw error;
    }
  }
}

// Singleton instance
let voiceCommandCodingAssistanceService: VoiceCommandCodingAssistanceService;

export function initializeVoiceCommandCodingAssistanceService(): VoiceCommandCodingAssistanceService {
  if (!voiceCommandCodingAssistanceService) {
    voiceCommandCodingAssistanceService = new VoiceCommandCodingAssistanceService();
  }
  return voiceCommandCodingAssistanceService;
}

export function getVoiceCommandCodingAssistanceService(): VoiceCommandCodingAssistanceService {
  if (!voiceCommandCodingAssistanceService) {
    throw new Error('Voice Command Coding Assistance Service has not been initialized');
  }
  return voiceCommandCodingAssistanceService;
}
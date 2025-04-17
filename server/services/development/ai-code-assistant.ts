import OpenAI from "openai";

export interface CodeAssistantInterface {
  generateCodeSuggestion(prompt: string, fileContext?: string): Promise<string>;
  completeCode(codeSnippet: string, language: string): Promise<string>;
  explainCode(code: string): Promise<string>;
  fixBugs(code: string, errorMessage: string): Promise<string>;
  recommendImprovement(code: string): Promise<string>;
}

class AICodeAssistant implements CodeAssistantInterface {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'demo', // Fallback to demo mode if no API key
    });
  }
  
  /**
   * Generate code suggestion based on a prompt
   */
  async generateCodeSuggestion(prompt: string, fileContext?: string): Promise<string> {
    try {
      const promptText = `
You are an expert developer assistant. Generate high-quality, production-ready code based on this request:

${prompt}

${fileContext ? `Context from existing file:\n${fileContext}` : ''}

Write only the code without explanations unless specifically asked for. 
Use best practices for the language and follow modern conventions.
`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: promptText }],
        temperature: 0.2,
      });
      
      return response.choices[0]?.message?.content || 'No code suggestion generated.';
    } catch (error) {
      console.error('Error generating code suggestion:', error);
      return 'Error generating code. Please try again.';
    }
  }
  
  /**
   * Complete code snippet
   */
  async completeCode(codeSnippet: string, language: string): Promise<string> {
    try {
      const promptText = `
Complete the following ${language} code snippet with best practices:

\`\`\`${language}
${codeSnippet}
\`\`\`

Provide only the complete code including the original snippet without explanations. 
Make sure the solution is idiomatic and follows best practices.
`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: promptText }],
        temperature: 0.2,
      });
      
      return response.choices[0]?.message?.content || 'No code completion generated.';
    } catch (error) {
      console.error('Error completing code:', error);
      return 'Error completing code. Please try again.';
    }
  }
  
  /**
   * Explain code
   */
  async explainCode(code: string): Promise<string> {
    try {
      const promptText = `
Explain this code in simple terms:

\`\`\`
${code}
\`\`\`

Break down what the code does line by line, including:
1. Overall purpose
2. Key functions/methods
3. Control flow
4. Important variables and data structures
5. Any potential issues or optimizations
`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: promptText }],
        temperature: 0.2,
      });
      
      return response.choices[0]?.message?.content || 'No explanation generated.';
    } catch (error) {
      console.error('Error explaining code:', error);
      return 'Error explaining code. Please try again.';
    }
  }
  
  /**
   * Fix bugs in code
   */
  async fixBugs(code: string, errorMessage: string): Promise<string> {
    try {
      const promptText = `
Fix the bugs in this code based on the error message:

Error message:
${errorMessage}

Code:
\`\`\`
${code}
\`\`\`

Provide only the fixed code without explanations unless the fix requires a significant architectural change.
`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: promptText }],
        temperature: 0.2,
      });
      
      return response.choices[0]?.message?.content || 'No bug fixes generated.';
    } catch (error) {
      console.error('Error fixing bugs:', error);
      return 'Error fixing bugs. Please try again.';
    }
  }
  
  /**
   * Recommend improvements to code
   */
  async recommendImprovement(code: string): Promise<string> {
    try {
      const promptText = `
Review this code and recommend improvements:

\`\`\`
${code}
\`\`\`

Consider:
1. Performance optimizations
2. Coding standards and best practices
3. Readability and maintainability
4. Potential bugs or edge cases
5. Modern language features that could be utilized

Provide your recommendations with explanations on why they would improve the code.
`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: promptText }],
        temperature: 0.2,
      });
      
      return response.choices[0]?.message?.content || 'No improvement recommendations generated.';
    } catch (error) {
      console.error('Error recommending improvements:', error);
      return 'Error providing recommendations. Please try again.';
    }
  }
}

export const aiCodeAssistant = new AICodeAssistant();
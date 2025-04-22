#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import chalk from 'chalk';
import { loadCommands } from './commands';
import { ContextManager } from './context/contextManager';
import { LearningManager } from './learning/learningManager';
import { ToolRegistry } from './tools/toolRegistry';
import { registerBuiltinTools } from './tools/builtinTools';
import path from 'path';
import fs from 'fs';
import { resolveConfig } from './utils/config';

// Load environment variables
config();

async function main() {
  console.log(chalk.blue.bold('CodeAgent CLI - Enhanced AI Coding Assistant'));
  
  // Initialize the program
  const program = new Command();
  program
    .name('codeagent')
    .description('Enhanced AI code assistant with learning capabilities')
    .version('1.0.0')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-c, --context <path>', 'Set context path', process.cwd())
    .option('-m, --model <name>', 'Choose AI model', 'gpt-4o')
    .option('-l, --log-level <level>', 'Set log level (debug, info, warn, error)', 'info')
    .option('-p, --profile <name>', 'Use specific profile', 'default');
  
  // Create user config directory if it doesn't exist
  const userConfigDir = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.codeagent');
  if (!fs.existsSync(userConfigDir)) {
    fs.mkdirSync(userConfigDir, { recursive: true });
  }

  // Load user configuration
  const config = resolveConfig(program.opts().profile);
  
  // Initialize core services
  const contextManager = new ContextManager(program.opts().context);
  const toolRegistry = new ToolRegistry();
  
  // Register built-in tools
  registerBuiltinTools(toolRegistry);
  
  // Initialize learning manager
  const learningManager = new LearningManager(
    path.join(userConfigDir, 'learning.db'),
    contextManager,
    toolRegistry
  );

  // Make services available to commands
  program.context = {
    contextManager,
    toolRegistry,
    learningManager,
    config
  };

  // Load all commands dynamically
  await loadCommands(program);
  
  // Add global hook to validate key requirements
  program.hook('preAction', async (thisCommand) => {
    const opts = thisCommand.opts();
    
    // Verify OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error(chalk.red('Error: OPENAI_API_KEY environment variable is not set.'));
      console.log('Please set your API key using one of these methods:');
      console.log('  1. Create a .env file in the project root with OPENAI_API_KEY=your-key');
      console.log('  2. Set the environment variable: export OPENAI_API_KEY=your-key');
      console.log('  3. Add it to ~/.codeagent/config.json');
      process.exit(1);
    }
    
    // Initialize context for this command
    if (opts.context) {
      await contextManager.setProjectPath(opts.context);
    }
  });

  // Execute the command
  await program.parseAsync();
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
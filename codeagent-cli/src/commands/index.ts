import fs from 'fs';
import path from 'path';
import { Command } from 'commander';

/**
 * Dynamically load all commands from the commands directory
 */
export async function loadCommands(program: Command): Promise<void> {
  const commandsDir = path.join(__dirname);
  
  // Skip the index.ts file
  const commandFiles = fs.readdirSync(commandsDir)
    .filter(file => file !== 'index.ts' && file.endsWith('.ts'));
  
  // Import and register each command
  for (const file of commandFiles) {
    try {
      const commandPath = path.join(commandsDir, file);
      const commandModule = await import(commandPath);
      
      // Each command module should export a 'register' function
      if (typeof commandModule.register === 'function') {
        commandModule.register(program);
      }
    } catch (error) {
      console.error(`Error loading command from ${file}:`, error);
    }
  }
}
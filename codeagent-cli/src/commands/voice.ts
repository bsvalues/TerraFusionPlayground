import { Command } from 'commander';
import chalk from 'chalk';
import { VoiceCommandManager } from '../voice/voiceCommandManager.js';
import { SpeechCredentialsHelper } from '../voice/speechCredentialsHelper.js';

/**
 * Register the voice command
 */
export function register(program: Command): void {
  program
    .command('voice')
    .description('Start voice command mode')
    .option('-k, --keyword', 'Enable keyword detection (wake word)', false)
    .option('-w, --wake-word <word>', 'Set custom wake word', 'hey agent')
    .option('-c, --custom', 'Set up custom voice commands', false)
    .option('-s, --stop', 'Stop voice recognition if running', false)
    .option('--setup-credentials', 'Set up Google Cloud Speech credentials', false)
    .action(async (options) => {
      const voiceManager = new VoiceCommandManager();
      const credentialsHelper = new SpeechCredentialsHelper();
      
      // Handle stop option
      if (options.stop) {
        voiceManager.stop();
        return;
      }
      
      // Handle setup-credentials option
      if (options.setupCredentials) {
        await credentialsHelper.setupCredentials();
        return;
      }
      
      console.log(chalk.blue.bold('\n🎤 Voice Command Mode'));
      console.log(chalk.blue('───────────────────\n'));
      
      // Check if credentials are set up
      if (!credentialsHelper.hasCredentials()) {
        console.log(chalk.yellow('Google Cloud Speech credentials not found.'));
        console.log(chalk.yellow('Voice commands will be simulated using text input.'));
        console.log(chalk.yellow('To set up credentials, run: codeagent voice --setup-credentials\n'));
      } else {
        // Set the environment variable for the credentials
        credentialsHelper.setEnvironmentVariable();
        console.log(chalk.green('Google Cloud Speech credentials found.'));
      }
      
      console.log('Voice commands allow you to control CodeAgent using your voice.');
      console.log('For full voice recognition, ensure the necessary audio recording');
      console.log('libraries are installed for your platform.\n');
      
      // Set up custom commands if requested
      if (options.custom) {
        await voiceManager.setupCustomCommands();
      }
      
      // Show available commands
      voiceManager.showHelp();
      
      // Start voice command mode
      await voiceManager.start(options.keyword, options.wakeWord);
    });
}
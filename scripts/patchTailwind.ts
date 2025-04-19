/**
 * TerraFusion Token Patcher
 * 
 * This script imports TerraFusion design tokens and updates the Tailwind configuration
 * to incorporate the new design system values.
 */

import * as fs from 'fs';
import * as path from 'path';

// Check if a token file path was provided
if (process.argv.length < 3) {
  console.error('Usage: npx ts-node ./scripts/patchTailwind.ts <path-to-tokens-file>');
  process.exit(1);
}

const tokenFilePath = process.argv[2];
const tailwindConfigPath = path.resolve(process.cwd(), 'tailwind.config.ts');

// Ensure the token file exists
if (!fs.existsSync(tokenFilePath)) {
  console.error(`Error: Token file ${tokenFilePath} not found`);
  process.exit(1);
}

// Ensure the tailwind config exists
if (!fs.existsSync(tailwindConfigPath)) {
  console.error(`Error: Tailwind config file ${tailwindConfigPath} not found`);
  process.exit(1);
}

try {
  // Read the tokens file
  const tokensData = JSON.parse(fs.readFileSync(tokenFilePath, 'utf8'));
  
  // Read the tailwind config
  let tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf8');
  
  // Extract the color tokens
  const colorTokens = tokensData.colors || {};
  
  // Create the theme extension object
  const themeExtension = {
    colors: {
      'tf-primary': colorTokens.primary || 'hsl(211 100% 50%)',
      'tf-secondary': colorTokens.secondary || 'hsl(211 30% 40%)',
      'tf-accent': colorTokens.accent || 'hsl(211 90% 60%)',
      'tf-background': colorTokens.background || 'hsl(0 0% 100%)',
      'tf-foreground': colorTokens.foreground || 'hsl(211 10% 10%)',
      // Add any additional TerraFusion specific colors
    },
    fontFamily: tokensData.fontFamily || {},
    borderRadius: tokensData.borderRadius || {},
    // Add any other theme properties from TerraFusion tokens
  };
  
  // Simplified patching by finding the theme.extend section and adding our tokens
  // This is a basic implementation - for production, consider using a more robust parser
  const themeExtendMarker = /theme\s*:\s*{[\s\S]*?extend\s*:\s*{/;
  
  if (themeExtendMarker.test(tailwindConfig)) {
    console.log('Found theme.extend section, patching...');
    
    // Convert theme extension to a string representation
    const themeExtensionString = JSON.stringify(themeExtension, null, 2)
      .replace(/"([^"]+)":/g, '$1:') // Remove quotes around property names
      .replace(/"/g, "'"); // Replace double quotes with single quotes
    
    // Replace the first occurrence of theme.extend with our patched version
    tailwindConfig = tailwindConfig.replace(
      themeExtendMarker,
      (match) => {
        // Add TerraFusion tokens to the theme.extend object
        return match + `
      // TerraFusion Design Tokens
      colors: {
        ...${themeExtensionString.colors},
      },
      fontFamily: {
        ...${themeExtensionString.fontFamily},
      },
      borderRadius: {
        ...${themeExtensionString.borderRadius},
      },`;
      }
    );
    
    // Write the updated config back to file
    fs.writeFileSync(tailwindConfigPath, tailwindConfig);
    console.log(`Successfully patched ${tailwindConfigPath} with TerraFusion tokens`);
  } else {
    console.error('Could not find theme.extend section in Tailwind config');
    process.exit(1);
  }
} catch (error) {
  console.error('Error patching Tailwind config:', error);
  process.exit(1);
}
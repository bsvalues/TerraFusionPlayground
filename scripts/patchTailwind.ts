#!/usr/bin/env ts-node

/**
 * Patch Tailwind Config with TerraFusion Tokens
 * 
 * This script reads the TerraFusion token file and updates the Tailwind config
 * with the appropriate color, font, and spacing tokens.
 * 
 * Usage: npx ts-node scripts/patchTailwind.ts tokens/terrafusion.json
 */

import fs from 'fs';
import path from 'path';

// Command line argument check
if (process.argv.length < 3) {
  console.error('Usage: npx ts-node scripts/patchTailwind.ts <token-file>');
  process.exit(1);
}

const tokenFilePath = process.argv[2];
const tailwindConfigPath = path.resolve(process.cwd(), 'tailwind.config.ts');

// Check if token file exists
if (!fs.existsSync(tokenFilePath)) {
  console.error(`Token file not found: ${tokenFilePath}`);
  process.exit(1);
}

// Check if Tailwind config exists
if (!fs.existsSync(tailwindConfigPath)) {
  console.error(`Tailwind config not found: ${tailwindConfigPath}`);
  process.exit(1);
}

// Read and parse token file
const tokenFileContent = fs.readFileSync(tokenFilePath, 'utf-8');
const tokenData = JSON.parse(tokenFileContent);

// Read Tailwind config
let tailwindConfigContent = fs.readFileSync(tailwindConfigPath, 'utf-8');

// Build the color token object for Tailwind
const buildColorTokens = () => {
  const colors = {
    // Primary colors
    'primary-blue': 'hsl(210, 100%, 45%)',
    'primary-blue-light': 'hsl(210, 100%, 55%)',
    'primary-blue-dark': 'hsl(210, 100%, 35%)',
    'primary-green': 'hsl(145, 63%, 42%)',
    'primary-green-light': 'hsl(145, 63%, 52%)',
    'primary-green-dark': 'hsl(145, 63%, 32%)',
    'primary-orange': 'hsl(30, 100%, 50%)',
    'primary-orange-light': 'hsl(30, 100%, 60%)',
    'primary-orange-dark': 'hsl(30, 100%, 40%)',
    'primary-red': 'hsl(0, 85%, 55%)',
    'primary-red-light': 'hsl(0, 85%, 65%)',
    'primary-red-dark': 'hsl(0, 85%, 45%)',

    // Secondary colors
    'secondary-blue': 'hsl(210, 100%, 65%)',
    'secondary-blue-light': 'hsl(210, 100%, 85%)',
    'secondary-green': 'hsl(145, 63%, 62%)',
    'secondary-green-light': 'hsl(145, 63%, 82%)',
    'secondary-orange': 'hsl(30, 100%, 70%)',
    'secondary-orange-light': 'hsl(30, 100%, 90%)',
    'secondary-red': 'hsl(0, 85%, 75%)',
    'secondary-red-light': 'hsl(0, 85%, 95%)',

    // Neutral colors
    'primary-gray-dark': 'hsl(210, 10%, 25%)',
    'primary-gray': 'hsl(210, 10%, 50%)',
    'primary-gray-light': 'hsl(210, 10%, 75%)',
    'secondary-gray-ultralight': 'hsl(210, 10%, 95%)',
    'secondary-gray-light': 'hsl(210, 10%, 90%)',
    'secondary-gray': 'hsl(210, 10%, 85%)',

    // Accent colors
    'accent-teal': 'hsl(180, 70%, 45%)',
    'accent-purple': 'hsl(270, 70%, 55%)',
    'accent-gold': 'hsl(45, 90%, 50%)',

    // System colors
    'success': 'hsl(145, 80%, 42%)',
    'warning': 'hsl(45, 100%, 50%)',
    'error': 'hsl(0, 85%, 55%)',
    'info': 'hsl(210, 100%, 55%)',

    // Background colors
    'background-light': 'hsl(210, 10%, 98%)',
    'background-dark': 'hsl(210, 15%, 12%)',

    // Surface colors
    'surface-light': 'hsl(0, 0%, 100%)',
    'surface-dark': 'hsl(210, 15%, 18%)',
  };

  return colors;
};

// Update Tailwind theme configuration
const injectTerraFusionConfig = () => {
  const colors = buildColorTokens();
  
  // Create the theme extension configuration
  const terraFusionThemeConfig = `
  theme: {
    extend: {
      colors: {
        // TerraFusion Colors
        ${Object.entries(colors)
          .map(([key, value]) => `"${key}": "${value}"`)
          .join(',\n        ')}
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
    },
  },`;

  // Find and replace the theme configuration in the Tailwind config
  const themeRegex = /theme\s*:\s*{[^}]*extend\s*:\s*{[^}]*},?[^}]*},?/s;
  
  if (themeRegex.test(tailwindConfigContent)) {
    tailwindConfigContent = tailwindConfigContent.replace(themeRegex, terraFusionThemeConfig);
  } else {
    console.error('Could not find theme configuration in Tailwind config.');
    process.exit(1);
  }

  // Write the updated configuration back to the file
  fs.writeFileSync(tailwindConfigPath, tailwindConfigContent, 'utf-8');
  
  console.log(`Successfully patched Tailwind config with TerraFusion tokens: ${tailwindConfigPath}`);
};

// Patch the Tailwind config
try {
  injectTerraFusionConfig();
} catch (error) {
  console.error('Error patching Tailwind config:', error);
  process.exit(1);
}
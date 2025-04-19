/**
 * OpenLayers Extensions Utilities
 * 
 * Helper functions for dynamically importing ol-ext components to handle CommonJS/ESM compatibility issues.
 */

/**
 * Dynamically import an ol-ext component with fallback paths.
 * Handles both ESM and CommonJS module formats.
 * 
 * @param importPath Path to the ol-ext component (e.g., 'control/Elevation')
 * @returns Promise resolving to the imported module
 */
export async function importOlExt(importPath: string) {
  try {
    // Try the standard import path first
    /* @vite-ignore */
    return await import(`ol-ext/${importPath}`);
  } catch (error) {
    console.error(`Failed to import ol-ext/${importPath}:`, error);
    try {
      // Try the dist folder as fallback
      /* @vite-ignore */
      return await import(`ol-ext/dist/${importPath}`);
    } catch (fallbackError) {
      console.error(`Failed to import ol-ext/dist/${importPath}:`, fallbackError);
      
      // Final fallback approach - try with default export handling
      try {
        /* @vite-ignore */
        const module = await import(`ol-ext/dist/${importPath}`);
        return { default: module.default || module };
      } catch (finalError) {
        console.error(`All import attempts failed for ${importPath}:`, finalError);
        return { default: null };
      }
    }
  }
}

/**
 * Generate a color palette based on the number of segments needed
 * 
 * @param count Number of colors needed
 * @param opacity Optional opacity value (0-1)
 * @returns Array of color strings (hex or rgba)
 */
export function generateColors(count: number, opacity?: number): string[] {
  // Predefined color palette for common property types
  const baseColors = [
    '#4285F4', // blue
    '#34A853', // green
    '#FBBC05', // yellow
    '#EA4335', // red
    '#673AB7', // purple
    '#3F51B5', // indigo
    '#009688', // teal
    '#FF5722', // deep orange
    '#795548', // brown
    '#607D8B', // blue grey
    '#E91E63', // pink
    '#9C27B0'  // deep purple
  ];
  
  // If we need more colors than in our base palette, generate them
  const colors: string[] = [];
  
  for (let i = 0; i < count; i++) {
    if (i < baseColors.length) {
      // Use predefined colors first
      colors.push(opacity !== undefined ? hexToRgba(baseColors[i], opacity) : baseColors[i]);
    } else {
      // Generate additional colors using HSL for better distribution
      const hue = (i * 137.5) % 360; // Use golden angle approximation for distribution
      const saturation = 75;
      const lightness = 60;
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      colors.push(opacity !== undefined ? hslToRgba(hue, saturation, lightness, opacity) : color);
    }
  }
  
  return colors;
}

/**
 * Convert hex color to RGBA
 */
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Convert HSL values to RGBA
 */
function hslToRgba(h: number, s: number, l: number, opacity: number): string {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
/**
 * TerraFusion color palette constants
 */

// Primary colors
export const TERRAFUSION_PRIMARY = '#00e5ff';
export const TERRAFUSION_PRIMARY_DARK = '#00b8d4';
export const TERRAFUSION_PRIMARY_LIGHT = '#6effff';

// Secondary colors
export const TERRAFUSION_SECONDARY = '#2962ff';
export const TERRAFUSION_SECONDARY_DARK = '#0039cb';
export const TERRAFUSION_SECONDARY_LIGHT = '#768fff';

// Accent colors
export const TERRAFUSION_ACCENT = '#ff3d00';
export const TERRAFUSION_ACCENT_DARK = '#c30000';
export const TERRAFUSION_ACCENT_LIGHT = '#ff7539';

// Neutral colors
export const TERRAFUSION_NEUTRAL_100 = '#f5f5f5';
export const TERRAFUSION_NEUTRAL_200 = '#e0e0e0';
export const TERRAFUSION_NEUTRAL_300 = '#bdbdbd';
export const TERRAFUSION_NEUTRAL_400 = '#9e9e9e';
export const TERRAFUSION_NEUTRAL_500 = '#757575';
export const TERRAFUSION_NEUTRAL_600 = '#616161';
export const TERRAFUSION_NEUTRAL_700 = '#424242';
export const TERRAFUSION_NEUTRAL_800 = '#212121';
export const TERRAFUSION_NEUTRAL_900 = '#121212';

// Semantic colors
export const TERRAFUSION_SUCCESS = '#00c853';
export const TERRAFUSION_WARNING = '#ffd600';
export const TERRAFUSION_ERROR = '#ff1744';
export const TERRAFUSION_INFO = '#00b0ff';

/**
 * Get a color with opacity
 * @param color The color in hex format
 * @param opacity The opacity value (0-1)
 * @returns The color with opacity in rgba format
 */
export function withOpacity(color: string, opacity: number): string {
  // Convert hex to rgb
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
/**
 * TerraFusion theming utilities and interfaces
 */

export type TerraFusionThemeVariant = 'professional' | 'tint' | 'vibrant';
export type TerraFusionAppearance = 'light' | 'dark' | 'system';

export interface TerraFusionTheme {
  primary: string;
  variant: TerraFusionThemeVariant;
  appearance: TerraFusionAppearance;
  radius: number;
}

const DEFAULT_THEME: TerraFusionTheme = {
  primary: '#00e5ff',
  variant: 'professional',
  appearance: 'system',
  radius: 4
};

/**
 * Gets the current theme or the default theme if none is set
 */
export function getCurrentTheme(): TerraFusionTheme {
  try {
    // Try to get the theme from localStorage
    const storedTheme = localStorage.getItem('terraFusionTheme');
    if (storedTheme) {
      return JSON.parse(storedTheme) as TerraFusionTheme;
    }
  } catch (error) {
    console.error('Error reading theme from localStorage:', error);
  }
  
  return DEFAULT_THEME;
}

/**
 * Sets the current theme
 */
export function setCurrentTheme(theme: Partial<TerraFusionTheme>): void {
  try {
    const currentTheme = getCurrentTheme();
    const newTheme = { ...currentTheme, ...theme };
    localStorage.setItem('terraFusionTheme', JSON.stringify(newTheme));
    
    // Dispatch a theme change event
    window.dispatchEvent(new CustomEvent('terraFusionThemeChange', { detail: newTheme }));
  } catch (error) {
    console.error('Error saving theme to localStorage:', error);
  }
}

/**
 * Generates CSS variables for the theme
 */
export function generateThemeVariables(theme: TerraFusionTheme): Record<string, string> {
  return {
    '--tf-primary': theme.primary,
    '--tf-radius': `${theme.radius}px`,
    '--tf-variant': theme.variant,
    '--tf-appearance': theme.appearance
  };
}

/**
 * Applies theme variables to the document
 */
export function applyThemeToDocument(theme: TerraFusionTheme): void {
  const variables = generateThemeVariables(theme);
  const root = document.documentElement;
  
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  // Apply light/dark class
  if (theme.appearance === 'light' || (theme.appearance === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
}
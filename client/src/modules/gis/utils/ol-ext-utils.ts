/**
 * OpenLayers Extension Utilities
 * 
 * This file provides simplified utilities for working with OpenLayers
 * without relying on the problematic ol-ext library.
 */

// Safe dynamic import function for ol-ext modules
export async function importOlExt(modulePath: string) {
  console.log(`Attempted to import ol-ext/${modulePath} but using fallback functionality instead`);
  return {
    default: null,
    // Mock additional exports as needed
  };
}

// Fallback implementations for common ol-ext functions
export const olExtFallbacks = {
  // Example fallback for an ElevationFilter
  createElevationFilter: (options: any) => {
    console.log('Using fallback elevation filter with options:', options);
    // Return a minimal compatible interface
    return {
      setElevation: (value: number) => console.log(`Setting elevation to ${value}`),
      setColor: (color: any) => console.log(`Setting color to`, color),
      setLighting: (options: any) => console.log(`Setting lighting`, options)
    };
  }
};

// Map service types
export interface MapProviderOptions {
  apiKey?: string;
  mapType?: string;
  center?: [number, number];
  zoom?: number;
}

export type MapProviderType = 'mapbox' | 'google' | 'qgis' | 'osm';
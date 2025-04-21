import React, { createContext, useContext, useState, useEffect } from 'react';

// Interface for GIS context
interface GISContextType {
  isMapLoaded: boolean;
  mapboxTokenAvailable: boolean;
  setMapLoaded: (loaded: boolean) => void;
  mapboxToken?: string;
  mapLoadErrors: string[];
  addMapError: (error: string) => void;
  clearMapErrors: () => void;
  useOpenStreetMapFallback: boolean;
}

// Create context with default values
const GISContext = createContext<GISContextType>({
  isMapLoaded: false,
  mapboxTokenAvailable: false,
  setMapLoaded: () => {},
  mapboxToken: undefined,
  mapLoadErrors: [],
  addMapError: () => {},
  clearMapErrors: () => {},
  useOpenStreetMapFallback: true
});

// Provider component
export const GISProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | undefined>(undefined);
  const [mapLoadErrors, setMapLoadErrors] = useState<string[]>([]);
  const [useOpenStreetMapFallback, setUseOpenStreetMapFallback] = useState(true);
  
  // Check if Mapbox token is available
  useEffect(() => {
    try {
      // Check for both possible env variable names
      const token = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.MAPBOX_TOKEN || '';
      
      if (token && token.trim().length > 0) {
        console.log("Mapbox token found in environment variables");
        setMapboxToken(token);
        setUseOpenStreetMapFallback(false);
      } else {
        console.log("No Mapbox token found in environment variables, using OpenStreetMap fallback");
        setMapboxToken(undefined);
        setUseOpenStreetMapFallback(true);
      }
    } catch (error) {
      console.error("Error accessing environment variables:", error);
      setMapboxToken(undefined);
      setUseOpenStreetMapFallback(true);
      addMapError("Failed to access environment variables for map configuration");
    }
  }, []);
  
  const setMapLoaded = (loaded: boolean) => {
    setIsMapLoaded(loaded);
  };
  
  const addMapError = (error: string) => {
    setMapLoadErrors(prev => [...prev, error]);
  };
  
  const clearMapErrors = () => {
    setMapLoadErrors([]);
  };
  
  const value = {
    isMapLoaded,
    mapboxTokenAvailable: !!mapboxToken,
    setMapLoaded,
    mapboxToken,
    mapLoadErrors,
    addMapError,
    clearMapErrors,
    useOpenStreetMapFallback
  };
  
  return (
    <GISContext.Provider value={value}>
      {children}
    </GISContext.Provider>
  );
};

// Custom hook for using GIS context
export const useGIS = () => useContext(GISContext);
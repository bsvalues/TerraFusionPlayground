import React, { createContext, useContext, useState, useEffect } from 'react';

// Interface for GIS context
interface GISContextType {
  isMapLoaded: boolean;
  mapboxTokenAvailable: boolean;
  setMapLoaded: (loaded: boolean) => void;
  mapboxToken?: string;
}

// Create context with default values
const GISContext = createContext<GISContextType>({
  isMapLoaded: false,
  mapboxTokenAvailable: false,
  setMapLoaded: () => {}
});

// Provider component
export const GISProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | undefined>(undefined);
  
  // Check if Mapbox token is available
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN || '';
    setMapboxToken(token || undefined);
  }, []);
  
  const setMapLoaded = (loaded: boolean) => {
    setIsMapLoaded(loaded);
  };
  
  const value = {
    isMapLoaded,
    mapboxTokenAvailable: !!mapboxToken,
    setMapLoaded,
    mapboxToken
  };
  
  return (
    <GISContext.Provider value={value}>
      {children}
    </GISContext.Provider>
  );
};

// Custom hook for using GIS context
export const useGIS = () => useContext(GISContext);
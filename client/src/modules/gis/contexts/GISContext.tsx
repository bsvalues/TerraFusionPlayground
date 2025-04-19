import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

/**
 * GIS Context for managing map state and operations
 * 
 * This context provides state management for the GIS module including:
 * - Map center and zoom level
 * - Layer visibility and opacity
 * - Feature selection
 * - Map operations
 */

// Types
interface GISLayer {
  id: string;
  name: string;
  type: 'base' | 'vector' | 'raster';
  visible: boolean;
  opacity: number;
  source?: string;
  metadata?: Record<string, any>;
}

interface GISContextType {
  // Layer management
  visibleLayers: Record<string, boolean>;
  toggleLayerVisibility: (layerId: string) => void;
  baseMapType: 'osm' | 'satellite' | 'terrain';
  setBaseMapType: (type: 'osm' | 'satellite' | 'terrain') => void;
  
  // Map state
  center: [number, number];
  setCenter: (center: [number, number]) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  
  // Feature selection
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  
  // Layer manipulation
  layerOpacity: Record<string, number>;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  
  // User interface state
  isLayersPanelOpen: boolean;
  toggleLayersPanel: () => void;
  isFullScreen: boolean;
  toggleFullScreen: () => void;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string | null;
  
  // GIS operations
  createSnapshot: () => Promise<string>;
  exportCurrentView: (format: 'png' | 'jpg' | 'pdf') => Promise<string>;
}

// Default values
const defaultGISContext: GISContextType = {
  visibleLayers: {},
  toggleLayerVisibility: () => {},
  baseMapType: 'osm',
  setBaseMapType: () => {},
  
  center: [-119.7, 46.2], // Benton County, WA
  setCenter: () => {},
  zoom: 10,
  setZoom: () => {},
  
  selectedFeatureId: null,
  setSelectedFeatureId: () => {},
  
  layerOpacity: {},
  setLayerOpacity: () => {},
  
  isLayersPanelOpen: false,
  toggleLayersPanel: () => {},
  isFullScreen: false,
  toggleFullScreen: () => {},
  
  isLoading: false,
  loadingMessage: null,
  
  createSnapshot: async () => '',
  exportCurrentView: async () => '',
};

// Create context
const GISContext = createContext<GISContextType>(defaultGISContext);

/**
 * Hook to access GIS context
 */
export const useGIS = () => useContext(GISContext);

/**
 * GIS Provider component
 */
export const GISProvider = ({ children }: { children: ReactNode }) => {
  // Layer management
  const [visibleLayers, setVisibleLayersState] = useState<Record<string, boolean>>({});
  const [baseMapType, setBaseMapType] = useState<'osm' | 'satellite' | 'terrain'>('osm');
  
  // Map state
  const [center, setCenter] = useState<[number, number]>([-119.7, 46.2]); // Benton County, WA
  const [zoom, setZoom] = useState<number>(10);
  
  // Feature selection
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  
  // Layer manipulation
  const [layerOpacity, setLayerOpacityState] = useState<Record<string, number>>({});
  
  // UI state
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  
  // Layer visibility toggle
  const toggleLayerVisibility = (layerId: string) => {
    setVisibleLayersState(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
  };
  
  // Layer opacity setter
  const setLayerOpacity = (layerId: string, opacity: number) => {
    setLayerOpacityState(prev => ({
      ...prev,
      [layerId]: opacity
    }));
  };
  
  // Toggle layers panel
  const toggleLayersPanel = () => {
    setIsLayersPanelOpen(prev => !prev);
  };
  
  // Toggle full screen
  const toggleFullScreen = () => {
    setIsFullScreen(prev => !prev);
  };
  
  // Create snapshot
  const createSnapshot = async (): Promise<string> => {
    // This would call a method on the map instance to create a snapshot
    // For now, just return a placeholder
    return Promise.resolve('snapshot.png');
  };
  
  // Export current view
  const exportCurrentView = async (format: 'png' | 'jpg' | 'pdf'): Promise<string> => {
    // This would call a method to export the current view in the specified format
    // For now, just return a placeholder
    return Promise.resolve(`export.${format}`);
  };
  
  // Build the context value
  const contextValue: GISContextType = {
    visibleLayers,
    toggleLayerVisibility,
    baseMapType,
    setBaseMapType,
    
    center,
    setCenter,
    zoom,
    setZoom,
    
    selectedFeatureId,
    setSelectedFeatureId,
    
    layerOpacity,
    setLayerOpacity,
    
    isLayersPanelOpen,
    toggleLayersPanel,
    isFullScreen,
    toggleFullScreen,
    
    isLoading,
    loadingMessage,
    
    createSnapshot,
    exportCurrentView,
  };
  
  return (
    <GISContext.Provider value={contextValue}>
      {children}
    </GISContext.Provider>
  );
};
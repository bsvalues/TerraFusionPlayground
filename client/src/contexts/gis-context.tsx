import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useGISServices } from '@/hooks/use-gis-services';

interface GISContextType {
  // Layer management
  visibleLayers: number[];
  toggleLayerVisibility: (layerId: number) => void;
  baseMapId: number | null;
  setBaseMapId: (id: number | null) => void;
  
  // Map state
  center: [number, number];
  setCenter: (center: [number, number]) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  
  // Feature selection
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  
  // Layer manipulation
  layerOpacity: Record<number, number>;
  setLayerOpacity: (layerId: number, opacity: number) => void;
  
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

const defaultGISContext: GISContextType = {
  visibleLayers: [],
  toggleLayerVisibility: () => {},
  baseMapId: null,
  setBaseMapId: () => {},
  
  center: [-119.7, 46.2], // Benton County, WA coordinates
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

const GISContext = createContext<GISContextType>(defaultGISContext);

export const useGIS = () => useContext(GISContext);

export const GISProvider = ({ children }: { children: ReactNode }) => {
  const { useLayers } = useGISServices();
  const { data: layers, isLoading: isLayersLoading } = useLayers();
  
  // Layer management
  const [visibleLayers, setVisibleLayers] = useState<number[]>([]);
  const [baseMapId, setBaseMapId] = useState<number | null>(null);
  
  // Map state
  const [center, setCenter] = useState<[number, number]>([-119.7, 46.2]); // Benton County, WA
  const [zoom, setZoom] = useState<number>(10);
  
  // Feature selection
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  
  // Layer manipulation
  const [layerOpacity, setLayerOpacityState] = useState<Record<number, number>>({});
  
  // UI state
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(isLayersLoading);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(
    isLayersLoading ? 'Loading GIS layers...' : null
  );

  // Set initial visible layers when layers are loaded
  useEffect(() => {
    if (layers) {
      // Set default visible layers (non-basemaps that are marked as visible)
      const defaultVisible = layers
        .filter(layer => layer.is_visible && !layer.is_basemap)
        .map(layer => layer.id);
      
      setVisibleLayers(defaultVisible);
      
      // Set default basemap
      const defaultBasemap = layers.find(layer => layer.is_basemap && layer.is_visible);
      if (defaultBasemap) {
        setBaseMapId(defaultBasemap.id);
      }
      
      // Set default opacity for all layers
      const defaultOpacity: Record<number, number> = {};
      layers.forEach(layer => {
        defaultOpacity[layer.id] = layer.opacity / 100; // Convert from percentage to decimal
      });
      setLayerOpacityState(defaultOpacity);
    }
  }, [layers]);
  
  // Update loading state when layers are loading
  useEffect(() => {
    setIsLoading(isLayersLoading);
    setLoadingMessage(isLayersLoading ? 'Loading GIS layers...' : null);
  }, [isLayersLoading]);
  
  // Toggle layer visibility
  const toggleLayerVisibility = (layerId: number) => {
    setVisibleLayers(prev => {
      if (prev.includes(layerId)) {
        return prev.filter(id => id !== layerId);
      } else {
        return [...prev, layerId];
      }
    });
  };
  
  // Set layer opacity
  const setLayerOpacity = (layerId: number, opacity: number) => {
    setLayerOpacityState(prev => ({
      ...prev,
      [layerId]: opacity,
    }));
  };
  
  // Toggle layers panel
  const toggleLayersPanel = () => {
    setIsLayersPanelOpen(prev => !prev);
  };
  
  // Toggle fullscreen
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
  
  const contextValue: GISContextType = {
    visibleLayers,
    toggleLayerVisibility,
    baseMapId,
    setBaseMapId,
    
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
import { useState, useEffect, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import 'ol/ol.css';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Slider 
} from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Layers, 
  ZoomIn, 
  ZoomOut,
  Loader,
  Settings,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import AnimatedClusterLayer from './AnimatedClusterLayer';
import { useToast } from '@/hooks/use-toast';

// Base map types
type BaseMapType = 'osm' | 'satellite' | 'topo';

interface ClusteringDemoProps {
  className?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
}

/**
 * Clustering Demonstration Component
 * 
 * This component showcases animated clustering for property data:
 * - Demonstrates how clustering groups nearby properties
 * - Shows animation effects when zooming or panning
 * - Allows customization of clustering parameters
 * - Displays different types of property data
 */
const ClusteringDemo = ({
  className,
  initialCenter = [-119.7, 46.2], // Benton County, WA
  initialZoom = 10
}: ClusteringDemoProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [baseMapType, setBaseMapType] = useState<BaseMapType>('osm');
  const [clusterDistance, setClusterDistance] = useState<number>(40);
  const [animationEnabled, setAnimationEnabled] = useState<boolean>(true);
  const [selectedCluster, setSelectedCluster] = useState<any>(null);
  
  // Fetch property data from API
  const { data: propertyData, isLoading: isLoadingProperties } = useQuery({
    queryKey: ['/api/properties'],
    staleTime: 60000,
  });
  
  // Convert property data to the format expected by AnimatedClusterLayer
  const formattedData = propertyData ? propertyData.map((property: any) => ({
    id: property.propertyId,
    position: property.coordinates || generateRandomNearbyCoordinate(initialCenter),
    properties: {
      address: property.address,
      value: property.assessedValue,
      type: property.propertyType,
      status: property.status,
      yearBuilt: property.yearBuilt
    }
  })) : [];
  
  // Helper function to generate random coordinates for demo purposes
  // Only used if property doesn't have coordinates
  function generateRandomNearbyCoordinate(center: [number, number]): [number, number] {
    const radius = 0.2; // Approximately 20km
    const x = center[0] + (Math.random() - 0.5) * radius;
    const y = center[1] + (Math.random() - 0.5) * radius;
    return [x, y];
  }
  
  // Get base map layer based on selected type
  const getBaseMapLayer = (type: BaseMapType) => {
    switch (type) {
      case 'satellite':
        return new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 19,
            attributions: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">ArcGIS</a>'
          })
        });
      case 'topo':
        return new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 19,
            attributions: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer">ArcGIS</a>'
          })
        });
      case 'osm':
      default:
        return new TileLayer({
          source: new OSM()
        });
    }
  };
  
  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    const map = new Map({
      target: mapRef.current,
      layers: [
        getBaseMapLayer(baseMapType)
      ],
      view: new View({
        center: fromLonLat(initialCenter),
        zoom: initialZoom,
        maxZoom: 19
      }),
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: true
      })
    });
    
    mapInstanceRef.current = map;
    setIsLoading(false);
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, []);
  
  // Update base map when type changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    const layers = map.getLayers();
    
    // Remove existing base layer
    if (layers.getLength() > 0) {
      layers.removeAt(0);
    }
    
    // Add new base layer
    layers.insertAt(0, getBaseMapLayer(baseMapType));
  }, [baseMapType]);
  
  // Handle cluster click
  const handleClusterClick = (features: any[], coordinate: number[]) => {
    if (features.length > 1) {
      setSelectedCluster({
        count: features.length,
        properties: features.map(feature => feature.getProperties()),
        coordinate
      });
      
      toast({
        title: `Cluster selected`,
        description: `${features.length} properties in this area`,
        duration: 3000
      });
    }
  };
  
  // Helper function to zoom in/out
  const adjustZoom = (delta: number) => {
    if (!mapInstanceRef.current) return;
    
    const view = mapInstanceRef.current.getView();
    const currentZoom = view.getZoom() || initialZoom;
    view.animate({
      zoom: currentZoom + delta,
      duration: 250
    });
  };
  
  return (
    <div className={cn("relative h-full w-full", className)}>
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-full"
      />
      
      {/* Loading indicator */}
      {(isLoading || isLoadingProperties) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50">
          <div className="text-center">
            <Skeleton className="h-32 w-32 rounded-full mx-auto" />
            <p className="mt-4 font-medium">Loading clustering demo...</p>
          </div>
        </div>
      )}
      
      {/* Animated Cluster Layer */}
      {mapInstanceRef.current && formattedData.length > 0 && (
        <AnimatedClusterLayer
          map={mapInstanceRef.current}
          data={formattedData}
          distance={clusterDistance}
          animationEnabled={animationEnabled}
          onClusterClick={handleClusterClick}
        />
      )}
      
      {/* Controls Panel */}
      <div className="absolute top-4 right-4 z-10 bg-background/90 p-3 rounded-lg shadow-md border border-border w-64">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center">
            <Filter className="h-4 w-4 mr-1 text-primary" /> 
            Clustering Controls
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Base Map Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Base Map</label>
            <Select 
              value={baseMapType} 
              onValueChange={(value: BaseMapType) => setBaseMapType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select base map" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="osm">OpenStreetMap</SelectItem>
                <SelectItem value="satellite">Satellite</SelectItem>
                <SelectItem value="topo">Topographic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Cluster Distance Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Cluster Distance</label>
              <span className="text-xs">{clusterDistance}px</span>
            </div>
            <Slider
              min={10}
              max={100}
              step={5}
              value={[clusterDistance]}
              onValueChange={(values) => setClusterDistance(values[0])}
            />
          </div>
          
          {/* Animation Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">Animation</label>
            <Button
              variant={animationEnabled ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setAnimationEnabled(!animationEnabled)}
            >
              {animationEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center justify-center space-x-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustZoom(-1)}
              className="flex-1"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustZoom(1)}
              className="flex-1"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Cluster Info Panel */}
      {selectedCluster && (
        <div className="absolute bottom-4 left-4 z-10 bg-background/95 p-3 rounded-lg shadow-md border border-border max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Cluster Details</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setSelectedCluster(null)}
            >
              ×
            </Button>
          </div>
          <div className="text-xs space-y-1">
            <p className="font-medium">{selectedCluster.count} properties</p>
            <p>Property types: {Array.from(new Set(selectedCluster.properties.map((p: any) => p.type || 'Unknown'))).join(', ')}</p>
            <p>Average value: ${Math.round(selectedCluster.properties.reduce((sum: number, p: any) => sum + (parseInt(p.value) || 0), 0) / selectedCluster.count).toLocaleString()}</p>
          </div>
        </div>
      )}
      
      {/* Data Attribution */}
      <div className="absolute bottom-2 right-2 z-10 text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">
        {formattedData.length} properties displayed
      </div>
    </div>
  );
};

export default ClusteringDemo;
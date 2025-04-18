/**
 * Map Composer
 * 
 * A comprehensive UI for creating, styling, and configuring maps.
 * Provides drag-and-drop functionality, layer management, and styling options.
 */

import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Trash2, 
  Settings, 
  Move, 
  Plus,
  Save,
  Download,
  Share,
  HelpCircle,
  Palette
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AIPulseIndicator } from '@/components/ui/ai-pulse-indicator';
import { useToast } from '@/hooks/use-toast';

// Layer types
export enum LayerType {
  BASE_MAP = 'base_map',
  VECTOR = 'vector',
  POINT = 'point',
  RASTER = 'raster',
  GROUP = 'group',
  ANALYSIS = 'analysis',
}

// Layer interface
export interface MapLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  zIndex: number;
  source?: {
    type: string;
    url?: string;
    data?: any;
  };
  style?: any;
  metadata?: {
    description?: string;
    attribution?: string;
    dateCreated?: Date;
    dateModified?: Date;
    tags?: string[];
  };
  children?: MapLayer[];
}

// Base map options
export interface BaseMapOption {
  id: string;
  name: string;
  thumbnailUrl: string;
  url: string;
  type: 'tile' | 'vector' | 'wms';
  attribution: string;
}

// Style template options
export interface StyleTemplate {
  id: string;
  name: string;
  thumbnailUrl: string;
  description: string;
  category: 'thematic' | 'reference' | 'analysis';
  style: any;
}

// Layer item component for drag and drop
interface LayerItemProps {
  layer: MapLayer;
  index: number;
  onToggleVisibility: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  onEditLayer: (id: string) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
}

// Drag item type
const LAYER_ITEM_TYPE = 'LAYER_ITEM';

function LayerItem({ 
  layer, 
  index,
  onToggleVisibility,
  onRemoveLayer,
  onEditLayer,
  onReorderLayers
}: LayerItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  // Set up drag source
  const [{ isDragging }, drag] = useDrag({
    type: LAYER_ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  // Set up drop target
  const [, drop] = useDrop({
    accept: LAYER_ITEM_TYPE,
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      
      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      
      // Time to actually perform the action
      onReorderLayers(dragIndex, hoverIndex);
      
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });
  
  drag(drop(ref));
  
  return (
    <div
      ref={ref}
      className={`flex items-center p-2 border rounded-md mb-2 ${isDragging ? 'opacity-50 bg-accent' : 'bg-card'}`}
      style={{ cursor: 'move' }}
    >
      <div className="mr-2">
        <Move className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium text-sm">{layer.name}</div>
        <div className="text-xs text-muted-foreground">
          {layer.type} ({layer.opacity * 100}% opacity)
        </div>
      </div>
      <div className="flex space-x-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onToggleVisibility(layer.id)}
        >
          {layer.visible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEditLayer(layer.id)}
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onRemoveLayer(layer.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Base map gallery component
interface BaseMapGalleryProps {
  baseMaps: BaseMapOption[];
  onSelectBaseMap: (baseMap: BaseMapOption) => void;
}

function BaseMapGallery({ baseMaps, onSelectBaseMap }: BaseMapGalleryProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {baseMaps.map((baseMap) => (
        <div
          key={baseMap.id}
          className="relative cursor-pointer rounded-md overflow-hidden border hover:border-primary transition-colors"
          onClick={() => onSelectBaseMap(baseMap)}
        >
          <img
            src={baseMap.thumbnailUrl}
            alt={baseMap.name}
            className="w-full h-20 object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-end">
            <div className="w-full p-1 bg-black/50 text-white text-xs truncate">
              {baseMap.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Style gallery component
interface StyleGalleryProps {
  styles: StyleTemplate[];
  onSelectStyle: (style: StyleTemplate) => void;
}

function StyleGallery({ styles, onSelectStyle }: StyleGalleryProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {styles.map((style) => (
        <div
          key={style.id}
          className="relative cursor-pointer rounded-md overflow-hidden border hover:border-primary transition-colors"
          onClick={() => onSelectStyle(style)}
        >
          <img
            src={style.thumbnailUrl}
            alt={style.name}
            className="w-full h-20 object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-end">
            <div className="w-full p-1 bg-black/50 text-white text-xs truncate">
              {style.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Layer editor component
interface LayerEditorProps {
  layer: MapLayer | null;
  onUpdateLayer: (updatedLayer: MapLayer) => void;
  onClose: () => void;
}

function LayerEditor({ layer, onUpdateLayer, onClose }: LayerEditorProps) {
  const [editedLayer, setEditedLayer] = useState<MapLayer | null>(null);
  
  useEffect(() => {
    setEditedLayer(layer ? { ...layer } : null);
  }, [layer]);
  
  if (!editedLayer) {
    return null;
  }
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedLayer({
      ...editedLayer,
      name: e.target.value
    });
  };
  
  const handleOpacityChange = (value: number[]) => {
    setEditedLayer({
      ...editedLayer,
      opacity: value[0] / 100
    });
  };
  
  const handleSave = () => {
    onUpdateLayer(editedLayer);
    onClose();
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Layer: {editedLayer.name}</CardTitle>
        <CardDescription>
          Customize layer properties and styling
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">
            Layer Name
          </label>
          <Input
            value={editedLayer.name}
            onChange={handleNameChange}
            placeholder="Enter layer name"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium block mb-1">
            Opacity: {Math.round(editedLayer.opacity * 100)}%
          </label>
          <Slider
            value={[editedLayer.opacity * 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={handleOpacityChange}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium block mb-1">
            Layer Type
          </label>
          <Select
            disabled
            value={editedLayer.type}
            onValueChange={() => {}}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select layer type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Layer Types</SelectLabel>
                {Object.values(LayerType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}

// Main Map Composer component
export function MapComposer() {
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [availableBaseMaps, setAvailableBaseMaps] = useState<BaseMapOption[]>([]);
  const [availableStyles, setAvailableStyles] = useState<StyleTemplate[]>([]);
  const [editingLayer, setEditingLayer] = useState<MapLayer | null>(null);
  const [mapName, setMapName] = useState<string>('New Map');
  const { toast } = useToast();
  
  // Fetch available base maps and styles
  useEffect(() => {
    // In a real implementation, this would fetch from an API
    // For now, use placeholder data
    
    // Sample base maps
    setAvailableBaseMaps([
      {
        id: 'osm',
        name: 'OpenStreetMap',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        type: 'tile',
        attribution: '© OpenStreetMap contributors'
      },
      {
        id: 'satellite',
        name: 'Satellite',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        type: 'tile',
        attribution: '© Esri'
      },
      {
        id: 'topo',
        name: 'Topographic',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=Topographic',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        type: 'tile',
        attribution: '© Esri'
      },
      {
        id: 'dark',
        name: 'Dark Mode',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=Dark+Mode',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        type: 'tile',
        attribution: '© CartoDB'
      }
    ]);
    
    // Sample styles
    setAvailableStyles([
      {
        id: 'choropleth',
        name: 'Choropleth',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=Choropleth',
        description: 'Color-coded map for numerical data',
        category: 'thematic',
        style: {
          type: 'fill',
          paint: {
            'fill-color': [
              'interpolate',
              ['linear'],
              ['get', 'value'],
              0, '#f7fbff',
              100, '#08306b'
            ],
            'fill-opacity': 0.7,
            'fill-outline-color': '#000'
          }
        }
      },
      {
        id: 'categorical',
        name: 'Categorical',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=Categorical',
        description: 'Distinct colors for categories',
        category: 'thematic',
        style: {
          type: 'fill',
          paint: {
            'fill-color': [
              'match',
              ['get', 'category'],
              'A', '#1f77b4',
              'B', '#ff7f0e',
              'C', '#2ca02c',
              'D', '#d62728',
              '#cccccc'
            ],
            'fill-opacity': 0.7,
            'fill-outline-color': '#000'
          }
        }
      },
      {
        id: 'heatmap',
        name: 'Heat Map',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=Heat+Map',
        description: 'Density visualization for point data',
        category: 'analysis',
        style: {
          type: 'heatmap',
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': 0.7,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 0, 255, 0)',
              0.2, 'rgba(0, 0, 255, 0.5)',
              0.4, 'rgba(0, 255, 255, 0.7)',
              0.6, 'rgba(0, 255, 0, 0.7)',
              0.8, 'rgba(255, 255, 0, 0.8)',
              1, 'rgba(255, 0, 0, 1)'
            ],
            'heatmap-radius': 20,
            'heatmap-opacity': 0.7
          }
        }
      },
      {
        id: 'bubble',
        name: 'Bubble Map',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=Bubble+Map',
        description: 'Sized circles for quantitative values',
        category: 'analysis',
        style: {
          type: 'circle',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'value'], 0, 4, 100, 20],
            'circle-color': '#1f77b4',
            'circle-opacity': 0.7,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
          }
        }
      }
    ]);
  }, []);
  
  // Handle adding a base map layer
  const handleAddBaseMap = (baseMap: BaseMapOption) => {
    // Create a new layer for the base map
    const newLayer: MapLayer = {
      id: `layer-${Date.now()}`,
      name: baseMap.name,
      type: LayerType.BASE_MAP,
      visible: true,
      opacity: 1,
      zIndex: 0, // Base maps always at the bottom
      source: {
        type: baseMap.type,
        url: baseMap.url
      },
      metadata: {
        attribution: baseMap.attribution
      }
    };
    
    // Check if we already have a base map layer
    const hasBaseMap = layers.some(layer => layer.type === LayerType.BASE_MAP);
    
    if (hasBaseMap) {
      // Replace the existing base map layer
      setLayers(prevLayers => 
        prevLayers.map(layer => 
          layer.type === LayerType.BASE_MAP ? newLayer : layer
        )
      );
      
      toast({
        title: "Base map updated",
        description: `Changed base map to ${baseMap.name}`,
      });
    } else {
      // Add as a new layer
      setLayers(prevLayers => [newLayer, ...prevLayers]);
      
      toast({
        title: "Base map added",
        description: `Added ${baseMap.name} as base map`,
      });
    }
  };
  
  // Handle selecting a style template
  const handleSelectStyle = (styleTemplate: StyleTemplate) => {
    // We need to have a selected layer to apply the style to
    if (!editingLayer) {
      toast({
        title: "No layer selected",
        description: "Please select a layer to apply this style to",
        variant: "destructive"
      });
      return;
    }
    
    // Update the layer with the new style
    const updatedLayer = {
      ...editingLayer,
      style: styleTemplate.style
    };
    
    handleUpdateLayer(updatedLayer);
    
    toast({
      title: "Style applied",
      description: `Applied ${styleTemplate.name} style to ${editingLayer.name}`,
    });
  };
  
  // Handle toggling layer visibility
  const handleToggleVisibility = (layerId: string) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerId 
          ? { ...layer, visible: !layer.visible } 
          : layer
      )
    );
  };
  
  // Handle removing a layer
  const handleRemoveLayer = (layerId: string) => {
    setLayers(prevLayers => prevLayers.filter(layer => layer.id !== layerId));
    
    // If we're removing the layer that's currently being edited, close the editor
    if (editingLayer && editingLayer.id === layerId) {
      setEditingLayer(null);
    }
    
    toast({
      title: "Layer removed",
      description: "The layer has been removed from the map",
    });
  };
  
  // Handle editing a layer
  const handleEditLayer = (layerId: string) => {
    const layerToEdit = layers.find(layer => layer.id === layerId);
    if (layerToEdit) {
      setEditingLayer(layerToEdit);
    }
  };
  
  // Handle updating a layer
  const handleUpdateLayer = (updatedLayer: MapLayer) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === updatedLayer.id ? updatedLayer : layer
      )
    );
    
    // Update the editing layer if it's the same one
    if (editingLayer && editingLayer.id === updatedLayer.id) {
      setEditingLayer(updatedLayer);
    }
  };
  
  // Handle reordering layers
  const handleReorderLayers = (fromIndex: number, toIndex: number) => {
    setLayers(prevLayers => {
      const result = [...prevLayers];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      
      // Update z-index values
      return result.map((layer, index) => ({
        ...layer,
        zIndex: result.length - index // Higher index = higher z-index
      }));
    });
  };
  
  // Handle saving the map
  const handleSaveMap = () => {
    // In a real implementation, this would save to an API
    toast({
      title: "Map saved",
      description: `${mapName} has been saved successfully`,
    });
  };
  
  // Handle exporting the map
  const handleExportMap = () => {
    // In a real implementation, this would generate export files
    toast({
      title: "Map exported",
      description: "Your map export is being prepared...",
    });
  };
  
  // Handle sharing the map
  const handleShareMap = () => {
    // In a real implementation, this would generate sharing links
    toast({
      title: "Map shared",
      description: "Sharing link has been copied to clipboard",
    });
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        {/* Top bar with map name and actions */}
        <div className="bg-card border-b p-2 flex items-center justify-between">
          <div className="flex items-center">
            <Input
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              className="w-64 mr-2"
            />
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleSaveMap}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportMap}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareMap}>
              <Share className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-grow flex overflow-hidden">
          {/* Left sidebar with layers */}
          <div className="w-64 border-r bg-card overflow-auto p-3">
            <h3 className="font-medium flex items-center mb-2">
              <Layers className="h-4 w-4 mr-1" /> Layers
            </h3>
            
            {layers.length > 0 ? (
              <div>
                {layers.map((layer, index) => (
                  <LayerItem
                    key={layer.id}
                    layer={layer}
                    index={index}
                    onToggleVisibility={handleToggleVisibility}
                    onRemoveLayer={handleRemoveLayer}
                    onEditLayer={handleEditLayer}
                    onReorderLayers={handleReorderLayers}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-2 text-center border rounded-md">
                No layers added yet. Start by adding a base map or layer.
              </div>
            )}
            
            <div className="mt-3">
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Layer
              </Button>
            </div>
          </div>
          
          {/* Center area with map preview */}
          <div className="flex-grow relative bg-accent">
            {/* Map preview would be rendered here */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4">
                <div className="mb-2 text-muted-foreground">Map Preview</div>
                {layers.length === 0 ? (
                  <div className="text-sm">
                    Add layers from the sidebar to see your map
                  </div>
                ) : (
                  <div className="text-sm">
                    {layers.length} layer{layers.length !== 1 ? 's' : ''} in this map
                  </div>
                )}
              </div>
            </div>
            
            {/* AI Pulse Indicator */}
            <AIPulseIndicator
              tasks={[
                {
                  id: 'task-1',
                  agentName: 'GIS Specialist',
                  taskName: 'Optimizing layer visualization',
                  startTime: new Date(),
                  status: 'running',
                  progress: 45
                }
              ]}
            />
          </div>
          
          {/* Right sidebar with tools */}
          <div className="w-64 border-l bg-card overflow-auto">
            <Tabs defaultValue="basemaps">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="basemaps">Base Maps</TabsTrigger>
                <TabsTrigger value="styles">Styles</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basemaps" className="p-3">
                <h3 className="font-medium mb-2">Select Base Map</h3>
                <BaseMapGallery
                  baseMaps={availableBaseMaps}
                  onSelectBaseMap={handleAddBaseMap}
                />
              </TabsContent>
              
              <TabsContent value="styles" className="p-3">
                <h3 className="font-medium flex items-center mb-2">
                  <Palette className="h-4 w-4 mr-1" /> Layer Styles
                </h3>
                
                {editingLayer ? (
                  <>
                    <div className="mb-3 text-sm">
                      Applying style to: <span className="font-medium">{editingLayer.name}</span>
                    </div>
                    <StyleGallery
                      styles={availableStyles}
                      onSelectStyle={handleSelectStyle}
                    />
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground p-2 text-center border rounded-md">
                    Select a layer from the Layers panel to apply a style
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="analysis" className="p-3">
                <h3 className="font-medium mb-2">Spatial Analysis</h3>
                <div className="text-sm text-muted-foreground p-2 text-center border rounded-md">
                  Analysis tools will appear here
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Layer editor modal */}
        {editingLayer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="w-full max-w-md">
              <LayerEditor
                layer={editingLayer}
                onUpdateLayer={handleUpdateLayer}
                onClose={() => setEditingLayer(null)}
              />
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}
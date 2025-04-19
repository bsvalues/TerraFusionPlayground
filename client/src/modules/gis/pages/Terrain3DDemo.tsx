import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'wouter';
import TerrainVisualization3D from '../components/TerrainVisualization3D';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Info, MapPin, Mountain, Layers, Eye, Box } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

/**
 * Enhanced 3D Terrain Visualization Demo Page
 * 
 * This page showcases the advanced 3D terrain capabilities:
 * - True 3D terrain rendering with dynamic lighting
 * - Property extrusion based on value or other attributes
 * - Viewshed analysis for visibility calculations
 * - Enhanced elevation profile visualization
 */
export default function Terrain3DDemo() {
  const [tab, setTab] = useState('overview');
  
  return (
    <>
      <Helmet>
        <title>3D Terrain Visualization | TerraFusion</title>
      </Helmet>
      
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="bg-background/90 backdrop-blur-sm border-b border-border sticky top-0 z-10 p-4">
          <div className="flex items-center justify-between container mx-auto">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/gis">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to GIS Hub
                </Link>
              </Button>
              
              <h1 className="text-xl font-bold ml-4 flex items-center">
                <Box className="h-5 w-5 mr-2 text-primary" />
                Enhanced 3D Terrain Visualization
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-primary/10">
                <Mountain className="h-3 w-3 mr-1" />
                3D Visualization
              </Badge>
              
              <Badge variant="outline" className="bg-primary/10">
                <MapPin className="h-3 w-3 mr-1" />
                Benton County
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left sidebar with tabs */}
          <div className="w-full md:w-64 lg:w-80 p-4 border-r border-border overflow-y-auto">
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="help">Help</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="prose prose-sm dark:prose-invert">
                  <h3 className="text-lg font-semibold">3D Terrain Visualization</h3>
                  
                  <p>
                    Explore property data with advanced 3D terrain visualization.
                    This demo showcases our enhanced terrain rendering capabilities
                    with true 3D effects and dynamic lighting.
                  </p>
                  
                  <h4 className="text-md font-semibold mt-4">Key Features</h4>
                  
                  <ul className="list-disc pl-5 space-y-1">
                    <li>True 3D terrain rendering with customizable elevation scale</li>
                    <li>Dynamic lighting with time-of-day presets</li>
                    <li>Property extrusion based on value or characteristics</li>
                    <li>Viewshed analysis for visibility studies</li>
                  </ul>
                </div>
                
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Getting Started</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="py-2">
                    <div className="text-sm space-y-2">
                      <p>Use the controls in the top-right corner of the map to:</p>
                      
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>Change terrain visualization mode</li>
                        <li>Adjust 3D elevation scale</li>
                        <li>Control lighting direction</li>
                        <li>Enable property extrusion</li>
                        <li>Perform viewshed analysis</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="features" className="mt-4 space-y-4">
                <div className="space-y-3">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center">
                        <Mountain className="h-4 w-4 mr-2 text-primary" />
                        3D Terrain Rendering
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="py-2">
                      <div className="text-sm space-y-2">
                        <p>
                          Our 3D terrain visualization uses high-resolution elevation data 
                          with advanced rendering techniques to create a realistic 3D effect.
                        </p>
                        
                        <p className="text-xs text-muted-foreground">
                          Try adjusting the elevation scale in the 3D Options tab to enhance 
                          or reduce the terrain exaggeration.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center">
                        <Eye className="h-4 w-4 mr-2 text-primary" />
                        Dynamic Lighting
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="py-2">
                      <div className="text-sm space-y-2">
                        <p>
                          Time-of-day presets allow you to see how terrain appears under
                          different lighting conditions, enhancing visualization of subtle
                          terrain features.
                        </p>
                        
                        <p className="text-xs text-muted-foreground">
                          Use the morning, noon, and evening presets or create custom lighting
                          with precise control over direction and elevation.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center">
                        <Box className="h-4 w-4 mr-2 text-primary" />
                        Property Extrusion
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="py-2">
                      <div className="text-sm space-y-2">
                        <p>
                          Properties are extruded in 3D space based on their value, size, 
                          or other characteristics, creating an intuitive visualization
                          of property attributes.
                        </p>
                        
                        <p className="text-xs text-muted-foreground">
                          Enable property extrusion in the Advanced tab to see 3D property 
                          representations on the terrain.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center">
                        <Layers className="h-4 w-4 mr-2 text-primary" />
                        Viewshed Analysis
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="py-2">
                      <div className="text-sm space-y-2">
                        <p>
                          Viewshed analysis calculates what's visible from a specific point,
                          taking into account terrain height and obstructions.
                        </p>
                        
                        <p className="text-xs text-muted-foreground">
                          Enable viewshed analysis in the Advanced tab, then click on the map
                          to set an observation point. Adjust the visibility distance as needed.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="help" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center">
                      <Info className="h-4 w-4 mr-2 text-primary" />
                      Help & Tips
                    </CardTitle>
                    
                    <CardDescription className="text-xs">
                      Advice for getting the most from 3D terrain visualization
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="py-2">
                    <div className="text-sm space-y-3">
                      <div>
                        <h4 className="font-medium text-sm">Navigation</h4>
                        
                        <ul className="list-disc pl-5 space-y-1 text-xs mt-1">
                          <li>Pan: Click and drag the map</li>
                          <li>Zoom: Use mouse wheel or pinch gesture</li>
                          <li>Reset view: Click the compass button</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm">Best Practices</h4>
                        
                        <ul className="list-disc pl-5 space-y-1 text-xs mt-1">
                          <li>
                            Start with hillshade visualization for best terrain detail
                          </li>
                          <li>
                            Use medium elevation scale for balanced visualization
                          </li>
                          <li>
                            Combine terrain with property extrusion to analyze property
                            data in geographical context
                          </li>
                          <li>
                            Change lighting direction to highlight different terrain aspects
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm">Performance Tips</h4>
                        
                        <ul className="list-disc pl-5 space-y-1 text-xs mt-1">
                          <li>
                            Disable viewshed analysis when not actively using it
                          </li>
                          <li>
                            For slower devices, use a lower elevation scale setting
                          </li>
                          <li>
                            The USGS terrain source may be faster than Mapbox for some areas
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">About Terrain Data</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="py-2">
                    <div className="text-sm space-y-2">
                      <p>
                        Terrain data comes from multiple sources:
                      </p>
                      
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>
                          <span className="font-medium">Mapbox Terrain-RGB:</span> High-resolution
                          global elevation data (default)
                        </li>
                        <li>
                          <span className="font-medium">USGS:</span> Detailed elevation data
                          for the United States
                        </li>
                      </ul>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        Data is streamed and processed in real-time to create the 3D visualizations.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Main terrain visualization */}
          <div className="flex-1 relative">
            <TerrainVisualization3D 
              initialCenter={[-119.7, 46.2]} // Benton County, WA
              initialZoom={10}
            />
          </div>
        </div>
      </div>
    </>
  );
}
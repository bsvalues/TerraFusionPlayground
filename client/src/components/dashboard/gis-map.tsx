import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Layers, Maximize, Info, Map as MapIcon } from "lucide-react";
import { useState } from "react";
import MapboxMap from "@/components/gis/MapboxMap";
import GISControlPanel from "@/components/gis/GISControlPanel";
import { GISProvider } from "@/contexts/gis-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

const GISMap = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeTab, setActiveTab] = useState("map");

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    // In a real app, you would implement actual full screen functionality here
    // using the Fullscreen API or a library like react-full-screen
  };

  return (
    <GISProvider>
      <Card className="bg-white overflow-hidden shadow rounded-lg">
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Property Map</h3>
            <div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[160px]">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="map">
                    <MapIcon className="h-4 w-4 mr-1" />
                    Map
                  </TabsTrigger>
                  <TabsTrigger value="controls">
                    <Layers className="h-4 w-4 mr-1" />
                    Controls
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          <div className="mt-2">
            <TabsContent value="map" className="m-0">
              <div className="h-[450px] rounded overflow-hidden border border-gray-200">
                <MapboxMap />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Find Property
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Search for properties by address or ID</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                        onClick={() => setActiveTab("controls")}
                      >
                        <Layers className="h-4 w-4 mr-2" />
                        Layer Controls
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Manage map layers and visibility</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                        onClick={toggleFullScreen}
                      >
                        <Maximize className="h-4 w-4 mr-2" />
                        Full Screen
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View map in full screen mode</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                      >
                        <Info className="h-4 w-4 mr-2" />
                        AI Insights
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Get AI-powered insights for this area</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </TabsContent>
            
            <TabsContent value="controls" className="m-0">
              <div className="h-[450px] overflow-auto">
                <GISControlPanel />
              </div>
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center"
                  onClick={() => setActiveTab("map")}
                >
                  <MapIcon className="h-4 w-4 mr-2" />
                  Back to Map
                </Button>
              </div>
            </TabsContent>
          </div>
        </CardContent>
      </Card>
    </GISProvider>
  );
};

export default GISMap;

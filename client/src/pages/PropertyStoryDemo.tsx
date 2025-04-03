import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

export function PropertyStoryDemo() {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState("BC101");
  const [multiplePropertyIds, setMultiplePropertyIds] = useState("BC101,BC102,BC103");
  const [comparePropertyIds, setComparePropertyIds] = useState("BC101,BC102,BC103");
  const [activeTab, setActiveTab] = useState("single");
  const [includeTax, setIncludeTax] = useState(true);
  const [includeAppeals, setIncludeAppeals] = useState(true);
  const [includeImprovements, setIncludeImprovements] = useState(true);
  const [includeLandRecords, setIncludeLandRecords] = useState(true);
  const [includeFields, setIncludeFields] = useState(true);

  // Single property story query
  const {
    data: singleStory,
    isLoading: isSingleLoading,
    refetch: refetchSingleStory
  } = useQuery({
    queryKey: ['/api/property-stories', propertyId],
    queryFn: () => fetch(`/api/property-stories/${propertyId}?includeTax=${includeTax}&includeAppeals=${includeAppeals}&includeImprovements=${includeImprovements}&includeLandRecords=${includeLandRecords}&includeFields=${includeFields}`).then(res => res.json()),
    enabled: false
  });

  // Multiple property stories mutation
  const multipleStoriesMutation = useMutation({
    mutationFn: (ids: string[]) => {
      return apiRequest(`/api/property-stories/multiple`, {
        method: 'POST',
        body: { 
          propertyIds: ids,
          options: {
            includeTax,
            includeAppeals,
            includeImprovements,
            includeLandRecords,
            includeFields
          }
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/property-stories/multiple'] });
    },
    onError: (error) => {
      toast({
        title: "Error generating multiple stories",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Compare properties mutation
  const comparePropertiesMutation = useMutation({
    mutationFn: (ids: string[]) => {
      return apiRequest(`/api/property-stories/compare`, {
        method: 'POST',
        body: { 
          propertyIds: ids,
          options: {
            includeTax,
            includeAppeals,
            includeImprovements,
            includeLandRecords,
            includeFields
          }
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/property-stories/compare'] });
    },
    onError: (error) => {
      toast({
        title: "Error comparing properties",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handlers
  const handleSingleGenerate = () => {
    refetchSingleStory();
  };

  const handleMultipleGenerate = () => {
    const ids = multiplePropertyIds.split(',').map(id => id.trim());
    multipleStoriesMutation.mutate(ids);
  };

  const handleCompareGenerate = () => {
    const ids = comparePropertyIds.split(',').map(id => id.trim());
    comparePropertiesMutation.mutate(ids);
  };

  // Render story output
  const renderStoryOutput = (data: any, isLoading: boolean, title: string) => {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-60">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : data ? (
            <div className="whitespace-pre-wrap text-sm">
              {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
            </div>
          ) : (
            <div className="text-muted-foreground text-center h-60 flex items-center justify-center">
              Click "Generate" to see the property story
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Property Story Generator Demo</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Options</CardTitle>
          <CardDescription>Configure what to include in the property stories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeTax" 
                checked={includeTax} 
                onCheckedChange={(checked) => setIncludeTax(checked as boolean)} 
              />
              <Label htmlFor="includeTax">Tax Info</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeAppeals" 
                checked={includeAppeals} 
                onCheckedChange={(checked) => setIncludeAppeals(checked as boolean)} 
              />
              <Label htmlFor="includeAppeals">Appeals</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeImprovements" 
                checked={includeImprovements} 
                onCheckedChange={(checked) => setIncludeImprovements(checked as boolean)} 
              />
              <Label htmlFor="includeImprovements">Improvements</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeLandRecords" 
                checked={includeLandRecords} 
                onCheckedChange={(checked) => setIncludeLandRecords(checked as boolean)} 
              />
              <Label htmlFor="includeLandRecords">Land Records</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includeFields" 
                checked={includeFields} 
                onCheckedChange={(checked) => setIncludeFields(checked as boolean)} 
              />
              <Label htmlFor="includeFields">Fields</Label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single">Single Property</TabsTrigger>
          <TabsTrigger value="multiple">Multiple Properties</TabsTrigger>
          <TabsTrigger value="compare">Compare Properties</TabsTrigger>
        </TabsList>
        
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>Generate Single Property Story</CardTitle>
              <CardDescription>
                Enter a property ID to generate a detailed narrative about the property
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="propertyId">Property ID</Label>
                  <Input
                    id="propertyId"
                    placeholder="Enter property ID (e.g., BC101)"
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSingleGenerate} 
                disabled={isSingleLoading || !propertyId}
              >
                {isSingleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Story
              </Button>
            </CardFooter>
          </Card>
          
          {renderStoryOutput(
            singleStory, 
            isSingleLoading, 
            `Property Story for ${propertyId}`
          )}
        </TabsContent>
        
        <TabsContent value="multiple">
          <Card>
            <CardHeader>
              <CardTitle>Generate Multiple Property Stories</CardTitle>
              <CardDescription>
                Enter comma-separated property IDs to generate stories for multiple properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="multiplePropertyIds">Property IDs (comma-separated)</Label>
                  <Input
                    id="multiplePropertyIds"
                    placeholder="Enter property IDs (e.g., BC101,BC102,BC103)"
                    value={multiplePropertyIds}
                    onChange={(e) => setMultiplePropertyIds(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleMultipleGenerate} 
                disabled={multipleStoriesMutation.isPending || !multiplePropertyIds}
              >
                {multipleStoriesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Multiple Stories
              </Button>
            </CardFooter>
          </Card>
          
          {renderStoryOutput(
            multipleStoriesMutation.data, 
            multipleStoriesMutation.isPending, 
            `Multiple Property Stories`
          )}
        </TabsContent>
        
        <TabsContent value="compare">
          <Card>
            <CardHeader>
              <CardTitle>Compare Properties</CardTitle>
              <CardDescription>
                Enter comma-separated property IDs to generate a comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="comparePropertyIds">Property IDs (comma-separated)</Label>
                  <Input
                    id="comparePropertyIds"
                    placeholder="Enter property IDs (e.g., BC101,BC102,BC103)"
                    value={comparePropertyIds}
                    onChange={(e) => setComparePropertyIds(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleCompareGenerate} 
                disabled={comparePropertiesMutation.isPending || !comparePropertyIds}
              >
                {comparePropertiesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Comparison
              </Button>
            </CardFooter>
          </Card>
          
          {renderStoryOutput(
            comparePropertiesMutation.data, 
            comparePropertiesMutation.isPending, 
            `Property Comparison`
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
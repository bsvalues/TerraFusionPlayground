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
import { Loader2, Share2, Eye, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  
  // Property Insight Sharing state
  const [sharePropertyId, setSharePropertyId] = useState("BC001");
  const [shareTitle, setShareTitle] = useState("BC001 Property Analysis");
  const [shareInsightType, setShareInsightType] = useState("story");
  const [shareFormat, setShareFormat] = useState("detailed");
  const [shareExpiresInDays, setShareExpiresInDays] = useState("7");
  const [sharePassword, setSharePassword] = useState("");
  const [shareIsPublic, setShareIsPublic] = useState(true);
  const [viewShareId, setViewShareId] = useState("");
  const [viewSharePassword, setViewSharePassword] = useState("");

  // Single property story mutation
  const singleStoryMutation = useMutation({
    mutationFn: (id: string) => {
      return apiRequest(`/api/property-stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          propertyId: id,
          options: {
            tone: 'professional',
            includeTax,
            includeAppeals,
            includeImprovements,
            includeLandRecords,
            includeFields
          }
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/property-stories'] });
    },
    onError: (error) => {
      toast({
        title: "Error generating property story",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Multiple property stories mutation
  const multipleStoriesMutation = useMutation({
    mutationFn: (ids: string[]) => {
      return apiRequest(`/api/property-stories/multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          propertyIds: ids,
          options: {
            tone: 'professional',
            includeTax,
            includeAppeals,
            includeImprovements,
            includeLandRecords,
            includeFields
          }
        })
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          propertyIds: ids,
          options: {
            tone: 'professional',
            includeTax,
            includeAppeals,
            includeImprovements,
            includeLandRecords,
            includeFields
          }
        })
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
  
  // Property Insight Sharing mutations
  const createShareMutation = useMutation({
    mutationFn: (data: any) => {
      return apiRequest(`/api/property-insight-shares`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Share created successfully",
        description: `Share ID: ${data.shareId}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/property-insight-shares'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating share",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const getShareMutation = useMutation({
    mutationFn: ({ shareId, password }: { shareId: string, password?: string }) => {
      return apiRequest(`/api/property-insight-shares/${shareId}${password ? `?password=${password}` : ''}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Share retrieved successfully",
        description: `Access count: ${data.accessCount}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error retrieving share",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const deleteShareMutation = useMutation({
    mutationFn: (shareId: string) => {
      return apiRequest(`/api/property-insight-shares/${shareId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Share deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/property-insight-shares'] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting share",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Get all shares query
  const allSharesQuery = useQuery({
    queryKey: ['/api/property-insight-shares'],
    queryFn: () => apiRequest('/api/property-insight-shares'),
  });

  // Handlers
  const handleSingleGenerate = () => {
    singleStoryMutation.mutate(propertyId);
  };

  const handleMultipleGenerate = () => {
    const ids = multiplePropertyIds.split(',').map(id => id.trim());
    multipleStoriesMutation.mutate(ids);
  };

  const handleCompareGenerate = () => {
    const ids = comparePropertyIds.split(',').map(id => id.trim());
    comparePropertiesMutation.mutate(ids);
  };
  
  // Property Insight Sharing handlers
  const handleCreateShare = () => {
    const insightData = {
      content: `This is a sample property insight for Property ID: ${sharePropertyId}`,
      generatedAt: new Date().toISOString(),
      propertyDetails: {
        id: sharePropertyId,
        address: `123 Main St, Sample City`,
        value: '$300,000',
      }
    };
    
    const expiresAt = shareExpiresInDays ? 
      new Date(Date.now() + parseInt(shareExpiresInDays) * 24 * 60 * 60 * 1000).toISOString() : 
      undefined;
      
    createShareMutation.mutate({
      propertyId: sharePropertyId,
      title: shareTitle,
      insightType: shareInsightType,
      insightData,
      format: shareFormat,
      expiresInDays: shareExpiresInDays ? parseInt(shareExpiresInDays) : undefined,
      password: sharePassword || undefined,
      isPublic: shareIsPublic
    });
  };
  
  const handleViewShare = () => {
    getShareMutation.mutate({
      shareId: viewShareId,
      password: viewSharePassword || undefined
    });
  };
  
  const handleDeleteShare = (shareId: string) => {
    deleteShareMutation.mutate(shareId);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="single">Single Property</TabsTrigger>
          <TabsTrigger value="multiple">Multiple Properties</TabsTrigger>
          <TabsTrigger value="compare">Compare Properties</TabsTrigger>
          <TabsTrigger value="share">Property Insight Sharing</TabsTrigger>
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
                disabled={singleStoryMutation.isPending || !propertyId}
              >
                {singleStoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Story
              </Button>
            </CardFooter>
          </Card>
          
          {renderStoryOutput(
            singleStoryMutation.data, 
            singleStoryMutation.isPending, 
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
        
        <TabsContent value="share">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Create Share Card */}
            <Card>
              <CardHeader>
                <CardTitle>Create Property Insight Share</CardTitle>
                <CardDescription>
                  Configure and create a shareable property insight
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid w-full gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="sharePropertyId">Property ID</Label>
                    <Input
                      id="sharePropertyId"
                      placeholder="Enter property ID (e.g., BC001)"
                      value={sharePropertyId}
                      onChange={(e) => setSharePropertyId(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="shareTitle">Share Title</Label>
                    <Input
                      id="shareTitle"
                      placeholder="Enter a title for this share"
                      value={shareTitle}
                      onChange={(e) => setShareTitle(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="shareInsightType">Insight Type</Label>
                      <Select value={shareInsightType} onValueChange={setShareInsightType}>
                        <SelectTrigger id="shareInsightType">
                          <SelectValue placeholder="Select insight type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="story">Story</SelectItem>
                          <SelectItem value="comparison">Comparison</SelectItem>
                          <SelectItem value="data">Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="shareFormat">Format</Label>
                      <Select value={shareFormat} onValueChange={setShareFormat}>
                        <SelectTrigger id="shareFormat">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                          <SelectItem value="summary">Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="shareExpiresInDays">Expires In (Days)</Label>
                    <Input
                      id="shareExpiresInDays"
                      type="number"
                      placeholder="Optional - leave empty for no expiration"
                      value={shareExpiresInDays}
                      onChange={(e) => setShareExpiresInDays(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="sharePassword">Password (Optional)</Label>
                    <Input
                      id="sharePassword"
                      type="password"
                      placeholder="Optional - leave empty for no password"
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="shareIsPublic" 
                      checked={shareIsPublic} 
                      onCheckedChange={(checked) => setShareIsPublic(checked as boolean)} 
                    />
                    <Label htmlFor="shareIsPublic">Public Share</Label>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleCreateShare} 
                  disabled={createShareMutation.isPending || !sharePropertyId || !shareTitle}
                >
                  {createShareMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Share2 className="mr-2 h-4 w-4" />
                  Create Share
                </Button>
              </CardFooter>
            </Card>
            
            {/* View Share Card */}
            <Card>
              <CardHeader>
                <CardTitle>Access Shared Insight</CardTitle>
                <CardDescription>
                  View a shared property insight using the share ID
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid w-full gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="viewShareId">Share ID</Label>
                    <Input
                      id="viewShareId"
                      placeholder="Enter share ID"
                      value={viewShareId}
                      onChange={(e) => setViewShareId(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="viewSharePassword">Password (if required)</Label>
                    <Input
                      id="viewSharePassword"
                      type="password"
                      placeholder="Enter password if the share is protected"
                      value={viewSharePassword}
                      onChange={(e) => setViewSharePassword(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleViewShare} 
                  disabled={getShareMutation.isPending || !viewShareId}
                >
                  {getShareMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Eye className="mr-2 h-4 w-4" />
                  View Share
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Output Cards */}
          <div className="grid grid-cols-1 gap-4 mt-4">
            {/* View Share Result */}
            {getShareMutation.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Shared Property Insight</span>
                    <Badge>{getShareMutation.data.insightType}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {getShareMutation.data.title} - Access Count: {getShareMutation.data.accessCount}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(getShareMutation.data.insightData, null, 2)}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Created Share */}
            {createShareMutation.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Share Created Successfully</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm">
                    <p><strong>Share ID:</strong> {createShareMutation.data.shareId}</p>
                    <p><strong>Title:</strong> {createShareMutation.data.title}</p>
                    <p><strong>Property ID:</strong> {createShareMutation.data.propertyId}</p>
                    <p><strong>Type:</strong> {createShareMutation.data.insightType}</p>
                    <p><strong>Format:</strong> {createShareMutation.data.format}</p>
                    <p><strong>Access Count:</strong> {createShareMutation.data.accessCount}</p>
                    <p><strong>Created At:</strong> {new Date(createShareMutation.data.createdAt).toLocaleString()}</p>
                    {createShareMutation.data.expiresAt && (
                      <p><strong>Expires At:</strong> {new Date(createShareMutation.data.expiresAt).toLocaleString()}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* All Shares List */}
            <Card>
              <CardHeader>
                <CardTitle>All Property Insight Shares</CardTitle>
                <CardDescription>
                  List of all available property insight shares
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allSharesQuery.isLoading ? (
                  <div className="flex justify-center items-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : allSharesQuery.data && allSharesQuery.data.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {allSharesQuery.data.map((share: any) => (
                      <div 
                        key={share.shareId} 
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div>
                          <div className="font-medium">{share.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {share.propertyId} - {share.insightType} - Access Count: {share.accessCount}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setViewShareId(share.shareId);
                              setViewSharePassword("");
                              handleViewShare();
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Share</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this share? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteShare(share.shareId)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No shares available. Create a share to see it here.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
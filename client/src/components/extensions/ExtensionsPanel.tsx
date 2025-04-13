import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { WebviewPanel } from './WebviewPanel';
import { 
  Settings, 
  Package, 
  Grid, 
  Code, 
  FileCode, 
  Puzzle, 
  Eye, 
  EyeOff, 
  Play, 
  Pause 
} from 'lucide-react';

type Extension = {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  active: boolean;
};

type ExtensionDetails = Extension & {
  metadata: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    category: string;
    settings?: Array<{
      id: string;
      label: string;
      description: string;
      type: 'string' | 'number' | 'boolean' | 'select';
      default: any;
      options?: Array<{value: string, label: string}>;
    }>;
    requiredPermissions?: string[];
  };
  settings: Record<string, any>;
};

type ExtensionWebview = {
  id: string;
  title: string;
  content: string;
  contentPreview?: string;
};

export function ExtensionsPanel() {
  const [selectedExtensionId, setSelectedExtensionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('installed');
  const [activeWebview, setActiveWebview] = useState<{ id: string; title: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch extensions
  const { data: extensions, isLoading: isLoadingExtensions } = useQuery({
    queryKey: ['/api/extensions'],
    queryFn: async () => {
      const response = await fetch('/api/extensions');
      if (!response.ok) {
        throw new Error('Failed to fetch extensions');
      }
      return response.json() as Promise<Extension[]>;
    }
  });
  
  // Fetch extension details
  const { data: selectedExtension, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/extensions', selectedExtensionId],
    enabled: !!selectedExtensionId,
    queryFn: async () => {
      if (!selectedExtensionId) return null;
      
      const response = await fetch(`/api/extensions/${selectedExtensionId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch extension details for ${selectedExtensionId}`);
      }
      return response.json() as Promise<ExtensionDetails>;
    }
  });
  
  // Fetch extension webviews
  const { data: webviews = [] } = useQuery({
    queryKey: ['/api/extensions/webviews'],
    queryFn: async () => {
      const response = await fetch('/api/extensions/webviews');
      if (!response.ok) {
        throw new Error('Failed to fetch extension webviews');
      }
      return response.json() as Promise<ExtensionWebview[]>;
    }
  });
  
  // Activate extension mutation
  const activateMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      const response = await apiRequest(`/api/extensions/${extensionId}/activate`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to activate extension');
      }
      
      return response.json();
    },
    onSuccess: (data, extensionId) => {
      toast({
        title: 'Extension Activated',
        description: `The extension was activated successfully.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/extensions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/extensions', extensionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/extensions/webviews'] });
    },
    onError: (error) => {
      toast({
        title: 'Activation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Deactivate extension mutation
  const deactivateMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      const response = await apiRequest(`/api/extensions/${extensionId}/deactivate`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deactivate extension');
      }
      
      return response.json();
    },
    onSuccess: (data, extensionId) => {
      toast({
        title: 'Extension Deactivated',
        description: `The extension was deactivated successfully.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/extensions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/extensions', extensionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/extensions/webviews'] });
    },
    onError: (error) => {
      toast({
        title: 'Deactivation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ extensionId, settings }: { extensionId: string, settings: Record<string, any> }) => {
      const response = await apiRequest(`/api/extensions/${extensionId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Settings Updated',
        description: `The extension settings were updated successfully.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/extensions', variables.extensionId] });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Handle extension selection
  const handleSelectExtension = (extensionId: string) => {
    setSelectedExtensionId(extensionId);
  };
  
  // Handle extension activation toggle
  const handleToggleActive = (extensionId: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      deactivateMutation.mutate(extensionId);
    } else {
      activateMutation.mutate(extensionId);
    }
  };
  
  // Handle setting change
  const handleSettingChange = (settingId: string, value: any) => {
    if (!selectedExtension) return;
    
    const newSettings = {
      ...selectedExtension.settings,
      [settingId]: value,
    };
    
    updateSettingsMutation.mutate({
      extensionId: selectedExtension.id,
      settings: {
        [settingId]: value,
      },
    });
  };
  
  // Handle opening webview
  const handleOpenWebview = (webviewId: string, title: string) => {
    setActiveWebview({ id: webviewId, title });
  };
  
  // Handle closing webview
  const handleCloseWebview = () => {
    setActiveWebview(null);
  };
  
  // Set the first extension as selected if none is selected
  useEffect(() => {
    if (extensions && extensions.length > 0 && !selectedExtensionId) {
      setSelectedExtensionId(extensions[0].id);
    }
  }, [extensions, selectedExtensionId]);
  
  // Get filtered extensions based on active tab
  const filteredExtensions = extensions?.filter(ext => {
    if (activeTab === 'installed') return true;
    if (activeTab === 'active') return ext.active;
    if (activeTab === 'inactive') return !ext.active;
    return true;
  });
  
  // Get extension webviews
  const extensionWebviews = webviews.filter(
    webview => selectedExtension && 
    webview.id.startsWith(selectedExtension.id)
  );
  
  return (
    <div className="flex flex-col h-full">
      {activeWebview && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="container flex items-center justify-center h-full max-w-7xl">
            <div className="w-full h-[90vh] max-w-6xl">
              <WebviewPanel 
                webviewId={activeWebview.id}
                title={activeWebview.title}
                onClose={handleCloseWebview}
              />
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar list of extensions */}
        <div className="w-72 border-r overflow-y-auto h-full">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Extensions</h2>
            
            <Tabs defaultValue="installed" value={activeTab} onValueChange={setActiveTab} className="mb-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="installed">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {isLoadingExtensions ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExtensions?.map(extension => (
                  <div
                    key={extension.id}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedExtensionId === extension.id
                        ? 'bg-muted'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectExtension(extension.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">{extension.name}</span>
                      {extension.active ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {extension.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      v{extension.version}
                    </div>
                  </div>
                ))}
                
                {filteredExtensions?.length === 0 && (
                  <div className="py-4 text-center text-muted-foreground">
                    No extensions found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Extension detail view */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingDetails ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-2 border-primary"></div>
            </div>
          ) : selectedExtension ? (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold">{selectedExtension.name}</h1>
                  <p className="text-muted-foreground">{selectedExtension.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="extension-active"
                    checked={selectedExtension.active}
                    onCheckedChange={(checked) => handleToggleActive(selectedExtension.id, !checked)}
                    disabled={activateMutation.isPending || deactivateMutation.isPending}
                  />
                  <Label htmlFor="extension-active">
                    {selectedExtension.active ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
              
              <div className="flex space-x-4 mb-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Package className="mr-1 h-4 w-4" />
                  <span>v{selectedExtension.version}</span>
                </div>
                <div className="flex items-center">
                  <FileCode className="mr-1 h-4 w-4" />
                  <span>By {selectedExtension.author}</span>
                </div>
                <div className="flex items-center">
                  <Puzzle className="mr-1 h-4 w-4" />
                  <span>Category: {selectedExtension.category}</span>
                </div>
              </div>
              
              <Tabs defaultValue="settings" className="mt-6">
                <TabsList>
                  <TabsTrigger value="settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </TabsTrigger>
                  <TabsTrigger value="permissions">
                    <Eye className="h-4 w-4 mr-2" />
                    Permissions
                  </TabsTrigger>
                  {extensionWebviews.length > 0 && (
                    <TabsTrigger value="webviews">
                      <Grid className="h-4 w-4 mr-2" />
                      Webviews
                    </TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle>Extension Settings</CardTitle>
                      <CardDescription>
                        Configure the behavior of this extension.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedExtension.metadata.settings && selectedExtension.metadata.settings.length > 0 ? (
                        <div className="space-y-4">
                          {selectedExtension.metadata.settings.map(setting => (
                            <div key={setting.id} className="space-y-2">
                              <div className="flex justify-between">
                                <Label htmlFor={setting.id}>{setting.label}</Label>
                                {setting.type === 'boolean' && (
                                  <Switch
                                    id={setting.id}
                                    checked={selectedExtension.settings[setting.id] ?? setting.default}
                                    onCheckedChange={(checked) => handleSettingChange(setting.id, checked)}
                                    disabled={!selectedExtension.active || updateSettingsMutation.isPending}
                                  />
                                )}
                              </div>
                              
                              {setting.type !== 'boolean' && (
                                <div>
                                  {/* Other setting types would be implemented here */}
                                  <p className="text-sm text-muted-foreground">
                                    {JSON.stringify(selectedExtension.settings[setting.id] ?? setting.default)}
                                  </p>
                                </div>
                              )}
                              
                              <p className="text-xs text-muted-foreground">
                                {setting.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          This extension does not have any configurable settings.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="permissions">
                  <Card>
                    <CardHeader>
                      <CardTitle>Required Permissions</CardTitle>
                      <CardDescription>
                        Permissions required by this extension.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedExtension.metadata.requiredPermissions && selectedExtension.metadata.requiredPermissions.length > 0 ? (
                        <div className="space-y-2">
                          {selectedExtension.metadata.requiredPermissions.map(permission => (
                            <div key={permission} className="flex items-center space-x-2">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              <span>{permission}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          This extension does not require any special permissions.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {extensionWebviews.length > 0 && (
                  <TabsContent value="webviews">
                    <Card>
                      <CardHeader>
                        <CardTitle>Extension Webviews</CardTitle>
                        <CardDescription>
                          Custom views provided by this extension.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {extensionWebviews.map(webview => (
                            <div key={webview.id} className="border rounded-lg p-4">
                              <h3 className="text-lg font-medium mb-2">{webview.title}</h3>
                              {webview.contentPreview && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {webview.contentPreview}
                                </p>
                              )}
                              <Button 
                                variant="outline"
                                onClick={() => handleOpenWebview(webview.id, webview.title)}
                              >
                                Open Webview
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium mb-2">No Extension Selected</h2>
              <p className="text-muted-foreground">
                Select an extension from the sidebar to view its details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
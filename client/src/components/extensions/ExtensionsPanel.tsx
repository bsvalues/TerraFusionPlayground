import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronRight, 
  Settings, 
  Layers, 
  Grid, 
  Code, 
  ToggleLeft, 
  ToggleRight,
  Loader
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Extension {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  active: boolean;
  category: string;
}

interface WebviewPanel {
  id: string;
  title: string;
  content: string;
  contentPreview?: string;
}

interface ExtensionMenuItem {
  id: string;
  label: string;
  icon?: string;
  parent?: string;
  command?: string;
  position?: number;
  children: ExtensionMenuItem[];
}

const ExtensionsPanel: React.FC = () => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [webviews, setWebviews] = useState<WebviewPanel[]>([]);
  const [menuItems, setMenuItems] = useState<ExtensionMenuItem[]>([]);
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);
  const [selectedWebview, setSelectedWebview] = useState<string | null>(null);
  const [extensionDetails, setExtensionDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [webviewContent, setWebviewContent] = useState<string>('');
  const { toast } = useToast();

  // Fetch extensions on mount
  useEffect(() => {
    const fetchExtensions = async () => {
      try {
        setLoading(true);
        const data = await apiRequest('/api/extensions');
        setExtensions(data);
        
        // Fetch menu items
        const menuData = await apiRequest('/api/extensions/menu-items');
        setMenuItems(menuData);
        
        // Fetch webviews
        const webviewsData = await apiRequest('/api/extensions/webviews');
        setWebviews(webviewsData);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch extensions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load extensions. Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };
    
    fetchExtensions();
  }, [toast]);
  
  // Fetch extension details when selected
  useEffect(() => {
    if (!selectedExtension) {
      setExtensionDetails(null);
      return;
    }
    
    const fetchExtensionDetails = async () => {
      try {
        const data = await apiRequest(`/api/extensions/${selectedExtension}`);
        setExtensionDetails(data);
      } catch (error) {
        console.error(`Failed to fetch extension details for ${selectedExtension}:`, error);
        toast({
          title: 'Error',
          description: 'Failed to load extension details. Please try again.',
          variant: 'destructive',
        });
      }
    };
    
    fetchExtensionDetails();
  }, [selectedExtension, toast]);
  
  // Fetch webview content when selected
  useEffect(() => {
    if (!selectedWebview) {
      setWebviewContent('');
      return;
    }
    
    const fetchWebviewContent = async () => {
      try {
        const data = await apiRequest(`/api/extensions/webviews/${selectedWebview}`);
        setWebviewContent(data.content);
      } catch (error) {
        console.error(`Failed to fetch webview content for ${selectedWebview}:`, error);
        toast({
          title: 'Error',
          description: 'Failed to load webview content. Please try again.',
          variant: 'destructive',
        });
      }
    };
    
    fetchWebviewContent();
  }, [selectedWebview, toast]);
  
  const handleActivateExtension = async (id: string) => {
    try {
      await apiRequest(`/api/extensions/${id}/activate`, {
        method: 'POST'
      });
      
      // Update local state
      setExtensions(prev => 
        prev.map(ext => 
          ext.id === id ? { ...ext, active: true } : ext
        )
      );
      
      toast({
        title: 'Success',
        description: 'Extension activated successfully.',
      });
    } catch (error) {
      console.error(`Failed to activate extension ${id}:`, error);
      toast({
        title: 'Error',
        description: 'Failed to activate extension. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeactivateExtension = async (id: string) => {
    try {
      await apiRequest(`/api/extensions/${id}/deactivate`, {
        method: 'POST'
      });
      
      // Update local state
      setExtensions(prev => 
        prev.map(ext => 
          ext.id === id ? { ...ext, active: false } : ext
        )
      );
      
      toast({
        title: 'Success',
        description: 'Extension deactivated successfully.',
      });
    } catch (error) {
      console.error(`Failed to deactivate extension ${id}:`, error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate extension. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const renderExtensionsList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader className="animate-spin h-8 w-8 text-primary" />
          <span className="ml-2">Loading extensions...</span>
        </div>
      );
    }
    
    if (extensions.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          <p>No extensions found.</p>
        </div>
      );
    }
    
    // Group extensions by category
    const extensionsByCategory: Record<string, Extension[]> = {};
    extensions.forEach(ext => {
      if (!extensionsByCategory[ext.category]) {
        extensionsByCategory[ext.category] = [];
      }
      extensionsByCategory[ext.category].push(ext);
    });
    
    return (
      <div className="space-y-4">
        {Object.entries(extensionsByCategory).map(([category, exts]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground capitalize">{category}</h3>
            <div className="space-y-1">
              {exts.map(ext => (
                <div 
                  key={ext.id}
                  className={`
                    flex items-center justify-between p-2 rounded-md cursor-pointer
                    ${selectedExtension === ext.id ? 'bg-accent' : 'hover:bg-accent/50'}
                  `}
                  onClick={() => setSelectedExtension(ext.id)}
                >
                  <div className="flex items-center">
                    <span className="font-medium">{ext.name}</span>
                    <Badge 
                      variant={ext.active ? "default" : "outline"} 
                      className="ml-2"
                    >
                      {ext.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">v{ext.version}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderExtensionDetails = () => {
    if (!selectedExtension || !extensionDetails) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          <p>Select an extension to view details.</p>
        </div>
      );
    }
    
    const extension = extensions.find(ext => ext.id === selectedExtension);
    
    if (!extension) {
      return null;
    }
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{extension.name}</h2>
            <p className="text-muted-foreground">v{extension.version} by {extension.author}</p>
          </div>
          <div>
            {extension.active ? (
              <Button 
                variant="outline" 
                onClick={() => handleDeactivateExtension(extension.id)}
                className="flex items-center"
              >
                <ToggleRight className="mr-2 h-4 w-4" />
                Deactivate
              </Button>
            ) : (
              <Button 
                variant="default" 
                onClick={() => handleActivateExtension(extension.id)}
                className="flex items-center"
              >
                <ToggleLeft className="mr-2 h-4 w-4" />
                Activate
              </Button>
            )}
          </div>
        </div>
        
        <p>{extension.description}</p>
        
        {extensionDetails.metadata.settings && extensionDetails.metadata.settings.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Settings</h3>
            <Card>
              <CardContent className="p-4">
                <dl className="space-y-4">
                  {extensionDetails.metadata.settings.map((setting: any) => (
                    <div key={setting.id} className="flex flex-col">
                      <dt className="font-medium">{setting.label}</dt>
                      <dd className="text-muted-foreground text-sm">{setting.description}</dd>
                      <dd className="mt-1">
                        <span className="text-sm p-1 bg-muted rounded">
                          Default: {typeof setting.default === 'object' 
                            ? JSON.stringify(setting.default) 
                            : String(setting.default)}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>
        )}
        
        {extensionDetails.metadata.requiredPermissions && extensionDetails.metadata.requiredPermissions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Required Permissions</h3>
            <div className="flex flex-wrap gap-2">
              {extensionDetails.metadata.requiredPermissions.map((permission: string) => (
                <Badge key={permission} variant="secondary">
                  {permission}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderWebviews = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader className="animate-spin h-8 w-8 text-primary" />
          <span className="ml-2">Loading webviews...</span>
        </div>
      );
    }
    
    if (webviews.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          <p>No webviews found.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {webviews.map(webview => (
          <Card 
            key={webview.id} 
            className={`cursor-pointer transition-shadow hover:shadow-md ${
              selectedWebview === webview.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedWebview(webview.id)}
          >
            <CardHeader className="p-4">
              <CardTitle>{webview.title}</CardTitle>
              <CardDescription>{webview.id}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {webview.contentPreview}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  const renderWebviewContent = () => {
    if (!selectedWebview || !webviewContent) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          <p>Select a webview to display its content.</p>
        </div>
      );
    }
    
    // Create a sandboxed iframe with the webview content
    return (
      <div className="h-full border rounded-md overflow-hidden bg-background">
        <div className="p-2 bg-muted border-b font-medium">
          {webviews.find(w => w.id === selectedWebview)?.title || 'Webview'}
        </div>
        <div 
          className="p-4 h-[calc(100%-40px)] overflow-auto"
          dangerouslySetInnerHTML={{ __html: webviewContent }}
        />
      </div>
    );
  };
  
  const renderMenuItems = (items: ExtensionMenuItem[]) => {
    return (
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-center p-2 hover:bg-accent rounded-md cursor-pointer">
              {item.children.length > 0 ? (
                <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />
              ) : (
                <div className="w-6" />
              )}
              <span>{item.label}</span>
              {item.command && (
                <Badge variant="outline" className="ml-auto">
                  {item.command}
                </Badge>
              )}
            </div>
            {item.children.length > 0 && (
              <div className="pl-6">
                {renderMenuItems(item.children)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Extensions</h1>
        <p className="text-muted-foreground">Manage and configure extensions</p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="browse" className="h-full flex flex-col">
          <div className="px-4 pt-2 border-b">
            <TabsList>
              <TabsTrigger value="browse" className="flex items-center">
                <Layers className="h-4 w-4 mr-2" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="webviews" className="flex items-center">
                <Grid className="h-4 w-4 mr-2" />
                Webviews
              </TabsTrigger>
              <TabsTrigger value="commands" className="flex items-center">
                <Code className="h-4 w-4 mr-2" />
                Commands
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="browse" className="flex-1 overflow-hidden p-0">
            <div className="h-full flex flex-col md:flex-row">
              <div className="w-full md:w-1/3 p-4 overflow-y-auto border-r">
                {renderExtensionsList()}
              </div>
              <div className="w-full md:w-2/3 p-4 overflow-y-auto">
                {renderExtensionDetails()}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="webviews" className="flex-1 overflow-hidden p-0">
            <div className="h-full flex flex-col md:flex-row">
              <div className="w-full md:w-1/3 p-4 overflow-y-auto border-r">
                {renderWebviews()}
              </div>
              <div className="w-full md:w-2/3 overflow-hidden">
                {renderWebviewContent()}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="commands" className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Available Commands</h2>
              {menuItems.length > 0 ? (
                renderMenuItems(menuItems)
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <p>No commands found.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ExtensionsPanel;
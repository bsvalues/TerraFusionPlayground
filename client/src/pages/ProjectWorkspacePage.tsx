import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import DevelopmentWorkspaceLayout from '@/layout/development-workspace-layout';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileIcon,
  FolderIcon,
  Play,
  PauseCircle,
  RefreshCw,
  Database,
  Save,
  Code,
  ArrowLeftRight,
  Clipboard,
  ChevronsUpDown,
  Check,
  XCircle 
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Project {
  projectId: string;
  name: string;
  description: string;
  type: string;
  language: string;
  framework: string | null;
  status: string;
  createdBy: number;
  lastUpdated: Date;
  createdAt: Date;
}

interface ProjectFile {
  fileId: number;
  projectId: string;
  path: string;
  name: string;
  type: string;
  content: string;
  size: number;
  lastUpdated: Date;
  createdBy: number;
  parentPath: string | null;
}

interface PreviewStatus {
  id: number;
  projectId: string;
  status: string;
  port: number | null;
  command: string;
  autoRefresh: boolean;
  lastStarted: Date | null;
  lastStopped: Date | null;
  logs: string[] | null;
  url?: string;
}

const ProjectWorkspacePage = () => {
  const { projectId } = useParams();
  const [, navigate] = useLocation();
  
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<string>('files');
  const [previewStatus, setPreviewStatus] = useState<string>('STOPPED');
  
  // Fetch project details
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: ['/api/development/projects', projectId],
    enabled: !!projectId,
  });
  
  // Fetch project files
  const { 
    data: files = [], 
    isLoading: isLoadingFiles,
    refetch: refetchFiles
  } = useQuery<ProjectFile[]>({
    queryKey: ['/api/development/projects', projectId, 'files'],
    enabled: !!projectId,
  });
  
  interface PreviewStatusResponse {
    status: string;
    port?: number;
    url?: string;
    logs?: string[];
  }
  
  // Fetch preview status
  const { 
    data: preview, 
    isLoading: isLoadingPreview,
    refetch: refetchPreview
  } = useQuery<PreviewStatusResponse>({
    queryKey: ['/api/development/projects', projectId, 'preview'],
    enabled: !!projectId,
    onSuccess: (data: PreviewStatusResponse) => {
      if (data) {
        setPreviewStatus(data.status);
      }
    }
  });
  
  // Effect to navigate away if projectId doesn't exist
  useEffect(() => {
    if (!projectId) {
      navigate('/development');
    }
  }, [projectId, navigate]);
  
  // Function to open a file
  const handleOpenFile = async (path: string) => {
    try {
      const response = await apiRequest(`/api/development/projects/${projectId}/files/${path}`, {
        method: 'GET',
      });
      
      setActiveFilePath(path);
      setFileContent(response.content || '');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };
  
  // Function to save file changes
  const handleSaveFile = async () => {
    if (!activeFilePath) return;
    
    try {
      await apiRequest(`/api/development/projects/${projectId}/files/${activeFilePath}`, {
        method: 'PUT',
        data: {
          content: fileContent,
        },
      });
      
      setIsEditing(false);
      refetchFiles();
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };
  
  // Function to toggle preview
  const handleTogglePreview = async () => {
    try {
      if (previewStatus === 'RUNNING') {
        await apiRequest(`/api/development/projects/${projectId}/preview/stop`, {
          method: 'POST',
        });
      } else {
        await apiRequest(`/api/development/projects/${projectId}/preview/start`, {
          method: 'POST',
        });
      }
      
      refetchPreview();
    } catch (error) {
      console.error('Failed to toggle preview:', error);
    }
  };
  
  // Function to restart preview
  const handleRestartPreview = async () => {
    try {
      await apiRequest(`/api/development/projects/${projectId}/preview/restart`, {
        method: 'POST',
      });
      
      refetchPreview();
    } catch (error) {
      console.error('Failed to restart preview:', error);
    }
  };
  
  // Function to generate breadcrumbs from path
  const getBreadcrumbs = (path: string | null) => {
    if (!path) return [{ label: 'Root', path: '' }];
    
    const parts = path.split('/');
    return parts.map((part, index) => {
      const currentPath = parts.slice(0, index + 1).join('/');
      return {
        label: part,
        path: currentPath,
      };
    });
  };
  
  // Building file tree
  const buildFileTree = (files: ProjectFile[]) => {
    const filesByPath: { [key: string]: ProjectFile[] } = {};
    
    // Group files by parent path
    files.forEach(file => {
      const parent = file.parentPath || '';
      if (!filesByPath[parent]) {
        filesByPath[parent] = [];
      }
      filesByPath[parent].push(file);
    });
    
    // Recursively render file tree
    const renderFileTree = (path: string = '', depth: number = 0) => {
      const filesInPath = filesByPath[path] || [];
      
      return (
        <div className="pl-4">
          {filesInPath.map(file => (
            <div key={file.path}>
              {file.type === 'DIRECTORY' ? (
                <div>
                  <div 
                    className="flex items-center py-1 hover:bg-gray-100 rounded px-1 cursor-pointer"
                    onClick={() => handleOpenFile(file.path)}
                  >
                    <FolderIcon className="h-4 w-4 mr-2 text-yellow-500" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  {filesByPath[file.path] && renderFileTree(file.path, depth + 1)}
                </div>
              ) : (
                <div 
                  className={`flex items-center py-1 hover:bg-gray-100 rounded px-1 cursor-pointer ${activeFilePath === file.path ? 'bg-blue-50 text-blue-600' : ''}`}
                  onClick={() => handleOpenFile(file.path)}
                >
                  <FileIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm">{file.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    };
    
    return renderFileTree();
  };
  
  if (isLoadingProject) {
    return (
      <DevelopmentWorkspaceLayout projectId={projectId}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-lg">Loading project workspace...</p>
          </div>
        </div>
      </DevelopmentWorkspaceLayout>
    );
  }
  
  const breadcrumbs = getBreadcrumbs(activeFilePath);

  return (
    <DevelopmentWorkspaceLayout projectId={projectId}>
      <div className="flex flex-col h-full">
        {/* Project Header */}
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{project?.name}</h1>
            <p className="text-gray-500">{project?.description}</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={previewStatus === 'RUNNING' ? 'destructive' : 'default'}
              size="sm"
              className="flex items-center space-x-1"
              onClick={handleTogglePreview}
            >
              {previewStatus === 'RUNNING' ? (
                <>
                  <PauseCircle className="h-4 w-4" />
                  <span>Stop Preview</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Start Preview</span>
                </>
              )}
            </Button>
            {previewStatus === 'RUNNING' && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
                onClick={handleRestartPreview}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Restart</span>
              </Button>
            )}
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 overflow-hidden border rounded-md">
          <ResizablePanelGroup direction="horizontal">
            {/* File Tree Panel */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
              <div className="h-full overflow-auto p-2">
                <div className="flex justify-between items-center mb-2 p-2 bg-gray-50 rounded">
                  <h3 className="font-medium text-gray-700">Project Files</h3>
                  <Button variant="ghost" size="sm" onClick={() => refetchFiles()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  buildFileTree()
                )}
              </div>
            </ResizablePanel>
            
            <ResizableHandle />
            
            {/* Editor/Preview Panel */}
            <ResizablePanel defaultSize={55}>
              <Tabs defaultValue="editor" className="h-full">
                <div className="border-b px-4">
                  <TabsList>
                    <TabsTrigger value="editor" className="px-4">Editor</TabsTrigger>
                    <TabsTrigger value="preview" className="px-4">Preview</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="editor" className="flex flex-col h-full p-0 m-0">
                  {activeFilePath ? (
                    <>
                      <div className="flex justify-between items-center border-b px-4 py-2">
                        <div className="flex items-center">
                          <Breadcrumb>
                            <BreadcrumbList>
                              <BreadcrumbItem>
                                <BreadcrumbLink href="#">Root</BreadcrumbLink>
                              </BreadcrumbItem>
                              <BreadcrumbSeparator />
                              {breadcrumbs.slice(0, breadcrumbs.length - 1).map((crumb, i) => (
                                <BreadcrumbItem key={i}>
                                  <BreadcrumbLink href="#">{crumb.label}</BreadcrumbLink>
                                  <BreadcrumbSeparator />
                                </BreadcrumbItem>
                              ))}
                              <BreadcrumbItem>
                                <BreadcrumbPage>{breadcrumbs[breadcrumbs.length - 1]?.label}</BreadcrumbPage>
                              </BreadcrumbItem>
                            </BreadcrumbList>
                          </Breadcrumb>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isEditing ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setIsEditing(false)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button 
                                size="sm"
                                onClick={handleSaveFile}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setIsEditing(true)}
                            >
                              <Code className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-auto p-4 bg-gray-50 font-mono text-sm">
                        {isEditing ? (
                          <textarea
                            className="w-full h-full p-4 font-mono text-sm rounded border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            value={fileContent}
                            onChange={(e) => setFileContent(e.target.value)}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap">{fileContent}</pre>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <FileIcon className="h-12 w-12 text-gray-300 mx-auto" />
                        <p className="mt-4 text-lg text-gray-500">Select a file to edit</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="preview" className="h-full p-0 m-0">
                  <div className="h-full flex flex-col">
                    <div className="border-b p-2 flex justify-between items-center bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={previewStatus === 'RUNNING' ? 'default' : 'outline'}
                          className={previewStatus === 'RUNNING' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        >
                          {previewStatus === 'RUNNING' ? 'Running' : 'Stopped'}
                        </Badge>
                        {preview?.port && (
                          <span className="text-xs text-gray-500">Port: {preview.port}</span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={refetchPreview}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      {previewStatus === 'RUNNING' && preview?.url ? (
                        <iframe 
                          src={preview.url}
                          className="w-full h-full"
                          sandbox="allow-forms allow-scripts allow-same-origin"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Play className="h-12 w-12 text-gray-300 mx-auto" />
                            <p className="mt-4 text-lg text-gray-500">Preview not running</p>
                            <Button 
                              className="mt-4" 
                              onClick={handleTogglePreview}
                            >
                              Start Preview
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </ResizablePanel>
            
            <ResizableHandle />
            
            {/* Logs / AI Assistant Panel */}
            <ResizablePanel defaultSize={25} minSize={20}>
              <Tabs defaultValue="logs" className="h-full">
                <div className="border-b px-4">
                  <TabsList>
                    <TabsTrigger value="logs" className="px-4">Logs</TabsTrigger>
                    <TabsTrigger value="ai" className="px-4">AI Assistant</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="logs" className="p-0 m-0 h-full overflow-auto">
                  <div className="h-full overflow-auto">
                    <div className="p-2 bg-gray-50 flex justify-between items-center">
                      <h3 className="text-sm font-medium">Preview Logs</h3>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={refetchPreview}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="p-4 font-mono text-xs overflow-auto max-h-[calc(100vh-12rem)]">
                      {preview?.logs && preview.logs.length > 0 ? (
                        preview.logs.map((log, index) => (
                          <div key={index} className="whitespace-pre-wrap pb-1">
                            {log}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 italic">No logs available</div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="ai" className="p-0 m-0 h-full overflow-hidden">
                  <div className="flex flex-col h-full">
                    <div className="p-2 bg-gray-50">
                      <h3 className="text-sm font-medium">AI Code Assistant</h3>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <p className="text-gray-500 mb-2">
                        Get help with your code using AI assistance.
                      </p>
                      <div className="grid gap-2 mb-4">
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select task type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="generate">Generate Code</SelectItem>
                            <SelectItem value="complete">Complete Code</SelectItem>
                            <SelectItem value="document">Generate Documentation</SelectItem>
                            <SelectItem value="explain">Explain Code</SelectItem>
                            <SelectItem value="debug">Debug Help</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <textarea
                        className="flex-1 p-3 border rounded-md resize-none font-mono text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Describe what you want to do or paste code here..."
                      ></textarea>
                      <div className="mt-4 flex justify-end">
                        <Button>
                          <Code className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </DevelopmentWorkspaceLayout>
  );
};

export default ProjectWorkspacePage;
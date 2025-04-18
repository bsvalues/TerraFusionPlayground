import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { SelectBox } from '@/components/ui/select-box';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  ArrowRightCircle, 
  Database, 
  ArrowDown, 
  Check, 
  CircleAlert,
  RefreshCw,
  DownloadCloud,
  Info,
  Edit,
  Play,
  AlertCircle,
  Copy,
  FileCode,
  Layout,
  Table2,
  BarChart,
  Lock,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Type definitions for conversion-related data structures
interface DatabaseConnectionConfig {
  type?: string;
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  schema?: string;
  username?: string;
  password?: string;
  options?: Record<string, any>;
  filePath?: string;
}

interface ConversionProject {
  id: string;
  name: string;
  description: string;
  sourceConfig: DatabaseConnectionConfig;
  targetConfig: DatabaseConnectionConfig;
  status: string;
  progress: number;
  currentStage: string;
  schemaAnalysis?: any;
  migrationPlan?: any;
  migrationResult?: any;
  compatibilityResult?: any;
  validationResult?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

interface ConnectionTemplate {
  id: number;
  name: string;
  description: string;
  databaseType: string;
  connectionConfig: DatabaseConnectionConfig;
  isPublic: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

// Main component
const DatabaseConversionPage: React.FC = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState('projects');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newConnectionConfig, setNewConnectionConfig] = useState<DatabaseConnectionConfig>({
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    username: '',
    password: '',
    database: ''
  });
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    sourceConfig: { ...newConnectionConfig },
    targetConfig: { 
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      username: '',
      password: '',
      database: ''
    }
  });
  const [customInstructions, setCustomInstructions] = useState('');
  const [sqlScript, setSqlScript] = useState('');
  const [activeDetailsTab, setActiveDetailsTab] = useState('overview');

  // Fetch projects
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/database-conversion/projects'],
    queryFn: async () => {
      const { data } = await apiRequest('GET', '/api/database-conversion/projects');
      return data as ConversionProject[];
    }
  });

  // Fetch connection templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/database-conversion/templates'],
    queryFn: async () => {
      const { data } = await apiRequest('GET', '/api/database-conversion/templates');
      return data as ConnectionTemplate[];
    }
  });

  // Fetch selected project
  const { data: selectedProjectData, isLoading: isLoadingSelectedProject } = useQuery({
    queryKey: ['/api/database-conversion/projects', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return null;
      const { data } = await apiRequest('GET', `/api/database-conversion/projects/${selectedProject}`);
      return data as ConversionProject;
    },
    enabled: !!selectedProject
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const response = await apiRequest('POST', '/api/database-conversion/projects', project);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/database-conversion/projects'] });
      setSelectedProject(data.id);
      setTab('details');
      toast({
        title: 'Project created',
        description: 'Your database conversion project has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create project',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Analyze database mutation
  const analyzeDatabaseMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest('POST', `/api/database-conversion/projects/${projectId}/analyze`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/database-conversion/projects', selectedProject] });
      toast({
        title: 'Analysis complete',
        description: 'Database schema analysis has been completed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Analysis failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Generate migration plan mutation
  const generatePlanMutation = useMutation({
    mutationFn: async ({ projectId, instructions }: { projectId: string, instructions: string }) => {
      const response = await apiRequest(
        'POST', 
        `/api/database-conversion/projects/${projectId}/generate-plan`,
        { customInstructions: instructions }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/database-conversion/projects', selectedProject] });
      toast({
        title: 'Plan generated',
        description: 'Migration plan has been generated successfully.',
      });
      setActiveDetailsTab('plan');
    },
    onError: (error: any) => {
      toast({
        title: 'Plan generation failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Generate SQL script mutation
  const generateScriptMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest('POST', `/api/database-conversion/projects/${projectId}/generate-script`);
      return response.data;
    },
    onSuccess: (data) => {
      setSqlScript(data.script);
      toast({
        title: 'Script generated',
        description: 'SQL migration script has been generated successfully.',
      });
      setActiveDetailsTab('script');
    },
    onError: (error: any) => {
      toast({
        title: 'Script generation failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Execute migration mutation
  const executeMigrationMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest('POST', `/api/database-conversion/projects/${projectId}/execute`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/database-conversion/projects', selectedProject] });
      toast({
        title: 'Migration executed',
        description: 'Database migration has been executed successfully.',
      });
      setActiveDetailsTab('results');
    },
    onError: (error: any) => {
      toast({
        title: 'Migration failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Create compatibility layer mutation
  const createCompatibilityLayerMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest('POST', `/api/database-conversion/projects/${projectId}/compatibility`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/database-conversion/projects', selectedProject] });
      toast({
        title: 'Compatibility layer created',
        description: 'Compatibility layer has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Compatibility layer creation failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Get schema insights mutation
  const getSchemaInsightsMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest('GET', `/api/database-conversion/projects/${projectId}/schema-insights`);
      return response.data;
    },
    onSuccess: (data) => {
      // Display insights in a modal or a new tab
      console.log('Schema insights:', data);
      toast({
        title: 'Schema insights',
        description: 'Schema insights have been generated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to generate schema insights',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Helper functions
  const handleCreateProject = () => {
    createProjectMutation.mutate(newProject);
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProject(projectId);
    setTab('details');
  };

  const handleAnalyzeDatabase = () => {
    if (selectedProject) {
      analyzeDatabaseMutation.mutate(selectedProject);
    }
  };

  const handleGeneratePlan = () => {
    if (selectedProject) {
      generatePlanMutation.mutate({ 
        projectId: selectedProject, 
        instructions: customInstructions 
      });
    }
  };

  const handleGenerateScript = () => {
    if (selectedProject) {
      generateScriptMutation.mutate(selectedProject);
    }
  };

  const handleExecuteMigration = () => {
    if (selectedProject) {
      executeMigrationMutation.mutate(selectedProject);
    }
  };

  const handleCreateCompatibilityLayer = () => {
    if (selectedProject) {
      createCompatibilityLayerMutation.mutate(selectedProject);
    }
  };

  const handleGetSchemaInsights = () => {
    if (selectedProject) {
      getSchemaInsightsMutation.mutate(selectedProject);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'created':
        return <Badge variant="outline">Created</Badge>;
      case 'analyzing':
      case 'planning':
      case 'migrating':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">In Progress</Badge>;
      case 'analyzed':
      case 'planned':
      case 'migrated':
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canAnalyze = (project: ConversionProject) => {
    return ['created'].includes(project.status);
  };

  const canGeneratePlan = (project: ConversionProject) => {
    return ['analyzed'].includes(project.status) || project.schemaAnalysis;
  };

  const canGenerateScript = (project: ConversionProject) => {
    return ['planned'].includes(project.status) || project.migrationPlan;
  };

  const canExecuteMigration = (project: ConversionProject) => {
    return ['planned'].includes(project.status) || project.migrationPlan;
  };

  const canCreateCompatibilityLayer = (project: ConversionProject) => {
    return ['migrated'].includes(project.status) || project.migrationResult;
  };

  // Render projects list
  const renderProjectsList = () => {
    if (isLoadingProjects) {
      return <div className="flex justify-center p-4">Loading projects...</div>;
    }

    if (!projects || projects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Database className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="text-sm text-muted-foreground mb-4">Create a new database conversion project to get started.</p>
          <Button onClick={() => setTab('new')}>Create New Project</Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {projects.map((project) => (
          <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleSelectProject(project.id)}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                {getStatusBadge(project.status)}
              </div>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Source:</span>{' '}
                  <span className="font-medium">{project.sourceConfig.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Target:</span>{' '}
                  <span className="font-medium">{project.targetConfig.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>{' '}
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              {project.progress > 0 && (
                <div className="mt-4">
                  <Progress value={project.progress} className="h-2" />
                  <p className="text-xs text-right mt-1 text-muted-foreground">{project.progress}% complete</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="secondary" className="w-full" onClick={(e) => {
                e.stopPropagation();
                handleSelectProject(project.id);
              }}>
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  // Render new project form
  const renderNewProjectForm = () => {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Create New Database Conversion Project</h2>
        
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="name">Project Name</Label>
            <Input 
              id="name" 
              placeholder="Enter project name" 
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            />
          </div>
          
          <div className="grid gap-3">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Describe the purpose of this conversion project" 
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            />
          </div>
          
          <Separator />
          
          <div className="grid gap-6">
            <h3 className="text-lg font-semibold">Source Database Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="sourceType">Database Type</Label>
                <Select 
                  value={newProject.sourceConfig.type} 
                  onValueChange={(value) => setNewProject({
                    ...newProject,
                    sourceConfig: { ...newProject.sourceConfig, type: value }
                  })}
                >
                  <SelectTrigger id="sourceType">
                    <SelectValue placeholder="Select database type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="sqlserver">SQL Server</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="oracle">Oracle</SelectItem>
                    <SelectItem value="mongodb">MongoDB</SelectItem>
                    <SelectItem value="sqlite">SQLite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="sourceHost">Host</Label>
                <Input 
                  id="sourceHost" 
                  placeholder="Enter host" 
                  value={newProject.sourceConfig.host || ''}
                  onChange={(e) => setNewProject({
                    ...newProject,
                    sourceConfig: { ...newProject.sourceConfig, host: e.target.value }
                  })}
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="sourcePort">Port</Label>
                <Input 
                  id="sourcePort" 
                  type="number"
                  placeholder="Enter port" 
                  value={newProject.sourceConfig.port || ''}
                  onChange={(e) => setNewProject({
                    ...newProject,
                    sourceConfig: { ...newProject.sourceConfig, port: parseInt(e.target.value) }
                  })}
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="sourceDatabase">Database Name</Label>
                <Input 
                  id="sourceDatabase" 
                  placeholder="Enter database name" 
                  value={newProject.sourceConfig.database || ''}
                  onChange={(e) => setNewProject({
                    ...newProject,
                    sourceConfig: { ...newProject.sourceConfig, database: e.target.value }
                  })}
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="sourceUsername">Username</Label>
                <Input 
                  id="sourceUsername" 
                  placeholder="Enter username" 
                  value={newProject.sourceConfig.username || ''}
                  onChange={(e) => setNewProject({
                    ...newProject,
                    sourceConfig: { ...newProject.sourceConfig, username: e.target.value }
                  })}
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="sourcePassword">Password</Label>
                <Input 
                  id="sourcePassword" 
                  type="password"
                  placeholder="Enter password" 
                  value={newProject.sourceConfig.password || ''}
                  onChange={(e) => setNewProject({
                    ...newProject,
                    sourceConfig: { ...newProject.sourceConfig, password: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid gap-6">
            <h3 className="text-lg font-semibold">Target Database Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="targetType">Database Type</Label>
                <Select 
                  value={newProject.targetConfig.type} 
                  onValueChange={(value) => setNewProject({
                    ...newProject,
                    targetConfig: { ...newProject.targetConfig, type: value }
                  })}
                >
                  <SelectTrigger id="targetType">
                    <SelectValue placeholder="Select database type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="sqlserver">SQL Server</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="oracle">Oracle</SelectItem>
                    <SelectItem value="mongodb">MongoDB</SelectItem>
                    <SelectItem value="sqlite">SQLite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="targetHost">Host</Label>
                <Input 
                  id="targetHost" 
                  placeholder="Enter host" 
                  value={newProject.targetConfig.host || ''}
                  onChange={(e) => setNewProject({
                    ...newProject,
                    targetConfig: { ...newProject.targetConfig, host: e.target.value }
                  })}
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="targetPort">Port</Label>
                <Input 
                  id="targetPort" 
                  type="number"
                  placeholder="Enter port" 
                  value={newProject.targetConfig.port || ''}
                  onChange={(e) => setNewProject({
                    ...newProject,
                    targetConfig: { ...newProject.targetConfig, port: parseInt(e.target.value) }
                  })}
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="targetDatabase">Database Name</Label>
                <Input 
                  id="targetDatabase" 
                  placeholder="Enter database name" 
                  value={newProject.targetConfig.database || ''}
                  onChange={(e) => setNewProject({
                    ...newProject,
                    targetConfig: { ...newProject.targetConfig, database: e.target.value }
                  })}
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="targetUsername">Username</Label>
                <Input 
                  id="targetUsername" 
                  placeholder="Enter username" 
                  value={newProject.targetConfig.username || ''}
                  onChange={(e) => setNewProject({
                    ...newProject,
                    targetConfig: { ...newProject.targetConfig, username: e.target.value }
                  })}
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="targetPassword">Password</Label>
                <Input 
                  id="targetPassword" 
                  type="password"
                  placeholder="Enter password" 
                  value={newProject.targetConfig.password || ''}
                  onChange={(e) => setNewProject({
                    ...newProject,
                    targetConfig: { ...newProject.targetConfig, password: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setTab('projects')}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Render project details
  const renderProjectDetails = () => {
    if (isLoadingSelectedProject || !selectedProjectData) {
      return <div className="flex justify-center p-4">Loading project details...</div>;
    }

    const project = selectedProjectData;

    return (
      <div className="p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold">{project.name}</h2>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {getStatusBadge(project.status)}
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {project.sourceConfig.type} → {project.targetConfig.type}
            </Badge>
          </div>
        </div>

        {project.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{project.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-800">Source: {project.sourceConfig.database}@{project.sourceConfig.host}</Badge>
            <ArrowRightCircle className="w-4 h-4 text-gray-400" />
            <Badge className="bg-green-100 text-green-800">Target: {project.targetConfig.database}@{project.targetConfig.host}</Badge>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTab('projects')}>
              Back to Projects
            </Button>
          </div>
        </div>

        {project.progress > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span>{project.currentStage}</span>
              <span>{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Steps</CardTitle>
                <CardDescription>Follow these steps to complete your database conversion</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  <div className={`flex items-center p-4 border-b ${project.schemaAnalysis ? 'text-green-700 bg-green-50' : ''}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mr-3 border">
                      {project.schemaAnalysis ? <Check className="w-4 h-4" /> : '1'}
                    </div>
                    <div className="flex-grow">Analyze Database Schema</div>
                    <Button 
                      size="sm" 
                      variant={project.schemaAnalysis ? "outline" : "default"} 
                      onClick={handleAnalyzeDatabase}
                      disabled={!canAnalyze(project) || analyzeDatabaseMutation.isPending}
                    >
                      {analyzeDatabaseMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {project.schemaAnalysis ? 'Re-analyze' : 'Analyze'}
                    </Button>
                  </div>

                  <div className={`flex items-center p-4 border-b ${project.migrationPlan ? 'text-green-700 bg-green-50' : ''}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mr-3 border">
                      {project.migrationPlan ? <Check className="w-4 h-4" /> : '2'}
                    </div>
                    <div className="flex-grow">Generate Migration Plan</div>
                    <Button 
                      size="sm" 
                      variant={project.migrationPlan ? "outline" : "default"} 
                      onClick={handleGeneratePlan}
                      disabled={!canGeneratePlan(project) || generatePlanMutation.isPending}
                    >
                      {generatePlanMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {project.migrationPlan ? 'Regenerate' : 'Generate'}
                    </Button>
                  </div>

                  <div className={`flex items-center p-4 border-b ${sqlScript ? 'text-green-700 bg-green-50' : ''}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mr-3 border">
                      {sqlScript ? <Check className="w-4 h-4" /> : '3'}
                    </div>
                    <div className="flex-grow">Generate SQL Script</div>
                    <Button 
                      size="sm" 
                      variant={sqlScript ? "outline" : "default"} 
                      onClick={handleGenerateScript}
                      disabled={!canGenerateScript(project) || generateScriptMutation.isPending}
                    >
                      {generateScriptMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {sqlScript ? 'Regenerate' : 'Generate'}
                    </Button>
                  </div>

                  <div className={`flex items-center p-4 border-b ${project.migrationResult ? 'text-green-700 bg-green-50' : ''}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mr-3 border">
                      {project.migrationResult ? <Check className="w-4 h-4" /> : '4'}
                    </div>
                    <div className="flex-grow">Execute Migration</div>
                    <Button 
                      size="sm" 
                      variant={project.migrationResult ? "outline" : "default"} 
                      onClick={handleExecuteMigration}
                      disabled={!canExecuteMigration(project) || executeMigrationMutation.isPending}
                    >
                      {executeMigrationMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {project.migrationResult ? 'Re-run' : 'Execute'}
                    </Button>
                  </div>

                  <div className={`flex items-center p-4 ${project.compatibilityResult ? 'text-green-700 bg-green-50' : ''}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mr-3 border">
                      {project.compatibilityResult ? <Check className="w-4 h-4" /> : '5'}
                    </div>
                    <div className="flex-grow">Create Compatibility Layer</div>
                    <Button 
                      size="sm" 
                      variant={project.compatibilityResult ? "outline" : "default"} 
                      onClick={handleCreateCompatibilityLayer}
                      disabled={!canCreateCompatibilityLayer(project) || createCompatibilityLayerMutation.isPending}
                    >
                      {createCompatibilityLayerMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {project.compatibilityResult ? 'Recreate' : 'Create'}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center gap-2"
                  onClick={handleGetSchemaInsights}
                  disabled={!project.schemaAnalysis || getSchemaInsightsMutation.isPending}
                >
                  <Lightbulb className="w-4 h-4" />
                  {getSchemaInsightsMutation.isPending ? 'Analyzing...' : 'Get AI Schema Insights'}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Tabs value={activeDetailsTab} onValueChange={setActiveDetailsTab}>
                  <TabsList className="grid grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="schema" disabled={!project.schemaAnalysis}>Schema</TabsTrigger>
                    <TabsTrigger value="plan" disabled={!project.migrationPlan}>Plan</TabsTrigger>
                    <TabsTrigger value="script" disabled={!sqlScript}>Script</TabsTrigger>
                    <TabsTrigger value="results" disabled={!project.migrationResult}>Results</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <TabsContent value="overview" className="mt-0">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-md font-semibold mb-2">Source Database</h3>
                        <div className="p-4 rounded-md bg-slate-50">
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="text-muted-foreground">Type:</div>
                            <div className="col-span-2 font-medium">{project.sourceConfig.type}</div>
                            
                            <div className="text-muted-foreground">Host:</div>
                            <div className="col-span-2">{project.sourceConfig.host}</div>
                            
                            <div className="text-muted-foreground">Port:</div>
                            <div className="col-span-2">{project.sourceConfig.port}</div>
                            
                            <div className="text-muted-foreground">Database:</div>
                            <div className="col-span-2">{project.sourceConfig.database}</div>
                            
                            <div className="text-muted-foreground">Schema:</div>
                            <div className="col-span-2">{project.sourceConfig.schema || 'default'}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-md font-semibold mb-2">Target Database</h3>
                        <div className="p-4 rounded-md bg-slate-50">
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="text-muted-foreground">Type:</div>
                            <div className="col-span-2 font-medium">{project.targetConfig.type}</div>
                            
                            <div className="text-muted-foreground">Host:</div>
                            <div className="col-span-2">{project.targetConfig.host}</div>
                            
                            <div className="text-muted-foreground">Port:</div>
                            <div className="col-span-2">{project.targetConfig.port}</div>
                            
                            <div className="text-muted-foreground">Database:</div>
                            <div className="col-span-2">{project.targetConfig.database}</div>
                            
                            <div className="text-muted-foreground">Schema:</div>
                            <div className="col-span-2">{project.targetConfig.schema || 'default'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h3 className="text-md font-semibold mb-2">Custom Migration Instructions</h3>
                      <Textarea 
                        placeholder="Enter any special instructions for the migration plan (e.g., 'Combine customer_address and customer_phone tables into a single customers table')"
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        rows={4}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        These instructions will be used when generating the migration plan to customize how tables, columns, and data are converted.
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h3 className="text-md font-semibold mb-2">Project Timeline</h3>
                      <div className="p-4 rounded-md bg-slate-50">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="text-muted-foreground">Created:</div>
                          <div className="col-span-2">{new Date(project.createdAt).toLocaleString()}</div>
                          
                          <div className="text-muted-foreground">Last Updated:</div>
                          <div className="col-span-2">{new Date(project.updatedAt).toLocaleString()}</div>
                          
                          <div className="text-muted-foreground">Current Status:</div>
                          <div className="col-span-2">{getStatusBadge(project.status)}</div>
                          
                          <div className="text-muted-foreground">Current Stage:</div>
                          <div className="col-span-2">{project.currentStage}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="schema" className="mt-0">
                  {project.schemaAnalysis && (
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center">
                              <Table2 className="w-4 h-4 mr-2" />
                              Tables
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{project.schemaAnalysis.tables.length}</div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center">
                              <Layout className="w-4 h-4 mr-2" />
                              Views
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{project.schemaAnalysis.views.length}</div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center">
                              <FileCode className="w-4 h-4 mr-2" />
                              Procedures
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{project.schemaAnalysis.procedures?.length || 0}</div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="text-md font-semibold mb-2">Database Details</h3>
                        <div className="p-4 rounded-md bg-slate-50">
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="text-muted-foreground">Database Type:</div>
                            <div className="col-span-2 font-medium">{project.schemaAnalysis.databaseType}</div>
                            
                            <div className="text-muted-foreground">Database Name:</div>
                            <div className="col-span-2">{project.schemaAnalysis.databaseName}</div>
                            
                            <div className="text-muted-foreground">Database Version:</div>
                            <div className="col-span-2">{project.schemaAnalysis.databaseVersion || 'Unknown'}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="text-md font-semibold mb-2">Tables</h3>
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="text-left p-2 border-b">Name</th>
                                <th className="text-left p-2 border-b">Columns</th>
                                <th className="text-left p-2 border-b">Row Count</th>
                                <th className="text-left p-2 border-b">Size</th>
                              </tr>
                            </thead>
                            <tbody>
                              {project.schemaAnalysis.tables.slice(0, 10).map((table, index) => (
                                <tr key={index} className="border-b">
                                  <td className="p-2">{table.name}</td>
                                  <td className="p-2">{table.columns.length}</td>
                                  <td className="p-2">{table.approximateRowCount?.toLocaleString() || 'Unknown'}</td>
                                  <td className="p-2">
                                    {table.approximateSize ? 
                                      `${Math.round(table.approximateSize / 1024 / 1024 * 100) / 100} MB` : 
                                      'Unknown'}
                                  </td>
                                </tr>
                              ))}
                              {project.schemaAnalysis.tables.length > 10 && (
                                <tr>
                                  <td colSpan={4} className="p-2 text-center text-muted-foreground">
                                    + {project.schemaAnalysis.tables.length - 10} more tables
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {project.schemaAnalysis.issues && project.schemaAnalysis.issues.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-md font-semibold mb-2">Issues</h3>
                          <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="text-left p-2 border-b">Severity</th>
                                  <th className="text-left p-2 border-b">Object</th>
                                  <th className="text-left p-2 border-b">Message</th>
                                </tr>
                              </thead>
                              <tbody>
                                {project.schemaAnalysis.issues.map((issue, index) => (
                                  <tr key={index} className="border-b">
                                    <td className="p-2">
                                      <Badge 
                                        variant={issue.severity === 'ERROR' ? 'destructive' : 'outline'}
                                      >
                                        {issue.severity}
                                      </Badge>
                                    </td>
                                    <td className="p-2">{issue.objectName || 'N/A'}</td>
                                    <td className="p-2">{issue.message}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="plan" className="mt-0">
                  {project.migrationPlan && (
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center">
                              <Table2 className="w-4 h-4 mr-2" />
                              Tables
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{project.migrationPlan.tableMappings.length}</div>
                            <div className="text-sm text-muted-foreground">
                              {project.migrationPlan.tableMappings.filter(t => t.skip).length} skipped
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center">
                              <Layout className="w-4 h-4 mr-2" />
                              Views
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{project.migrationPlan.viewMappings?.length || 0}</div>
                            <div className="text-sm text-muted-foreground">
                              {project.migrationPlan.viewMappings?.filter(v => v.skip).length || 0} skipped
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center">
                              <FileCode className="w-4 h-4 mr-2" />
                              Procedures
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{project.migrationPlan.procedureMappings?.length || 0}</div>
                            <div className="text-sm text-muted-foreground">
                              {project.migrationPlan.procedureMappings?.filter(p => p.skip).length || 0} skipped
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="text-md font-semibold mb-2">Table Mappings</h3>
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="text-left p-2 border-b">Source Table</th>
                                <th className="text-left p-2 border-b">Target Table</th>
                                <th className="text-left p-2 border-b">Columns</th>
                                <th className="text-left p-2 border-b">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {project.migrationPlan.tableMappings.slice(0, 10).map((mapping, index) => (
                                <tr key={index} className="border-b">
                                  <td className="p-2">{mapping.sourceTable}</td>
                                  <td className="p-2">{mapping.targetTable}</td>
                                  <td className="p-2">{mapping.columnMappings.length}</td>
                                  <td className="p-2">
                                    {mapping.skip ? 
                                      <Badge variant="outline">Skipped</Badge> : 
                                      <Badge className="bg-green-100 text-green-800">Include</Badge>}
                                  </td>
                                </tr>
                              ))}
                              {project.migrationPlan.tableMappings.length > 10 && (
                                <tr>
                                  <td colSpan={4} className="p-2 text-center text-muted-foreground">
                                    + {project.migrationPlan.tableMappings.length - 10} more tables
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {project.migrationPlan.notes && (
                        <div className="mt-4">
                          <h3 className="text-md font-semibold mb-2">AI Notes</h3>
                          <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                            <div className="flex items-start">
                              <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                              <div className="text-sm">
                                {project.migrationPlan.notes}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="script" className="mt-0">
                  {sqlScript && (
                    <div className="grid gap-4">
                      <div className="flex justify-between">
                        <h3 className="text-md font-semibold">Migration SQL Script</h3>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Copy className="w-4 h-4" />
                          Copy
                        </Button>
                      </div>
                      <div className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-x-auto">
                        <pre className="text-sm whitespace-pre-wrap">{sqlScript}</pre>
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <DownloadCloud className="w-4 h-4" />
                          Download Script
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="results" className="mt-0">
                  {project.migrationResult && (
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Status</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl font-bold">
                              {project.migrationResult.success ? (
                                <span className="text-green-600">Success</span>
                              ) : (
                                <span className="text-red-600">Failed</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Rows Processed</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl font-bold">
                              {project.migrationResult.totalRowsProcessed.toLocaleString()}
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Start Time</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm">
                              {new Date(project.migrationResult.startTime).toLocaleString()}
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">End Time</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm">
                              {new Date(project.migrationResult.endTime).toLocaleString()}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="text-md font-semibold mb-2">Table Results</h3>
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="text-left p-2 border-b">Table</th>
                                <th className="text-right p-2 border-b">Rows Processed</th>
                                <th className="text-left p-2 border-b">Status</th>
                                <th className="text-left p-2 border-b">Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {project.migrationResult.tableResults.map((result, index) => (
                                <tr key={index} className="border-b">
                                  <td className="p-2">{result.tableName}</td>
                                  <td className="p-2 text-right">{result.rowsProcessed.toLocaleString()}</td>
                                  <td className="p-2">
                                    {result.success ? (
                                      <Badge className="bg-green-100 text-green-800">Success</Badge>
                                    ) : (
                                      <Badge variant="destructive">Failed</Badge>
                                    )}
                                  </td>
                                  <td className="p-2 text-red-600">
                                    {result.error || ''}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {project.migrationResult.warnings && project.migrationResult.warnings.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-md font-semibold mb-2">Warnings</h3>
                          <div className="p-4 rounded-md bg-amber-50 border border-amber-200">
                            <ul className="list-disc pl-5 space-y-1">
                              {project.migrationResult.warnings.map((warning, index) => (
                                <li key={index} className="text-sm">{warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <h3 className="text-md font-semibold mb-2">Migration Log</h3>
                        <div className="bg-slate-50 p-4 rounded-md overflow-x-auto h-48 overflow-y-auto text-sm">
                          {project.migrationResult.log.map((line, index) => (
                            <div key={index} className="whitespace-pre-wrap">{line}</div>
                          ))}
                        </div>
                      </div>
                      
                      {project.compatibilityResult && (
                        <div className="mt-4">
                          <h3 className="text-md font-semibold mb-2">Compatibility Layer</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center">
                                  <Layout className="w-4 h-4 mr-2" />
                                  Views Created
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-3xl font-bold">
                                  {project.compatibilityResult.createdViews.length}
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="flex items-center">
                                  <FileCode className="w-4 h-4 mr-2" />
                                  Functions Created
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-3xl font-bold">
                                  {project.compatibilityResult.createdFunctions.length}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                          
                          <div className="p-4 rounded-md bg-green-50 border border-green-200 mt-4">
                            <div className="flex items-start">
                              <Info className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                              <div className="text-sm">
                                A compatibility layer has been created to allow legacy applications to continue working with the new database structure. 
                                This layer includes views and functions that map between the old and new schema.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Database Conversion</h1>
        {tab === 'projects' && (
          <Button onClick={() => setTab('new')}>New Conversion Project</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="new">New Project</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedProject}>Project Details</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          {renderProjectsList()}
        </TabsContent>

        <TabsContent value="new">
          {renderNewProjectForm()}
        </TabsContent>

        <TabsContent value="details">
          {renderProjectDetails()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseConversionPage;
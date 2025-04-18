import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle, Database, Server, ArrowRight, Copy, Code, Clipboard } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Types
enum DatabaseType {
  PostgreSQL = 'postgresql',
  MySQL = 'mysql',
  SQLite = 'sqlite',
  SQLServer = 'sqlserver',
  MongoDB = 'mongodb',
  Oracle = 'oracle',
  DynamoDB = 'dynamodb',
  Cassandra = 'cassandra',
  Redis = 'redis',
  ElasticSearch = 'elasticsearch',
  Neo4j = 'neo4j',
  Firestore = 'firestore',
  CosmosDB = 'cosmosdb'
}

enum ORMType {
  Drizzle = 'drizzle',
  Prisma = 'prisma',
  TypeORM = 'typeorm',
  Sequelize = 'sequelize',
  Mongoose = 'mongoose'
}

interface DatabaseInfo {
  id: string;
  name: string;
  description: string;
  supportLevel: 'Full' | 'Partial' | 'Basic';
}

interface ConnectionTestResult {
  status: 'success' | 'failed';
  databaseName?: string;
  databaseVersion?: string;
  error?: string;
  timestamp: string;
}

interface ConversionStatus {
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    tablesConverted: number;
    totalTables: number;
    recordsProcessed: number;
    estimatedTotalRecords: number;
    overallProgress: number;
  };
  statusMessage: string;
  error?: string;
  startTime: string;
  endTime?: string;
}

interface TableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
  }>;
  statistics?: {
    totalColumns: number;
    nullableColumns: number;
    primaryKeyColumns: number;
    foreignKeyCount: number;
    indexCount: number;
  };
}

interface SchemaAnalysisResult {
  id?: string;
  databaseType: DatabaseType;
  tables: TableSchema[];
  views: any[];
  schemaIssues?: {
    tablesWithoutPrimaryKey: any[];
    columnsWithoutType: any[];
    inconsistentNaming: any[];
    redundantIndexes: any[];
    missingIndexes: any[];
    circularDependencies: any[];
  };
  performanceIssues?: {
    tablesWithoutIndexes: any[];
    wideIndexes: any[];
    largeTextColumnsWithoutIndexes: any[];
    inefficientDataTypes: any[];
    highCardinalityTextColumns: any[];
  };
  analysisTimestamp: string;
}

// Form Schemas
const connectionFormSchema = z.object({
  databaseType: z.nativeEnum(DatabaseType),
  connectionString: z.string().min(1, "Connection string is required"),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional()
});

const conversionFormSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  sourceType: z.nativeEnum(DatabaseType),
  sourceConnectionString: z.string().min(1, "Source connection string is required"),
  targetType: z.nativeEnum(DatabaseType),
  targetConnectionString: z.string().min(1, "Target connection string is required"),
  generateCompatibilityLayer: z.boolean().default(true),
  ormType: z.nativeEnum(ORMType).optional(),
  includeExamples: z.boolean().default(true),
  generateMigrations: z.boolean().default(true)
});

const compatibilityFormSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  ormType: z.nativeEnum(ORMType),
  includeExamples: z.boolean().default(true),
  generateMigrations: z.boolean().default(true),
  targetDirectory: z.string().optional()
});

// Helper Components
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'success':
    case 'completed':
      return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" /> {status}</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500">{status}</Badge>;
    case 'running':
      return <Badge className="bg-blue-500">{status}</Badge>;
    case 'failed':
      return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const DatabaseTypeIcon = ({ type }: { type: DatabaseType }) => {
  // Use different database icons based on type
  return <Database className="w-5 h-5" />;
};

const SupportLevelBadge = ({ level }: { level: string }) => {
  switch (level) {
    case 'Full':
      return <Badge className="bg-green-500">Full Support</Badge>;
    case 'Partial':
      return <Badge className="bg-yellow-500">Partial Support</Badge>;
    case 'Basic':
      return <Badge className="bg-gray-500">Basic Support</Badge>;
    default:
      return <Badge>{level}</Badge>;
  }
};

const DatabaseConversionPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('connect');
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseType | null>(null);
  const [connectionTestResult, setConnectionTestResult] = useState<ConnectionTestResult | null>(null);
  const [schemaAnalysisResult, setSchemaAnalysisResult] = useState<SchemaAnalysisResult | null>(null);
  const [conversionStatus, setConversionStatus] = useState<ConversionStatus | null>(null);
  const [projectId, setProjectId] = useState<string>('');

  // Forms
  const connectionForm = useForm<z.infer<typeof connectionFormSchema>>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      databaseType: DatabaseType.PostgreSQL,
      connectionString: '',
      name: '',
      description: ''
    }
  });

  const conversionForm = useForm<z.infer<typeof conversionFormSchema>>({
    resolver: zodResolver(conversionFormSchema),
    defaultValues: {
      projectId: '',
      sourceType: DatabaseType.PostgreSQL,
      sourceConnectionString: '',
      targetType: DatabaseType.PostgreSQL,
      targetConnectionString: '',
      generateCompatibilityLayer: true,
      ormType: ORMType.Drizzle,
      includeExamples: true,
      generateMigrations: true
    }
  });

  const compatibilityForm = useForm<z.infer<typeof compatibilityFormSchema>>({
    resolver: zodResolver(compatibilityFormSchema),
    defaultValues: {
      projectId: '',
      ormType: ORMType.Drizzle,
      includeExamples: true,
      generateMigrations: true,
      targetDirectory: ''
    }
  });

  // Queries
  const { data: databaseTypes, isLoading: isLoadingDatabaseTypes } = useQuery({
    queryKey: ['/api/database-conversion/supported-databases'],
    queryFn: async () => {
      const response = await fetch('/api/database-conversion/supported-databases');
      if (!response.ok) {
        throw new Error('Failed to fetch supported databases');
      }
      return response.json();
    }
  });

  const { data: databaseTypeInfo, isLoading: isLoadingDatabaseTypeInfo } = useQuery({
    queryKey: ['/api/database-conversion/database-type-info', selectedDatabase],
    queryFn: async () => {
      if (!selectedDatabase) return null;
      
      const response = await fetch(`/api/database-conversion/database-type-info?type=${selectedDatabase}`);
      if (!response.ok) {
        throw new Error('Failed to fetch database type information');
      }
      return response.json();
    },
    enabled: !!selectedDatabase
  });

  const { data: conversionProjects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/database-conversion/projects'],
    queryFn: async () => {
      const response = await fetch('/api/database-conversion/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch conversion projects');
      }
      return response.json();
    }
  });

  // Mutations
  const testConnectionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof connectionFormSchema>) => {
      const response = await apiRequest('POST', '/api/database-conversion/test-connection', {
        connectionString: data.connectionString,
        databaseType: data.databaseType
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Connection Test Successful',
          description: `Successfully connected to ${data.result.databaseName}`,
          variant: 'default',
        });
        setConnectionTestResult(data.result);
      } else {
        toast({
          title: 'Connection Test Failed',
          description: data.error || 'Failed to connect to database',
          variant: 'destructive',
        });
        setConnectionTestResult({
          status: 'failed',
          error: data.error,
          timestamp: new Date().toISOString()
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Connection Test Failed',
        description: error.message,
        variant: 'destructive',
      });
      setConnectionTestResult({
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  const analyzeSchemasMutation = useMutation({
    mutationFn: async (data: z.infer<typeof connectionFormSchema>) => {
      const response = await apiRequest('POST', '/api/database-conversion/analyze-schema', {
        connectionString: data.connectionString,
        databaseType: data.databaseType,
        name: data.name,
        description: data.description
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Schema Analysis Complete',
          description: `Successfully analyzed schema with ${data.result.tables.length} tables`,
          variant: 'default',
        });
        setSchemaAnalysisResult(data.result);
        
        // Create a project ID based on name
        const newProjectId = `${data.result.databaseType}-${Date.now()}`;
        setProjectId(newProjectId);
        
        // Update form values
        conversionForm.setValue('projectId', newProjectId);
        conversionForm.setValue('sourceType', data.result.databaseType);
        conversionForm.setValue('sourceConnectionString', connectionForm.getValues('connectionString'));
        
        compatibilityForm.setValue('projectId', newProjectId);
        
        // Switch to the convert tab
        setActiveTab('convert');
      } else {
        toast({
          title: 'Schema Analysis Failed',
          description: data.error || 'Failed to analyze database schema',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Schema Analysis Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const startConversionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof conversionFormSchema>) => {
      const response = await apiRequest('POST', '/api/database-conversion/start-conversion', {
        projectId: data.projectId,
        sourceConnectionString: data.sourceConnectionString,
        sourceType: data.sourceType,
        targetConnectionString: data.targetConnectionString,
        targetType: data.targetType,
        options: {
          generateCompatibilityLayer: data.generateCompatibilityLayer,
          ormType: data.ormType,
          includeExamples: data.includeExamples,
          generateMigrations: data.generateMigrations
        }
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Conversion Started',
          description: `Database conversion process has been started`,
          variant: 'default',
        });
        
        // Poll for status updates
        const intervalId = setInterval(async () => {
          try {
            const response = await fetch(`/api/database-conversion/conversion-status?projectId=${data.result.projectId}`);
            const statusData = await response.json();
            
            if (statusData.success) {
              setConversionStatus(statusData.result);
              
              if (statusData.result.status === 'completed' || statusData.result.status === 'failed') {
                clearInterval(intervalId);
                
                if (statusData.result.status === 'completed') {
                  toast({
                    title: 'Conversion Complete',
                    description: 'Database conversion has been completed successfully',
                    variant: 'default',
                  });
                } else {
                  toast({
                    title: 'Conversion Failed',
                    description: statusData.result.error || 'Database conversion failed',
                    variant: 'destructive',
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error polling conversion status:', error);
          }
        }, 2000);
        
        // Clean up interval on component unmount
        return () => clearInterval(intervalId);
      } else {
        toast({
          title: 'Conversion Failed to Start',
          description: data.error || 'Failed to start database conversion',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Conversion Failed to Start',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const generateCompatibilityLayerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof compatibilityFormSchema>) => {
      const response = await apiRequest('POST', '/api/database-conversion/generate-compatibility-layer', {
        projectId: data.projectId,
        ormType: data.ormType,
        includeExamples: data.includeExamples,
        generateMigrations: data.generateMigrations,
        targetDirectory: data.targetDirectory
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Compatibility Layer Generated',
          description: `Successfully generated compatibility layer`,
          variant: 'default',
        });
        
        // Switch to the results tab
        setActiveTab('results');
      } else {
        toast({
          title: 'Compatibility Layer Generation Failed',
          description: data.error || 'Failed to generate compatibility layer',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Compatibility Layer Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Event Handlers
  const handleDatabaseTypeChange = (value: string) => {
    setSelectedDatabase(value as DatabaseType);
  };

  const handleTestConnection = (data: z.infer<typeof connectionFormSchema>) => {
    testConnectionMutation.mutate(data);
  };

  const handleAnalyzeSchema = (data: z.infer<typeof connectionFormSchema>) => {
    analyzeSchemasMutation.mutate(data);
  };

  const handleStartConversion = (data: z.infer<typeof conversionFormSchema>) => {
    startConversionMutation.mutate(data);
  };

  const handleGenerateCompatibilityLayer = (data: z.infer<typeof compatibilityFormSchema>) => {
    generateCompatibilityLayerMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Database Conversion System</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Convert your existing database to a new system with intelligent schema analysis and optimizations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="connect">1. Connect</TabsTrigger>
            <TabsTrigger value="convert">2. Convert</TabsTrigger>
            <TabsTrigger value="compatibility">3. Compatibility</TabsTrigger>
            <TabsTrigger value="results">4. Results</TabsTrigger>
          </TabsList>

          {/* Connect Tab */}
          <TabsContent value="connect">
            <Card>
              <CardHeader>
                <CardTitle>Connect to Database</CardTitle>
                <CardDescription>
                  Connect to your existing database to analyze its schema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...connectionForm}>
                  <form onSubmit={connectionForm.handleSubmit(handleAnalyzeSchema)} className="space-y-6">
                    <FormField
                      control={connectionForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Database Conversion" {...field} />
                          </FormControl>
                          <FormDescription>A name for this database conversion project</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={connectionForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description of this conversion project" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={connectionForm.control}
                      name="databaseType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Database Type</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleDatabaseTypeChange(value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a database type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingDatabaseTypes ? (
                                <SelectItem value="loading">Loading...</SelectItem>
                              ) : (
                                databaseTypes?.map((db: DatabaseInfo) => (
                                  <SelectItem key={db.id} value={db.id}>
                                    <div className="flex items-center">
                                      <DatabaseTypeIcon type={db.id as DatabaseType} />
                                      <span className="ml-2">{db.name}</span>
                                      <span className="ml-auto">
                                        <SupportLevelBadge level={db.supportLevel} />
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select the type of database you want to convert from
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {databaseTypeInfo && (
                      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md mb-4">
                        <h4 className="font-medium mb-2">{databaseTypeInfo.name} Connection Information</h4>
                        <p className="text-sm mb-2">{databaseTypeInfo.description}</p>
                        <div className="mb-2">
                          <span className="text-xs font-semibold block">Connection String Format:</span>
                          <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded mt-1 block">
                            {databaseTypeInfo.connectionStringTemplate}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-1 h-6 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(databaseTypeInfo.connectionStringTemplate);
                              toast({
                                title: 'Copied',
                                description: 'Connection string template copied to clipboard',
                                variant: 'default',
                              });
                            }}
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copy
                          </Button>
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold">Supported Features:</span>
                          <ul className="list-disc list-inside mt-1">
                            {databaseTypeInfo.features.map((feature: string, index: number) => (
                              <li key={index}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    <FormField
                      control={connectionForm.control}
                      name="connectionString"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Connection String</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter connection string" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            The connection string for your database. This information is encrypted and never stored in plain text.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {connectionTestResult && (
                      <div className={`p-4 rounded-md ${
                        connectionTestResult.status === 'success' 
                          ? 'bg-green-50 dark:bg-green-900/20' 
                          : 'bg-red-50 dark:bg-red-900/20'
                      }`}>
                        <div className="flex items-center">
                          {connectionTestResult.status === 'success' ? (
                            <Check className="w-5 h-5 text-green-500 mr-2" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                          )}
                          <h4 className="font-medium">
                            {connectionTestResult.status === 'success' 
                              ? `Connected to ${connectionTestResult.databaseName}` 
                              : 'Connection Failed'}
                          </h4>
                        </div>
                        {connectionTestResult.status === 'success' ? (
                          <p className="text-sm mt-1">
                            Successfully connected to {connectionTestResult.databaseName} 
                            (Version: {connectionTestResult.databaseVersion})
                          </p>
                        ) : (
                          <p className="text-sm mt-1 text-red-600 dark:text-red-400">
                            {connectionTestResult.error}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Tested on {new Date(connectionTestResult.timestamp).toLocaleString()}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => connectionForm.handleSubmit(handleTestConnection)()}
                        disabled={testConnectionMutation.isPending}
                      >
                        {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                      </Button>
                      <Button 
                        type="submit"
                        disabled={analyzeSchemasMutation.isPending || !connectionForm.formState.isValid}
                      >
                        {analyzeSchemasMutation.isPending ? 'Analyzing...' : 'Analyze Schema'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Convert Tab */}
          <TabsContent value="convert">
            <Card>
              <CardHeader>
                <CardTitle>Convert Database</CardTitle>
                <CardDescription>
                  Configure and start the database conversion process
                </CardDescription>
              </CardHeader>
              <CardContent>
                {schemaAnalysisResult ? (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Schema Analysis Results</h3>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-semibold">Database Type:</span>
                          <p className="text-sm">{schemaAnalysisResult.databaseType}</p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold">Tables:</span>
                          <p className="text-sm">{schemaAnalysisResult.tables.length}</p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold">Views:</span>
                          <p className="text-sm">{schemaAnalysisResult.views.length}</p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold">Analyzed On:</span>
                          <p className="text-sm">{new Date(schemaAnalysisResult.analysisTimestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      {(schemaAnalysisResult.schemaIssues?.tablesWithoutPrimaryKey.length || 0) > 0 && (
                        <div className="mt-3">
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                            <AlertCircle className="w-3 h-3 mr-1" /> Issues Detected
                          </Badge>
                          <p className="text-xs mt-1">
                            {schemaAnalysisResult.schemaIssues?.tablesWithoutPrimaryKey.length} tables without primary keys, 
                            {schemaAnalysisResult.schemaIssues?.redundantIndexes.length} redundant indexes,
                            {schemaAnalysisResult.schemaIssues?.missingIndexes.length} missing foreign key indexes
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <Separator className="my-6" />
                  </div>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md mb-6">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                      <h4 className="font-medium">No Schema Analysis</h4>
                    </div>
                    <p className="text-sm mt-1">
                      Please connect to a database and analyze its schema before starting a conversion.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setActiveTab('connect')}
                    >
                      Go to Connect Tab
                    </Button>
                  </div>
                )}
                
                <Form {...conversionForm}>
                  <form onSubmit={conversionForm.handleSubmit(handleStartConversion)} className="space-y-6">
                    <FormField
                      control={conversionForm.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project ID</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly />
                          </FormControl>
                          <FormDescription>Unique identifier for this conversion project</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-4">Source Database</h4>
                        
                        <FormField
                          control={conversionForm.control}
                          name="sourceType"
                          render={({ field }) => (
                            <FormItem className="mb-4">
                              <FormLabel>Source Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select source database type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingDatabaseTypes ? (
                                    <SelectItem value="loading">Loading...</SelectItem>
                                  ) : (
                                    databaseTypes?.map((db: DatabaseInfo) => (
                                      <SelectItem key={db.id} value={db.id}>
                                        <div className="flex items-center">
                                          <DatabaseTypeIcon type={db.id as DatabaseType} />
                                          <span className="ml-2">{db.name}</span>
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={conversionForm.control}
                          name="sourceConnectionString"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Source Connection String</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter source connection string" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold mb-4">Target Database</h4>
                        
                        <FormField
                          control={conversionForm.control}
                          name="targetType"
                          render={({ field }) => (
                            <FormItem className="mb-4">
                              <FormLabel>Target Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select target database type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingDatabaseTypes ? (
                                    <SelectItem value="loading">Loading...</SelectItem>
                                  ) : (
                                    databaseTypes?.filter((db: DatabaseInfo) => db.supportLevel === 'Full').map((db: DatabaseInfo) => (
                                      <SelectItem key={db.id} value={db.id}>
                                        <div className="flex items-center">
                                          <DatabaseTypeIcon type={db.id as DatabaseType} />
                                          <span className="ml-2">{db.name}</span>
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={conversionForm.control}
                          name="targetConnectionString"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Connection String</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter target connection string" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">Conversion Options</h4>
                      
                      <FormField
                        control={conversionForm.control}
                        name="generateCompatibilityLayer"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Generate Compatibility Layer</FormLabel>
                              <FormDescription>
                                Generate code for database access using a supported ORM
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {conversionForm.watch('generateCompatibilityLayer') && (
                        <>
                          <FormField
                            control={conversionForm.control}
                            name="ormType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ORM Type</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select ORM type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value={ORMType.Drizzle}>Drizzle ORM</SelectItem>
                                    <SelectItem value={ORMType.Prisma}>Prisma</SelectItem>
                                    <SelectItem value={ORMType.TypeORM}>TypeORM</SelectItem>
                                    <SelectItem value={ORMType.Sequelize}>Sequelize</SelectItem>
                                    <SelectItem value={ORMType.Mongoose}>Mongoose (for MongoDB)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Select the ORM to use for the compatibility layer
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={conversionForm.control}
                              name="includeExamples"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>Include Examples</FormLabel>
                                    <FormDescription>
                                      Generate example code for common operations
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={conversionForm.control}
                              name="generateMigrations"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>Generate Migrations</FormLabel>
                                    <FormDescription>
                                      Generate initial migration files
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    
                    {conversionStatus && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                        <div className="flex items-center mb-2">
                          <Server className="w-5 h-5 text-blue-500 mr-2" />
                          <h4 className="font-medium">Conversion Status</h4>
                          <div className="ml-auto">
                            <StatusBadge status={conversionStatus.status} />
                          </div>
                        </div>
                        
                        <div className="mb-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress: {conversionStatus.progress.overallProgress}%</span>
                            <span>
                              {conversionStatus.progress.tablesConverted} / {conversionStatus.progress.totalTables} tables
                            </span>
                          </div>
                          <Progress value={conversionStatus.progress.overallProgress} />
                        </div>
                        
                        <p className="text-sm">{conversionStatus.statusMessage}</p>
                        
                        {conversionStatus.error && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{conversionStatus.error}</p>
                        )}
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Started: {new Date(conversionStatus.startTime).toLocaleString()}
                          {conversionStatus.endTime && (
                            <span> • Completed: {new Date(conversionStatus.endTime).toLocaleString()}</span>
                          )}
                        </p>
                        
                        {conversionStatus.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setActiveTab('compatibility')}
                          >
                            Continue to Compatibility Layer
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setActiveTab('connect')}
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit"
                        disabled={startConversionMutation.isPending || !conversionForm.formState.isValid}
                      >
                        {startConversionMutation.isPending ? 'Starting...' : 'Start Conversion'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compatibility Tab */}
          <TabsContent value="compatibility">
            <Card>
              <CardHeader>
                <CardTitle>Generate Compatibility Layer</CardTitle>
                <CardDescription>
                  Generate code to interact with your converted database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...compatibilityForm}>
                  <form onSubmit={compatibilityForm.handleSubmit(handleGenerateCompatibilityLayer)} className="space-y-6">
                    <FormField
                      control={compatibilityForm.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project ID</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={!!projectId} />
                          </FormControl>
                          <FormDescription>Conversion project identifier</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={compatibilityForm.control}
                      name="ormType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ORM Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select ORM type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={ORMType.Drizzle}>Drizzle ORM</SelectItem>
                              <SelectItem value={ORMType.Prisma}>Prisma</SelectItem>
                              <SelectItem value={ORMType.TypeORM}>TypeORM</SelectItem>
                              <SelectItem value={ORMType.Sequelize}>Sequelize</SelectItem>
                              <SelectItem value={ORMType.Mongoose}>Mongoose (for MongoDB)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select the ORM to use for the compatibility layer
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={compatibilityForm.control}
                      name="targetDirectory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Directory (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., ./src/db" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Where to generate the compatibility layer code (relative to project root)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={compatibilityForm.control}
                        name="includeExamples"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Include Examples</FormLabel>
                              <FormDescription>
                                Generate example code for common operations
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={compatibilityForm.control}
                        name="generateMigrations"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Generate Migrations</FormLabel>
                              <FormDescription>
                                Generate initial migration files
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                      <h4 className="font-medium mb-2">Compatibility Layer Preview</h4>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <span className="text-sm font-semibold">ORM:</span>
                          <p className="text-sm">{compatibilityForm.watch('ormType')}</p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold">Target:</span>
                          <p className="text-sm">{compatibilityForm.watch('targetDirectory') || './compatibility'}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                          <Code className="w-3 h-3 mr-1" /> Schema Definitions
                        </Badge>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                          <Code className="w-3 h-3 mr-1" /> Database Client
                        </Badge>
                        {compatibilityForm.watch('includeExamples') && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                            <Code className="w-3 h-3 mr-1" /> Example CRUD Operations
                          </Badge>
                        )}
                        {compatibilityForm.watch('generateMigrations') && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                            <Code className="w-3 h-3 mr-1" /> Database Migrations
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setActiveTab('convert')}
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit"
                        disabled={generateCompatibilityLayerMutation.isPending || !compatibilityForm.formState.isValid}
                      >
                        {generateCompatibilityLayerMutation.isPending ? 'Generating...' : 'Generate Compatibility Layer'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  Review your database conversion results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conversionStatus && conversionStatus.status === 'completed' ? (
                  <div className="space-y-6">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
                      <div className="flex items-center mb-2">
                        <Check className="w-5 h-5 text-green-500 mr-2" />
                        <h4 className="font-medium">Conversion Complete</h4>
                      </div>
                      <p className="text-sm">
                        The database conversion process has been completed successfully.
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <span className="text-xs font-semibold">Tables Converted:</span>
                          <p className="text-sm">{conversionStatus.progress.tablesConverted} / {conversionStatus.progress.totalTables}</p>
                        </div>
                        <div>
                          <span className="text-xs font-semibold">Records Processed:</span>
                          <p className="text-sm">{conversionStatus.progress.recordsProcessed.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-xs font-semibold">Start Time:</span>
                          <p className="text-sm">{new Date(conversionStatus.startTime).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-xs font-semibold">End Time:</span>
                          <p className="text-sm">{new Date(conversionStatus.endTime || '').toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Next Steps</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                          <div className="flex items-center mb-1">
                            <Server className="w-5 h-5 text-blue-500 mr-2" />
                            <h4 className="font-medium">Connect to your new database</h4>
                          </div>
                          <p className="text-sm">
                            Use the following connection string to connect to your converted database:
                          </p>
                          <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded mt-2 relative">
                            <code className="text-xs">
                              {/* Placeholder for actual connection string */}
                              postgresql://username:password@localhost:5432/converted_database
                            </code>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-6 w-6 absolute right-2 top-1"
                              onClick={() => {
                                navigator.clipboard.writeText('postgresql://username:password@localhost:5432/converted_database');
                                toast({
                                  title: 'Copied',
                                  description: 'Connection string copied to clipboard',
                                  variant: 'default',
                                });
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                          <div className="flex items-center mb-1">
                            <Clipboard className="w-5 h-5 text-blue-500 mr-2" />
                            <h4 className="font-medium">Use the Compatibility Layer</h4>
                          </div>
                          <p className="text-sm">
                            Import and use the generated compatibility layer in your application:
                          </p>
                          <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded mt-2 text-xs overflow-x-auto">
{`// Example usage with ${compatibilityForm.watch('ormType') || 'Drizzle'}
import { db } from './compatibility/db';
import { users } from './compatibility/schema';

// Query the database
const allUsers = await db.select().from(users);
console.log(allUsers);`}
                          </pre>
                        </div>
                        
                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                          <div className="flex items-center mb-1">
                            <Code className="w-5 h-5 text-blue-500 mr-2" />
                            <h4 className="font-medium">Run Migrations</h4>
                          </div>
                          <p className="text-sm">
                            If you generated migrations, run them to ensure your database schema is up to date:
                          </p>
                          <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded mt-2 text-xs overflow-x-auto">
{`// For ${compatibilityForm.watch('ormType') || 'Drizzle'} ORM
npx drizzle-kit push:pg`}
                          </pre>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          // Reset state for a new conversion
                          setSchemaAnalysisResult(null);
                          setConnectionTestResult(null);
                          setConversionStatus(null);
                          setProjectId('');
                          connectionForm.reset();
                          conversionForm.reset();
                          compatibilityForm.reset();
                          setActiveTab('connect');
                        }}
                      >
                        Start New Conversion
                      </Button>
                      <Button type="button">Download Conversion Report</Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                      <h4 className="font-medium">No Completed Conversion</h4>
                    </div>
                    <p className="text-sm mt-1">
                      You don't have any completed database conversions yet. Please complete the previous steps.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setActiveTab('convert')}
                    >
                      Go to Convert Tab
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DatabaseConversionPage;
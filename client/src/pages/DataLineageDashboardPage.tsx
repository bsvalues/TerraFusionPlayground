import * as React from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { LineageFilters, LineageFiltersState } from '@/components/data-lineage/LineageFilters';
import { LineageTimeline } from '@/components/data-lineage/LineageTimeline';
import { getDateRangeLineage, getSourceLineage, getUserLineage, DataLineageRecord } from '@/lib/dataLineageService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Info, FileText, Download, BarChart2, PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function DataLineageDashboardPage() {
  const [filters, setFilters] = React.useState<LineageFiltersState>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date()
  });
  
  // Format dates for the API call
  const formattedStartDate = React.useMemo(() => {
    if (!filters.startDate) return '';
    return filters.startDate.toISOString().split('T')[0];
  }, [filters.startDate]);
  
  const formattedEndDate = React.useMemo(() => {
    if (!filters.endDate) return '';
    return filters.endDate.toISOString().split('T')[0];
  }, [filters.endDate]);
  
  // Determine which API to call based on the filters
  const queryFunction = React.useCallback(() => {
    // Filter by source if selected
    if (filters.sources && filters.sources.length === 1) {
      return getSourceLineage(filters.sources[0]);
    }
    // Filter by user if selected
    else if (filters.users && filters.users.length === 1) {
      return getUserLineage(filters.users[0]);
    }
    // Default to date range query
    else if (formattedStartDate && formattedEndDate) {
      return getDateRangeLineage(formattedStartDate, formattedEndDate);
    }
    
    // Fallback to an empty array if no filter is applied
    return Promise.resolve({ lineage: [] });
  }, [filters, formattedStartDate, formattedEndDate]);
  
  // Fetch lineage data
  const { 
    data: lineageData, 
    isLoading, 
    isError,
    error
  } = useQuery({
    queryKey: ['/api/data-lineage', filters, formattedStartDate, formattedEndDate],
    queryFn: queryFunction,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  // Filter records based on current filters
  const filteredRecords = React.useMemo(() => {
    if (!lineageData?.lineage) return [];
    
    let records = [...lineageData.lineage];
    
    // Apply source filter (if we're not using the source-specific API)
    if (filters.sources && filters.sources.length > 0 && 
        !(filters.sources.length === 1 && queryFunction.toString().includes('getSourceLineage'))) {
      records = records.filter(record => 
        filters.sources!.includes(record.source)
      );
    }
    
    // Apply user filter (if we're not using the user-specific API)
    if (filters.users && filters.users.length > 0 && 
        !(filters.users.length === 1 && queryFunction.toString().includes('getUserLineage'))) {
      records = records.filter(record => 
        filters.users!.includes(record.userId)
      );
    }
    
    // Apply field filter
    if (filters.fields && filters.fields.length > 0) {
      records = records.filter(record => 
        filters.fields!.includes(record.fieldName)
      );
    }
    
    return records;
  }, [lineageData, filters, queryFunction]);
  
  // Calculate data for visualizations
  const sourceChartData = React.useMemo(() => {
    if (!filteredRecords.length) return [];
    
    const sourceCounts: Record<string, number> = {};
    
    filteredRecords.forEach(record => {
      sourceCounts[record.source] = (sourceCounts[record.source] || 0) + 1;
    });
    
    return Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);
  
  const fieldChartData = React.useMemo(() => {
    if (!filteredRecords.length) return [];
    
    const fieldCounts: Record<string, number> = {};
    
    filteredRecords.forEach(record => {
      fieldCounts[record.fieldName] = (fieldCounts[record.fieldName] || 0) + 1;
    });
    
    // Sort by count and limit to top 10
    return Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);
  
  const timeChartData = React.useMemo(() => {
    if (!filteredRecords.length) return [];
    
    const dateCounts: Record<string, number> = {};
    
    filteredRecords.forEach(record => {
      const date = new Date(record.changeTimestamp).toISOString().split('T')[0];
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });
    
    // Convert to array sorted by date
    return Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredRecords]);
  
  // Get unique properties from the filtered records
  const uniqueProperties = React.useMemo(() => {
    if (!filteredRecords.length) return [];
    
    const propertySet = new Set<string>();
    
    filteredRecords.forEach(record => {
      propertySet.add(record.propertyId);
    });
    
    return Array.from(propertySet);
  }, [filteredRecords]);
  
  // Get unique sources from the filtered records
  const availableSources = React.useMemo(() => {
    if (!lineageData?.lineage) return [];
    
    const sources = new Set<string>();
    
    lineageData.lineage.forEach(record => {
      sources.add(record.source);
    });
    
    return Array.from(sources);
  }, [lineageData]);
  
  // Get unique users from the filtered records
  const availableUsers = React.useMemo(() => {
    if (!lineageData?.lineage) return [];
    
    const users = new Map<number, string>();
    
    lineageData.lineage.forEach(record => {
      users.set(record.userId, `User #${record.userId}`);
    });
    
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [lineageData]);
  
  // Get unique fields from the filtered records
  const availableFields = React.useMemo(() => {
    if (!lineageData?.lineage) return [];
    
    const fields = new Set<string>();
    
    lineageData.lineage.forEach(record => {
      fields.add(record.fieldName);
    });
    
    return Array.from(fields);
  }, [lineageData]);
  
  const handleFilterChange = (newFilters: LineageFiltersState) => {
    setFilters(newFilters);
  };
  
  // Handle exporting data as CSV
  const exportCSV = () => {
    if (!filteredRecords.length) return;
    
    const headers = ['ID', 'Property ID', 'Field Name', 'Source', 'User ID', 'Old Value', 'New Value', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(record => [
        record.id,
        record.propertyId,
        record.fieldName,
        record.source,
        record.userId,
        `"${record.oldValue.replace(/"/g, '""')}"`,
        `"${record.newValue.replace(/"/g, '""')}"`,
        new Date(record.changeTimestamp).toISOString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lineage-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Data Lineage Dashboard</h1>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
        
        <Skeleton className="h-16 w-full" />
        
        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="space-y-4 mt-4">
            <Skeleton className="h-96 w-full" />
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          </TabsContent>
          
          <TabsContent value="properties" className="mt-4">
            <Skeleton className="h-96 w-full" />
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="container py-6 space-y-6">
        <h1 className="text-2xl font-bold">Data Lineage Dashboard</h1>
        
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {error instanceof Error 
              ? error.message 
              : "An error occurred while loading lineage data."
            }
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">Data Lineage Dashboard</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportCSV}
          disabled={filteredRecords.length === 0}
        >
          <Download className="h-4 w-4 mr-1" />
          Export Records
        </Button>
      </div>
      
      <LineageFilters 
        onChange={handleFilterChange} 
        availableSources={availableSources}
        availableUsers={availableUsers}
        availableFields={availableFields}
        value={filters}
      />
      
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="space-y-4 mt-4">
          {filteredRecords.length > 0 ? (
            <LineageTimeline 
              records={filteredRecords}
              title="Data Change Timeline"
            />
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Records Found</AlertTitle>
              <AlertDescription>
                No lineage records match your current filter criteria. Try adjusting your filters 
                or selecting a different date range.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-4">
          {filteredRecords.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <BarChart2 className="h-5 w-5 mr-2" />
                    Changes by Date
                  </CardTitle>
                  <CardDescription>
                    Number of changes recorded per day
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={timeChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          angle={-45} 
                          textAnchor="end" 
                          tick={{ fontSize: 12 }}
                          height={70}
                        />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} changes`, 'Count']} />
                        <Bar dataKey="count" fill="#8884d8" name="Changes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <PieChartIcon className="h-5 w-5 mr-2" />
                    Changes by Source
                  </CardTitle>
                  <CardDescription>
                    Distribution of changes by source type
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourceChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {sourceChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} changes`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <BarChart2 className="h-5 w-5 mr-2" />
                    Top Changed Fields
                  </CardTitle>
                  <CardDescription>
                    Fields with the most frequent changes
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={fieldChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          width={100}
                        />
                        <Tooltip formatter={(value) => [`${value} changes`, 'Count']} />
                        <Bar dataKey="value" fill="#82ca9d" name="Changes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lineage Summary</CardTitle>
                  <CardDescription>
                    Overview of the current data set
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Total Changes</div>
                        <div className="text-3xl font-bold">{filteredRecords.length}</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Properties Affected</div>
                        <div className="text-3xl font-bold">{uniqueProperties.length}</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Date Range</div>
                        <div className="text-base">
                          {filters.startDate && filters.endDate ? (
                            `${format(filters.startDate, 'MMM d, yyyy')} - ${format(filters.endDate, 'MMM d, yyyy')}`
                          ) : (
                            'All time'
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Fields Changed</div>
                        <div className="text-base">{availableFields.length}</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Users Involved</div>
                        <div className="text-base">{availableUsers.length}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Data to Analyze</AlertTitle>
              <AlertDescription>
                No lineage records match your current filter criteria. Try adjusting your filters 
                or selecting a different date range to see analytics.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="properties" className="mt-4">
          {uniqueProperties.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Properties with Changes</CardTitle>
                <CardDescription>
                  Properties that have changes recorded in the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uniqueProperties.slice(0, 30).map((propertyId) => {
                    // Count changes for this property
                    const changeCount = filteredRecords.filter(
                      record => record.propertyId === propertyId
                    ).length;
                    
                    return (
                      <Card key={propertyId} className="overflow-hidden">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-medium truncate">
                            Property ID: {propertyId}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="text-sm text-muted-foreground">
                            {changeCount} change{changeCount !== 1 ? 's' : ''} recorded
                          </div>
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                          <Button variant="ghost" size="sm" asChild className="w-full">
                            <Link to={`/property-lineage/${propertyId}`}>
                              <FileText className="h-4 w-4 mr-1" />
                              View Changes
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
                
                {uniqueProperties.length > 30 && (
                  <div className="text-center mt-6 text-sm text-muted-foreground">
                    Showing 30 of {uniqueProperties.length} properties. 
                    Use filters to narrow down the results.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Properties Found</AlertTitle>
              <AlertDescription>
                No properties have changes recorded that match your current filter criteria. 
                Try adjusting your filters or selecting a different date range.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
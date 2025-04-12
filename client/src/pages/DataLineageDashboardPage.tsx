import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  getDateRangeLineage, 
  getSourceLineage, 
  getUserLineage,
  DataLineageRecord
} from '@/lib/dataLineageService';
import { LineageTimeline } from '@/components/data-lineage/LineageTimeline';
import { LineageSummary } from '@/components/data-lineage/LineageSummary';
import { LineageFilters, LineageFiltersState } from '@/components/data-lineage/LineageFilters';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  TooltipProps,
  Legend
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Calendar, Users, Clock, Loader2 } from 'lucide-react';
import { format, addDays, startOfDay, endOfDay, subDays } from 'date-fns';

export function DataLineageDashboardPage() {
  const [activeFilters, setActiveFilters] = React.useState<LineageFiltersState>({});
  const [timeRange, setTimeRange] = React.useState<'today' | '7days' | '30days' | 'custom'>('7days');
  
  // Calculate date range based on selected time range
  const dateRange = React.useMemo(() => {
    const today = new Date();
    const endDate = endOfDay(today);
    
    switch (timeRange) {
      case 'today':
        return {
          startDate: startOfDay(today),
          endDate
        };
      case '7days':
        return {
          startDate: startOfDay(subDays(today, 7)),
          endDate
        };
      case '30days':
        return {
          startDate: startOfDay(subDays(today, 30)),
          endDate
        };
      case 'custom':
        return {
          startDate: activeFilters.startDate ? startOfDay(activeFilters.startDate) : startOfDay(subDays(today, 7)),
          endDate: activeFilters.endDate ? endOfDay(activeFilters.endDate) : endDate
        };
    }
  }, [timeRange, activeFilters.startDate, activeFilters.endDate]);
  
  // Query for lineage data
  const dateRangeQuery = useQuery({
    queryKey: [
      '/api/data-lineage/date-range', 
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString()
    ],
    queryFn: () => getDateRangeLineage(
      dateRange.startDate.toISOString(), 
      dateRange.endDate.toISOString()
    ),
  });
  
  // Query for filtered lineage data
  const filteredLineageQuery = useQuery({
    queryKey: [
      '/api/data-lineage/filtered',
      activeFilters.source,
      activeFilters.propertyId,
      activeFilters.fieldName,
      activeFilters.userId,
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString()
    ],
    queryFn: async () => {
      if (activeFilters.source) {
        return getSourceLineage(activeFilters.source);
      }
      
      if (activeFilters.userId) {
        return getUserLineage(activeFilters.userId);
      }
      
      return getDateRangeLineage(
        dateRange.startDate.toISOString(),
        dateRange.endDate.toISOString()
      );
    },
    enabled: Object.keys(activeFilters).length > 0,
  });
  
  // Combine all lineage records for display
  const allLineageRecords = React.useMemo((): DataLineageRecord[] => {
    if (filteredLineageQuery.data && Object.keys(activeFilters).length > 0) {
      return 'lineage' in filteredLineageQuery.data 
        ? filteredLineageQuery.data.lineage 
        : [];
    }
    
    if (!dateRangeQuery.data) return [];
    
    const records = dateRangeQuery.data.lineage;
    
    // Apply additional filters
    let filteredRecords = [...records];
    
    if (activeFilters.propertyId) {
      filteredRecords = filteredRecords.filter(record => 
        record.propertyId.toLowerCase().includes(activeFilters.propertyId!.toLowerCase())
      );
    }
    
    if (activeFilters.fieldName) {
      filteredRecords = filteredRecords.filter(record => 
        record.fieldName.toLowerCase().includes(activeFilters.fieldName!.toLowerCase())
      );
    }
    
    return filteredRecords;
  }, [dateRangeQuery.data, filteredLineageQuery.data, activeFilters]);
  
  // Prepare data for charts
  const dailyChangesData = React.useMemo(() => {
    const changes: { [date: string]: number } = {};
    
    // Initialize all dates in the range
    let currentDate = new Date(dateRange.startDate);
    while (currentDate <= dateRange.endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      changes[dateStr] = 0;
      currentDate = addDays(currentDate, 1);
    }
    
    // Count changes per day
    allLineageRecords.forEach(record => {
      const dateStr = format(new Date(record.changeTimestamp), 'yyyy-MM-dd');
      if (changes[dateStr] !== undefined) {
        changes[dateStr]++;
      }
    });
    
    // Convert to array for chart
    return Object.entries(changes).map(([date, count]) => ({
      date: format(new Date(date), 'MMM dd'),
      count,
    }));
  }, [allLineageRecords, dateRange]);
  
  // Get unique sources for the filter dropdown
  const availableSources = React.useMemo(() => {
    const sources = new Set<string>();
    allLineageRecords.forEach(record => sources.add(record.source));
    return Array.from(sources);
  }, [allLineageRecords]);
  
  // Handle filter changes
  const handleFilterChange = (filters: LineageFiltersState) => {
    if (filters.startDate || filters.endDate) {
      setTimeRange('custom');
    }
    setActiveFilters(filters);
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-2 border rounded-md shadow-sm">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            Changes: <span className="font-medium">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Loading state
  const isLoading = dateRangeQuery.isLoading || filteredLineageQuery.isLoading;
  
  // Determine if we have an empty state
  const isEmpty = !isLoading && allLineageRecords.length === 0;

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Data Lineage Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track and analyze data changes across the system
          </p>
        </div>
      </div>
      
      <Tabs 
        defaultValue="7days" 
        value={timeRange} 
        onValueChange={(value) => setTimeRange(value as any)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30days">Last 30 Days</TabsTrigger>
          <TabsTrigger value="custom">Custom Range</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <LineageFilters 
        sources={availableSources}
        onFilterChange={handleFilterChange}
        showPropertyIdFilter={true}
      />
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isEmpty ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No data lineage records available for the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Total Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{allLineageRecords.length}</div>
                <p className="text-muted-foreground text-sm">
                  {format(dateRange.startDate, 'MMM dd, yyyy')} - {format(dateRange.endDate, 'MMM dd, yyyy')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Database className="mr-2 h-4 w-4" />
                  Properties Modified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {new Set(allLineageRecords.map(r => r.propertyId)).size}
                </div>
                <p className="text-muted-foreground text-sm">Unique properties with changes</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {new Set(allLineageRecords.map(r => r.userId)).size}
                </div>
                <p className="text-muted-foreground text-sm">Users making data changes</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Calendar className="mr-2 h-5 w-5 inline" />
                  Daily Change Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChangesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="var(--primary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <LineageSummary records={allLineageRecords} />
          </div>
          
          <LineageTimeline 
            records={allLineageRecords}
            title="Recent Changes"
            showPropertyId={true}
          />
        </div>
      )}
    </div>
  );
}
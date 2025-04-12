import * as React from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { getPropertyLineage, DataLineageRecord } from '@/lib/dataLineageService';
import { LineageFilters, LineageFiltersState } from '@/components/data-lineage/LineageFilters';
import { LineageTimeline } from '@/components/data-lineage/LineageTimeline';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, ChevronLeft } from 'lucide-react';

export function PropertyLineagePage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [filters, setFilters] = React.useState<LineageFiltersState>({});
  
  // Fetch property lineage data
  const {
    data: lineageData,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['/api/property-lineage', propertyId],
    queryFn: () => getPropertyLineage(propertyId),
    enabled: !!propertyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Process lineage data into a flat array
  const allRecords = React.useMemo(() => {
    if (!lineageData) return [];
    
    const records: DataLineageRecord[] = [];
    
    // Flatten the lineage object into an array
    Object.values(lineageData.lineage).forEach(fieldRecords => {
      records.push(...fieldRecords);
    });
    
    return records;
  }, [lineageData]);
  
  // Get current property field values
  const currentValues = React.useMemo(() => {
    if (!lineageData || !allRecords.length) return {};
    
    // Get the most recent value for each field
    const values: Record<string, { value: string; timestamp: Date }> = {};
    
    Object.entries(lineageData.lineage).forEach(([fieldName, records]) => {
      if (records.length > 0) {
        // Sort by timestamp (newest first)
        const sortedRecords = [...records].sort((a, b) => 
          new Date(b.changeTimestamp).getTime() - new Date(a.changeTimestamp).getTime()
        );
        
        // Get the most recent value
        values[fieldName] = {
          value: sortedRecords[0].newValue,
          timestamp: new Date(sortedRecords[0].changeTimestamp)
        };
      }
    });
    
    return values;
  }, [lineageData, allRecords]);
  
  // Get available fields
  const availableFields = React.useMemo(() => {
    if (!lineageData) return [];
    return Object.keys(lineageData.lineage);
  }, [lineageData]);
  
  // Get unique sources
  const availableSources = React.useMemo(() => {
    if (!allRecords.length) return [];
    
    const sources = new Set<string>();
    
    allRecords.forEach(record => {
      sources.add(record.source);
    });
    
    return Array.from(sources);
  }, [allRecords]);
  
  // Get unique users
  const availableUsers = React.useMemo(() => {
    if (!allRecords.length) return [];
    
    const users = new Map<number, string>();
    
    allRecords.forEach(record => {
      users.set(record.userId, `User #${record.userId}`);
    });
    
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [allRecords]);
  
  // Filter records based on the current filters
  const filteredRecords = React.useMemo(() => {
    if (!allRecords.length) return [];
    
    let records = [...allRecords];
    
    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      records = records.filter(record => {
        const timestamp = new Date(record.changeTimestamp);
        if (filters.startDate && timestamp < filters.startDate) return false;
        if (filters.endDate) {
          // Set the end date to the end of the day
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (timestamp > endDate) return false;
        }
        return true;
      });
    }
    
    // Apply source filter
    if (filters.sources && filters.sources.length > 0) {
      records = records.filter(record => 
        filters.sources!.includes(record.source)
      );
    }
    
    // Apply user filter
    if (filters.users && filters.users.length > 0) {
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
  }, [allRecords, filters]);
  
  const handleFilterChange = (newFilters: LineageFiltersState) => {
    setFilters(newFilters);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/data-lineage">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Property Lineage</h1>
          <div className="text-muted-foreground">
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
        
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  // Error state
  if (isError || !lineageData) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/data-lineage">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        
        <h1 className="text-2xl font-bold">Property Lineage</h1>
        
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {error instanceof Error 
              ? error.message 
              : "Could not load property lineage data. The property ID may be invalid or the data is unavailable."
            }
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/data-lineage">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Property Lineage</h1>
          <div className="text-muted-foreground">
            Property ID: {propertyId}
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">
            {Object.keys(lineageData.lineage).length} tracked fields
          </div>
          <div className="text-sm text-muted-foreground">
            {allRecords.length} total changes
          </div>
        </div>
      </div>
      
      <LineageFilters 
        onChange={handleFilterChange}
        availableSources={availableSources}
        availableUsers={availableUsers}
        availableFields={availableFields}
        value={filters}
      />
      
      {filteredRecords.length > 0 ? (
        <LineageTimeline 
          records={filteredRecords}
          title="Property Change Timeline"
        />
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Records Found</AlertTitle>
          <AlertDescription>
            No lineage records match your current filter criteria. Try adjusting your filters.
          </AlertDescription>
        </Alert>
      )}
      
      {Object.keys(currentValues).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Current Property Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(currentValues).map(([fieldName, { value, timestamp }]) => (
              <div 
                key={fieldName} 
                className="border rounded-lg p-4 bg-card text-card-foreground shadow-sm"
              >
                <div className="text-sm font-medium">{fieldName}</div>
                <div className="mt-1 text-base truncate">{value || '<empty>'}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Last updated: {new Date(timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
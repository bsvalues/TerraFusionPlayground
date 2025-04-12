import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { getPropertyLineage, getSourceLineage, getDateRangeLineage } from '@/lib/dataLineageService';
import { LineageTimeline } from '@/components/data-lineage/LineageTimeline';
import { LineageSummary } from '@/components/data-lineage/LineageSummary';
import { LineageFilters, LineageFiltersState } from '@/components/data-lineage/LineageFilters';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';

export function PropertyLineagePage() {
  const [, setLocation] = useLocation();
  const { propertyId } = useParams<{ propertyId: string }>();
  const [activeFilters, setActiveFilters] = React.useState<LineageFiltersState>({});
  
  // Query for property details (if you have a separate endpoint for this)
  const propertyQuery = useQuery({
    queryKey: ['/api/properties', propertyId],
    enabled: !!propertyId,
  });
  
  // Query for property lineage data
  const lineageQuery = useQuery({
    queryKey: ['/api/data-lineage/property', propertyId],
    queryFn: () => getPropertyLineage(propertyId!),
    enabled: !!propertyId,
  });
  
  // Function to get filtered lineage data
  const getFilteredData = async () => {
    if (activeFilters.source) {
      return getSourceLineage(activeFilters.source);
    }
    
    if (activeFilters.startDate && activeFilters.endDate) {
      return getDateRangeLineage(
        activeFilters.startDate.toISOString(),
        activeFilters.endDate.toISOString()
      );
    }
    
    // Default to property lineage
    return getPropertyLineage(propertyId!);
  };
  
  // Query for filtered lineage data
  const filteredLineageQuery = useQuery({
    queryKey: [
      '/api/data-lineage/filtered', 
      propertyId,
      activeFilters.source,
      activeFilters.startDate?.toISOString(),
      activeFilters.endDate?.toISOString(),
      activeFilters.fieldName,
      activeFilters.userId,
    ],
    queryFn: getFilteredData,
    enabled: !!propertyId && Object.keys(activeFilters).length > 0,
  });
  
  // Combine all lineage records for display
  const allLineageRecords = React.useMemo(() => {
    if (filteredLineageQuery.data && Object.keys(activeFilters).length > 0) {
      // If we have filtered data, use that
      return 'lineage' in filteredLineageQuery.data 
        ? filteredLineageQuery.data.lineage 
        : [];
    }
    
    if (!lineageQuery.data) return [];
    
    // Convert the field-based lineage structure to a flat array
    const records = [];
    for (const fieldName in lineageQuery.data.lineage) {
      records.push(...lineageQuery.data.lineage[fieldName]);
    }
    
    // Filter by field name if specified
    if (activeFilters.fieldName) {
      return records.filter(record => 
        record.fieldName.toLowerCase().includes(activeFilters.fieldName!.toLowerCase())
      );
    }
    
    return records;
  }, [lineageQuery.data, filteredLineageQuery.data, activeFilters]);
  
  // Get unique sources for the filter dropdown
  const availableSources = React.useMemo(() => {
    const sources = new Set<string>();
    allLineageRecords.forEach(record => sources.add(record.source));
    return Array.from(sources);
  }, [allLineageRecords]);
  
  // Handle filter changes
  const handleFilterChange = (filters: LineageFiltersState) => {
    setActiveFilters(filters);
  };
  
  // Loading state
  const isLoading = lineageQuery.isLoading || filteredLineageQuery.isLoading;
  
  // Determine if we have an empty state
  const isEmpty = !isLoading && allLineageRecords.length === 0;

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation('/properties')}
            className="mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Properties
          </Button>
          <h1 className="text-2xl font-bold flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Property Data Lineage
          </h1>
          {propertyId && (
            <p className="text-muted-foreground">
              {propertyQuery.data?.address 
                ? `${propertyId} - ${propertyQuery.data.address}` 
                : propertyId}
            </p>
          )}
        </div>
      </div>
      
      <LineageFilters 
        sources={availableSources}
        onFilterChange={handleFilterChange}
      />
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isEmpty ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No data lineage records available for this property.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <LineageSummary 
            records={allLineageRecords} 
            title="Property Data Change Summary"
          />
          
          <LineageTimeline 
            records={allLineageRecords}
            title="Complete Change History"
          />
        </div>
      )}
    </div>
  );
}
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { LineageTimeline } from '@/components/data-lineage/LineageTimeline';
import { LineageFilters, LineageFiltersState } from '@/components/data-lineage/LineageFilters';
import { 
  PageHeader, 
  PageHeaderDescription, 
  PageHeaderHeading 
} from '@/components/ui/page-header';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Icons as LucideIcons } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CardSkeleton } from '@/components/ui/card-skeleton';
import { apiRequest } from '@/lib/queryClient';

export function PropertyLineagePage() {
  const [, params] = useRoute('/properties/:propertyId/lineage');
  const propertyId = params?.propertyId;
  
  const [filters, setFilters] = React.useState<LineageFiltersState>({});
  
  // Fetch property details
  const propertyQuery = useQuery({
    queryKey: ['/api/properties', propertyId],
    enabled: !!propertyId
  });
  
  // Fetch available sources, users, and fields for this property
  const filtersQuery = useQuery({
    queryKey: ['/api/data-lineage/filters', propertyId],
    enabled: !!propertyId
  });
  
  // Fetch lineage records
  const lineageQuery = useQuery({
    queryKey: ['/api/data-lineage/property', propertyId, filters],
    enabled: !!propertyId
  });
  
  // Process lineage records to create a timeline of field changes
  const processedRecords = React.useMemo(() => {
    if (!lineageQuery.data) return [];
    
    // Sort the records by timestamp (newest first)
    return [...lineageQuery.data].sort((a, b) => {
      const dateA = new Date(a.changeTimestamp);
      const dateB = new Date(b.changeTimestamp);
      return dateB.getTime() - dateA.getTime();
    });
  }, [lineageQuery.data]);
  
  // Create a property history timeline
  const propertyHistory = React.useMemo(() => {
    if (!lineageQuery.data) return [];
    
    // Group records by field to track its history
    const values: Record<string, { value: string; timestamp: Date }> = {};
    const timeline: { field: string; history: { value: string; timestamp: Date }[] }[] = [];
    
    // Process all records to build field value history
    lineageQuery.data.forEach(record => {
      const timestamp = new Date(record.changeTimestamp);
      const field = record.fieldName;
      
      // Update current value for this field
      values[field] = {
        value: record.newValue,
        timestamp
      };
      
      // Find or create a timeline entry for this field
      let fieldTimeline = timeline.find(t => t.field === field);
      if (!fieldTimeline) {
        fieldTimeline = { field, history: [] };
        timeline.push(fieldTimeline);
      }
      
      // Add this value to the field's history
      fieldTimeline.history.push({
        value: record.newValue,
        timestamp
      });
    });
    
    return timeline;
  }, [lineageQuery.data]);
  
  // Handle filter changes from the LineageFilters component
  const handleFilterChange = (newFilters: LineageFiltersState) => {
    setFilters(newFilters);
  };
  
  // Determine available filters for this property
  const availableSources = React.useMemo(() => {
    return filtersQuery.data?.sources || [];
  }, [filtersQuery.data]);
  
  const availableUsers = React.useMemo(() => {
    return filtersQuery.data?.users || [];
  }, [filtersQuery.data]);
  
  const availableFields = React.useMemo(() => {
    return filtersQuery.data?.fields || [];
  }, [filtersQuery.data]);
  
  // Get property name or default to ID
  const propertyName = React.useMemo(() => {
    if (propertyQuery.isLoading) return 'Loading...';
    if (propertyQuery.isError) return `Property ${propertyId}`;
    return propertyQuery.data?.address || `Property ${propertyId}`;
  }, [propertyQuery.data, propertyQuery.isLoading, propertyQuery.isError, propertyId]);
  
  // Create summary stats
  const stats = React.useMemo(() => {
    if (!lineageQuery.data) return { total: 0, fields: 0, sources: 0 };
    
    const uniqueFields = new Set(lineageQuery.data.map(record => record.fieldName));
    const uniqueSources = new Set(lineageQuery.data.map(record => record.source));
    
    return {
      total: lineageQuery.data.length,
      fields: uniqueFields.size,
      sources: uniqueSources.size
    };
  }, [lineageQuery.data]);
  
  const isLoading = propertyQuery.isLoading || lineageQuery.isLoading || filtersQuery.isLoading;
  const isError = propertyQuery.isError || lineageQuery.isError || filtersQuery.isError;
  
  return (
    <div className="container py-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/properties">Properties</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href={`/properties/${propertyId}`}>{propertyId}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink>Data Lineage</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      
      <PageHeader>
        <div className="flex items-center gap-4">
          <PageHeaderHeading>{propertyName}</PageHeaderHeading>
          {!isLoading && !isError && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/properties/${propertyId}`}>
                <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                Back to Property
              </a>
            </Button>
          )}
        </div>
        <PageHeaderDescription>
          Data change history and lineage tracking for this property
        </PageHeaderDescription>
        
        {!isLoading && !isError && (
          <div className="flex flex-wrap gap-4 mt-2">
            <div className="flex items-center gap-2">
              <LucideIcons.FileText className="h-5 w-5 opacity-70" />
              <span className="text-sm">
                <strong>{stats.total}</strong> changes tracked
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LucideIcons.Tag className="h-5 w-5 opacity-70" />
              <span className="text-sm">
                <strong>{stats.fields}</strong> fields modified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LucideIcons.Database className="h-5 w-5 opacity-70" />
              <span className="text-sm">
                <strong>{stats.sources}</strong> data sources
              </span>
            </div>
          </div>
        )}
      </PageHeader>
      
      <Separator />
      
      {isError ? (
        <Alert variant="destructive">
          <LucideIcons.AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error loading property data lineage</AlertTitle>
          <AlertDescription>
            There was a problem fetching the data lineage information for this property.
            Please try again later or contact support.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <>
          <div className="h-[180px] animate-pulse rounded-lg bg-muted"></div>
          <CardSkeleton />
        </>
      ) : (
        <>
          <LineageFilters 
            onChange={handleFilterChange}
            availableSources={availableSources}
            availableUsers={availableUsers}
            availableFields={availableFields}
            value={filters}
          />
          
          <LineageTimeline 
            records={processedRecords}
            title={`Data Lineage for ${propertyName}`}
          />
        </>
      )}
    </div>
  );
}
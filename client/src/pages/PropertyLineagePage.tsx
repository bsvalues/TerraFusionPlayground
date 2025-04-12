import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ArrowLeft, FileDigit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineageTimeline } from '@/components/data-lineage/LineageTimeline';
import { DataLineageRecord, getPropertyLineage } from '@/lib/dataLineageService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function PropertyLineagePage() {
  const [, setLocation] = useLocation();
  
  // Get propertyId from URL
  const propertyId = window.location.pathname.split('/').pop() || '';
  
  // Fetch property lineage data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/data-lineage/property', propertyId],
    enabled: Boolean(propertyId),
  });
  
  // Group the lineage records by field
  const fieldTabs = React.useMemo(() => {
    if (!data?.lineage) return [];
    return Object.keys(data.lineage).sort();
  }, [data?.lineage]);
  
  // Get all lineage records flattened into a single array
  const allRecords = React.useMemo(() => {
    if (!data?.lineage) return [];
    return Object.values(data.lineage).flat();
  }, [data?.lineage]);
  
  // Create field -> records map for easy access
  const recordsByField = React.useMemo(() => {
    if (!data?.lineage) return {};
    return data.lineage;
  }, [data?.lineage]);
  
  // Navigate back to property details
  const handleBack = () => {
    setLocation(`/properties/${propertyId}`);
  };
  
  if (isLoading) {
    return (
      <div className="container py-6 max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="sm" onClick={handleBack} className="h-9">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-9 w-60" />
        </div>
        
        <Skeleton className="h-12 w-full mb-6" />
        
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container py-6 max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="sm" onClick={handleBack} className="h-9">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Data Lineage</CardTitle>
            <CardDescription className="text-red-700">
              There was an error retrieving the lineage data for this property.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm p-4 bg-white border border-red-100 rounded whitespace-pre-wrap">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </pre>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={handleBack} className="h-9">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Property
        </Button>
        <h1 className="text-2xl font-bold">
          Property Lineage
          <Badge variant="outline" className="ml-3">
            {propertyId}
          </Badge>
        </h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileDigit className="h-5 w-5 mr-2" />
            Data Lineage Summary
          </CardTitle>
          <CardDescription>
            Complete change history for this property, showing every data modification with source information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-secondary/20 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Total Changes
              </div>
              <div className="text-2xl font-bold">
                {allRecords.length}
              </div>
            </div>
            <div className="bg-secondary/20 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Fields Modified
              </div>
              <div className="text-2xl font-bold">
                {fieldTabs.length}
              </div>
            </div>
            <div className="bg-secondary/20 p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Last Modified
              </div>
              <div className="text-2xl font-bold">
                {allRecords.length > 0 
                  ? new Date(Math.max(...allRecords.map(r => new Date(r.changeTimestamp).getTime())))
                    .toLocaleDateString() 
                  : 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Changes</TabsTrigger>
          {fieldTabs.map(field => (
            <TabsTrigger key={field} value={field}>{field}</TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="all">
          <LineageTimeline 
            records={allRecords} 
            title="All Changes" 
          />
        </TabsContent>
        
        {fieldTabs.map(field => (
          <TabsContent key={field} value={field}>
            <LineageTimeline 
              records={recordsByField[field] as DataLineageRecord[]} 
              title={`${field} Changes`} 
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
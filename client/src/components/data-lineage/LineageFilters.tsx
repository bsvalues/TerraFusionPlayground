import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';

export interface LineageFiltersProps {
  sources: string[];
  onFilterChange: (filters: LineageFiltersState) => void;
  showPropertyIdFilter?: boolean;
}

export interface LineageFiltersState {
  propertyId?: string;
  fieldName?: string;
  source?: string;
  startDate?: Date;
  endDate?: Date;
  userId?: number;
}

export function LineageFilters({ 
  sources = [], 
  onFilterChange,
  showPropertyIdFilter = false
}: LineageFiltersProps) {
  const [filters, setFilters] = React.useState<LineageFiltersState>({});
  
  const handleFilterChange = (key: keyof LineageFiltersState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    
    // If value is empty string or null, remove the filter
    if (value === '' || value === null) {
      delete newFilters[key];
    }
    
    setFilters(newFilters);
  };
  
  const applyFilters = () => {
    onFilterChange(filters);
  };
  
  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  return (
    <Card className="w-full mb-4">
      <CardContent className="pt-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {showPropertyIdFilter && (
            <div className="space-y-2">
              <Label htmlFor="property-id">Property ID</Label>
              <Input
                id="property-id"
                placeholder="Filter by property ID"
                value={filters.propertyId || ''}
                onChange={(e) => handleFilterChange('propertyId', e.target.value)}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="field-name">Field Name</Label>
            <Input
              id="field-name"
              placeholder="Filter by field name"
              value={filters.fieldName || ''}
              onChange={(e) => handleFilterChange('fieldName', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="source-type">Source Type</Label>
            <Select 
              value={filters.source || ''} 
              onValueChange={(value) => handleFilterChange('source', value || undefined)}
            >
              <SelectTrigger id="source-type">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All sources</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="user-id">User ID</Label>
            <Input
              id="user-id"
              type="number"
              placeholder="Filter by user ID"
              value={filters.userId || ''}
              onChange={(e) => handleFilterChange('userId', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? (
                    format(filters.startDate, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) => handleFilterChange('startDate', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? (
                    format(filters.endDate, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) => handleFilterChange('endDate', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-end space-x-2">
            <Button onClick={applyFilters} className="flex-1">
              <Filter className="mr-1 h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
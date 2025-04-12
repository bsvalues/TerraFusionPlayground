import * as React from 'react';
import { Calendar as CalendarIcon, CheckIcon, ChevronsUpDown, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LineageSource, getSourceLabel } from '@/lib/dataLineageService';

export interface LineageFiltersState {
  startDate?: Date;
  endDate?: Date;
  sources?: string[];
  users?: number[];
  fields?: string[];
}

interface LineageFiltersProps {
  onChange: (filters: LineageFiltersState) => void;
  availableSources?: string[];
  availableUsers?: { id: number; name: string }[];
  availableFields?: string[];
  value?: LineageFiltersState;
}

export function LineageFilters({
  onChange,
  availableSources = ['validated', 'import', 'manual', 'api', 'calculated', 'correction'],
  availableUsers = [],
  availableFields = [],
  value = {},
}: LineageFiltersProps) {
  // Create local state that tracks the current filter values
  const [filters, setFilters] = React.useState<LineageFiltersState>(value);
  
  // Update filters state and call onChange handler
  const updateFilters = (newFilters: Partial<LineageFiltersState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onChange(updatedFilters);
  };
  
  // Reset all filters
  const resetFilters = () => {
    const emptyFilters: LineageFiltersState = {};
    setFilters(emptyFilters);
    onChange(emptyFilters);
  };
  
  // Format a date for display
  const formatDate = (date?: Date) => {
    return date ? format(date, 'PPP') : undefined;
  };
  
  // Select a predefined date range
  const selectDateRange = (days: number | null) => {
    if (days === null) {
      updateFilters({ startDate: undefined, endDate: undefined });
      return;
    }
    
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    updateFilters({ startDate: start, endDate: end });
  };
  
  // Check if a filter is currently active
  const hasActiveFilters = React.useMemo(() => {
    return (
      Boolean(filters.startDate) ||
      Boolean(filters.endDate) ||
      (filters.sources && filters.sources.length > 0) ||
      (filters.users && filters.users.length > 0) ||
      (filters.fields && filters.fields.length > 0)
    );
  }, [filters]);
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filter Lineage Data
          </CardTitle>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetFilters}
              className="h-8"
            >
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Date Range Filter */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Date Range</h3>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !filters.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? formatDate(filters.startDate) : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => updateFilters({ startDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <span className="text-muted-foreground">to</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !filters.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? formatDate(filters.endDate) : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => updateFilters({ endDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs px-2"
                onClick={() => selectDateRange(1)}
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs px-2"
                onClick={() => selectDateRange(7)}
              >
                Last 7 days
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs px-2"
                onClick={() => selectDateRange(30)}
              >
                Last 30 days
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs px-2"
                onClick={() => selectDateRange(null)}
              >
                All time
              </Button>
            </div>
          </div>
          
          {/* Source Filter */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Source Types</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                >
                  {filters.sources && filters.sources.length > 0
                    ? `${filters.sources.length} selected`
                    : "Select sources"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search sources..." />
                  <CommandEmpty>No source found.</CommandEmpty>
                  <CommandGroup>
                    {availableSources.map((source) => (
                      <CommandItem
                        key={source}
                        value={source}
                        onSelect={() => {
                          const currentSources = filters.sources || [];
                          const newSources = currentSources.includes(source)
                            ? currentSources.filter(s => s !== source)
                            : [...currentSources, source];
                          
                          updateFilters({ sources: newSources });
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4",
                            (filters.sources || []).includes(source) 
                              ? "opacity-100" 
                              : "opacity-0"
                          )}
                        />
                        {getSourceLabel(source)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            
            {/* Display selected sources as badges */}
            {filters.sources && filters.sources.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {filters.sources.map(source => (
                  <Badge
                    key={source}
                    variant="outline"
                    className="text-xs py-0"
                  >
                    {getSourceLabel(source)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 ml-1 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        updateFilters({
                          sources: filters.sources?.filter(s => s !== source) || []
                        });
                      }}
                    >
                      ✕
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Users Filter */}
          {availableUsers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Modified By</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                  >
                    {filters.users && filters.users.length > 0
                      ? `${filters.users.length} selected`
                      : "Select users"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      {availableUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.name}
                          onSelect={() => {
                            const currentUsers = filters.users || [];
                            const newUsers = currentUsers.includes(user.id)
                              ? currentUsers.filter(id => id !== user.id)
                              : [...currentUsers, user.id];
                            
                            updateFilters({ users: newUsers });
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              (filters.users || []).includes(user.id) 
                                ? "opacity-100" 
                                : "opacity-0"
                            )}
                          />
                          {user.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Display selected users as badges */}
              {filters.users && filters.users.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {filters.users.map(userId => {
                    const user = availableUsers.find(u => u.id === userId);
                    return (
                      <Badge
                        key={userId}
                        variant="outline"
                        className="text-xs py-0"
                      >
                        {user?.name || `User ID: ${userId}`}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto px-0 ml-1 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            updateFilters({
                              users: filters.users?.filter(id => id !== userId) || []
                            });
                          }}
                        >
                          ✕
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Fields Filter */}
          {availableFields.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Fields</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                  >
                    {filters.fields && filters.fields.length > 0
                      ? `${filters.fields.length} selected`
                      : "Select fields"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search fields..." />
                    <CommandEmpty>No field found.</CommandEmpty>
                    <CommandGroup>
                      {availableFields.map((field) => (
                        <CommandItem
                          key={field}
                          value={field}
                          onSelect={() => {
                            const currentFields = filters.fields || [];
                            const newFields = currentFields.includes(field)
                              ? currentFields.filter(f => f !== field)
                              : [...currentFields, field];
                            
                            updateFilters({ fields: newFields });
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              (filters.fields || []).includes(field) 
                                ? "opacity-100" 
                                : "opacity-0"
                            )}
                          />
                          {field}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Display selected fields as badges */}
              {filters.fields && filters.fields.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {filters.fields.map(field => (
                    <Badge
                      key={field}
                      variant="outline"
                      className="text-xs py-0"
                    >
                      {field}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0 ml-1 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          updateFilters({
                            fields: filters.fields?.filter(f => f !== field) || []
                          });
                        }}
                      >
                        ✕
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {hasActiveFilters && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {Object.entries(filters).filter(([_, value]) => {
                  if (Array.isArray(value)) return value.length > 0;
                  return value !== undefined;
                }).length} active filters
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetFilters}
              >
                Clear Filters
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
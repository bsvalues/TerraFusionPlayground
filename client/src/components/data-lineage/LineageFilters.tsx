import * as React from 'react';
import { addDays, format, subDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Calendar as CalendarIcon, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Date range preset options
type DatePreset = '1d' | '7d' | '30d' | 'custom';

// Filter state interface
export interface LineageFiltersState {
  startDate?: Date;
  endDate?: Date;
  sources?: string[];
  users?: number[];
  fields?: string[];
}

// Component props
interface LineageFiltersProps {
  onChange: (filters: LineageFiltersState) => void;
  availableSources?: string[];
  availableUsers?: { id: number; name: string }[];
  availableFields?: string[];
  value?: LineageFiltersState;
}

export function LineageFilters({
  onChange,
  availableSources = [],
  availableUsers = [],
  availableFields = [],
  value
}: LineageFiltersProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [datePreset, setDatePreset] = React.useState<DatePreset>('30d');
  const [filters, setFilters] = React.useState<LineageFiltersState>(value || {
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });
  
  // Initialize with provided value when it changes
  React.useEffect(() => {
    if (value) {
      setFilters(value);
      
      // Determine date preset based on the value
      if (value.startDate && value.endDate) {
        const daysDiff = Math.round(
          (value.endDate.getTime() - value.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff === 0) {
          setDatePreset('1d');
        } else if (daysDiff === 6) {
          setDatePreset('7d');
        } else if (daysDiff === 29) {
          setDatePreset('30d');
        } else {
          setDatePreset('custom');
        }
      }
    }
  }, [value]);
  
  // Helper to format dates for display
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return format(date, 'MMM d, yyyy');
  };
  
  // Set a preset date range
  const setPresetDateRange = (preset: DatePreset) => {
    setDatePreset(preset);
    
    const endDate = new Date();
    let startDate: Date;
    
    switch (preset) {
      case '1d':
        startDate = endDate;
        break;
      case '7d':
        startDate = subDays(endDate, 6);
        break;
      case '30d':
        startDate = subDays(endDate, 29);
        break;
      case 'custom':
        // Don't change the dates for custom preset
        return;
    }
    
    setFilters(prev => ({
      ...prev,
      startDate,
      endDate
    }));
  };
  
  // Handle date range changes
  const handleDateRangeChange = (field: 'startDate' | 'endDate', date?: Date) => {
    setDatePreset('custom');
    setFilters(prev => ({
      ...prev,
      [field]: date
    }));
  };
  
  // Toggle a source filter
  const toggleSource = (source: string) => {
    setFilters(prev => {
      const sources = prev.sources || [];
      const newSources = sources.includes(source)
        ? sources.filter(s => s !== source)
        : [...sources, source];
      
      return {
        ...prev,
        sources: newSources.length > 0 ? newSources : undefined
      };
    });
  };
  
  // Toggle a user filter
  const toggleUser = (userId: number) => {
    setFilters(prev => {
      const users = prev.users || [];
      const newUsers = users.includes(userId)
        ? users.filter(id => id !== userId)
        : [...users, userId];
      
      return {
        ...prev,
        users: newUsers.length > 0 ? newUsers : undefined
      };
    });
  };
  
  // Toggle a field filter
  const toggleField = (field: string) => {
    setFilters(prev => {
      const fields = prev.fields || [];
      const newFields = fields.includes(field)
        ? fields.filter(f => f !== field)
        : [...fields, field];
      
      return {
        ...prev,
        fields: newFields.length > 0 ? newFields : undefined
      };
    });
  };
  
  // Apply the current filters
  const applyFilters = () => {
    onChange(filters);
    setIsOpen(false);
  };
  
  // Reset all filters
  const resetFilters = () => {
    const resetState: LineageFiltersState = {
      startDate: undefined,
      endDate: undefined,
      sources: undefined,
      users: undefined,
      fields: undefined
    };
    
    setFilters(resetState);
    onChange(resetState);
    setIsOpen(false);
  };
  
  // Count the number of active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.startDate || filters.endDate) count++;
    if (filters.sources && filters.sources.length > 0) count++;
    if (filters.users && filters.users.length > 0) count++;
    if (filters.fields && filters.fields.length > 0) count++;
    return count;
  }, [filters]);
  
  // Helper to check if a filter is active
  const isFilterActive = (type: 'date' | 'source' | 'user' | 'field') => {
    switch (type) {
      case 'date':
        return filters.startDate !== undefined || filters.endDate !== undefined;
      case 'source':
        return filters.sources !== undefined && filters.sources.length > 0;
      case 'user':
        return filters.users !== undefined && filters.users.length > 0;
      case 'field':
        return filters.fields !== undefined && filters.fields.length > 0;
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="flex justify-between w-full sm:w-auto"
            >
              <span className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Filter Data
              </span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full sm:w-[500px] p-0" align="start">
            <div className="grid gap-4 p-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Date Range</h4>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant={datePreset === '1d' ? 'default' : 'outline'} 
                    onClick={() => setPresetDateRange('1d')}
                  >
                    Today
                  </Button>
                  <Button 
                    size="sm" 
                    variant={datePreset === '7d' ? 'default' : 'outline'} 
                    onClick={() => setPresetDateRange('7d')}
                  >
                    Last 7 days
                  </Button>
                  <Button 
                    size="sm" 
                    variant={datePreset === '30d' ? 'default' : 'outline'} 
                    onClick={() => setPresetDateRange('30d')}
                  >
                    Last 30 days
                  </Button>
                  <Button 
                    size="sm" 
                    variant={datePreset === 'custom' ? 'default' : 'outline'} 
                    onClick={() => setPresetDateRange('custom')}
                  >
                    Custom
                  </Button>
                </div>
                
                {datePreset === 'custom' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <div className="grid gap-1">
                      <div className="text-xs">From</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className={cn(
                              "justify-start text-left font-normal w-full",
                              !filters.startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.startDate ? formatDate(filters.startDate) : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filters.startDate}
                            onSelect={(date) => handleDateRangeChange('startDate', date)}
                            initialFocus
                            disabled={(date) => 
                              filters.endDate ? date > filters.endDate : date > new Date()
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="grid gap-1">
                      <div className="text-xs">To</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className={cn(
                              "justify-start text-left font-normal w-full",
                              !filters.endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.endDate ? formatDate(filters.endDate) : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filters.endDate}
                            onSelect={(date) => handleDateRangeChange('endDate', date)}
                            initialFocus
                            disabled={(date) => 
                              filters.startDate ? date < filters.startDate : date > new Date()
                            }
                            fromDate={filters.startDate}
                            toDate={new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>
              
              {availableSources.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Data Source</h4>
                  <div className="flex flex-wrap gap-2">
                    {availableSources.map(source => (
                      <Badge
                        key={source}
                        variant={filters.sources?.includes(source) ? "default" : "outline"}
                        className="cursor-pointer hover:opacity-80"
                        onClick={() => toggleSource(source)}
                      >
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {availableUsers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">User</h4>
                  <div className="flex flex-wrap gap-2">
                    {availableUsers.map(user => (
                      <Badge
                        key={user.id}
                        variant={filters.users?.includes(user.id) ? "default" : "outline"}
                        className="cursor-pointer hover:opacity-80"
                        onClick={() => toggleUser(user.id)}
                      >
                        {user.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {availableFields.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Field</h4>
                  <div className="max-h-40 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {availableFields.map(field => (
                        <Badge
                          key={field}
                          variant={filters.fields?.includes(field) ? "default" : "outline"}
                          className="cursor-pointer hover:opacity-80"
                          onClick={() => toggleField(field)}
                        >
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={resetFilters}>
                  Reset
                </Button>
                <Button onClick={applyFilters}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <div className="flex flex-wrap gap-2">
          {isFilterActive('date') && (
            <Badge variant="secondary" className="flex items-center">
              <span className="mr-1">
                Date: {formatDate(filters.startDate)} - {formatDate(filters.endDate)}
              </span>
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setFilters(prev => ({ ...prev, startDate: undefined, endDate: undefined }));
                  onChange({ ...filters, startDate: undefined, endDate: undefined });
                }}
              />
            </Badge>
          )}
          
          {isFilterActive('source') && (
            <Badge variant="secondary" className="flex items-center">
              <span className="mr-1">
                Sources: {filters.sources?.length}
              </span>
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setFilters(prev => ({ ...prev, sources: undefined }));
                  onChange({ ...filters, sources: undefined });
                }}
              />
            </Badge>
          )}
          
          {isFilterActive('user') && (
            <Badge variant="secondary" className="flex items-center">
              <span className="mr-1">
                Users: {filters.users?.length}
              </span>
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setFilters(prev => ({ ...prev, users: undefined }));
                  onChange({ ...filters, users: undefined });
                }}
              />
            </Badge>
          )}
          
          {isFilterActive('field') && (
            <Badge variant="secondary" className="flex items-center">
              <span className="mr-1">
                Fields: {filters.fields?.length}
              </span>
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setFilters(prev => ({ ...prev, fields: undefined }));
                  onChange({ ...filters, fields: undefined });
                }}
              />
            </Badge>
          )}
          
          {activeFilterCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs" 
              onClick={resetFilters}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
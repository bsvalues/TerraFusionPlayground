import * as React from 'react';
import { addDays, startOfDay, endOfDay, format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MultiSelect, Option } from '@/components/multi-select';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';

// Date preset types
type DatePreset = '1d' | '7d' | '30d' | 'custom';

// Filters state interface
export interface LineageFiltersState {
  startDate?: Date;
  endDate?: Date;
  sources?: string[];
  users?: number[];
  fields?: string[];
}

// Props interface
interface LineageFiltersProps {
  onChange: (filters: LineageFiltersState) => void;
  availableSources?: string[];
  availableUsers?: { id: number; name: string }[];
  availableFields?: string[];
  value?: LineageFiltersState;
}

// Main component
export function LineageFilters({
  onChange,
  availableSources = [],
  availableUsers = [],
  availableFields = [],
  value = {}
}: LineageFiltersProps) {
  const [datePreset, setDatePreset] = React.useState<DatePreset>('7d');
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  
  // Setup form with react-hook-form
  const form = useForm<LineageFiltersState>({
    defaultValues: {
      startDate: value.startDate,
      endDate: value.endDate,
      sources: value.sources || [],
      users: value.users || [],
      fields: value.fields || []
    }
  });
  
  // Format date for display
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return format(date, 'MMM d, yyyy');
  };
  
  // Helper for setting date range based on preset
  const setPresetDateRange = (preset: DatePreset) => {
    setDatePreset(preset);
    
    if (preset === 'custom') {
      return;
    }
    
    const now = new Date();
    let startDate: Date;
    
    // Calculate start date based on preset
    switch (preset) {
      case '1d':
        startDate = startOfDay(now);
        break;
      case '7d':
        startDate = startOfDay(subDays(now, 6));
        break;
      case '30d':
        startDate = startOfDay(subDays(now, 29));
        break;
      default:
        startDate = startOfDay(subDays(now, 6));
    }
    
    // Set the form values
    form.setValue('startDate', startDate);
    form.setValue('endDate', endOfDay(now));
    
    // Trigger form submission
    form.handleSubmit(onSubmit)();
  };
  
  // Handle date range changes
  const handleDateRangeChange = (field: 'startDate' | 'endDate', date?: Date) => {
    setDatePreset('custom');
    form.setValue(field, date);
    
    // If both dates are set, submit the form
    if (form.getValues('startDate') && form.getValues('endDate')) {
      form.handleSubmit(onSubmit)();
    }
  };
  
  // Form submission handler
  const onSubmit = (data: LineageFiltersState) => {
    onChange(data);
  };
  
  // Reset all filters
  const resetFilters = () => {
    const resetState: LineageFiltersState = {};
    form.reset(resetState);
    setDatePreset('7d');
    onChange(resetState);
  };
  
  // Process sources into options for MultiSelect
  const sourceOptions = React.useMemo(() => {
    return availableSources.map(source => ({
      label: source.charAt(0).toUpperCase() + source.slice(1),
      value: source
    }));
  }, [availableSources]);
  
  // Process users into options for MultiSelect
  const userOptions = React.useMemo(() => {
    return availableUsers.map(user => ({
      label: user.name,
      value: user.id.toString()
    }));
  }, [availableUsers]);
  
  // Process fields into options for MultiSelect
  const fieldOptions = React.useMemo(() => {
    return availableFields.map(field => ({
      label: field,
      value: field
    }));
  }, [availableFields]);
  
  // Derived selected sources, users and fields
  const selectedSources = form.watch('sources') || [];
  const selectedUsers = form.watch('users') || [];
  const selectedFields = form.watch('fields') || [];
  
  // Handle source filter changes
  const handleSourceFilterChange = (selected: string[]) => {
    form.setValue('sources', selected);
    form.handleSubmit(onSubmit)();
  };
  
  // Handle user filter changes
  const handleUserFilterChange = (selected: string[]) => {
    form.setValue('users', selected.map(id => parseInt(id)));
    form.handleSubmit(onSubmit)();
  };
  
  // Handle field filter changes
  const handleFieldFilterChange = (selected: string[]) => {
    form.setValue('fields', selected);
    form.handleSubmit(onSubmit)();
  };
  
  // Initialize preset on mount and when value changes
  React.useEffect(() => {
    // Initialize with filter values if provided
    if (value.startDate && value.endDate) {
      form.setValue('startDate', value.startDate);
      form.setValue('endDate', value.endDate);
      
      const diffDays = Math.round((value.endDate.getTime() - value.startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        setDatePreset('1d');
      } else if (diffDays === 6) {
        setDatePreset('7d');
      } else if (diffDays === 29) {
        setDatePreset('30d');
      } else {
        setDatePreset('custom');
      }
    } else {
      // Default to 7-day range if no date filters provided
      setPresetDateRange('7d');
    }
    
    if (value.sources?.length) {
      form.setValue('sources', value.sources);
    }
    
    if (value.users?.length) {
      form.setValue('users', value.users);
    }
    
    if (value.fields?.length) {
      form.setValue('fields', value.fields);
    }
  }, []);
  
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="font-medium text-sm min-w-[100px]">Date Range:</div>
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  type="button"
                  size="sm"
                  variant={datePreset === '1d' ? 'default' : 'outline'}
                  onClick={() => setPresetDateRange('1d')}
                >
                  Today
                </Button>
                <Button 
                  type="button"
                  size="sm"
                  variant={datePreset === '7d' ? 'default' : 'outline'}
                  onClick={() => setPresetDateRange('7d')}
                >
                  Last 7 Days
                </Button>
                <Button 
                  type="button"
                  size="sm"
                  variant={datePreset === '30d' ? 'default' : 'outline'}
                  onClick={() => setPresetDateRange('30d')}
                >
                  Last 30 Days
                </Button>
                <Button 
                  type="button"
                  size="sm"
                  variant={datePreset === 'custom' ? 'default' : 'outline'}
                  onClick={() => setDatePreset('custom')}
                >
                  Custom Range
                </Button>
                
                {datePreset === 'custom' && (
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-range"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal",
                          !form.getValues('startDate') && !form.getValues('endDate') && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.getValues('startDate') && form.getValues('endDate') ? (
                          `${formatDate(form.getValues('startDate'))} - ${formatDate(form.getValues('endDate'))}`
                        ) : (
                          "Select date range"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3 border-b">
                        <div className="flex justify-between items-center space-x-2">
                          <div>
                            <p className="text-sm font-medium">Date Range</p>
                            <p className="text-xs text-muted-foreground">
                              Select start and end dates
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              form.setValue('startDate', undefined);
                              form.setValue('endDate', undefined);
                              form.handleSubmit(onSubmit)();
                              setCalendarOpen(false);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-3">
                        <div>
                          <FormLabel className="text-xs">Start Date</FormLabel>
                          <Calendar
                            mode="single"
                            selected={form.getValues('startDate')}
                            onSelect={(date) => handleDateRangeChange('startDate', date)}
                            disabled={(date) => date > new Date() || (form.getValues('endDate') ? date > form.getValues('endDate')! : false)}
                            initialFocus
                          />
                        </div>
                        <div>
                          <FormLabel className="text-xs">End Date</FormLabel>
                          <Calendar
                            mode="single"
                            selected={form.getValues('endDate')}
                            onSelect={(date) => handleDateRangeChange('endDate', date)}
                            disabled={(date) => date > new Date() || (form.getValues('startDate') ? date < form.getValues('startDate')! : false)}
                            initialFocus
                          />
                        </div>
                      </div>
                      <div className="p-3 border-t">
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            form.handleSubmit(onSubmit)();
                            setCalendarOpen(false);
                          }}
                        >
                          Apply Date Range
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Source Filter */}
              <div>
                <FormLabel className="text-sm">Data Source</FormLabel>
                <div className="mt-1">
                  <MultiSelect
                    options={sourceOptions}
                    selected={selectedSources}
                    onChange={handleSourceFilterChange}
                    placeholder="Select sources"
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* User Filter */}
              <div>
                <FormLabel className="text-sm">Modified By</FormLabel>
                <div className="mt-1">
                  <MultiSelect
                    options={userOptions}
                    selected={selectedUsers.map(id => id.toString())}
                    onChange={handleUserFilterChange}
                    placeholder="Select users"
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Field Filter */}
              <div>
                <FormLabel className="text-sm">Fields</FormLabel>
                <div className="mt-1">
                  <MultiSelect
                    options={fieldOptions}
                    selected={selectedFields}
                    onChange={handleFieldFilterChange}
                    placeholder="Select fields"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Active Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-sm min-w-[100px]">Active Filters:</div>
              
              <div className="flex flex-wrap gap-2">
                {/* Date Range Badge */}
                {form.getValues('startDate') && form.getValues('endDate') && (
                  <Badge variant="secondary" className="font-normal">
                    {datePreset === '1d' ? 'Today' : datePreset === '7d' ? 'Last 7 Days' : datePreset === '30d' ? 'Last 30 Days' : 
                      `${formatDate(form.getValues('startDate'))} - ${formatDate(form.getValues('endDate'))}`}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-4 w-4 rounded-full p-0"
                      onClick={() => {
                        form.setValue('startDate', undefined);
                        form.setValue('endDate', undefined);
                        form.handleSubmit(onSubmit)();
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                )}
                
                {/* Source Badges */}
                {selectedSources.map(source => (
                  <Badge key={source} variant="secondary" className="font-normal">
                    Source: {source.charAt(0).toUpperCase() + source.slice(1)}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-4 w-4 rounded-full p-0"
                      onClick={() => {
                        const updated = selectedSources.filter(s => s !== source);
                        form.setValue('sources', updated);
                        form.handleSubmit(onSubmit)();
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                ))}
                
                {/* User Badges */}
                {selectedUsers.map(userId => {
                  const user = availableUsers.find(u => u.id === userId);
                  return (
                    <Badge key={userId} variant="secondary" className="font-normal">
                      User: {user?.name || `ID: ${userId}`}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-1 h-4 w-4 rounded-full p-0"
                        onClick={() => {
                          const updated = selectedUsers.filter(u => u !== userId);
                          form.setValue('users', updated);
                          form.handleSubmit(onSubmit)();
                        }}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </Badge>
                  );
                })}
                
                {/* Field Badges */}
                {selectedFields.map(field => (
                  <Badge key={field} variant="secondary" className="font-normal">
                    Field: {field}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-4 w-4 rounded-full p-0"
                      onClick={() => {
                        const updated = selectedFields.filter(f => f !== field);
                        form.setValue('fields', updated);
                        form.handleSubmit(onSubmit)();
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                ))}
                
                {/* Reset Button (only show if there are active filters) */}
                {(selectedSources.length > 0 || selectedUsers.length > 0 || selectedFields.length > 0 || 
                  (form.getValues('startDate') && form.getValues('endDate'))) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={resetFilters}
                    className="text-muted-foreground"
                  >
                    Reset All
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
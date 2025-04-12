import * as React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, ArrowRight, FileText, User, Tag, Calendar, Info, Database } from 'lucide-react';
import { DataLineageRecord, getSourceLabel, formatLineageTimestamp } from '@/lib/dataLineageService';

// Interface for the diff viewer component
interface DiffViewerProps {
  oldValue: string;
  newValue: string;
}

// Component to show differences between values
function DiffViewer({ oldValue, newValue }: DiffViewerProps) {
  // Convert empty strings to a visible placeholder
  const displayOldValue = oldValue === '' ? '<empty>' : oldValue;
  const displayNewValue = newValue === '' ? '<empty>' : newValue;
  
  // Check if values are JSON
  const isOldJson = React.useMemo(() => {
    try {
      if (oldValue.trim().startsWith('{') || oldValue.trim().startsWith('[')) {
        JSON.parse(oldValue);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [oldValue]);
  
  const isNewJson = React.useMemo(() => {
    try {
      if (newValue.trim().startsWith('{') || newValue.trim().startsWith('[')) {
        JSON.parse(newValue);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [newValue]);
  
  // Format JSON for display
  const formattedOldValue = React.useMemo(() => {
    if (isOldJson) {
      try {
        return JSON.stringify(JSON.parse(oldValue), null, 2);
      } catch (e) {
        return displayOldValue;
      }
    }
    return displayOldValue;
  }, [oldValue, isOldJson, displayOldValue]);
  
  const formattedNewValue = React.useMemo(() => {
    if (isNewJson) {
      try {
        return JSON.stringify(JSON.parse(newValue), null, 2);
      } catch (e) {
        return displayNewValue;
      }
    }
    return displayNewValue;
  }, [newValue, isNewJson, displayNewValue]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="font-medium text-sm text-muted-foreground">Previous Value:</div>
        <div className={`p-3 rounded-md bg-muted/50 ${isOldJson ? 'font-mono text-sm whitespace-pre overflow-x-auto' : ''}`}>
          {formattedOldValue}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="font-medium text-sm text-muted-foreground">New Value:</div>
        <div className={`p-3 rounded-md bg-muted/50 ${isNewJson ? 'font-mono text-sm whitespace-pre overflow-x-auto' : ''}`}>
          {formattedNewValue}
        </div>
      </div>
    </div>
  );
}

// Interface for a single event in the timeline
interface LineageEventProps {
  record: DataLineageRecord;
  index: number;
  showDetails: (record: DataLineageRecord) => void;
}

// Component for a single timeline event
function LineageEvent({ record, index, showDetails }: LineageEventProps) {
  // Format the timestamp
  const formattedTime = formatLineageTimestamp(record.changeTimestamp);
  
  // Get the source label
  const sourceLabel = getSourceLabel(record.source);
  
  // Determine if the value is empty or has a short diff
  const isValueEmpty = !record.oldValue && !record.newValue;
  const isShortDiff = record.oldValue.length < 50 && record.newValue.length < 50;
  
  // Get initials for the avatar
  const userInitials = `U${record.userId}`;
  
  return (
    <div className="flex items-start gap-4 py-4 group">
      <div className="flex flex-col items-center">
        <Avatar className="h-8 w-8 border-2 border-border">
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
        <div className="w-0.5 h-full bg-border mt-2" />
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{sourceLabel}</Badge>
            <span className="text-sm font-medium">{record.fieldName}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {formattedTime}
          </div>
        </div>
        
        {isValueEmpty ? (
          <div className="text-sm text-muted-foreground italic">No value change recorded</div>
        ) : isShortDiff ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="py-1 px-2 rounded bg-muted/50">{record.oldValue || '<empty>'}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="py-1 px-2 rounded bg-muted/50">{record.newValue || '<empty>'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground truncate max-w-md">
              {record.oldValue.substring(0, 30)}
              {record.oldValue.length > 30 ? '...' : ''}
              {' → '}
              {record.newValue.substring(0, 30)}
              {record.newValue.length > 30 ? '...' : ''}
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => showDetails(record)}>
            <Info className="h-3 w-3 mr-1" />
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
}

// Interface for the details dialog
interface LineageDetailsDialogProps {
  record: DataLineageRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Component for the details dialog
function LineageDetailsDialog({ record, open, onOpenChange }: LineageDetailsDialogProps) {
  if (!record) return null;
  
  // Format timestamps
  const formattedChangeTime = formatLineageTimestamp(record.changeTimestamp);
  const formattedCreateTime = format(new Date(record.createdAt), 'MMM d, yyyy h:mm a');
  
  // Get source label
  const sourceLabel = getSourceLabel(record.source);
  
  // Get source details as string if available
  const sourceDetails = record.sourceDetails 
    ? (typeof record.sourceDetails === 'string' 
        ? record.sourceDetails 
        : JSON.stringify(record.sourceDetails, null, 2)) 
    : 'No details available';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Data Change Details</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-6 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Field Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center gap-2">
                    <div className="text-sm font-medium">Property ID</div>
                    <div className="text-sm">{record.propertyId}</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center gap-2">
                    <div className="text-sm font-medium">Field Name</div>
                    <div className="text-sm">{record.fieldName}</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    User & Source
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center gap-2">
                    <div className="text-sm font-medium">User ID</div>
                    <div className="text-sm">{record.userId}</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center gap-2">
                    <div className="text-sm font-medium">Source</div>
                    <Badge variant="outline">{sourceLabel}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Timestamps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center gap-2">
                  <div className="text-sm font-medium">Change Time</div>
                  <div className="text-sm">{formattedChangeTime}</div>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <div className="text-sm font-medium">Record Created</div>
                  <div className="text-sm">{formattedCreateTime}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Value Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DiffViewer
                  oldValue={record.oldValue}
                  newValue={record.newValue}
                />
              </CardContent>
            </Card>
            
            {record.sourceDetails && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    Source Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md overflow-x-auto">
                    {sourceDetails}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Interface for the main timeline component
interface LineageTimelineProps {
  records: DataLineageRecord[];
  title?: string;
}

// Main timeline component
export function LineageTimeline({ records, title = 'Data Change Timeline' }: LineageTimelineProps) {
  const [selectedRecord, setSelectedRecord] = React.useState<DataLineageRecord | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  
  // Handle showing details
  const showDetails = (record: DataLineageRecord) => {
    setSelectedRecord(record);
    setDialogOpen(true);
  };
  
  // Sort records by timestamp (newest first)
  const sortedRecords = React.useMemo(() => {
    return [...records].sort((a, b) => {
      return new Date(b.changeTimestamp).getTime() - new Date(a.changeTimestamp).getTime();
    });
  }, [records]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {records.length} change{records.length !== 1 ? 's' : ''} recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedRecords.length > 0 ? (
          <div className="space-y-0">
            {sortedRecords.map((record, index) => (
              <LineageEvent
                key={record.id}
                record={record}
                index={index}
                showDetails={showDetails}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No data changes have been recorded.
          </div>
        )}
      </CardContent>
      
      <LineageDetailsDialog
        record={selectedRecord}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}
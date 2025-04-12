import * as React from 'react';
import { format } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Activity, AlertCircle, Clock, Database, FileEdit, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataLineageRecord {
  id: number;
  propertyId: string;
  fieldName: string;
  source: string;
  oldValue: string;
  newValue: string;
  changeTimestamp: Date | string;
  userId: number;
  sourceDetails?: any;
}

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
}

function DiffViewer({ oldValue, newValue }: DiffViewerProps) {
  // Handle empty values
  const oldText = oldValue || '(empty)';
  const newText = newValue || '(empty)';
  
  // If values are the same, don't show diff
  if (oldText === newText) {
    return (
      <div className="text-sm">
        <p>No change detected in values.</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Previous Value</p>
        <div className="bg-muted/50 p-3 rounded-md text-sm">
          <pre className="whitespace-pre-wrap">{oldText}</pre>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">New Value</p>
        <div className="bg-muted/50 p-3 rounded-md text-sm">
          <pre className="whitespace-pre-wrap">{newText}</pre>
        </div>
      </div>
    </div>
  );
}

interface LineageEventProps {
  record: DataLineageRecord;
  index: number;
  showDetails: (record: DataLineageRecord) => void;
}

function LineageEvent({ record, index, showDetails }: LineageEventProps) {
  // Convert string timestamps to Date objects if needed
  const timestamp = record.changeTimestamp instanceof Date 
    ? record.changeTimestamp 
    : new Date(record.changeTimestamp);
  
  // Determine source icon
  const getSourceIcon = () => {
    switch(record.source.toLowerCase()) {
      case 'import':
        return <Database className="h-4 w-4" />;
      case 'api':
        return <Activity className="h-4 w-4" />;
      case 'manual':
        return <FileEdit className="h-4 w-4" />;
      case 'validated':
        return <AlertCircle className="h-4 w-4" />;
      case 'correction':
        return <FileText className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };
  
  // Get source badge variant
  const getSourceVariant = () => {
    switch(record.source.toLowerCase()) {
      case 'import':
        return 'default';
      case 'api':
        return 'secondary';
      case 'manual':
        return 'outline';
      case 'validated':
        return 'destructive';
      case 'correction':
        return 'warning';
      default:
        return 'secondary';
    }
  };
  
  return (
    <div className="relative pl-5 pb-8 last:pb-0">
      {/* Timeline connector */}
      {index < 20 && (
        <div className="absolute top-6 left-2 bottom-0 w-px bg-border"></div>
      )}
      
      {/* Timeline dot */}
      <div className={cn(
        "absolute top-1.5 left-0 h-4 w-4 rounded-full border-2 border-background",
        "bg-primary flex items-center justify-center"
      )}>
        <span className="h-1.5 w-1.5 rounded-full bg-background"></span>
      </div>
      
      {/* Content */}
      <Card className="mb-2">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Badge variant={getSourceVariant()} className="capitalize flex items-center gap-1">
                {getSourceIcon()}
                {record.source}
              </Badge>
              <Badge variant="outline" className="ml-1">
                {record.fieldName}
              </Badge>
            </div>
            <div className="flex items-center text-xs text-muted-foreground gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{format(timestamp, 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Previous</p>
                <div className="bg-muted/50 p-1.5 rounded-sm truncate max-h-12 overflow-hidden">
                  {record.oldValue || <span className="text-muted-foreground italic">(empty)</span>}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">New</p>
                <div className="bg-muted/50 p-1.5 rounded-sm truncate max-h-12 overflow-hidden">
                  {record.newValue || <span className="text-muted-foreground italic">(empty)</span>}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>User ID: {record.userId}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => showDetails(record)}
              >
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface LineageDetailsDialogProps {
  record: DataLineageRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LineageDetailsDialog({ record, open, onOpenChange }: LineageDetailsDialogProps) {
  if (!record) return null;
  
  // Convert string timestamps to Date objects if needed
  const timestamp = record.changeTimestamp instanceof Date 
    ? record.changeTimestamp 
    : new Date(record.changeTimestamp);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Data Change Details</DialogTitle>
          <DialogDescription>
            Detailed information about this data change event
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Field and Property Information */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Changed Field</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Field Name</p>
                  <p className="text-base">{record.fieldName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Property ID</p>
                  <p className="text-base font-mono">{record.propertyId}</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Change Values */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Change Details</h3>
              <DiffViewer oldValue={record.oldValue} newValue={record.newValue} />
            </div>
            
            <Separator />
            
            {/* Metadata */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Change Source</p>
                  <Badge variant="secondary" className="mt-1 capitalize">
                    {record.source}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User ID</p>
                  <p className="text-base">{record.userId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                  <p className="text-base">{format(timestamp, 'PPpp')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Record ID</p>
                  <p className="text-base font-mono">{record.id}</p>
                </div>
              </div>
            </div>
            
            {/* Source Details (if available) */}
            {record.sourceDetails && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Source Details</h3>
                  <div className="bg-muted/50 p-4 rounded-md">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(record.sourceDetails, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        
        <div className="pt-4 flex justify-end">
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface LineageTimelineProps {
  records: DataLineageRecord[];
  title?: string;
}

export function LineageTimeline({ records, title = 'Data Change Timeline' }: LineageTimelineProps) {
  const [detailRecord, setDetailRecord] = React.useState<DataLineageRecord | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  
  const showDetails = (record: DataLineageRecord) => {
    setDetailRecord(record);
    setDialogOpen(true);
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Showing {records.length} changes in chronological order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No data change records found.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or selecting a different date range.
              </p>
            </div>
          ) : (
            <div className="pt-2">
              {records.map((record, index) => (
                <LineageEvent 
                  key={record.id} 
                  record={record} 
                  index={index} 
                  showDetails={showDetails}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <LineageDetailsDialog 
        record={detailRecord}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
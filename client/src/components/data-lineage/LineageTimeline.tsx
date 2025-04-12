import * as React from 'react';
import { DataLineageRecord, formatLineageTimestamp, getSourceLabel } from '@/lib/dataLineageService';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Calendar, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Define color map for different sources
const sourceColorMap: Record<string, string> = {
  validated: 'bg-green-100 text-green-800 border-green-200',
  import: 'bg-blue-100 text-blue-800 border-blue-200',
  manual: 'bg-purple-100 text-purple-800 border-purple-200',
  api: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  calculated: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  correction: 'bg-red-100 text-red-800 border-red-200',
};

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
}

function DiffViewer({ oldValue, newValue }: DiffViewerProps) {
  return (
    <div className="grid grid-cols-2 gap-4 p-2 rounded-md bg-gray-50">
      <div className="text-sm">
        <div className="font-semibold text-xs text-gray-500 mb-1">Previous Value:</div>
        <div className="p-2 bg-white rounded border border-gray-200 whitespace-pre-wrap min-h-[40px]">
          {oldValue || <span className="text-gray-400 italic">Empty</span>}
        </div>
      </div>
      <div className="text-sm">
        <div className="font-semibold text-xs text-gray-500 mb-1">New Value:</div>
        <div className="p-2 bg-white rounded border border-gray-200 whitespace-pre-wrap min-h-[40px]">
          {newValue || <span className="text-gray-400 italic">Empty</span>}
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
  const sourceClass = sourceColorMap[record.source] || 'bg-gray-100 text-gray-800 border-gray-200';
  
  return (
    <div className="relative pl-8 pb-8">
      {/* Timeline connector line */}
      <div className="absolute top-0 left-3 bottom-0 w-px bg-gray-200" />
      
      {/* Event dot */}
      <div className={`absolute left-0 top-0 w-6 h-6 rounded-full ${sourceClass.split(' ')[0]} border-2 border-white flex items-center justify-center z-10`}>
        <span className="text-xs font-medium">{index + 1}</span>
      </div>
      
      {/* Event content */}
      <Card className="mb-2 hover:shadow-md transition-shadow cursor-pointer" onClick={() => showDetails(record)}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Field: <span className="font-semibold">{record.fieldName}</span>
            </CardTitle>
            <Badge variant="outline" className={`${sourceClass} text-xs`}>
              {getSourceLabel(record.source)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <DiffViewer oldValue={record.oldValue} newValue={record.newValue} />
          
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            <span>{formatLineageTimestamp(record.changeTimestamp)}</span>
            <span className="mx-2">•</span>
            <User className="h-3 w-3 mr-1" />
            <span>User #{record.userId}</span>
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
  
  const sourceClass = sourceColorMap[record.source] || 'bg-gray-100 text-gray-800 border-gray-200';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Data Change Details</DialogTitle>
          <DialogDescription>
            Complete information about this data change event
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className={`${sourceClass} text-xs`}>
              {getSourceLabel(record.source)}
            </Badge>
            <span className="text-sm">Change ID: {record.id}</span>
          </div>
          
          <div className="grid gap-3">
            <div>
              <h4 className="text-sm font-semibold mb-1">Property & Field</h4>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Property ID:</span> {record.propertyId}
                </div>
                <div>
                  <span className="text-gray-500">Field Name:</span> {record.fieldName}
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-semibold mb-1">Change Details</h4>
              <DiffViewer oldValue={record.oldValue} newValue={record.newValue} />
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-1">Timestamp</h4>
                <div className="flex items-center text-sm">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  {formatLineageTimestamp(record.changeTimestamp)}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-1">Changed By</h4>
                <div className="flex items-center text-sm">
                  <User className="h-3.5 w-3.5 mr-1" />
                  User ID: {record.userId}
                </div>
              </div>
            </div>
            
            {record.sourceDetails && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-1">Additional Details</h4>
                  <div className="text-sm bg-gray-50 p-3 rounded-md">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(record.sourceDetails, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
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
  const [selectedRecord, setSelectedRecord] = React.useState<DataLineageRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  
  // Show details for a lineage record
  const showDetails = (record: DataLineageRecord) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
  };
  
  // Sort records by timestamp (newest first)
  const sortedRecords = React.useMemo(() => {
    return [...records].sort((a, b) => {
      return new Date(b.changeTimestamp).getTime() - new Date(a.changeTimestamp).getTime();
    });
  }, [records]);
  
  if (sortedRecords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No data lineage records found.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pl-4">
            {sortedRecords.map((record, index) => (
              <LineageEvent 
                key={record.id} 
                record={record} 
                index={index}
                showDetails={showDetails}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      
      <LineageDetailsDialog 
        record={selectedRecord} 
        open={detailsOpen} 
        onOpenChange={setDetailsOpen} 
      />
    </div>
  );
}
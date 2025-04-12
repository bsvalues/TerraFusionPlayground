import React from 'react';
import { DataLineageRecord, formatLineageTimestamp, getSourceLabel } from '@/lib/dataLineageService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, ArrowRight, File, UserIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LineageTimelineProps {
  records: DataLineageRecord[];
  title?: string;
  showPropertyId?: boolean;
}

export function LineageTimeline({ records, title = 'Data Change History', showPropertyId = false }: LineageTimelineProps) {
  // Sort records by timestamp (newest first)
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.changeTimestamp).getTime() - new Date(a.changeTimestamp).getTime()
  );

  // Function to get the appropriate badge color based on source
  const getSourceBadgeColor = (source: string): string => {
    switch (source) {
      case 'validated':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'import':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'manual':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'api':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'calculated':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'correction':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Clock size={18} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No change history available.
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-muted/50"></div>
            {sortedRecords.map((record, index) => (
              <div key={record.id} className="relative pl-14 mb-8">
                <div className="absolute left-[22px] w-3 h-3 rounded-full bg-primary -mt-1"></div>
                <div className="flex flex-col space-y-2 pt-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <span className="text-sm text-muted-foreground">
                      {formatLineageTimestamp(record.changeTimestamp)}
                    </span>
                    <Badge variant="outline" className={`${getSourceBadgeColor(record.source)} ml-0 md:ml-2`}>
                      {getSourceLabel(record.source)}
                    </Badge>
                    {showPropertyId && (
                      <span className="text-sm font-medium">
                        Property: {record.propertyId}
                      </span>
                    )}
                  </div>
                  <div className="bg-muted/30 p-3 rounded-md">
                    <h4 className="font-medium mb-2">Field: {record.fieldName}</h4>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="px-3 py-1.5 bg-background rounded border text-sm">
                        {record.oldValue || "(empty)"}
                      </div>
                      <ArrowRight className="mx-1" />
                      <div className="px-3 py-1.5 bg-background rounded border text-sm">
                        {record.newValue || "(empty)"}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <UserIcon size={14} className="inline mr-1" /> 
                            User ID: {record.userId}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>User who made this change</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {record.sourceDetails && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <File size={14} className="inline mr-1" /> 
                              Details available
                            </TooltipTrigger>
                            <TooltipContent>
                              <pre className="text-xs max-w-[300px] whitespace-pre-wrap">
                                {JSON.stringify(record.sourceDetails, null, 2)}
                              </pre>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
                {index < sortedRecords.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
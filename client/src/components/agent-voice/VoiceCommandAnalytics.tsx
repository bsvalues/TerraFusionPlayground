/**
 * Voice Command Analytics
 * 
 * This component displays analytics data for voice commands, including:
 * - Usage statistics
 * - Success rates
 * - Command type distribution
 * - Top commands
 * - Error triggers
 */

import { useState, useEffect } from 'react';
import { getUserAnalytics } from '@/services/enhanced-voice-command-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3, PieChart, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';

interface VoiceCommandAnalyticsProps {
  userId: number;
  defaultRange?: 'day' | 'week' | 'month' | 'custom';
  className?: string;
}

export function VoiceCommandAnalytics({
  userId,
  defaultRange = 'week',
  className = ''
}: VoiceCommandAnalyticsProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>(() => {
    const end = new Date();
    const start = new Date();
    
    // Calculate start date based on default range
    if (defaultRange === 'day') {
      start.setDate(end.getDate() - 1);
    } else if (defaultRange === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (defaultRange === 'month') {
      start.setMonth(end.getMonth() - 1);
    } else {
      start.setDate(end.getDate() - 7); // Default to week
    }
    
    return { start, end };
  });
  
  // Load analytics data
  const loadAnalytics = async () => {
    setIsLoading(true);
    
    try {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');
      
      const data = await getUserAnalytics(userId, { start: startStr, end: endStr });
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load analytics when date range changes
  useEffect(() => {
    loadAnalytics();
  }, [dateRange, userId]);
  
  // Helper to format numbers
  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString();
  };
  
  // Calculate daily activity
  const prepareDailyActivityData = () => {
    if (!analyticsData?.dailyData) return [];
    
    return analyticsData.dailyData.map((day: any) => ({
      date: format(new Date(day.date), 'MMM d'),
      total: day.totalCommands,
      successful: day.successfulCommands,
      failed: day.failedCommands,
      ambiguous: day.ambiguousCommands
    }));
  };
  
  // Prepare command type distribution data
  const prepareCommandTypeData = () => {
    if (!analyticsData?.aggregatedData?.commandTypeCounts) return [];
    
    return Object.entries(analyticsData.aggregatedData.commandTypeCounts)
      .filter(([_, count]) => (count as number) > 0)
      .map(([type, count]) => ({
        name: type,
        value: count
      }));
  };
  
  // Prepare top commands data
  const prepareTopCommandsData = () => {
    if (!analyticsData?.aggregatedData?.topCommands) return [];
    
    return analyticsData.aggregatedData.topCommands
      .slice(0, 10)
      .map((cmd: any) => ({
        command: cmd.command.length > 20 ? `${cmd.command.slice(0, 20)}...` : cmd.command,
        count: cmd.count,
        fullCommand: cmd.command // For tooltip
      }));
  };
  
  // Prepare top error triggers data
  const prepareErrorTriggersData = () => {
    if (!analyticsData?.aggregatedData?.topErrorTriggers) return [];
    
    return analyticsData.aggregatedData.topErrorTriggers
      .slice(0, 10)
      .map((cmd: any) => ({
        command: cmd.command.length > 20 ? `${cmd.command.slice(0, 20)}...` : cmd.command,
        count: cmd.count,
        fullCommand: cmd.command // For tooltip
      }));
  };
  
  // Colors for charts
  const COLORS = ['#60a5fa', '#34d399', '#f97316', '#f43f5e', '#a855f7', '#ec4899'];
  
  // Render loading state
  const renderLoading = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin mr-2" />
      <p>Loading analytics data...</p>
    </div>
  );
  
  // Render overview tab
  const renderOverviewTab = () => {
    if (!analyticsData || !analyticsData.aggregatedData) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No analytics data available for the selected time period.</p>
        </div>
      );
    }
    
    const { aggregatedData } = analyticsData;
    
    return (
      <div className="space-y-6">
        {/* Key metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                Total Commands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(aggregatedData.totalCommands)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {aggregatedData.successRate !== undefined ? `${aggregatedData.successRate}%` : '-'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <XCircle className="h-5 w-5 mr-2 text-red-500" />
                Failed Commands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(aggregatedData.failedCommands)}</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Daily activity chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
            <CardDescription>Command usage by day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prepareDailyActivityData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="successful" name="Successful" fill="#34d399" />
                  <Bar dataKey="failed" name="Failed" fill="#f43f5e" />
                  <Bar dataKey="ambiguous" name="Ambiguous" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Command type distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Command Type Distribution</CardTitle>
            <CardDescription>Usage by command type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={prepareCommandTypeData()}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {prepareCommandTypeData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Commands']} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Render top commands tab
  const renderTopCommandsTab = () => {
    const topCommands = prepareTopCommandsData();
    
    if (!topCommands.length) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No command data available for the selected time period.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Commands</CardTitle>
            <CardDescription>Most frequently used commands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={topCommands}
                  margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                >
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="command" />
                  <Tooltip 
                    labelFormatter={(_label, data) => {
                      if (data && data[0]) {
                        return data[0].payload.fullCommand;
                      }
                      return '';
                    }}
                  />
                  <Bar dataKey="count" name="Usage Count" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Render errors tab
  const renderErrorsTab = () => {
    const errorTriggers = prepareErrorTriggersData();
    
    if (!errorTriggers.length) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No error data available for the selected time period.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Error Triggers</CardTitle>
            <CardDescription>Commands that most frequently caused errors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={errorTriggers}
                  margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                >
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="command" />
                  <Tooltip 
                    labelFormatter={(_label, data) => {
                      if (data && data[0]) {
                        return data[0].payload.fullCommand;
                      }
                      return '';
                    }}
                  />
                  <Bar dataKey="count" name="Error Count" fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Voice Command Analytics</span>
            <Button variant="outline" size="sm" onClick={loadAnalytics}>
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>Performance metrics for voice commands</span>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <div className="text-sm">
                  {format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Date range selector */}
          <div className="mb-6">
            <DatePickerWithRange 
              onChange={setDateRange} 
              value={{ 
                from: dateRange.start, 
                to: dateRange.end 
              }} 
            />
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="topCommands">Top Commands</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
            </TabsList>
            
            {isLoading ? (
              renderLoading()
            ) : (
              <>
                <TabsContent value="overview">
                  {renderOverviewTab()}
                </TabsContent>
                <TabsContent value="topCommands">
                  {renderTopCommandsTab()}
                </TabsContent>
                <TabsContent value="errors">
                  {renderErrorsTab()}
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
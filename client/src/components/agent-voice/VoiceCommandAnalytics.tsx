/**
 * Voice Command Analytics
 * 
 * This component displays analytics for voice commands, including:
 * - Usage over time
 * - Success rates
 * - Command type distribution
 * - Common errors
 */

import { useState, useEffect } from 'react';
import { 
  getVoiceCommandAnalytics, 
  getVoiceCommandStats,
  type VoiceCommandAnalyticsDetails, 
  type VoiceCommandAnalyticsSummary,
  type DailyVoiceCommandStats,
  type CommandTypeDistribution
} from '@/services/enhanced-voice-command-service';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  RefreshCw, 
  BarChart2, 
  PieChart as PieChartIcon,
  AlertTriangle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';

// Chart colors
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F'];
const SUCCESS_COLOR = '#4ade80';
const ERROR_COLOR = '#f87171';
const NEUTRAL_COLOR = '#94a3b8';

interface VoiceCommandAnalyticsProps {
  userId: number;
  className?: string;
}

export function VoiceCommandAnalytics({
  userId,
  className = ''
}: VoiceCommandAnalyticsProps) {
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  
  // Analytics data state
  const [analytics, setAnalytics] = useState<VoiceCommandAnalyticsDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { toast } = useToast();
  
  // Load analytics data
  const loadAnalytics = async () => {
    setIsLoading(true);
    
    try {
      const data = await getVoiceCommandAnalytics(userId, dateRange);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load analytics when date range changes
  useEffect(() => {
    loadAnalytics();
  }, [userId, dateRange]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d');
  };
  
  // Render loading state
  const renderLoading = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin mr-2" />
      <p>Loading analytics data...</p>
    </div>
  );
  
  // Render empty state
  const renderEmpty = () => (
    <div className="text-center py-8 text-muted-foreground">
      <p className="mb-4">No voice command usage data available for the selected period.</p>
      <Button onClick={loadAnalytics}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </div>
  );
  
  // Render overview cards
  const renderOverviewCards = () => {
    if (!analytics || !analytics.summary) return null;
    
    const { summary } = analytics;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Commands</CardTitle>
            <CardDescription>
              Voice commands issued
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalCommands}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Success Rate</CardTitle>
            <CardDescription>
              Percentage of successful commands
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(summary.successRate * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Avg. Response Time</CardTitle>
            <CardDescription>
              Average time to process commands
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.averageResponseTime.toFixed(2)}ms
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Render usage over time chart
  const renderUsageChart = () => {
    if (!analytics || !analytics.dailyStats || analytics.dailyStats.length === 0) return null;
    
    // Format data for the chart
    const data = analytics.dailyStats.map(stat => ({
      name: formatDate(stat.date),
      total: stat.commandCount,
      success: stat.successCount,
      error: stat.errorCount
    }));
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Voice Command Usage Over Time</CardTitle>
          <CardDescription>
            Number of commands issued per day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke={NEUTRAL_COLOR} 
                  strokeWidth={2} 
                  name="Total Commands" 
                />
                <Line 
                  type="monotone" 
                  dataKey="success" 
                  stroke={SUCCESS_COLOR} 
                  strokeWidth={2} 
                  name="Successful Commands" 
                />
                <Line 
                  type="monotone" 
                  dataKey="error" 
                  stroke={ERROR_COLOR} 
                  strokeWidth={2} 
                  name="Failed Commands" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Render command type distribution chart
  const renderCommandTypeChart = () => {
    if (!analytics || !analytics.commandTypeDistribution || analytics.commandTypeDistribution.length === 0) return null;
    
    // Format data for the chart
    const data = analytics.commandTypeDistribution.map((item, index) => ({
      name: item.commandType,
      value: item.count,
      percentage: item.percentage
    }));
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Command Type Distribution</CardTitle>
          <CardDescription>
            Types of voice commands used
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value} (${(props.payload.percentage * 100).toFixed(1)}%)`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Render common errors chart
  const renderErrorsChart = () => {
    if (!analytics || !analytics.commonErrors || analytics.commonErrors.length === 0) return null;
    
    // Format data for the chart
    const data = analytics.commonErrors.map(error => ({
      name: error.error.length > 30 ? error.error.substring(0, 30) + '...' : error.error,
      count: error.count,
      fullError: error.error
    }));
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Common Errors</CardTitle>
          <CardDescription>
            Most frequent voice command errors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border p-2 rounded shadow-md">
                        <p className="font-medium">{data.fullError}</p>
                        <p className="text-sm">{`Count: ${data.count}`}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Legend />
                <Bar dataKey="count" fill={ERROR_COLOR} name="Error Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Render most used commands table
  const renderMostUsedCommandsTable = () => {
    if (!analytics || !analytics.summary || !analytics.summary.mostUsedCommands || analytics.summary.mostUsedCommands.length === 0) return null;
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Most Used Commands</CardTitle>
          <CardDescription>
            Your most frequently used voice commands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Command</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.summary.mostUsedCommands.map((cmd, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{cmd.commandText}</TableCell>
                  <TableCell className="text-right">{cmd.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={className}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Voice Command Analytics</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadAnalytics}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Analytics and insights for your voice command usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <DatePickerWithRange 
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
          
          {isLoading ? (
            renderLoading()
          ) : !analytics || !analytics.dailyStats || analytics.dailyStats.length === 0 ? (
            renderEmpty()
          ) : (
            <>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="usage">Usage</TabsTrigger>
                  <TabsTrigger value="commands">Commands</TabsTrigger>
                  <TabsTrigger value="errors">Errors</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  {renderOverviewCards()}
                  {renderUsageChart()}
                  {renderCommandTypeChart()}
                </TabsContent>
                
                <TabsContent value="usage">
                  {renderUsageChart()}
                  {renderMostUsedCommandsTable()}
                </TabsContent>
                
                <TabsContent value="commands">
                  {renderCommandTypeChart()}
                  {renderMostUsedCommandsTable()}
                </TabsContent>
                
                <TabsContent value="errors">
                  {renderErrorsChart()}
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
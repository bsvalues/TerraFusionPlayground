import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { AIAgent } from "@/lib/types";
import { 
  Database, 
  Calculator, 
  MessageSquare, 
  ClipboardCheck, 
  Scale, 
  Upload, 
  MapPin, 
  BrainCircuit, 
  FileText, 
  PieChart, 
  Network, 
  Zap,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Settings,
  Plus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

// Get icon based on agent type
const getAgentIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'data':
      return <Database className="h-5 w-5 text-primary-500 mr-2" />;
    case 'property':
      return <Calculator className="h-5 w-5 text-primary-500 mr-2" />;
    case 'citizen':
      return <MessageSquare className="h-5 w-5 text-primary-500 mr-2" />;
    case 'quality':
      return <ClipboardCheck className="h-5 w-5 text-primary-500 mr-2" />;
    case 'legal':
      return <Scale className="h-5 w-5 text-primary-500 mr-2" />;
    case 'integration':
      return <Upload className="h-5 w-5 text-primary-500 mr-2" />;
    case 'gis':
      return <MapPin className="h-5 w-5 text-primary-500 mr-2" />;
    case 'ai':
      return <BrainCircuit className="h-5 w-5 text-primary-500 mr-2" />;
    case 'report':
      return <FileText className="h-5 w-5 text-primary-500 mr-2" />;
    case 'analytics':
      return <PieChart className="h-5 w-5 text-primary-500 mr-2" />;
    case 'workflow':
      return <Network className="h-5 w-5 text-primary-500 mr-2" />;
    default:
      return <Database className="h-5 w-5 text-primary-500 mr-2" />;
  }
};

// Get status badge based on agent status
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Active
        </Badge>
      );
    case 'syncing':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
          <RefreshCcw className="h-3 w-3 animate-spin" /> Syncing
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Error
        </Badge>
      );
    case 'learning':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
          <BrainCircuit className="h-3 w-3" /> Learning
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1">
          <RotateCcw className="h-3 w-3" /> Inactive
        </Badge>
      );
  }
};

// Format time since last activity
const formatTimeSince = (timestamp: string) => {
  const now = new Date();
  const lastActivity = new Date(timestamp);
  const diffMinutes = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const AIAgentOverview = () => {
  const { data: agents = [], isLoading } = useQuery<AIAgent[]>({
    queryKey: ['/api/ai-agents'],
  });
  
  const [showAll, setShowAll] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'active' | 'all'>('active');
  
  // Filter agents based on selected tab
  const displayedAgents = agents.filter(agent => {
    if (selectedTab === 'active') {
      return agent.status === 'active' || agent.status === 'syncing' || agent.status === 'learning';
    }
    return true;
  });
  
  // Calculate agent stats
  const totalAgents = agents.length;
  const activeAgents = agents.filter(agent => agent.status === 'active').length;
  const learningAgents = agents.filter(agent => agent.status === 'learning').length;
  const errorAgents = agents.filter(agent => agent.status === 'error').length;

  return (
    <Card className="lg:col-span-2 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">AI Agents</CardTitle>
            <CardDescription>Monitor and manage system agents</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add Agent
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Button>
          </div>
        </div>
        
        <div className="flex items-center mt-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button
              className={`pb-3 px-1 text-sm font-medium ${selectedTab === 'active' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('active')}
            >
              Active Agents
            </button>
            <button
              className={`pb-3 px-1 text-sm font-medium ${selectedTab === 'all' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('all')}
            >
              All Agents
            </button>
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> 
              <span className="text-xs font-medium">{activeAgents} Active</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50">
              <BrainCircuit className="h-3.5 w-3.5 text-blue-500" /> 
              <span className="text-xs font-medium">{learningAgents} Learning</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> 
              <span className="text-xs font-medium">{errorAgents} Error</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="py-3 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                Array(4).fill(0).map((_, index) => (
                  <tr key={`loading-${index}`}>
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center">
                        <Skeleton className="h-8 w-8 rounded-md mr-3" />
                        <div>
                          <Skeleton className="h-4 w-32 rounded mb-1" />
                          <Skeleton className="h-3 w-24 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </td>
                    <td className="px-3 py-3">
                      <Skeleton className="h-4 w-24 rounded" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center">
                        <Skeleton className="w-24 h-2.5 mr-2 rounded-full" />
                        <Skeleton className="h-4 w-8 rounded" />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Skeleton className="h-8 w-20 rounded" />
                    </td>
                  </tr>
                ))
              ) : displayedAgents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      {selectedTab === 'active' ? (
                        <>
                          <RotateCcw className="h-8 w-8 text-gray-400" />
                          <p>No active agents found</p>
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => setSelectedTab('all')}
                          >
                            View all agents
                          </Button>
                        </>
                      ) : (
                        <>
                          <BrainCircuit className="h-8 w-8 text-gray-400" />
                          <p>No agents found</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Agent
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedAgents.map((agent) => (
                  <tr key={agent.agentId || agent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center">
                        <div className="h-9 w-9 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 mr-3">
                          {getAgentIcon(agent.type)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{agent.name}</div>
                          <div className="text-xs text-gray-500">{agent.type} • ID: {agent.agentId || agent.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getStatusBadge(agent.status)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatTimeSince(agent.lastActivity)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                          <div 
                            className={`${
                              agent.status === 'syncing' ? 'bg-yellow-500' : 
                              agent.status === 'error' ? 'bg-red-500' :
                              agent.status === 'learning' ? 'bg-blue-500' :
                              'bg-green-500'
                            } h-2.5 rounded-full`} 
                            style={{ width: `${agent.performance}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{agent.performance}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right text-sm">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-600">
                        <Zap className="h-4 w-4 mr-1" /> Run
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-center">
          <Button variant="link" size="sm" onClick={() => setSelectedTab(selectedTab === 'active' ? 'all' : 'active')}>
            {selectedTab === 'active' ? 'Show all agents' : 'Show active agents only'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIAgentOverview;

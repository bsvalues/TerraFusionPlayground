import { useState } from 'react';
import PageHeader from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import KPICard from '@/components/dashboard/kpi-card';
import GISMap from '@/components/dashboard/gis-map';
import PropertyList from '@/components/dashboard/property-list';
import AIAgentOverview from '@/components/dashboard/ai-agent-overview';
import SystemActivityFeed from '@/components/dashboard/system-activity';
import { ProductivityTrackerWidget } from '@/components/developer-productivity';
import { Link } from 'wouter';
import { Home, TrendingUp, FileText, CheckSquare, Database, Code2, Laptop, Share2, Settings, ArrowRightCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DashboardKPI } from '@/lib/types';

const Dashboard = () => {
  // In a real app, this would fetch from an API
  const { data: kpiData, isLoading } = useQuery<DashboardKPI>({
    queryKey: ['/api/dashboard/kpi'],
    // Enable this when the API is available
    enabled: false,
  });
  
  // Default KPI data for demo
  const defaultKPI: DashboardKPI = {
    propertiesProcessed: 14325,
    valueIncrease: '+8.2%',
    protestsSubmitted: 482,
    complianceScore: '97%'
  };
  
  const kpi = kpiData || defaultKPI;

  // Page header actions
  const headerActions = (
    <>
      <Button variant="outline">
        Generate Report
      </Button>
      <Button>
        New Property
      </Button>
      <Button variant="link" asChild>
        <a href="/property-stories">Test Property Stories Link</a>
      </Button>
    </>
  );

  return (
    <>
      <PageHeader 
        title="TerraFusion Platform" 
        subtitle="Enterprise"
        actions={headerActions}
      />
      
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        <h2 className="text-lg font-medium text-primary-blue-dark tf-font-heading">Dashboard Overview</h2>
        
        {/* KPI Cards Row */}
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard 
            title="Properties Processed" 
            value={kpi.propertiesProcessed.toLocaleString()}
            icon={<Home className="h-6 w-6" />}
            actionLabel="View all"
            actionUrl="/properties"
          />
          
          <KPICard 
            title="Value Increase (YoY)" 
            value={kpi.valueIncrease}
            icon={<TrendingUp className="h-6 w-6" />}
            actionLabel="View details"
            actionUrl="/valuation"
            valueColor="text-green-600"
          />
          
          <KPICard 
            title="Protests Submitted" 
            value={kpi.protestsSubmitted}
            icon={<FileText className="h-6 w-6" />}
            actionLabel="View protests"
            actionUrl="/protests"
          />
          
          <KPICard 
            title="Compliance Score" 
            value={kpi.complianceScore}
            icon={<CheckSquare className="h-6 w-6" />}
            actionLabel="View audit logs"
            actionUrl="/audit-logs"
          />
        </div>
        
        {/* GIS Map & Property Listing */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <GISMap />
          <PropertyList />
        </div>
        
        {/* AI Agents Overview & System Activity */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <AIAgentOverview />
          <SystemActivityFeed />
          <ProductivityTrackerWidget />
        </div>

        {/* TerraFusion Developer Tools Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-primary-blue-dark tf-font-heading">TerraFusion Developer Tools</h2>
            <Button variant="outline" size="sm" asChild className="border-primary-teal text-primary-teal hover:bg-primary-teal-light/10">
              <Link href="/development">
                View All Tools <ArrowRightCircle className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Development Platform Card */}
            <Card className="hover:border-primary-blue/50 hover:shadow-md transition-all duration-300 border border-primary-blue-light/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="rounded-full bg-primary-teal/10 p-2">
                    <Code2 className="h-5 w-5 text-primary-teal"/>
                  </div>
                </div>
                <CardTitle className="mt-2 tf-font-heading text-primary-blue-dark">Development Platform</CardTitle>
                <CardDescription className="tf-font-body text-primary-blue">
                  Build custom assessment applications with AI-powered tools
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <ul className="space-y-1 text-sm text-primary-blue-dark/70">
                  <li className="flex items-center">
                    <span className="mr-2 text-primary-teal">•</span> AI-assisted coding environment
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2 text-primary-teal">•</span> Component library & templates
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2 text-primary-teal">•</span> Collaborative development
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-primary-blue-dark hover:bg-primary-blue text-white" asChild>
                  <Link href="/development">
                    Open Development Platform
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Database Conversion Card */}
            <Card className="hover:border-primary-blue/50 hover:shadow-md transition-all duration-300 border border-primary-blue-light/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="rounded-full bg-primary-teal/10 p-2">
                    <Database className="h-5 w-5 text-primary-teal"/>
                  </div>
                </div>
                <CardTitle className="mt-2 tf-font-heading text-primary-blue-dark">Database Conversion</CardTitle>
                <CardDescription className="tf-font-body text-primary-blue">
                  Convert and migrate your existing database to TerraFusion platform
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <ul className="space-y-1 text-sm text-primary-blue-dark/70">
                  <li className="flex items-center">
                    <span className="mr-2 text-primary-teal">•</span> AI-powered schema analysis
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2 text-primary-teal">•</span> Secure data transformation
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2 text-primary-teal">•</span> Multiple database support
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-primary-blue-dark hover:bg-primary-blue text-white" asChild>
                  <Link href="/database-conversion">
                    Open Database Conversion
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Assessment Workbench Card */}
            <Card className="hover:border-primary-blue/50 hover:shadow-md transition-all duration-300 border border-primary-blue-light/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="rounded-full bg-primary-teal/10 p-2">
                    <Laptop className="h-5 w-5 text-primary-teal"/>
                  </div>
                </div>
                <CardTitle className="mt-2 tf-font-heading text-primary-blue-dark">Assessment Workbench</CardTitle>
                <CardDescription className="tf-font-body text-primary-blue">
                  Design and test assessment models with AI assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <ul className="space-y-1 text-sm text-primary-blue-dark/70">
                  <li className="flex items-center">
                    <span className="mr-2 text-primary-teal">•</span> Model builder interface
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2 text-primary-teal">•</span> Validation & testing tools
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2 text-primary-teal">•</span> Performance analysis
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-primary-blue-dark hover:bg-primary-blue text-white" asChild>
                  <Link href="/development/assessment-workbench">
                    Open Assessment Workbench
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;

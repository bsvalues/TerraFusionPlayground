import { ReactNode } from 'react';
import { Link } from 'wouter';
import { Separator } from '@/components/ui/separator';
import TopNavigation from '@/components/ui/top-navigation';
import AIAssistantSidebar from '@/components/ai-assistant/AIAssistantSidebar';
import { Button } from '@/components/ui/button';
import { 
  LayoutGrid, 
  Code, 
  Play, 
  Database, 
  Settings, 
  FileCode, 
  Folder,
  Plus
} from 'lucide-react';

interface DevelopmentWorkspaceLayoutProps {
  children: ReactNode;
  projectId?: string;
}

const DevelopmentWorkspaceLayout = ({ children, projectId }: DevelopmentWorkspaceLayoutProps) => {
  const hasProject = !!projectId;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Top Navigation Bar */}
      <TopNavigation />

      {/* Development Platform Header */}
      <div className="flex items-center justify-between px-6 py-2 bg-gray-50 border-b">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-primary">TaxI_AI Development Platform</h1>
          {hasProject && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-lg font-medium text-gray-700">Project: {projectId}</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasProject ? (
            <>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center space-x-1"
              >
                <Play className="h-4 w-4" />
                <span>Preview</span>
              </Button>
              <Button 
                variant="default" 
                size="sm"
                className="flex items-center space-x-1"
              >
                <FileCode className="h-4 w-4" />
                <span>Deploy</span>
              </Button>
            </>
          ) : (
            <Button 
              variant="default" 
              size="sm"
              className="flex items-center space-x-1"
              asChild
            >
              <Link href="/development/projects/new">
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Workspace Container */}
      <div className="flex flex-1 overflow-hidden">
        {hasProject && (
          <aside className="w-48 border-r overflow-y-auto bg-gray-50 p-2">
            <nav className="space-y-6">
              <div className="space-y-1">
                <Link href={`/development/projects/${projectId}/files`}>
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer text-sm font-medium">
                    <Folder className="h-4 w-4" />
                    <span>Files</span>
                  </div>
                </Link>
                <Link href={`/development/projects/${projectId}/database`}>
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer text-sm font-medium">
                    <Database className="h-4 w-4" />
                    <span>Database</span>
                  </div>
                </Link>
                <Link href={`/development/projects/${projectId}/components`}>
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer text-sm font-medium">
                    <LayoutGrid className="h-4 w-4" />
                    <span>Components</span>
                  </div>
                </Link>
                <Link href={`/development/projects/${projectId}/ai`}>
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer text-sm font-medium">
                    <Code className="h-4 w-4" />
                    <span>AI Assistant</span>
                  </div>
                </Link>
                <Link href={`/development/projects/${projectId}/settings`}>
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer text-sm font-medium">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </div>
                </Link>
              </div>
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-4">
            {children}
          </div>
        </main>
        
        {/* AI Assistant Sidebar */}
        <AIAssistantSidebar />
      </div>
    </div>
  );
};

export default DevelopmentWorkspaceLayout;
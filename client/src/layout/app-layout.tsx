import { ReactNode } from 'react';
import TopNavigation from '@/components/ui/top-navigation';
import AIAssistantSidebar from '@/components/ai-assistant/AIAssistantSidebar';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Top Navigation Bar */}
      <TopNavigation />

      {/* Page Content */}
      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        {children}
      </main>
      
      {/* AI Assistant Sidebar */}
      <AIAssistantSidebar />
    </div>
  );
};

export default AppLayout;

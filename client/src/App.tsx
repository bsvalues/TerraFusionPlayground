import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ExtensionProvider } from "@/providers/extension-provider";
import { AIAssistantProvider } from "./providers/ai-assistant-provider";
import { ConnectionNotification } from "@/components/connection-notification";
import { ConnectionStatusMonitor } from "@/components/connection-status-monitor";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LandRecords from "@/pages/land-records";
import Improvements from "@/pages/improvements";
import Fields from "@/pages/fields";
import Imports from "@/pages/imports";
import NaturalLanguage from "@/pages/natural-language";
import AIAssistantPage from "@/pages/AIAssistantPage";
import { PropertyStoryDemo } from "@/pages/PropertyStoryDemo";
import PropertyStoryPage from "@/pages/PropertyStoryPage";
import DataImportPage from "@/pages/DataImportPage";
import AgentSystemPage from "@/pages/AgentSystemPage";
import VoiceSearchDemoPage from "@/pages/VoiceSearchDemoPage";
import PropertyLineagePage from "@/pages/PropertyLineagePage";
import { DataLineageDashboardPage } from "@/pages/DataLineageDashboardPage";
import { ExtensionsPage } from "@/pages/ExtensionsPage";
import CollaborationTestPage from "@/pages/collaboration-test";
import TeamAgentsPage from "@/pages/TeamAgentsPage";
import MasterDevelopmentPage from "@/pages/MasterDevelopmentPage";
import DevelopmentPlatformPage from "@/pages/DevelopmentPlatformPage";
import ProjectWorkspacePage from "@/pages/ProjectWorkspacePage";
import AssessmentModelWorkbenchPage from "@/pages/AssessmentModelWorkbenchPage";
import VoiceCommandPage from "@/pages/VoiceCommandPage";
import VoiceCommandSettingsPage from "@/pages/voice-command-settings-page";
import DatabaseConversionPage from "@/pages/database-conversion-page";
import ExampleDashboard from "@/pages/example-dashboard";
import WebSocketTest from "@/pages/websocket-test";
// Import the modularized GIS components
import { GISHub as GISHubPage, Terrain3DDemo as Terrain3DDemoPage, GISProvider } from "@/modules/gis";
// Original page imports until we migrate them all to the GIS module
import ClusteringDemoPage from "@/pages/clustering-demo";
import AdvancedClusteringDemoPage from "@/pages/advanced-clustering-demo";
import AppLayout from "@/layout/app-layout";
// TerraFusion design system
import TerraFusionShowcase from "@/components/design-system/TerraFusionShowcase";


function Router() {
  return (
    <Switch>
      <Route path="/">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>

      <Route path="/land-records">
        <AppLayout>
          <LandRecords />
        </AppLayout>
      </Route>

      <Route path="/improvements">
        <AppLayout>
          <Improvements />
        </AppLayout>
      </Route>

      <Route path="/fields">
        <AppLayout>
          <Fields />
        </AppLayout>
      </Route>

      <Route path="/imports">
        <AppLayout>
          <Imports />
        </AppLayout>
      </Route>

      <Route path="/natural-language">
        <AppLayout>
          <NaturalLanguage />
        </AppLayout>
      </Route>

      <Route path="/ai-assistant">
        <AppLayout>
          <AIAssistantPage />
        </AppLayout>
      </Route>

      <Route path="/property-story-demo">
        <AppLayout>
          <PropertyStoryDemo />
        </AppLayout>
      </Route>

      <Route path="/data-import">
        <AppLayout>
          <DataImportPage />
        </AppLayout>
      </Route>

      <Route path="/property-stories">
        <AppLayout>
          <PropertyStoryPage />
        </AppLayout>
      </Route>

      <Route path="/agent-system">
        <AppLayout>
          <AgentSystemPage />
        </AppLayout>
      </Route>

      <Route path="/voice-search">
        <AppLayout>
          <VoiceSearchDemoPage />
        </AppLayout>
      </Route>

      <Route path="/data-lineage">
        <AppLayout>
          <DataLineageDashboardPage />
        </AppLayout>
      </Route>

      <Route path="/property/:propertyId/lineage">
        <AppLayout>
          <PropertyLineagePage />
        </AppLayout>
      </Route>

      <Route path="/extensions">
        <AppLayout>
          <ExtensionsPage />
        </AppLayout>
      </Route>

      <Route path="/collaboration-test">
        <AppLayout>
          <CollaborationTestPage />
        </AppLayout>
      </Route>

      <Route path="/team-agents">
        <AppLayout>
          <TeamAgentsPage />
        </AppLayout>
      </Route>

      <Route path="/master-development">
        <AppLayout>
          <MasterDevelopmentPage />
        </AppLayout>
      </Route>

      <Route path="/voice-command">
        <AppLayout>
          <VoiceCommandPage />
        </AppLayout>
      </Route>
      
      <Route path="/voice-command-settings">
        <AppLayout>
          <VoiceCommandSettingsPage />
        </AppLayout>
      </Route>

      {/* TaxI_AI Development Platform Routes */}
      <Route path="/development">
        <DevelopmentPlatformPage />
      </Route>
      
      <Route path="/development/projects/:projectId">
        <ProjectWorkspacePage />
      </Route>
      
      <Route path="/development/assessment-workbench">
        <AssessmentModelWorkbenchPage />
      </Route>
      
      <Route path="/database-conversion">
        <AppLayout>
          <DatabaseConversionPage />
        </AppLayout>
      </Route>
      
      {/* GIS Routes */}
      <Route path="/gis">
        <AppLayout>
          <GISHubPage />
        </AppLayout>
      </Route>
      
      <Route path="/gis/clustering-demo">
        <AppLayout>
          <ClusteringDemoPage />
        </AppLayout>
      </Route>
      
      <Route path="/gis/advanced-clustering">
        <AppLayout>
          <AdvancedClusteringDemoPage />
        </AppLayout>
      </Route>
      
      <Route path="/gis/terrain-3d">
        <AppLayout>
          <Terrain3DDemoPage />
        </AppLayout>
      </Route>

      {/* TerraFusion UI Components Demo */}
      <Route path="/example-dashboard">
        <AppLayout>
          <ExampleDashboard />
        </AppLayout>
      </Route>

      {/* WebSocket Test Page */}
      <Route path="/websocket-test">
        <AppLayout>
          <WebSocketTest />
        </AppLayout>
      </Route>

      {/* TerraFusion Design System Showcase */}
      <Route path="/terrafusion-showcase">
        <AppLayout>
          <TerraFusionShowcase />
        </AppLayout>
      </Route>

      {/* Add more routes as needed */}

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ExtensionProvider>
        <AIAssistantProvider>
          <GISProvider>
            <Router />
            <ConnectionNotification />
            <Toaster />
            <ConnectionStatusMonitor /> {/* Added ConnectionStatusMonitor */}
          </GISProvider>
        </AIAssistantProvider>
      </ExtensionProvider>
    </QueryClientProvider>
  );
}

export default App;
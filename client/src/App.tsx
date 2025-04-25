import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ExtensionProvider } from "@/providers/extension-provider";
import { AIAssistantProvider } from "./providers/ai-assistant-provider";
import { ConnectionNotification } from "@/components/connection-notification";
import { ConnectionStatusMonitor } from "@/components/connection-status-monitor";
import NotFound from "@/pages/not-found";
import OldDashboard from "@/pages/dashboard";
import NewDashboard from "@/pages/new-dashboard";
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
// TerraFusion design system
import TerraFusionShowcase from "@/components/design-system/TerraFusionShowcase";

// Import old and new layouts
import AppLayout from "@/layout/app-layout";
import NewAppLayout from "@/layout/new-app-layout";

// Toggle to use the new layout (for simple A/B testing or switching back if needed)
const USE_NEW_LAYOUT = true;

// Dynamic layout selection
const Layout = USE_NEW_LAYOUT ? NewAppLayout : AppLayout;

function Router() {
  return (
    <Switch>
      {/* Standard application routes with consistent layout */}
      <Route path="/">
        <Layout>
          <NewDashboard />
        </Layout>
      </Route>

      {/* Keep the old dashboard available for comparison */}
      <Route path="/old-dashboard">
        <Layout>
          <OldDashboard />
        </Layout>
      </Route>

      <Route path="/land-records">
        <Layout>
          <LandRecords />
        </Layout>
      </Route>

      <Route path="/improvements">
        <Layout>
          <Improvements />
        </Layout>
      </Route>

      <Route path="/fields">
        <Layout>
          <Fields />
        </Layout>
      </Route>

      <Route path="/imports">
        <Layout>
          <Imports />
        </Layout>
      </Route>

      <Route path="/natural-language">
        <Layout>
          <NaturalLanguage />
        </Layout>
      </Route>

      <Route path="/ai-assistant">
        <Layout>
          <AIAssistantPage />
        </Layout>
      </Route>

      <Route path="/property-story-demo">
        <Layout>
          <PropertyStoryDemo />
        </Layout>
      </Route>

      <Route path="/data-import">
        <Layout>
          <DataImportPage />
        </Layout>
      </Route>

      <Route path="/property-stories">
        <Layout>
          <PropertyStoryPage />
        </Layout>
      </Route>

      <Route path="/agent-system">
        <Layout>
          <AgentSystemPage />
        </Layout>
      </Route>

      <Route path="/voice-search">
        <Layout>
          <VoiceSearchDemoPage />
        </Layout>
      </Route>

      <Route path="/data-lineage">
        <Layout>
          <DataLineageDashboardPage />
        </Layout>
      </Route>

      <Route path="/property/:propertyId/lineage">
        <Layout>
          <PropertyLineagePage />
        </Layout>
      </Route>

      <Route path="/extensions">
        <Layout>
          <ExtensionsPage />
        </Layout>
      </Route>

      <Route path="/collaboration-test">
        <Layout>
          <CollaborationTestPage />
        </Layout>
      </Route>

      <Route path="/team-agents">
        <Layout>
          <TeamAgentsPage />
        </Layout>
      </Route>

      <Route path="/master-development">
        <Layout>
          <MasterDevelopmentPage />
        </Layout>
      </Route>

      <Route path="/voice-command">
        <Layout>
          <VoiceCommandPage />
        </Layout>
      </Route>
      
      <Route path="/voice-command-settings">
        <Layout>
          <VoiceCommandSettingsPage />
        </Layout>
      </Route>

      <Route path="/database-conversion">
        <Layout>
          <DatabaseConversionPage />
        </Layout>
      </Route>
      
      {/* GIS Routes */}
      <Route path="/gis">
        <Layout>
          <GISHubPage />
        </Layout>
      </Route>
      
      <Route path="/gis/clustering-demo">
        <Layout>
          <ClusteringDemoPage />
        </Layout>
      </Route>
      
      <Route path="/gis/advanced-clustering">
        <Layout>
          <AdvancedClusteringDemoPage />
        </Layout>
      </Route>
      
      <Route path="/gis/terrain-3d">
        <Layout>
          <Terrain3DDemoPage />
        </Layout>
      </Route>

      {/* TerraFusion UI Components Demo */}
      <Route path="/example-dashboard">
        <Layout>
          <ExampleDashboard />
        </Layout>
      </Route>

      {/* WebSocket Test Page */}
      <Route path="/websocket-test">
        <Layout>
          <WebSocketTest />
        </Layout>
      </Route>

      {/* TerraFusion Design System Showcase */}
      <Route path="/terrafusion-showcase">
        <Layout>
          <TerraFusionShowcase />
        </Layout>
      </Route>
      
      {/* Development Platform Routes - These use a different layout */}
      <Route path="/development">
        <DevelopmentPlatformPage />
      </Route>
      
      <Route path="/development/projects/:projectId">
        <ProjectWorkspacePage />
      </Route>
      
      <Route path="/development/assessment-workbench">
        <AssessmentModelWorkbenchPage />
      </Route>

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
            <ConnectionStatusMonitor />
          </GISProvider>
        </AIAssistantProvider>
      </ExtensionProvider>
    </QueryClientProvider>
  );
}

export default App;
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ExtensionProvider } from "@/providers/extension-provider";
import { AIAssistantProvider } from "./providers/ai-assistant-provider";
import { ConnectionNotification } from "@/components/connection-notification";
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
import AppLayout from "@/layout/app-layout";
import { ConnectionStatusMonitor } from './components/connection-status-monitor'; // Added import


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
          <Router />
          <ConnectionNotification />
          <Toaster />
          <ConnectionStatusMonitor /> {/* Added ConnectionStatusMonitor */}
        </AIAssistantProvider>
      </ExtensionProvider>
    </QueryClientProvider>
  );
}

export default App;
/**
 * Voice Command Settings Page
 * 
 * This page provides access to all voice command enhancement features:
 * - Analytics dashboard
 * - Shortcut management
 * - Contextual help
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VoiceCommandAnalytics } from '@/components/agent-voice/VoiceCommandAnalytics';
import { VoiceCommandShortcuts } from '@/components/agent-voice/VoiceCommandShortcuts';
import { VoiceCommandHelp } from '@/components/agent-voice/VoiceCommandHelp';
import { EnhancedVoiceInterface } from '@/components/agent-voice/EnhancedVoiceInterface';
import { Mic, BarChart3, Bookmark, HelpCircle, Settings2 } from 'lucide-react';

export default function VoiceCommandSettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Mock user ID - in a real app, this would come from auth
  const userId = 1;
  
  // Handle command selection from help page
  const handleCommandSelected = (command: string) => {
    console.log('Selected command:', command);
    // In a full implementation, we would process this command
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Mic className="h-8 w-8 mr-2 text-primary" />
        Voice Command Settings
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left sidebar with voice interface */}
        <div className="md:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Try It Out</CardTitle>
              <CardDescription>
                Test your voice commands here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedVoiceInterface
                userId={userId}
                contextId="settings"
                includeShortcuts={true}
                includeAnalytics={true}
                includeContextualHelp={true}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Main content area */}
        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="overview" className="flex items-center">
                <Settings2 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="shortcuts" className="flex items-center">
                <Bookmark className="h-4 w-4 mr-2" />
                Shortcuts
              </TabsTrigger>
              <TabsTrigger value="help" className="flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Voice Command Settings</CardTitle>
                    <CardDescription>
                      Configure and optimize your voice command experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="col-span-1">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Analytics</CardTitle>
                          <CardDescription>
                            Track usage and performance
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <p className="mb-4 text-sm">
                            View statistics about your voice command usage, success rates, and more.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab('analytics')}
                            className="w-full"
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Analytics
                          </Button>
                        </CardContent>
                      </Card>
                      
                      <Card className="col-span-1">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Shortcuts</CardTitle>
                          <CardDescription>
                            Personalize your commands
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <p className="mb-4 text-sm">
                            Create custom shortcuts to streamline common voice commands.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab('shortcuts')}
                            className="w-full"
                          >
                            <Bookmark className="h-4 w-4 mr-2" />
                            Manage Shortcuts
                          </Button>
                        </CardContent>
                      </Card>
                      
                      <Card className="col-span-1">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Help</CardTitle>
                          <CardDescription>
                            Discover available commands
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <p className="mb-4 text-sm">
                            Learn about available voice commands and how to use them effectively.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab('help')}
                            className="w-full"
                          >
                            <HelpCircle className="h-4 w-4 mr-2" />
                            View Help
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Enhanced Voice Command Features</CardTitle>
                    <CardDescription>
                      Learn about the new voice command enhancements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex items-start">
                        <div className="mr-4 p-2 bg-primary/10 rounded-full">
                          <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Analytics & Insights</h3>
                          <p className="text-muted-foreground">
                            Track your voice command usage patterns, success rates, and identify common errors
                            to improve your efficiency and effectiveness with voice controls.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="mr-4 p-2 bg-primary/10 rounded-full">
                          <Bookmark className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Customizable Shortcuts</h3>
                          <p className="text-muted-foreground">
                            Create personalized shortcuts for your most common voice commands.
                            Turn complex phrases into simple commands for faster workflow.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="mr-4 p-2 bg-primary/10 rounded-full">
                          <HelpCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Contextual Help</h3>
                          <p className="text-muted-foreground">
                            Access context-specific help and suggestions based on what you're currently doing.
                            Learn the most relevant commands for each situation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <VoiceCommandAnalytics userId={userId} />
            </TabsContent>
            
            {/* Shortcuts Tab */}
            <TabsContent value="shortcuts">
              <VoiceCommandShortcuts userId={userId} />
            </TabsContent>
            
            {/* Help Tab */}
            <TabsContent value="help">
              <VoiceCommandHelp 
                contextId="global" 
                onCommandClicked={handleCommandSelected}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
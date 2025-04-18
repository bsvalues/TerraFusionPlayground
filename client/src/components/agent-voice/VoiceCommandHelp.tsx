/**
 * Voice Command Help
 * 
 * This component displays contextual help for voice commands, including:
 * - Lists of available commands
 * - Example phrases
 * - Parameter descriptions
 * - Response examples
 */

import { useState, useEffect } from 'react';
import { 
  getContextualHelp,
  VoiceCommandHelpContent,
  initializeHelpContent
} from '@/services/enhanced-voice-command-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Loader2, 
  RefreshCw, 
  HelpCircle, 
  Mic, 
  LayoutList, 
  Tag,
  Info,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Command type categories
const COMMAND_CATEGORIES = [
  { id: 'all', label: 'All Commands', icon: <LayoutList className="h-4 w-4" /> },
  { id: 'property', label: 'Property', icon: <Tag className="h-4 w-4" /> },
  { id: 'report', label: 'Reports', icon: <Info className="h-4 w-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <LayoutList className="h-4 w-4" /> },
  { id: 'navigation', label: 'Navigation', icon: <LayoutList className="h-4 w-4" /> },
  { id: 'system', label: 'System', icon: <LayoutList className="h-4 w-4" /> }
];

interface VoiceCommandHelpProps {
  contextId?: string;
  className?: string;
  onCommandClicked?: (command: string) => void;
}

export function VoiceCommandHelp({
  contextId = 'global',
  className = '',
  onCommandClicked
}: VoiceCommandHelpProps) {
  const [helpContent, setHelpContent] = useState<VoiceCommandHelpContent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { toast } = useToast();
  
  // Load help content
  const loadHelpContent = async () => {
    setIsLoading(true);
    
    try {
      const data = await getContextualHelp(contextId);
      setHelpContent(data);
    } catch (error) {
      console.error('Error loading help content:', error);
      toast({
        title: 'Error',
        description: 'Failed to load help content',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load help content on mount
  useEffect(() => {
    loadHelpContent();
  }, [contextId]);
  
  // Initialize default help content
  const handleInitializeHelp = async () => {
    setIsLoading(true);
    
    try {
      await initializeHelpContent();
      await loadHelpContent();
      
      toast({
        title: 'Success',
        description: 'Help content initialized successfully',
      });
    } catch (error) {
      console.error('Error initializing help content:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize help content',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter content by category and search query
  const filteredContent = helpContent
    .filter(item => !item.isHidden)
    .filter(item => {
      // Filter by category
      if (activeCategory !== 'all' && item.commandType !== activeCategory) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.examplePhrases.some(phrase => phrase.toLowerCase().includes(query)) ||
          (item.parameters && Object.values(item.parameters).some(desc => desc.toLowerCase().includes(query)))
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by priority (higher first) then by title
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.title.localeCompare(b.title);
    });
  
  // Handle command click
  const handleCommandClick = (command: string) => {
    if (onCommandClicked) {
      onCommandClicked(command);
    } else {
      // If no callback provided, just copy to clipboard
      navigator.clipboard.writeText(command);
      toast({
        title: 'Command Copied',
        description: 'Command copied to clipboard',
        duration: 2000
      });
    }
  };
  
  // Render loading state
  const renderLoading = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin mr-2" />
      <p>Loading help content...</p>
    </div>
  );
  
  // Render empty state
  const renderEmpty = () => (
    <div className="text-center py-8 text-muted-foreground">
      <p className="mb-4">No help content is available for this context.</p>
      <Button onClick={handleInitializeHelp}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Initialize Default Help
      </Button>
    </div>
  );
  
  // Render the help content
  const renderHelpContent = (content: VoiceCommandHelpContent) => (
    <AccordionItem value={String(content.id)} key={content.id}>
      <AccordionTrigger>
        <div className="flex items-center text-left">
          <Badge className="mr-2">{content.commandType}</Badge>
          <span>{content.title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-2">
          <p>{content.description}</p>
          
          {/* Example phrases */}
          {content.examplePhrases && content.examplePhrases.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Example phrases:</h4>
              <div className="flex flex-wrap gap-2">
                {content.examplePhrases.map((phrase, i) => (
                  <Badge 
                    key={i} 
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleCommandClick(phrase)}
                  >
                    <Mic className="h-3 w-3 mr-1" />
                    {phrase}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Parameters */}
          {content.parameters && Object.keys(content.parameters).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Parameters:</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(content.parameters).map(([param, desc], i) => (
                  <div key={i} className="flex items-start">
                    <Badge variant="secondary" className="mt-0.5">
                      {param}
                    </Badge>
                    <span className="ml-2 text-sm">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Response example */}
          {content.responseExample && (
            <div>
              <h4 className="text-sm font-medium mb-2">Example response:</h4>
              <div className="bg-muted p-2 rounded-md text-sm">
                {content.responseExample}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2" />
              Voice Command Help
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadHelpContent}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Available voice commands and how to use them
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search commands..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="grid grid-cols-3 md:grid-cols-6">
                {COMMAND_CATEGORIES.map(category => (
                  <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-1">
                    {category.icon}
                    <span className="hidden sm:inline-block">{category.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          {/* Content */}
          {isLoading ? (
            renderLoading()
          ) : filteredContent.length === 0 ? (
            renderEmpty()
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredContent.map(renderHelpContent)}
            </Accordion>
          )}
          
          {/* No results state */}
          {!isLoading && helpContent.length > 0 && filteredContent.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p>No commands found matching your filters.</p>
              <Button 
                variant="link" 
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
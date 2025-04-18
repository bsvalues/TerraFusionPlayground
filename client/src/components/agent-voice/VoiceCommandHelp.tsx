/**
 * Voice Command Help
 * 
 * This component displays contextual help for voice commands,
 * showing available commands, their syntax, and usage examples.
 */

import { useState, useEffect } from 'react';
import { 
  getContextualHelp, 
  getSuggestedHelp,
  type VoiceCommandHelpContent 
} from '@/services/enhanced-voice-command-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Info, 
  Sparkles, 
  Send, 
  Loader2,
  HelpCircle,
  Command
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceCommandHelpProps {
  contextId: string;
  onCommandSelected?: (command: string) => void;
  className?: string;
}

export function VoiceCommandHelp({
  contextId,
  onCommandSelected,
  className = ''
}: VoiceCommandHelpProps) {
  // State
  const [helpContent, setHelpContent] = useState<VoiceCommandHelpContent[]>([]);
  const [filteredContent, setFilteredContent] = useState<VoiceCommandHelpContent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  
  const { toast } = useToast();
  
  // Load help content when context changes
  useEffect(() => {
    loadHelpContent();
  }, [contextId]);
  
  // Filter help content when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContent(helpContent);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = helpContent.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.commandType.toLowerCase().includes(query) ||
      item.examplePhrases.some(phrase => phrase.toLowerCase().includes(query))
    );
    
    setFilteredContent(filtered);
  }, [searchQuery, helpContent]);
  
  // Load help content from the API
  const loadHelpContent = async () => {
    setIsLoading(true);
    
    try {
      const content = await getContextualHelp(contextId);
      
      // Sort by priority (high to low)
      content.sort((a, b) => b.priority - a.priority);
      
      setHelpContent(content);
      setFilteredContent(content);
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
  
  // Toggle expanded state of an item
  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Handle selecting a command
  const handleCommandSelect = (command: string) => {
    if (onCommandSelected) {
      onCommandSelected(command);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Suggest help based on user input
  const getSuggestions = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsLoading(true);
      const suggestions = await getSuggestedHelp(searchQuery, contextId);
      
      // Set expanded for all suggested items
      const newExpandedItems = { ...expandedItems };
      suggestions.forEach(item => {
        newExpandedItems[item.id] = true;
      });
      setExpandedItems(newExpandedItems);
      
      // Filter to show only suggestions
      setFilteredContent(suggestions);
      
      if (suggestions.length === 0) {
        toast({
          title: 'No suggestions found',
          description: 'Try a different search query',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        title: 'Error',
        description: 'Failed to get suggestions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
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
      <HelpCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
      <p className="text-lg font-medium">No help content available</p>
      <p className="mt-1">No help content is available for this context.</p>
      
      <Button
        variant="outline" 
        className="mt-4"
        onClick={loadHelpContent}
      >
        <Command className="h-4 w-4 mr-2" />
        Check for updates
      </Button>
    </div>
  );
  
  // Render no results for search
  const renderNoResults = () => (
    <div className="text-center py-6 text-muted-foreground">
      <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
      <p>No results found for "{searchQuery}"</p>
      <Button
        variant="ghost" 
        size="sm"
        onClick={() => setSearchQuery('')}
        className="mt-2"
      >
        Clear search
      </Button>
    </div>
  );
  
  // Render help content
  const renderHelpContent = () => {
    if (filteredContent.length === 0 && searchQuery) {
      return renderNoResults();
    }
    
    if (filteredContent.length === 0) {
      return renderEmpty();
    }
    
    return (
      <ScrollArea className="max-h-[500px]">
        <div className="space-y-4 p-1">
          {filteredContent.map((item) => (
            <Collapsible 
              key={item.id} 
              open={expandedItems[item.id]} 
              onOpenChange={() => toggleExpanded(item.id)}
              className="border rounded-md shadow-sm"
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between p-3 font-medium hover:bg-muted/50 rounded-t-md">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">
                    {item.commandType}
                  </Badge>
                  <span>{item.title}</span>
                </div>
                {expandedItems[item.id] ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 pt-0 text-sm space-y-3 border-t">
                <p className="mt-3">{item.description}</p>
                
                {item.examplePhrases.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Example phrases:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {item.examplePhrases.map((phrase, i) => (
                        <li key={i} className="flex items-center">
                          <span className="flex-1 truncate">"{phrase}"</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 min-w-6 px-1 ml-1"
                            onClick={() => handleCommandSelect(phrase)}
                            title="Use this command"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {item.parameters && Object.keys(item.parameters).length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Parameters:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {Object.entries(item.parameters).map(([key, desc], i) => (
                        <li key={i}>
                          <span className="font-semibold">{key}</span> - {desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {item.responseExample && (
                  <div>
                    <p className="font-medium mb-1">Response example:</p>
                    <div className="bg-muted p-2 rounded-md text-xs">
                      {item.responseExample}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    );
  };
  
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle>Voice Command Help</CardTitle>
          <Badge variant="outline">
            {contextId === 'global' ? 'Global' : contextId}
          </Badge>
        </div>
        <CardDescription>
          Learn about available voice commands and how to use them
        </CardDescription>
        
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search commands..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            onClick={getSuggestions}
            disabled={isLoading || !searchQuery.trim()}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Suggest
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? renderLoading() : renderHelpContent()}
      </CardContent>
    </Card>
  );
}
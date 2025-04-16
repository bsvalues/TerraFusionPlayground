import React, { useState } from 'react';
import { X, Send, Trash2, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAIAssistant } from '../../providers/ai-assistant-provider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AIAssistantSidebar: React.FC = () => {
  const { 
    isOpen, 
    toggleSidebar, 
    messages, 
    sendMessage, 
    clearMessages, 
    isLoading,
    activeProvider,
    setActiveProvider
  } = useAIAssistant();
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<string>('chat');
  
  const handleSendMessage = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div 
      className={`fixed right-0 top-0 h-screen z-50 flex transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Toggle button */}
      <div className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2">
        <Button 
          variant="secondary" 
          size="icon" 
          className="h-10 w-10 rounded-l-md rounded-r-none shadow-md"
          onClick={toggleSidebar}
        >
          {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 shadow-lg flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="text-lg font-semibold">AI Assistant</h2>
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={() => setActiveTab('settings')}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="flex-1 flex flex-col">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`p-2 rounded-lg max-w-[90%] ${
                    message.role === 'user' 
                      ? 'bg-primary/10 ml-auto' 
                      : message.role === 'system'
                      ? 'bg-muted text-center mx-auto italic'
                      : 'bg-secondary/10'
                  }`}
                >
                  <div className="text-sm">{message.content}</div>
                  {message.model && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {message.model}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <div className="flex space-x-2 items-center">
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="p-3 border-t">
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Ask me anything..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="resize-none"
                  rows={2}
                />
                <div className="flex flex-col space-y-2">
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage} 
                    disabled={!inputValue.trim() || isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={clearMessages}
                    title="Clear conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="p-4 space-y-4">
            <div>
              <h3 className="font-medium mb-2">AI Provider</h3>
              <RadioGroup 
                value={activeProvider} 
                onValueChange={(value) => setActiveProvider(value as 'openai' | 'anthropic' | 'perplexity')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="openai" id="openai" />
                  <Label htmlFor="openai">OpenAI (GPT-4o)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="anthropic" id="anthropic" />
                  <Label htmlFor="anthropic">Anthropic (Claude 3.7)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="perplexity" id="perplexity" />
                  <Label htmlFor="perplexity">Perplexity (Llama 3.1)</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <h3 className="font-medium mb-2">Model Settings</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Select defaultValue="0.7">
                    <SelectTrigger id="temperature" className="col-span-2">
                      <SelectValue placeholder="Temperature" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.0">0.0 - Precise</SelectItem>
                      <SelectItem value="0.3">0.3 - Balanced</SelectItem>
                      <SelectItem value="0.7">0.7 - Creative</SelectItem>
                      <SelectItem value="1.0">1.0 - Very Creative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Context Memory Settings */}
            <div>
              <h3 className="font-medium mb-2">Context Memory</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="contextLength">Context Length</Label>
                  <Select defaultValue="5">
                    <SelectTrigger id="contextLength" className="col-span-2">
                      <SelectValue placeholder="Context Length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 messages</SelectItem>
                      <SelectItem value="5">5 messages</SelectItem>
                      <SelectItem value="10">10 messages</SelectItem>
                      <SelectItem value="20">20 messages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIAssistantSidebar;
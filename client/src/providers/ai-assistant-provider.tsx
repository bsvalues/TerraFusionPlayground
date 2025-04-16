import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
}

interface ContextMemory {
  recentQueries: string[];
  pageHistory: { path: string; title: string; timestamp: number }[];
  userPreferences: {
    preferredModel: string;
    showSidebar: boolean;
  };
}

interface AIAssistantContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  isLoading: boolean;
  contextMemory: ContextMemory;
  updateUserPreferences: (preferences: Partial<ContextMemory['userPreferences']>) => void;
  activeProvider: 'openai' | 'anthropic' | 'perplexity';
  setActiveProvider: (provider: 'openai' | 'anthropic' | 'perplexity') => void;
}

const defaultContextMemory: ContextMemory = {
  recentQueries: [],
  pageHistory: [],
  userPreferences: {
    preferredModel: 'gpt-4o',
    showSidebar: false,
  },
};

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'ai-assistant-state';

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'Welcome to the Property Assessment AI Assistant. How can I help you today?',
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [contextMemory, setContextMemory] = useState<ContextMemory>(defaultContextMemory);
  const [activeProvider, setActiveProvider] = useState<'openai' | 'anthropic' | 'perplexity'>('openai');
  const [location] = useLocation();

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedState) {
        const { messages: savedMessages, contextMemory: savedContextMemory } = JSON.parse(savedState);
        if (savedMessages) setMessages(savedMessages);
        if (savedContextMemory) setContextMemory(savedContextMemory);
      }
    } catch (error) {
      console.error('Error loading AI assistant state:', error);
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          messages,
          contextMemory,
        })
      );
    } catch (error) {
      console.error('Error saving AI assistant state:', error);
    }
  }, [messages, contextMemory]);

  // Track page navigation in context memory
  useEffect(() => {
    const pageTitle = document.title || 'Property Assessment Page';
    const newPageHistory = [
      { path: location, title: pageTitle, timestamp: Date.now() },
      ...contextMemory.pageHistory.filter(page => page.path !== location).slice(0, 9),
    ];

    setContextMemory(prev => ({
      ...prev,
      pageHistory: newPageHistory,
    }));
  }, [location, contextMemory.pageHistory]);

  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const updateUserPreferences = useCallback((preferences: Partial<ContextMemory['userPreferences']>) => {
    setContextMemory(prev => ({
      ...prev,
      userPreferences: {
        ...prev.userPreferences,
        ...preferences,
      },
    }));
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      // Update recent queries in context memory
      setContextMemory(prev => ({
        ...prev,
        recentQueries: [content, ...prev.recentQueries.slice(0, 4)],
      }));

      try {
        // Get context for the AI request
        const context = {
          recentMessages: messages.slice(-5),
          currentPage: contextMemory.pageHistory[0],
          pageHistory: contextMemory.pageHistory.slice(0, 3),
          recentQueries: contextMemory.recentQueries,
        };

        // Make API request
        const response = await fetch('/api/ai-assistant/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            context,
            provider: activeProvider,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from AI assistant');
        }

        const data = await response.json();

        // Add assistant response
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: Date.now(),
          model: data.model,
        };

        setMessages(prev => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Error sending message to AI assistant:', error);
        
        // Add error message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again later.',
          timestamp: Date.now(),
        };

        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, contextMemory, activeProvider]
  );

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'system',
        content: 'Welcome to the Property Assessment AI Assistant. How can I help you today?',
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const value = {
    isOpen,
    toggleSidebar,
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    contextMemory,
    updateUserPreferences,
    activeProvider,
    setActiveProvider,
  };

  return <AIAssistantContext.Provider value={value}>{children}</AIAssistantContext.Provider>;
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
}
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useExtensionService } from '@/hooks/use-extension-service';
import { WebviewPanel } from '@/components/extensions/WebviewPanel';

type ExtensionContextType = {
  executeCommand: (command: string, params?: Record<string, any>) => Promise<any>;
  openWebview: (id: string, title: string) => void;
  closeWebview: (id: string) => void;
};

const ExtensionContext = createContext<ExtensionContextType | undefined>(undefined);

type ExtensionProviderProps = {
  children: ReactNode;
};

export function ExtensionProvider({ children }: ExtensionProviderProps) {
  const { executeCommand, openWebview, closeWebview, activeWebviews } = useExtensionService();
  
  return (
    <ExtensionContext.Provider value={{ executeCommand, openWebview, closeWebview }}>
      {children}
      
      {/* Render active webviews */}
      {activeWebviews.map((webview) => (
        <div key={webview.id} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="container flex items-center justify-center h-full max-w-7xl">
            <div className="w-full h-[90vh] max-w-6xl">
              <WebviewPanel 
                webviewId={webview.id}
                title={webview.title}
                onClose={() => closeWebview(webview.id)}
              />
            </div>
          </div>
        </div>
      ))}
    </ExtensionContext.Provider>
  );
}

export function useExtension() {
  const context = useContext(ExtensionContext);
  
  if (!context) {
    throw new Error('useExtension must be used within an ExtensionProvider');
  }
  
  return context;
}
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

interface WebviewPanelProps {
  webviewId: string;
  extensionId: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WebviewPanel({
  webviewId,
  extensionId,
  title,
  isOpen,
  onClose
}: WebviewPanelProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageChannel, setMessageChannel] = useState<MessageChannel | null>(null);
  const iframeId = `webview-iframe-${webviewId}`;

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchWebviewContent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiRequest(`/api/extensions/${extensionId}/webviews/${webviewId}`);
        if (!response.ok) {
          throw new Error(`Failed to load webview content: ${response.statusText}`);
        }
        
        const contentText = await response.text();
        setContent(contentText);
      } catch (err) {
        console.error('Error loading webview content:', err);
        setError(err instanceof Error ? err.message : 'Failed to load webview content');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWebviewContent();

    // Create a message channel for communication
    const channel = new MessageChannel();
    setMessageChannel(channel);

    // Clean up when the component unmounts
    return () => {
      if (messageChannel) {
        messageChannel.port1.close();
        messageChannel.port2.close();
      }
      setMessageChannel(null);
    };
  }, [isOpen, extensionId, webviewId]);

  // Setup communication with the iframe after it loads
  useEffect(() => {
    if (!messageChannel || !content) return;

    const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (!iframe || !iframe.contentWindow) return;

    // Setup listeners for messages from the iframe
    messageChannel.port1.onmessage = (event) => {
      if (event.data.type === 'webview.ready') {
        console.log('Webview is ready');
      } else if (event.data.type === 'webview.action') {
        // Handle actions requested by the webview
        console.log('Webview action:', event.data.action);
        if (event.data.action === 'close') {
          onClose();
        }
      }
    };

    // Wait for iframe to load, then setup communication
    const handleIframeLoad = () => {
      iframe.contentWindow?.postMessage({ 
        type: 'host.connected',
        extensionId
      }, '*', [messageChannel.port2]);
    };

    iframe.addEventListener('load', handleIframeLoad);
    return () => {
      iframe.removeEventListener('load', handleIframeLoad);
    };
  }, [messageChannel, content, extensionId, iframeId, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Extension: {extensionId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative h-[70vh] border rounded-md bg-background">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-gray-500">Loading webview content...</span>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4">
                <p className="text-red-500 font-medium mb-2">Error loading webview</p>
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
          ) : (
            <iframe 
              id={iframeId}
              srcDoc={content || ''}
              className="h-full w-full border-0"
              title={`${extensionId} - ${webviewId}`}
              sandbox="allow-scripts allow-forms"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
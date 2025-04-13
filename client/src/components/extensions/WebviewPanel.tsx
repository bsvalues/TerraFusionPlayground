import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export type WebviewPanelProps = {
  webviewId: string;
  title: string;
  onClose: () => void;
};

export function WebviewPanel({ webviewId, title, onClose }: WebviewPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    async function fetchWebviewContent() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/extensions/webviews/${webviewId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to load webview content: ${response.statusText}`);
        }
        
        const data = await response.json();
        setHtmlContent(data.content);
      } catch (error) {
        console.error("Error loading webview:", error);
        toast({
          title: "Error Loading Webview",
          description: error instanceof Error ? error.message : "Failed to load webview content",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchWebviewContent();
  }, [webviewId, toast]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 px-4 flex flex-row justify-between items-center">
        <CardTitle className="text-base truncate">{title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-2 border-primary"></div>
          </div>
        ) : (
          <div 
            className="h-full w-full"
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
        )}
      </CardContent>
    </Card>
  );
}
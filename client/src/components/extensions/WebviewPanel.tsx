import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { X } from 'lucide-react';

interface WebviewPanelProps {
  webviewId: string;
  title: string;
  onClose: () => void;
}

export function WebviewPanel({ webviewId, title, onClose }: WebviewPanelProps) {
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchWebview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiRequest(`/api/extensions/webviews/${webviewId}`);
        if (!response.ok) {
          throw new Error(`Failed to load webview: ${response.statusText}`);
        }
        
        const data = await response.json();
        setHtml(data.html || '');
      } catch (err) {
        console.error('Error loading webview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load webview');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWebview();
  }, [webviewId]);
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 rounded-md bg-red-50 border border-red-200">
            <p className="font-semibold">Error loading extension content</p>
            <p>{error}</p>
          </div>
        ) : (
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}
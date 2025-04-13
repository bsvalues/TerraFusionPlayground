import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useExtension } from '@/providers/extension-provider';

interface ExtensionInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
}

export function ExtensionsPanel() {
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { executeCommand } = useExtension();
  
  useEffect(() => {
    const fetchExtensions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiRequest('/api/extensions');
        if (!response.ok) {
          throw new Error(`Failed to load extensions: ${response.statusText}`);
        }
        
        const data = await response.json();
        setExtensions(data);
      } catch (err) {
        console.error('Error loading extensions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load extensions');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExtensions();
  }, []);
  
  const toggleExtension = async (extensionId: string, isCurrentlyActive: boolean) => {
    try {
      const command = isCurrentlyActive 
        ? `extension.${extensionId}.deactivate` 
        : `extension.${extensionId}.activate`;
      
      await executeCommand(command);
      
      // Update the local state to reflect the change
      setExtensions(prev => 
        prev.map(ext => 
          ext.id === extensionId 
            ? { ...ext, isActive: !isCurrentlyActive } 
            : ext
        )
      );
    } catch (error) {
      console.error('Error toggling extension:', error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-500">
          <h3 className="font-semibold text-lg mb-2">Error loading extensions</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (extensions.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-md text-gray-500 text-center">
          <h3 className="font-semibold text-lg mb-2">No extensions found</h3>
          <p>No extensions are currently installed or available.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Available Extensions</h2>
      
      <div className="grid gap-6">
        {extensions.map(extension => (
          <div 
            key={extension.id} 
            className="border rounded-lg p-5 shadow-sm bg-white"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">{extension.name}</h3>
                <p className="text-sm text-gray-500 mb-2">v{extension.version}</p>
                <p className="text-gray-600">{extension.description}</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => toggleExtension(extension.id, extension.isActive)}
                  className={`px-4 py-2 rounded-md ${
                    extension.isActive 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {extension.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
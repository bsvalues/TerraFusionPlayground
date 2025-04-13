import { useState, useEffect } from 'react';
import { useExtension } from '@/providers/extension-provider';
import { apiRequest } from '@/lib/queryClient';

interface MenuItem {
  id: string;
  extensionId: string;
  label: string;
  command: string;
}

interface ExtensionMenuItemsProps {
  onItemClick?: () => void;
}

export function ExtensionMenuItems({ onItemClick }: ExtensionMenuItemsProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { executeCommand, openWebview } = useExtension();
  
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('/api/extensions/menu-items');
        const data = await response.json();
        setMenuItems(data);
      } catch (error) {
        console.error('Error fetching extension menu items:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMenuItems();
  }, []);
  
  const handleItemClick = async (item: MenuItem) => {
    try {
      if (item.command) {
        // Execute the command
        const result = await executeCommand(item.command);
        
        // If the command returns a webview to open
        if (result && result.webview) {
          openWebview(result.webview.id, result.webview.title);
        }
      }
      
      // Call the onItemClick callback if provided
      onItemClick?.();
    } catch (error) {
      console.error('Error executing command:', error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="px-4 py-2 text-sm text-gray-700">
        Loading extensions...
      </div>
    );
  }
  
  if (menuItems.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-gray-700">
        No extensions available
      </div>
    );
  }
  
  // Group menu items by extension ID
  const groupedItems: Record<string, MenuItem[]> = {};
  menuItems.forEach(item => {
    if (!groupedItems[item.extensionId]) {
      groupedItems[item.extensionId] = [];
    }
    groupedItems[item.extensionId].push(item);
  });
  
  return (
    <>
      {Object.entries(groupedItems).map(([extensionId, items], index) => (
        <div key={extensionId}>
          {index > 0 && <div className="border-t border-gray-200 my-1"></div>}
          
          {items.map(item => (
            <button
              key={item.id}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => handleItemClick(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </>
  );
}
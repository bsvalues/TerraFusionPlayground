import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Puzzle } from 'lucide-react';

type ExtensionMenuItem = {
  id: string;
  label: string;
  command: string;
  position: number;
  children: ExtensionMenuItem[];
};

type ExtensionMenuItemsProps = {
  onExecuteCommand: (command: string) => void;
};

export function ExtensionMenuItems({ onExecuteCommand }: ExtensionMenuItemsProps) {
  const { toast } = useToast();
  
  // Fetch extension menu items
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['/api/extensions/menu-items'],
    queryFn: async () => {
      const response = await fetch('/api/extensions/menu-items');
      if (!response.ok) {
        throw new Error('Failed to fetch extension menu items');
      }
      return response.json() as Promise<ExtensionMenuItem[]>;
    }
  });
  
  if (isLoading || menuItems.length === 0) {
    return null;
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Puzzle className="h-4 w-4" />
          <span>Extensions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {menuItems.map((item) => (
          <DropdownMenuItem 
            key={item.id}
            onClick={() => onExecuteCommand(item.command)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
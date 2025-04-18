/**
 * Voice Command Shortcuts
 * 
 * This component allows users to manage their voice command shortcuts.
 * Shortcuts are phrases that expand to more complex commands.
 */

import { useState, useEffect } from 'react';
import { 
  getUserShortcuts, 
  createShortcut, 
  updateShortcut, 
  deleteShortcut,
  createDefaultShortcuts,
  type VoiceCommandShortcut, 
  type CreateVoiceCommandShortcut
} from '@/services/enhanced-voice-command-service';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  PlusCircle, 
  RefreshCw, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

interface VoiceCommandShortcutsProps {
  userId: number;
  className?: string;
}

const COMMAND_TYPES = [
  'navigation',
  'query',
  'action',
  'system',
  'custom'
];

export function VoiceCommandShortcuts({
  userId,
  className = ''
}: VoiceCommandShortcutsProps) {
  // Shortcuts state
  const [shortcuts, setShortcuts] = useState<VoiceCommandShortcut[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Form state
  const [showAddDialog, setShowAddDialog] = useState<boolean>(false);
  const [editingShortcut, setEditingShortcut] = useState<VoiceCommandShortcut | null>(null);
  
  const [formData, setFormData] = useState<CreateVoiceCommandShortcut>({
    userId,
    shortcutPhrase: '',
    expandedCommand: '',
    commandType: 'custom',
    description: '',
    priority: 0,
    isEnabled: true,
    isGlobal: false
  });
  
  const { toast } = useToast();
  
  // Load shortcuts
  const loadShortcuts = async () => {
    setIsLoading(true);
    
    try {
      const data = await getUserShortcuts(userId);
      setShortcuts(data.sort((a, b) => b.priority - a.priority));
    } catch (error) {
      console.error('Error loading shortcuts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shortcuts',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load shortcuts on mount
  useEffect(() => {
    loadShortcuts();
  }, [userId]);
  
  // Reset form data
  const resetFormData = () => {
    setFormData({
      userId,
      shortcutPhrase: '',
      expandedCommand: '',
      commandType: 'custom',
      description: '',
      priority: 0,
      isEnabled: true,
      isGlobal: false
    });
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Add a new shortcut
  const handleAddShortcut = async () => {
    try {
      // Validate input
      if (!formData.shortcutPhrase.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Shortcut phrase cannot be empty',
          variant: 'destructive'
        });
        return;
      }
      
      if (!formData.expandedCommand.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Expanded command cannot be empty',
          variant: 'destructive'
        });
        return;
      }
      
      // Create or update shortcut
      if (editingShortcut) {
        const updated = await updateShortcut(editingShortcut.id, formData);
        setShortcuts(prev => 
          prev.map(s => s.id === updated.id ? updated : s)
            .sort((a, b) => b.priority - a.priority)
        );
        
        toast({
          title: 'Success',
          description: 'Shortcut updated successfully'
        });
      } else {
        const created = await createShortcut(formData);
        setShortcuts(prev => 
          [...prev, created].sort((a, b) => b.priority - a.priority)
        );
        
        toast({
          title: 'Success',
          description: 'Shortcut created successfully'
        });
      }
      
      // Reset form and close dialog
      resetFormData();
      setEditingShortcut(null);
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error saving shortcut:', error);
      toast({
        title: 'Error',
        description: 'Failed to save shortcut',
        variant: 'destructive'
      });
    }
  };
  
  // Edit a shortcut
  const handleEditShortcut = (shortcut: VoiceCommandShortcut) => {
    setEditingShortcut(shortcut);
    setFormData({
      userId,
      shortcutPhrase: shortcut.shortcutPhrase,
      expandedCommand: shortcut.expandedCommand,
      commandType: shortcut.commandType,
      description: shortcut.description || '',
      priority: shortcut.priority,
      isEnabled: shortcut.isEnabled,
      isGlobal: shortcut.isGlobal
    });
    setShowAddDialog(true);
  };
  
  // Delete a shortcut
  const handleDeleteShortcut = async (id: number) => {
    try {
      await deleteShortcut(id);
      setShortcuts(prev => prev.filter(s => s.id !== id));
      
      toast({
        title: 'Success',
        description: 'Shortcut deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting shortcut:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete shortcut',
        variant: 'destructive'
      });
    }
  };
  
  // Toggle shortcut enabled state
  const handleToggleEnabled = async (shortcut: VoiceCommandShortcut) => {
    try {
      const updated = await updateShortcut(shortcut.id, {
        ...shortcut,
        isEnabled: !shortcut.isEnabled
      });
      
      setShortcuts(prev => 
        prev.map(s => s.id === updated.id ? updated : s)
      );
    } catch (error) {
      console.error('Error toggling shortcut:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shortcut',
        variant: 'destructive'
      });
    }
  };
  
  // Create default shortcuts
  const handleCreateDefaults = async () => {
    try {
      const defaults = await createDefaultShortcuts(userId);
      setShortcuts(prev => 
        [...prev, ...defaults].sort((a, b) => b.priority - a.priority)
      );
      
      toast({
        title: 'Success',
        description: 'Default shortcuts created successfully'
      });
    } catch (error) {
      console.error('Error creating defaults:', error);
      toast({
        title: 'Error',
        description: 'Failed to create default shortcuts',
        variant: 'destructive'
      });
    }
  };
  
  // Handle dialog close
  const handleDialogClose = () => {
    setShowAddDialog(false);
    resetFormData();
    setEditingShortcut(null);
  };
  
  // Render loading state
  const renderLoading = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin mr-2" />
      <p>Loading shortcuts...</p>
    </div>
  );
  
  // Render empty state
  const renderEmpty = () => (
    <div className="text-center py-8 text-muted-foreground">
      <p className="mb-4">No shortcuts found. Create a shortcut or add defaults.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => setShowAddDialog(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Shortcut
        </Button>
        <Button variant="outline" onClick={handleCreateDefaults}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Add Default Shortcuts
        </Button>
      </div>
    </div>
  );
  
  // Render shortcuts list
  const renderShortcuts = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shortcut Phrase</TableHead>
          <TableHead>Expanded Command</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shortcuts.map(shortcut => (
          <TableRow key={shortcut.id}>
            <TableCell className="font-medium">{shortcut.shortcutPhrase}</TableCell>
            <TableCell className="max-w-[200px] truncate" title={shortcut.expandedCommand}>
              {shortcut.expandedCommand}
            </TableCell>
            <TableCell>{shortcut.commandType}</TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={shortcut.isEnabled} 
                  onCheckedChange={() => handleToggleEnabled(shortcut)}
                  aria-label={`${shortcut.isEnabled ? 'Disable' : 'Enable'} shortcut`}
                />
                <span className={shortcut.isEnabled ? 'text-green-500' : 'text-muted-foreground'}>
                  {shortcut.isEnabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleEditShortcut(shortcut)}
                aria-label="Edit shortcut"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive" 
                onClick={() => handleDeleteShortcut(shortcut.id)}
                aria-label="Delete shortcut"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
  
  // Add/Edit shortcut dialog
  const renderDialog = () => (
    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{editingShortcut ? 'Edit Shortcut' : 'Add New Shortcut'}</DialogTitle>
          <DialogDescription>
            Create a voice command shortcut that expands to a longer command.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="shortcutPhrase" className="text-right">
              Shortcut Phrase
            </Label>
            <Input
              id="shortcutPhrase"
              name="shortcutPhrase"
              value={formData.shortcutPhrase}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="e.g., 'show data'"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expandedCommand" className="text-right">
              Expanded Command
            </Label>
            <Textarea
              id="expandedCommand"
              name="expandedCommand"
              value={formData.expandedCommand}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="e.g., 'show the data visualization for property values in Benton County'"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="commandType" className="text-right">
              Command Type
            </Label>
            <Select
              value={formData.commandType}
              onValueChange={(value) => handleSelectChange('commandType', value)}
            >
              <SelectTrigger id="commandType" className="col-span-3">
                <SelectValue placeholder="Select a command type" />
              </SelectTrigger>
              <SelectContent>
                {COMMAND_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="Optional description"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">
              Priority
            </Label>
            <Input
              id="priority"
              name="priority"
              type="number"
              value={formData.priority.toString()}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="Higher priority shortcuts will be expanded first"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right">
              <Label>Options</Label>
            </div>
            <div className="col-span-3 space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isEnabled"
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) => handleSwitchChange('isEnabled', checked)}
                />
                <Label htmlFor="isEnabled">Enable this shortcut</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isGlobal"
                  checked={formData.isGlobal}
                  onCheckedChange={(checked) => handleSwitchChange('isGlobal', checked)}
                />
                <Label htmlFor="isGlobal">Make available to all users</Label>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleDialogClose}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleAddShortcut}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {editingShortcut ? 'Update' : 'Create'} Shortcut
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Voice Command Shortcuts</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadShortcuts}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Shortcut
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Create shortcut phrases that expand to longer commands
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            renderLoading()
          ) : shortcuts.length === 0 ? (
            renderEmpty()
          ) : (
            renderShortcuts()
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center">
          {!isLoading && shortcuts.length > 0 && (
            <Button variant="outline" onClick={handleCreateDefaults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Add Default Shortcuts
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {renderDialog()}
    </div>
  );
}
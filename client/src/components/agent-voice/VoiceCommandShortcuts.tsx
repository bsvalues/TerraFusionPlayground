/**
 * Voice Command Shortcuts
 * 
 * This component allows users to manage their voice command shortcuts:
 * - View existing shortcuts
 * - Create new shortcuts
 * - Edit existing shortcuts
 * - Delete shortcuts
 * - Create default shortcuts
 */

import { useState, useEffect } from 'react';
import { 
  getUserShortcuts, 
  createShortcut, 
  updateShortcut, 
  deleteShortcut,
  createDefaultShortcuts,
  VoiceCommandShortcut
} from '@/services/enhanced-voice-command-service';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash, 
  MoreVertical, 
  RefreshCw, 
  Clock 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Command types for shortcuts
const COMMAND_TYPES = [
  { id: 'property', name: 'Property Commands' },
  { id: 'report', name: 'Report Commands' },
  { id: 'analytics', name: 'Analytics Commands' },
  { id: 'valuation', name: 'Valuation Commands' },
  { id: 'navigation', name: 'Navigation Commands' },
  { id: 'system', name: 'System Commands' },
  { id: 'custom', name: 'Custom Commands' }
];

interface VoiceCommandShortcutsProps {
  userId: number;
  className?: string;
}

export function VoiceCommandShortcuts({
  userId,
  className = ''
}: VoiceCommandShortcutsProps) {
  const [shortcuts, setShortcuts] = useState<VoiceCommandShortcut[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingShortcut, setEditingShortcut] = useState<VoiceCommandShortcut | null>(null);
  const { toast } = useToast();
  
  // Default form values for new shortcuts
  const defaultFormValues = {
    userId,
    shortcutPhrase: '',
    expandedCommand: '',
    commandType: 'custom',
    description: '',
    priority: 0,
    isEnabled: true,
    isGlobal: false
  };
  
  // Form state
  const [formValues, setFormValues] = useState(defaultFormValues);
  
  // Load shortcuts
  const loadShortcuts = async () => {
    setIsLoading(true);
    
    try {
      const data = await getUserShortcuts(userId);
      setShortcuts(data);
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
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormValues(prev => ({ ...prev, [name]: checked }));
  };
  
  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingShortcut) {
        // Update existing shortcut
        setIsUpdating(true);
        const updated = await updateShortcut(editingShortcut.id, formValues);
        
        // Update in state
        setShortcuts(prev => 
          prev.map(s => s.id === editingShortcut.id ? updated : s)
        );
        
        toast({
          title: 'Success',
          description: 'Shortcut updated successfully',
        });
      } else {
        // Create new shortcut
        setIsCreating(true);
        const created = await createShortcut(formValues);
        
        // Add to state
        setShortcuts(prev => [...prev, created]);
        
        toast({
          title: 'Success',
          description: 'Shortcut created successfully',
        });
      }
      
      // Reset and close dialog
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving shortcut:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save shortcut',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
      setIsUpdating(false);
    }
  };
  
  // Delete a shortcut
  const handleDelete = async (shortcut: VoiceCommandShortcut) => {
    try {
      await deleteShortcut(shortcut.id);
      
      // Remove from state
      setShortcuts(prev => prev.filter(s => s.id !== shortcut.id));
      
      toast({
        title: 'Success',
        description: 'Shortcut deleted successfully',
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
  
  // Create default shortcuts
  const handleCreateDefaults = async () => {
    try {
      setIsLoading(true);
      const defaults = await createDefaultShortcuts(userId);
      
      // Update state with new shortcuts
      setShortcuts(prev => {
        // Remove any existing defaults that were recreated
        const filteredPrev = prev.filter(
          existing => !defaults.some(def => def.shortcutPhrase === existing.shortcutPhrase)
        );
        
        return [...filteredPrev, ...defaults];
      });
      
      toast({
        title: 'Success',
        description: 'Default shortcuts created successfully',
      });
    } catch (error) {
      console.error('Error creating default shortcuts:', error);
      toast({
        title: 'Error',
        description: 'Failed to create default shortcuts',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset form to defaults
  const resetForm = () => {
    setFormValues(defaultFormValues);
    setEditingShortcut(null);
  };
  
  // Open dialog for editing
  const openEditDialog = (shortcut: VoiceCommandShortcut) => {
    setEditingShortcut(shortcut);
    setFormValues({
      userId: shortcut.userId,
      shortcutPhrase: shortcut.shortcutPhrase,
      expandedCommand: shortcut.expandedCommand,
      commandType: shortcut.commandType,
      description: shortcut.description || '',
      priority: shortcut.priority,
      isEnabled: shortcut.isEnabled,
      isGlobal: shortcut.isGlobal
    });
    setIsDialogOpen(true);
  };
  
  // Open dialog for creating
  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
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
      <p className="mb-4">No shortcuts have been created yet.</p>
      <div className="flex justify-center gap-2">
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Shortcut
        </Button>
        <Button variant="outline" onClick={handleCreateDefaults}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Create Defaults
        </Button>
      </div>
    </div>
  );
  
  // Render shortcuts table
  const renderShortcutsTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shortcut Phrase</TableHead>
          <TableHead>Expanded Command</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Last Used</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shortcuts.map((shortcut) => (
          <TableRow key={shortcut.id}>
            <TableCell className="font-medium">{shortcut.shortcutPhrase}</TableCell>
            <TableCell>{shortcut.expandedCommand}</TableCell>
            <TableCell>{shortcut.commandType}</TableCell>
            <TableCell>
              <div className="flex items-center text-muted-foreground text-sm">
                <Clock className="h-3 w-3 mr-1" />
                {formatDate(shortcut.lastUsed)}
              </div>
            </TableCell>
            <TableCell>
              {shortcut.isEnabled ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Enabled
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Disabled
                </span>
              )}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => openEditDialog(shortcut)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600" 
                    onClick={() => handleDelete(shortcut)}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
  
  // Render form dialog
  const renderFormDialog = () => (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Shortcut
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingShortcut ? 'Edit Shortcut' : 'Create New Shortcut'}
            </DialogTitle>
            <DialogDescription>
              Create a shortcut phrase that will be expanded to a full command.
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
                placeholder="e.g., 'find property'"
                value={formValues.shortcutPhrase}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expandedCommand" className="text-right">
                Expanded Command
              </Label>
              <Textarea
                id="expandedCommand"
                name="expandedCommand"
                placeholder="e.g., 'search for property records by address'"
                value={formValues.expandedCommand}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="commandType" className="text-right">
                Command Type
              </Label>
              <Select 
                name="commandType" 
                value={formValues.commandType} 
                onValueChange={(value) => setFormValues(prev => ({ ...prev, commandType: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a command type" />
                </SelectTrigger>
                <SelectContent>
                  {COMMAND_TYPES.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Optional description"
                value={formValues.description}
                onChange={handleInputChange}
                className="col-span-3"
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
                min="0"
                max="100"
                value={formValues.priority}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isEnabled" className="text-right">
                Enabled
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="isEnabled"
                  checked={formValues.isEnabled}
                  onCheckedChange={(checked) => handleSwitchChange('isEnabled', checked)}
                />
                <Label htmlFor="isEnabled">
                  {formValues.isEnabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isGlobal" className="text-right">
                Global
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="isGlobal"
                  checked={formValues.isGlobal}
                  onCheckedChange={(checked) => handleSwitchChange('isGlobal', checked)}
                />
                <Label htmlFor="isGlobal">
                  {formValues.isGlobal ? 'Available to all users' : 'Personal shortcut'}
                </Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingShortcut ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{editingShortcut ? 'Update' : 'Create'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Voice Command Shortcuts</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadShortcuts} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleCreateDefaults} disabled={isLoading}>
                Create Defaults
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Create shortcut phrases that expand to full voice commands
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            renderLoading()
          ) : shortcuts.length === 0 ? (
            renderEmpty()
          ) : (
            <div className="overflow-x-auto">
              {renderShortcutsTable()}
            </div>
          )}
        </CardContent>
        <CardFooter>
          {renderFormDialog()}
        </CardFooter>
      </Card>
    </div>
  );
}
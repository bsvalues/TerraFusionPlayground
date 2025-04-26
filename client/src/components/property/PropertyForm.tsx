/**
 * PropertyForm Component
 * 
 * Form for editing property details.
 */

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { SyncStatus } from '@terrafusion/offline-sync/src/crdt-sync';
import { PropertyDocState } from '@terrafusion/offline-sync/src/hooks/usePropertyDoc';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Form validation schema
const propertySchema = z.object({
  id: z.string().min(1, { message: 'Property ID is required' }),
  address: z.string().min(1, { message: 'Address is required' }),
  owner: z.string().optional(),
  value: z.number().min(0, { message: 'Value must be a positive number' }).optional(),
  lastInspection: z.string().optional(),
  notes: z.string().optional(),
  features: z.array(z.string()).optional()
});

type PropertyFormValues = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  data: PropertyDocState;
  onSubmit: (data: PropertyFormValues) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  syncStatus: SyncStatus;
}

/**
 * Get a human-readable sync status
 */
const getSyncStatusLabel = (status: SyncStatus): { label: string; color: string } => {
  switch (status) {
    case SyncStatus.SYNCED:
      return { label: 'Synced', color: 'bg-green-500' };
    case SyncStatus.SYNCING:
      return { label: 'Syncing...', color: 'bg-blue-500' };
    case SyncStatus.UNSYNCED:
      return { label: 'Not synced', color: 'bg-yellow-500' };
    case SyncStatus.FAILED:
      return { label: 'Sync failed', color: 'bg-red-500' };
    case SyncStatus.CONFLICT:
      return { label: 'Conflict', color: 'bg-orange-500' };
    default:
      return { label: 'Unknown', color: 'bg-gray-500' };
  }
};

/**
 * Property Form Component
 */
export const PropertyForm: React.FC<PropertyFormProps> = ({
  data,
  onSubmit,
  onCancel,
  readOnly = false,
  syncStatus
}) => {
  // Initialize form with default values
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      id: data.id || '',
      address: data.address || '',
      owner: data.owner || '',
      value: data.value || 0,
      lastInspection: data.lastInspection || '',
      notes: data.notes || '',
      features: data.features || []
    }
  });

  // Update form when data changes
  useEffect(() => {
    form.reset({
      id: data.id || '',
      address: data.address || '',
      owner: data.owner || '',
      value: data.value || 0,
      lastInspection: data.lastInspection || '',
      notes: data.notes || '',
      features: data.features || []
    });
  }, [data, form]);

  // Features input as comma-separated string
  const [featuresInput, setFeaturesInput] = useState(
    data.features ? data.features.join(', ') : ''
  );

  // Update features array when input changes
  const handleFeaturesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setFeaturesInput(input);
    
    // Split by comma and trim each item
    const features = input.split(',').map(item => item.trim()).filter(Boolean);
    form.setValue('features', features);
  };

  // Handle form submission
  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values);
  });

  // Get sync status info
  const syncStatusInfo = getSyncStatusLabel(syncStatus);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Property Details</CardTitle>
          <Badge className={`${syncStatusInfo.color} text-white`}>
            {syncStatusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Property ID (hidden) */}
            <input type="hidden" {...form.register('id')} />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={readOnly} 
                      placeholder="123 Main St, City, State Zip"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Owner */}
            <FormField
              control={form.control}
              name="owner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={readOnly} 
                      placeholder="Property Owner"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Value */}
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      disabled={readOnly} 
                      placeholder="Property Value"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Last Inspection */}
            <FormField
              control={form.control}
              name="lastInspection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Inspection Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      disabled={readOnly} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Features */}
            <FormItem>
              <FormLabel>Features (comma-separated)</FormLabel>
              <FormControl>
                <Input 
                  value={featuresInput}
                  onChange={handleFeaturesChange}
                  disabled={readOnly} 
                  placeholder="3 Bedrooms, 2 Bathrooms, Garage"
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      disabled={readOnly} 
                      placeholder="Additional notes about the property"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form buttons */}
            {!readOnly && (
              <div className="flex justify-end space-x-2 pt-4">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit">Save Property</Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PropertyForm;
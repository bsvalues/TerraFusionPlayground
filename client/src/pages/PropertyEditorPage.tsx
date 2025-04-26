/**
 * PropertyEditorPage
 * 
 * A page for editing property details, demonstrating the offline-first
 * CRDT-based conflict resolution capabilities.
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'wouter';
import { PropertyEditor } from '../components/property/PropertyEditor';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

/**
 * Property Editor Page
 */
export const PropertyEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [readOnly, setReadOnly] = useState(false);
  
  // Handle successful save
  const handleSave = (data: any) => {
    toast({
      title: 'Property Saved',
      description: 'Property details have been saved successfully.',
      duration: 3000
    });
    
    // Navigate back to property list or detail page
    navigate(`/properties`);
  };
  
  // Handle cancel action
  const handleCancel = () => {
    navigate(`/properties`);
  };
  
  // Handle toggle read-only mode
  const handleToggleReadOnly = () => {
    setReadOnly(!readOnly);
  };
  
  // Handle offline test (creates a simulated conflict)
  const simulateConflict = () => {
    // This is a demo function that would be replaced with actual offline sync testing
    toast({
      title: 'Conflict Simulation',
      description: 'This feature would create a simulated conflict for testing in a real implementation.',
      duration: 5000
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {readOnly ? 'View Property' : 'Edit Property'}
        </h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleToggleReadOnly}
          >
            {readOnly ? 'Switch to Edit Mode' : 'Switch to View Mode'}
          </Button>
          <Button
            variant="outline"
            onClick={simulateConflict}
          >
            Simulate Conflict
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            Offline-First Property Editor with CRDT-based Conflict Resolution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This property editor demonstrates TerraFusion's offline-first capabilities. 
            Changes are saved locally using IndexedDB and synchronized with the server 
            when online. Any conflicts are automatically detected and resolved through 
            a user-friendly interface.
          </p>
        </CardContent>
      </Card>
      
      {id ? (
        <PropertyEditor
          propertyId={id}
          onSave={handleSave}
          onCancel={handleCancel}
          readOnly={readOnly}
        />
      ) : (
        <div className="text-center p-8">
          <p>No property ID provided.</p>
          <Button
            onClick={() => navigate('/properties')}
            className="mt-4"
          >
            Back to Properties
          </Button>
        </div>
      )}
    </div>
  );
};

export default PropertyEditorPage;
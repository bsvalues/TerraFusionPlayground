/**
 * PropertyEditorPage
 * 
 * A page for editing property data with conflict resolution.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import PropertyEditor from '../components/property/PropertyEditor';

/**
 * PropertyEditorPage component
 */
const PropertyEditorPage: React.FC = () => {
  // Get property ID from URL
  const [location] = useLocation();
  const params = useParams<{ id: string }>();
  const propertyId = params?.id || 'new';
  
  // State for property data
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch property data
  useEffect(() => {
    const fetchProperty = async () => {
      setIsLoading(true);
      
      try {
        if (propertyId === 'new') {
          // For new properties, set default values
          setProperty({
            id: `property-${Date.now()}`,
            address: '',
            owner: '',
            value: 0,
            lastInspection: new Date().toISOString().split('T')[0],
            notes: '',
            features: []
          });
        } else {
          // For existing properties, fetch from API
          const response = await fetch(`/api/properties/${propertyId}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch property: ${response.statusText}`);
          }
          
          const data = await response.json();
          setProperty(data);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching property:', err);
        setError((err as Error).message);
        setIsLoading(false);
      }
    };
    
    fetchProperty();
  }, [propertyId]);
  
  // Handle save
  const handleSave = async (data: any) => {
    try {
      console.log('Property saved:', data);
      
      // Here you would typically send data to API
      // const response = await fetch(`/api/properties/${data.id}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(data)
      // });
      
      // if (!response.ok) {
      //   throw new Error(`Failed to save property: ${response.statusText}`);
      // }
    } catch (err) {
      console.error('Error saving property:', err);
      setError((err as Error).message);
    }
  };
  
  // If there's an error, display it
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 border rounded-lg bg-red-50 text-red-600">
          <h3 className="font-bold mb-2">Error</h3>
          <p>{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {propertyId === 'new' ? 'New Property' : `Edit Property: ${propertyId}`}
        </h1>
        <p className="text-gray-600">
          {propertyId === 'new'
            ? 'Create a new property with the form below.'
            : 'Edit property details using the form below.'}
        </p>
      </div>
      
      {isLoading ? (
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-between items-center">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={() => window.history.back()}
            >
              Back
            </button>
            
            <div className="text-sm text-gray-500">
              Changes are saved automatically and synced when online.
            </div>
          </div>
          
          <PropertyEditor
            propertyId={property?.id || `property-${Date.now()}`}
            initialData={property}
            onSave={handleSave}
          />
        </>
      )}
    </div>
  );
};

export default PropertyEditorPage;
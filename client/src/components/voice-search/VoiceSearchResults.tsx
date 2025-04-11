import { useState, useEffect } from 'react';
import { Search, Building, Building2, MapPin, Hash, Bed, Bath, CalendarRange, SquareStack, Home, ArrowUpDown } from 'lucide-react';
import { SearchParams } from '../../services/voice-recognition-service';

interface VoiceSearchResultsProps {
  searchText: string;
  searchParams: SearchParams;
  isLoading?: boolean;
}

export function VoiceSearchResults({ searchText, searchParams, isLoading = false }: VoiceSearchResultsProps) {
  // If no search has been performed yet, don't show anything
  if (!searchText && Object.keys(searchParams || {}).length === 0) {
    return null;
  }

  const formatRangeValue = (range: { min?: number; max?: number } | undefined) => {
    if (!range) return 'Any';
    if (range.min && range.max) return `${range.min} - ${range.max}`;
    if (range.min) return `Min: ${range.min}`;
    if (range.max) return `Max: ${range.max}`;
    return 'Any';
  };

  return (
    <div className="voice-search-results bg-white border rounded-lg p-4 shadow-sm mt-4">
      <div className="mb-3">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Search className="h-4 w-4" />
          Voice Search Results
        </h3>
        <p className="text-sm text-muted-foreground">&quot;{searchText}&quot;</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          <span className="ml-2">Searching properties...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {searchParams.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-gray-500" />
              <div>
                <div className="text-xs font-medium text-gray-500">Address</div>
                <div className="text-sm">{searchParams.address}</div>
              </div>
            </div>
          )}

          {searchParams.parcelNumber && (
            <div className="flex items-start gap-2">
              <Hash className="h-4 w-4 mt-1 text-gray-500" />
              <div>
                <div className="text-xs font-medium text-gray-500">Parcel Number</div>
                <div className="text-sm">{searchParams.parcelNumber}</div>
              </div>
            </div>
          )}

          {searchParams.propertyType && (
            <div className="flex items-start gap-2">
              <Building className="h-4 w-4 mt-1 text-gray-500" />
              <div>
                <div className="text-xs font-medium text-gray-500">Property Type</div>
                <div className="text-sm">{searchParams.propertyType}</div>
              </div>
            </div>
          )}

          {searchParams.priceRange && (
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 mt-1 text-gray-500" />
              <div>
                <div className="text-xs font-medium text-gray-500">Price Range</div>
                <div className="text-sm">{formatRangeValue(searchParams.priceRange)}</div>
              </div>
            </div>
          )}

          {searchParams.area && (
            <div className="flex items-start gap-2">
              <SquareStack className="h-4 w-4 mt-1 text-gray-500" />
              <div>
                <div className="text-xs font-medium text-gray-500">Area</div>
                <div className="text-sm">{formatRangeValue(searchParams.area)}</div>
              </div>
            </div>
          )}

          {searchParams.bedrooms !== undefined && (
            <div className="flex items-start gap-2">
              <Bed className="h-4 w-4 mt-1 text-gray-500" />
              <div>
                <div className="text-xs font-medium text-gray-500">Bedrooms</div>
                <div className="text-sm">{searchParams.bedrooms}</div>
              </div>
            </div>
          )}

          {searchParams.bathrooms !== undefined && (
            <div className="flex items-start gap-2">
              <Bath className="h-4 w-4 mt-1 text-gray-500" />
              <div>
                <div className="text-xs font-medium text-gray-500">Bathrooms</div>
                <div className="text-sm">{searchParams.bathrooms}</div>
              </div>
            </div>
          )}

          {searchParams.yearBuilt && (
            <div className="flex items-start gap-2">
              <CalendarRange className="h-4 w-4 mt-1 text-gray-500" />
              <div>
                <div className="text-xs font-medium text-gray-500">Year Built</div>
                <div className="text-sm">{formatRangeValue(searchParams.yearBuilt)}</div>
              </div>
            </div>
          )}

          {searchParams.features && searchParams.features.length > 0 && (
            <div className="flex items-start gap-2">
              <Home className="h-4 w-4 mt-1 text-gray-500" />
              <div>
                <div className="text-xs font-medium text-gray-500">Features</div>
                <div className="text-sm">{searchParams.features.join(', ')}</div>
              </div>
            </div>
          )}

          {searchParams.sortBy && (
            <div className="flex items-start gap-2">
              <ArrowUpDown className="h-4 w-4 mt-1 text-gray-500" />
              <div>
                <div className="text-xs font-medium text-gray-500">Sort By</div>
                <div className="text-sm">{searchParams.sortBy}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { VoiceSearchButton } from './VoiceSearchButton';
import { VoiceSearchResults } from './VoiceSearchResults';
import { VoiceTranscriptionResponse, SearchParams } from '../../services/voice-recognition-service';

interface VoiceSearchProps {
  onSearch?: (searchParams: SearchParams) => void;
}

export function VoiceSearch({ onSearch }: VoiceSearchProps) {
  const [searchText, setSearchText] = useState<string>('');
  const [searchParams, setSearchParams] = useState<SearchParams>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSearchResult = (text: string, params: SearchParams) => {
    setSearchText(text);
    setSearchParams(params);
    setIsLoading(false);
    
    // If a parent component wants to be notified about search
    if (onSearch) {
      onSearch(params);
    }
  };

  return (
    <div className="voice-search">
      <div className="flex flex-col items-center gap-2">
        <div className="text-center mb-2">
          <h2 className="text-lg font-medium">Voice-Enabled Property Search</h2>
          <p className="text-sm text-muted-foreground">
            Click the button and speak to search for properties
          </p>
        </div>
        
        <VoiceSearchButton 
          onSearchResult={handleSearchResult} 
        />
        
        <div className="w-full mt-2">
          <VoiceSearchResults 
            searchText={searchText} 
            searchParams={searchParams}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
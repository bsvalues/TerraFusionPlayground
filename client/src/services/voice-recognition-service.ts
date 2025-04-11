/**
 * Voice Recognition Service
 * 
 * This service handles the communication with the server-side voice recognition API,
 * including transcribing audio and parsing natural language queries into structured
 * search parameters.
 */

// Price range parameters
export interface PriceRange {
  min?: number;
  max?: number;
}

// Area range parameters (in square feet or acres)
export interface AreaRange {
  min?: number;
  max?: number;
}

// Year built range parameters
export interface YearBuiltRange {
  min?: number;
  max?: number;
}

// Search parameters extracted from voice query
export interface SearchParams {
  address?: string;
  parcelNumber?: string;
  propertyType?: string;
  priceRange?: PriceRange;
  area?: AreaRange;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: YearBuiltRange;
  features?: string[];
  sortBy?: string;
}

// Combined response from voice recognition
export interface VoiceTranscriptionResponse {
  text: string;
  searchParams: SearchParams;
}

class VoiceRecognitionService {
  /**
   * Transcribe an audio file using OpenAI's Whisper through our API
   * @param audioBase64 Base64 encoded audio data
   * @returns Transcription result with extracted search parameters
   */
  public async transcribeAudio(audioBase64: string): Promise<VoiceTranscriptionResponse | null> {
    try {
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio: audioBase64 }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Transcription error:', errorText);
        throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return null;
    }
  }

  /**
   * Parse text directly without audio transcription
   * Useful for testing or when text is already available
   */
  public async parseQuery(text: string): Promise<VoiceTranscriptionResponse | null> {
    try {
      const response = await fetch('/api/voice/parse-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Parse query error:', errorText);
        throw new Error(`Parse query failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error parsing query:', error);
      return null;
    }
  }
}

// Export singleton instance
export const voiceRecognitionService = new VoiceRecognitionService();
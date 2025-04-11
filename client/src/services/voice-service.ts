/**
 * Voice Service
 * 
 * This service handles voice recording in the browser, including:
 * - Requesting microphone permissions
 * - Starting and stopping recordings
 * - Converting audio to formats for processing
 */

export type RecordingState = 'idle' | 'recording' | 'processing';

class VoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private setStateCallback: ((state: RecordingState) => void) | null = null;

  /**
   * Initialize the voice service by requesting microphone permissions
   */
  public async initialize(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      return false;
    }
  }

  /**
   * Start recording audio from the microphone
   */
  public startRecording(setStateCallback: (state: RecordingState) => void): void {
    if (!this.stream) {
      console.error('Microphone stream not initialized. Call initialize() first.');
      return;
    }

    this.setStateCallback = setStateCallback;
    this.audioChunks = [];

    const options = {
      mimeType: 'audio/webm',
    };

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, options);
    } catch (err) {
      console.error('MediaRecorder error:', err);
      return;
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstart = () => {
      this.setStateCallback?.('recording');
    };

    this.mediaRecorder.start();
  }

  /**
   * Stop recording and return the audio blob
   */
  public async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        this.setStateCallback?.('processing');
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Convert an audio blob to a base64 string for transmission
   */
  public async audioToBase64(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
          const base64Data = reader.result.split(',')[1];
          resolve(base64Data);
        } else {
          reject(new Error('Failed to convert audio to base64'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading audio file'));
      };
      reader.readAsDataURL(audioBlob);
    });
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.setStateCallback = null;
  }
}

// Create a singleton instance
export const voiceService = new VoiceService();
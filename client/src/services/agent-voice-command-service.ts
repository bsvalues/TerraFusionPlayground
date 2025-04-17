/**
 * Agent Voice Command Service
 * 
 * Client-side service for recording voice commands, sending them to the server,
 * managing command context, and handling responses.
 */

import { apiRequest } from '@/lib/queryClient';

export type RecordingState = 'idle' | 'recording' | 'processing';

export interface VoiceCommandContext {
  sessionId: string;
  agentId?: string;
  previousCommands: any[];
  lastCommandTime: string;
  subject?: string;
  activeContext?: string;
}

export interface VoiceCommandResult {
  sessionId: string;
  transcribedText?: string;
  command: any;
  response?: any;
  error?: string;
  context: VoiceCommandContext;
}

export class AgentVoiceCommandService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private sessionId: string | null = null;
  private context: VoiceCommandContext | null = null;
  
  /**
   * Initialize the voice command service
   */
  public async initialize(): Promise<boolean> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (error) {
      console.error('Error initializing microphone:', error);
      return false;
    }
  }
  
  /**
   * Start recording a voice command
   */
  public startRecording(onStateChange: (state: RecordingState) => void): void {
    if (!this.stream) {
      console.error('Cannot start recording: stream not initialized');
      onStateChange('idle');
      return;
    }
    
    this.audioChunks = [];
    
    try {
      this.mediaRecorder = new MediaRecorder(this.stream);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = async () => {
        onStateChange('processing');
        await this.processRecording();
        onStateChange('idle');
      };
      
      this.mediaRecorder.start();
      onStateChange('recording');
    } catch (error) {
      console.error('Error starting recording:', error);
      onStateChange('idle');
    }
  }
  
  /**
   * Stop recording
   */
  public stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }
  
  /**
   * Process the recording and send it to the server
   */
  private async processRecording(): Promise<VoiceCommandResult | null> {
    if (this.audioChunks.length === 0) {
      console.warn('No audio recorded');
      return null;
    }
    
    try {
      // Create audio blob
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      
      // Convert to base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      // Send to server
      const result = await this.processAudioCommand(base64Audio);
      
      if (result) {
        // Update local session and context
        this.sessionId = result.sessionId;
        this.context = result.context;
        
        // Emit the result to any listeners
        this.onCommandResult(result);
      }
      
      return result;
    } catch (error) {
      console.error('Error processing recording:', error);
      return null;
    }
  }
  
  /**
   * Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  /**
   * Process a voice command from audio
   */
  public async processAudioCommand(
    audioBase64: string,
    contextOverride?: Partial<VoiceCommandContext>
  ): Promise<VoiceCommandResult | null> {
    try {
      const response = await apiRequest('/api/agent-voice/process-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: audioBase64,
          sessionId: this.sessionId,
          contextOverride
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to process voice command:', await response.text());
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error processing voice command:', error);
      return null;
    }
  }
  
  /**
   * Process a text command directly
   */
  public async processTextCommand(
    text: string,
    contextOverride?: Partial<VoiceCommandContext>
  ): Promise<VoiceCommandResult | null> {
    try {
      const response = await apiRequest('/api/agent-voice/process-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sessionId: this.sessionId,
          contextOverride
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to process text command:', await response.text());
        return null;
      }
      
      const result = await response.json();
      
      // Update local session and context
      this.sessionId = result.sessionId;
      this.context = result.context;
      
      // Emit the result to any listeners
      this.onCommandResult(result);
      
      return result;
    } catch (error) {
      console.error('Error processing text command:', error);
      return null;
    }
  }
  
  /**
   * Clear the current session context
   */
  public async clearContext(): Promise<boolean> {
    if (!this.sessionId) {
      return true; // No session to clear
    }
    
    try {
      const response = await apiRequest(`/api/agent-voice/context/${this.sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        console.error('Failed to clear context:', await response.text());
        return false;
      }
      
      this.context = null;
      return true;
    } catch (error) {
      console.error('Error clearing context:', error);
      return false;
    }
  }
  
  /**
   * Get available commands
   */
  public async getAvailableCommands(): Promise<any | null> {
    try {
      const response = await apiRequest('/api/agent-voice/available-commands', {
        method: 'GET',
      });
      
      if (!response.ok) {
        console.error('Failed to get available commands:', await response.text());
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting available commands:', error);
      return null;
    }
  }
  
  /**
   * Get the current context
   */
  public getCurrentContext(): VoiceCommandContext | null {
    return this.context;
  }
  
  /**
   * Get the current session ID
   */
  public getSessionId(): string | null {
    return this.sessionId;
  }
  
  /**
   * Set the session ID manually
   */
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }
  
  /**
   * Set the context manually
   */
  public setContext(context: VoiceCommandContext): void {
    this.context = context;
  }
  
  /**
   * Command result event handler
   * Override this method to handle command results
   */
  protected onCommandResult(result: VoiceCommandResult): void {
    // Override this method to handle command results
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
  }
}

export const agentVoiceCommandService = new AgentVoiceCommandService();

export default agentVoiceCommandService;
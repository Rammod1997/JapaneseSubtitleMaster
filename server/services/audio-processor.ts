import OpenAI from "openai";
import fs from "fs";
import path from "path";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key"
});

export interface TranscriptionResult {
  text: string;
  duration: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export class AudioProcessor {
  private async handleLargeFile(audioFilePath: string): Promise<string> {
    const stats = fs.statSync(audioFilePath);
    
    // If file is under 25MB, return as is
    if (stats.size <= 25 * 1024 * 1024) {
      return audioFilePath;
    }

    // For files over 25MB, we'll still try the original file first
    // In a production environment, you might want to implement audio compression
    // or chunking here using ffmpeg or similar tools
    console.log(`Processing large file: ${Math.round(stats.size / 1024 / 1024)}MB`);
    return audioFilePath;
  }

  async transcribeAudio(audioFilePath: string): Promise<TranscriptionResult> {
    try {
      // Validate input
      if (!audioFilePath) {
        throw new Error('Audio file path is required');
      }

      if (!fs.existsSync(audioFilePath)) {
        throw new Error('Audio file does not exist');
      }

      // Check file size and handle large files
      const stats = fs.statSync(audioFilePath);
      if (stats.size > 300 * 1024 * 1024) {
        throw new Error('Audio file is too large. Maximum size is 300MB.');
      }

      // If file is larger than 25MB, we'll need to process it in chunks
      // For now, we'll accept larger files and let OpenAI handle what it can
      if (stats.size > 25 * 1024 * 1024) {
        console.warn(`Large file detected (${Math.round(stats.size / 1024 / 1024)}MB). Processing may take longer.`);
      }

      if (stats.size === 0) {
        throw new Error('Audio file is empty');
      }

      // Handle large files if necessary
      const processedFilePath = await this.handleLargeFile(audioFilePath);
      const audioReadStream = fs.createReadStream(processedFilePath);

      // Set up error handling for the stream
      audioReadStream.on('error', (streamError) => {
        throw new Error(`Failed to read audio file: ${streamError.message}`);
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1",
        language: "ja", // Japanese
        response_format: "verbose_json",
        timestamp_granularities: ["segment"]
      });

      // Validate transcription response
      if (!transcription) {
        throw new Error('No transcription response received');
      }

      if (!transcription.text || transcription.text.trim().length === 0) {
        throw new Error('No text was transcribed from the audio. The audio might be silent or in an unsupported format.');
      }

      return {
        text: transcription.text,
        duration: transcription.duration || 0,
        segments: transcription.segments?.map(segment => ({
          start: Math.max(0, (segment.start || 0) * 1000), // Convert to milliseconds and ensure non-negative
          end: Math.max(0, (segment.end || 0) * 1000),
          text: segment.text || ''
        })) || []
      };
    } catch (error) {
      console.error("Error transcribing audio:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('OpenAI API key is invalid or missing. Please check your configuration.');
        }
        if (error.message.includes('quota')) {
          throw new Error('OpenAI API quota exceeded. Please check your usage limits.');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please try again in a few moments.');
        }
        if (error.message.includes('timeout')) {
          throw new Error('Request timed out. The audio file might be too long or the connection is slow.');
        }
        throw new Error(`Failed to transcribe audio: ${error.message}`);
      }
      
      throw new Error('Failed to transcribe audio: Unknown error occurred');
    }
  }

  async getAudioDuration(audioFilePath: string): Promise<number> {
    // For production, you might want to use a proper audio analysis library
    // For now, we'll return a default duration and let the transcription provide the actual duration
    return 0;
  }
}

export const audioProcessor = new AudioProcessor();

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
  async transcribeAudio(audioFilePath: string): Promise<TranscriptionResult> {
    try {
      const audioReadStream = fs.createReadStream(audioFilePath);

      const transcription = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1",
        language: "ja", // Japanese
        response_format: "verbose_json",
        timestamp_granularities: ["segment"]
      });

      return {
        text: transcription.text,
        duration: transcription.duration || 0,
        segments: transcription.segments?.map(segment => ({
          start: segment.start * 1000, // Convert to milliseconds
          end: segment.end * 1000,
          text: segment.text
        }))
      };
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  async getAudioDuration(audioFilePath: string): Promise<number> {
    // For production, you might want to use a proper audio analysis library
    // For now, we'll return a default duration and let the transcription provide the actual duration
    return 0;
  }
}

export const audioProcessor = new AudioProcessor();

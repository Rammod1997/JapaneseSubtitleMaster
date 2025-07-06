import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { audioProcessor } from "./services/audio-processor";
import { translationService } from "./services/translation";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 300 * 1024 * 1024 // 300MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP3, WAV, and M4A files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
    });
  });
  
  // Broadcast updates to all connected clients
  const broadcast = (message: any) => {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };

  // Upload audio file
  app.post('/api/upload', upload.single('audio'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const audioFile = await storage.createAudioFile({
        filename: req.file.filename,
        originalName: req.file.originalname,
        status: 'uploaded'
      });

      // Start processing job
      const job = await storage.createProcessingJob({
        audioFileId: audioFile.id,
        stage: 'transcription',
        progress: 0,
        status: 'pending'
      });

      // Start processing asynchronously
      processAudioFile(audioFile.id, req.file.path, broadcast);

      res.json({ audioFile, job });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Get audio file details
  app.get('/api/audio/:id', async (req, res) => {
    try {
      const audioFile = await storage.getAudioFile(parseInt(req.params.id));
      if (!audioFile) {
        return res.status(404).json({ error: 'Audio file not found' });
      }
      res.json(audioFile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get audio file' });
    }
  });

  // Get subtitles for audio file
  app.get('/api/audio/:id/subtitles', async (req, res) => {
    try {
      const subtitles = await storage.getSubtitlesByAudioFile(parseInt(req.params.id));
      res.json(subtitles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get subtitles' });
    }
  });

  // Update subtitle
  app.patch('/api/subtitles/:id', async (req, res) => {
    try {
      const { japaneseText, englishText, startTime, endTime } = req.body;
      await storage.updateSubtitle(parseInt(req.params.id), {
        japaneseText,
        englishText,
        startTime,
        endTime
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update subtitle' });
    }
  });

  // Download SRT file
  app.get('/api/audio/:id/download-srt', async (req, res) => {
    try {
      const audioFile = await storage.getAudioFile(parseInt(req.params.id));
      if (!audioFile) {
        return res.status(404).json({ error: 'Audio file not found' });
      }

      const subtitles = await storage.getSubtitlesByAudioFile(parseInt(req.params.id));
      const srtContent = generateSRT(subtitles);

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${audioFile.originalName}.srt"`);
      res.send(srtContent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate SRT file' });
    }
  });

  // Get recent files
  app.get('/api/recent-files', async (req, res) => {
    try {
      const files = await storage.getRecentAudioFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get recent files' });
    }
  });

  // Get active processing jobs
  app.get('/api/processing-jobs', async (req, res) => {
    try {
      const jobs = await storage.getActiveProcessingJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get processing jobs' });
    }
  });

  return httpServer;
}

async function processAudioFile(audioFileId: number, filePath: string, broadcast: (message: any) => void) {
  let job: any = null;
  
  try {
    // Validate inputs
    if (!audioFileId || !filePath) {
      throw new Error('Invalid parameters: audioFileId and filePath are required');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('Audio file not found');
    }

    // Update job status
    job = await storage.createProcessingJob({
      audioFileId,
      stage: 'transcription',
      progress: 0,
      status: 'processing'
    });

    broadcast({
      type: 'processing-update',
      audioFileId,
      stage: 'transcription',
      progress: 0,
      status: 'processing'
    });

    // Step 1: Transcribe audio with retry logic
    let transcriptionResult;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        transcriptionResult = await audioProcessor.transcribeAudio(filePath);
        break;
      } catch (transcriptionError) {
        retryCount++;
        console.warn(`Transcription attempt ${retryCount} failed:`, transcriptionError);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Transcription failed after ${maxRetries} attempts: ${transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error'}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    if (!transcriptionResult) {
      throw new Error('Transcription failed: No result obtained');
    }
    
    // Update audio file with duration
    await storage.updateAudioFileStatus(audioFileId, 'transcribing');
    
    await storage.updateProcessingJob(job.id, {
      stage: 'transcription',
      progress: 50,
      status: 'processing'
    });

    broadcast({
      type: 'processing-update',
      audioFileId,
      stage: 'transcription',
      progress: 50,
      status: 'processing'
    });

    // Step 2: Translation with error handling
    await storage.updateProcessingJob(job.id, {
      stage: 'translation',
      progress: 60,
      status: 'processing'
    });

    broadcast({
      type: 'processing-update',
      audioFileId,
      stage: 'translation',
      progress: 60,
      status: 'processing'
    });

    // Process segments or full text safely
    const segments = transcriptionResult.segments && transcriptionResult.segments.length > 0 
      ? transcriptionResult.segments 
      : [{
          start: 0,
          end: (transcriptionResult.duration || 30) * 1000,
          text: transcriptionResult.text || 'No transcription available'
        }];

    if (segments.length === 0) {
      throw new Error('No audio segments found to translate');
    }

    const translationTexts = segments.map(segment => segment.text).filter(text => text && text.trim());
    
    if (translationTexts.length === 0) {
      throw new Error('No valid text found for translation');
    }

    let translations;
    try {
      translations = await translationService.translateBatch(translationTexts);
    } catch (translationError) {
      console.error('Translation failed:', translationError);
      throw new Error(`Translation failed: ${translationError instanceof Error ? translationError.message : 'Unknown translation error'}`);
    }

    // Step 3: Generate subtitles
    await storage.updateProcessingJob(job.id, {
      stage: 'subtitle_generation',
      progress: 80,
      status: 'processing'
    });

    broadcast({
      type: 'processing-update',
      audioFileId,
      stage: 'subtitle_generation',
      progress: 80,
      status: 'processing'
    });

    // Create subtitle entries with validation
    const validTranslations = translations.filter(t => t && t.translatedText);
    
    if (validTranslations.length === 0) {
      throw new Error('No valid translations generated');
    }

    for (let i = 0; i < Math.min(segments.length, validTranslations.length); i++) {
      const segment = segments[i];
      const translation = validTranslations[i];

      if (!segment || !translation) continue;

      try {
        await storage.createSubtitle({
          audioFileId,
          startTime: Math.max(0, segment.start || 0),
          endTime: Math.max(segment.start || 0, segment.end || 1000),
          japaneseText: segment.text || 'No text',
          englishText: translation.translatedText || 'No translation'
        });
      } catch (subtitleError) {
        console.error(`Failed to create subtitle ${i}:`, subtitleError);
        // Continue with other subtitles even if one fails
      }
    }

    // Complete processing
    await storage.updateAudioFileStatus(audioFileId, 'completed');
    await storage.updateProcessingJob(job.id, {
      stage: 'completed',
      progress: 100,
      status: 'completed'
    });

    broadcast({
      type: 'processing-complete',
      audioFileId,
      stage: 'completed',
      progress: 100,
      status: 'completed'
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

  } catch (error) {
    console.error('Processing error:', error);
    
    // Safely update audio file status
    try {
      await storage.updateAudioFileStatus(audioFileId, 'failed');
    } catch (updateError) {
      console.error('Failed to update audio file status:', updateError);
    }
    
    // Safely update processing job
    try {
      const jobs = await storage.getActiveProcessingJobs();
      const currentJob = jobs.find(j => j.audioFileId === audioFileId) || job;
      
      if (currentJob) {
        await storage.updateProcessingJob(currentJob.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown processing error'
        });
      }
    } catch (jobUpdateError) {
      console.error('Failed to update processing job:', jobUpdateError);
    }

    // Safely broadcast error
    try {
      broadcast({
        type: 'processing-error',
        audioFileId,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      });
    } catch (broadcastError) {
      console.error('Failed to broadcast error:', broadcastError);
    }

    // Safely clean up uploaded file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      console.error('Failed to clean up file:', cleanupError);
    }
  }
}

function generateSRT(subtitles: any[]): string {
  return subtitles.map((subtitle, index) => {
    const startTime = formatSRTTime(subtitle.startTime);
    const endTime = formatSRTTime(subtitle.endTime);
    
    return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.englishText}\n`;
  }).join('\n');
}

function formatSRTTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

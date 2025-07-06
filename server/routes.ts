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
  file?: multer.File;
}

const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
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
  try {
    // Update job status
    const job = await storage.createProcessingJob({
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

    // Step 1: Transcribe audio
    const transcriptionResult = await audioProcessor.transcribeAudio(filePath);
    
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

    // Step 2: Translation
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

    // Process segments or full text
    const segments = transcriptionResult.segments || [{
      start: 0,
      end: transcriptionResult.duration * 1000,
      text: transcriptionResult.text
    }];

    const translationTexts = segments.map(segment => segment.text);
    const translations = await translationService.translateBatch(translationTexts);

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

    // Create subtitle entries
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const translation = translations[i];

      await storage.createSubtitle({
        audioFileId,
        startTime: segment.start,
        endTime: segment.end,
        japaneseText: segment.text,
        englishText: translation.translatedText
      });
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
    
    await storage.updateAudioFileStatus(audioFileId, 'failed');
    
    const jobs = await storage.getActiveProcessingJobs();
    const currentJob = jobs.find(j => j.audioFileId === audioFileId);
    
    if (currentJob) {
      await storage.updateProcessingJob(currentJob.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    broadcast({
      type: 'processing-error',
      audioFileId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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

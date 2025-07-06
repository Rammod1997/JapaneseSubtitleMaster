import { audioFiles, subtitles, processingJobs, type AudioFile, type InsertAudioFile, type Subtitle, type InsertSubtitle, type ProcessingJob, type InsertProcessingJob } from "@shared/schema";

export interface IStorage {
  // Audio Files
  createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile>;
  getAudioFile(id: number): Promise<AudioFile | undefined>;
  updateAudioFileStatus(id: number, status: string): Promise<void>;
  getRecentAudioFiles(): Promise<AudioFile[]>;
  
  // Subtitles
  createSubtitle(subtitle: InsertSubtitle): Promise<Subtitle>;
  getSubtitlesByAudioFile(audioFileId: number): Promise<Subtitle[]>;
  updateSubtitle(id: number, subtitle: Partial<Subtitle>): Promise<void>;
  
  // Processing Jobs
  createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  getProcessingJob(id: number): Promise<ProcessingJob | undefined>;
  updateProcessingJob(id: number, updates: Partial<ProcessingJob>): Promise<void>;
  getActiveProcessingJobs(): Promise<ProcessingJob[]>;
}

export class MemStorage implements IStorage {
  private audioFiles: Map<number, AudioFile> = new Map();
  private subtitles: Map<number, Subtitle> = new Map();
  private processingJobs: Map<number, ProcessingJob> = new Map();
  private currentAudioFileId = 1;
  private currentSubtitleId = 1;
  private currentJobId = 1;

  // Audio Files
  async createAudioFile(insertAudioFile: InsertAudioFile): Promise<AudioFile> {
    const id = this.currentAudioFileId++;
    const audioFile: AudioFile = {
      ...insertAudioFile,
      id,
      duration: insertAudioFile.duration || null,
      status: insertAudioFile.status || 'uploaded',
      createdAt: new Date(),
    };
    this.audioFiles.set(id, audioFile);
    return audioFile;
  }

  async getAudioFile(id: number): Promise<AudioFile | undefined> {
    return this.audioFiles.get(id);
  }

  async updateAudioFileStatus(id: number, status: string): Promise<void> {
    const audioFile = this.audioFiles.get(id);
    if (audioFile) {
      audioFile.status = status;
      this.audioFiles.set(id, audioFile);
    }
  }

  async getRecentAudioFiles(): Promise<AudioFile[]> {
    return Array.from(this.audioFiles.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);
  }

  // Subtitles
  async createSubtitle(insertSubtitle: InsertSubtitle): Promise<Subtitle> {
    const id = this.currentSubtitleId++;
    const subtitle: Subtitle = {
      ...insertSubtitle,
      id,
      createdAt: new Date(),
    };
    this.subtitles.set(id, subtitle);
    return subtitle;
  }

  async getSubtitlesByAudioFile(audioFileId: number): Promise<Subtitle[]> {
    return Array.from(this.subtitles.values())
      .filter(subtitle => subtitle.audioFileId === audioFileId)
      .sort((a, b) => a.startTime - b.startTime);
  }

  async updateSubtitle(id: number, updates: Partial<Subtitle>): Promise<void> {
    const subtitle = this.subtitles.get(id);
    if (subtitle) {
      Object.assign(subtitle, updates);
      this.subtitles.set(id, subtitle);
    }
  }

  // Processing Jobs
  async createProcessingJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    const id = this.currentJobId++;
    const job: ProcessingJob = {
      ...insertJob,
      id,
      status: insertJob.status || 'pending',
      progress: insertJob.progress || 0,
      error: insertJob.error || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.processingJobs.set(id, job);
    return job;
  }

  async getProcessingJob(id: number): Promise<ProcessingJob | undefined> {
    return this.processingJobs.get(id);
  }

  async updateProcessingJob(id: number, updates: Partial<ProcessingJob>): Promise<void> {
    const job = this.processingJobs.get(id);
    if (job) {
      Object.assign(job, updates);
      job.updatedAt = new Date();
      this.processingJobs.set(id, job);
    }
  }

  async getActiveProcessingJobs(): Promise<ProcessingJob[]> {
    return Array.from(this.processingJobs.values())
      .filter(job => job.status === "pending" || job.status === "processing");
  }
}

export const storage = new MemStorage();

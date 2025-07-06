import { audioFiles, subtitles, processingJobs, type AudioFile, type InsertAudioFile, type Subtitle, type InsertSubtitle, type ProcessingJob, type InsertProcessingJob } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<any | undefined> {
    // User functionality not implemented yet
    return undefined;
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    // User functionality not implemented yet
    return undefined;
  }

  async createUser(insertUser: any): Promise<any> {
    // User functionality not implemented yet
    throw new Error('User functionality not implemented');
  }

  // Audio Files
  async createAudioFile(insertAudioFile: InsertAudioFile): Promise<AudioFile> {
    try {
      const [audioFile] = await db
        .insert(audioFiles)
        .values({
          ...insertAudioFile,
          duration: insertAudioFile.duration || null,
          status: insertAudioFile.status || 'uploaded'
        })
        .returning();
      return audioFile;
    } catch (error) {
      console.error('Failed to create audio file:', error);
      throw new Error('Failed to create audio file in database');
    }
  }

  async getAudioFile(id: number): Promise<AudioFile | undefined> {
    try {
      const [audioFile] = await db.select().from(audioFiles).where(eq(audioFiles.id, id));
      return audioFile || undefined;
    } catch (error) {
      console.error('Failed to get audio file:', error);
      return undefined;
    }
  }

  async updateAudioFileStatus(id: number, status: string): Promise<void> {
    try {
      await db
        .update(audioFiles)
        .set({ status })
        .where(eq(audioFiles.id, id));
    } catch (error) {
      console.error('Failed to update audio file status:', error);
      throw new Error('Failed to update audio file status');
    }
  }

  async getRecentAudioFiles(): Promise<AudioFile[]> {
    try {
      const files = await db
        .select()
        .from(audioFiles)
        .orderBy(desc(audioFiles.createdAt))
        .limit(10);
      return files;
    } catch (error) {
      console.error('Failed to get recent audio files:', error);
      return [];
    }
  }

  // Subtitles
  async createSubtitle(insertSubtitle: InsertSubtitle): Promise<Subtitle> {
    try {
      const [subtitle] = await db
        .insert(subtitles)
        .values(insertSubtitle)
        .returning();
      return subtitle;
    } catch (error) {
      console.error('Failed to create subtitle:', error);
      throw new Error('Failed to create subtitle in database');
    }
  }

  async getSubtitlesByAudioFile(audioFileId: number): Promise<Subtitle[]> {
    try {
      const subtitleList = await db
        .select()
        .from(subtitles)
        .where(eq(subtitles.audioFileId, audioFileId))
        .orderBy(subtitles.startTime);
      return subtitleList;
    } catch (error) {
      console.error('Failed to get subtitles:', error);
      return [];
    }
  }

  async updateSubtitle(id: number, updates: Partial<Subtitle>): Promise<void> {
    try {
      await db
        .update(subtitles)
        .set(updates)
        .where(eq(subtitles.id, id));
    } catch (error) {
      console.error('Failed to update subtitle:', error);
      throw new Error('Failed to update subtitle');
    }
  }

  // Processing Jobs
  async createProcessingJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    try {
      const [job] = await db
        .insert(processingJobs)
        .values({
          ...insertJob,
          status: insertJob.status || 'pending',
          progress: insertJob.progress || 0,
          error: insertJob.error || null
        })
        .returning();
      return job;
    } catch (error) {
      console.error('Failed to create processing job:', error);
      throw new Error('Failed to create processing job in database');
    }
  }

  async getProcessingJob(id: number): Promise<ProcessingJob | undefined> {
    try {
      const [job] = await db.select().from(processingJobs).where(eq(processingJobs.id, id));
      return job || undefined;
    } catch (error) {
      console.error('Failed to get processing job:', error);
      return undefined;
    }
  }

  async updateProcessingJob(id: number, updates: Partial<ProcessingJob>): Promise<void> {
    try {
      await db
        .update(processingJobs)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(processingJobs.id, id));
    } catch (error) {
      console.error('Failed to update processing job:', error);
      throw new Error('Failed to update processing job');
    }
  }

  async getActiveProcessingJobs(): Promise<ProcessingJob[]> {
    try {
      const jobs = await db
        .select()
        .from(processingJobs)
        .where(eq(processingJobs.status, 'processing'))
        .orderBy(desc(processingJobs.createdAt));
      return jobs;
    } catch (error) {
      console.error('Failed to get active processing jobs:', error);
      return [];
    }
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();

import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const audioFiles = pgTable("audio_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  duration: integer("duration"), // in seconds
  status: text("status").notNull().default("uploaded"), // uploaded, processing, completed, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subtitles = pgTable("subtitles", {
  id: serial("id").primaryKey(),
  audioFileId: integer("audio_file_id").notNull(),
  startTime: integer("start_time").notNull(), // in milliseconds
  endTime: integer("end_time").notNull(), // in milliseconds
  japaneseText: text("japanese_text").notNull(),
  englishText: text("english_text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const processingJobs = pgTable("processing_jobs", {
  id: serial("id").primaryKey(),
  audioFileId: integer("audio_file_id").notNull(),
  stage: text("stage").notNull(), // transcription, translation, subtitle_generation
  progress: integer("progress").notNull().default(0), // 0-100
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAudioFileSchema = createInsertSchema(audioFiles).omit({
  id: true,
  createdAt: true,
});

export const insertSubtitleSchema = createInsertSchema(subtitles).omit({
  id: true,
  createdAt: true,
});

export const insertProcessingJobSchema = createInsertSchema(processingJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AudioFile = typeof audioFiles.$inferSelect;
export type InsertAudioFile = z.infer<typeof insertAudioFileSchema>;
export type Subtitle = typeof subtitles.$inferSelect;
export type InsertSubtitle = z.infer<typeof insertSubtitleSchema>;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;

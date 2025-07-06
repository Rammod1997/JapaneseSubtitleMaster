# Japanese Audio Subtitle Generator

## Overview

This is a full-stack web application that converts Japanese audio files into bilingual subtitles. Users can upload audio files (MP3, WAV, M4A), and the system will automatically transcribe the Japanese speech, translate it to English, and generate synchronized subtitles. The application features a modern React frontend with shadcn/ui components and an Express.js backend with real-time WebSocket updates.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration for monorepo structure
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Real-time Updates**: WebSocket connection for processing progress

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **File Upload**: Multer middleware with file validation
- **Real-time Communication**: WebSocket Server for live updates
- **Development**: Hot reloading with Vite middleware integration

## Key Components

### Audio Processing Pipeline
1. **File Upload**: Handles MP3, WAV, and M4A files with size limits (100MB)
2. **Speech Recognition**: OpenAI Whisper API for Japanese audio transcription
3. **Translation**: Google Cloud Translate API with OpenAI fallback
4. **Subtitle Generation**: Creates synchronized subtitle tracks with timing information

### Database Schema
- **Audio Files**: Stores uploaded file metadata and processing status
- **Subtitles**: Contains timestamped Japanese and English text segments
- **Processing Jobs**: Tracks multi-stage processing progress and status

### UI Components
- **File Upload**: Drag-and-drop interface with progress tracking
- **Audio Waveform**: Visual audio playback with timeline control
- **Processing Progress**: Real-time status updates for each processing stage
- **Subtitle Preview**: Editable subtitle display with export functionality

## Data Flow

1. User uploads audio file through drag-and-drop interface
2. File is validated and stored on server with metadata in database
3. Processing job is created and queued for execution
4. WebSocket connection provides real-time progress updates
5. Audio is transcribed using OpenAI Whisper API
6. Japanese text is translated to English using Google Translate
7. Subtitles are generated with precise timing information
8. User can preview, edit, and export the final subtitles

## External Dependencies

### Third-Party APIs
- **OpenAI API**: Whisper model for speech-to-text transcription
- **Google Cloud Translate**: Japanese to English translation service
- **Neon Database**: Serverless PostgreSQL hosting

### Key Libraries
- **Audio Processing**: OpenAI SDK for Whisper integration
- **Translation**: Google Cloud Translate SDK
- **Database**: Drizzle ORM with PostgreSQL adapter
- **File Handling**: Multer for multipart form uploads
- **Real-time**: WebSocket Server for live updates
- **UI Components**: Radix UI primitives with shadcn/ui styling

## Deployment Strategy

### Development Environment
- Vite development server with hot module replacement
- TypeScript compilation with path aliases
- Environment variable management for API keys
- Replit-specific configurations for cloud development

### Production Build
- Vite builds client-side React application
- esbuild bundles server code for Node.js runtime
- Static assets served from Express with proper routing
- Database migrations managed through Drizzle Kit

### Environment Configuration
- Database connection via DATABASE_URL environment variable
- API keys for OpenAI and Google Cloud services
- Development-specific Replit integration scripts

## Changelog

```
Changelog:
- July 06, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
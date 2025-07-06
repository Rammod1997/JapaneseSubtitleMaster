import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Languages, Settings, HelpCircle, Plus, History, Clock, Download } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { AudioWaveform } from '@/components/ui/audio-waveform';
import { ProcessingProgress } from '@/components/ui/processing-progress';
import { SubtitlePreview } from '@/components/ui/subtitle-preview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AudioFile {
  id: number;
  filename: string;
  originalName: string;
  duration?: number;
  status: string;
  createdAt: string;
}

interface Subtitle {
  id: number;
  audioFileId: number;
  startTime: number;
  endTime: number;
  japaneseText: string;
  englishText: string;
}

interface ProcessingJob {
  id: number;
  audioFileId: number;
  stage: string;
  progress: number;
  status: string;
  error?: string;
}

export default function Home() {
  const [currentAudioFile, setCurrentAudioFile] = useState<AudioFile | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStages, setProcessingStages] = useState([
    { id: 'transcription', name: 'Speech Recognition', description: 'Converting audio to text', status: 'pending' as const },
    { id: 'translation', name: 'Translation', description: 'Translating Japanese to English', status: 'pending' as const },
    { id: 'subtitle_generation', name: 'Subtitle Generation', description: 'Creating subtitle file', status: 'pending' as const }
  ]);
  const [overallProgress, setOverallProgress] = useState(0);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { lastMessage } = useWebSocket();

  // Queries
  const { data: recentFiles = [] } = useQuery({
    queryKey: ['/api/recent-files'],
    enabled: true
  });

  const { data: processingJobs = [] } = useQuery({
    queryKey: ['/api/processing-jobs'],
    enabled: true
  });

  const { data: subtitles = [] } = useQuery({
    queryKey: ['/api/audio', currentAudioFile?.id, 'subtitles'],
    enabled: !!currentAudioFile
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('audio', file);
      
      const response = await apiRequest('POST', '/api/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentAudioFile(data.audioFile);
      queryClient.invalidateQueries({ queryKey: ['/api/recent-files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/processing-jobs'] });
      toast({
        title: "File uploaded successfully",
        description: "Processing will begin shortly..."
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const subtitleEditMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Subtitle> }) => {
      const response = await apiRequest('PATCH', `/api/subtitles/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audio', currentAudioFile?.id, 'subtitles'] });
      toast({
        title: "Subtitle updated",
        description: "Changes saved successfully"
      });
    }
  });

  // WebSocket message handling
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'processing-update':
          setOverallProgress(lastMessage.progress || 0);
          setProcessingStages(prev => prev.map(stage => ({
            ...stage,
            status: stage.id === lastMessage.stage ? 'processing' : 
                   stage.id === 'transcription' && lastMessage.stage !== 'transcription' ? 'completed' :
                   stage.id === 'translation' && lastMessage.stage === 'subtitle_generation' ? 'completed' :
                   stage.status
          })));
          break;
        case 'processing-complete':
          setOverallProgress(100);
          setProcessingStages(prev => prev.map(stage => ({ ...stage, status: 'completed' as const })));
          queryClient.invalidateQueries({ queryKey: ['/api/audio', lastMessage.audioFileId, 'subtitles'] });
          queryClient.invalidateQueries({ queryKey: ['/api/processing-jobs'] });
          toast({
            title: "Processing complete!",
            description: "Your subtitles are ready for download."
          });
          break;
        case 'processing-error':
          setProcessingStages(prev => prev.map(stage => ({ ...stage, status: 'failed' as const })));
          toast({
            title: "Processing failed",
            description: lastMessage.error || "An error occurred during processing",
            variant: "destructive"
          });
          break;
      }
    }
  }, [lastMessage, queryClient, toast]);

  const handleFileUpload = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    uploadMutation.mutate(file, {
      onSettled: () => {
        setIsUploading(false);
        setUploadProgress(100);
        clearInterval(progressInterval);
      }
    });
  };

  const handleSubtitleEdit = (id: number, updates: Partial<Subtitle>) => {
    subtitleEditMutation.mutate({ id, updates });
  };

  const handleDownloadSRT = async () => {
    if (!currentAudioFile) return;
    
    try {
      const response = await fetch(`/api/audio/${currentAudioFile.id}/download-srt`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentAudioFile.originalName}.srt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download subtitle file",
        variant: "destructive"
      });
    }
  };

  const isProcessing = processingJobs.some(job => job.status === 'processing');
  const hasSubtitles = subtitles.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Languages className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">SubtitleAI</h1>
                <p className="text-xs text-slate-500">Japanese → English Subtitles with AI Precision</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <HelpCircle className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Workspace */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload Section */}
            {!currentAudioFile && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Upload Audio</CardTitle>
                    <span className="text-sm text-slate-500">MP3, WAV, M4A</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <FileUpload
                    onFileUpload={handleFileUpload}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                  />
                </CardContent>
              </Card>
            )}

            {/* Audio Processing Section */}
            {currentAudioFile && !isProcessing && !hasSubtitles && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Audio Processing</CardTitle>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-500">Duration:</span>
                      <span className="text-sm font-medium text-slate-900">
                        {currentAudioFile.duration ? `${Math.floor(currentAudioFile.duration / 60)}:${(currentAudioFile.duration % 60).toString().padStart(2, '0')}` : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <AudioWaveform
                    duration={currentAudioFile.duration}
                    onTimeUpdate={setCurrentTime}
                  />
                </CardContent>
              </Card>
            )}

            {/* Processing Progress */}
            {isProcessing && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Processing Audio</CardTitle>
                    <span className="text-sm text-slate-500">
                      {processingStages.find(s => s.status === 'processing')?.name || 'Processing...'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ProcessingProgress
                    currentStage={processingStages.find(s => s.status === 'processing')?.name || 'Processing...'}
                    overallProgress={overallProgress}
                    stages={processingStages}
                  />
                </CardContent>
              </Card>
            )}

            {/* Subtitle Preview */}
            {hasSubtitles && (
              <Card>
                <CardContent className="p-6">
                  <SubtitlePreview
                    subtitles={subtitles}
                    currentTime={currentTime}
                    onTimeSeek={setCurrentTime}
                    onSubtitleEdit={handleSubtitleEdit}
                    onDownload={handleDownloadSRT}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Processing Queue */}
            <Card>
              <CardHeader>
                <CardTitle>Processing Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {processingJobs.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No active processing jobs</p>
                  ) : (
                    processingJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">Processing...</p>
                            <p className="text-xs text-slate-500">{job.stage}</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">{job.progress}%</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Files */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentFiles.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No recent files</p>
                  ) : (
                    recentFiles.map((file: AudioFile) => (
                      <div key={file.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Download className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{file.originalName}</p>
                            <p className="text-xs text-slate-500">{new Date(file.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Translation Quality</label>
                    <Select defaultValue="high">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (Faster)</SelectItem>
                        <SelectItem value="high">High Quality (Slower)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Subtitle Format</label>
                    <Select defaultValue="srt">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="srt">SRT</SelectItem>
                        <SelectItem value="vtt">WebVTT</SelectItem>
                        <SelectItem value="ass">ASS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Show Original Text</span>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Auto-download</span>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating Actions */}
      <div className="fixed bottom-6 right-6 space-y-3">
        <Button
          size="lg"
          className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 p-0"
          onClick={() => setCurrentAudioFile(null)}
        >
          <Plus className="w-5 h-5" />
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="w-12 h-12 rounded-full p-0"
        >
          <History className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

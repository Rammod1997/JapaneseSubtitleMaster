import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
  onClearError?: () => void;
}

export function FileUpload({ onFileUpload, isUploading = false, uploadProgress = 0, error, onClearError }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      return; // Let dropzone handle the error
    }
    
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      onClearError?.();
      onFileUpload(file);
    }
  }, [onFileUpload, onClearError]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/x-wav': ['.wav'],
      'audio/mp4': ['.m4a'],
      'audio/x-m4a': ['.m4a']
    },
    maxFiles: 1,
    maxSize: 300 * 1024 * 1024, // 300MB
    disabled: isUploading
  });

  const clearFile = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadError = error || (fileRejections.length > 0 ? fileRejections[0].errors[0].message : null);

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">Upload Error</p>
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearError}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer group overflow-hidden",
          isDragActive || dragActive
            ? "border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 scale-105"
            : "border-slate-300 hover:border-blue-400 hover:bg-slate-50",
          isUploading && "opacity-50 cursor-not-allowed",
          uploadError && "border-red-300"
        )}
      >
        <input {...getInputProps()} />
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_50%_50%,_var(--gradient-start)_0%,_transparent_50%)]" />
        
        <div className="relative space-y-6">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-300",
            isDragActive || dragActive
              ? "bg-gradient-primary scale-110"
              : "bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:scale-105"
          )}>
            <Upload className={cn(
              "w-8 h-8 transition-colors duration-300",
              isDragActive || dragActive ? "text-white" : "text-blue-600"
            )} />
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-800">
              {isDragActive ? 'Drop your audio file here!' : 'Upload Japanese Audio'}
            </p>
            <p className="text-sm text-slate-600">
              Drag & drop your audio file or click to browse
            </p>
            <p className="text-xs text-slate-500">
              Supports MP3, WAV, M4A • Max 300MB
            </p>
          </div>
          
          <Button 
            type="button" 
            className="bg-gradient-primary hover:opacity-90 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 hover-lift"
            disabled={isUploading}
          >
            {isUploading ? 'Processing...' : 'Choose File'}
          </Button>
        </div>
      </div>

      {selectedFile && (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-5 border border-slate-200 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                <File className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            {!isUploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {isUploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Uploading...</span>
                <span className="font-medium text-slate-800">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-3" />
            </div>
          )}

          {!isUploading && uploadProgress === 100 && (
            <div className="flex items-center space-x-2 text-success">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Upload complete!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

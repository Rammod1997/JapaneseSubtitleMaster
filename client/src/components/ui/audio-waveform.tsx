import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from './button';

interface AudioWaveformProps {
  audioUrl?: string;
  duration?: number;
  onTimeUpdate?: (currentTime: number) => void;
}

export function AudioWaveform({ audioUrl, duration = 0, onTimeUpdate }: AudioWaveformProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  // Mock waveform data - in production, you'd generate this from the audio
  const waveformData = Array.from({ length: 50 }, () => Math.random() * 100);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Audio File</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlayPause}
          className="h-8 w-8 p-0"
          disabled={!audioUrl}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      </div>

      <div 
        ref={waveformRef}
        className="h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded flex items-end justify-center space-x-px overflow-hidden relative cursor-pointer"
      >
        {/* Progress overlay */}
        <div 
          className="absolute top-0 left-0 h-full bg-blue-500 opacity-30 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        
        {/* Waveform bars */}
        {waveformData.map((height, index) => (
          <div
            key={index}
            className="w-1 bg-blue-400 transition-colors"
            style={{ height: `${Math.max(height * 0.8, 8)}%` }}
          />
        ))}
      </div>

      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />
      )}
    </div>
  );
}

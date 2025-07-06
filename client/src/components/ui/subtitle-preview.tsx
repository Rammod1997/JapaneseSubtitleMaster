import { useState } from 'react';
import { Edit2, Download, Play } from 'lucide-react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';

interface Subtitle {
  id: number;
  startTime: number;
  endTime: number;
  japaneseText: string;
  englishText: string;
}

interface SubtitlePreviewProps {
  subtitles: Subtitle[];
  currentTime: number;
  onTimeSeek: (time: number) => void;
  onSubtitleEdit: (id: number, updates: Partial<Subtitle>) => void;
  onDownload: () => void;
}

export function SubtitlePreview({
  subtitles,
  currentTime,
  onTimeSeek,
  onSubtitleEdit,
  onDownload
}: SubtitlePreviewProps) {
  const [editingSubtitle, setEditingSubtitle] = useState<Subtitle | null>(null);
  const [editForm, setEditForm] = useState({ japaneseText: '', englishText: '' });

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleEditStart = (subtitle: Subtitle) => {
    setEditingSubtitle(subtitle);
    setEditForm({
      japaneseText: subtitle.japaneseText,
      englishText: subtitle.englishText
    });
  };

  const handleEditSave = () => {
    if (editingSubtitle) {
      onSubtitleEdit(editingSubtitle.id, editForm);
      setEditingSubtitle(null);
    }
  };

  const handleSeek = (startTime: number) => {
    onTimeSeek(startTime / 1000); // Convert to seconds
  };

  const getCurrentSubtitle = () => {
    return subtitles.find(sub => 
      currentTime * 1000 >= sub.startTime && currentTime * 1000 <= sub.endTime
    );
  };

  const currentSubtitle = getCurrentSubtitle();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Subtitle Preview</h3>
        <Button
          onClick={onDownload}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Download SRT
        </Button>
      </div>

      {/* Current Subtitle Display */}
      {currentSubtitle && (
        <div className="bg-slate-900 text-white rounded-lg p-4 text-center">
          <p className="text-sm opacity-75 mb-1">{currentSubtitle.japaneseText}</p>
          <p className="text-lg font-medium">{currentSubtitle.englishText}</p>
        </div>
      )}

      {/* Subtitle List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {subtitles.map((subtitle) => (
          <div
            key={subtitle.id}
            className={`border border-slate-200 rounded-lg p-3 hover:bg-slate-50 cursor-pointer transition-colors ${
              currentSubtitle?.id === subtitle.id ? 'bg-blue-50 border-blue-300' : ''
            }`}
            onClick={() => handleSeek(subtitle.startTime)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 font-medium">
                {formatTime(subtitle.startTime)} → {formatTime(subtitle.endTime)}
              </span>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(subtitle.startTime);
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Play className="w-3 h-3" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStart(subtitle);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Subtitle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Japanese Text
                        </label>
                        <Textarea
                          value={editForm.japaneseText}
                          onChange={(e) => setEditForm(prev => ({ ...prev, japaneseText: e.target.value }))}
                          placeholder="Japanese text..."
                          className="min-h-[80px]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          English Translation
                        </label>
                        <Textarea
                          value={editForm.englishText}
                          onChange={(e) => setEditForm(prev => ({ ...prev, englishText: e.target.value }))}
                          placeholder="English translation..."
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setEditingSubtitle(null)}>
                          Cancel
                        </Button>
                        <Button onClick={handleEditSave}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-1">{subtitle.japaneseText}</p>
            <p className="text-sm text-slate-900 font-medium">{subtitle.englishText}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

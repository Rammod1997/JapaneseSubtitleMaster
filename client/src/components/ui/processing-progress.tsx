import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Progress } from './progress';

interface ProcessingStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface ProcessingProgressProps {
  currentStage: string;
  overallProgress: number;
  stages: ProcessingStage[];
}

export function ProcessingProgress({ 
  currentStage, 
  overallProgress, 
  stages 
}: ProcessingProgressProps) {
  const getStageIcon = (status: ProcessingStage['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <Clock className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStageBackground = (status: ProcessingStage['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100';
      case 'processing':
        return 'bg-blue-100';
      case 'failed':
        return 'bg-red-100';
      default:
        return 'bg-slate-100';
    }
  };

  const getStatusText = (status: ProcessingStage['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'In Progress';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div>
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span>Overall Progress</span>
          <span>{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Stage Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stages.map((stage) => (
          <div key={stage.id} className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStageBackground(stage.status)}`}>
              {getStageIcon(stage.status)}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{stage.name}</p>
              <p className="text-xs text-slate-500">{getStatusText(stage.status)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Current Stage Details */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Current Stage</h4>
        <p className="text-sm text-slate-600">{currentStage}</p>
      </div>
    </div>
  );
}

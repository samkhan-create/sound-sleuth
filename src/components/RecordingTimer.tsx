import { motion } from 'framer-motion';
import { Clock, CheckCircle2 } from 'lucide-react';

interface RecordingTimerProps {
  duration: number;
  minDuration?: number;
}

export const RecordingTimer = ({ duration, minDuration = 10 }: RecordingTimerProps) => {
  const hasReachedMin = duration >= minDuration;
  const remaining = Math.max(0, minDuration - duration);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-elegant"
    >
      <div className="flex items-center gap-2">
        {hasReachedMin ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </motion.div>
        ) : (
          <Clock className="w-5 h-5 text-primary animate-pulse" />
        )}
        <span className={`text-lg font-mono font-semibold transition-colors ${
          hasReachedMin ? 'text-green-500' : 'text-foreground'
        }`}>
          {formatTime(duration)}
        </span>
      </div>
      
      {!hasReachedMin && (
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <span className="text-sm text-muted-foreground">
            {remaining}s remaining
          </span>
        </div>
      )}
      
      {hasReachedMin && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="pl-3 border-l border-border"
        >
          <span className="text-sm text-green-500 font-medium">
            Ready to identify
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

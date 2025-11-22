import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ListenButtonProps {
  isListening: boolean;
  onClick: () => void;
}

export const ListenButton = ({ isListening, onClick }: ListenButtonProps) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Animated rings when listening */}
      {isListening && (
        <>
          <motion.div
            className="absolute w-40 h-40 rounded-full border-2 border-primary/30"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute w-40 h-40 rounded-full border-2 border-primary/30"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
        </>
      )}

      {/* Main button */}
      <Button
        variant="listen"
        size="xl"
        onClick={onClick}
        className={isListening ? 'animate-pulse-glow' : ''}
      >
        <motion.div
          animate={{
            scale: isListening ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: isListening ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          {isListening ? (
            <MicOff className="w-12 h-12" />
          ) : (
            <Mic className="w-12 h-12" />
          )}
        </motion.div>
      </Button>
    </div>
  );
};

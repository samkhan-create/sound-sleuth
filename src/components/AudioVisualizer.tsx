import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  isListening: boolean;
  audioData?: Uint8Array;
}

export const AudioVisualizer = ({ isListening, audioData }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (isListening) {
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'hsl(195, 100%, 55%)');
        gradient.addColorStop(0.5, 'hsl(190, 95%, 45%)');
        gradient.addColorStop(1, 'hsl(280, 90%, 60%)');

        ctx.fillStyle = gradient;

        const barCount = 50;
        const barWidth = width / barCount;
        const time = Date.now() / 1000;

        for (let i = 0; i < barCount; i++) {
          let barHeight;
          
          if (audioData && audioData.length > 0) {
            // Use actual audio data if available
            const dataIndex = Math.floor((i / barCount) * audioData.length);
            barHeight = (audioData[dataIndex] / 255) * height * 0.8;
          } else {
            // Animated placeholder bars
            const phase = (i / barCount) * Math.PI * 4;
            barHeight = (Math.sin(time * 2 + phase) * 0.3 + 0.5) * height * 0.6;
          }

          const x = i * barWidth;
          const y = (height - barHeight) / 2;

          ctx.fillRect(x, y, barWidth - 2, barHeight);
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening, audioData]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative w-full h-32 rounded-2xl overflow-hidden bg-card/50 border border-border"
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={128}
        className="w-full h-full"
      />
      {!isListening && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Press the button to start listening</p>
        </div>
      )}
    </motion.div>
  );
};

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
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (isListening) {
        // Create gradient for waveform
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'hsl(195, 100%, 55%)');
        gradient.addColorStop(0.5, 'hsl(190, 95%, 45%)');
        gradient.addColorStop(1, 'hsl(280, 90%, 60%)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw center line (subtle)
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.5;

        const time = Date.now() / 1000;
        const points = 200;

        for (let i = 0; i <= points; i++) {
          const x = (i / points) * width;
          let y;

          if (audioData && audioData.length > 0) {
            // Use actual audio data for waveform
            const dataIndex = Math.floor((i / points) * audioData.length);
            const amplitude = (audioData[dataIndex] / 255) * height * 0.4;
            y = centerY + (amplitude - height * 0.2) * Math.sin(i * 0.1 + time * 2);
          } else {
            // Animated placeholder waveform
            const wave1 = Math.sin((i / points) * Math.PI * 4 + time * 3) * 0.3;
            const wave2 = Math.sin((i / points) * Math.PI * 8 + time * 2) * 0.15;
            const wave3 = Math.sin((i / points) * Math.PI * 2 + time * 1.5) * 0.2;
            y = centerY + (wave1 + wave2 + wave3) * height * 0.35;
          }

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();

        // Draw glow effect
        ctx.shadowColor = 'hsl(195, 100%, 55%)';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw mirror waveform (subtle)
        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.3;

        for (let i = 0; i <= points; i++) {
          const x = (i / points) * width;
          let y;

          if (audioData && audioData.length > 0) {
            const dataIndex = Math.floor((i / points) * audioData.length);
            const amplitude = (audioData[dataIndex] / 255) * height * 0.4;
            y = centerY - (amplitude - height * 0.2) * Math.sin(i * 0.1 + time * 2);
          } else {
            const wave1 = Math.sin((i / points) * Math.PI * 4 + time * 3) * 0.3;
            const wave2 = Math.sin((i / points) * Math.PI * 8 + time * 2) * 0.15;
            const wave3 = Math.sin((i / points) * Math.PI * 2 + time * 1.5) * 0.2;
            y = centerY - (wave1 + wave2 + wave3) * height * 0.35;
          }

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
        ctx.globalAlpha = 1;
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

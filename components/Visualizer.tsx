import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  volume: number; // 0.0 to 1.0
  state: 'listening' | 'speaking' | 'idle' | 'connecting';
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, volume, state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const baseRadius = 50;

    const render = () => {
      if (!canvas) return;
      
      // Auto-resize
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      
      ctx.clearRect(0, 0, width, height);

      // If idle or connecting, just pulse gently
      // If listening (user speaking), react to volume
      
      const centerX = width / 2;
      const centerY = height / 2;
      
      let currentRadius = baseRadius;
      let color = 'rgba(99, 102, 241, 0.5)'; // Indigo-500 default
      let innerColor = 'rgba(129, 140, 248, 0.9)';

      if (state === 'connecting') {
        color = 'rgba(234, 179, 8, 0.5)'; // Yellow
        innerColor = 'rgba(250, 204, 21, 0.9)';
        currentRadius = baseRadius + Math.sin(phase * 0.1) * 5;
      } else if (state === 'listening' && isActive) {
        // React to volume
        const scale = 1 + (volume * 1.5); // Amplify volume
        currentRadius = baseRadius * scale;
        color = 'rgba(34, 197, 94, 0.5)'; // Green for user
        innerColor = 'rgba(74, 222, 128, 0.9)';
      } else if (state === 'speaking') { // App speaking logic isn't strictly tracked by hook yet, but we can simulate 'active' state
        // For now, if active and volume is low, maybe it's thinking? 
        // Actually, the volume prop comes from MIC only in current hook implementation.
        // We'll stick to mic visualization for now.
        currentRadius = baseRadius + Math.sin(phase * 0.2) * 5;
         color = 'rgba(59, 130, 246, 0.5)'; // Blue
         innerColor = 'rgba(96, 165, 250, 0.9)';
      }

      // Draw Outer Glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.filter = 'blur(20px)';
      ctx.fill();
      ctx.filter = 'none';

      // Draw Inner Core
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, 2 * Math.PI);
      ctx.fillStyle = innerColor;
      ctx.fill();

      // Ripples
      if (state === 'listening' && volume > 0.05) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, currentRadius * 2, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * (1 - volume)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      phase++;
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, volume, state]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-64 md:h-80"
    />
  );
};
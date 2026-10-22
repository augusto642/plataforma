'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export interface ConfettiCanvasHandle {
  fire: () => void;
}

export const ConfettiCanvas = forwardRef<ConfettiCanvasHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useImperativeHandle(ref, () => ({
    fire: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = (canvas.width = window.innerWidth);
      const height = (canvas.height = window.innerHeight);

      const colors = ['#8257E5', '#996DFF', '#04D361', '#00E5FF', '#F59E0B', '#F43F5E', '#FFFFFF'];
      const particles: Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
        color: string;
        rotation: number;
        rotationSpeed: number;
        opacity: number;
        gravity: number;
        drag: number;
      }> = [];

      const particleCount = 140;

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: width * 0.5 + (Math.random() - 0.5) * 200,
          y: height * 0.4 + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 16,
          vy: Math.random() * -12 - 4,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          opacity: 1,
          gravity: 0.28,
          drag: 0.96,
        });
      }

      let animationFrame: number;
      const startTime = Date.now();

      function update() {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        let activeCount = 0;
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= p.drag;
          p.vy *= p.drag;
          p.rotation += p.rotationSpeed;

          if (Date.now() - startTime > 2200) {
            p.opacity -= 0.016;
          }

          if (p.opacity > 0 && p.y < height + 50) {
            activeCount++;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
          }
        });

        if (activeCount > 0) {
          animationFrame = requestAnimationFrame(update);
        } else {
          ctx.clearRect(0, 0, width, height);
          cancelAnimationFrame(animationFrame);
        }
      }

      update();
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    />
  );
});

ConfettiCanvas.displayName = 'ConfettiCanvas';

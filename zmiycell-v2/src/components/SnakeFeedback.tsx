"use client";

import React, { useEffect, useRef, useState } from 'react';

interface SnakeFeedbackProps {
  active: boolean;
  onComplete: () => void;
}

export function SnakeFeedback({ active, onComplete }: SnakeFeedbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  useEffect(() => {
    if (!show || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const cellSize = 16;
    const snake = [{ x: -5, y: 5 }, { x: -6, y: 5 }, { x: -7, y: 5 }];
    const target = { x: 10, y: 5 };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = '#1A1A1A';
      for (let x = 0; x < canvas.width; x += cellSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += cellSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Draw Battery Block (Target)
      if (frame < 60) {
        ctx.fillStyle = '#EDEDED';
        ctx.fillRect(target.x * cellSize + 2, target.y * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.fillStyle = '#39FF14';
        ctx.fillRect(target.x * cellSize + 4, target.y * cellSize + 4, cellSize - 8, (cellSize - 8) * (frame / 60));
      }

      // Move Snake
      const head = { ...snake[0] };
      if (head.x < target.x) head.x += 0.2;
      
      snake.unshift(head);
      if (snake.length > 8) snake.pop();

      // Draw Snake
      ctx.fillStyle = '#39FF14';
      snake.forEach((p, i) => {
        const size = i === 0 ? cellSize - 2 : cellSize - 4;
        ctx.fillRect(p.x * cellSize + (cellSize - size) / 2, p.y * cellSize + (cellSize - size) / 2, size, size);
      });

      frame++;
      if (show) requestAnimationFrame(animate);
    };

    const animationReq = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationReq);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 pointer-events-none">
      <div className="text-toxic font-black text-4xl mb-8 animate-bounce tracking-tighter">
        DATABASE UPDATED
      </div>
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={200} 
        className="border border-edge bg-card shadow-[0_0_50px_rgba(57,255,20,0.1)]"
      />
      <div className="mt-8 text-foreground/40 text-[10px] font-bold tracking-[0.5em] uppercase">
        Snake is consuming the battery block...
      </div>
    </div>
  );
}

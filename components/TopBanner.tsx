import React, { useEffect, useRef } from 'react';

export const TopBanner: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    // Handle Resize
    const handleResize = () => {
      if (canvas) {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // Fireworks Logic
    const particles: Particle[] = [];
    const colors = ['#ff0043', '#14fc56', '#1e90ff', '#ffeb3b', '#ffffff', '#ff00ff'];

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      color: string;
      size: number;

      constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1; // Speed of explosion
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.color = color;
        this.size = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // Gravity
        this.alpha -= 0.015; // Fade out speed
      }

      draw(context: CanvasRenderingContext2D) {
        context.save();
        context.globalAlpha = this.alpha;
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fillStyle = this.color;
        context.fill();
        context.restore();
      }
    }

    const createExplosion = (x: number, y: number) => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 40; i++) {
        particles.push(new Particle(x, y, color));
      }
    };

    // Auto launch fireworks
    let timer = 0;
    const loop = () => {
      // Clear canvas with trail effect
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Trail length
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      // Launch random firework
      timer++;
      if (timer > 40) { // Frequency of fireworks
        const x = Math.random() * width;
        const y = Math.random() * (height / 2) + (height / 4);
        createExplosion(x, y);
        timer = 0;
      }

      requestAnimationFrame(loop);
    };

    const animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative w-full h-40 overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-md shrink-0">
      {/* Canvas for Fireworks */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 text-center">
         {/* Animated Text Container */}
         <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-cyan-400 animate-[pulse_4s_ease-in-out_infinite] drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
              HỆ THỐNG QUẢN LÝ PHÒNG HỌP KHÔNG GIẤY
            </h1>
            <p className="text-white/80 text-sm md:text-base font-medium tracking-widest uppercase animate-[pulse_5s_ease-in-out_infinite]">
              eCabinet &bull; Hiện Đại &bull; Minh Bạch &bull; Hiệu Quả
            </p>
         </div>
      </div>
      
      {/* Decorative Bottom Border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
    </div>
  );
};
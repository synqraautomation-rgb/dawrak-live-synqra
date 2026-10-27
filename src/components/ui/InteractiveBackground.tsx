import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
  color: string;
}

export const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking with smooth lerp
    let mouse = {
      x: width * 0.5,
      y: height * 0.3,
      targetX: width * 0.5,
      targetY: height * 0.3,
      active: false
    };

    // Scroll tracking
    let scrollY = window.scrollY || 0;
    let targetScrollY = window.scrollY || 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const handleScroll = () => {
      targetScrollY = window.scrollY || 0;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initialize Synaptic Particles
    const particleCount = Math.min(55, Math.floor((width * height) / 22000));
    const colors = ['#06b6d4', '#0ea5e9', '#10b981', '#6366f1', '#38bdf8'];
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const baseAlpha = 0.25 + Math.random() * 0.45;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.65,
        vy: (Math.random() - 0.5) * 0.65,
        radius: 1.5 + Math.random() * 2.2,
        alpha: baseAlpha,
        baseAlpha,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let time = 0;

    const render = () => {
      time += 0.012;
      // Smooth lerp mouse & scroll
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;
      scrollY += (targetScrollY - scrollY) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains('dark');

      // 1. Cyber Flowing Sine Waves (Coupled with scroll & time)
      const waveCount = 3;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const baseAmp = 35 + w * 18;
        const freq = 0.0018 + w * 0.0008;
        const waveY = (height * (0.35 + w * 0.22)) - (scrollY * 0.15 * (w + 1));
        const phase = time * (0.6 + w * 0.4) + w * 2.0;

        ctx.moveTo(0, waveY);
        for (let x = 0; x <= width; x += 15) {
          // Add cursor proximity warp
          const distToMouse = Math.abs(x - mouse.x);
          const mouseWarp = mouse.active && distToMouse < 220
            ? Math.sin((distToMouse / 220) * Math.PI) * 28 * (mouse.y > waveY ? 1 : -1)
            : 0;

          const y = waveY + Math.sin(x * freq + phase) * baseAmp + Math.cos(x * freq * 0.6 - phase * 0.5) * (baseAmp * 0.4) + mouseWarp;
          ctx.lineTo(x, y);
        }

        ctx.lineWidth = 1.2;
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        if (isDark) {
          grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
          grad.addColorStop(0.3, w === 1 ? 'rgba(16, 185, 129, 0.22)' : 'rgba(14, 165, 233, 0.28)');
          grad.addColorStop(0.7, 'rgba(99, 102, 241, 0.25)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        } else {
          grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
          grad.addColorStop(0.4, 'rgba(14, 165, 233, 0.16)');
          grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.14)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        }
        ctx.strokeStyle = grad;
        ctx.stroke();
      }

      // 2. Interactive Synaptic Particles
      const maxDistance = 140;

      // Update & Draw Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Scroll parallax displacement
        const visualY = (p.y - scrollY * 0.22) % height;
        const clampedY = visualY < 0 ? visualY + height : visualY;

        // Wrap around bounds
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Mouse proximity reaction
        let extraScale = 1;
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - clampedY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const factor = 1 - dist / 150;
            p.alpha = Math.min(0.9, p.baseAlpha + factor * 0.5);
            extraScale = 1 + factor * 0.8;
            // Gentle steering
            p.x += (dx / dist) * 0.35;
            p.y += (dy / dist) * 0.35;
          } else {
            p.alpha += (p.baseAlpha - p.alpha) * 0.05;
          }
        } else {
          p.alpha += (p.baseAlpha - p.alpha) * 0.05;
        }

        // Draw particle dot with soft glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, clampedY, p.radius * extraScale, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = isDark ? p.alpha : p.alpha * 0.65;
        ctx.shadowBlur = isDark ? 10 : 4;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const visualY2 = (p2.y - scrollY * 0.22) % height;
          const clampedY2 = visualY2 < 0 ? visualY2 + height : visualY2;

          const dx = p.x - p2.x;
          const dy = clampedY - clampedY2;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, clampedY);
            ctx.lineTo(p2.x, clampedY2);
            ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
            ctx.globalAlpha = isDark ? lineAlpha : lineAlpha * 0.6;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
      {/* Dynamic Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Cyber Luminous Radial Glows (Ambient Background Lighting) */}
      <div className="absolute -top-[15%] left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-cyan-500/12 via-teal-500/8 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] -right-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tl from-blue-600/12 via-indigo-500/8 to-transparent blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-[20%] left-[25%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-emerald-500/10 via-cyan-500/8 to-transparent blur-[160px] pointer-events-none" />
    </div>
  );
};

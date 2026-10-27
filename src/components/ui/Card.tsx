import React, { useRef, useState } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { soundEngine } from '../../lib/audio';

interface CardProps extends HTMLMotionProps<'div'> {
  interactive?: boolean;
  elevation?: 'flat' | 'raised' | 'glow' | 'hologram' | 'neon';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  interactive = false,
  elevation = 'raised',
  children,
  className = '',
  onClick,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -8;
    const rY = ((x - centerX) / centerX) * 8;

    setRotateX(rX);
    setRotateY(rY);
    setGlarePos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const handleMouseEnter = () => {
    if (interactive) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  const elevationClasses = {
    flat: 'bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md',
    raised: 'bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-slate-950/5 dark:shadow-slate-950/40 backdrop-blur-xl',
    glow: 'bg-white/95 dark:bg-slate-900/95 border border-cyan-500/30 dark:border-cyan-500/50 shadow-[0_0_35px_rgba(6,182,212,0.2)] backdrop-blur-2xl',
    hologram: 'bg-gradient-to-br from-slate-900/95 via-slate-950/90 to-cyan-950/40 border border-cyan-400/40 shadow-[0_0_40px_rgba(6,182,212,0.25)] backdrop-blur-2xl',
    neon: 'bg-slate-950/90 border border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.2)] backdrop-blur-2xl'
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        if (interactive) soundEngine.playClickSound();
        if (onClick) onClick(e);
      }}
      style={{
        transformStyle: 'preserve-3d',
        transform: interactive && isHovered ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)` : undefined,
        transition: 'transform 0.18s cubic-bezier(0.2, 0, 0, 1)'
      }}
      className={`rounded-3xl p-6 transition-all duration-300 relative overflow-hidden group ${
        interactive ? 'cursor-pointer hover:shadow-2xl hover:border-cyan-400/60' : ''
      } ${elevationClasses[elevation]} ${className}`}
      {...props}
    >
      {/* Dynamic 3D Glare & Iridescent Laser Sheen */}
      {interactive && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-0"
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(6, 182, 212, 0.22) 0%, rgba(20, 184, 166, 0.08) 35%, transparent 70%)`
            }}
          />
          <div
            className="absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-0"
            style={{
              background: `radial-gradient(400px circle at ${glarePos.x}% ${glarePos.y}%, rgba(56, 189, 248, 0.4), transparent 40%)`
            }}
          />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};


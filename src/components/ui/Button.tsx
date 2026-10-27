import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { soundEngine } from '../../lib/audio';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'glow' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
    md: 'px-5 py-2.5 text-sm font-semibold rounded-xl gap-2',
    lg: 'px-7 py-3.5 text-base font-bold rounded-2xl gap-2.5'
  };

  const variantClasses = {
    primary: 
      'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/40',
    glow: 
      'bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-300/40 font-bold',
    secondary: 
      'bg-slate-800/90 dark:bg-slate-800 text-white dark:text-white hover:bg-slate-750 dark:hover:bg-slate-700 border border-slate-600 dark:border-slate-700 shadow-sm',
    danger: 
      'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 border border-rose-400/40',
    ghost: 
      'bg-transparent hover:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-200 dark:text-slate-200 border border-transparent'
  };

  return (
    <motion.button
      whileHover={disabled || loading ? {} : { scale: 1.02, y: -1 }}
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
      disabled={disabled || loading}
      onClick={(e) => {
        soundEngine.playClickSound();
        if (props.onClick) props.onClick(e);
      }}
      className={`inline-flex items-center justify-center font-bold transition-all select-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};

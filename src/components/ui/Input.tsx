import React, { forwardRef } from 'react';
import { motion } from 'motion/react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  icon,
  hint,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full flex flex-col gap-1.5 text-start">
      {label && (
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <motion.div
        animate={error ? { x: [-4, 4, -3, 3, 0] } : {}}
        transition={{ duration: 0.3 }}
        className="relative flex items-center"
      >
        {icon && (
          <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}

        <input
          ref={ref}
          className={`w-full rounded-xl py-2.5 px-4 text-sm font-medium transition-all duration-200 outline-none ${
            icon ? 'ps-10' : ''
          } bg-white dark:bg-slate-900 text-slate-900 dark:text-white border ${
            error
              ? 'border-rose-500 ring-2 ring-rose-500/20'
              : 'border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
          } placeholder:text-slate-400 dark:placeholder:text-slate-500 ${className}`}
          {...props}
        />
      </motion.div>

      {error ? (
        <span className="text-xs font-semibold text-rose-500 mt-0.5">{error}</span>
      ) : hint ? (
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</span>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

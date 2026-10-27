import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { useI18n } from '../../lib/i18n';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  useEasternArabic?: boolean;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  value, 
  className = '', 
  useEasternArabic = false 
}) => {
  const { formatNumber } = useI18n();
  const [displayValue, setDisplayValue] = useState(value);

  // Smooth physics spring for value transition
  const spring = useSpring(value, {
    stiffness: 85,
    damping: 18,
    mass: 0.8
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
  }, [spring]);

  return (
    <motion.span 
      key={value}
      initial={{ scale: 1.15, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`inline-block font-mono-numbers tabular-nums font-bold tracking-tight ${className}`}
    >
      {formatNumber(displayValue, useEasternArabic)}
    </motion.span>
  );
};

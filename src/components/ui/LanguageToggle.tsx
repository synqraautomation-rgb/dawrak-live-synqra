import React from 'react';
import { motion } from 'motion/react';
import { useI18n } from '../../lib/i18n';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useI18n();

  const handleToggle = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
        language === 'ar'
          ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-cyan-500/40'
          : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
      } ${className}`}
      title={language === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
    >
      <Globe className="w-3.5 h-3.5 text-cyan-500" />
      <span className="font-mono tracking-wider">
        {language === 'ar' ? 'EN' : 'عربي'}
      </span>
    </motion.button>
  );
};

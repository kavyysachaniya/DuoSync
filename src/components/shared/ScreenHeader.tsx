import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  className?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  badge,
  className = '',
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {/* Small rose eyebrow, text-only (no icons) with optional right badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-semibold text-rose-400 tracking-wider uppercase block">
          {eyebrow}
        </span>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* Large Title with soft 200ms crossfade when partner changes */}
      <div className="h-8 sm:h-9 relative overflow-hidden flex items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl sm:text-3xl font-light tracking-tight text-white truncate"
          >
            {title}
          </motion.h1>
        </AnimatePresence>
      </div>

      {/* One short dim line */}
      <p className="text-xs sm:text-sm text-white/60 font-normal leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
};

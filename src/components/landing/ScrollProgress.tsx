import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { THEME } from './theme';

interface ScrollProgressProps {
  activeChapter: number; // 0: Rings, 1: Routine, 2: Fits
  isVisible?: boolean;
  onSelectChapter?: (index: number) => void;
}

export const ScrollProgress: React.FC<ScrollProgressProps> = ({
  activeChapter,
  isVisible = true,
  onSelectChapter,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const chapters = [
    { label: 'Rings', color: '#FFFFFF' },
    { label: 'Routine', color: '#FFFFFF' },
    { label: 'Closet', color: '#FFFFFF' },
  ];

  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      aria-label="Chapter navigation"
      className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3 select-none"
    >
      {/* 2px Background Track Line */}
      <div className="absolute top-2 bottom-2 w-[1.5px] bg-white/[0.08] -z-10 rounded-full" />

      {chapters.map((ch, i) => {
        const isActive = activeChapter === i;
        return (
          <button
            key={ch.label}
            type="button"
            onClick={() => onSelectChapter?.(i)}
            aria-label={`Jump to ${ch.label} section`}
            className="w-5 h-6 flex items-center justify-center cursor-pointer group"
          >
            <motion.span
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      height: isActive ? 18 : 5,
                      width: isActive ? 3 : 3,
                      backgroundColor: isActive ? ch.color : 'rgba(255, 255, 255, 0.25)',
                    }
              }
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-full transition-colors group-hover:bg-white/50"
              style={{
                backgroundColor: isActive ? ch.color : 'rgba(255, 255, 255, 0.25)',
                height: isActive ? 18 : 5,
                width: 3,
                boxShadow: isActive ? `0 0 8px ${ch.color}80` : 'none',
              }}
            />
          </button>
        );
      })}
    </motion.aside>
  );
};

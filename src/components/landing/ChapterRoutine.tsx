import React from 'react';
import { motion, MotionValue, useTransform, useReducedMotion } from 'motion/react';
import { THEME } from './theme';

interface ChapterRoutineProps {
  progress: MotionValue<number>;
}

export const ChapterRoutine: React.FC<ChapterRoutineProps> = ({ progress }) => {
  const shouldReduceMotion = useReducedMotion();

  // 7 days with checkmarks cycling through the 4 in-app health colors
  const days = [
    { label: 'M', checked: true, color: THEME.rings.steps.base, threshold: 0.08 },
    { label: 'T', checked: true, color: THEME.rings.weight.base, threshold: 0.20 },
    { label: 'W', checked: true, color: THEME.rings.sleep.base, threshold: 0.33 },
    { label: 'T', checked: false, color: '', threshold: 0.46 }, // Rest day (dim dot)
    { label: 'F', checked: true, color: THEME.rings.water.base, threshold: 0.58 },
    { label: 'S', checked: true, color: THEME.rings.steps.base, threshold: 0.70 },
    { label: 'S', checked: true, color: THEME.rings.weight.base, threshold: 0.82 },
  ];

  return (
    <div className="w-full flex flex-col items-center justify-center text-center space-y-6">
      {/* Centered Graphic (~65% height feel) */}
      <div className="w-full max-w-[300px] h-64 sm:h-72 rounded-[28px] bg-[#0E0E13] border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between select-none shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <span className="text-xs font-mono text-[rgba(245,245,247,0.6)]">
            WEEKLY SYNC
          </span>
          <span className="text-xs font-mono text-[#38BDF8] font-medium">
            5 / 6 DONE
          </span>
        </div>

        {/* 7-Day Dot/Check Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 my-auto items-center py-4">
          {days.map((item, i) => (
            <DayDot
              key={i}
              item={item}
              progress={progress}
              shouldReduceMotion={shouldReduceMotion ?? false}
            />
          ))}
        </div>

        {/* Micro streak pill at bottom of card */}
        <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] font-mono text-[rgba(245,245,247,0.6)] border-t border-white/[0.06]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>Both finished today</span>
        </div>
      </div>

      {/* 2-Word Title & Short Caption Below */}
      <div className="space-y-1.5 px-4 max-w-[280px]">
        <h3 className="text-xl sm:text-2xl font-light tracking-tight text-[#F5F5F7]">
          Care Routine
        </h3>
        <p className="text-[14px] leading-relaxed text-[rgba(245,245,247,0.6)]">
          Shared schedules. Done together.
        </p>
      </div>
    </div>
  );
};

interface DayDotProps {
  item: {
    label: string;
    checked: boolean;
    color: string;
    threshold: number;
  };
  progress: MotionValue<number>;
  shouldReduceMotion: boolean;
}

const DayDot: React.FC<DayDotProps> = ({ item, progress, shouldReduceMotion }) => {
  // Scale and opacity scrub as scroll passes threshold
  const scale = useTransform(
    progress,
    [Math.max(0, item.threshold - 0.08), item.threshold],
    [0, 1]
  );
  const opacity = useTransform(
    progress,
    [Math.max(0, item.threshold - 0.08), item.threshold],
    [0, 1]
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-8 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center relative overflow-hidden">
        {item.checked ? (
          <motion.div
            style={{
              scale: shouldReduceMotion ? 1 : scale,
              opacity: shouldReduceMotion ? 1 : opacity,
            }}
            className="w-full h-full rounded-xl flex items-center justify-center"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
              <path
                d="M3.5 8.5L6.5 11.5L12.5 4.5"
                stroke={item.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        ) : (
          /* Empty rest day: Dim dot at 15% white */
          <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
        )}
      </div>

      <span className="text-[10px] font-mono text-[rgba(245,245,247,0.4)]">
        {item.label}
      </span>
    </div>
  );
};

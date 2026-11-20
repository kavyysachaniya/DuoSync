import React from 'react';
import { motion, MotionValue, useTransform, useReducedMotion } from 'motion/react';
import { THEME } from './theme';

interface ChapterRingsProps {
  progress: MotionValue<number>;
}

export const ChapterRings: React.FC<ChapterRingsProps> = ({ progress }) => {
  const shouldReduceMotion = useReducedMotion();

  // Radii & Circumferences for 4 concentric rings
  const strokeWidth = 8.5;
  const rings = [
    {
      id: 'steps',
      radius: 98,
      circumference: 2 * Math.PI * 98,
      gradId: 'gradSteps',
      base: THEME.rings.steps.base,
      tint: THEME.rings.steps.tint,
      targetPct: 0.84,
    },
    {
      id: 'weight',
      radius: 80,
      circumference: 2 * Math.PI * 80,
      gradId: 'gradWeight',
      base: THEME.rings.weight.base,
      tint: THEME.rings.weight.tint,
      targetPct: 0.92,
    },
    {
      id: 'water',
      radius: 62,
      circumference: 2 * Math.PI * 62,
      gradId: 'gradWater',
      base: THEME.rings.water.base,
      tint: THEME.rings.water.tint,
      targetPct: 0.76,
    },
    {
      id: 'sleep',
      radius: 44,
      circumference: 2 * Math.PI * 44,
      gradId: 'gradSleep',
      base: THEME.rings.sleep.base,
      tint: THEME.rings.sleep.tint,
      targetPct: 0.88,
    },
  ];

  // Scrubbed strokeDashoffset for each ring
  const offset0 = useTransform(progress, [0.00, 0.70], [rings[0].circumference, rings[0].circumference * (1 - rings[0].targetPct)]);
  const offset1 = useTransform(progress, [0.05, 0.75], [rings[1].circumference, rings[1].circumference * (1 - rings[1].targetPct)]);
  const offset2 = useTransform(progress, [0.10, 0.80], [rings[2].circumference, rings[2].circumference * (1 - rings[2].targetPct)]);
  const offset3 = useTransform(progress, [0.15, 0.85], [rings[3].circumference, rings[3].circumference * (1 - rings[3].targetPct)]);

  const offsets = [offset0, offset1, offset2, offset3];

  // Center counting percentage (0 to 86)
  const countNumber = useTransform(progress, [0.00, 0.80], [0, 86]);
  const [displayCount, setDisplayCount] = React.useState(shouldReduceMotion ? 86 : 0);

  React.useEffect(() => {
    if (shouldReduceMotion) return;
    const unsubscribe = countNumber.on('change', (val) => {
      setDisplayCount(Math.round(val));
    });
    return () => unsubscribe();
  }, [countNumber, shouldReduceMotion]);

  return (
    <div className="w-full flex flex-col items-center justify-center text-center space-y-6">
      {/* Centered Graphic (~65% height feel) */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center select-none">
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full -rotate-90 overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients: Each color to a slightly lighter tint of itself */}
            {rings.map((r) => (
              <linearGradient key={r.gradId} id={r.gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={r.base} />
                <stop offset="100%" stopColor={r.tint} />
              </linearGradient>
            ))}
          </defs>

          {/* Faint Background Tracks at 8% white */}
          {rings.map((r) => (
            <circle
              key={`track-${r.id}`}
              cx="120"
              cy="120"
              r={r.radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              fill="none"
            />
          ))}

          {/* Animated Scroll-Scrubbed Progress Arcs */}
          {rings.map((r, i) => (
            <motion.circle
              key={`arc-${r.id}`}
              cx="120"
              cy="120"
              r={r.radius}
              stroke={`url(#${r.gradId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={r.circumference}
              style={{
                strokeDashoffset: shouldReduceMotion
                  ? r.circumference * (1 - r.targetPct)
                  : offsets[i],
              }}
              fill="none"
            />
          ))}
        </svg>

        {/* Center Number Counting Up */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl sm:text-3xl font-light font-mono text-white tabular-nums tracking-tight">
            {displayCount}%
          </span>
          <span className="text-[11px] font-mono text-[rgba(245,245,247,0.6)] mt-0.5">
            in sync
          </span>
        </div>
      </div>

      {/* 2-Word Title & Short Caption Below */}
      <div className="space-y-1.5 px-4 max-w-[280px]">
        <h3 className="text-xl sm:text-2xl font-light tracking-tight text-[#F5F5F7]">
          Daily Rings
        </h3>
        <p className="text-[14px] leading-relaxed text-[rgba(245,245,247,0.6)]">
          Four vitals. Always in sync.
        </p>
      </div>
    </div>
  );
};

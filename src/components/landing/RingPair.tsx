import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface RingPairProps {
  className?: string;
}

/**
 * RingPair: Minimal graphic centerpiece for the Hero.
 * Two overlapping activity rings connected by a live pulse line
 * with a traveling dot symbolizing real-time partner connection.
 */
export const RingPair: React.FC<RingPairProps> = ({ className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  // Ring geometry
  const radius = 54;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius; // ~339.29

  // Partner 1: 82% complete (Rose to Amber)
  const p1Offset = circumference * (1 - 0.82);
  // Partner 2: 74% complete (Violet to Sky)
  const p2Offset = circumference * (1 - 0.74);

  return (
    <div
      role="img"
      aria-label="Two synchronized activity rings connected by a live pulse"
      className={`relative w-full max-w-[320px] mx-auto select-none flex items-center justify-center ${className}`}
    >
      <motion.div
        animate={
          shouldReduceMotion
            ? {}
            : {
                scale: [1, 1.025, 1],
              }
        }
        transition={{
          repeat: Infinity,
          duration: 4,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="relative w-full aspect-[16/10] flex items-center justify-center"
      >
        <svg
          viewBox="0 0 320 200"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Primary Accent Gradient: Rose (#F43F5E) to Soft Pink (#FDA4AF) */}
            <linearGradient id="roseAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#FDA4AF" />
            </linearGradient>

            {/* Secondary Partner Gradient: Sky (#38BDF8) to Soft Sky (#BAE6FD) */}
            <linearGradient id="violetSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#BAE6FD" />
            </linearGradient>

            {/* Subtle glow filters */}
            <filter id="ringGlowRose" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#F43F5E" floodOpacity="0.35" />
            </filter>
            <filter id="ringGlowViolet" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#38BDF8" floodOpacity="0.35" />
            </filter>
            <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#FFFFFF" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Connected Bridge Line between Ring Centers */}
          <path
            d="M 115 100 C 145 92, 175 92, 205 100"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />

          {/* Live Traveling Connection Dot */}
          {!shouldReduceMotion && (
            <motion.circle
              r="3.5"
              fill="#FFFFFF"
              filter="url(#dotGlow)"
              initial={{ cx: 115, cy: 100 }}
              animate={{
                cx: [115, 160, 205, 160, 115],
                cy: [100, 93, 100, 93, 100],
                opacity: [0.6, 1, 0.6, 1, 0.6],
              }}
              transition={{
                repeat: Infinity,
                duration: 3.6,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* LEFT RING (Partner 1) - Center (115, 100) */}
          <g transform="rotate(-90 115 100)">
            {/* Background Track at 8% white */}
            <circle
              cx="115"
              cy="100"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Animated Draw Arc */}
            <motion.circle
              cx="115"
              cy="100"
              r={radius}
              stroke="url(#roseAmberGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: p1Offset }}
              transition={{
                duration: 1.2,
                delay: 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              filter="url(#ringGlowRose)"
              fill="none"
            />
          </g>

          {/* RIGHT RING (Partner 2) - Center (205, 100) */}
          <g transform="rotate(-90 205 100)">
            {/* Background Track at 8% white */}
            <circle
              cx="205"
              cy="100"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Animated Draw Arc */}
            <motion.circle
              cx="205"
              cy="100"
              r={radius}
              stroke="url(#violetSkyGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: p2Offset }}
              transition={{
                duration: 1.2,
                delay: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
              filter="url(#ringGlowViolet)"
              fill="none"
            />
          </g>

          {/* Minimal Ring Center Accents */}
          <circle cx="115" cy="100" r="3" fill="#F43F5E" opacity="0.9" />
          <circle cx="205" cy="100" r="3" fill="#38BDF8" opacity="0.9" />
        </svg>
      </motion.div>
    </div>
  );
};

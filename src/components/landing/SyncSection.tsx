import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'motion/react';

export const SyncSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.22,
    restDelta: 0.001,
  });

  // Harmonious, synchronized levitation together
  const phoneY = useTransform(smoothProgress, [0, 0.5, 1], [10, 0, -10]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full max-w-[390px] mx-auto py-16 px-4 overflow-hidden flex flex-col items-center justify-center space-y-8 select-none"
    >
      {/* Headline & Subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl sm:text-3xl font-light tracking-[-0.03em] text-white">
          Two phones. One rhythm.
        </h2>
        <p className="text-[14px] text-white/60 font-normal">
          Live partner sync every second of the day.
        </p>
      </motion.div>

      {/* Two Harmoniously Aligned Phone Silhouettes with Bridge Between */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : phoneY }}
        className="relative w-full max-w-[340px] flex items-center justify-center select-none"
      >
        {/* PHONE 1 (Partner 1 / Kavy) */}
        <div className="w-[128px] sm:w-[136px] h-[220px] rounded-[24px] bg-[#0E0E13] border border-white/[0.12] backdrop-blur-xl p-2.5 flex flex-col justify-between shadow-2xl relative shrink-0">
          {/* Top Notch + Label */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-1.5 rounded-full bg-white/20" />
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C8A]" />
              <span className="text-[9px] font-medium text-white/70">Kavy</span>
            </div>
          </div>

          {/* Activity Ring (Rose to Amber) */}
          <div className="flex-1 flex flex-col items-center justify-center my-auto">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  stroke="url(#syncRose)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * 0.18}
                  fill="none"
                />
                <defs>
                  <linearGradient id="syncRose" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F43F5E" />
                    <stop offset="100%" stopColor="#FDA4AF" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute text-[10px] font-mono text-white/90 font-bold">
                82%
              </span>
            </div>
            <span className="text-[9px] font-mono text-white/45 mt-1">10,480 steps</span>
          </div>

          {/* Bottom Home Indicator */}
          <div className="w-10 h-1 rounded-full bg-white/25 mx-auto" />
        </div>

        {/* Sync Laser Bridge ONLY in the gap between the phones */}
        <div className="relative w-8 sm:w-12 h-6 flex items-center justify-center shrink-0">
          {/* Connecting Laser Line */}
          <div className="w-full h-[1.5px] bg-gradient-to-r from-[#F43F5E] via-white to-[#38BDF8] shadow-[0_0_8px_rgba(255,255,255,0.7)]" />

          {/* Traveling Sync Pulse Dot */}
          {!shouldReduceMotion && (
            <motion.div
              animate={{
                x: [-12, 12, -12],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: 'easeInOut',
              }}
              className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]"
            />
          )}
        </div>

        {/* PHONE 2 (Partner 2 / Sneha) */}
        <div className="w-[128px] sm:w-[136px] h-[220px] rounded-[24px] bg-[#0E0E13] border border-white/[0.12] backdrop-blur-xl p-2.5 flex flex-col justify-between shadow-2xl relative shrink-0">
          {/* Top Notch + Label */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-1.5 rounded-full bg-white/20" />
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
              <span className="text-[9px] font-medium text-white/70">Sneha</span>
            </div>
          </div>

          {/* Activity Ring (Sky / Indigo) */}
          <div className="flex-1 flex flex-col items-center justify-center my-auto">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  stroke="url(#syncSky)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * 0.26}
                  fill="none"
                />
                <defs>
                  <linearGradient id="syncSky" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#818CF8" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute text-[10px] font-mono text-white/90 font-bold">
                74%
              </span>
            </div>
            <span className="text-[9px] font-mono text-white/45 mt-1">9,820 steps</span>
          </div>

          {/* Bottom Home Indicator */}
          <div className="w-10 h-1 rounded-full bg-white/25 mx-auto" />
        </div>
      </motion.div>
    </section>
  );
};

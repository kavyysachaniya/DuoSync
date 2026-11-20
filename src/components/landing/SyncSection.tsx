import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';

export const SyncSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Scroll-linked mirroring motion: Left rises, Right descends
  const phone1Y = useTransform(scrollYProgress, [0, 1], [24, -24]);
  const phone2Y = useTransform(scrollYProgress, [0, 1], [-24, 24]);
  const ringRotate1 = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const ringRotate2 = useTransform(scrollYProgress, [0, 1], [120, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full max-w-[390px] mx-auto py-12 px-6 overflow-hidden flex flex-col items-center justify-center space-y-8"
    >
      {/* Single Phrase Headline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-light tracking-[-0.03em] text-white">
          Two phones. One rhythm.
        </h2>
      </motion.div>

      {/* Two Mirroring Phone Silhouettes */}
      <div className="relative w-full max-w-[300px] h-[240px] flex items-center justify-center gap-3">
        {/* Sync connecting beam */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-24 h-px bg-gradient-to-r from-[#FF5C8A]/40 via-white/30 to-[#38BDF8]/40" />
        </div>

        {/* PHONE 1 (Partner 1) */}
        <motion.div
          style={{ y: shouldReduceMotion ? 0 : phone1Y }}
          className="w-[126px] h-[216px] rounded-[26px] bg-[#0E0F17]/95 border border-white/[0.12] backdrop-blur-xl p-2.5 flex flex-col justify-between shadow-2xl relative select-none"
        >
          {/* Dynamic Island / Notch */}
          <div className="w-8 h-1.5 rounded-full bg-white/20 mx-auto" />

          {/* Activity Ring (Rose) */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div
              style={{ rotate: shouldReduceMotion ? 0 : ringRotate1 }}
              className="relative w-16 h-16 flex items-center justify-center"
            >
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
                  strokeDashoffset={2 * Math.PI * 24 * 0.22}
                  fill="none"
                />
                <defs>
                  <linearGradient id="syncRose" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF5C8A" />
                    <stop offset="100%" stopColor="#FFB86B" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute text-[10px] font-mono text-white/80 font-bold">
                82%
              </span>
            </motion.div>
          </div>

          {/* Bottom Home Indicator */}
          <div className="w-10 h-1 rounded-full bg-white/25 mx-auto" />
        </motion.div>

        {/* PHONE 2 (Partner 2) */}
        <motion.div
          style={{ y: shouldReduceMotion ? 0 : phone2Y }}
          className="w-[126px] h-[216px] rounded-[26px] bg-[#0E0F17]/95 border border-white/[0.12] backdrop-blur-xl p-2.5 flex flex-col justify-between shadow-2xl relative select-none"
        >
          {/* Dynamic Island / Notch */}
          <div className="w-8 h-1.5 rounded-full bg-white/20 mx-auto" />

          {/* Activity Ring (Sky / Violet) */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div
              style={{ rotate: shouldReduceMotion ? 0 : ringRotate2 }}
              className="relative w-16 h-16 flex items-center justify-center"
            >
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
                  strokeDashoffset={2 * Math.PI * 24 * 0.28}
                  fill="none"
                />
                <defs>
                  <linearGradient id="syncSky" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#A78BFA" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute text-[10px] font-mono text-white/80 font-bold">
                74%
              </span>
            </motion.div>
          </div>

          {/* Bottom Home Indicator */}
          <div className="w-10 h-1 rounded-full bg-white/25 mx-auto" />
        </motion.div>
      </div>
    </section>
  );
};

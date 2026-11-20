import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'motion/react';
import { RingPair } from './RingPair';

interface HeroProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onHaveCode: () => void;
}

const ROTATING_LINES = [
  'Health in sync.',
  'Fit in sync.',
  'Skin in sync.',
] as const;

export const Hero: React.FC<HeroProps> = ({
  onGetStarted,
  onSignIn,
  onHaveCode,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [lineIndex, setLineIndex] = useState(0);

  // Rotate through the entire line every 3.0s
  useEffect(() => {
    if (shouldReduceMotion) return;
    const timer = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % ROTATING_LINES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [shouldReduceMotion]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.06,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <section className="relative w-full max-w-[390px] mx-auto px-5 pt-4 pb-8 flex flex-col justify-between min-h-[92dvh] sm:min-h-[88vh]">
      {/* 1. Header: DuoSync wordmark + logo mark left, single "Sign in" link right */}
      <motion.header
        variants={itemVariants}
        className="w-full flex items-center justify-between pt-1 pb-4"
      >
        <div className="flex items-center gap-2 select-none">
          <div className="w-4 h-4 rounded-full border border-white/25 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <span className="text-[17px] font-semibold tracking-[-0.025em] text-white">
            DuoSync
          </span>
        </div>

        <button
          type="button"
          onClick={onSignIn}
          className="text-[13px] text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-end px-1 cursor-pointer active:scale-95"
        >
          Sign in
        </button>
      </motion.header>

      {/* 2. Headline & Subtext with Entire Line Rotating */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col justify-center my-auto py-4 space-y-6 text-center"
      >
        <div className="space-y-3">
          {/* Centered Rotating Full-Line Headline */}
          <div className="relative h-[44px] sm:h-[50px] w-full flex items-center justify-center overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              <motion.h1
                key={ROTATING_LINES[lineIndex]}
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { y: 26, opacity: 0, filter: 'blur(3px)' }
                }
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { y: -26, opacity: 0, filter: 'blur(3px)' }
                }
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="text-[36px] sm:text-[40px] leading-tight tracking-[-0.035em] font-light text-white text-center whitespace-nowrap"
              >
                {ROTATING_LINES[lineIndex]}
              </motion.h1>
            </AnimatePresence>
          </div>

          <motion.p
            variants={itemVariants}
            className="text-[15px] leading-relaxed text-white/60 max-w-[290px] mx-auto font-normal"
          >
            Vitals, care routines, and shared wardrobe for two.
          </motion.p>
        </div>

        {/* 3. Visual Centerpiece: Overlapping Rings */}
        <motion.div variants={itemVariants} className="py-2">
          <RingPair />
        </motion.div>
      </motion.div>

      {/* 4. Actions: Monochromatic Clean White Pill + Ghost Text */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="w-full space-y-3 pt-2"
      >
        <motion.button
          type="button"
          onClick={onGetStarted}
          whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
          className="w-full h-12 min-h-[48px] rounded-full bg-white text-zinc-950 font-medium text-sm flex items-center justify-center transition-all shadow-lg shadow-white/10 hover:bg-white/90 active:scale-[0.97] cursor-pointer"
        >
          Get started
        </motion.button>

        <motion.button
          type="button"
          onClick={onHaveCode}
          whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
          className="w-full h-10 min-h-[44px] text-[13px] text-white/50 hover:text-white/80 transition-colors flex items-center justify-center cursor-pointer"
        >
          I have a code
        </motion.button>
      </motion.div>
    </section>
  );
};

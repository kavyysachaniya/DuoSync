import React from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { RingPair } from './RingPair';

interface HeroProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onHaveCode: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onGetStarted,
  onSignIn,
  onHaveCode,
}) => {
  const shouldReduceMotion = useReducedMotion();

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
      {/* 1. Minimal Header: Tiny wordmark left, single "Sign in" link right */}
      <motion.header
        variants={itemVariants}
        className="w-full flex items-center justify-between pt-1 pb-4"
      >
        <span className="text-[13px] font-medium tracking-tight text-white/90 select-none">
          DuoPulse
        </span>
        <button
          type="button"
          onClick={onSignIn}
          className="text-[13px] text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-end px-1 cursor-pointer active:scale-95"
        >
          Sign in
        </button>
      </motion.header>

      {/* 2. Headline & Subtext */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col justify-center my-auto py-4 space-y-6 text-center"
      >
        <div className="space-y-3">
          <motion.h1
            variants={itemVariants}
            className="text-[42px] leading-[1.08] tracking-[-0.035em] font-light text-white text-balance"
          >
            Health, in sync.
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-[15px] leading-relaxed text-white/60 max-w-[280px] mx-auto font-normal"
          >
            Rings, routines and style, shared with your person.
          </motion.p>
        </div>

        {/* 3. Visual Centerpiece: Overlapping Rings */}
        <motion.div variants={itemVariants} className="py-2">
          <RingPair />
        </motion.div>
      </motion.div>

      {/* 4. Actions: Primary Pill + Ghost Text */}
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
          className="w-full h-12 min-h-[48px] rounded-full bg-gradient-to-r from-[#FF5C8A] to-[#FFB86B] text-zinc-950 font-medium text-sm flex items-center justify-center transition-shadow shadow-lg shadow-[#FF5C8A]/20 hover:shadow-[#FF5C8A]/35 active:scale-[0.97] cursor-pointer"
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

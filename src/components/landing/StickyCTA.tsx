import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface StickyCTAProps {
  isVisible: boolean;
  onGetStarted: () => void;
}

export const StickyCTA: React.FC<StickyCTAProps> = ({
  isVisible,
  onGetStarted,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: shouldReduceMotion ? 0 : 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: shouldReduceMotion ? 0 : 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 inset-x-0 z-40 bg-[#07070A]/85 backdrop-blur-2xl border-t border-white/[0.08] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-3 max-w-[390px] mx-auto select-none"
        >
          <span className="text-sm font-light text-white/85 tracking-tight">
            Start together.
          </span>

          <motion.button
            type="button"
            onClick={onGetStarted}
            whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
            className="h-11 min-h-[44px] px-6 rounded-full bg-gradient-to-r from-[#FF5C8A] to-[#FFB86B] text-zinc-950 font-medium text-xs flex items-center justify-center shadow-lg shadow-[#FF5C8A]/25 active:scale-95 cursor-pointer shrink-0"
          >
            Get started
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

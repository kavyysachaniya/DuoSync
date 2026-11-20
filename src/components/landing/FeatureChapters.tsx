import React, { useRef, useEffect, useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  useReducedMotion,
} from 'motion/react';
import { ChapterRings } from './ChapterRings';
import { ChapterRoutine } from './ChapterRoutine';
import { ChapterFits } from './ChapterFits';
import { ScrollProgress } from './ScrollProgress';

interface FeatureChaptersProps {
  onActiveChapterChange?: (index: number) => void;
}

export const FeatureChapters: React.FC<FeatureChaptersProps> = ({
  onActiveChapterChange,
}) => {
  const ch1Ref = useRef<HTMLDivElement>(null);
  const ch2Ref = useRef<HTMLDivElement>(null);
  const ch3Ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const shouldReduceMotion = useReducedMotion();
  const [activeChapter, setActiveChapter] = useState(0);

  // In-view detection for active indicator & background glow
  const isCh1InView = useInView(ch1Ref, { amount: 0.4, margin: '-10% 0px -10% 0px' });
  const isCh2InView = useInView(ch2Ref, { amount: 0.4, margin: '-10% 0px -10% 0px' });
  const isCh3InView = useInView(ch3Ref, { amount: 0.4, margin: '-10% 0px -10% 0px' });
  const isContainerInView = useInView(containerRef, { amount: 0.1 });

  useEffect(() => {
    let next = activeChapter;
    if (isCh3InView) {
      next = 2;
    } else if (isCh2InView) {
      next = 1;
    } else if (isCh1InView) {
      next = 0;
    }

    if (next !== activeChapter) {
      setActiveChapter(next);
      onActiveChapterChange?.(next);
    }
  }, [isCh1InView, isCh2InView, isCh3InView, activeChapter, onActiveChapterChange]);

  // Spring physics configuration for silky smooth scrubbing in both directions
  const springOptions = { stiffness: 95, damping: 26, mass: 0.22, restDelta: 0.001 };

  // CHAPTER 1 SCROLL: Begins animating as it enters from the bottom, scrubs smoothly both ways
  const { scrollYProgress: scroll1 } = useScroll({
    target: ch1Ref,
    offset: ['start end', 'center center'],
  });
  const smooth1 = useSpring(scroll1, springOptions);
  const ch1Y = useTransform(smooth1, [0, 0.4], [14, 0]);
  const ch1Opacity = useTransform(smooth1, [0, 0.25], [0.35, 1]);

  // CHAPTER 2 SCROLL: Begins animating as it enters from the bottom, scrubs smoothly both ways
  const { scrollYProgress: scroll2 } = useScroll({
    target: ch2Ref,
    offset: ['start end', 'center center'],
  });
  const smooth2 = useSpring(scroll2, springOptions);
  const ch2Y = useTransform(smooth2, [0, 0.4], [14, 0]);
  const ch2Opacity = useTransform(smooth2, [0, 0.25], [0.35, 1]);

  // CHAPTER 3 SCROLL: Begins animating as it enters from the bottom, scrubs smoothly both ways
  const { scrollYProgress: scroll3 } = useScroll({
    target: ch3Ref,
    offset: ['start end', 'center center'],
  });
  const smooth3 = useSpring(scroll3, springOptions);
  const ch3Y = useTransform(smooth3, [0, 0.4], [14, 0]);
  const ch3Opacity = useTransform(smooth3, [0, 0.25], [0.35, 1]);

  // Tap-to-jump smooth scrolling directly to a chapter
  const scrollToChapter = (index: number) => {
    const refs = [ch1Ref, ch2Ref, ch3Ref];
    refs[index]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {/* Right-Edge Progress Indicator */}
      <ScrollProgress
        activeChapter={activeChapter}
        isVisible={isContainerInView}
        onSelectChapter={scrollToChapter}
      />

      {/* CHAPTER 1: Daily Rings */}
      <section
        ref={ch1Ref}
        aria-label="Chapter 1: Daily Rings"
        className="w-full min-h-[92dvh] flex items-center justify-center py-10 px-4"
      >
        <motion.div
          style={{
            y: shouldReduceMotion ? 0 : ch1Y,
            opacity: shouldReduceMotion ? 1 : ch1Opacity,
            willChange: 'transform, opacity',
          }}
          className="w-full max-w-[390px] mx-auto flex items-center justify-center"
        >
          <ChapterRings progress={smooth1} />
        </motion.div>
      </section>

      {/* CHAPTER 2: Care Routine */}
      <section
        ref={ch2Ref}
        aria-label="Chapter 2: Care Routine"
        className="w-full min-h-[92dvh] flex items-center justify-center py-10 px-4"
      >
        <motion.div
          style={{
            y: shouldReduceMotion ? 0 : ch2Y,
            opacity: shouldReduceMotion ? 1 : ch2Opacity,
            willChange: 'transform, opacity',
          }}
          className="w-full max-w-[390px] mx-auto flex items-center justify-center"
        >
          <ChapterRoutine progress={smooth2} />
        </motion.div>
      </section>

      {/* CHAPTER 3: Digital Closet */}
      <section
        ref={ch3Ref}
        aria-label="Chapter 3: Digital Closet"
        className="w-full min-h-[92dvh] flex items-center justify-center py-10 px-4"
      >
        <motion.div
          style={{
            y: shouldReduceMotion ? 0 : ch3Y,
            opacity: shouldReduceMotion ? 1 : ch3Opacity,
            willChange: 'transform, opacity',
          }}
          className="w-full max-w-[390px] mx-auto flex items-center justify-center"
        >
          <ChapterFits progress={smooth3} />
        </motion.div>
      </section>
    </div>
  );
};

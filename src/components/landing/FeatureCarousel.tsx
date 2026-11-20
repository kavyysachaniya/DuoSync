import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

export const FeatureCarousel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-40px' });
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  // Monitor horizontal scroll to update active pagination index
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, clientWidth } = containerRef.current;
    const cardWidth = 280 + 16; // card width + gap
    const index = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(2, index)));
  };

  const scrollToCard = (index: number) => {
    if (!containerRef.current) return;
    const cardWidth = 280 + 16;
    containerRef.current.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth',
    });
    setActiveIndex(index);
  };

  return (
    <section className="relative w-full max-w-[390px] mx-auto py-10 space-y-6">
      {/* Horizontal Scroll-Snap Carousel */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full flex items-center overflow-x-auto snap-x snap-mandatory no-scrollbar px-6 gap-4 scroll-smooth"
      >
        {/* CARD 1: Rings */}
        <div
          className={`w-[276px] shrink-0 snap-center rounded-[26px] bg-[#101016]/90 border border-white/[0.08] backdrop-blur-xl p-6 h-[320px] flex flex-col justify-between select-none transition-all duration-300 ${
            activeIndex === 0 ? 'scale-100 opacity-100' : 'scale-[0.92] opacity-45'
          }`}
        >
          {/* Card Top Graphic: Concentric Filling Rings */}
          <div className="flex-1 flex items-center justify-center py-2">
            <svg
              viewBox="0 0 160 160"
              className="w-36 h-36 overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Ring - Steps (Rose) */}
              <circle
                cx="80"
                cy="80"
                r="64"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="8"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="64"
                stroke="#FF5C8A"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 64}
                initial={{ strokeDashoffset: 2 * Math.PI * 64 }}
                animate={
                  isInView
                    ? { strokeDashoffset: 2 * Math.PI * 64 * 0.22 }
                    : {}
                }
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                transform="rotate(-90 80 80)"
              />

              {/* Middle Ring - Water (Sky) */}
              <circle
                cx="80"
                cy="80"
                r="48"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="8"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="48"
                stroke="#38BDF8"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 48}
                initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                animate={
                  isInView
                    ? { strokeDashoffset: 2 * Math.PI * 48 * 0.3 }
                    : {}
                }
                transition={{ duration: 1.2, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                transform="rotate(-90 80 80)"
              />

              {/* Inner Ring - Sleep (Mint) */}
              <circle
                cx="80"
                cy="80"
                r="32"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="8"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="32"
                stroke="#34D399"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 32}
                initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                animate={
                  isInView
                    ? { strokeDashoffset: 2 * Math.PI * 32 * 0.18 }
                    : {}
                }
                transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                transform="rotate(-90 80 80)"
              />
            </svg>
          </div>

          {/* 2-Word Title Only */}
          <div className="pt-2 border-t border-white/[0.06]">
            <h3 className="text-lg font-light tracking-tight text-white">
              Daily Rings
            </h3>
          </div>
        </div>

        {/* CARD 2: Routine */}
        <div
          className={`w-[276px] shrink-0 snap-center rounded-[26px] bg-[#101016]/90 border border-white/[0.08] backdrop-blur-xl p-6 h-[320px] flex flex-col justify-between select-none transition-all duration-300 ${
            activeIndex === 1 ? 'scale-100 opacity-100' : 'scale-[0.92] opacity-45'
          }`}
        >
          {/* Card Top Graphic: Minimal Weekly Dot-Grid with Popping Checks */}
          <div className="flex-1 flex flex-col items-center justify-center py-2 space-y-4">
            <div className="grid grid-cols-4 gap-3 w-full max-w-[200px]">
              {[
                { day: 'M', checked: true, color: '#FF5C8A' },
                { day: 'T', checked: true, color: '#38BDF8' },
                { day: 'W', checked: true, color: '#FFB86B' },
                { day: 'T', checked: false, color: '' },
                { day: 'F', checked: true, color: '#34D399' },
                { day: 'S', checked: true, color: '#A78BFA' },
                { day: 'S', checked: false, color: '' },
                { day: '★', checked: true, color: '#FF5C8A' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all ${
                      item.checked
                        ? 'bg-white/[0.07] border-white/20'
                        : 'bg-white/[0.02] border-white/5'
                    }`}
                  >
                    {item.checked ? (
                      <motion.svg
                        viewBox="0 0 16 16"
                        className="w-3.5 h-3.5"
                        fill="none"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={
                          isInView
                            ? { scale: [0, 1.25, 1], opacity: 1 }
                            : {}
                        }
                        transition={{
                          duration: 0.45,
                          delay: 0.1 + i * 0.06,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <path
                          d="M3 8.5L6.5 12L13 4.5"
                          stroke={item.color || '#FFFFFF'}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-white/35">
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2-Word Title Only */}
          <div className="pt-2 border-t border-white/[0.06]">
            <h3 className="text-lg font-light tracking-tight text-white">
              Care Routine
            </h3>
          </div>
        </div>

        {/* CARD 3: Closet */}
        <div
          className={`w-[276px] shrink-0 snap-center rounded-[26px] bg-[#101016]/90 border border-white/[0.08] backdrop-blur-xl p-6 h-[320px] flex flex-col justify-between select-none transition-all duration-300 ${
            activeIndex === 2 ? 'scale-100 opacity-100' : 'scale-[0.92] opacity-45'
          }`}
        >
          {/* Card Top Graphic: Soft Stack of 3 Outfit Tiles Fanning Out */}
          <div className="flex-1 flex items-center justify-center py-2 relative">
            <div className="relative w-40 h-36 flex items-center justify-center">
              {/* Tile 1 (Left tilt) */}
              <motion.div
                initial={{ rotate: 0, x: 0, y: 0 }}
                animate={
                  isInView && !shouldReduceMotion
                    ? { rotate: -10, x: -16, y: 6 }
                    : {}
                }
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="absolute w-24 h-32 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15 backdrop-blur-md shadow-xl flex flex-col justify-between p-2.5"
              >
                <div className="w-4 h-4 rounded-full bg-[#FF5C8A]/40" />
                <div className="w-full space-y-1">
                  <div className="w-8 h-1 rounded-full bg-white/30" />
                  <div className="w-12 h-1 rounded-full bg-white/15" />
                </div>
              </motion.div>

              {/* Tile 2 (Center) */}
              <motion.div
                initial={{ y: 0 }}
                animate={
                  isInView && !shouldReduceMotion
                    ? { y: -8 }
                    : {}
                }
                transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="absolute z-10 w-24 h-32 rounded-2xl bg-[#14151F] border border-white/20 backdrop-blur-md shadow-2xl flex flex-col justify-between p-2.5"
              >
                <div className="w-4 h-4 rounded-full bg-[#38BDF8]/50" />
                <div className="w-full space-y-1">
                  <div className="w-10 h-1 rounded-full bg-white/40" />
                  <div className="w-14 h-1 rounded-full bg-white/20" />
                </div>
              </motion.div>

              {/* Tile 3 (Right tilt) */}
              <motion.div
                initial={{ rotate: 0, x: 0, y: 0 }}
                animate={
                  isInView && !shouldReduceMotion
                    ? { rotate: 10, x: 16, y: 6 }
                    : {}
                }
                transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="absolute w-24 h-32 rounded-2xl bg-gradient-to-bl from-white/10 to-white/5 border border-white/15 backdrop-blur-md shadow-xl flex flex-col justify-between p-2.5"
              >
                <div className="w-4 h-4 rounded-full bg-[#A78BFA]/40" />
                <div className="w-full space-y-1">
                  <div className="w-7 h-1 rounded-full bg-white/30" />
                  <div className="w-11 h-1 rounded-full bg-white/15" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* 2-Word Title Only */}
          <div className="pt-2 border-t border-white/[0.06]">
            <h3 className="text-lg font-light tracking-tight text-white">
              Shared Closet
            </h3>
          </div>
        </div>
      </div>

      {/* Pagination Dots Below */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToCard(i)}
            aria-label={`Go to feature slide ${i + 1}`}
            className="min-h-[44px] min-w-[28px] flex items-center justify-center cursor-pointer"
          >
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeIndex === i
                  ? 'w-6 bg-white'
                  : 'w-1.5 bg-white/25 hover:bg-white/40'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
};

import React, { useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
} from 'motion/react';
import { X } from 'lucide-react';
import { AuthResponse } from '../../services/apiClient';
import { AuthCard } from '../AuthCard';
import { Hero } from './Hero';
import { FeatureCarousel } from './FeatureCarousel';
import { SyncSection } from './SyncSection';
import { StickyCTA } from './StickyCTA';

interface LandingPageProps {
  onAuthSuccess: (res: AuthResponse) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);

  // Detect when hero scrolls out of viewport to trigger StickyCTA
  const isHeroInView = useInView(heroRef, {
    amount: 0.15,
  });

  // Background Parallax Drift
  const { scrollY } = useScroll();
  const glowY1 = useTransform(scrollY, [0, 1000], [0, 180]);
  const glowY2 = useTransform(scrollY, [0, 1000], [0, -140]);

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-[#07070A] text-zinc-100 selection:bg-[#FF5C8A]/30 selection:text-white overflow-x-hidden font-sans">
      {/* Soft Ambient Radial Glow (Rose + Violet, 8-12% opacity drifting slowly) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          style={{ y: shouldReduceMotion ? 0 : glowY1 }}
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, 24, 0],
                  scale: [1, 1.08, 1],
                }
          }
          transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
          className="absolute -top-[15%] -left-[20%] w-[380px] sm:w-[480px] h-[380px] sm:h-[480px] rounded-full bg-[#FF5C8A] opacity-[0.09] blur-[110px]"
        />

        <motion.div
          style={{ y: shouldReduceMotion ? 0 : glowY2 }}
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: [0, -20, 0],
                  scale: [1, 1.1, 1],
                }
          }
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute top-[40%] -right-[25%] w-[340px] sm:w-[440px] h-[340px] sm:h-[440px] rounded-full bg-[#A78BFA] opacity-[0.11] blur-[120px]"
        />
      </div>

      {/* Main Content Layout (Mobile-first, max-w-[390px]) */}
      <div className="relative z-10 w-full max-w-[390px] mx-auto min-h-screen flex flex-col justify-between">
        {/* 1. HERO SECTION */}
        <div ref={heroRef} className="w-full">
          <Hero
            onGetStarted={() => openAuth('signup')}
            onSignIn={() => openAuth('signin')}
            onHaveCode={() => openAuth('signup')}
          />
        </div>

        {/* 2. FEATURE SHOWCASE CAROUSEL */}
        <div className="w-full pt-4 pb-8">
          <FeatureCarousel />
        </div>

        {/* 3. SYNC MOMENT SECTION */}
        <div className="w-full py-6">
          <SyncSection />
        </div>

        {/* 4. FINAL CTA & FOOTER */}
        <section className="w-full px-5 pt-8 pb-20 space-y-8 text-center select-none">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <h2 className="text-3xl sm:text-4xl font-light tracking-[-0.035em] text-white">
              Start together.
            </h2>
            <p className="text-[15px] text-white/60 font-normal">
              Built for two.
            </p>

            <div className="pt-2">
              <motion.button
                type="button"
                onClick={() => openAuth('signup')}
                whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                className="w-full h-12 min-h-[48px] rounded-full bg-gradient-to-r from-[#FF5C8A] to-[#FFB86B] text-zinc-950 font-medium text-sm flex items-center justify-center transition-shadow shadow-lg shadow-[#FF5C8A]/20 hover:shadow-[#FF5C8A]/35 active:scale-[0.97] cursor-pointer"
              >
                Get started
              </motion.button>
            </div>
          </motion.div>

          <footer className="pt-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/40">
            <span className="font-medium text-white/60">DuoPulse</span>
            <span>Shared vitals & routines</span>
          </footer>
        </section>
      </div>

      {/* 5. STICKY BOTTOM BAR (Appears when Hero scrolls out) */}
      <StickyCTA
        isVisible={!isHeroInView}
        onGetStarted={() => openAuth('signup')}
      />

      {/* 6. AUTH SHEET / MODAL */}
      <AnimatePresence>
        {authModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Account Access"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto no-scrollbar"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm rounded-[28px] bg-[#101016] border border-white/[0.12] shadow-2xl p-4 sm:p-5 my-auto"
            >
              {/* Close Button */}
              <div className="flex items-center justify-end pb-1">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(false)}
                  aria-label="Close dialog"
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Seamless Auth Card */}
              <AuthCard
                initialMode={authMode}
                onSuccess={(res) => {
                  setAuthModalOpen(false);
                  onAuthSuccess(res);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

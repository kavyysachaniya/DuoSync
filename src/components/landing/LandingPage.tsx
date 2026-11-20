import React, { useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
} from 'motion/react';
import { X } from 'lucide-react';
import { AuthResponse } from '../../services/apiClient';
import { AuthCard } from '../AuthCard';
import { Hero } from './Hero';
import { FeatureChapters } from './FeatureChapters';
import { SyncSection } from './SyncSection';
import { StickyCTA } from './StickyCTA';
import { Aurora } from './Aurora';

interface LandingPageProps {
  onAuthSuccess: (res: AuthResponse) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const finalCtaRef = useRef<HTMLDivElement>(null);

  // Detect when hero scrolls out of viewport to trigger StickyCTA
  const isHeroInView = useInView(heroRef, {
    amount: 0.25,
  });

  // Detect when bottom CTA is in view so StickyCTA does not duplicate or obstruct the final CTA
  const isFinalCtaInView = useInView(finalCtaRef, {
    amount: 0.2,
  });

  const isStickyVisible = !isHeroInView && !isFinalCtaInView;

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-[#07070A] text-zinc-100 selection:bg-white/20 selection:text-white overflow-x-clip font-sans">
      {/* Minimal Ethereal Aurora Background from React Bits (Clean, non-rainbow silver/white light) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <Aurora
          colorStops={['#ffffff', '#9aa0ad', '#ffffff']}
          amplitude={0.9}
          blend={0.5}
          height={0.48}
          speed={0.8}
          glow={0.7}
          brightness={0.75}
          opacity={0.32}
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

        {/* 2. FEATURE CHAPTERS (Vertical Scroll Reveal) */}
        <div className="w-full">
          <FeatureChapters />
        </div>

        {/* 3. SYNC MOMENT SECTION */}
        <div className="w-full py-6">
          <SyncSection />
        </div>

        {/* 4. FINAL CTA & FOOTER */}
        <section ref={finalCtaRef} className="w-full px-5 pt-8 pb-20 space-y-8 text-center select-none">
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
                className="w-full h-12 min-h-[48px] rounded-full bg-white text-zinc-950 font-medium text-sm flex items-center justify-center transition-all shadow-lg shadow-white/10 hover:bg-white/90 active:scale-[0.97] cursor-pointer"
              >
                Get started
              </motion.button>
            </div>
          </motion.div>

          <footer className="pt-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/40">
            <span className="font-medium text-white/60">DuoSync</span>
            <span>Shared vitals & routines</span>
          </footer>
        </section>
      </div>

      {/* 5. STICKY BOTTOM BAR (Smoothly slides in between Hero and Final CTA) */}
      <StickyCTA
        isVisible={isStickyVisible}
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
              className="relative w-full max-w-sm rounded-[28px] bg-[#0E0E13] border border-white/[0.08] shadow-2xl p-4 sm:p-5 my-auto"
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

import React from 'react';
import { motion, MotionValue, useTransform, useReducedMotion } from 'motion/react';
import { Check, Heart, Sparkles, Send, ArrowRight } from 'lucide-react';
import { THEME } from './theme';

interface ChapterFitsProps {
  progress: MotionValue<number>;
}

/**
 * Minimal, crisp SVG vector for the Oxford Button-Up Shirt
 */
const ShirtGraphic: React.FC = () => (
  <svg
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-16 h-16 text-white/90 drop-shadow-sm"
    aria-label="Oxford Shirt"
  >
    {/* Shirt Body & Sleeves */}
    <path
      d="M26 22L12 32L18 42L25 36V66H55V36L62 42L68 32L54 22L46 25C43 27 37 27 34 25L26 22Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="fill-white/[0.05]"
    />
    {/* Collar Lapels */}
    <path
      d="M26 22L36 30L40 25L44 30L54 22"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="fill-white/[0.12]"
    />
    {/* Center Button Placket */}
    <line
      x1="40"
      y1="30"
      x2="40"
      y2="66"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeDasharray="2 3"
      className="text-white/50"
    />
    {/* Chest Pocket */}
    <path
      d="M29 38H35V45C35 46.2 33.8 47.2 32 47.2C30.2 47.2 29 46.2 29 45V38Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white/60"
    />
  </svg>
);

/**
 * Minimal, crisp SVG vector for Straight Denim Jeans
 */
const JeansGraphic: React.FC = () => (
  <svg
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-16 h-16 text-white/90 drop-shadow-sm"
    aria-label="Straight Denim Jeans"
  >
    {/* Denim Trousers Outline */}
    <path
      d="M25 18H55L57 45L52 68H43L40 38L37 68H28L23 45L25 18Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="fill-white/[0.05]"
    />
    {/* Waistband Line */}
    <line
      x1="25"
      y1="23"
      x2="55"
      y2="23"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Rivet / Top Button */}
    <circle cx="40" cy="20.5" r="1.5" fill="currentColor" />
    {/* Fly Stitch */}
    <path
      d="M40 23V32C40 33.8 38.5 35 36.5 35"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className="text-white/60"
    />
    {/* Front Curved Pockets */}
    <path
      d="M25 24C30 25 32 29 32 34"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="text-white/60"
    />
    <path
      d="M55 24C50 25 48 29 48 34"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="text-white/60"
    />
    {/* Coin Pocket */}
    <path
      d="M47 26H52V29H47V26Z"
      stroke="currentColor"
      strokeWidth="1.2"
      className="text-white/40"
    />
  </svg>
);

export const ChapterFits: React.FC<ChapterFitsProps> = ({ progress }) => {
  const shouldReduceMotion = useReducedMotion();

  // Scroll-scrubbed transforms
  const cardScale = useTransform(progress, [0.05, 0.75], [0.94, 1]);
  const bubbleY = useTransform(progress, [0.08, 0.65], [-12, 0]);
  const bubbleOpacity = useTransform(progress, [0.08, 0.55], [0.3, 1]);

  const shirtX = useTransform(progress, [0.1, 0.75], [-16, 0]);
  const shirtRotate = useTransform(progress, [0.1, 0.75], [-3, 0]);

  const jeansX = useTransform(progress, [0.1, 0.75], [16, 0]);
  const jeansRotate = useTransform(progress, [0.1, 0.75], [3, 0]);

  const responseScale = useTransform(progress, [0.35, 0.85], [0.92, 1]);
  const responseOpacity = useTransform(progress, [0.35, 0.75], [0, 1]);

  return (
    <div className="w-full flex flex-col items-center justify-center text-center space-y-6">
      {/* Centered Visual Showcase: DuoSync Outfit Studio Recommendation */}
      <motion.div
        style={{
          scale: shouldReduceMotion ? 1 : cardScale,
        }}
        className="relative w-full max-w-[340px] rounded-[28px] p-[1px] bg-gradient-to-b from-white/25 via-white/10 to-transparent shadow-2xl select-none"
      >
        <div className="w-full rounded-[27px] bg-[#0E0E13] p-4 space-y-3.5 text-left border border-white/[0.04]">
          {/* 1. Header: Couple Avatars + Occasion Badge */}
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            {/* Couple avatars & direction */}
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-1.5">
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                  K
                </div>
                <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-[10px] font-bold text-rose-300 shadow-sm">
                  S
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-white/80 font-medium">
                <span>Kavy</span>
                <ArrowRight className="w-3 h-3 text-white/40" />
                <span>Sneha</span>
              </div>
            </div>

            {/* Occasion Pill */}
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-mono text-zinc-300 tracking-wide">
              Casual Out
            </span>
          </div>

          {/* 2. Intimate Suggestion Prompt from Kavy */}
          <motion.div
            style={{
              y: shouldReduceMotion ? 0 : bubbleY,
              opacity: shouldReduceMotion ? 1 : bubbleOpacity,
            }}
            className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-3 flex items-start gap-2.5"
          >
            <div className="w-7 h-7 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-white/90" />
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                  Outfit Idea
                </span>
                <span className="text-[9px] font-mono text-white/30">Today</span>
              </div>
              <p className="text-[13px] font-medium text-white leading-snug">
                “Wear this today — looks effortless on you 🤍”
              </p>
            </div>
          </motion.div>

          {/* 3. The Curated Duo: Shirt & Jeans from DuoSync Wardrobe */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5 relative">
            {/* PIECE 1: Button-Up Shirt (Tops) */}
            <motion.div
              style={{
                x: shouldReduceMotion ? 0 : shirtX,
                rotate: shouldReduceMotion ? 0 : shirtRotate,
              }}
              className="rounded-2xl bg-[#14151C] border border-white/[0.1] p-3 flex flex-col justify-between space-y-2 hover:border-white/20 transition-colors shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
                  Tops
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-white border border-white/40" />
                  <span className="text-[9px] font-mono text-white/50">M</span>
                </div>
              </div>

              {/* Graphic Icon */}
              <div className="w-full py-1 flex items-center justify-center">
                <ShirtGraphic />
              </div>

              {/* Title & Brand */}
              <div>
                <h4 className="text-[12px] font-semibold text-white leading-tight">
                  Oxford Shirt
                </h4>
                <p className="text-[10px] text-white/50 font-normal truncate mt-0.5">
                  Chalk White
                </p>
              </div>
            </motion.div>

            {/* PIECE 2: Straight Jeans (Bottoms) */}
            <motion.div
              style={{
                x: shouldReduceMotion ? 0 : jeansX,
                rotate: shouldReduceMotion ? 0 : jeansRotate,
              }}
              className="rounded-2xl bg-[#14151C] border border-white/[0.1] p-3 flex flex-col justify-between space-y-2 hover:border-white/20 transition-colors shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
                  Bottoms
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#38BDF8] border border-white/30" />
                  <span className="text-[9px] font-mono text-white/50">30</span>
                </div>
              </div>

              {/* Graphic Icon */}
              <div className="w-full py-1 flex items-center justify-center">
                <JeansGraphic />
              </div>

              {/* Title & Brand */}
              <div>
                <h4 className="text-[12px] font-semibold text-white leading-tight">
                  Straight Denim
                </h4>
                <p className="text-[10px] text-white/50 font-normal truncate mt-0.5">
                  Vintage Indigo
                </p>
              </div>
            </motion.div>
          </div>

          {/* 4. Sneha's In-Sync Reaction & Confirmation */}
          <motion.div
            style={{
              scale: shouldReduceMotion ? 1 : responseScale,
              opacity: shouldReduceMotion ? 1 : responseOpacity,
            }}
            className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-3 py-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                <Check className="w-3 h-3" />
              </span>
              <span className="text-[11px] font-medium text-white/90">
                Sneha: <span className="text-white/60">Loved it · Wearing today!</span>
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/40">
              Synced
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Title, Subtext & Tag */}
      <div className="space-y-2 px-4 max-w-[310px] mx-auto">
        <h3 className="text-xl sm:text-2xl font-light tracking-tight text-[#F5F5F7]">
          Digital Closet
        </h3>
        <p className="text-[14px] leading-relaxed text-[rgba(245,245,247,0.6)]">
          Pick pieces from your wardrobe, suggest daily looks, and stay styled together.
        </p>

        {/* Micro pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-white/70">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>Shared Wardrobe · Styled for Two</span>
        </div>
      </div>
    </div>
  );
};

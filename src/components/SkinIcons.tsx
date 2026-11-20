import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. TOP SEGMENT ICONS (Skincare, Haircare, Bodycare)
// ══════════════════════════════════════════════════════════════════════════════

/** Skincare: Cosmetic Serum Dropper Pipette & Bottle */
export const SkincareSegmentIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Dropper bulb & pipette cap */}
    <path d="M10 2h4M12 2v3M9 5h6v2H9z" />
    {/* Bottle shoulders & body */}
    <path d="M7 10a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10z" />
    {/* Liquid level inside bottle */}
    <path d="M7 14c1.5-.7 3.5-.7 5 0s3.5.7 5 0" />
    {/* Droplet sparkling beside */}
    <path d="M19 4c0 1.2-.9 2-1.8 2s-1.8-.8-1.8-2c0-.8 1.8-2.5 1.8-2.5S19 3.2 19 4z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

/** Haircare: Shampoo / Conditioner Dispenser with Wave Strand */
export const HaircareSegmentIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Pump top */}
    <path d="M10 2h5M12 2v4M9 6h6" />
    {/* Bottle body */}
    <path d="M7 9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V9z" />
    {/* Flowing hair wave motif on bottle */}
    <path d="M10 12c1.2-1 2.8 1 4 0" />
    <path d="M10 15c1.2-1 2.8 1 4 0" />
  </svg>
);

/** Bodycare: Body Lotion Pump Bottle & Hydration Drop */
export const BodycareSegmentIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Pump spout & neck */}
    <path d="M8 3h6M11 3v4M8 7h6" />
    {/* Rounded body lotion bottle */}
    <path d="M6 11a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v8a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-8z" />
    {/* Gentle moisture droplet mark */}
    <path d="M12 11c0 1.5-1.2 2.5-2 2.5s-2-1-2-2.5c0-1.2 2-3 2-3s2 1.8 2 3z" fill="currentColor" fillOpacity="0.25" />
  </svg>
);

// ══════════════════════════════════════════════════════════════════════════════
// 2. PRODUCT CATEGORY & ITEM ICONS
// ══════════════════════════════════════════════════════════════════════════════

/** Cleanser / Face Wash: Foaming Bottle */
export const CleanserIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 3h4M12 3v3M8 6h8" />
    <path d="M7 9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9z" />
    {/* Foam bubbles */}
    <circle cx="11" cy="12" r="1.5" />
    <circle cx="13.5" cy="15" r="1" />
  </svg>
);

/** Toner / Mist: Spray Bottle */
export const TonerIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 4h4M12 4v3M9 7h6" />
    <path d="M7 10a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9z" />
    {/* Spray mist particles */}
    <path d="M19 6l1.5-1M19 8h2M18.5 10.5L20 11.5" />
  </svg>
);

/** Serum / Essence: Dropper Bottle */
export const SerumIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 2h4M12 2v4M9 6h6v2H9z" />
    <path d="M7 10a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9z" />
    <circle cx="12" cy="14" r="1.5" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

/** Moisturizer / Cream: Cream Tub / Jar */
export const MoisturizerIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Jar Lid */}
    <rect x="5" y="6" width="14" height="3" rx="1.5" />
    {/* Jar Body */}
    <path d="M6 9h12v7a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V9z" />
    {/* Cream Swirl */}
    <path d="M9 13c1.5-1 4.5-1 6 0" />
  </svg>
);

/** Sunscreen: Tube with Sun Symbol */
export const SunscreenIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Tube cap */}
    <rect x="9" y="18" width="6" height="3" rx="1" />
    {/* Tube body */}
    <path d="M7 4h10l-1.5 14h-7L7 4z" />
    {/* Sun rays & disc */}
    <circle cx="12" cy="10" r="2" />
    <path d="M12 6.5v1M12 12.5v1M8.5 10h1M14.5 10h1" />
  </svg>
);

/** Exfoliant: Scrub Tube with Exfoliating Dots */
export const ExfoliantIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="18" width="6" height="3" rx="1" />
    <path d="M7 4h10l-1.5 14h-7L7 4z" />
    <circle cx="11" cy="9" r="0.8" fill="currentColor" />
    <circle cx="13" cy="11" r="0.8" fill="currentColor" />
    <circle cx="11.5" cy="13" r="0.8" fill="currentColor" />
  </svg>
);

/** Eye Cream: Precision Tip Tube */
export const EyeCreamIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 2h2l1 5H10l1-5z" />
    <path d="M9 7h6l-1 13H10L9 7z" />
    <path d="M9 20h6v2H9z" />
  </svg>
);

/** Lip Care: Lip Balm / Balm Stick */
export const LipCareIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="8" y="11" width="8" height="10" rx="1.5" />
    <path d="M9 11V6a3 3 0 0 1 6 0v5" />
    <path d="M9 7c1-.7 3-.7 4 0" />
  </svg>
);

/** Haircare: Shampoo Bottle */
export const ShampooIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 2h4M12 2v3M9 5h6" />
    <path d="M7 8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8z" />
    <path d="M10 11c1-.8 3-.8 4 0" />
  </svg>
);

/** Haircare: Conditioner Bottle with Silk Drop */
export const ConditionerIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="18" width="6" height="3" rx="1" />
    <path d="M7 6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2l-1 12H8L7 6z" />
    <path d="M12 9c0 1.5-.8 2.5-1.5 2.5S9 10.5 9 9c0-1 1.5-2 1.5-2S12 8 12 9z" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

/** Hair Oil / Scalp Serum: Pipette Elixir Bottle */
export const HairOilIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 3h4M12 3v3M9 6h6v2H9z" />
    <path d="M8 10a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-9z" />
    <path d="M12 12c0 1.2-.8 2-1.5 2S9 13.2 9 12c0-.8 1.5-2 1.5-2S12 11.2 12 12z" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

/** Body Wash: Shower Gel Pump */
export const BodyWashIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 3h6M12 3v3M8 6h8" />
    <path d="M7 9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9z" />
    <circle cx="12" cy="13" r="1.5" />
    <circle cx="10" cy="16" r="1" />
  </svg>
);

/** Body Scrub: Wide Scrub Tub */
export const BodyScrubIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="6" width="16" height="3" rx="1.5" />
    <path d="M5 9h14v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z" />
    <circle cx="9" cy="14" r="0.8" fill="currentColor" />
    <circle cx="12" cy="13" r="0.8" fill="currentColor" />
    <circle cx="15" cy="14.5" r="0.8" fill="currentColor" />
  </svg>
);

/** Deodorant: Stick Applicator */
export const DeodorantIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="7" y="11" width="10" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <path d="M7 17h10" />
  </svg>
);

/** General Cosmetic Product Icon Fallback */
export const GeneralProductIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 4h3M9.5 4v3M7 7h5" />
    <rect x="6" y="9" width="7" height="11" rx="1.5" />
    <rect x="15" y="12" width="6" height="8" rx="1.5" />
    <rect x="16" y="10" width="4" height="2" rx="0.5" />
  </svg>
);

// ══════════════════════════════════════════════════════════════════════════════
// 3. 1:1 PRODUCT CARD PHOTO PLACEHOLDER
// ══════════════════════════════════════════════════════════════════════════════

/** Aesthetic 1:1 Cosmetic Jar & Serum Dropper Silhouette Placeholder */
export const ProductPhotoSilhouette: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Subtle backdrop circle */}
    <circle cx="32" cy="32" r="26" fill="currentColor" fillOpacity="0.04" />
    {/* Cosmetic Dropper Bottle */}
    <rect x="18" y="14" width="8" height="4" rx="2" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
    <path d="M22 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
    <path
      d="M16 22a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v24a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V22z"
      stroke="currentColor"
      strokeWidth="2"
      strokeOpacity="0.5"
    />
    <path d="M16 32c2-1 4.5-1 6.5 0s3.5 1 5.5 0" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    
    {/* Cream Jar Beside It */}
    <rect x="32" y="30" width="18" height="4" rx="1.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
    <path
      d="M33 34h16v10a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4V34z"
      stroke="currentColor"
      strokeWidth="2"
      strokeOpacity="0.5"
    />
    {/* Hydration droplet highlight */}
    <path
      d="M41 23c0 2-1.5 3.5-2.5 3.5s-2.5-1.5-2.5-3.5c0-1.5 2.5-4 2.5-4s2.5 2.5 2.5 4z"
      fill="currentColor"
      fillOpacity="0.25"
    />
  </svg>
);

// ══════════════════════════════════════════════════════════════════════════════
// 4. ACTION & STATUS ICONS (Camera, Upload, Routine Times)
// ══════════════════════════════════════════════════════════════════════════════

/** Camera with upload badge for 1:1 photo capture */
export const CameraUploadIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="14" r="3.5" />
    <path d="M18 11h.01" strokeWidth="2.5" />
  </svg>
);

/** Photo upload frame with upward arrow */
export const PhotoUploadIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M12 8v8M9 11l3-3 3 3" />
    <path d="M7 17h10" strokeWidth="1.5" strokeOpacity="0.5" />
  </svg>
);

/** Morning / AM Routine Sun Icon */
export const SunRoutineIcon: React.FC<IconProps> = ({ className = 'w-3 h-3' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

/** Evening / PM Routine Crescent Moon Icon */
export const MoonRoutineIcon: React.FC<IconProps> = ({ className = 'w-3 h-3' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

/** AM & PM Dual Routine Icon */
export const SunMoonRoutineIcon: React.FC<IconProps> = ({ className = 'w-3 h-3' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Left half sun */}
    <path d="M12 3a9 9 0 0 0 0 18V3z" fill="currentColor" fillOpacity="0.2" />
    {/* Sun rays on left */}
    <path d="M3 12h2M5.5 5.5l1.4 1.4M5.5 18.5l1.4-1.4" />
    {/* Right half moon */}
    <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9" />
  </svg>
);

/** Weekly Routine Calendar Icon */
export const WeeklyRoutineIcon: React.FC<IconProps> = ({ className = 'w-3 h-3' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 9h18" />
    {/* Days grid check */}
    <path d="M8 14l2 2 4-4" strokeWidth="2" />
  </svg>
);

/** Empty Care Shelf Illustration */
export const EmptyCareShelfIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Shelf plank */}
    <path d="M4 36h40M6 36v4M42 36v4" strokeWidth="2" />
    {/* Empty jars outlines */}
    <rect x="12" y="22" width="10" height="14" rx="2" strokeDasharray="3 3" strokeOpacity="0.5" />
    <path d="M15 18h4v4h-4z" strokeOpacity="0.4" />
    <rect x="26" y="26" width="12" height="10" rx="2" strokeDasharray="3 3" strokeOpacity="0.5" />
    <path d="M28 23h8v3h-8z" strokeOpacity="0.4" />
  </svg>
);

// ══════════════════════════════════════════════════════════════════════════════
// 5. CATEGORY ICON SELECTOR RESOLVER
// ══════════════════════════════════════════════════════════════════════════════

export function getCategoryIcon(categoryName: string, segment: string = 'skincare'): React.FC<IconProps> {
  const norm = (categoryName || '').toLowerCase().trim();

  // Skincare categories
  if (norm.includes('cleanse') || norm.includes('wash') || norm.includes('foam')) return CleanserIcon;
  if (norm.includes('tone') || norm.includes('mist')) return TonerIcon;
  if (norm.includes('serum') || norm.includes('essence') || norm.includes('ampoule')) return SerumIcon;
  if (norm.includes('moistur') || norm.includes('cream') || norm.includes('lotion')) return MoisturizerIcon;
  if (norm.includes('sun') || norm.includes('spf') || norm.includes('screen')) return SunscreenIcon;
  if (norm.includes('exfoli') || norm.includes('peel') || norm.includes('scrub') || norm.includes('bha') || norm.includes('aha')) return ExfoliantIcon;
  if (norm.includes('eye')) return EyeCreamIcon;
  if (norm.includes('lip') || norm.includes('balm')) return LipCareIcon;

  // Haircare categories
  if (norm.includes('shampoo')) return ShampooIcon;
  if (norm.includes('condition')) return ConditionerIcon;
  if (norm.includes('oil') || norm.includes('scalp')) return HairOilIcon;
  if (norm.includes('mask') || norm.includes('butter')) return MoisturizerIcon;

  // Bodycare categories
  if (norm.includes('body wash') || norm.includes('shower')) return BodyWashIcon;
  if (norm.includes('body scrub')) return BodyScrubIcon;
  if (norm.includes('deodorant') || norm.includes('roll')) return DeodorantIcon;
  if (norm.includes('body lotion') || norm.includes('body butter')) return MoisturizerIcon;

  // Segment fallback
  if (segment === 'haircare') return HaircareSegmentIcon;
  if (segment === 'bodycare') return BodycareSegmentIcon;
  return GeneralProductIcon;
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. NAVIGATION ICONS (Shampoo Bottle & Collared Shirt)
// ══════════════════════════════════════════════════════════════════════════════

/** Navigation Icon: Elegant Personal Care / Shampoo Pump Bottle for Skin */
export const ShampooBottleNavIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Pump dispenser nozzle pointing left */}
    <path d="M8.5 2.5h5.5" />
    {/* Pump nozzle downward spout tip */}
    <path d="M8.5 2.5v1.2" />
    {/* Pump central stem */}
    <path d="M12 2.5v2.5" />
    {/* Pump collar / neck cap */}
    <rect x="9.5" y="5" width="5" height="2.5" rx="0.5" />
    {/* Bottle shoulders & body (seamlessly connected under cap) */}
    <path d="M9.5 7.5H7.5A2.5 2.5 0 0 0 5 10v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2.5 2.5 0 0 0-2.5-2.5h-2" />
    {/* Minimalist shelf label lines */}
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="10" y1="16" x2="14" y2="16" />
  </svg>
);

/** Navigation Icon: Full-Sleeved Oxford Button-Down Shirt for Fits */
export const CollaredShirtNavIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Full-sleeved shirt outer silhouette: shoulders, long sleeves down to cuffs, torso, and curved Oxford bottom hem */}
    <path d="M8.5 3L3.5 6.5L2 19.5H5L7 10V21C9.5 22 14.5 22 17 21V10L19 19.5H22L20.5 6.5L15.5 3" />
    {/* Left & Right Wrist Cuffs */}
    <line x1="2" y1="17" x2="5" y2="17" />
    <line x1="19" y1="17" x2="22" y2="17" />
    {/* Oxford Button-Down Collar */}
    <path d="M8.5 3C10 2.2 14 2.2 15.5 3" />
    <path d="M8.5 3L12 7.5L10 8L8.5 3" />
    <path d="M15.5 3L12 7.5L14 8L15.5 3" />
    {/* Collar point buttons */}
    <circle cx="10" cy="8" r="0.45" fill="currentColor" />
    <circle cx="14" cy="8" r="0.45" fill="currentColor" />
    {/* Center Button Placket */}
    <line x1="12" y1="7.5" x2="12" y2="21.5" />
    {/* Placket Buttons */}
    <circle cx="12" cy="11.5" r="0.6" fill="currentColor" />
    <circle cx="12" cy="15" r="0.6" fill="currentColor" />
    <circle cx="12" cy="18.5" r="0.6" fill="currentColor" />
  </svg>
);


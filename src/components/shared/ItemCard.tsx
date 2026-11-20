import React from 'react';
import { motion } from 'motion/react';

export interface ItemCardProps {
  id: string;
  name: string;
  brand: string;
  category: string;
  color?: string; // hex or color name (e.g. '#38bdf8' or 'Navy Blue')
  imageUrl?: string;
  thumbnailUrl?: string;
  index?: number;
  onClick?: () => void;
  onLongPress?: () => void;
  className?: string;
}

// Color name to hex resolver for clean dot representation
const COLOR_MAP: Record<string, string> = {
  black: '#09090b',
  white: '#f8fafc',
  'heather grey': '#64748b',
  grey: '#64748b',
  gray: '#64748b',
  'navy blue': '#1e3a8a',
  navy: '#1e3a8a',
  'sky blue': '#38bdf8',
  sky: '#38bdf8',
  'beige / cream': '#d6c7a1',
  beige: '#d6c7a1',
  cream: '#d6c7a1',
  'olive green': '#4d7c0f',
  olive: '#4d7c0f',
  'forest green': '#14532d',
  green: '#14532d',
  'earth brown': '#78350f',
  brown: '#78350f',
  'burgundy / wine': '#881337',
  burgundy: '#881337',
  wine: '#881337',
  'soft pink': '#f472b6',
  pink: '#f472b6',
  rose: '#f43f5e',
  charcoal: '#27272a',
  blue: '#2563eb',
  indigo: '#4f46e5',
};

function resolveColorHex(colorStr?: string): string | null {
  if (!colorStr) return null;
  const trimmed = colorStr.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('rgb')) {
    return trimmed;
  }
  return COLOR_MAP[trimmed.toLowerCase()] || null;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  id,
  name,
  brand,
  category,
  color,
  imageUrl,
  thumbnailUrl,
  index = 0,
  onClick,
  onLongPress,
  className = '',
}) => {
  const displayImage = thumbnailUrl || imageUrl;
  const resolvedColor = resolveColorHex(color);

  // Soft gradient palette tint for image-less items (no icon)
  const tintGradients = [
    'from-white/[0.06] via-[#0A0A0F] to-white/[0.02]',
    'from-rose-500/[0.06] via-[#0A0A0F] to-white/[0.02]',
    'from-sky-500/[0.06] via-[#0A0A0F] to-white/[0.02]',
    'from-violet-500/[0.06] via-[#0A0A0F] to-white/[0.02]',
  ];
  const placeholderGradient = tintGradients[index % tintGradients.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: Math.min(index * 0.04, 0.4),
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault();
          onLongPress();
        }
      }}
      className={`rounded-[22px] bg-[#0A0A0F] border border-white/[0.08] hover:border-white/[0.16] overflow-hidden cursor-pointer transition-colors shadow-lg active:scale-[0.98] select-none flex flex-col justify-between ${className}`}
    >
      {/* Top: 3:4 Aspect Ratio Image Area */}
      <div className="w-full p-2 pb-0">
        <div className="aspect-[3/4] w-full rounded-[16px] overflow-hidden relative bg-zinc-900/60">
          {displayImage ? (
            <img
              src={displayImage}
              alt={name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            /* Soft gradient tile with faint palette tint - NO ICON on placeholder */
            <div
              className={`w-full h-full bg-gradient-to-br ${placeholderGradient} flex items-center justify-center`}
            />
          )}
        </div>
      </div>

      {/* Below Image: Exactly 3 lines, 12px padding (p-3) */}
      <div className="p-3 pt-2.5 space-y-1">
        {/* Line 1: Brand (12px, --text-dim, e.g. "Westside") */}
        <div className="text-xs text-white/60 font-medium truncate leading-tight">
          {brand || 'Custom'}
        </div>

        {/* Line 2: Item Name (14px, --text, max 2 lines, ellipsis) */}
        <h4 className="text-sm font-medium text-white line-clamp-2 leading-snug">
          {name}
        </h4>

        {/* Line 3: Category Pill + Tiny Color Dot */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/70 font-medium truncate max-w-[85px]">
            {category}
          </span>

          {resolvedColor ? (
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
              style={{ backgroundColor: resolvedColor }}
              title={color}
            />
          ) : color ? (
            <span
              className="w-2.5 h-2.5 rounded-full bg-zinc-600 border border-white/20 shrink-0"
              title={color}
            />
          ) : null}
        </div>
      </div>
    </motion.div>
  );
};

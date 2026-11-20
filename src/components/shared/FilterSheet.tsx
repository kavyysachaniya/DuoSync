import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  occasionOptions: string[];
  selectedOccasion: string;
  colorOptions: { name: string; hex?: string }[];
  selectedColor: string;
  onApply: (occasion: string, color: string) => void;
  onReset: () => void;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  isOpen,
  onClose,
  occasionOptions,
  selectedOccasion,
  colorOptions,
  selectedColor,
  onApply,
  onReset,
}) => {
  const [tempOccasion, setTempOccasion] = useState(selectedOccasion);
  const [tempColor, setTempColor] = useState(selectedColor);

  // Sync state on open
  React.useEffect(() => {
    if (isOpen) {
      setTempOccasion(selectedOccasion);
      setTempColor(selectedColor);
    }
  }, [isOpen, selectedOccasion, selectedColor]);

  const handleApply = () => {
    onApply(tempOccasion, tempColor);
    onClose();
  };

  const handleReset = () => {
    setTempOccasion('All');
    setTempColor('All');
    onReset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter wardrobe items"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Sheet Surface */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative z-10 w-full max-w-md rounded-t-[28px] sm:rounded-[28px] bg-[#0E0E13] border border-white/[0.12] p-5 sm:p-6 space-y-5 max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base font-semibold text-white">Filter Pieces</h3>
                <p className="text-xs text-white/60 mt-0.5">Filter by occasion and color</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Close filter sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Occasion Section (Chip-Style) */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block">
                Occasion
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['All', ...occasionOptions].map((occ) => {
                  const isSelected = tempOccasion === occ;
                  return (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => setTempOccasion(occ)}
                      className={`min-h-[32px] px-3.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-rose-500 text-white font-semibold shadow-sm shadow-rose-500/20'
                          : 'bg-white/[0.04] text-white/60 hover:text-white border border-white/[0.08]'
                      }`}
                    >
                      {occ}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Section (Chip-Style with Color Dots) */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block">
                Color
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTempColor('All')}
                  className={`min-h-[32px] px-3.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                    tempColor === 'All'
                      ? 'bg-rose-500 text-white font-semibold shadow-sm'
                      : 'bg-white/[0.04] text-white/60 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  All Colors
                </button>
                {colorOptions.map((c) => {
                  const isSelected = tempColor.toLowerCase() === c.name.toLowerCase();
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setTempColor(c.name)}
                      className={`min-h-[32px] px-3 rounded-full text-xs font-medium transition-all active:scale-95 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-rose-500 text-white font-semibold shadow-sm'
                          : 'bg-white/[0.04] text-white/60 hover:text-white border border-white/[0.08]'
                      }`}
                    >
                      {c.hex && (
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                      )}
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 min-h-[44px] rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white text-xs font-semibold transition-colors"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-2 min-h-[44px] rounded-full bg-white hover:bg-white/90 text-zinc-950 text-xs font-semibold transition-all shadow-lg active:scale-95"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

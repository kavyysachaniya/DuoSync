import React, { useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface TodayRowProps {
  title: string;
  statusText?: string;
  showSearchFilter?: boolean;
  isSearchOpen?: boolean;
  onToggleSearch?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onOpenFilter?: () => void;
  hasActiveFilters?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const TodayRow: React.FC<TodayRowProps> = ({
  title,
  statusText,
  showSearchFilter = false,
  isSearchOpen = false,
  onToggleSearch,
  searchValue = '',
  onSearchChange,
  onOpenFilter,
  hasActiveFilters = false,
  children,
  className = '',
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  return (
    <div className={`w-full space-y-2.5 ${className}`}>
      {/* 1px --border hairline above and below, no box, no fill, no rounded border */}
      <div className="w-full border-y border-white/[0.08] py-3 flex items-center justify-between gap-3 min-h-[44px]">
        {/* If search is open on mobile, show inline search input */}
        <AnimatePresence mode="wait" initial={false}>
          {isSearchOpen ? (
            <motion.div
              key="search-input"
              initial={{ opacity: 0, width: '0%' }}
              animate={{ opacity: 1, width: '100%' }}
              exit={{ opacity: 0, width: '0%' }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search pieces, brands, colors..."
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full h-8 px-3 rounded-full bg-white/[0.06] border border-white/[0.12] text-xs text-white placeholder-white/40 focus:outline-none focus:border-rose-400"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => onSearchChange?.('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onToggleSearch}
                className="text-xs text-white/60 hover:text-white px-1 shrink-0"
              >
                Cancel
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="standard-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex items-center justify-between gap-3"
            >
              {/* Text only on left, no icons */}
              <span className="text-[13px] font-medium text-white tracking-tight">
                {title}
              </span>

              {/* Right side: dim status + optional round search/filter buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {statusText && (
                  <span className="text-xs text-white/60 font-normal">
                    {statusText}
                  </span>
                )}

                {showSearchFilter && (
                  <div className="flex items-center gap-1.5 ml-1">
                    {/* Round Search Button */}
                    <button
                      type="button"
                      onClick={onToggleSearch}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
                        searchValue
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
                      }`}
                      title="Search"
                      aria-label="Search"
                    >
                      <Search className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>

                    {/* Round Filter Button */}
                    <button
                      type="button"
                      onClick={onOpenFilter}
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
                        hasActiveFilters
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
                      }`}
                      title="Filter"
                      aria-label="Filter"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
                      {hasActiveFilters && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Optional sub-content (like routine checklist strip) without card frames */}
      {children}
    </div>
  );
};

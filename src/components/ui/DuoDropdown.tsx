import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  badge?: string;
}

export interface DuoDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: (DropdownOption | string)[];
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  allowCustom?: boolean;
  onAddCustom?: (customValue: string) => void;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  required?: boolean;
}

export const DuoDropdown: React.FC<DuoDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  label,
  helperText,
  error,
  disabled = false,
  searchable = false,
  allowCustom = false,
  onAddCustom,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  align = 'left',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownId = useId();

  // Normalize options to DropdownOption format
  const normalizedOptions: DropdownOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value) || null;
  }, [normalizedOptions, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Check if typed query is an exact match for an existing option
  const isExactMatch = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.some((opt) => opt.label.toLowerCase().trim() === q);
  }, [normalizedOptions, searchQuery]);

  // Handle outside click to close
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Auto-focus search input when opening if searchable
  useEffect(() => {
    if (isOpen && (searchable || allowCustom)) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, searchable, allowCustom]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleCreateCustom = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    if (onAddCustom) {
      onAddCustom(trimmed);
    }
    onChange(trimmed);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Optional Field Label */}
      {label && (
        <label
          htmlFor={dropdownId}
          className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-rose-400 ml-1">*</span>}
          </span>
          {selectedOption?.badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-mono">
              {selectedOption.badge}
            </span>
          )}
        </label>
      )}

      {/* Dropdown Trigger Button */}
      <button
        id={dropdownId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-[#090A0F] border text-left text-sm flex items-center justify-between gap-2.5 transition-all outline-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-white/5 bg-zinc-950 text-zinc-600'
            : error
            ? 'border-rose-500/50 hover:border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20'
            : isOpen
            ? 'border-white/30 ring-1 ring-white/10 bg-[#12141C]'
            : 'border-white/10 hover:border-white/20 hover:bg-[#0E1017]'
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0 text-zinc-400">{selectedOption.icon}</span>
          )}
          {selectedOption ? (
            <span className="text-zinc-100 font-medium truncate">{selectedOption.label}</span>
          ) : value ? (
            <span className="text-zinc-100 font-medium truncate">{value}</span>
          ) : (
            <span className="text-zinc-500 font-normal truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Helper Text or Error Message */}
      {error ? (
        <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-zinc-500">{helperText}</p>
      ) : null}

      {/* Popover Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute top-full mt-1.5 ${
              align === 'right' ? 'right-0' : 'left-0'
            } w-full min-w-[200px] z-50 rounded-2xl bg-[#12141C] border border-white/12 shadow-2xl shadow-black/90 p-1.5 backdrop-blur-2xl ${menuClassName}`}
          >
            {/* Search Input Filter */}
            {(searchable || allowCustom || normalizedOptions.length > 7) && (
              <div className="p-1 mb-1 border-b border-white/8">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options..."
                    className="w-full h-8 pl-8 pr-7 bg-[#090A0F] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-zinc-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
              {filteredOptions.length === 0 && !allowCustom ? (
                <div className="p-3 text-center text-xs text-zinc-500">No matching options</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full min-h-[38px] px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2.5 transition-colors ${
                        isSelected
                          ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                          : 'text-zinc-300 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {opt.icon && (
                          <span
                            className={`shrink-0 ${isSelected ? 'text-zinc-950' : 'text-zinc-400'}`}
                          >
                            {opt.icon}
                          </span>
                        )}
                        <div>
                          <div className="truncate">{opt.label}</div>
                          {opt.description && (
                            <div
                              className={`text-[10px] truncate ${
                                isSelected ? 'text-zinc-700' : 'text-zinc-500'
                              }`}
                            >
                              {opt.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && <Check className="w-4 h-4 shrink-0 text-zinc-950" />}
                    </button>
                  );
                })
              )}

              {/* Add Custom Option on the fly */}
              {allowCustom && searchQuery.trim() && !isExactMatch && (
                <button
                  type="button"
                  onClick={handleCreateCustom}
                  className="w-full min-h-[38px] px-3 py-2 rounded-xl text-left text-xs bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-medium flex items-center gap-2 transition-colors mt-1"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span className="truncate">Add “{searchQuery.trim()}” as new category</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

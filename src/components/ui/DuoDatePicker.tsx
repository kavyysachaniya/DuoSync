import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';

export interface DuoDatePickerProps {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  triggerClassName?: string;
  align?: 'left' | 'right';
  required?: boolean;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDisplayDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DuoDatePicker: React.FC<DuoDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select date...',
  helperText,
  error,
  disabled = false,
  clearable = true,
  className = '',
  triggerClassName = '',
  align = 'left',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const datePickerId = useId();

  const todayStr = useMemo(() => getTodayString(), []);

  // Initialize view year & month: defaults to selected date if exists, or current month
  const [viewYear, setViewYear] = useState<number>(() => {
    if (value && value.includes('-')) {
      const y = parseInt(value.split('-')[0], 10);
      if (!Number.isNaN(y)) return y;
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (value && value.includes('-')) {
      const m = parseInt(value.split('-')[1], 10) - 1;
      if (!Number.isNaN(m)) return m;
    }
    return new Date().getMonth();
  });

  // When value changes from outside, synchronize view if not open
  useEffect(() => {
    if (value && value.includes('-') && !isOpen) {
      const [y, m] = value.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value, isOpen]);

  // Handle outside click & escape key
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

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToCurrentMonth = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  const handleDaySelect = (dayStr: string) => {
    onChange(dayStr);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange('');
  };

  // Build calendar matrix (42 cells: leading days + days of month + trailing days)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
      });
    }

    // Trailing days from next month to fill complete grid
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
      });
    }

    return cells;
  }, [viewYear, viewMonth, todayStr, value]);

  const displayFormatted = useMemo(() => formatDisplayDate(value), [value]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Optional Label */}
      {label && (
        <label
          htmlFor={datePickerId}
          className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-rose-400 ml-1">*</span>}
          </span>
          {value && (
            <span className="text-[10px] text-zinc-500 font-mono">
              {value}
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={datePickerId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-[#090A0F] border text-left text-sm flex items-center justify-between gap-2.5 transition-all outline-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-white/5 bg-zinc-950 text-zinc-600'
            : error
            ? 'border-rose-500/50 hover:border-rose-500 focus:border-rose-500'
            : isOpen
            ? 'border-white/30 ring-1 ring-white/10 bg-[#12141C]'
            : 'border-white/10 hover:border-white/20 hover:bg-[#0E1017]'
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <CalendarIcon
            className={`w-4 h-4 shrink-0 transition-colors ${
              value ? 'text-rose-400' : 'text-zinc-500'
            }`}
          />
          {value ? (
            <span className="text-zinc-100 font-medium font-mono tabular-nums truncate">
              {displayFormatted}
            </span>
          ) : (
            <span className="text-zinc-500 font-normal truncate">{placeholder}</span>
          )}
        </div>

        {/* Action Controls: Clear Selection or Chevron Indicator */}
        <div className="flex items-center gap-1 shrink-0">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear();
                }
              }}
              title="Clear date selection"
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </button>

      {/* Helper text or validation error */}
      {error ? (
        <p className="mt-1 text-xs text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-zinc-500">{helperText}</p>
      ) : null}

      {/* Popover Calendar Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute top-full mt-2 ${
              align === 'right' ? 'right-0' : 'left-0'
            } w-[300px] sm:w-[320px] z-50 rounded-3xl bg-[#12141C] border border-white/12 shadow-2xl shadow-black/95 p-4 backdrop-blur-2xl select-none`}
          >
            {/* Calendar Navigation Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/8">
              <div>
                <span className="text-sm font-bold font-display text-white">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleJumpToCurrentMonth}
                  className="px-2 py-1 rounded-lg bg-white/6 hover:bg-white/12 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors"
                  title="View current month"
                >
                  Current
                </button>

                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Row */}
            <div className="grid grid-cols-7 gap-1 pt-3 pb-1 text-center">
              {WEEKDAY_NAMES.map((name) => (
                <div key={name} className="text-[11px] font-medium text-zinc-500 py-0.5">
                  {name}
                </div>
              ))}
            </div>

            {/* 7-Column Date Grid */}
            <div className="grid grid-cols-7 gap-1 pt-1">
              {calendarCells.map((cell, idx) => {
                return (
                  <button
                    key={`${cell.dateStr}_${idx}`}
                    type="button"
                    onClick={() => handleDaySelect(cell.dateStr)}
                    className={`h-9 rounded-xl text-xs font-mono tabular-nums transition-all flex flex-col items-center justify-center relative ${
                      cell.isSelected
                        ? 'bg-white text-zinc-950 font-bold shadow-md shadow-white/10 scale-100 z-10'
                        : cell.isCurrentMonth
                        ? 'text-zinc-200 hover:bg-white/10 hover:text-white'
                        : 'text-zinc-600 opacity-40 hover:opacity-80 hover:bg-white/5'
                    } ${
                      cell.isToday && !cell.isSelected
                        ? 'ring-1 ring-rose-400/50 font-semibold text-rose-300'
                        : ''
                    }`}
                  >
                    <span>{cell.dayNumber}</span>
                    {cell.isToday && !cell.isSelected && (
                      <span className="w-1 h-1 rounded-full bg-rose-400 absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Footer Action Strip */}
            <div className="pt-3 mt-3 border-t border-white/8 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleClear}
                className={`text-xs flex items-center gap-1.5 transition-colors ${
                  value ? 'text-zinc-400 hover:text-rose-400' : 'text-zinc-600 cursor-default'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Selection</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 text-xs font-medium text-zinc-200 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import React from 'react';

export interface CategoryChipItem {
  id: string;
  label: string;
  count?: number;
}

interface ChipBarProps {
  categories: CategoryChipItem[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  className?: string;
}

export const ChipBar: React.FC<ChipBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  className = '',
}) => {
  return (
    <div
      className={`w-full flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`min-h-[32px] px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 active:scale-95 shrink-0 ${
              isSelected
                ? 'bg-rose-500 text-white font-semibold shadow-sm shadow-rose-500/20'
                : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
            }`}
          >
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};

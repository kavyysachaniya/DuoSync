import React from 'react';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`py-16 px-4 text-center space-y-3.5 select-none ${className}`}>
      {/* Title only, no icons, no circles, no boxes */}
      <h3 className="text-base font-semibold text-white tracking-tight">
        {title}
      </h3>

      {/* Dim subline */}
      <p className="text-xs text-white/60 max-w-[280px] mx-auto font-normal leading-relaxed">
        {subtitle}
      </p>

      {/* White pill button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onAction}
          className="px-5 py-2.5 rounded-full bg-white text-zinc-950 font-semibold text-xs transition-all shadow-md hover:bg-white/90 active:scale-95 cursor-pointer"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

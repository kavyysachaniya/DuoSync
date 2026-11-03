import React from 'react';

interface CircularProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  children?: React.ReactNode;
  label?: string;
  sublabel?: string;
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  percentage,
  size = 116,
  strokeWidth = 10,
  color,
  trackColor = 'rgba(255, 255, 255, 0.07)',
  children,
  label,
  sublabel,
}) => {
  const safePct = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safePct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex items-center justify-center select-none"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform overflow-visible"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 550ms cubic-bezier(0.16, 1, 0.3, 1)',
              filter: safePct > 0 ? `drop-shadow(0 0 6px ${color}40)` : 'none',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          {children}
        </div>
      </div>
      {label && (
        <span className="mt-2 text-xs font-medium text-zinc-200 tracking-tight whitespace-nowrap">
          {label}
        </span>
      )}
      {sublabel && (
        <span className="text-[11px] font-mono tabular-nums text-zinc-400 whitespace-nowrap">
          {sublabel}
        </span>
      )}
    </div>
  );
};

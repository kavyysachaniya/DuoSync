import React from 'react';

interface UserAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

/**
 * Universal UserAvatar component.
 * Strict Design Rule: NO GRADIENTS ANYWHERE.
 * Renders either the user's uploaded circular cropped photo or
 * the first uppercase letter of their name on a flat solid neutral background.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  photoUrl,
  size = 'md',
  className = '',
}) => {
  const initial = (name || 'U').trim().charAt(0).toUpperCase() || 'U';
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={`rounded-full shrink-0 overflow-hidden flex items-center justify-center select-none ${sizeClasses} ${className}`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name || 'User avatar'}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-zinc-800 border border-white/15 text-zinc-100 font-bold flex items-center justify-center">
          {initial}
        </div>
      )}
    </div>
  );
};

import React from 'react';

interface NekoAvatarProps {
  mood: 'happy' | 'neutral' | 'sad' | 'worried' | 'error' | 'dead';
  theme?: 'light' | 'dark';
}

export const NekoAvatar: React.FC<NekoAvatarProps> = ({ mood, theme = 'light' }) => {
  const isDark = theme === 'dark';

  const getImagePath = () => {
    const suffix = isDark ? '-cosmo' : '';
    return `/images/${mood}${suffix}.png`;
  };

  return (
    <img
      src={getImagePath()}
      alt={`Cat ${mood}`}
      width="60"
      height="60"
      style={{
        display: 'block',
        objectFit: 'contain'
      }}
    />
  );
};

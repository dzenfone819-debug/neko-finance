import React from 'react';

interface NekoAvatarProps {
  mood: 'happy' | 'neutral' | 'sad' | 'worried' | 'error' | 'dead';
}

export const NekoAvatar: React.FC<NekoAvatarProps> = ({ mood }) => {
  const getImagePath = () => {
    return `/images/${mood}.png`;
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

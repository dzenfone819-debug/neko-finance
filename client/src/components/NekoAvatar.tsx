import React from 'react';

interface NekoAvatarProps {
  mood: 'happy' | 'neutral' | 'sad' | 'worried' | 'angry' | 'error' | 'dead';
}

export const NekoAvatar: React.FC<NekoAvatarProps> = ({ mood }) => {
  const getImagePath = () => {
    // Для neutral используем happy как fallback
    const imageName = mood === 'neutral' ? 'happy' : mood;
    return `/images/${imageName}.png`;
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

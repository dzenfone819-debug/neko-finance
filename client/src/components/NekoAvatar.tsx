import React from 'react';

interface NekoAvatarProps {
  mood: 'happy' | 'neutral' | 'sad' | 'worried' | 'angry' | 'error' | 'dead';
}

export const NekoAvatar: React.FC<NekoAvatarProps> = ({ mood }) => {
  const getEyeShape = () => {
    switch (mood) {
      case 'happy': return 'M15,20 Q20,25 25,20';
      case 'sad': return 'M15,25 Q20,20 25,25';
      case 'worried': return 'M15,23 Q20,20 25,23';
      case 'angry': return 'M15,20 L25,25';
      case 'error': return 'M15,18 L25,28 M15,28 L25,18';
      case 'dead': return 'M15,20 L25,25 M15,25 L25,20';
      default: return 'M15,22 Q20,20 25,22';
    }
  };

  const getMouthShape = () => {
    switch (mood) {
      case 'happy': return 'M35,45 Q40,50 45,45';
      case 'sad': return 'M35,50 Q40,45 45,50';
      case 'worried': return 'M35,48 L45,48';
      case 'angry': return 'M35,48 Q40,46 45,48';
      case 'error': return 'M35,48 Q40,52 45,48';
      case 'dead': return 'M30,48 L50,48';
      default: return 'M35,48 Q40,50 45,48';
    }
  };

  const getColor = () => {
    switch (mood) {
      case 'happy': return '#FFB6C1';
      case 'sad': return '#B0C4DE';
      case 'worried': return '#FFA07A';
      case 'angry': return '#FF6B6B';
      case 'error': return '#E74C3C';
      case 'dead': return '#95A5A6';
      default: return '#FFDAB9';
    }
  };

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>
      {/* Голова */}
      <circle cx="40" cy="40" r="30" fill={getColor()} />
      
      {/* Уши */}
      <path d="M20,20 L15,5 L30,15 Z" fill={getColor()} />
      <path d="M60,20 L65,5 L50,15 Z" fill={getColor()} />
      
      {/* Внутренняя часть ушей */}
      <path d="M22,18 L18,8 L28,16 Z" fill="#FFE4E1" />
      <path d="M58,18 L62,8 L52,16 Z" fill="#FFE4E1" />
      
      {/* Глаза */}
      <g stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d={getEyeShape()} transform="translate(0,0)" />
        <path d={getEyeShape()} transform="translate(30,0)" />
      </g>
      
      {/* Нос */}
      <path d="M38,35 L40,38 L42,35 Z" fill="#FF69B4" />
      
      {/* Рот */}
      <path d={getMouthShape()} stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
      
      {/* Усы */}
      <g stroke="#333" strokeWidth="1.5" strokeLinecap="round">
        <line x1="10" y1="38" x2="25" y2="36" />
        <line x1="10" y1="42" x2="25" y2="42" />
        <line x1="55" y1="36" x2="70" y2="38" />
        <line x1="55" y1="42" x2="70" y2="42" />
      </g>
      
      {/* Щёчки (для happy) */}
      {mood === 'happy' && (
        <>
          <circle cx="25" cy="45" r="5" fill="#FFB6C1" opacity="0.5" />
          <circle cx="55" cy="45" r="5" fill="#FFB6C1" opacity="0.5" />
        </>
      )}
    </svg>
  );
};

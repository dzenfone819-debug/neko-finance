import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

interface Props {
  currentDate: Date;
  onChange: (newDate: Date) => void;
}

export const MonthSelector: React.FC<Props> = ({ currentDate, onChange }) => {
  const changeMonth = (delta: number) => {
    WebApp.HapticFeedback.selectionChanged();
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    onChange(newDate);
  };

  const formatMonth = (date: Date) => {
    const str = date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      gap: 15, /* Компактный отступ */
      /* Убрали margin/padding контейнера, ими управляет App.tsx */
    }}>
      <button 
        onClick={() => changeMonth(-1)}
        style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: '#6B4C75', opacity: 0.5 }}
      >
        <ChevronLeft size={18} />
      </button>

      <span style={{ fontSize: 13, fontWeight: '700', color: '#6B4C75', minWidth: 100, textAlign: 'center' }}>
        {formatMonth(currentDate)}
      </span>

      <button 
        onClick={() => changeMonth(1)}
        style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: '#6B4C75', opacity: 0.5 }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};
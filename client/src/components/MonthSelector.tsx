import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

interface Props {
  currentDate: Date;
  onChange: (newDate: Date) => void;
}

export const MonthSelector: React.FC<Props> = ({ currentDate, onChange }) => {
  
  // Переключение месяца
  const changeMonth = (delta: number) => {
    WebApp.HapticFeedback.selectionChanged();
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    onChange(newDate);
  };

  // Красивое название месяца (Март 2024)
  const formatMonth = (date: Date) => {
    // Делаем первую букву заглавной, так как toLocaleString может вернуть "март"
    const str = date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      gap: 20, marginBottom: 10, marginTop: 5 
    }}>
      <button 
        onClick={() => changeMonth(-1)}
        style={{ background: 'none', border: 'none', padding: 5, cursor: 'pointer', color: '#6B4C75', opacity: 0.6 }}
      >
        <ChevronLeft size={24} />
      </button>

      <span style={{ fontSize: 16, fontWeight: '800', color: '#6B4C75', minWidth: 120, textAlign: 'center' }}>
        {formatMonth(currentDate)}
      </span>

      <button 
        onClick={() => changeMonth(1)}
        style={{ background: 'none', border: 'none', padding: 5, cursor: 'pointer', color: '#6B4C75', opacity: 0.6 }}
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
};
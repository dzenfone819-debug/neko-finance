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
      gap: 10, /* Меньше отступ */
      marginBottom: 5, marginTop: 0, /* Убрали лишние отступы */
      paddingTop: 10, /* Небольшой отступ от "чёлки" телефона */
      zIndex: 20
    }}>
      <button 
        onClick={() => changeMonth(-1)}
        style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#6B4C75', opacity: 0.5 }}
      >
        <ChevronLeft size={20} /> {/* Чуть меньше иконка */}
      </button>

      {/* Шрифт меньше и аккуратнее */}
      <span style={{ fontSize: 14, fontWeight: '700', color: '#6B4C75', minWidth: 100, textAlign: 'center', textTransform: 'capitalize' }}>
        {formatMonth(currentDate)}
      </span>

      <button 
        onClick={() => changeMonth(1)}
        style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#6B4C75', opacity: 0.5 }}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};
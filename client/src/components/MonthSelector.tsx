import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import * as api from '../api/nekoApi';
import { getPeriodLabel } from '../utils/budgetPeriod';

interface Props {
  currentDate: Date;
  onChange: (newDate: Date) => void;
}

export const MonthSelector: React.FC<Props> = ({ currentDate, onChange }) => {
  const [periodType, setPeriodType] = useState<'calendar_month' | 'custom_period'>('calendar_month');
  const [periodStartDay, setPeriodStartDay] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userId = WebApp.initDataUnsafe?.user?.id;
        if (userId) {
          const settings = await api.getBudgetPeriodSettings(userId);
          if (settings) {
            setPeriodType(settings.period_type);
            setPeriodStartDay(settings.period_start_day);
          }
        }
      } catch (error) {
        console.error('Failed to load budget period settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const changeMonth = (delta: number) => {
    WebApp.HapticFeedback.selectionChanged();
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    onChange(newDate);
  };

  const getPeriodDisplay = () => {
    if (isLoading) {
      return '...';
    }
    return getPeriodLabel(currentDate, periodType, periodStartDay);
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

      <span style={{ fontSize: 13, fontWeight: '700', color: '#6B4C75', minWidth: 140, textAlign: 'center' }}>
        {getPeriodDisplay()}
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
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Settings } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

interface Props {
  periodType: 'calendar_month' | 'custom_period';
  periodStartDay: number;
  onSave: (periodType: 'calendar_month' | 'custom_period', startDay: number) => void;
}

export const SettingsView: React.FC<Props> = ({ periodType, periodStartDay, onSave }) => {
  const [localPeriodType, setLocalPeriodType] = useState(periodType);
  const [localStartDay, setLocalStartDay] = useState(periodStartDay);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    WebApp.HapticFeedback.impactOccurred('medium');
    setIsSaving(true);
    try {
      await onSave(localPeriodType, localStartDay);
      WebApp.HapticFeedback.notificationOccurred('success');
      // Перезагружаем страницу через 500мс чтобы применить новые настройки
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      WebApp.HapticFeedback.notificationOccurred('error');
      setIsSaving(false);
    }
  };

  const handlePeriodTypeChange = (type: 'calendar_month' | 'custom_period') => {
    WebApp.HapticFeedback.selectionChanged();
    setLocalPeriodType(type);
    // При переключении на календарный месяц сбрасываем день на 1
    if (type === 'calendar_month') {
      setLocalStartDay(1);
    }
  };

  const handleDayChange = (day: number) => {
    WebApp.HapticFeedback.selectionChanged();
    setLocalStartDay(day);
  };

  const hasChanges = localPeriodType !== periodType || localStartDay !== periodStartDay;

  return (
    <div style={{ padding: '20px 15px', paddingBottom: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 25 }}>
        <Settings size={24} color="#6B4C75" />
        <h2 style={{ margin: 0, color: '#6B4C75', fontSize: 20 }}>Настройки бюджета</h2>
      </div>

      {/* Тип периода */}
      <div style={{ 
        background: '#FFF', 
        borderRadius: 20, 
        padding: 20, 
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15 }}>
          <Calendar size={20} color="#6B4C75" />
          <h3 style={{ margin: 0, fontSize: 16, color: '#2D3436' }}>Бюджетный период</h3>
        </div>

        <p style={{ 
          fontSize: 13, 
          color: '#666', 
          marginBottom: 15,
          lineHeight: 1.5
        }}>
          Выберите, как вести бюджет: по календарным месяцам или по собственным периодам
        </p>

        {/* Календарный месяц */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => handlePeriodTypeChange('calendar_month')}
          style={{
            background: localPeriodType === 'calendar_month' ? '#F0E6F6' : '#F8F9FA',
            border: `2px solid ${localPeriodType === 'calendar_month' ? '#D291BC' : '#E0E0E0'}`,
            borderRadius: 15,
            padding: 15,
            marginBottom: 12,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 14, color: '#2D3436', marginBottom: 4 }}>
                Календарный месяц
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                С 1-го по последнее число месяца
              </div>
            </div>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `2px solid ${localPeriodType === 'calendar_month' ? '#D291BC' : '#CCC'}`,
              background: localPeriodType === 'calendar_month' ? '#D291BC' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {localPeriodType === 'calendar_month' && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFF' }} />
              )}
            </div>
          </div>
        </motion.div>

        {/* Кастомный период */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => handlePeriodTypeChange('custom_period')}
          style={{
            background: localPeriodType === 'custom_period' ? '#F0E6F6' : '#F8F9FA',
            border: `2px solid ${localPeriodType === 'custom_period' ? '#D291BC' : '#E0E0E0'}`,
            borderRadius: 15,
            padding: 15,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 14, color: '#2D3436', marginBottom: 4 }}>
                Свой бюджетный период
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                Например, с 10-го по 9-е число
              </div>
            </div>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `2px solid ${localPeriodType === 'custom_period' ? '#D291BC' : '#CCC'}`,
              background: localPeriodType === 'custom_period' ? '#D291BC' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {localPeriodType === 'custom_period' && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFF' }} />
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* День начала периода */}
      {localPeriodType === 'custom_period' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#FFF',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', fontSize: 16, color: '#2D3436' }}>
            День начала периода
          </h3>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 15, lineHeight: 1.5 }}>
            Выберите день, с которого начинается ваш бюджетный период (от 1 до 28)
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: 8 
          }}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
              <motion.button
                key={day}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDayChange(day)}
                style={{
                  background: localStartDay === day ? '#D291BC' : '#F8F9FA',
                  color: localStartDay === day ? '#FFF' : '#2D3436',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 8px',
                  fontSize: 13,
                  fontWeight: localStartDay === day ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {day}
              </motion.button>
            ))}
          </div>

          <div style={{
            marginTop: 15,
            padding: 12,
            background: '#FFF9E6',
            borderRadius: 10,
            fontSize: 12,
            color: '#8B7500',
            lineHeight: 1.5
          }}>
            💡 Период будет с <strong>{localStartDay}-го</strong> числа текущего месяца по <strong>{localStartDay - 1}-е</strong> число следующего
          </div>
        </motion.div>
      )}

      {/* Кнопка сохранения */}
      {hasChanges && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={isSaving}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #D291BC 0%, #957DAD 100%)',
            color: '#FFF',
            border: 'none',
            borderRadius: 20,
            padding: '16px 24px',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
            boxShadow: '0 4px 12px rgba(210, 145, 188, 0.3)'
          }}
        >
          {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
        </motion.button>
      )}

      {/* Пример */}
      <div style={{
        marginTop: 20,
        padding: 15,
        background: '#F0F9FF',
        borderRadius: 15,
        fontSize: 12,
        color: '#0369A1',
        lineHeight: 1.6
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>ℹ️ Как это работает?</div>
        {localPeriodType === 'calendar_month' ? (
          <div>
            Бюджет считается с 1-го числа месяца по последнее. Например: 1 декабря - 31 декабря.
          </div>
        ) : (
          <div>
            Бюджет считается с {localStartDay}-го числа одного месяца по {localStartDay - 1}-е число следующего. 
            Например: {localStartDay} декабря - {localStartDay - 1} января. Удобно, если зарплата приходит не в начале месяца.
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  total: number;
  limit: number;
}

export const BudgetStatus: React.FC<Props> = ({ total, limit }) => {
  // Если лимита нет, считаем процент 0
  const percentage = limit > 0 ? Math.min((total / limit) * 100, 100) : 0;
  
  // Цвета
  let color = '#CAFFBF'; 
  if (percentage > 50) color = '#FFD6A5';
  if (percentage > 85) color = '#FFADAD';
  if (total > limit && limit > 0) color = '#E74C3C';

  return (
    <div style={{ width: '85%', marginBottom: 15, marginTop: 5 }}>
      {/* Текст */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B4C75', marginBottom: 4, fontWeight: 'bold', opacity: 0.8 }}>
        <span>
          {limit > 0 ? `${Math.round(percentage)}%` : 'Бюджет не задан'}
        </span>
        <span>
          {limit > 0 ? `${limit.toLocaleString()} ₽` : '—'}
        </span>
      </div>

      {/* Сам бар */}
      <div style={{ 
        width: '100%', height: 10, background: 'rgba(255,255,255,0.5)', 
        borderRadius: 10, overflow: 'hidden',
        border: limit === 0 ? '1px dashed #D6D6D6' : 'none' // Пунктир если нет лимита
      }}>
        {limit > 0 && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1 }}
            style={{ height: '100%', background: color, borderRadius: 10 }}
          />
        )}
      </div>
    </div>
  );
};
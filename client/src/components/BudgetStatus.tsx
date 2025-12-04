import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  total: number;
  limit: number;
}

export const BudgetStatus: React.FC<Props> = ({ total, limit }) => {
  const percentage = limit > 0 ? Math.min((total / limit) * 100, 100) : 0;
  
  let color = '#CAFFBF'; 
  if (percentage > 50) color = '#FFD6A5';
  if (percentage > 85) color = '#FFADAD';
  if (total > limit && limit > 0) color = '#E74C3C';

  return (
    // Уменьшили ширину до 75% и отступы
    <div style={{ width: '75%', marginBottom: 10, marginTop: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B4C75', marginBottom: 4, fontWeight: 'bold', opacity: 0.8 }}>
        <span>
          {limit > 0 ? `${Math.round(percentage)}%` : 'Бюджет не задан'}
        </span>
        <span>
          {limit > 0 ? `${limit.toLocaleString()} ₽` : '—'}
        </span>
      </div>

      <div style={{ 
        width: '100%', height: 10, background: 'rgba(255,255,255,0.5)', 
        borderRadius: 10, overflow: 'hidden',
        border: limit === 0 ? '1px dashed #D6D6D6' : 'none' 
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
import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  total: number;
  limit: number;
}

export const BudgetStatus: React.FC<Props> = ({ total, limit }) => {
  const percentage = limit > 0 ? Math.min((total / limit) * 100, 100) : 0;
  
  // Using colors that work well in both themes, or could use variables if needed.
  // For simplicity and readability on progress bars, specific hex values are often fine, 
  // but let's try to map them to variables where possible or keep them consistent.
  let color = '#CAFFBF'; 
  if (percentage > 50) color = '#FFD6A5';
  if (percentage > 85) color = '#FFADAD';
  if (total > limit && limit > 0) color = '#E74C3C'; // Keep direct red for over-budget

  return (
    // ВЕРНУЛИ 85% ширины
    <div style={{ width: '85%', marginBottom: 5, marginTop: 0 }}>
      {/* Текст */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-main)', marginBottom: 2, fontWeight: 'bold', opacity: 0.8 }}>
        <span>{limit > 0 ? 'Бюджет' : 'Лимит не задан'}</span>
        <span>{limit > 0 ? `${Math.round(percentage)}%` : ''}</span>
      </div>

      {/* Бар */}
      <div style={{ 
        width: '100%', height: 8, background: 'var(--bg-input)', 
        borderRadius: 6, overflow: 'hidden',
        border: limit === 0 ? '1px dashed var(--border-color)' : 'none' 
      }}>
        {limit > 0 && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1 }}
            style={{ height: '100%', background: color, borderRadius: 6 }}
          />
        )}
      </div>
    </div>
  );
};

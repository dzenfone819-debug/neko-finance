import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  total: number;
  limit: number;
  onEdit?: () => void; // Сделали необязательным
}

export const BudgetStatus: React.FC<Props> = ({ total, limit, onEdit }) => {
  const percentage = limit > 0 ? Math.min((total / limit) * 100, 100) : 0;
  
  let color = '#CAFFBF'; 
  if (percentage > 50) color = '#FFD6A5';
  if (percentage > 85) color = '#FFADAD';
  if (total > limit && limit > 0) color = '#E74C3C';

  // Если лимита нет совсем - не рисуем ничего или рисуем пустую серую полоску
  if (limit === 0) return null; 

  return (
    <div style={{ width: '80%', marginBottom: 10 }} onClick={onEdit}>
      {/* Только проценты и суммы, чисто и аккуратно */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B4C75', marginBottom: 4, fontWeight: 'bold', opacity: 0.8 }}>
        <span>Бюджет: {Math.round(percentage)}%</span>
        <span>{limit.toLocaleString()} ₽</span>
      </div>

      <div style={{ 
        width: '100%', height: 8, background: 'rgba(255,255,255,0.5)', 
        borderRadius: 10, overflow: 'hidden'
      }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1 }}
          style={{ height: '100%', background: color, borderRadius: 10 }}
        />
      </div>
    </div>
  );
};
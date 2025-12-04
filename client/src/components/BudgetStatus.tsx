import React from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';

interface Props {
  total: number;
  limit: number;
  onEdit: () => void;
}

export const BudgetStatus: React.FC<Props> = ({ total, limit, onEdit }) => {
  // Если лимит не задан, считаем процент 0
  const percentage = limit > 0 ? Math.min((total / limit) * 100, 100) : 0;
  
  // Цвет меняется от зеленого к красному
  let color = '#CAFFBF'; // Зеленый (начало)
  if (percentage > 50) color = '#FFD6A5'; // Оранжевый
  if (percentage > 85) color = '#FFADAD'; // Красный
  if (total > limit && limit > 0) color = '#E74C3C'; // Темно-красный (Превышение)

  return (
    <div style={{ width: '80%', marginBottom: 15, position: 'relative' }}>
      {/* Текст над баром */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B4C75', marginBottom: 4, fontWeight: 'bold' }}>
        <span>{Math.round(percentage)}%</span>
        
        {limit > 0 ? (
          <span>{limit.toLocaleString()} ₽</span>
        ) : (
          <span onClick={onEdit} style={{cursor: 'pointer', textDecoration: 'underline'}}>Установить лимит</span>
        )}
      </div>

      {/* Фон бара */}
      <div style={{ 
        width: '100%', height: 12, background: 'rgba(255,255,255,0.5)', 
        borderRadius: 10, overflow: 'hidden', position: 'relative',
        cursor: 'pointer'
      }} onClick={onEdit}>
        
        {/* Заполнение */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1 }}
          style={{ height: '100%', background: color, borderRadius: 10 }}
        />
      </div>

      {/* Кнопка настроек (сбоку) */}
      <button 
        onClick={onEdit}
        style={{
          position: 'absolute', right: -30, top: -2,
          background: 'none', border: 'none', color: '#6B4C75', opacity: 0.5,
          cursor: 'pointer'
        }}
      >
        <Settings size={16} />
      </button>
    </div>
  );
};
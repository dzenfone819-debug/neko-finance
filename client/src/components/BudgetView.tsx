import React from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../data/constants';

interface Props {
  stats: { name: string; value: number }[];
  limits: Record<string, number>;
  totalLimit: number;
  // Теперь мы просто просим открыть редактор, а не передаем сразу значение
  onEditCategory: (categoryId: string) => void; 
  onEditTotal: () => void;
}

export const BudgetView: React.FC<Props> = ({ stats, limits, totalLimit, onEditCategory, onEditTotal }) => {
  
  // Рендер одной полоски
  const renderBar = (title: string, spent: number, limit: number, color: string, onClick: () => void, icon?: React.ReactNode) => {
    const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    const isOver = spent > limit && limit > 0;
    
    return (
      <div onClick={onClick} style={{ marginBottom: 15, cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {icon && <div style={{ color: '#6B4C75' }}>{icon}</div>}
            <span style={{ fontWeight: 'bold', color: '#2D3436' }}>{title}</span>
          </div>
          <div style={{ color: isOver ? '#E74C3C' : '#6B4C75' }}>
            <span style={{ fontWeight: 'bold' }}>{spent}</span> 
            <span style={{ opacity: 0.6 }}> / {limit > 0 ? limit : '∞'}</span>
          </div>
        </div>

        <div style={{ width: '100%', height: 10, background: '#F0F0F0', borderRadius: 5, overflow: 'hidden' }}>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5 }}
            style={{ 
              height: '100%', 
              background: isOver ? '#E74C3C' : color, 
              borderRadius: 5 
            }}
          />
        </div>
      </div>
    );
  };

  const totalSpent = stats.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div style={{ padding: '0 5px', paddingBottom: 80 }}>
      
      {/* 1. ОБЩИЙ БЮДЖЕТ */}
      <div style={{ background: '#FFF0F5', padding: 15, borderRadius: 20, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#6B4C75', fontSize: 16 }}>Общий бюджет</h3>
        {/* Клик открывает модалку общего бюджета */}
        {renderBar('Всего', totalSpent, totalLimit, '#D291BC', onEditTotal)}
      </div>

      {/* 2. ПО КАТЕГОРИЯМ */}
      <h3 style={{ margin: '0 0 15px 5px', color: '#6B4C75', fontSize: 16 }}>Лимиты по категориям</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {CATEGORIES.map((cat) => {
          const stat = stats.find(s => s.name === cat.id);
          const spent = stat ? stat.value : 0;
          const limit = limits[cat.id] || 0;

          return (
            <div key={cat.id}>
              {/* Клик открывает модалку категории */}
              {renderBar(cat.name, spent, limit, cat.color, () => onEditCategory(cat.id), cat.icon)}
            </div>
          )
        })}
      </div>
    </div>
  );
};
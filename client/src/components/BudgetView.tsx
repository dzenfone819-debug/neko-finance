import React from 'react';
import { motion } from 'framer-motion';
import { Edit2 } from 'lucide-react';
import { CATEGORIES } from '../data/constants';

interface Props {
  stats: { name: string; value: number }[]; // Сколько потрачено
  limits: Record<string, number>; // Лимиты { food: 5000 }
  totalLimit: number;
  onUpdateLimit: (category: string, newLimit: number) => void;
  onUpdateTotal: () => void;
}

export const BudgetView: React.FC<Props> = ({ stats, limits, totalLimit, onUpdateLimit, onUpdateTotal }) => {
  
  // Вспомогательная функция для отрисовки одного бара
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
            <span style={{ opacity: 0.6 }}> / {limit > 0 ? limit : '∞'} ₽</span>
          </div>
        </div>

        {/* Фон бара */}
        <div style={{ width: '100%', height: 10, background: '#F0F0F0', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
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

  // Считаем общую сумму трат
  const totalSpent = stats.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div style={{ padding: '0 5px', paddingBottom: 80 }}>
      
      {/* 1. ОБЩИЙ БЮДЖЕТ */}
      <div style={{ background: '#FFF0F5', padding: 15, borderRadius: 20, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#6B4C75', fontSize: 16 }}>Общий бюджет</h3>
        {renderBar('Всего', totalSpent, totalLimit, '#D291BC', onUpdateTotal)}
        <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 5 }}>
          Нажмите, чтобы изменить общий лимит
        </div>
      </div>

      {/* 2. ПО КАТЕГОРИЯМ */}
      <h3 style={{ margin: '0 0 15px 5px', color: '#6B4C75', fontSize: 16 }}>Лимиты по категориям</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {CATEGORIES.map((cat) => {
          // Ищем, сколько потрачено в этой категории
          const stat = stats.find(s => s.name === cat.id);
          const spent = stat ? stat.value : 0;
          const limit = limits[cat.id] || 0;

          // Если лимита нет и трат нет - можно не показывать (или показывать, чтобы настроить)
          // Давай показывать всё, чтобы можно было настроить.
          
          return (
            <div key={cat.id}>
              {renderBar(cat.name, spent, limit, cat.color, () => {
                const input = prompt(`Лимит для "${cat.name}" (0 - без лимита):`, limit.toString());
                if (input !== null) {
                  const val = parseFloat(input);
                  if (!isNaN(val)) onUpdateLimit(cat.id, val);
                }
              }, cat.icon)}
            </div>
          )
        })}
      </div>
    </div>
  );
};
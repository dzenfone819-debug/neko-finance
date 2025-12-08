import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { CATEGORIES, getIconByName } from '../data/constants';

interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  stats: { name: string; value: number }[];
  limits: Record<string, number>;
  totalLimit: number;
  customCategories: CustomCategory[];
  onEditCategory: (categoryId: string) => void; 
  onEditTotal: () => void;
  onAddCategory: () => void;
  onDeleteCategory: (categoryId: string) => void;
}

export const BudgetView: React.FC<Props> = ({ stats, limits, totalLimit, customCategories, onEditCategory, onEditTotal, onAddCategory, onDeleteCategory }) => {
  
  // Рендер одной полоски
  const renderBar = (title: string, spent: number, limit: number, color: string, onClick: () => void, icon?: React.ReactNode, onDelete?: () => void) => {
    const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    const isOver = spent > limit && limit > 0;
    
    return (
      <div style={{ marginBottom: 15 }}>
        <div onClick={onClick} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {icon && <div style={{ color: '#6B4C75' }}>{icon}</div>}
              <span style={{ fontWeight: 'bold', color: '#2D3436' }}>{title}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color: isOver ? '#E74C3C' : '#6B4C75' }}>
                <span style={{ fontWeight: 'bold' }}>{spent}</span> 
                <span style={{ opacity: 0.6 }}> / {limit > 0 ? limit : '∞'}</span>
              </div>
              {onDelete && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  style={{
                    background: '#FFE5E5',
                    border: 'none',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#FF6B6B',
                    padding: 0
                  }}
                >
                  <Trash2 size={14} />
                </motion.button>
              )}
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
        {CATEGORIES.filter(cat => limits[cat.id] > 0).map((cat) => {
          const stat = stats.find(s => s.name === cat.id);
          const spent = stat ? stat.value : 0;
          const limit = limits[cat.id] || 0;

          return (
            <div key={cat.id}>
              {renderBar(
                cat.name, 
                spent, 
                limit, 
                cat.color, 
                () => onEditCategory(cat.id), 
                cat.icon,
                () => onDeleteCategory(cat.id)
              )}
            </div>
          )
        })}

        {/* КАСТОМНЫЕ КАТЕГОРИИ */}
        {customCategories.filter(cat => limits[cat.id] > 0).map((cat) => {
          const stat = stats.find(s => s.name === cat.id);
          const spent = stat ? stat.value : 0;
          const limit = limits[cat.id] || 0;

          return (
            <div key={cat.id}>
              {renderBar(
                cat.name, 
                spent, 
                limit, 
                cat.color, 
                () => onEditCategory(cat.id), 
                getIconByName(cat.icon, 20),
                () => onDeleteCategory(cat.id)
              )}
            </div>
          )
        })}

        {/* КНОПКА ДОБАВИТЬ КАТЕГОРИЮ */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAddCategory}
          style={{
            width: '100%',
            marginTop: 10,
            padding: '12px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer'
          }}
        >
          <Plus size={20} /> Добавить лимит
        </motion.button>
      </div>
    </div>
  );
};
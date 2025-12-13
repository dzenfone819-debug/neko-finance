import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Trash2, Filter, Edit2 } from 'lucide-react';
// Импортируем обе константы и функции
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryName, getCategoryColor, getIconByName } from '../data/constants';

interface Transaction {
  id: number;
  amount: number;
  category: string;
  date: string;
  type?: 'expense' | 'income'; // Добавили тип
}

interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  transactions: Transaction[];
  onDelete: (id: number) => void;
  onEdit?: (transaction: Transaction) => void;
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
  customCategories?: CustomCategory[];
}

export const TransactionList: React.FC<Props> = ({ transactions, onDelete, onEdit, onFilterClick, hasActiveFilters, customCategories = [] }) => {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const handleDragEnd = (id: number, transaction: Transaction, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Свайп влево - удаление (offset < -100 или быстрый свайп)
    if (offset < -100 || (velocity < -500 && offset < -50)) {
      onDelete(id);
    }
    // Свайп вправо - редактирование (offset > 100 или быстрый свайп)
    else if (onEdit && (offset > 100 || (velocity > 500 && offset > 50))) {
      onEdit(transaction);
    }
    
    setDraggedItem(null);
  };

  return (
    <div style={{ width: '100%', paddingBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: 10, marginRight: 10, marginBottom: 10 }}>
        <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: 18 }}>История операций</h3>
        {onFilterClick && (
          <button
            onClick={onFilterClick}
            style={{
              background: hasActiveFilters ? 'linear-gradient(135deg, var(--primary) 0%, #E891C8 100%)' : 'var(--bg-input)',
              border: '2px solid var(--border-color)',
              borderRadius: 12,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              color: hasActiveFilters ? 'white' : 'var(--text-main)',
              fontWeight: 700,
              fontSize: 14,
              fontFamily: 'Nunito, sans-serif',
              boxShadow: hasActiveFilters ? '0 2px 8px rgba(210, 145, 188, 0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Filter size={16} />
            {hasActiveFilters && 'Активны'}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence>
          {transactions.map((t) => {
            const isIncome = t.type === 'income';
            const isDragging = draggedItem === t.id;
            
            // Ищем иконку в обоих списках и в кастомных категориях
            const allCats = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
            const cat = allCats.find(c => c.id === t.category);
            const customCat = customCategories.find(c => c.id === t.category);
            
            // Используем кастомную категорию, если найдена
            const categoryName = customCat ? customCat.name : getCategoryName(t.category);
            const categoryColor = customCat ? customCat.color : getCategoryColor(t.category);
            // Для кастомных категорий используем getIconByName (может быть эмодзи или название компонента)
            const categoryIcon = customCat ? getIconByName(customCat.icon, 20) : (cat?.icon || null);
            
            return (
              <div key={t.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
                {/* Фон с подсказками для свайпа */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0 20px',
                  borderRadius: 16
                }}>
                  {onEdit && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#3498db',
                      fontWeight: 'bold',
                      fontSize: 14
                    }}>
                      <Edit2 size={20} />
                      <span>Редактировать</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--accent-danger)',
                    fontWeight: 'bold',
                    fontSize: 14,
                    marginLeft: 'auto'
                  }}>
                    <span>Удалить</span>
                    <Trash2 size={20} />
                  </div>
                </div>

                {/* Карточка транзакции */}
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragStart={() => setDraggedItem(t.id)}
                  onDragEnd={(_, info) => handleDragEnd(t.id, t, info)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: isDragging ? 1.02 : 1
                  }}
                  exit={{ opacity: 0, x: -50, height: 0 }}
                  layout
                  style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'var(--bg-input)', 
                    padding: '12px 16px', 
                    borderRadius: 16,
                    position: 'relative',
                    zIndex: isDragging ? 10 : 1,
                    cursor: 'grab',
                    touchAction: 'pan-y'
                  }}
                  whileTap={{ cursor: 'grabbing' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      background: categoryColor, 
                      padding: 8, 
                      borderRadius: '50%', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontSize: typeof categoryIcon === 'string' ? 18 : undefined
                    }}>
                      {categoryIcon || <div style={{width: 20, height: 20}} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: 14 }}>
                        {categoryName}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatDate(t.date)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    {/* Красим сумму: Зеленый (+) или Фиолетовый (-) */}
                    <span style={{ fontWeight: '800', color: isIncome ? 'var(--accent-success)' : 'var(--text-main)' }}>
                      {isIncome ? '+' : '-'}{t.amount} ₽
                    </span>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>
        {transactions.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, marginTop: 10 }}>История пуста 🕸️</div>}
      </div>
    </div>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Filter } from 'lucide-react';
// Импортируем обе константы и функции
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryName, getCategoryColor } from '../data/constants';

interface Transaction {
  id: number;
  amount: number;
  category: string;
  date: string;
  type?: 'expense' | 'income'; // Добавили тип
}

interface Props {
  transactions: Transaction[];
  onDelete: (id: number) => void;
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
}

export const TransactionList: React.FC<Props> = ({ transactions, onDelete, onFilterClick, hasActiveFilters }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  return (
    <div style={{ width: '100%', paddingBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: 10, marginRight: 10, marginBottom: 10 }}>
        <h3 style={{ color: '#6B4C75', margin: 0, fontSize: 18 }}>История операций</h3>
        {onFilterClick && (
          <button
            onClick={onFilterClick}
            style={{
              background: hasActiveFilters ? 'linear-gradient(135deg, #D291BC 0%, #E891C8 100%)' : 'white',
              border: '2px solid #F0F0F0',
              borderRadius: 12,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              color: hasActiveFilters ? 'white' : '#6B4C75',
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
            
            // Ищем иконку в обоих списках
            const allCats = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
            const cat = allCats.find(c => c.id === t.category);
            
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50, height: 0 }}
                layout
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#F8F9FA', padding: '12px 16px', borderRadius: 16,
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ 
                    background: getCategoryColor(t.category), 
                    padding: 8, borderRadius: '50%', color: '#6B4C75', display: 'flex'
                  }}>
                    {cat?.icon || <div style={{width: 20, height: 20}} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 'bold', color: '#2D3436', fontSize: 14 }}>
                      {getCategoryName(t.category)}
                    </span>
                    <span style={{ fontSize: 11, color: '#A0A0A0' }}>{formatDate(t.date)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                  {/* Красим сумму: Зеленый (+) или Фиолетовый (-) */}
                  <span style={{ fontWeight: '800', color: isIncome ? '#27AE60' : '#6B4C75' }}>
                    {isIncome ? '+' : '-'}{t.amount} ₽
                  </span>
                  <button onClick={() => onDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E74C3C', opacity: 0.6, padding: 4 }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {transactions.length === 0 && <div style={{ textAlign: 'center', color: '#ccc', fontSize: 14, marginTop: 10 }}>История пуста 🕸️</div>}
      </div>
    </div>
  );
};
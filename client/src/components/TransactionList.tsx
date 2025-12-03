import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { CATEGORIES, getCategoryName } from '../data/constants';

// Тип данных для транзакции
interface Transaction {
  id: number;
  amount: number;
  category: string;
  date: string;
}

interface Props {
  transactions: Transaction[];
  onDelete: (id: number) => void;
}

export const TransactionList: React.FC<Props> = ({ transactions, onDelete }) => {
  
  // Функция для красивой даты (сегодня, вчера или дата)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  return (
    <div style={{ width: '100%', paddingBottom: 20 }}>
      <h3 style={{ color: '#6B4C75', marginLeft: 10, marginBottom: 10, fontSize: 18 }}>
        История операций
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence>
          {transactions.map((t) => {
            const cat = CATEGORIES.find(c => c.id === t.category);
            
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50, height: 0 }} // Анимация удаления (улетает влево)
                layout // Плавная перестройка списка
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#F8F9FA',
                  padding: '12px 16px',
                  borderRadius: 16,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Иконка и Текст */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ 
                    background: cat?.color || '#eee', 
                    padding: 8, 
                    borderRadius: '50%',
                    color: '#6B4C75',
                    display: 'flex'
                  }}>
                    {/* Если иконки нет, рисуем кружок */}
                    {cat?.icon || <div style={{width: 20, height: 20}} />}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 'bold', color: '#2D3436', fontSize: 14 }}>
                      {getCategoryName(t.category)}
                    </span>
                    <span style={{ fontSize: 11, color: '#A0A0A0' }}>
                      {formatDate(t.date)}
                    </span>
                  </div>
                </div>

                {/* Сумма и Кнопка удаления */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                  <span style={{ fontWeight: '800', color: '#6B4C75' }}>
                    -{t.amount} ₽
                  </span>
                  
                  <button 
                    onClick={() => onDelete(t.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#E74C3C', opacity: 0.6, padding: 4
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {transactions.length === 0 && (
          <div style={{ textAlign: 'center', color: '#ccc', fontSize: 14, marginTop: 10 }}>
            История пуста 🕸️
          </div>
        )}
      </div>
    </div>
  );
};
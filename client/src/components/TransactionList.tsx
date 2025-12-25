import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Filter, Edit2 } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryName, getCategoryColor, getIconByName } from '../data/constants';
import { ActionDrawer } from './ActionDrawer';
import WebApp from '@twa-dev/sdk';

interface Transaction {
  id: number;
  amount: number;
  category: string;
  date: string;
  type?: 'expense' | 'income';
  account_id?: number | null;
  target_type?: 'account' | 'goal';
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
  accounts?: { id: number | string; name?: string; color?: string; type?: string }[];
}

export const TransactionList: React.FC<Props> = ({ 
  transactions, 
  onDelete, 
  onEdit, 
  onFilterClick, 
  hasActiveFilters, 
  customCategories = [] 
  , accounts = []
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const handleTouchStart = (t: Transaction) => {
    longPressTimer.current = window.setTimeout(() => {
      WebApp.HapticFeedback.impactOccurred('medium');
      setSelectedTransaction(t);
      setDrawerOpen(true);
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Also support right click for desktop testing
  const handleContextMenu = (e: React.MouseEvent, t: Transaction) => {
    e.preventDefault();
    setSelectedTransaction(t);
    setDrawerOpen(true);
  };

  return (
    <div style={{ width: '100%', paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: 10, marginRight: 10, marginBottom: 10 }}>
        <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: 18, fontWeight: '800' }}>История операций</h3>
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

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence initial={false}>
          {transactions.map((t) => {
            const isIncome = t.type === 'income';
            
            const allCats = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
            const cat = allCats.find(c => c.id === t.category);
            const customCat = customCategories.find(c => c.id === t.category);
            
            const categoryName = customCat ? customCat.name : getCategoryName(t.category);
            const categoryColor = customCat ? customCat.color : getCategoryColor(t.category);
            const categoryIcon = customCat ? getIconByName(customCat.icon, 20) : (cat?.icon || null);
            
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                onTouchStart={() => handleTouchStart(t)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd} // Cancel on scroll
                onContextMenu={(e) => handleContextMenu(e, t)}
                style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'var(--bg-input)', 
                  padding: '12px 16px', 
                  borderRadius: 16,
                  cursor: 'pointer',
                  userSelect: 'none',
                  position: 'relative',
                  transition: 'background-color 0.2s'
                }}
                whileTap={{ scale: 0.98, backgroundColor: 'var(--bg-card)' }}
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
                    minWidth: 36,
                    height: 36,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                  }}>
                    {categoryIcon || <div style={{width: 20, height: 20}} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: 14 }}>
                      {categoryName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatDate(t.date)}</span>
                      {/* Account tag */}
                      {t.account_id !== undefined && t.account_id !== null ? (
                        (() => {
                          const acc = accounts?.find(a => a && a.id !== undefined && a.id !== null && a.id.toString() === t.account_id!.toString());
                          const name = acc?.name || `#${t.account_id}`;
                          const color = acc?.color || 'gray';
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{name}</span>
                            </div>
                          )
                        })()
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>—</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: '800', color: isIncome ? 'var(--accent-success)' : 'var(--text-main)', fontSize: 15 }}>
                    {isIncome ? '+' : '-'}{t.amount} ₽
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {transactions.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: 'var(--text-secondary)', 
            fontSize: 14, 
            marginTop: 20,
            padding: 20,
            background: 'var(--bg-input)',
            borderRadius: 16
          }}>
            История пуста 🕸️
          </div>
        )}
      </div>

      {/* Action Drawer */}
      <ActionDrawer 
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Операция"
        actions={[
          {
            icon: <Edit2 size={20} />,
            label: 'Редактировать',
            onClick: () => {
              if (selectedTransaction && onEdit) {
                onEdit(selectedTransaction);
              }
            }
          },
          {
            icon: <Trash2 size={20} />,
            label: 'Удалить',
            isDestructive: true,
            onClick: () => {
              if (selectedTransaction) {
                onDelete(selectedTransaction.id);
              }
            }
          }
        ]}
      />
    </div>
  );
};

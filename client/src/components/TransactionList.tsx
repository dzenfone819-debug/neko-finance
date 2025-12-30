import React from 'react';
import { motion } from 'framer-motion';
import { StickyNote, Image as ImageIcon } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getIconByName } from '../data/constants';

interface TransactionListProps {
  transactions: any[];
  onDelete?: (id: number) => void;
  onEdit?: (transaction: any) => void;
  onFilterClick?: () => void;
  onTransactionClick?: (transaction: any) => void;
  hasActiveFilters?: boolean;
  customCategories?: any[];
  accounts?: any[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  onFilterClick,
  onTransactionClick,
  hasActiveFilters,
  customCategories = [],
  accounts = [],
  onLoadMore,
  hasMore
}) => {

  if (transactions.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 20px' }}>
        <p style={{ fontSize: 16 }}>Нет операций за этот период 😺</p>
        {onFilterClick && (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onFilterClick}
            style={{
              marginTop: 15,
              padding: '8px 16px',
              background: hasActiveFilters ? 'var(--primary)' : 'var(--bg-input)',
              color: hasActiveFilters ? '#fff' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {hasActiveFilters ? 'Фильтры активны' : 'Найти транзакцию'}
          </motion.button>
        )}
      </div>
    );
  }

  // Группировка транзакций по дате
  const groupedTransactions = transactions.reduce((groups: any, transaction: any) => {
    const date = new Date(transaction.date);
    const dateKey = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(transaction);
    return groups;
  }, {});

  const getCategoryInfo = (catId: string, type: 'expense' | 'income') => {
    // 1. Поиск в стандартных категориях
    let cat = type === 'expense' 
      ? EXPENSE_CATEGORIES.find(c => c.id === catId) 
      : INCOME_CATEGORIES.find(c => c.id === catId);
    
    // 2. Поиск в кастомных категориях
    if (!cat && customCategories) {
      cat = customCategories.find(c => c.id === catId);
    }

    if (!cat) {
        // Fallback
        return { name: catId, icon: '❓', color: '#ccc' };
    }
    
    return cat;
  };

  const getAccountInfo = (accountId: number) => {
    return accounts.find(a => a.id === accountId);
  }

  return (
    <div className="transaction-list">
      {onFilterClick && (
        <div style={{ padding: '0 0 10px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onFilterClick}
            style={{
              padding: '6px 12px',
              background: hasActiveFilters ? 'var(--primary)' : 'var(--bg-input)',
              color: hasActiveFilters ? '#fff' : 'var(--text-main)',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            🔍 {hasActiveFilters ? 'Фильтры вкл.' : 'Поиск'}
          </motion.button>
        </div>
      )}

      {Object.entries(groupedTransactions).map(([date, dateTransactions]: [string, any]) => (
        <div key={date} className="date-group" style={{ marginBottom: 20 }}>
          <div className="date-header" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>{date}</div>
          {dateTransactions.map((t: any) => {
            const catInfo = getCategoryInfo(t.category, t.type || 'expense');
            const accountInfo = t.account_id ? getAccountInfo(t.account_id) : null;

            return (
              <motion.div 
                key={t.id} 
                className="transaction-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98, backgroundColor: 'var(--bg-input)' }}
                onClick={() => onTransactionClick && onTransactionClick(t)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'var(--bg-card)',
                  padding: '12px',
                  borderRadius: 16,
                  marginBottom: 8,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px var(--shadow-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div 
                    className="transaction-icon"
                    style={{ 
                      backgroundColor: catInfo.color, 
                      color: '#fff',
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18
                    }}
                  >
                    {typeof catInfo.icon === 'string' ? getIconByName(catInfo.icon) : catInfo.icon}
                  </div>
                  
                  <div className="transaction-details" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div className="transaction-category" style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span className="category-name" style={{ lineHeight: 1 }}>{catInfo.name}</span>
                      {/* Note icon (minimalist) */}
                      {t.note && (
                        <StickyNote size={14} style={{ opacity: 0.65, color: 'var(--text-secondary)' }} />
                      )}
                      {/* Photo icon (minimalist) - show only if photo_urls present */}
                      {t.photo_urls && (() => {
                        try {
                          const parsed = typeof t.photo_urls === 'string' ? JSON.parse(t.photo_urls) : t.photo_urls;
                          return Array.isArray(parsed) && parsed.length > 0 ? <ImageIcon size={14} style={{ opacity: 0.65, color: 'var(--text-secondary)' }} /> : null;
                        } catch (e) { return null; }
                      })()}
                    </div>
                    {accountInfo && (
                      (() => {
                        // parse tags for display near account name
                        let parsedTags: string[] = [];
                        try {
                          parsedTags = t.tags ? (typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags) : [];
                          if (!Array.isArray(parsedTags)) parsedTags = [];
                        } catch (e) { parsedTags = []; }

                        return (
                          <div className="transaction-account" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span aria-hidden style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              backgroundColor: accountInfo.color || '#ccc',
                              display: 'inline-block',
                              boxShadow: '0 0 0 1px rgba(0,0,0,0.06) inset'
                            }} />
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{accountInfo.name}</span>
                            {parsedTags.length > 0 && (
                              <div style={{ display: 'flex', gap: 6, marginLeft: 6, flexWrap: 'wrap' }}>
                                {parsedTags.slice(0, 3).map((tag: string) => (
                                  <span key={tag} style={{
                                    fontSize: 11,
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-input)',
                                    padding: '2px 6px',
                                    borderRadius: 999,
                                    display: 'inline-block'
                                  }}>#{tag}</span>
                                ))}
                                {parsedTags.length > 3 && (
                                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>+{parsedTags.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>

                <div 
                  className="transaction-amount"
                  style={{ 
                    fontWeight: 800, 
                    fontSize: 15,
                    color: t.type === 'income' ? 'var(--accent-success)' : 'var(--text-main)' 
                  }}
                >
                  {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ₽
                </div>
              </motion.div>
            );
          })}
        </div>
      ))}

      {hasMore && onLoadMore && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onLoadMore}
                style={{
                    padding: '10px 20px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px var(--shadow-color)'
                }}
            >
                Загрузить еще
            </motion.button>
        </div>
      )}
    </div>
  );
}

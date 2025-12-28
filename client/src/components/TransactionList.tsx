import React from 'react';
import { motion } from 'framer-motion';
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
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions, 
  onDelete, 
  onEdit, 
  onFilterClick,
  onTransactionClick,
  hasActiveFilters,
  customCategories = [],
  accounts = []
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
                    <div className="transaction-category" style={{ fontWeight: 700, fontSize: 14 }}>
                      {catInfo.name}
                      {t.tags && (
                        <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 6 }}>
                          {(() => {
                             try {
                               const parsed = typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags;
                               return Array.isArray(parsed) && parsed.length > 0 ? '📎' : '';
                             } catch(e) { return ''; }
                          })()}
                        </span>
                      )}
                      {t.note && (
                        <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 4 }}>
                           📝
                        </span>
                      )}
                      {t.photo_urls && (
                        <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 4 }}>
                           {(() => {
                             try {
                               const parsed = typeof t.photo_urls === 'string' ? JSON.parse(t.photo_urls) : t.photo_urls;
                               return Array.isArray(parsed) && parsed.length > 0 ? '🖼️' : '';
                             } catch(e) { return ''; }
                          })()}
                        </span>
                      )}
                    </div>
                    {accountInfo && (
                      <div className="transaction-account" style={{ fontSize: 11, color: accountInfo.color || 'var(--text-secondary)' }}>
                        {accountInfo.name}
                      </div>
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
    </div>
  );
}

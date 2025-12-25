import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, TrendingUp, PiggyBank, CreditCard } from 'lucide-react';
import { CATEGORIES, INCOME_CATEGORIES, getIconByName } from '../data/constants';

interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type?: 'expense' | 'income';
}

interface Transaction {
  id: number;
  amount: number;
  category: string;
  date: string;
  type: 'expense' | 'income';
  account_id?: number;
  // target_type?: 'account' | 'goal'; // This field might not be in the transaction object from fetchTransactions,
  // but let's assume we can infer it or we might need to fetch accounts to map names.
}

interface Props {
  stats: { name: string; value: number }[];
  limits: Record<string, number>;
  totalLimit: number;
  customCategories: CustomCategory[];
  onEditCategory: (categoryId: string) => void; 
  onEditTotal: () => void;
  onAddCategory: () => void;
  onAddIncomeCategory: () => void;
  onDeleteCategory: (categoryId: string) => void;
  transactions?: Transaction[];
  accounts?: any[]; // To map account_id to name
}

export const BudgetView: React.FC<Props> = ({
  stats,
  limits,
  totalLimit,
  customCategories,
  onEditCategory,
  onEditTotal,
  onAddCategory,
  onAddIncomeCategory,
  onDeleteCategory,
  transactions = []
}) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');

  // Рендер одной полоски
  const renderBar = (title: string, spent: number, limit: number, color: string, onClick: () => void, icon?: React.ReactNode, onDelete?: () => void) => {
    const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    const isOver = spent > limit && limit > 0;
    
    return (
      <div style={{ marginBottom: 15 }}>
        <div onClick={onClick} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {icon && <div style={{ color: 'var(--text-main)' }}>{icon}</div>}
              <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{title}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color: isOver ? 'var(--accent-danger)' : 'var(--text-main)' }}>
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
                    background: 'var(--bg-input)',
                    border: '1px solid var(--accent-danger)',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--accent-danger)',
                    padding: 0
                  }}
                >
                  <Trash2 size={14} />
                </motion.button>
              )}
            </div>
          </div>

          <div style={{ width: '100%', height: 10, background: 'var(--bg-input)', borderRadius: 5, overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5 }}
              style={{ 
                height: '100%', 
                background: isOver ? 'var(--accent-danger)' : color, 
                borderRadius: 5 
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderIncomeItem = (title: string, amount: number, color: string, categoryId: string, icon?: React.ReactNode, onDelete?: () => void) => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const percentage = totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : '0';

    // Calculate account distribution for this category
    const categoryTransactions = transactions.filter(t => t.type === 'income' && t.category === categoryId);

    // Group by account/goal
    const accountDist: Record<string, number> = {};
    categoryTransactions.forEach(t => {
      // If we have account_id, use it. Some old transactions might not have it.
      if (t.account_id) {
        // We need to differentiate accounts and goals if IDs overlap, but usually IDs are unique per table.
        // The API returns distinct IDs or we rely on accounts list mapping.
        // Since we combined accounts and goals in props, we can just look up by ID.
        // However, we don't strictly know if it was 'account' or 'goal' type from transaction unless we look at the transaction structure closely or inferred it.
        // Let's assume account_id is sufficient for lookup in the combined list passed from App.tsx
        accountDist[t.account_id] = (accountDist[t.account_id] || 0) + t.amount;
      } else {
        accountDist['unknown'] = (accountDist['unknown'] || 0) + t.amount;
      }
    });

    const topAccounts = Object.entries(accountDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // Show top 3 sources

    return (
      <div style={{
        marginBottom: 15,
        background: 'var(--bg-card)',
        padding: 15,
        borderRadius: 16,
        boxShadow: '0 2px 8px var(--shadow-color)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff'
            }}>
              {icon}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: 15 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.8 }}>
                {percentage}% от дохода
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ fontWeight: 'bold', color: 'var(--accent-success)', fontSize: 16 }}>
              +{amount.toLocaleString()} ₽
            </div>
            {onDelete && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    opacity: 0.5,
                    padding: 0
                  }}
                >
                  <Trash2 size={16} />
                </motion.button>
              )}
          </div>
        </div>

        {/* Account Distribution Info */}
        {topAccounts.length > 0 && (
          <div style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: 10,
            marginTop: 5,
            fontSize: 12
          }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Зачислено на:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topAccounts.map(([accId, amt]) => {
                if (accId === 'unknown') return null;
                const acc = accounts?.find(a => a.id.toString() === accId.toString());
                if (!acc) return null;
                return (
                  <div key={accId} style={{
                    background: 'var(--bg-input)',
                    padding: '4px 8px',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: acc.color || 'gray'
                    }} />
                    <span style={{ color: 'var(--text-main)' }}>{acc.name}</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-main)', opacity: 0.7 }}>
                      {amt.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const totalSpent = stats.reduce((acc, curr) => acc + curr.value, 0);

  // Income logic
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  // Group by category
  const incomeStats: Record<string, number> = {};
  incomeTransactions.forEach(t => {
    incomeStats[t.category] = (incomeStats[t.category] || 0) + t.amount;
  });

  return (
    <div style={{ padding: '0 5px', paddingBottom: 80 }}>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('expenses')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'expenses' ? 'var(--primary)' : 'var(--bg-input)',
            color: activeTab === 'expenses' ? 'white' : 'var(--text-main)',
            fontWeight: 'bold',
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          Расходы
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('income')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'income' ? 'var(--accent-success)' : 'var(--bg-input)',
            color: activeTab === 'income' ? 'white' : 'var(--text-main)',
            fontWeight: 'bold',
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          Доходы
        </motion.button>
      </div>

      {activeTab === 'expenses' ? (
        <>
          {/* 1. ОБЩИЙ БЮДЖЕТ */}
          <div style={{ background: 'var(--bg-card)', padding: 15, borderRadius: 20, marginBottom: 20, boxShadow: '0 2px 8px var(--shadow-color)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: 16 }}>Общий бюджет</h3>
            {renderBar('Всего', totalSpent, totalLimit, 'var(--primary)', onEditTotal)}
          </div>

          {/* 2. ПО КАТЕГОРИЯМ */}
          <h3 style={{ margin: '0 0 15px 5px', color: 'var(--text-main)', fontSize: 16 }}>Лимиты по категориям</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {CATEGORIES.filter(cat => limits[cat.id] !== undefined && limits[cat.id] >= 0).map((cat) => {
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

            {/* КАСТОМНЫЕ КАТЕГОРИИ (EXPENSE) */}
            {customCategories
              .filter(cat => (cat.type || 'expense') === 'expense')
              .filter(cat => limits[cat.id] !== undefined && limits[cat.id] >= 0)
              .map((cat) => {
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}
            >
              <Plus size={20} /> Добавить лимит
            </motion.button>
          </div>
        </>
      ) : (
        <>
          <h3 style={{ margin: '0 0 15px 5px', color: 'var(--text-main)', fontSize: 16 }}>Категории доходов</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* STANDARD INCOME CATEGORIES */}
            {INCOME_CATEGORIES.map((cat) => {
              const amount = incomeStats[cat.id] || 0;
              return (
                <div key={cat.id}>
                  {renderIncomeItem(
                    cat.name,
                    amount,
                    cat.color,
                    cat.id,
                    cat.icon
                    // Standard categories cannot be deleted
                  )}
                </div>
              )
            })}

            {/* CUSTOM INCOME CATEGORIES */}
            {customCategories
              .filter(cat => cat.type === 'income')
              .map((cat) => {
                const amount = incomeStats[cat.id] || 0;
                return (
                  <div key={cat.id}>
                    {renderIncomeItem(
                      cat.name,
                      amount,
                      cat.color,
                      cat.id,
                      getIconByName(cat.icon, 20),
                      () => onDeleteCategory(cat.id)
                    )}
                  </div>
                )
            })}

            {/* КНОПКА ДОБАВИТЬ КАТЕГОРИЮ ДОХОДА */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onAddIncomeCategory}
              style={{
                width: '100%',
                marginTop: 10,
                padding: '12px',
                background: 'linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(74, 222, 128, 0.3)'
              }}
            >
              <Plus size={20} /> Создать категорию
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
};

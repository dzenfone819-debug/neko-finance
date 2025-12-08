import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WebApp from '@twa-dev/sdk'
import { LayoutGrid, Plus, Target, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react'
import './App.css'

import { NumPad } from './components/NumPad'
import { StatsView } from './components/StatsView'
import { TransactionList } from './components/TransactionList'
import { BudgetStatus } from './components/BudgetStatus'
import { BudgetView } from './components/BudgetView'
import { ModalInput } from './components/ModalInput'
import { MonthSelector } from './components/MonthSelector'
import { AccountsView } from './components/AccountsView'
import { Modal } from './components/Modal'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './data/constants'
import * as api from './api/nekoApi'

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'stats' | 'accounts' | 'budget'>('input')
  const [transType, setTransType] = useState<'expense' | 'income'>('expense')
  const [selectedCategory, setSelectedCategory] = useState('groceries')
  const [selectedAccount, setSelectedAccount] = useState<{type: 'account' | 'goal', id: number} | null>(null)
  const [amount, setAmount] = useState('')
  
  // Текущая дата для фильтрации
  const [currentDate, setCurrentDate] = useState(new Date())

  const [totalSpent, setTotalSpent] = useState(0)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [budgetLimit, setBudgetLimit] = useState(0)
  const [catLimits, setCatLimits] = useState<Record<string, number>>({})
  const [statsData, setStatsData] = useState<{name: string, value: number}[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [isHappy, setIsHappy] = useState(false)
  const [isError, setIsError] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{type: 'total' | 'category', id?: string} | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [customCategories, setCustomCategories] = useState<any[]>([])
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦')
  const [newCategoryColor, setNewCategoryColor] = useState('#A0C4FF')
  const [newCategoryLimit, setNewCategoryLimit] = useState('')

  // Правильная логика отображения "Доступно"
  const displayBalance = budgetLimit > 0 ? budgetLimit - totalSpent : currentBalance;

  useEffect(() => {
    WebApp.ready(); WebApp.expand(); WebApp.enableClosingConfirmation(); 
    let currentUserId = 777; 
    if (WebApp.initDataUnsafe.user) currentUserId = WebApp.initDataUnsafe.user.id;
    setUserId(currentUserId);
    loadData(currentUserId, new Date());
  }, [])

  // Следим за изменениями selectedAccount
  useEffect(() => {
    console.log('🔵 selectedAccount changed to:', selectedAccount);
  }, [selectedAccount])

  // Логируем загруженные аккаунты
  useEffect(() => {
    if (accounts.length > 0) {
      console.log('📋 Accounts loaded:', accounts.map(a => ({ id: a.id, name: a.name, idType: typeof a.id })));
    }
  }, [accounts])

  useEffect(() => {
    if (goals.length > 0) {
      console.log('🎯 Goals loaded:', goals.map(g => ({ id: g.id, name: g.name, idType: typeof g.id })));
    }
  }, [goals])

  const loadData = async (uid: number, date: Date) => {
    try {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const [balData, stats, hist, bud, lims, accs, gls, customCats] = await Promise.all([
        api.fetchBalance(uid, month, year),
        api.fetchStats(uid, month, year),
        api.fetchTransactions(uid, month, year),
        api.fetchBudget(uid),
        api.fetchCategoryLimits(uid),
        api.fetchAccounts(uid),
        api.fetchGoals(uid),
        api.fetchCustomCategories(uid)
      ]);
      
      setTotalSpent(balData.total_expense);
      setCurrentBalance(balData.balance);
      setStatsData(stats);
      setTransactions(hist);
      setBudgetLimit(bud);
      setCatLimits(lims);
      setAccounts(accs);
      setGoals(gls);
      setCustomCategories(customCats);
      // Устанавливаем первый счет по умолчанию, если не выбран
      if (!selectedAccount && accs.length > 0) {
        setSelectedAccount({type: 'account', id: accs[0].id});
      }
    } catch (e) { console.error(e) }
  }

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
    if (userId) loadData(userId, newDate);
  }

  const toggleTransType = (type: 'expense' | 'income') => {
    WebApp.HapticFeedback.selectionChanged();
    setTransType(type);
    if (type === 'expense') setSelectedCategory(EXPENSE_CATEGORIES[0].id);
    else setSelectedCategory(INCOME_CATEGORIES[0].id);
  }

  const currentCategories = transType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleConfirm = async () => {
    const value = parseFloat(amount);
    if (!amount || amount === '.' || isNaN(value) || value <= 0 || !userId) { 
      console.log('❌ Validation failed:', { amount, value, userId });
      api.logToServer('❌ Validation failed:', { amount, value, userId });
      triggerError(); 
      return; 
    }
    if (!selectedAccount) { 
      console.error('❌ No account selected! selectedAccount:', selectedAccount);
      api.logToServer('❌ NO ACCOUNT SELECTED', { selectedAccount, accounts: accounts.map(a => ({id: a.id, name: a.name})), goals: goals.map(g => ({id: g.id, name: g.name})) });
      triggerError(); 
      return; 
    }
    try {
      // Используем тип из selectedAccount
      const targetType = selectedAccount.type;
      const targetId = selectedAccount.id;
      console.log('📤 Sending transaction:', { userId, value, selectedCategory, transType, targetId, targetType, accountsCount: accounts.length, goalsCount: goals.length });
      api.logToServer('📤 BEFORE API.addTransaction', { userId, value, selectedCategory, transType, targetId, targetType, accountsCount: accounts.length, goalsCount: goals.length });
      const result = await api.addTransaction(userId, value, selectedCategory, transType, targetId, targetType);
      console.log('✅ Transaction result:', result);
      WebApp.HapticFeedback.notificationOccurred('success');
      setIsHappy(true); setAmount(''); 
      loadData(userId, currentDate);
      setTimeout(() => setIsHappy(false), 3000);
    } catch (e) { 
      console.error('❌ Transaction error:', e);
      api.logToServer('❌ TRANSACTION ERROR', { error: String(e) });
      triggerError(); 
    }
  }

  const openEditTotal = () => { WebApp.HapticFeedback.impactOccurred('light'); setEditTarget({ type: 'total' }); setModalOpen(true); }
  const openEditCategory = (catId: string) => { WebApp.HapticFeedback.impactOccurred('light'); setEditTarget({ type: 'category', id: catId }); setModalOpen(true); }
  
  const handleModalSave = async (val: number) => {
    if (!userId || !editTarget) return;
    try {
      WebApp.HapticFeedback.notificationOccurred('success');
      if (editTarget.type === 'total') {
        await api.setBudget(userId, val);
        setBudgetLimit(val);
      } else if (editTarget.type === 'category' && editTarget.id) {
        await api.setCategoryLimit(userId, editTarget.id, val);
        setCatLimits({ ...catLimits, [editTarget.id]: val });
      }
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  }

  const handleAddCategory = () => {
    WebApp.HapticFeedback.impactOccurred('light');
    setShowAddCategoryModal(true);
  }

  const handleCreateCategory = async () => {
    if (!userId || !newCategoryName) return;
    try {
      const limit = newCategoryLimit ? parseFloat(newCategoryLimit) : undefined;
      await api.createCustomCategory(userId, newCategoryName, newCategoryIcon, newCategoryColor, limit);
      WebApp.HapticFeedback.notificationOccurred('success');
      setShowAddCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryIcon('📦');
      setNewCategoryColor('#A0C4FF');
      setNewCategoryLimit('');
      loadData(userId, currentDate);
    } catch (e) {
      console.error(e);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!userId) return;
    WebApp.HapticFeedback.impactOccurred('medium');
    try {
      await api.deleteCustomCategory(userId, categoryId);
      WebApp.HapticFeedback.notificationOccurred('success');
      loadData(userId, currentDate);
    } catch (e) {
      console.error(e);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  }

  const getNekoMood = () => {
    if (isError) return '🙀'; if (isHappy) return '😻';
    if (budgetLimit > 0) {
      const percent = totalSpent / budgetLimit;
      if (percent >= 1.0) return '💀';
      if (percent > 0.85) return '😿';
      if (percent > 0.5) return '😾';
    }
    return '😸';
  }

  const handleDeleteTransaction = async (id: number) => { if (!userId) return; WebApp.HapticFeedback.impactOccurred('medium'); try { await api.deleteTransaction(userId, id); loadData(userId, currentDate); } catch { triggerError(); } }
  const handleNumberClick = (num: string) => { WebApp.HapticFeedback.impactOccurred('light'); if (amount.length >= 9) return; if (num === '.' && amount.includes('.')) return; setAmount(prev => prev + num); setIsError(false); }
  const handleDelete = () => { WebApp.HapticFeedback.impactOccurred('medium'); setAmount(prev => prev.slice(0, -1)); setIsError(false); }
  const triggerError = () => { WebApp.HapticFeedback.notificationOccurred('error'); setIsError(true); setTimeout(() => setIsError(false), 500); }

  return (
    <div className="app-container">
      <ModalInput isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleModalSave} title={editTarget?.type === 'total' ? 'Общий бюджет' : 'Лимит категории'} initialValue={editTarget?.type === 'total' ? budgetLimit : (editTarget?.id ? catLimits[editTarget.id] || 0 : 0)} />

      <div className="header-section">
        {/* ДАТА СВЕРХУ (Компактно) */}
        <div style={{ marginBottom: 5, zIndex: 10 }}>
           <MonthSelector currentDate={currentDate} onChange={handleDateChange} />
        </div>

        {/* КОТ (Резиновый размер) */}
        <motion.div 
          animate={isError ? { rotate: [0, -20, 20, 0] } : isHappy ? { scale: 1.1, y: [0, -10, 0] } : { scale: 1, y: 0 }}
          className="neko-avatar"
        >
          {getNekoMood()}
        </motion.div>
        
        {/* БАР БЮДЖЕТА */}
        <BudgetStatus total={totalSpent} limit={budgetLimit} />
        
        {/* ТЕКСТ ДОСТУПНО */}
        {activeTab === 'input' && (
          <div style={{ fontSize: 11, fontWeight: 'bold', color: '#6B4C75', marginTop: 2, marginBottom: 2, opacity: 0.7 }}>
            Доступно: {displayBalance.toLocaleString()} ₽
          </div>
        )}

        {/* СУММА ИЛИ ЗАГОЛОВОК */}
        {activeTab === 'input' ? (
           <motion.div className="amount-display">
             <span style={{color: transType === 'income' ? '#27AE60' : '#6B4C75'}}>{amount || '0'}</span> 
             <span className="currency">₽</span>
           </motion.div>
        ) : (
          <div style={{fontSize: 22, color: '#6B4C75', fontWeight: 'bold', marginTop: 5}}>
            {activeTab === 'stats' ? 'Статистика' : activeTab === 'accounts' ? 'Счета и Копилки' : 'Бюджет'}
          </div>
        )}
      </div>

      <div className={`content-area ${activeTab !== 'input' ? 'stats-mode' : ''}`}>
        
        {activeTab === 'input' && (
          <>
            <div className="input-tab-content">
              <div className="transaction-type-selector">
                <button onClick={() => toggleTransType('expense')} className={`type-button ${transType === 'expense' ? 'type-button-expense-active' : ''}`}>
                  <ArrowDownCircle size={18} /> Расход
                </button>
                <button onClick={() => toggleTransType('income')} className={`type-button ${transType === 'income' ? 'type-button-income-active' : ''}`}>
                  <ArrowUpCircle size={18} /> Доход
                </button>
              </div>

              {(accounts.length > 0 || goals.length > 0) && (
                <div className="account-selector-section">
                  <label className="section-label">На счет/копилку:</label>
                  <div className="account-selector-scroll">
                    {accounts.map((acc) => {
                      const isSelected = selectedAccount?.type === 'account' && selectedAccount?.id === acc.id;
                      console.log('🔄 Rendering account button:', acc.name, 'id:', acc.id, 'selectedAccount:', selectedAccount, 'isSelected:', isSelected);
                      return (
                      <motion.button
                        key={`acc-${acc.id}`}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          console.log('🔘 Clicked account:', acc.id, 'name:', acc.name);
                          setSelectedAccount({type: 'account', id: acc.id});
                        }}
                        className={`account-button ${isSelected ? 'account-button-selected' : ''}`}
                        style={{
                          borderColor: isSelected ? acc.color : undefined,
                          backgroundColor: isSelected ? acc.color : undefined,
                        }}
                      >
                        {acc.name}
                      </motion.button>
                      );
                    })}
                    {goals.map((goal) => {
                      const isSelected = selectedAccount?.type === 'goal' && selectedAccount?.id === goal.id;
                      return (
                      <motion.button
                        key={`goal-${goal.id}`}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          console.log('🎯 Clicked goal:', goal.id, 'name:', goal.name);
                          setSelectedAccount({type: 'goal', id: goal.id});
                        }}
                        className={`account-button account-button-goal ${isSelected ? 'account-button-goal-selected' : ''}`}
                        style={{
                          borderColor: isSelected ? (goal.color || '#FFB6C1') : undefined,
                          backgroundColor: isSelected ? (goal.color || '#FFB6C1') : undefined,
                        }}
                      >
                        💰 {goal.name}
                      </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="categories-wrapper">
                <div className="categories-scroll">
                  {currentCategories.map((cat) => (
                    <motion.button key={cat.id} whileTap={{ scale: 0.95 }} onClick={() => { setSelectedCategory(cat.id); WebApp.HapticFeedback.selectionChanged(); }} className="category-btn" style={{ background: selectedCategory === cat.id ? cat.color : '#F8F9FA', boxShadow: selectedCategory === cat.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}>
                      <div className="category-icon">{cat.icon}</div>
                      <span className="category-label">{cat.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
            <div className="numpad-container">
              <NumPad onNumberClick={handleNumberClick} onDelete={handleDelete} onConfirm={handleConfirm} />
            </div>
          </>
        )}

        {activeTab === 'stats' && (
          <div style={{ width: '100%', height: '100%', overflowY: 'auto', paddingRight: 5 }}>
            <StatsView data={statsData} total={totalSpent} />
            <div style={{ height: 1, background: '#F0F0F0', margin: '20px 0' }} />
            <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
            <div style={{ height: 80 }} /> 
          </div>
        )}

        {activeTab === 'accounts' && (
          <AccountsView userId={userId} accounts={accounts} goals={goals} onRefresh={() => userId && loadData(userId, currentDate)} />
        )}

        {activeTab === 'budget' && (
          <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
            <BudgetView 
              stats={statsData} 
              limits={catLimits} 
              totalLimit={budgetLimit} 
              customCategories={customCategories}
              onEditCategory={openEditCategory} 
              onEditTotal={openEditTotal}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
            />
            <div style={{ height: 80 }} />
          </div>
        )}
      </div>

      <div className="bottom-tab-bar">
        <button className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`} onClick={() => { setActiveTab('input'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Plus size={24} /></div><span>Ввод</span></button>
        <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><LayoutGrid size={24} /></div><span>Инфо</span></button>
        <button className={`tab-btn ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => { setActiveTab('budget'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Target size={24} /></div><span>Бюджет</span></button>
        <button className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => { setActiveTab('accounts'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Wallet size={24} /></div><span>Счета</span></button>
      </div>

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ЛИМИТА */}
      <Modal isOpen={showAddCategoryModal} onClose={() => setShowAddCategoryModal(false)} title="Новый лимит">
        <div className="modal-body">
          <input
            type="text"
            placeholder="Название лимита"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="modal-input"
          />
          
          <div style={{ marginBottom: 15 }}>
            <label className="modal-label">Иконка</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {['📦', '🎮', '🏠', '🚗', '✈️', '🍔', '☕', '🎬', '📱', '💊', '👕', '🎓'].map((icon) => (
                <motion.button
                  key={icon}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setNewCategoryIcon(icon)}
                  style={{
                    fontSize: 24,
                    background: newCategoryIcon === icon ? '#667eea' : '#F0F0F0',
                    border: 'none',
                    borderRadius: 8,
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {icon}
                </motion.button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 15 }}>
            <label className="modal-label">Цвет</label>
            <div className="color-picker">
              {['#CAFFBF', '#FFADAD', '#A0C4FF', '#FFD6A5', '#FFC6FF', '#9BF6FF'].map((col) => (
                <motion.button
                  key={col}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setNewCategoryColor(col)}
                  className="color-option"
                  style={{
                    background: col,
                    border: newCategoryColor === col ? '3px solid #667eea' : '2px solid #E0E0E0',
                  }}
                />
              ))}
            </div>
          </div>

          <input
            type="number"
            placeholder="Лимит (опционально)"
            value={newCategoryLimit}
            onChange={(e) => setNewCategoryLimit(e.target.value)}
            className="modal-input"
          />

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateCategory}
            className="modal-submit-button"
          >
            Создать лимит
          </motion.button>
        </div>
      </Modal>
    </div>
  )
}

export default App
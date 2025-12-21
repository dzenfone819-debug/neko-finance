import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WebApp from '@twa-dev/sdk'
import { 
  LayoutGrid, Plus, Target, ArrowUpCircle, ArrowDownCircle, Wallet,
  TrendingUp, Settings
} from 'lucide-react'
import './App.css'

import { CalculatorNumpad } from './components/CalculatorNumpad'
import { DetailInputs } from './components/DetailInputs'
import { StatsView } from './components/StatsView'
import { TransactionList } from './components/TransactionList'
import { BudgetStatus } from './components/BudgetStatus'
import { BudgetView } from './components/BudgetView'
import { ModalInput } from './components/ModalInput'
import { MonthSelector } from './components/MonthSelector'
import { AccountsView } from './components/AccountsView'
import { AnalyticsView } from './components/AnalyticsView'
import { SettingsView } from './components/SettingsView'
import { Modal } from './components/Modal'
import { NekoAvatar } from './components/NekoAvatar'
import TransactionSearch from './components/TransactionSearch'
import { ConfirmModal } from './components/ConfirmModal'
import { ColorPicker } from './components/ColorPicker'
import { IconPicker } from './components/IconPicker'
import type { FilterState } from './components/TransactionSearch'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getIconByName } from './data/constants'
import * as api from './api/nekoApi'
import { cloudStorage } from './utils/cloudStorage'

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'stats' | 'accounts' | 'budget' | 'analytics' | 'settings'>('input')
  const [transType, setTransType] = useState<'expense' | 'income'>('expense')
  const [selectedCategory, setSelectedCategory] = useState('groceries')
  const [selectedAccount, setSelectedAccount] = useState<{type: 'account' | 'goal', id: number} | null>(null)
  const [amount, setAmount] = useState('')
  
  // New input fields
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('app-theme') as 'light' | 'dark' || 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    WebApp.HapticFeedback.selectionChanged();
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [theme]);

  // Sync Telegram Mini App header color with app theme
  useEffect(() => {
    const lightHeader = '#FEC8D8';
    const darkHeader = '#0B0E14';
    const color = theme === 'dark' ? darkHeader : lightHeader;

    try {
      if (typeof WebApp !== 'undefined' && typeof (WebApp as any).setHeaderColor === 'function') {
        (WebApp as any).setHeaderColor(color);
      } else if ((window as any).Telegram && (window as any).Telegram.WebApp && typeof (window as any).Telegram.WebApp.setHeaderColor === 'function') {
        (window as any).Telegram.WebApp.setHeaderColor(color);
      }
    } catch (e) {
      console.warn('Failed to set Telegram header color', e);
    }
  }, [theme]);
  
  // Текущая дата для фильтрации
  const [currentDate, setCurrentDate] = useState(new Date())
  // Дата для транзакции (по умолчанию сегодня)
  const [transactionDate, setTransactionDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [totalSpent, setTotalSpent] = useState(0)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [budgetLimit, setBudgetLimit] = useState(0)
  const [catLimits, setCatLimits] = useState<Record<string, number>>({})
  const [statsData, setStatsData] = useState<{name: string, value: number}[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [isHappy, setIsHappy] = useState(false)
  const [isError, setIsError] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{type: 'total' | 'category', id?: string} | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [customCategories, setCustomCategories] = useState<any[]>([])
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [selectedStandardCategory, setSelectedStandardCategory] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('Package')
  const [newCategoryColor, setNewCategoryColor] = useState('#FF6B6B')
  const [newCategoryLimit, setNewCategoryLimit] = useState('')

  // Состояния для поиска и фильтров
  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    searchAmount: '',
    selectedCategory: '',
    period: 'all',
  })

  // Состояния для редактирования транзакции
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDate, setEditDate] = useState(new Date())

  // Confirmation modal state (centralized)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  // Состояния для синхронизации
  const [lastSyncTime, setLastSyncTime] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState(false)

  // Состояния для настроек бюджетного периода
  const [periodType, setPeriodType] = useState<'calendar_month' | 'custom_period'>('calendar_month')
  const [periodStartDay, setPeriodStartDay] = useState<number>(1)

  // New states for selectors (redesign)
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false)
  const [isAccountSelectorOpen, setIsAccountSelectorOpen] = useState(false)

  // Правильная логика отображения "Доступно"
  const displayBalance = budgetLimit > 0 ? budgetLimit - totalSpent : currentBalance;

  useEffect(() => {
    // В разработке (localhost/127.0.0.1) пропускаем проверку Telegram
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isDevelopment && !WebApp.initDataUnsafe.user && !WebApp.initDataUnsafe.query_id) {
      document.body.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: Arial, sans-serif;
          color: #6B4C75;
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%);
        ">
          <div style="font-size: 64px; margin-bottom: 20px;">🐱</div>
          <h1 style="font-size: 24px; margin-bottom: 10px;">PurrFinance</h1>
          <p style="font-size: 16px; opacity: 0.8;">Это приложение доступно только в Telegram</p>
        </div>
      `;
      return;
    }

    if (!isDevelopment) {
      WebApp.ready(); 
      WebApp.expand(); 
      WebApp.enableClosingConfirmation(); 
    }
    
    let currentUserId = 777; 
    if (WebApp.initDataUnsafe.user) currentUserId = WebApp.initDataUnsafe.user.id;
    setUserId(currentUserId);
    loadData(currentUserId, new Date());
    loadBudgetPeriodSettings(currentUserId);
  }, [])

  const loadData = async (uid: number, date: Date) => {
    try {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const [balData, stats, hist, bud, lims, accs, gls, customCats] = await Promise.all([
        api.fetchBalance(uid, month, year),
        api.fetchStats(uid, month, year),
        api.fetchTransactions(uid, month, year),
        api.fetchBudget(uid, month, year),
        api.fetchCategoryLimits(uid, month, year),
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

      syncToCloud(hist, accs, gls, bud, customCats, lims);
    } catch (e) { console.error(e) }
  }

  const syncToCloud = async (trans: any[], accs: any[], goals: any[], budget: number, cats: any[], limits: any) => {
    if (!cloudStorage.isAvailable()) return;
    try {
      setIsSyncing(true);
      await cloudStorage.saveToCloud({
        transactions: trans,
        accounts: accs,
        goals: goals,
        budgetSettings: { budget_limit: budget },
        categories: cats,
        limits: limits
      });
      const syncTime = Date.now();
      setLastSyncTime(syncTime);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    if (cloudStorage.isAvailable()) {
      cloudStorage.getLastSyncTime().then(time => setLastSyncTime(time));
    }
  }, []);

  const loadBudgetPeriodSettings = async (uid: number) => {
    try {
      const settings = await api.getBudgetPeriodSettings(uid);
      if (settings) {
        setPeriodType(settings.period_type || 'calendar_month');
        setPeriodStartDay(settings.period_start_day || 1);
      }
    } catch (error) {
      console.error('Failed to load budget period settings:', error);
    }
  };

  const handleSaveBudgetPeriodSettings = async (
    newPeriodType: 'calendar_month' | 'custom_period',
    newStartDay: number
  ) => {
    if (!userId) return;
    try {
      await api.setBudgetPeriodSettings(userId, newPeriodType, newStartDay);
      setPeriodType(newPeriodType);
      setPeriodStartDay(newStartDay);
      loadData(userId, currentDate);
      WebApp.HapticFeedback.notificationOccurred('success');
    } catch (error) {
      console.error('Failed to save budget period settings:', error);
      WebApp.HapticFeedback.notificationOccurred('error');
      throw error;
    }
  };

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
    if (userId) loadData(userId, newDate);
  }

  const loadAllTransactions = async (uid: number) => {
    try {
      const allTrans = await api.fetchTransactions(uid);
      setAllTransactions(allTrans);
    } catch (e) { 
      console.error('Error loading all transactions:', e); 
    }
  }

  useEffect(() => {
    if (activeTab === 'analytics' && userId && allTransactions.length === 0) {
      loadAllTransactions(userId);
    }
  }, [activeTab, userId])

  const toggleTransType = (type: 'expense' | 'income') => {
    WebApp.HapticFeedback.selectionChanged();
    setTransType(type);
    if (type === 'expense') setSelectedCategory(EXPENSE_CATEGORIES[0].id);
    else setSelectedCategory(INCOME_CATEGORIES[0].id);
  }

  const currentCategories = transType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // Helpers to get current names/icons
  const getSelectedCategoryData = () => {
    const allCats = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...customCategories];
    return allCats.find(c => c.id === selectedCategory) || EXPENSE_CATEGORIES[0];
  }

  const getSelectedAccountData = () => {
    if (!selectedAccount) return null;
    if (selectedAccount.type === 'account') {
        return accounts.find(a => a.id === selectedAccount.id);
    }
    return goals.find(g => g.id === selectedAccount.id);
  }

  const handleConfirm = async () => {
    const value = parseFloat(amount);
    if (!amount || amount === '.' || isNaN(value) || value <= 0 || !userId) { 
      triggerError(); 
      return; 
    }
    if (!selectedAccount) { 
      triggerError(); 
      return; 
    }
    try {
      // Upload photo first if exists
      let photoUrl = '';
      if (photo) {
        try {
            photoUrl = await api.uploadPhoto(photo);
        } catch (e) {
            console.error('Photo upload failed', e);
        }
      }

      const targetType = selectedAccount.type;
      const targetId = selectedAccount.id;

      await api.addTransaction(
          userId, value, selectedCategory, transType, targetId, targetType,
          transactionDate.toISOString(),
          note, tags, photoUrl
      );

      WebApp.HapticFeedback.notificationOccurred('success');
      setIsHappy(true);
      setAmount('');
      setNote('');
      setTags('');
      setPhoto(null);

      loadData(userId, currentDate);
      if (allTransactions.length > 0) {
        loadAllTransactions(userId);
      }
      setTimeout(() => setIsHappy(false), 3000);
    } catch (e) { 
      console.error('❌ Transaction error:', e);
      triggerError(); 
    }
  }

  const openEditTotal = () => { WebApp.HapticFeedback.impactOccurred('light'); setEditTarget({ type: 'total' }); setModalOpen(true); }
  const openEditCategory = (catId: string) => { WebApp.HapticFeedback.impactOccurred('light'); setEditTarget({ type: 'category', id: catId }); setModalOpen(true); }
  
  const handleModalSave = async (val: number) => {
    if (!userId || !editTarget) return;
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      WebApp.HapticFeedback.notificationOccurred('success');
      if (editTarget.type === 'total') {
        await api.setBudget(userId, val, month, year);
        setBudgetLimit(val);
      } else if (editTarget.type === 'category' && editTarget.id) {
        await api.setCategoryLimit(userId, editTarget.id, val, month, year);
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
    setIsCustomCategory(false);
    setSelectedStandardCategory('');
    setNewCategoryName('');
    setNewCategoryIcon('Package');
    setNewCategoryColor('#FF6B6B');
    setNewCategoryLimit('');
    setShowAddCategoryModal(true);
  }

  const handleCreateCategory = async () => {
    if (!userId) return;
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const limit = newCategoryLimit && !isNaN(parseFloat(newCategoryLimit)) ? parseFloat(newCategoryLimit) : 0;
      
      if (isCustomCategory) {
        if (!newCategoryName) return;
        const res = await api.createCustomCategory(userId, newCategoryName, newCategoryIcon, newCategoryColor, limit);
        if (limit > 0) await api.setCategoryLimit(userId, res.id, limit, month, year);
      } else {
        if (!selectedStandardCategory) return;
        await api.setCategoryLimit(userId, selectedStandardCategory, limit, month, year);
      }
      
      WebApp.HapticFeedback.notificationOccurred('success');
      setShowAddCategoryModal(false);
      loadData(userId, currentDate);
    } catch (e) {
      console.error(e);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    openConfirm('Вы уверены, что хотите удалить лимит/категорию? Действие необратимо.', async () => {
      if (!userId) return;
      WebApp.HapticFeedback.impactOccurred('medium');
      try {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const isCustom = customCategories.some(cat => cat.id === categoryId);
        if (isCustom) {
            await api.deleteCustomCategory(userId, categoryId);
        } else {
            await api.deleteCategoryLimit(userId, categoryId, month, year);
        }
        WebApp.HapticFeedback.notificationOccurred('success');
        await loadData(userId, currentDate);
      } catch (e) { console.error(e); WebApp.HapticFeedback.notificationOccurred('error'); }
    });
  }

  const getNekoMood = (): 'happy' | 'neutral' | 'sad' | 'worried' | 'error' | 'dead' => {
    if (isError) return 'error';
    if (isHappy) return 'happy';
    if (budgetLimit > 0) {
      const percent = totalSpent / budgetLimit;
      if (percent >= 1.0) return 'dead';
      if (percent > 0.85) return 'sad';
      if (percent > 0.5) return 'worried';
    }
    return 'neutral';
  }

  const handleDeleteTransaction = async (id: number) => { if (!userId) return; WebApp.HapticFeedback.impactOccurred('medium'); try { await api.deleteTransaction(userId, id); loadData(userId, currentDate); } catch { triggerError(); } }
  const triggerError = () => { WebApp.HapticFeedback.notificationOccurred('error'); setIsError(true); setTimeout(() => setIsError(false), 500); }

  const handleEditTransaction = (transaction: any) => {
    WebApp.HapticFeedback.impactOccurred('light');
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditCategory(transaction.category);
    setEditDate(new Date(transaction.date));
    setShowEditModal(true);
  }

  const handleSaveEdit = async () => {
    if (!userId || !editingTransaction) return;
    const value = parseFloat(editAmount);
    if (!editAmount || isNaN(value) || value <= 0) {
      triggerError();
      return;
    }
    try {
      await api.updateTransaction(
        userId,
        editingTransaction.id,
        value,
        editCategory,
        editDate.toISOString(),
        editingTransaction.type
      );
      WebApp.HapticFeedback.notificationOccurred('success');
      setShowEditModal(false);
      setEditingTransaction(null);
      setEditAmount('');
      loadData(userId, currentDate);
    } catch (e) {
      console.error(e);
      triggerError();
    }
  }

  const filterTransactions = (transactionsList: any[]) => {
    let filtered = [...transactionsList];
    if (filters.searchAmount) {
      const searchValue = parseFloat(filters.searchAmount);
      if (!isNaN(searchValue)) {
        filtered = filtered.filter(t => Math.abs(t.amount - searchValue) < 0.01);
      }
    }
    if (filters.selectedCategory) {
      filtered = filtered.filter(t => t.category === filters.selectedCategory);
    }
    if (filters.period !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(t => {
        const transDate = new Date(t.date);
        const transDay = new Date(transDate.getFullYear(), transDate.getMonth(), transDate.getDate());
        if (filters.period === 'day') return transDay.getTime() === today.getTime();
        else if (filters.period === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return transDay >= weekAgo;
        } else if (filters.period === 'month') {
          return transDate.getMonth() === now.getMonth() && transDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }
    return filtered;
  }

  const openConfirm = (message: string, action: () => Promise<void>) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
    WebApp.HapticFeedback.impactOccurred('medium');
  }

  const handleConfirmModalCancel = () => {
    setConfirmOpen(false);
    setConfirmAction(null);
  }

  const handleConfirmModalConfirm = async () => {
    if (confirmAction) {
      try {
        await confirmAction();
      } catch (e) {
        console.error('Confirm action failed', e);
      }
    }
    setConfirmOpen(false);
    setConfirmAction(null);
  }

  const filteredTransactions = filterTransactions(transactions);
  const selectedCatData = getSelectedCategoryData();
  const selectedAccData = getSelectedAccountData();
  const hasActiveFilters = filters.searchAmount !== '' || filters.selectedCategory !== '' || filters.period !== 'all';

  return (
    <div className="app-container">
      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="modal-overlay" onClick={() => setShowDatePicker(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>📅 Выберите дату</h3>
            <input
              type="date"
              value={transactionDate.toISOString().split('T')[0]}
              onChange={(e) => setTransactionDate(new Date(e.target.value + 'T12:00:00'))}
              max={new Date().toISOString().split('T')[0]}
              className="modal-input"
            />
            <button className="modal-btn" onClick={() => setShowDatePicker(false)}>Готово</button>
          </motion.div>
        </div>
      )}
      
      <ModalInput isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleModalSave} title={editTarget?.type === 'total' ? 'Общий бюджет' : 'Лимит категории'} initialValue={editTarget?.type === 'total' ? budgetLimit : (editTarget?.id ? catLimits[editTarget.id] || 0 : 0)} />

      {/* HEADER SECTION */}
      <div className="header-section">
        {/* Top Bar: Month & Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, width: '100%', padding: '0 15px' }}>
          <MonthSelector currentDate={currentDate} onChange={handleDateChange} />
          <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-main)', opacity: 0.8 }}>PURRFINANCE</div>
        </div>

        {/* Info Block */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 15, marginBottom: 15, width: '100%', padding: '0 15px' }}>
          <motion.div
            animate={isError ? { rotate: [0, -20, 20, 0] } : isHappy ? { scale: 1.1, y: [0, -10, 0] } : { scale: 1, y: 0 }}
            style={{ flexShrink: 0 }}
          >
            <NekoAvatar mood={getNekoMood()} theme={theme} />
          </motion.div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <BudgetStatus total={totalSpent} limit={budgetLimit} />

            {/* Contextual Info */}
            {activeTab === 'input' ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                   <div style={{ fontSize: 12, opacity: 0.7 }}>Доступно: {displayBalance.toLocaleString()} ₽</div>
                   <div className="amount-display-large">
                       {amount || '0'} <span className="currency">₽</span>
                   </div>
               </div>
            ) : (
               <div style={{fontSize: 22, fontWeight: 'bold'}}>
                   {activeTab === 'stats' ? 'Статистика' : activeTab === 'accounts' ? 'Счета' : activeTab === 'budget' ? 'Бюджет' : activeTab === 'analytics' ? 'Аналитика' : 'Настройки'}
               </div>
            )}
          </div>
        </div>
      </div>

      <div className={`content-area ${activeTab !== 'input' ? 'stats-mode' : ''}`}>
        
        {/* INPUT TAB REDESIGN */}
        {activeTab === 'input' && (
          <div className="input-tab-layout">

            {/* Top Controls: Type Switcher */}
            <div className="transaction-type-selector">
                <button onClick={() => toggleTransType('expense')} className={`type-button ${transType === 'expense' ? 'type-button-expense-active' : ''}`}>
                  <ArrowDownCircle size={18} /> Расход
                </button>
                <button onClick={() => toggleTransType('income')} className={`type-button ${transType === 'income' ? 'type-button-income-active' : ''}`}>
                  <ArrowUpCircle size={18} /> Доход
                </button>
            </div>

            {/* Context Selectors (Date, Category, Account) */}
            <div className="context-row">
                <button className="context-btn" onClick={() => setShowDatePicker(true)}>
                    <span>📅 {transactionDate.getDate()}/{transactionDate.getMonth() + 1}</span>
                </button>

                <button
                    className="context-btn"
                    onClick={() => setIsCategorySelectorOpen(true)}
                    style={{ border: `1px solid ${selectedCatData.color}` }}
                >
                    <div style={{ color: selectedCatData.color }}>{selectedCatData.icon}</div>
                    <span>{selectedCatData.name}</span>
                </button>

                <button
                    className="context-btn"
                    onClick={() => setIsAccountSelectorOpen(true)}
                    style={{ border: selectedAccData ? `1px solid ${selectedAccData.color || '#ccc'}` : '1px dashed #ccc' }}
                >
                    {selectedAccData ? (
                        <>
                            <span>{selectedAccData.type === 'card' ? '💳' : selectedAccData.icon || '💰'}</span>
                            <span>{selectedAccData.name}</span>
                        </>
                    ) : (
                        <span>Выберите счет</span>
                    )}
                </button>
            </div>

            {/* Detail Inputs (Note, Tags, Photo) */}
            <DetailInputs
                note={note} setNote={setNote}
                tags={tags} setTags={setTags}
                photo={photo} setPhoto={setPhoto}
            />

            {/* Calculator Numpad */}
            <div className="numpad-wrapper">
                <CalculatorNumpad
                    amount={amount}
                    setAmount={setAmount}
                    onConfirm={handleConfirm}
                />
            </div>

          </div>
        )}

        {/* OTHER TABS (Minimally touched) */}
        {activeTab === 'stats' && (
          <div className="scroll-content">
            <StatsView 
              data={statsData} 
              total={totalSpent} 
              transactions={transactions}
              budgetLimit={budgetLimit}
              customCategories={customCategories}
              periodType={periodType}
              periodStartDay={periodStartDay}
              currentMonth={currentDate}
            />
            <TransactionList 
              transactions={filteredTransactions} 
              onDelete={(id) => openConfirm('Удалить?', () => handleDeleteTransaction(id))}
              onEdit={handleEditTransaction}
              onFilterClick={() => setShowSearchPanel(true)}
              hasActiveFilters={hasActiveFilters}
              customCategories={customCategories}
            />
            <div style={{ height: 80 }} /> 
          </div>
        )}

        {activeTab === 'accounts' && (
          <AccountsView userId={userId} accounts={accounts} goals={goals} onRefresh={() => userId && loadData(userId, currentDate)} />
        )}

        {activeTab === 'budget' && (
          <div className="scroll-content">
            <BudgetView 
              stats={statsData} limits={catLimits} totalLimit={budgetLimit} customCategories={customCategories}
              onEditCategory={openEditCategory} onEditTotal={openEditTotal}
              onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory}
            />
            <div style={{ height: 80 }} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView transactions={allTransactions} currentMonth={currentDate} customCategories={customCategories} />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            periodType={periodType} periodStartDay={periodStartDay} onSave={handleSaveBudgetPeriodSettings}
            userId={userId} accounts={accounts} onRefresh={() => userId && loadData(userId, currentDate)}
            lastSyncTime={lastSyncTime} isSyncing={isSyncing} theme={theme} toggleTheme={toggleTheme}
          />
        )}
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="bottom-tab-bar">
        <button className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`} onClick={() => { setActiveTab('input'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Plus size={24} /></div><span>Ввод</span></button>
        <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><LayoutGrid size={24} /></div><span>Инфо</span></button>
        <button className={`tab-btn ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => { setActiveTab('budget'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Target size={24} /></div><span>Бюджет</span></button>
        <button className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => { setActiveTab('accounts'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Wallet size={24} /></div><span>Счета</span></button>
        <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveTab('analytics'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><TrendingUp size={24} /></div><span>Анализ</span></button>
        <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Settings size={22} /></div><span>Настройки</span></button>
      </div>

      {/* MODALS FOR SELECTORS */}
      {/* Category Selector Modal */}
      <Modal isOpen={isCategorySelectorOpen} onClose={() => setIsCategorySelectorOpen(false)} title="Выберите категорию">
        <div className="selector-grid">
            {currentCategories.map(cat => (
                <button key={cat.id} className="selector-item" onClick={() => { setSelectedCategory(cat.id); setIsCategorySelectorOpen(false); }}>
                    <div className="selector-icon" style={{ backgroundColor: cat.color }}>{cat.icon}</div>
                    <span>{cat.name}</span>
                </button>
            ))}
            {transType === 'expense' && customCategories.map(cat => (
                 <button key={cat.id} className="selector-item" onClick={() => { setSelectedCategory(cat.id); setIsCategorySelectorOpen(false); }}>
                    <div className="selector-icon" style={{ backgroundColor: cat.color }}>{getIconByName(cat.icon)}</div>
                    <span>{cat.name}</span>
                </button>
            ))}
        </div>
      </Modal>

      {/* Account Selector Modal */}
      <Modal isOpen={isAccountSelectorOpen} onClose={() => setIsAccountSelectorOpen(false)} title="Выберите счет">
        <div className="selector-list">
            {accounts.map(acc => (
                <button key={acc.id} className="selector-row" onClick={() => { setSelectedAccount({type: 'account', id: acc.id}); setIsAccountSelectorOpen(false); }}>
                    <div className="selector-row-icon" style={{ backgroundColor: acc.color }}>💳</div>
                    <div className="selector-row-info">
                        <div className="name">{acc.name}</div>
                        <div className="balance">{acc.balance} {acc.currency}</div>
                    </div>
                    {selectedAccount?.type === 'account' && selectedAccount.id === acc.id && <div className="check">✓</div>}
                </button>
            ))}
            {goals.map(goal => (
                 <button key={goal.id} className="selector-row" onClick={() => { setSelectedAccount({type: 'goal', id: goal.id}); setIsAccountSelectorOpen(false); }}>
                    <div className="selector-row-icon" style={{ backgroundColor: goal.color }}>🐷</div>
                    <div className="selector-row-info">
                        <div className="name">{goal.name}</div>
                        <div className="balance">{goal.current_amount} / {goal.target_amount}</div>
                    </div>
                    {selectedAccount?.type === 'goal' && selectedAccount.id === goal.id && <div className="check">✓</div>}
                </button>
            ))}
        </div>
      </Modal>

      {/* CREATE CATEGORY MODAL */}
      <Modal isOpen={showAddCategoryModal} onClose={() => setShowAddCategoryModal(false)} title="Новый лимит">
        <div className="modal-body">
          <div style={{ marginBottom: 15 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsCustomCategory(false)} style={{ flex: 1, padding: '10px', background: !isCustomCategory ? '#667eea' : 'var(--bg-input)', color: !isCustomCategory ? 'white' : 'var(--text-main)', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>Стандартные</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsCustomCategory(true)} style={{ flex: 1, padding: '10px', background: isCustomCategory ? '#667eea' : 'var(--bg-input)', color: isCustomCategory ? 'white' : 'var(--text-main)', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>Свои</motion.button>
            </div>
          </div>
          {!isCustomCategory ? (
            <div style={{ marginBottom: 15 }}>
              <label className="modal-label">Выберите категорию</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {EXPENSE_CATEGORIES.filter(cat => !catLimits[cat.id] || catLimits[cat.id] === 0).map((cat) => (
                  <motion.button key={cat.id} whileTap={{ scale: 0.9 }} onClick={() => setSelectedStandardCategory(cat.id)} style={{ background: selectedStandardCategory === cat.id ? cat.color : 'var(--bg-input)', border: selectedStandardCategory === cat.id ? '2px solid #667eea' : '2px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div>{cat.icon}</div><span style={{ fontSize: 13 }}>{cat.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <input type="text" placeholder="Название лимита" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="modal-input" />
              <div style={{marginTop: 10, marginBottom: 10}}><IconPicker selectedIcon={newCategoryIcon} onSelectIcon={setNewCategoryIcon} /></div>
              <div style={{marginBottom: 10}}><ColorPicker selectedColor={newCategoryColor} onSelectColor={setNewCategoryColor} /></div>
            </>
          )}
          <input type="number" placeholder="Лимит (опционально)" value={newCategoryLimit} onChange={(e) => setNewCategoryLimit(e.target.value)} className="modal-input" />
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleCreateCategory} className="modal-submit-button">{isCustomCategory ? 'Создать лимит' : 'Добавить лимит'}</motion.button>
        </div>
      </Modal>

      {/* EDIT TRANSACTION MODAL */}
      <Modal title="Редактировать" isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
        <div style={{ padding: '0 4px' }}>
          <div style={{ marginBottom: 20 }}>
            <label className="modal-label">Сумма</label>
            <input type="text" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="modal-input" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="modal-label">Категория</label>
            <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="modal-select">
              {(editingTransaction?.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              {customCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="modal-label">Дата</label>
            <input type="date" value={editDate.toISOString().split('T')[0]} onChange={(e) => setEditDate(new Date(e.target.value + 'T12:00:00'))} max={new Date().toISOString().split('T')[0]} className="modal-input" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveEdit} className="modal-submit-button">Сохранить</motion.button>
        </div>
      </Modal>

      <TransactionSearch isOpen={showSearchPanel} onClose={() => setShowSearchPanel(false)} onApplyFilters={setFilters} categories={[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...customCategories].map(c => ({ id: c.id, name: c.name }))} />
      <ConfirmModal isOpen={confirmOpen} message={confirmMessage} onCancel={handleConfirmModalCancel} onConfirm={handleConfirmModalConfirm} />
    </div>
  )
}

export default App
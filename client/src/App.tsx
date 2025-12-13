import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WebApp from '@twa-dev/sdk'
import { 
  LayoutGrid, Plus, Target, ArrowUpCircle, ArrowDownCircle, Wallet,
  Coffee, Car, Gamepad2, Zap, Home, Bus,
  Shirt, PiggyBank, ShoppingBasket,
  Smartphone, Plane, Utensils, Film, Pill, GraduationCap, Package, TrendingUp, Settings
} from 'lucide-react'
import './App.css'

import { NumPad } from './components/NumPad'
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

  // Текущая дата для фильтрации
  const [currentDate, setCurrentDate] = useState(new Date())
  // Дата для транзакции (по умолчанию сегодня)
  const [transactionDate, setTransactionDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [totalSpent, setTotalSpent] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)
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

  // Состояния для синхронизации
  const [lastSyncTime, setLastSyncTime] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState(false)

  // Состояния для настроек бюджетного периода
  const [periodType, setPeriodType] = useState<'calendar_month' | 'custom_period'>('calendar_month')
  const [periodStartDay, setPeriodStartDay] = useState<number>(1)

  // Правильная логика отображения "Доступно"
  const displayBalance = budgetLimit > 0 ? budgetLimit - totalSpent : currentBalance;

  useEffect(() => {
    // В разработке (localhost/127.0.0.1) пропускаем проверку Telegram
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isDevelopment && !WebApp.initDataUnsafe.user && !WebApp.initDataUnsafe.query_id) {
      // В продакшене: если нет данных Telegram, показываем заглушку
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
          <p style="font-size: 14px; margin-top: 20px; opacity: 0.6;">Откройте через Telegram Mini App</p>
        </div>
      `;
      return;
    }

    // В Telegram вызываем API
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
      setTotalIncome(balData.total_income || 0);
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

      // Автоматическая синхронизация с облаком после загрузки данных
      syncToCloud(hist, accs, gls, bud, customCats, lims);
    } catch (e) { console.error(e) }
  }

  // Синхронизация с облаком
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

  // Загрузка последнего времени синхронизации
  useEffect(() => {
    if (cloudStorage.isAvailable()) {
      cloudStorage.getLastSyncTime().then(time => setLastSyncTime(time));
    }
  }, []);

  // Загрузка настроек бюджетного периода
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

  // Сохранение настроек бюджетного периода
  const handleSaveBudgetPeriodSettings = async (
    newPeriodType: 'calendar_month' | 'custom_period',
    newStartDay: number
  ) => {
    if (!userId) return;
    
    try {
      await api.setBudgetPeriodSettings(userId, newPeriodType, newStartDay);
      setPeriodType(newPeriodType);
      setPeriodStartDay(newStartDay);
      
      // Перезагружаем данные с новыми настройками периода
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
      // Загружаем все транзакции без фильтра по месяцу
      const allTrans = await api.fetchTransactions(uid);
      setAllTransactions(allTrans);
    } catch (e) { 
      console.error('Error loading all transactions:', e); 
    }
  }

  useEffect(() => {
    // Загружаем все транзакции при переходе на таб аналитики
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
      console.log('📤 Sending transaction:', { userId, value, selectedCategory, transType, targetId, targetType, date: transactionDate.toISOString(), accountsCount: accounts.length, goalsCount: goals.length });
      api.logToServer('📤 BEFORE API.addTransaction', { userId, value, selectedCategory, transType, targetId, targetType, date: transactionDate.toISOString(), accountsCount: accounts.length, goalsCount: goals.length });
      const result = await api.addTransaction(userId, value, selectedCategory, transType, targetId, targetType, transactionDate.toISOString());
      console.log('✅ Transaction result:', result);
      WebApp.HapticFeedback.notificationOccurred('success');
      setIsHappy(true); setAmount(''); 
      loadData(userId, currentDate);
      // Обновляем все транзакции для аналитики
      if (allTransactions.length > 0) {
        loadAllTransactions(userId);
      }
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
      // Если поле пустое или не число, устанавливаем 0
      const limit = newCategoryLimit && !isNaN(parseFloat(newCategoryLimit)) ? parseFloat(newCategoryLimit) : 0;
      
      if (isCustomCategory) {
        // Создаём кастомную категорию
        if (!newCategoryName) return;
        await api.createCustomCategory(userId, newCategoryName, newCategoryIcon, newCategoryColor, limit);
      } else {
        // Добавляем лимит к стандартной категории
        if (!selectedStandardCategory) return;
        // Устанавливаем лимит (даже если 0)
        await api.setCategoryLimit(userId, selectedStandardCategory, limit);
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
    if (!userId) return;
    WebApp.HapticFeedback.impactOccurred('medium');
    try {
      // Проверяем, это кастомная категория или стандартная
      const isCustom = customCategories.some(cat => cat.id === categoryId);
      
      if (isCustom) {
        // Удаляем кастомную категорию полностью
        await api.deleteCustomCategory(userId, categoryId);
      }
      
      // Для всех категорий удаляем лимит
      await api.deleteCategoryLimit(userId, categoryId);
      
      WebApp.HapticFeedback.notificationOccurred('success');
      loadData(userId, currentDate);
    } catch (e) {
      console.error(e);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
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
  const handleNumberClick = (num: string) => { WebApp.HapticFeedback.impactOccurred('light'); if (amount.length >= 9) return; if (num === '.' && amount.includes('.')) return; setAmount(prev => prev + num); setIsError(false); }
  const handleDelete = () => { WebApp.HapticFeedback.impactOccurred('medium'); setAmount(prev => prev.slice(0, -1)); setIsError(false); }
  const triggerError = () => { WebApp.HapticFeedback.notificationOccurred('error'); setIsError(true); setTimeout(() => setIsError(false), 500); }

  // Функция открытия редактирования
  const handleEditTransaction = (transaction: any) => {
    WebApp.HapticFeedback.impactOccurred('light');
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditCategory(transaction.category);
    setEditDate(new Date(transaction.date));
    setShowEditModal(true);
  }

  // Функция сохранения изменений
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

  // Функция фильтрации транзакций
  const filterTransactions = (transactionsList: any[]) => {
    let filtered = [...transactionsList];

    // Фильтр по сумме
    if (filters.searchAmount) {
      const searchValue = parseFloat(filters.searchAmount);
      if (!isNaN(searchValue)) {
        filtered = filtered.filter(t => Math.abs(t.amount - searchValue) < 0.01);
      }
    }

    // Фильтр по категории
    if (filters.selectedCategory) {
      filtered = filtered.filter(t => t.category === filters.selectedCategory);
    }

    // Фильтр по периоду
    if (filters.period !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(t => {
        const transDate = new Date(t.date);
        const transDay = new Date(transDate.getFullYear(), transDate.getMonth(), transDate.getDate());
        
        if (filters.period === 'day') {
          return transDay.getTime() === today.getTime();
        } else if (filters.period === 'week') {
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

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
  }

  const hasActiveFilters = filters.searchAmount !== '' || filters.selectedCategory !== '' || filters.period !== 'all';

  // Отфильтрованные транзакции для отображения
  const filteredTransactions = filterTransactions(transactions);

  return (
    <div className="app-container">
      {/* Модальное окно выбора даты */}
      {showDatePicker && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--modal-overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowDatePicker(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              borderRadius: 24,
              padding: 30,
              maxWidth: 320,
              width: '100%',
              margin: '0 auto',
              boxShadow: '0 20px 60px var(--shadow-color)',
              border: '2px solid var(--border-color)',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
          >
            <div style={{ 
              fontSize: 20, 
              fontWeight: 'bold', 
              background: 'linear-gradient(135deg, var(--primary) 0%, #D291BC 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 20, 
              textAlign: 'center' 
            }}>
              📅 Выберите дату
            </div>
            <div style={{ 
              marginBottom: 20
            }}>
              <input
                type="date"
                value={transactionDate.toISOString().split('T')[0]}
                onChange={(e) => setTransactionDate(new Date(e.target.value + 'T12:00:00'))}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '16px 12px',
                  fontSize: 16,
                  borderRadius: 16,
                  border: '2px solid var(--border-color)',
                  fontFamily: 'inherit',
                  color: 'var(--text-main)',
                  fontWeight: '600',
                  background: 'var(--bg-input)',
                  boxShadow: '0 4px 12px var(--shadow-color)',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  display: 'block'
                }}
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { WebApp.HapticFeedback.notificationOccurred('success'); setShowDatePicker(false); }}
              style={{
                width: '100%',
                padding: 14,
                background: 'linear-gradient(135deg, var(--primary) 0%, #D291BC 100%)',
                border: 'none',
                borderRadius: 14,
                color: '#fff',
                fontSize: 16,
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px var(--shadow-color)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              ✓ Готово
            </motion.button>
          </motion.div>
        </div>
      )}
      
      <ModalInput isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleModalSave} title={editTarget?.type === 'total' ? 'Общий бюджет' : 'Лимит категории'} initialValue={editTarget?.type === 'total' ? budgetLimit : (editTarget?.id ? catLimits[editTarget.id] || 0 : 0)} />

      <div className="header-section">
        {/* Верхняя строка: Месяц слева, лого справа */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 15,
          width: '100%',
          paddingLeft: 15,
          paddingRight: 15,
          boxSizing: 'border-box'
        }}>
          <div style={{ marginLeft: 0 }}>
            <MonthSelector currentDate={currentDate} onChange={handleDateChange} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-main)', opacity: 0.8, marginRight: 0 }}>
            PURRFINANCE
          </div>
        </div>

        {/* Новый блок: Котик слева, справа бюджет/сумма/доступно */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: 15, 
          marginBottom: 15,
          width: '100%',
          paddingLeft: 15,
          paddingRight: 15,
          boxSizing: 'border-box'
        }}>
          {/* Котик слева */}
          <motion.div 
            animate={isError ? { rotate: [0, -20, 20, 0] } : isHappy ? { scale: 1.1, y: [0, -10, 0] } : { scale: 1, y: 0 }}
            style={{ flexShrink: 0 }}
          >
            <NekoAvatar mood={getNekoMood()} />
          </motion.div>

          {/* Правая колонка: бюджет, доступно/лимит, сумма */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
            {/* БАР БЮДЖЕТА */}
            <div style={{ width: '100%' }}>
              <BudgetStatus total={totalSpent} limit={budgetLimit} />
            </div>

            {/* ДОСТУПНО И ЛИМИТ */}
            {activeTab === 'input' && (
              <div style={{ 
                display: 'flex',
                gap: 15,
                fontSize: 12, 
                fontWeight: 'normal', 
                color: 'var(--text-main)',
                opacity: 0.7
              }}>
                <div>Доступно: {displayBalance.toLocaleString()} ₽</div>
                <div>Лимит: {budgetLimit > 0 ? `${budgetLimit.toLocaleString()} ₽` : '∞'}</div>
              </div>
            )}

            {/* СУММА ИЛИ ЗАГОЛОВОК */}
            {activeTab === 'input' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: 0 }}>
                <motion.div className="amount-display" style={{ margin: 0 }}>
                  <span style={{color: transType === 'income' ? 'var(--accent-success)' : 'var(--text-main)'}}>{amount || '0'}</span>
                  <span className="currency">₽</span>
                </motion.div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { WebApp.HapticFeedback.impactOccurred('light'); setShowDatePicker(true); }}
                  style={{
                    background: 'linear-gradient(135deg, var(--primary) 0%, #D291BC 100%)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '4px 10px',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    height: 24,
                    flexShrink: 0
                  }}
                >
                  📅 {transactionDate.getDate()}/{transactionDate.getMonth() + 1}
                </motion.button>
              </div>
            ) : (
              <div style={{fontSize: 22, color: 'var(--text-main)', fontWeight: 'bold'}}>
                {activeTab === 'stats' ? 'Статистика' : activeTab === 'accounts' ? 'Счета и Копилки' : 'Бюджет'}
              </div>
            )}
          </div>
        </div>

        {/* Нижняя строка: блоки расход и доход */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          gap: 10
        }}>
          <div style={{ 
            flex: 1,
            backgroundColor: 'var(--bg-card)',
            borderRadius: 12,
            padding: '5px 35px',
            textAlign: 'center',
            boxShadow: '0 2px 8px var(--shadow-color)'
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7, marginBottom: 3 }}>
              РАСХОД
            </div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text-main)' }}>
              {totalSpent.toLocaleString()}
            </div>
          </div>

          <div style={{ 
            flex: 1,
            backgroundColor: 'var(--bg-card)',
            borderRadius: 12,
            padding: '5px 35px',
            textAlign: 'center',
            boxShadow: '0 2px 8px var(--shadow-color)'
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7, marginBottom: 3 }}>
              ДОХОД
            </div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text-main)' }}>
              {totalIncome.toLocaleString()}
            </div>
          </div>
        </div>
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
                          WebApp.HapticFeedback.impactOccurred('light');
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
                          WebApp.HapticFeedback.impactOccurred('light');
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
                  {/* Для расходов - фильтруем по лимитам, для доходов - показываем все */}
                  {transType === 'expense' 
                    ? currentCategories.filter(cat => catLimits[cat.id] !== undefined && catLimits[cat.id] >= 0).map((cat) => (
                        <motion.button key={cat.id} whileTap={{ scale: 0.95 }} onClick={() => { setSelectedCategory(cat.id); WebApp.HapticFeedback.selectionChanged(); }} className="category-btn" style={{ background: selectedCategory === cat.id ? cat.color : 'var(--bg-input)', boxShadow: selectedCategory === cat.id ? '0 2px 8px var(--shadow-color)' : 'none' }}>
                          <div className="category-icon" style={{color: selectedCategory === cat.id ? '#FFF' : 'var(--text-main)'}}>{cat.icon}</div>
                          <span className="category-label" style={{color: selectedCategory === cat.id ? '#FFF' : 'var(--text-main)'}}>{cat.name}</span>
                        </motion.button>
                      ))
                    : currentCategories.map((cat) => (
                        <motion.button key={cat.id} whileTap={{ scale: 0.95 }} onClick={() => { setSelectedCategory(cat.id); WebApp.HapticFeedback.selectionChanged(); }} className="category-btn" style={{ background: selectedCategory === cat.id ? cat.color : 'var(--bg-input)', boxShadow: selectedCategory === cat.id ? '0 2px 8px var(--shadow-color)' : 'none' }}>
                          <div className="category-icon" style={{color: selectedCategory === cat.id ? '#FFF' : 'var(--text-main)'}}>{cat.icon}</div>
                          <span className="category-label" style={{color: selectedCategory === cat.id ? '#FFF' : 'var(--text-main)'}}>{cat.name}</span>
                        </motion.button>
                      ))
                  }
                  {/* КАСТОМНЫЕ КАТЕГОРИИ (только для расходов) */}
                  {transType === 'expense' && customCategories.filter(cat => catLimits[cat.id] !== undefined && catLimits[cat.id] >= 0).map((cat) => (
                    <motion.button 
                      key={cat.id} 
                      whileTap={{ scale: 0.95 }} 
                      onClick={() => { setSelectedCategory(cat.id); WebApp.HapticFeedback.selectionChanged(); }} 
                      className="category-btn" 
                      style={{ 
                        background: selectedCategory === cat.id ? cat.color : 'var(--bg-input)',
                        boxShadow: selectedCategory === cat.id ? '0 2px 8px var(--shadow-color)' : 'none'
                      }}
                    >
                      <div className="category-icon" style={{color: selectedCategory === cat.id ? '#FFF' : 'var(--text-main)'}}>{getIconByName(cat.icon, 20)}</div>
                      <span className="category-label" style={{color: selectedCategory === cat.id ? '#FFF' : 'var(--text-main)'}}>{cat.name}</span>
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
            <div style={{ height: 1, background: 'var(--border-color)', margin: '20px 0' }} />
            <TransactionList 
              transactions={filteredTransactions} 
              onDelete={handleDeleteTransaction}
              onEdit={handleEditTransaction}
              onFilterClick={() => setShowSearchPanel(true)}
              hasActiveFilters={hasActiveFilters}
              customCategories={customCategories}
            />
            <div style={{ height: 80 }} /> 
          </div>
        )}

        {activeTab === 'accounts' && (
          <AccountsView 
            userId={userId} 
            accounts={accounts} 
            goals={goals} 
            onRefresh={() => userId && loadData(userId, currentDate)}
          />
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

        {activeTab === 'analytics' && (
          <AnalyticsView transactions={allTransactions} currentMonth={currentDate} customCategories={customCategories} />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            periodType={periodType}
            periodStartDay={periodStartDay}
            onSave={handleSaveBudgetPeriodSettings}
            userId={userId}
            accounts={accounts}
            onRefresh={() => userId && loadData(userId, currentDate)}
            lastSyncTime={lastSyncTime}
            isSyncing={isSyncing}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}
      </div>

      <div className="bottom-tab-bar">
        <button className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`} onClick={() => { setActiveTab('input'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Plus size={24} /></div><span>Ввод</span></button>
        <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><LayoutGrid size={24} /></div><span>Инфо</span></button>
        <button className={`tab-btn ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => { setActiveTab('budget'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Target size={24} /></div><span>Бюджет</span></button>
        <button className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => { setActiveTab('accounts'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Wallet size={24} /></div><span>Счета</span></button>
        <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveTab('analytics'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><TrendingUp size={24} /></div><span>Анализ</span></button>
        <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Settings size={22} /></div><span>Настройки</span></button>
      </div>

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ЛИМИТА */}
      <Modal isOpen={showAddCategoryModal} onClose={() => setShowAddCategoryModal(false)} title="Новый лимит">
        <div className="modal-body">
          {/* Переключатель типа категории */}
          <div style={{ marginBottom: 15 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCustomCategory(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: !isCustomCategory ? '#667eea' : 'var(--bg-input)',
                  color: !isCustomCategory ? 'white' : 'var(--text-main)',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Стандартные
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCustomCategory(true)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: isCustomCategory ? '#667eea' : 'var(--bg-input)',
                  color: isCustomCategory ? 'white' : 'var(--text-main)',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Свои
              </motion.button>
            </div>
          </div>

          {!isCustomCategory ? (
            // СТАНДАРТНЫЕ КАТЕГОРИИ
            <div style={{ marginBottom: 15 }}>
              <label className="modal-label">Выберите категорию</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {EXPENSE_CATEGORIES.filter(cat => !catLimits[cat.id] || catLimits[cat.id] === 0).map((cat) => (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedStandardCategory(cat.id)}
                    style={{
                      background: selectedStandardCategory === cat.id ? cat.color : 'var(--bg-input)',
                      border: selectedStandardCategory === cat.id ? '2px solid #667eea' : '2px solid var(--border-color)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      color: selectedStandardCategory === cat.id ? 'white' : 'var(--text-main)',
                      fontWeight: selectedStandardCategory === cat.id ? 'bold' : 'normal'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>{cat.icon}</div>
                    <span style={{ fontSize: 13 }}>{cat.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            // КАСТОМНАЯ КАТЕГОРИЯ
            <>
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
                  {[
                    { icon: 'Package', component: <Package size={20} /> },
                    { icon: 'Gamepad2', component: <Gamepad2 size={20} /> },
                    { icon: 'Home', component: <Home size={20} /> },
                    { icon: 'Car', component: <Car size={20} /> },
                    { icon: 'Plane', component: <Plane size={20} /> },
                    { icon: 'Utensils', component: <Utensils size={20} /> },
                    { icon: 'Coffee', component: <Coffee size={20} /> },
                    { icon: 'Film', component: <Film size={20} /> },
                    { icon: 'Smartphone', component: <Smartphone size={20} /> },
                    { icon: 'Pill', component: <Pill size={20} /> },
                    { icon: 'Shirt', component: <Shirt size={20} /> },
                    { icon: 'GraduationCap', component: <GraduationCap size={20} /> },
                    { icon: 'ShoppingBasket', component: <ShoppingBasket size={20} /> },
                    { icon: 'Bus', component: <Bus size={20} /> },
                    { icon: 'Zap', component: <Zap size={20} /> },
                    { icon: 'PiggyBank', component: <PiggyBank size={20} /> },
                  ].map((item) => (
                    <motion.button
                      key={item.icon}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setNewCategoryIcon(item.icon)}
                      style={{
                        background: newCategoryIcon === item.icon ? '#667eea' : 'var(--bg-input)',
                        border: 'none',
                        borderRadius: 8,
                        width: 48,
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: newCategoryIcon === item.icon ? 'white' : 'var(--text-main)'
                      }}
                    >
                      {item.component}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 15, overflow: 'hidden' }}>
                <label className="modal-label">Цвет</label>
                <div className="color-picker" style={{ paddingBottom: 10 }}>
                  {['#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#FFA07A'].map((col) => (
                    <motion.button
                      key={col}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setNewCategoryColor(col)}
                      className="color-option"
                      style={{
                        background: col,
                        border: newCategoryColor === col ? '3px solid #667eea' : '2px solid var(--border-color)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

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
            {isCustomCategory ? 'Создать лимит' : 'Добавить лимит'}
          </motion.button>
        </div>
      </Modal>

      {/* Модальное окно редактирования транзакции */}
      <Modal title="" isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
        <div style={{ padding: '0 4px' }}>
          <h2 style={{
            textAlign: 'center',
            marginBottom: 20,
            background: 'linear-gradient(135deg, var(--primary) 0%, #FEC8D8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: 22
          }}>
            ✏️ Редактировать транзакцию
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label className="modal-label">Сумма</label>
            <input
              type="text"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="0"
              className="modal-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="modal-label">Категория</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="modal-select"
            >
              {editingTransaction?.type === 'expense' 
                ? EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                : INCOME_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
              }
              {customCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="modal-label">Дата</label>
            <input
              type="date"
              value={editDate.toISOString().split('T')[0]}
              onChange={(e) => setEditDate(new Date(e.target.value + 'T12:00:00'))}
              max={new Date().toISOString().split('T')[0]}
              className="modal-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveEdit}
            className="modal-submit-button"
          >
            💾 Сохранить изменения
          </motion.button>
        </div>
      </Modal>

      {/* Панель поиска и фильтров */}
      <TransactionSearch 
        isOpen={showSearchPanel}
        onClose={() => setShowSearchPanel(false)}
        onApplyFilters={handleApplyFilters}
        categories={[
          ...EXPENSE_CATEGORIES.map(c => c.name),
          ...INCOME_CATEGORIES.map(c => c.name),
          ...customCategories.map(c => c.name)
        ]}
      />
    </div>
  )
}

export default App
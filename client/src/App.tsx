import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WebApp from '@twa-dev/sdk'
import { 
  LayoutGrid, Plus, Target, ArrowUpCircle, ArrowDownCircle, Wallet,
  TrendingUp, Settings
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
import { ConfirmModal } from './components/ConfirmModal'
import { ColorPicker } from './components/ColorPicker'
import { IconPicker } from './components/IconPicker'
import { TransactionExtras } from './components/Transactions/TransactionExtras'
import { TransactionDetailModal } from './components/TransactionDetailModal'
import type { FilterState } from './components/TransactionSearch'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getIconByName } from './data/constants'
import * as api from './api/nekoApi'
import { cloudStorage } from './utils/cloudStorage'
import { evaluateExpression, formatCurrency } from './utils/calculator'
import { getBudgetPeriod } from './utils/budgetPeriod'

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'stats' | 'accounts' | 'budget' | 'analytics' | 'settings'>('input')
  const [transType, setTransType] = useState<'expense' | 'income'>('expense')
  const [selectedCategory, setSelectedCategory] = useState('groceries')
  const [selectedAccount, setSelectedAccount] = useState<{type: 'account' | 'goal', id: number} | null>(null)
  const [amount, setAmount] = useState('')
  
  // New State for Transaction Extras
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  // Pending files selected by user but not yet uploaded
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]) // For autocomplete

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('app-theme') as 'light' | 'dark' || 'light';
  });
  const [isMiniApp, setIsMiniApp] = useState(false);
  // Detect if running inside Telegram's WebApp wrapper
  const isTelegramWebApp = typeof window !== 'undefined' && !!(window as any).Telegram && !!(window as any).Telegram.WebApp;

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

  // Sync Telegram Mini App header color with app theme using fixed bot colors
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
  const [totalIncome, setTotalIncome] = useState(0)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [budgetLimit, setBudgetLimit] = useState(0)
  const [catLimits, setCatLimits] = useState<Record<string, number>>({})
  const [statsData, setStatsData] = useState<{name: string, value: number}[]>([])
  // 'transactions' now holds the visible paginated list
  const [transactions, setTransactions] = useState<any[]>([])
  // 'allTransactions' holds the full history for stats (limit=0)
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [transactionOffset, setTransactionOffset] = useState(0)
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false)

  const [isHappy, setIsHappy] = useState(false)
  const [isError, setIsError] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{type: 'total' | 'category', id?: string} | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [customCategories, setCustomCategories] = useState<any[]>([])
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, any>>(() => {
    try {
      return JSON.parse(localStorage.getItem('category_overrides') || '{}');
    } catch (e) { return {}; }
  });
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [selectedStandardCategory, setSelectedStandardCategory] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('Package')
  const [newCategoryColor, setNewCategoryColor] = useState('#FF6B6B')
  const [newCategoryLimit, setNewCategoryLimit] = useState('')
  const [addCategoryType, setAddCategoryType] = useState<'expense' | 'income'>('expense')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)

  // Состояния для поиска и фильтров
  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    searchAmount: '',
    selectedCategory: '',
    period: 'all',
  })

  // Состояния для редактирования транзакции (removed - editing now inline in detail modal)

  // Detail Modal
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

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

  // Правильная логика отображения "Доступно"
  const displayBalance = budgetLimit > 0 ? budgetLimit - totalSpent : currentBalance;

  useEffect(() => {
    // В разработке (localhost/127.0.0.1) пропускаем проверку Telegram
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // detect if opened as Telegram Mini App
    try {
      const mini = !isDevelopment && (!!WebApp.initDataUnsafe?.user || !!WebApp.initDataUnsafe?.query_id || !!(window as any).Telegram?.WebApp?.initData);
      setIsMiniApp(Boolean(mini));
    } catch (e) { setIsMiniApp(false); }

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
          <p style="font-size: 14px; margin-top: 20px; opacity: 0.6;">Откройте через Telegram Mini App</p>
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
    loadBudgetPeriodSettings(currentUserId);
  }, [])

  // Extract all unique tags for autosuggest
  useEffect(() => {
    if (allTransactions.length > 0) {
      const tagsSet = new Set<string>();
      allTransactions.forEach(t => {
        if (t.tags) {
           try {
             const tTags = typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags;
             if (Array.isArray(tTags)) tTags.forEach((tag: string) => tagsSet.add(tag));
           } catch (e) {}
        }
      });
      setAllTags(Array.from(tagsSet));
    }
  }, [allTransactions]);

  const loadData = async (uid: number, date: Date) => {
    try {
      // Calculate effective period based on settings
      const { startDate } = getBudgetPeriod(date, periodType, periodStartDay);
      const month = startDate.getMonth() + 1;
      const year = startDate.getFullYear();

      // Parallel fetch of base data
      // For transactions:
      // 1. Fetch ALL transactions (limit=0) for Analytics & StatsView
      // 2. Fetch first page (limit=30) for TransactionList
      const [balData, stats, allHist, firstPage, bud, lims, accs, gls, customCats] = await Promise.all([
        api.fetchBalance(uid, month, year),
        api.fetchStats(uid, month, year),
        api.fetchTransactions(uid, month, year, 0), // Full history
        api.fetchTransactions(uid, month, year, 30, 0), // First 30
        api.fetchBudget(uid, month, year),
        api.fetchCategoryLimits(uid, month, year),
        api.fetchAccounts(uid),
        api.fetchGoals(uid),
        api.fetchCustomCategories(uid)
      ]);
      
      setTotalSpent(balData.total_expense);
      setTotalIncome(balData.total_income || 0);
      setCurrentBalance(balData.balance);
      setStatsData(stats);
      
      setAllTransactions(allHist);
      setTransactions(firstPage);
      setTransactionOffset(30);
      setHasMoreTransactions(firstPage.length === 30); // Simple heuristic

      setBudgetLimit(bud);
      setCatLimits(lims);
      setAccounts(accs);
      setGoals(gls);
      setCustomCategories(customCats);
      // Load overrides from server and merge with any local overrides
      try {
        const serverOverrides = await api.fetchCategoryOverrides(uid).catch(() => ({}));
        let localOverrides: Record<string, any> = {};
        try { localOverrides = JSON.parse(localStorage.getItem('category_overrides') || '{}'); } catch (e) { localOverrides = {}; }

        // If localOverrides has entries not present on server, push them to server
        for (const key of Object.keys(localOverrides)) {
          const localVal = localOverrides[key];
          const serverVal = serverOverrides[key];
          if (serverVal === undefined) {
            api.setCategoryOverride(uid, key, localVal).catch((e) => console.error('Failed to push local override', e));
          }
        }

        // Prefer server overrides when merging
        const merged = { ...(localOverrides || {}), ...(serverOverrides || {}) };
        setCategoryOverrides(merged);
        try { localStorage.setItem('category_overrides', JSON.stringify(merged)); } catch (e) {}
      } catch (e) { console.error('Failed to load category overrides', e); }
      
      if (!selectedAccount && accs.length > 0) {
        setSelectedAccount({type: 'account', id: accs[0].id});
      }
      syncToCloud(allHist, accs, gls, bud, customCats, lims);
    } catch (e) { console.error(e) }
  }

  const loadMoreTransactions = async () => {
    if (!userId || !hasMoreTransactions) return;
    try {
        const { startDate } = getBudgetPeriod(currentDate, periodType, periodStartDay);
        const month = startDate.getMonth() + 1;
        const year = startDate.getFullYear();
        const nextBatch = await api.fetchTransactions(userId, month, year, 30, transactionOffset);
        if (nextBatch.length > 0) {
            setTransactions(prev => [...prev, ...nextBatch]);
            setTransactionOffset(prev => prev + 30);
            if (nextBatch.length < 30) setHasMoreTransactions(false);
        } else {
            setHasMoreTransactions(false);
        }
    } catch(e) { console.error(e); }
  }

  const setCategoryOverride = (categoryId: string, data: any) => {
      const next = { ...(categoryOverrides || {}), [categoryId]: { ...(categoryOverrides?.[categoryId] || {}), ...data } };
      setCategoryOverrides(next);
      try { localStorage.setItem('category_overrides', JSON.stringify(next)); } catch (e) {}
      if (userId) api.setCategoryOverride(userId, categoryId, next[categoryId]).catch(e => console.error(e));
  }

  // Apply overrides that come from server (do not push them back)
  const applyServerOverrides = (overrides: Record<string, any>) => {
    setCategoryOverrides(overrides);
    try { localStorage.setItem('category_overrides', JSON.stringify(overrides)); } catch (e) {}
  }

  const removeCategoryOverride = (categoryId: string) => {
    const next = { ...(categoryOverrides || {}) };
    delete next[categoryId];
    setCategoryOverrides(next);
    try { localStorage.setItem('category_overrides', JSON.stringify(next)); } catch (e) {}
    if (userId) {
      api.deleteCategoryOverride(userId, categoryId).catch(e => console.error('Failed to delete override on server', e));
    }
  }
  
  const loadBudgetPeriodSettings = async (uid: number) => {
      try {
        const settings = await api.getBudgetPeriodSettings(uid);
        if (settings) {
          setPeriodType(settings.period_type || 'calendar_month');
          setPeriodStartDay(settings.period_start_day || 1);
        }
      } catch (error) { console.error(error); }
  };
    
  const syncToCloud = async (trans: any[], accs: any[], goals: any[], budget: number, cats: any[], limits: any) => {
    if (!cloudStorage.isAvailable()) return;
    try {
      setIsSyncing(true);
      await cloudStorage.saveToCloud({ transactions: trans, accounts: accs, goals: goals, budgetSettings: { budget_limit: budget }, categories: cats, limits: limits });
      setLastSyncTime(Date.now());
    } catch (error) { console.error(error); } finally { setIsSyncing(false); }
  }

  // Poll server for overrides periodically
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const fetchAndApply = async () => {
      try {
        const serverOverrides = await api.fetchCategoryOverrides(userId).catch(() => ({}));
        if (cancelled) return;
        if (JSON.stringify(serverOverrides) !== JSON.stringify(categoryOverrides)) {
          applyServerOverrides(serverOverrides);
        }
      } catch (e) { console.error('Error polling category overrides', e); }
    }
    fetchAndApply();
    const id = setInterval(fetchAndApply, 5000);
    return () => { cancelled = true; clearInterval(id); }
  }, [userId]);

  // Reload data when budget period settings or date change
  useEffect(() => {
    if (userId) {
      loadData(userId, currentDate);
    }
  }, [userId, currentDate, periodType, periodStartDay]);

  // Polling for real-time balance updates (Sync between users)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    
    const checkBalance = async () => {
        try {
            const { startDate } = getBudgetPeriod(currentDate, periodType, periodStartDay);
            const month = startDate.getMonth() + 1;
            const year = startDate.getFullYear();
            const balData = await api.fetchBalance(userId, month, year);
            if (cancelled) return;
            
            // If total expense/income changed, reload data
            if (Math.abs(balData.total_expense - totalSpent) > 0.01 || Math.abs((balData.total_income || 0) - totalIncome) > 0.01) {
                console.log('🔄 Balance changed, reloading data...');
                loadData(userId, currentDate);
            }
        } catch (e) { console.error('Error polling balance', e); }
    };

    const intervalId = setInterval(checkBalance, 10000); // Check every 10 seconds
    return () => { cancelled = true; clearInterval(intervalId); }
  }, [userId, currentDate, totalSpent, totalIncome, periodType, periodStartDay]); // Depend on current state to compare

  const handleSaveBudgetPeriodSettings = async (newPeriodType: 'calendar_month' | 'custom_period', newStartDay: number) => {
    if (!userId) return;
    try {
      await api.setBudgetPeriodSettings(userId, newPeriodType, newStartDay);
      setPeriodType(newPeriodType);
      setPeriodStartDay(newStartDay);
      // loadData is triggered by useEffect on state change
      WebApp.HapticFeedback.notificationOccurred('success');
    } catch (error) { console.error(error); WebApp.HapticFeedback.notificationOccurred('error'); }
  };

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
    // loadData is triggered by useEffect on currentDate change
  }

  // loadAllTransactions is now integrated into loadData, but we keep this empty or remove calls to it
  // Removing the useEffect that called loadAllTransactions since loadData now fetches everything

  const toggleTransType = (type: 'expense' | 'income') => {
    WebApp.HapticFeedback.selectionChanged();
    setTransType(type);
    if (type === 'expense') setSelectedCategory(EXPENSE_CATEGORIES[0].id);
    else setSelectedCategory(INCOME_CATEGORIES[0].id);
  }

  const currentCategories = transType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const isExpression = /[\+\-\*\/]/.test(amount);

  const handleConfirm = async () => {
    let value = 0;
    if (isExpression) {
      const calculated = evaluateExpression(amount);
      if (isNaN(calculated) || !isFinite(calculated)) {
        WebApp.HapticFeedback.notificationOccurred('error');
        setIsError(true);
        setTimeout(() => setIsError(false), 500);
        return;
      }
        const hasFraction = Math.abs(calculated % 1) > 0;
        const resultStr = hasFraction ? calculated.toFixed(2) : String(Math.trunc(calculated));
        setAmount(resultStr.length > 15 ? resultStr.slice(0, 15) : resultStr);
      WebApp.HapticFeedback.impactOccurred('light');
      return;
    } else {
      value = parseFloat(amount);
    }

    if (!amount || amount === '.' || isNaN(value) || value <= 0 || !userId) { 
      triggerError(); return; 
    }
    if (!selectedAccount) { 
      triggerError(); return; 
    }
    try {
      const targetType = selectedAccount.type;
      const targetId = selectedAccount.id;
      
      // If there are pending files (selected but not uploaded), upload them now
      let uploadedUrls: string[] = [];
      if (pendingFiles && pendingFiles.length > 0) {
        try {
          const uploadPromises = pendingFiles.map(f => api.uploadFile(f));
          const results = await Promise.all(uploadPromises);
          uploadedUrls = results.map(r => r.url).filter(Boolean);
        } catch (e) {
          console.error('Upload failed', e);
          WebApp.HapticFeedback.notificationOccurred('error');
          throw e;
        }
      }

      const finalPhotoUrls = [...(photos || []), ...uploadedUrls];

      await api.addTransaction(
        userId, value, selectedCategory, transType, targetId, targetType, 
        transactionDate.toISOString(),
        note, tags, finalPhotoUrls // New fields
      );
      
      WebApp.HapticFeedback.notificationOccurred('success');
      setIsHappy(true); 
      setAmount(''); 
      // Reset extras
      setNote('');
      setTags([]);
      setPhotos([]);
      // Clear pending files and previews after successful upload
      setPendingFiles([]);
      pendingPreviews.forEach(p => URL.revokeObjectURL(p));
      setPendingPreviews([]);

      loadData(userId, currentDate);
      setTimeout(() => setIsHappy(false), 3000);
    } catch (e) { 
      console.error(e);
      triggerError(); 
    }
  }
  
  const openEditTotal = () => { WebApp.HapticFeedback.impactOccurred('light'); setEditTarget({ type: 'total' }); setModalOpen(true); }
  const openEditCategory = (catId: string) => { WebApp.HapticFeedback.impactOccurred('light'); setEditTarget({ type: 'category', id: catId }); setModalOpen(true); }
  const handleModalSave = async (val: number) => {
    if (!userId || !editTarget) return;
    try {
      const { startDate } = getBudgetPeriod(currentDate, periodType, periodStartDay);
      const month = startDate.getMonth() + 1;
      const year = startDate.getFullYear();
      WebApp.HapticFeedback.notificationOccurred('success');
      if (editTarget.type === 'total') {
        await api.setBudget(userId, val, month, year);
        setBudgetLimit(val);
      } else if (editTarget.type === 'category' && editTarget.id) {
        await api.setCategoryLimit(userId, editTarget.id, val, month, year);
        setCatLimits({ ...catLimits, [editTarget.id]: val });
      }
      setModalOpen(false);
    } catch (e) { console.error(e); WebApp.HapticFeedback.notificationOccurred('error'); }
  }

  const handleAddCategory = (initialType: 'expense' | 'income' = 'expense') => {
      WebApp.HapticFeedback.impactOccurred('light');
      setAddCategoryType(initialType);
      setIsCustomCategory(initialType === 'income');
      setSelectedStandardCategory('');
      setNewCategoryName('');
      setNewCategoryIcon('Package');
      setNewCategoryColor('#FF6B6B');
      setNewCategoryLimit('');
      setEditingCategoryId(null);
      setShowAddCategoryModal(true);
  }

  const openEditCategoryModal = (categoryId: string) => {
      WebApp.HapticFeedback.impactOccurred('light');
      const custom = customCategories.find(c => c.id === categoryId);
      if (custom) {
        setAddCategoryType(custom.type || 'expense');
        setIsCustomCategory(true);
        const override = categoryOverrides?.[custom.id] || {};
        setNewCategoryName(override.name || custom.name || '');
        setNewCategoryIcon(override.icon || custom.icon || 'Package');
        setNewCategoryColor(override.color || custom.color || '#FF6B6B');
        setNewCategoryLimit(override.limit !== undefined ? String(override.limit) : (catLimits[custom.id] ? String(catLimits[custom.id]) : ''));
        setEditingCategoryId(custom.id);
        setShowAddCategoryModal(true);
        return;
      }
      const std = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(c => c.id === categoryId);
      if (std) {
        setAddCategoryType(INCOME_CATEGORIES.some(c => c.id === categoryId) ? 'income' : 'expense');
        setIsCustomCategory(false);
        const override = categoryOverrides?.[categoryId] || {};
        setNewCategoryName(override.name || std.name || '');
        setNewCategoryIcon(override.icon || (typeof std.icon === 'string' ? std.icon : 'Package'));
        setNewCategoryColor(override.color || std.color || '#FF6B6B');
        setNewCategoryLimit(override.limit !== undefined ? String(override.limit) : (catLimits[categoryId] ? String(catLimits[categoryId]) : ''));
        setEditingCategoryId(categoryId);
        setShowAddCategoryModal(true);
      }
  }

  const handleCreateCategory = async () => {
      if (!userId) return;
      try {
        const { startDate } = getBudgetPeriod(currentDate, periodType, periodStartDay);
        const month = startDate.getMonth() + 1;
        const year = startDate.getFullYear();
        const limit = newCategoryLimit && !isNaN(parseFloat(newCategoryLimit)) ? parseFloat(newCategoryLimit) : 0;
        if (editingCategoryId) {
          setCategoryOverride(editingCategoryId, { name: newCategoryName, icon: newCategoryIcon, color: newCategoryColor, limit: limit });
          if (customCategories.some(c => c.id === editingCategoryId)) {
            if (addCategoryType === 'expense' || limit > 0) await api.setCategoryLimit(userId, editingCategoryId, limit, month, year);
          }
        } else {
          if (isCustomCategory) {
            if (!newCategoryName) return;
            const res = await api.createCustomCategory(userId, newCategoryName, newCategoryIcon, newCategoryColor, limit, addCategoryType);
            if (addCategoryType === 'expense' || limit > 0) await api.setCategoryLimit(userId, res.id, limit, month, year);
          } else {
            if (!selectedStandardCategory) return;
            await api.setCategoryLimit(userId, selectedStandardCategory, limit, month, year);
          }
        }
        WebApp.HapticFeedback.notificationOccurred('success');
        setShowAddCategoryModal(false);
        setEditingCategoryId(null);
        loadData(userId, currentDate);
      } catch (e) { console.error(e); WebApp.HapticFeedback.notificationOccurred('error'); }
  }

  const handleDeleteCategory = async (categoryId: string) => {
      openConfirm('Вы уверены, что хотите удалить лимит/категорию? Действие необратимо.', async () => {
        if (!userId) return;
        WebApp.HapticFeedback.impactOccurred('medium');
        try {
          const isCustom = customCategories.some(cat => cat.id === categoryId);
          if (isCustom) await api.deleteCustomCategory(userId, categoryId);
          else await api.deleteCategoryLimit(userId, categoryId);
          // If deleted category had local overrides, remove them too
          removeCategoryOverride(categoryId);
          WebApp.HapticFeedback.notificationOccurred('success');
          await loadData(userId, currentDate);
        } catch (e) { console.error(e); WebApp.HapticFeedback.notificationOccurred('error'); }
      });
  }

  const getNekoMood = () => {
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

  const handleDeleteTransaction = async (id: number) => { 
    if (!userId) return; 
    WebApp.HapticFeedback.impactOccurred('medium'); 
    try { await api.deleteTransaction(userId, id); loadData(userId, currentDate); } 
    catch { triggerError(); } 
  }
  
  const handleNumberClick = (num: string) => { 
    WebApp.HapticFeedback.impactOccurred('light'); 
    if (amount.length >= 15) return; 
    const isOperator = ['+', '-', '*', '/'].includes(num);
    const lastChar = amount.slice(-1);
    const isLastOperator = ['+', '-', '*', '/'].includes(lastChar);
    if (isOperator && isLastOperator) { setAmount(prev => prev.slice(0, -1) + num); return; }
    if (amount === '' && isOperator) return;
    if (num === '.') {
      const parts = amount.split(/[\+\-\*\/]/);
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes('.')) return;
    }
    setAmount(prev => prev + num); 
    setIsError(false); 
  }
  
  const handleDelete = () => { WebApp.HapticFeedback.impactOccurred('medium'); setAmount(prev => prev.slice(0, -1)); setIsError(false); }
  const triggerError = () => { WebApp.HapticFeedback.notificationOccurred('error'); setIsError(true); setTimeout(() => setIsError(false), 500); }

  

  // handleSaveEdit removed; save is performed inside TransactionDetailModal

  // ... (Filtering Logic) ...
  const filterTransactions = (transactionsList: any[]) => {
      let filtered = [...transactionsList];
      if (filters.searchAmount) {
        const searchValue = parseFloat(filters.searchAmount);
        if (!isNaN(searchValue)) filtered = filtered.filter(t => Math.abs(t.amount - searchValue) < 0.01);
      }
      if (filters.selectedCategory) filtered = filtered.filter(t => t.category === filters.selectedCategory);
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
          } else if (filters.period === 'month') return transDate.getMonth() === now.getMonth() && transDate.getFullYear() === now.getFullYear();
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

  const handleConfirmModalCancel = () => { setConfirmOpen(false); setConfirmAction(null); }
  const handleConfirmModalConfirm = async () => {
    if (confirmAction) { try { await confirmAction(); } catch (e) { console.error(e); } }
    setConfirmOpen(false); setConfirmAction(null);
  }
  const handleApplyFilters = (newFilters: FilterState) => { setFilters(newFilters); }
  const hasActiveFilters = filters.searchAmount !== '' || filters.selectedCategory !== '' || filters.period !== 'all';
  const filteredTransactions = filterTransactions(transactions);

  const applyOverridesToCategory = (cat: any) => {
    const override = categoryOverrides?.[cat.id] || {};
    if (override.hidden) return { ...cat, hidden: true };
    return { ...cat, name: override.name || cat.name, color: override.color || cat.color, icon: override.icon || cat.icon, hidden: false };
  };

  const displayedStandardCategories = currentCategories.map(c => applyOverridesToCategory(c)).filter(c => !c.hidden);
  const displayedCustomCategories = customCategories.map(c => applyOverridesToCategory(c)).filter(c => !c.hidden && (c.type || 'expense') === transType && Object.prototype.hasOwnProperty.call(catLimits, c.id));
  
  const applyMiniAppClass = isMiniApp && !isTelegramWebApp;

  return (
    <div className={`app-container${applyMiniAppClass ? ' mini-app' : ''}`}>
      {/* ... (Date Picker Modal & ModalInput omitted for brevity, same as before) ... */}
      {showDatePicker && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={() => setShowDatePicker(false)}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                style={{ background: 'var(--bg-card)', borderRadius: 24, padding: 30, maxWidth: 320, width: '100%', boxShadow: '0 20px 60px var(--shadow-color)' }}
            >
                <input type="date" value={transactionDate.toISOString().split('T')[0]} onChange={(e) => setTransactionDate(new Date(e.target.value + 'T12:00:00'))} max={new Date().toISOString().split('T')[0]} style={{ width: '88%', padding: 16, borderRadius: 16, border: '2px solid var(--border-color)', fontSize: 16, background: 'var(--bg-input)' }} />
                <button onClick={() => setShowDatePicker(false)} style={{ width: '100%', marginTop: 20, padding: 14, background: 'var(--primary)', border: 'none', borderRadius: 14, color: 'white', fontWeight: 'bold' }}>Готово</button>
            </motion.div>
        </div>
      )}
      <ModalInput isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleModalSave} title={editTarget?.type === 'total' ? 'Общий бюджет' : 'Лимит категории'} initialValue={editTarget?.type === 'total' ? budgetLimit : (editTarget?.id ? catLimits[editTarget.id] || 0 : 0)} />

      <div className="header-section" style={{ marginBottom: activeTab !== 'input' ? 10 : undefined }}>
        {/* ... (Header logic) ... */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, width: '100%', paddingLeft: 15, paddingRight: 15, boxSizing: 'border-box' }}>
          <div style={{ marginLeft: 0 }}>
            <MonthSelector currentDate={currentDate} onChange={handleDateChange} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-main)', opacity: 0.8, marginRight: 0 }}>
            PURRFINANCE
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 15, marginBottom: 10, width: '100%', paddingLeft: 15, paddingRight: 15, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <motion.div animate={isError ? { rotate: [0, -20, 20, 0] } : isHappy ? { scale: 1.1, y: [0, -10, 0] } : { scale: 1, y: 0 }}>
              <NekoAvatar mood={getNekoMood()} theme={theme} />
            </motion.div>
            {activeTab === 'input' && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => { WebApp.HapticFeedback.impactOccurred('light'); setShowDatePicker(true); }} style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #D291BC 100%)', border: 'none', borderRadius: 8, padding: '5px 5px', color: '#fff', fontSize: 10, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 6, height: 20, flexShrink: 0 }}>
                📅 {transactionDate.getDate()}/{transactionDate.getMonth() + 1}
              </motion.button>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: '100%' }}><BudgetStatus total={totalSpent} limit={budgetLimit} /></div>
            {activeTab === 'input' && (
              <div style={{ display: 'flex', gap: 15, fontSize: 12, fontWeight: 'normal', color: 'var(--text-main)', opacity: 0.7 }}>
                <div>Доступно: {displayBalance.toLocaleString()} ₽</div>
                <div>Лимит: {budgetLimit > 0 ? `${budgetLimit.toLocaleString()} ₽` : '∞'}</div>
              </div>
            )}
            {activeTab === 'input' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: 0 }}>
                <motion.div className="amount-display" style={{ margin: 0 }}>
                  <span style={{color: transType === 'income' ? 'var(--accent-success)' : 'var(--text-main)'}}>
                    {(() => {
                        if (!amount) return '0';
                        const numericPattern = /^\d+(?:\.\d+)?$/;
                        if (numericPattern.test(amount)) {
                          const num = parseFloat(amount);
                          if (/^\d+\.\d{2}$/.test(amount)) return formatCurrency(num, 2);
                          return formatCurrency(num);
                        }
                        return amount;
                      })()}
                  </span>
                  <span className="currency">₽</span>
                </motion.div>
              </div>
            ) : (
              <div style={{fontSize: 22, color: 'var(--text-main)', fontWeight: 'bold'}}>
                {activeTab === 'stats' ? 'Статистика' : activeTab === 'accounts' ? 'Счета и Копилки' : 'Бюджет'}
              </div>
            )}
          </div>
        </div>

        {activeTab !== 'input' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: '5px 35px', textAlign: 'center', boxShadow: '0 2px 8px var(--shadow-color)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7, marginBottom: 3 }}>РАСХОД</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text-main)' }}>{totalSpent.toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: '5px 35px', textAlign: 'center', boxShadow: '0 2px 8px var(--shadow-color)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7, marginBottom: 3 }}>ДОХОД</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text-main)' }}>{totalIncome.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      <div className={`content-area ${activeTab !== 'input' ? 'stats-mode' : ''}`}>
        
        {activeTab === 'input' && (
          <>
            <div className="input-scrollable-area">

              <div className="transaction-type-selector">
                <button onClick={() => toggleTransType('expense')} className={`type-button ${transType === 'expense' ? 'type-button-expense-active' : ''}`}><ArrowDownCircle size={18} /> Расход</button>
                <button onClick={() => toggleTransType('income')} className={`type-button ${transType === 'income' ? 'type-button-income-active' : ''}`}><ArrowUpCircle size={18} /> Доход</button>
              </div>

              {(accounts.length > 0 || goals.length > 0) && (
                <div className="account-selector-section">
                  <div className="account-selector-scroll">
                    {accounts.map((acc) => {
                      const isSelected = selectedAccount?.type === 'account' && selectedAccount?.id === acc.id;
                      return (
                      <motion.button key={`acc-${acc.id}`} whileTap={{ scale: 0.95 }} onClick={() => { WebApp.HapticFeedback.impactOccurred('light'); setSelectedAccount({type: 'account', id: acc.id}); }} className={`account-button ${isSelected ? 'account-button-selected' : ''}`} style={{ borderColor: isSelected ? acc.color : undefined, backgroundColor: isSelected ? acc.color : undefined }}>{acc.name}</motion.button>
                      );
                    })}
                    {goals.map((goal) => {
                      const isSelected = selectedAccount?.type === 'goal' && selectedAccount?.id === goal.id;
                      return (
                      <motion.button key={`goal-${goal.id}`} whileTap={{ scale: 0.95 }} onClick={() => { WebApp.HapticFeedback.impactOccurred('light'); setSelectedAccount({type: 'goal', id: goal.id}); }} className={`account-button account-button-goal ${isSelected ? 'account-button-goal-selected' : ''}`} style={{ borderColor: isSelected ? (goal.color || '#FFB6C1') : undefined, backgroundColor: isSelected ? (goal.color || '#FFB6C1') : undefined }}>💰 {goal.name}</motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="categories-wrapper">
                <div className="categories-scroll">
                  {transType === 'expense' 
                    ? displayedStandardCategories.filter(cat => Object.prototype.hasOwnProperty.call(catLimits, cat.id)).map((cat) => (
                        <motion.button key={cat.id} whileTap={{ scale: 0.95 }} onClick={() => { setSelectedCategory(cat.id); WebApp.HapticFeedback.selectionChanged(); }} className="category-btn" style={{ background: selectedCategory === cat.id ? cat.color : 'var(--bg-input)', boxShadow: selectedCategory === cat.id ? '0 2px 8px var(--shadow-color)' : 'none', filter: selectedCategory === cat.id ? 'var(--category-filter)' : 'none' }}>
                          <div className="category-icon" style={{color: selectedCategory === cat.id ? (theme === 'dark' ? '#FFF' : '#6B4C75') : 'var(--text-main)'}}>{cat.icon && (typeof cat.icon === 'string' ? getIconByName(cat.icon, 20) : cat.icon)}</div>
                          <span className="category-label" style={{color: selectedCategory === cat.id ? (theme === 'dark' ? '#FFF' : '#6B4C75') : 'var(--text-main)'}}>{cat.name}</span>
                        </motion.button>
                      ))
                    : displayedStandardCategories.map((cat) => (
                        <motion.button key={cat.id} whileTap={{ scale: 0.95 }} onClick={() => { setSelectedCategory(cat.id); WebApp.HapticFeedback.selectionChanged(); }} className="category-btn" style={{ background: selectedCategory === cat.id ? cat.color : 'var(--bg-input)', boxShadow: selectedCategory === cat.id ? '0 2px 8px var(--shadow-color)' : 'none', filter: selectedCategory === cat.id ? 'var(--category-filter)' : 'none' }}>
                          <div className="category-icon" style={{color: selectedCategory === cat.id ? (theme === 'dark' ? '#FFF' : '#6B4C75') : 'var(--text-main)'}}>{cat.icon && (typeof cat.icon === 'string' ? getIconByName(cat.icon, 20) : cat.icon)}</div>
                          <span className="category-label" style={{color: selectedCategory === cat.id ? (theme === 'dark' ? '#FFF' : '#6B4C75') : 'var(--text-main)'}}>{cat.name}</span>
                        </motion.button>
                      ))
                  }
                  {displayedCustomCategories.map((cat) => (
                    <motion.button key={cat.id} whileTap={{ scale: 0.95 }} onClick={() => { setSelectedCategory(cat.id); WebApp.HapticFeedback.selectionChanged(); }} className="category-btn" style={{ background: selectedCategory === cat.id ? cat.color : 'var(--bg-input)', boxShadow: selectedCategory === cat.id ? '0 2px 8px var(--shadow-color)' : 'none', filter: selectedCategory === cat.id ? 'var(--category-filter)' : 'none' }}>
                      <div className="category-icon" style={{color: selectedCategory === cat.id ? (theme === 'dark' ? '#FFF' : '#6B4C75') : 'var(--text-main)'}}>{typeof cat.icon === 'string' ? getIconByName(cat.icon, 20) : getIconByName(cat.icon || 'Package', 20)}</div>
                      <span className="category-label" style={{color: selectedCategory === cat.id ? (theme === 'dark' ? '#FFF' : '#6B4C75') : 'var(--text-main)'}}>{cat.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
              <div className="input-bottom">
                <NumPad
                  onNumberClick={handleNumberClick}
                  onDelete={handleDelete}
                  extraContent={
                    <>
                      <TransactionExtras
                        note={note} setNote={setNote}
                        tags={tags} setTags={setTags}
                        photos={photos} setPhotos={setPhotos}
                        showPhotosPreview={false}
                        pendingFiles={pendingFiles} setPendingFiles={setPendingFiles}
                        pendingPreviews={pendingPreviews} setPendingPreviews={setPendingPreviews}
                        existingTags={allTags}
                      />
                      <motion.button
                        className="submit-btn-wide"
                        whileTap={{ scale: 0.95 }}
                        onClick={handleConfirm}
                      >
                        {isExpression ? "=" : "Внести💵"}
                      </motion.button>
                    </>
                  }
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'stats' && (
          <div style={{ width: '100%', height: '100%', overflowY: 'auto', paddingRight: 5 }}>
            {/* StatsView now uses allTransactions for correct charts */}
            <StatsView data={statsData} total={totalSpent} transactions={allTransactions} budgetLimit={budgetLimit} customCategories={customCategories} periodType={periodType} periodStartDay={periodStartDay} currentMonth={currentDate} />
            {/* Divider removed per request
            <div style={{ height: 1, background: 'var(--border-color)', margin: '20px 0' }} />
            */}
              <TransactionList 
              transactions={filteredTransactions} 
              onDelete={(id) => openConfirm('Удалить транзакцию?', async () => { await handleDeleteTransaction(id); })}
              onFilterClick={() => setShowSearchPanel(true)}
              onTransactionClick={(t) => {
                WebApp.HapticFeedback.impactOccurred('light');
                setSelectedTransaction(t);
              }}
              hasActiveFilters={hasActiveFilters}
              customCategories={customCategories}
              categoryOverrides={categoryOverrides}
              accounts={[...accounts, ...goals.map(g => ({...g, type: 'goal'}))]}
              onLoadMore={loadMoreTransactions}
              hasMore={hasMoreTransactions}
            />
            <div style={{ height: 80 }} /> 
          </div>
        )}

        {activeTab === 'accounts' && (
          <AccountsView userId={userId} accounts={accounts} goals={goals} onRefresh={() => userId && loadData(userId, currentDate)} />
        )}

        {activeTab === 'budget' && (
          <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
            <BudgetView stats={statsData} limits={catLimits} totalLimit={budgetLimit} customCategories={customCategories} onEditCategory={openEditCategory} onEditTotal={openEditTotal} onAddCategory={() => handleAddCategory('expense')} onAddIncomeCategory={() => handleAddCategory('income')} onDeleteCategory={handleDeleteCategory} transactions={allTransactions} accounts={[...accounts, ...goals.map(g => ({...g, type: 'goal'}))]} categoryOverrides={categoryOverrides} onSetCategoryOverride={setCategoryOverride} onOpenEditCategory={openEditCategoryModal} />
            <div style={{ height: 80 }} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView transactions={allTransactions} currentMonth={currentDate} customCategories={customCategories} />
        )}

        {activeTab === 'settings' && (
          <SettingsView periodType={periodType} periodStartDay={periodStartDay} onSave={handleSaveBudgetPeriodSettings} userId={userId} accounts={accounts} onRefresh={() => userId && loadData(userId, currentDate)} lastSyncTime={lastSyncTime} isSyncing={isSyncing} theme={theme} toggleTheme={toggleTheme} />
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

      {/* DETAIL MODAL */}
        <TransactionDetailModal
        isOpen={!!selectedTransaction}
        onClose={() => { setSelectedTransaction(null); if (userId) loadData(userId, currentDate); }}
        transaction={selectedTransaction}
        onDelete={(id) => openConfirm('Удалить транзакцию?', async () => { await handleDeleteTransaction(id); })}
          userId={userId}
          availableCategoryIds={[...new Set([...Object.keys(catLimits), ...customCategories.map(c => c.id)])]}
          categoryOverrides={categoryOverrides}
        existingTags={allTags}
        accountName={
          selectedTransaction?.account_id ? 
          (accounts.find(a => a.id === selectedTransaction.account_id) || goals.find(g => g.id === selectedTransaction.account_id))?.name 
          : 'Unknown'
        }
        categoryIcon={selectedTransaction ? (() => {
          const cat = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...customCategories].find(c => c.id === selectedTransaction.category);
          // Apply override if needed
          const override = categoryOverrides?.[selectedTransaction.category] || {};
          return override.icon || cat?.icon || '❓';
        })() : '❓'}
        categoryColor={selectedTransaction ? (() => {
          const cat = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...customCategories].find(c => c.id === selectedTransaction.category);
          const override = categoryOverrides?.[selectedTransaction.category] || {};
          return override.color || cat?.color || '#ccc';
        })() : '#ccc'}
        />

      {/* ... (Add Category, Edit Transaction, Search, Confirm modals unchanged) ... */}
      <Modal isOpen={showAddCategoryModal} onClose={() => setShowAddCategoryModal(false)} title={addCategoryType === 'income' ? "Новая категория" : "Новый лимит"}>
          {/* ... Content same as before ... */}
          <div className="modal-body">
          {addCategoryType === 'expense' && (
            <div style={{ marginBottom: 15 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsCustomCategory(false)} style={{ flex: 1, padding: '10px', background: !isCustomCategory ? '#667eea' : 'var(--bg-input)', color: !isCustomCategory ? 'white' : 'var(--text-main)', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>Стандартные</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsCustomCategory(true)} style={{ flex: 1, padding: '10px', background: isCustomCategory ? '#667eea' : 'var(--bg-input)', color: isCustomCategory ? 'white' : 'var(--text-main)', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>Свои</motion.button>
              </div>
            </div>
          )}
          
          {addCategoryType === 'expense' && !isCustomCategory ? (
            <div style={{ marginBottom: 15 }}>
              <label className="modal-label">Выберите категорию</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {EXPENSE_CATEGORIES.filter(cat => !catLimits[cat.id] || catLimits[cat.id] === 0).map((cat) => (
                  <motion.button key={cat.id} whileTap={{ scale: 0.9 }} onClick={() => setSelectedStandardCategory(cat.id)} style={{ background: selectedStandardCategory === cat.id ? cat.color : 'var(--bg-input)', border: selectedStandardCategory === cat.id ? '2px solid #667eea' : '2px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: selectedStandardCategory === cat.id ? 'white' : 'var(--text-main)', fontWeight: selectedStandardCategory === cat.id ? 'bold' : 'normal' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>{cat.icon}</div>
                    <span style={{ fontSize: 13 }}>{cat.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <input type="text" placeholder="Название категории" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="modal-input" />
              <div style={{marginTop: 10, marginBottom: 10}}><IconPicker selectedIcon={newCategoryIcon} onSelectIcon={setNewCategoryIcon} /></div>
              <div style={{marginBottom: 10}}><ColorPicker selectedColor={newCategoryColor} onSelectColor={setNewCategoryColor} /></div>
            </>
          )}
          {addCategoryType === 'expense' && (<input type="number" placeholder="Лимит (опционально)" value={newCategoryLimit} onChange={(e) => setNewCategoryLimit(e.target.value)} className="modal-input" />)}
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleCreateCategory} className="modal-submit-button">{addCategoryType === 'income' ? (editingCategoryId ? 'Изменить категорию' : 'Создать категорию') : (isCustomCategory ? 'Создать лимит' : 'Добавить лимит')}</motion.button>
          {editingCategoryId && (<motion.button whileTap={{ scale: 0.95 }} onClick={() => { openConfirm('Удалить категорию?', async () => { if (!userId || !editingCategoryId) return; try { const isCustom = customCategories.some(c => c.id === editingCategoryId); if (isCustom) { await api.deleteCustomCategory(userId, editingCategoryId); removeCategoryOverride(editingCategoryId); } else { setCategoryOverride(editingCategoryId, { hidden: true }); } setShowAddCategoryModal(false); setEditingCategoryId(null); loadData(userId, currentDate); } catch (e) { console.error(e); } }); }} style={{ marginTop: 8, background: 'transparent', border: '2px solid var(--accent-danger)', color: 'var(--accent-danger)' }}>Удалить категорию</motion.button>)}
        </div>
      </Modal>

      {/* Edit modal removed - editing is performed inline in the detail modal */}

      <TransactionSearch isOpen={showSearchPanel} onClose={() => setShowSearchPanel(false)} onApplyFilters={handleApplyFilters} categories={[...EXPENSE_CATEGORIES.map(c => ({ id: c.id, name: c.name })), ...INCOME_CATEGORIES.map(c => ({ id: c.id, name: c.name })), ...customCategories.map(c => ({ id: c.id, name: c.name }))]} />
      <ConfirmModal isOpen={confirmOpen} message={confirmMessage} onCancel={handleConfirmModalCancel} onConfirm={handleConfirmModalConfirm} />
    </div>
  )
}

export default App
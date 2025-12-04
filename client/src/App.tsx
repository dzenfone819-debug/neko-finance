import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WebApp from '@twa-dev/sdk'
import { LayoutGrid, Plus, Target } from 'lucide-react'
import './App.css'

import { NumPad } from './components/NumPad'
import { StatsView } from './components/StatsView'
import { TransactionList } from './components/TransactionList'
import { BudgetStatus } from './components/BudgetStatus'
import { BudgetView } from './components/BudgetView'
import { ModalInput } from './components/ModalInput' // NEW
import { CATEGORIES } from './data/constants'
import * as api from './api/nekoApi'

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'stats' | 'budget'>('input')
  const [selectedCategory, setSelectedCategory] = useState('groceries')
  const [amount, setAmount] = useState('')
  const [totalSpent, setTotalSpent] = useState(0)
  const [budgetLimit, setBudgetLimit] = useState(0)
  const [catLimits, setCatLimits] = useState<Record<string, number>>({})
  const [statsData, setStatsData] = useState<{name: string, value: number}[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [isHappy, setIsHappy] = useState(false)
  const [isError, setIsError] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)

  // NEW: Состояние для модального окна
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{type: 'total' | 'category', id?: string} | null>(null)

  useEffect(() => {
    WebApp.ready(); WebApp.expand(); WebApp.enableClosingConfirmation(); 
    let currentUserId = 777; 
    if (WebApp.initDataUnsafe.user) currentUserId = WebApp.initDataUnsafe.user.id;
    setUserId(currentUserId);
    loadData(currentUserId);
  }, [])

  const loadData = async (uid: number) => {
    try {
      const [bal, stats, hist, bud, lims] = await Promise.all([
        api.fetchBalance(uid), api.fetchStats(uid), api.fetchTransactions(uid),
        api.fetchBudget(uid), api.fetchCategoryLimits(uid)
      ]);
      setTotalSpent(bal); setStatsData(stats); setTransactions(hist);
      setBudgetLimit(bud); setCatLimits(lims);
    } catch (e) { console.error(e) }
  }

  // --- ОТКРЫТИЕ МОДАЛКИ ---
  const openEditTotal = () => {
    WebApp.HapticFeedback.impactOccurred('light');
    setEditTarget({ type: 'total' });
    setModalOpen(true);
  }

  const openEditCategory = (catId: string) => {
    WebApp.HapticFeedback.impactOccurred('light');
    setEditTarget({ type: 'category', id: catId });
    setModalOpen(true);
  }

  // --- СОХРАНЕНИЕ ИЗ МОДАЛКИ ---
  const handleModalSave = async (val: number) => {
    if (!userId || !editTarget) return;
    WebApp.HapticFeedback.notificationOccurred('success');
    
    if (editTarget.type === 'total') {
      await api.setBudget(userId, val);
    } else if (editTarget.type === 'category' && editTarget.id) {
      await api.setCategoryLimit(userId, editTarget.id, val);
    }
    loadData(userId);
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

  // ... (Стандартные хендлеры: handleConfirm, handleDeleteTransaction, handleNumberClick, handleDelete, triggerError - без изменений) ...
  const handleConfirm = async () => {
    const value = parseFloat(amount);
    if (!amount || amount === '.' || isNaN(value) || value <= 0 || !userId) { triggerError(); return; }
    try {
      await api.addExpense(userId, value, selectedCategory);
      WebApp.HapticFeedback.notificationOccurred('success');
      setIsHappy(true); setAmount(''); loadData(userId);
      setTimeout(() => setIsHappy(false), 3000);
    } catch { triggerError(); }
  }
  const handleDeleteTransaction = async (id: number) => {
    if (!userId) return; WebApp.HapticFeedback.impactOccurred('medium');
    try { await api.deleteTransaction(userId, id); loadData(userId); } catch { triggerError(); }
  }
  const handleNumberClick = (num: string) => {
    WebApp.HapticFeedback.impactOccurred('light');
    if (amount.length >= 6) return;
    if (num === '.' && amount.includes('.')) return;
    setAmount(prev => prev + num); setIsError(false);
  }
  const handleDelete = () => {
    WebApp.HapticFeedback.impactOccurred('medium');
    setAmount(prev => prev.slice(0, -1)); setIsError(false);
  }
  const triggerError = () => {
    WebApp.HapticFeedback.notificationOccurred('error');
    setIsError(true); setTimeout(() => setIsError(false), 500);
  }

  return (
    <div className="app-container">
      
      {/* МОДАЛКА (Рендерится поверх всего) */}
      <ModalInput 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        title={editTarget?.type === 'total' ? 'Общий бюджет' : 'Лимит категории'}
        initialValue={editTarget?.type === 'total' ? budgetLimit : (editTarget?.id ? catLimits[editTarget.id] || 0 : 0)}
      />

      <div className="header-section">
        <motion.div 
          animate={isError ? { rotate: [0, -20, 20, 0] } : isHappy ? { scale: 1.1, y: [0, -10, 0] } : { scale: 1, y: 0 }}
          className="neko-avatar"
        >
          {getNekoMood()}
        </motion.div>
        
        {/* Чистый бар без кнопок */}
        <BudgetStatus total={totalSpent} limit={budgetLimit} />

        {activeTab === 'input' ? (
           <motion.div className="amount-display">
             {amount || '0'} <span className="currency">₽</span>
           </motion.div>
        ) : (
          <div style={{fontSize: 22, color: '#6B4C75', fontWeight: 'bold', marginTop: 5}}>
            {activeTab === 'stats' ? 'Статистика' : 'Бюджет'}
          </div>
        )}
      </div>

      <div className={`content-area ${activeTab !== 'input' ? 'stats-mode' : ''}`}>
        
        {activeTab === 'input' && (
          <>
            <div className="categories-wrapper">
              <div className="categories-scroll">
                {CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setSelectedCategory(cat.id); WebApp.HapticFeedback.selectionChanged(); }}
                    className="category-btn"
                    style={{
                      background: selectedCategory === cat.id ? cat.color : '#F8F9FA',
                      boxShadow: selectedCategory === cat.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <div className="category-icon">{cat.icon}</div>
                    <span className="category-label">{cat.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
            <NumPad onNumberClick={handleNumberClick} onDelete={handleDelete} onConfirm={handleConfirm} />
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

        {activeTab === 'budget' && (
          <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
            <BudgetView 
               stats={statsData}
               limits={catLimits}
               totalLimit={budgetLimit}
               // Теперь передаем открытие модалки
               onUpdateLimit={(catId) => openEditCategory(catId)}
               onUpdateTotal={openEditTotal}
             />
             <div style={{ height: 80 }} />
          </div>
        )}
      </div>

      <div className="bottom-tab-bar">
        <button className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`} onClick={() => { setActiveTab('input'); WebApp.HapticFeedback.selectionChanged(); }}>
          <div className="tab-icon-bg"><Plus size={24} /></div>
          <span>Ввод</span>
        </button>
        <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); WebApp.HapticFeedback.selectionChanged(); }}>
          <div className="tab-icon-bg"><LayoutGrid size={24} /></div>
          <span>Инфо</span>
        </button>
        <button className={`tab-btn ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => { setActiveTab('budget'); WebApp.HapticFeedback.selectionChanged(); }}>
          <div className="tab-icon-bg"><Target size={24} /></div>
          <span>Бюджет</span>
        </button>
      </div>

    </div>
  )
}

export default App
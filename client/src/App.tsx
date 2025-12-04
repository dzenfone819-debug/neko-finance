import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WebApp from '@twa-dev/sdk'
import { LayoutGrid, Plus, Target, ArrowUpCircle, ArrowDownCircle } from 'lucide-react' // Новые иконки
import './App.css'

import { NumPad } from './components/NumPad'
import { StatsView } from './components/StatsView'
import { TransactionList } from './components/TransactionList'
import { BudgetStatus } from './components/BudgetStatus'
import { BudgetView } from './components/BudgetView'
import { ModalInput } from './components/ModalInput'
// Берем оба списка категорий
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './data/constants'
import * as api from './api/nekoApi'

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'stats' | 'budget'>('input')
  
  // NEW: Тип транзакции
  const [transType, setTransType] = useState<'expense' | 'income'>('expense')
  
  const [selectedCategory, setSelectedCategory] = useState('groceries')
  const [amount, setAmount] = useState('')
  
  // Данные баланса теперь раздельны
  const [totalSpent, setTotalSpent] = useState(0) // Расходы (для прогресса)
  const [currentBalance, setCurrentBalance] = useState(0) // Реальный баланс (Доход - Расход)
  
  const [budgetLimit, setBudgetLimit] = useState(0)
  const [catLimits, setCatLimits] = useState<Record<string, number>>({})
  const [statsData, setStatsData] = useState<{name: string, value: number}[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [isHappy, setIsHappy] = useState(false)
  const [isError, setIsError] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{type: 'total' | 'category', id?: string} | null>(null)
  // --- ВОТ ТУТ НОВАЯ ЛОГИКА ---
  // Если есть бюджет - пляшем от него. Если нет - от реальных денег.
  const displayBalance = budgetLimit > 0 
    ? budgetLimit - totalSpent 
    : currentBalance;
  // ---------------------------
  useEffect(() => {
    WebApp.ready(); WebApp.expand(); WebApp.enableClosingConfirmation(); 
    let currentUserId = 777; 
    if (WebApp.initDataUnsafe.user) currentUserId = WebApp.initDataUnsafe.user.id;
    setUserId(currentUserId);
    loadData(currentUserId);
  }, [])

  const loadData = async (uid: number) => {
    try {
      const [balData, stats, hist, bud, lims] = await Promise.all([
        api.fetchBalance(uid), api.fetchStats(uid), api.fetchTransactions(uid),
        api.fetchBudget(uid), api.fetchCategoryLimits(uid)
      ]);
      // balData приходит как { balance, total_expense, total_income }
      setTotalSpent(balData.total_expense);
      setCurrentBalance(balData.balance);
      
      setStatsData(stats);
      setTransactions(hist);
      setBudgetLimit(bud);
      setCatLimits(lims);
    } catch (e) { console.error(e) }
  }

  // Смена типа (Расход <-> Доход)
  const toggleTransType = (type: 'expense' | 'income') => {
    WebApp.HapticFeedback.selectionChanged();
    setTransType(type);
    // Сбрасываем категорию на первую в списке
    if (type === 'expense') setSelectedCategory(EXPENSE_CATEGORIES[0].id);
    else setSelectedCategory(INCOME_CATEGORIES[0].id);
  }

  // Какие категории показывать?
  const currentCategories = transType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleConfirm = async () => {
    const value = parseFloat(amount);
    if (!amount || amount === '.' || isNaN(value) || value <= 0 || !userId) { triggerError(); return; }
    try {
      // Передаем transType
      await api.addTransaction(userId, value, selectedCategory, transType);
      
      WebApp.HapticFeedback.notificationOccurred('success');
      setIsHappy(true); setAmount(''); loadData(userId);
      setTimeout(() => setIsHappy(false), 3000);
    } catch { triggerError(); }
  }

  // Остальные функции без изменений...
  const openEditTotal = () => { WebApp.HapticFeedback.impactOccurred('light'); setEditTarget({ type: 'total' }); setModalOpen(true); }
  const openEditCategory = (catId: string) => { WebApp.HapticFeedback.impactOccurred('light'); setEditTarget({ type: 'category', id: catId }); setModalOpen(true); }
  const handleModalSave = async (val: number) => {
    if (!userId || !editTarget) return; WebApp.HapticFeedback.notificationOccurred('success');
    if (editTarget.type === 'total') await api.setBudget(userId, val);
    else if (editTarget.type === 'category' && editTarget.id) await api.setCategoryLimit(userId, editTarget.id, val);
    loadData(userId);
  }
  const getNekoMood = () => {
    if (isError) return '🙀'; if (isHappy) return '😻';
    if (budgetLimit > 0) {
      const percent = totalSpent / budgetLimit; // Считаем настроение от РАСХОДОВ
      if (percent >= 1.0) return '💀'; if (percent > 0.85) return '😿'; if (percent > 0.5) return '😾';
    }
    return '😸';
  }
  const handleDeleteTransaction = async (id: number) => { if (!userId) return; WebApp.HapticFeedback.impactOccurred('medium'); try { await api.deleteTransaction(userId, id); loadData(userId); } catch { triggerError(); } }
  const handleNumberClick = (num: string) => { WebApp.HapticFeedback.impactOccurred('light'); if (amount.length >= 6) return; if (num === '.' && amount.includes('.')) return; setAmount(prev => prev + num); setIsError(false); }
  const handleDelete = () => { WebApp.HapticFeedback.impactOccurred('medium'); setAmount(prev => prev.slice(0, -1)); setIsError(false); }
  const triggerError = () => { WebApp.HapticFeedback.notificationOccurred('error'); setIsError(true); setTimeout(() => setIsError(false), 500); }

  return (
    <div className="app-container">
      <ModalInput isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleModalSave} title={editTarget?.type === 'total' ? 'Общий бюджет' : 'Лимит категории'} initialValue={editTarget?.type === 'total' ? budgetLimit : (editTarget?.id ? catLimits[editTarget.id] || 0 : 0)} />

      <div className="header-section">
        <motion.div animate={isError ? { rotate: [0, -20, 20, 0] } : isHappy ? { scale: 1.1, y: [0, -10, 0] } : { scale: 1, y: 0 }} className="neko-avatar">
          {getNekoMood()}
        </motion.div>
        
        {/* Показываем прогресс бюджета (траты), но надпись можно сделать "Баланс" */}
        <BudgetStatus total={totalSpent} limit={budgetLimit} />
        
        {/* NEW: Показываем реальный баланс денег */}
        {activeTab === 'input' && (
  <div style={{ 
    fontSize: 11, fontWeight: 'bold', color: '#6B4C75', 
    marginTop: 8,  /* <-- БЫЛО -10, СТАЛО 8 (отлепили от бара) */
    marginBottom: 2, 
    opacity: 0.7 
  }}>
    Доступно: {displayBalance.toLocaleString()} ₽
  </div>
)}

        {activeTab === 'input' ? (
           <motion.div className="amount-display">
             {/* Цвет меняется: фиолетовый для трат, зеленый для дохода */}
             <span style={{color: transType === 'income' ? '#27AE60' : '#6B4C75'}}>{amount || '0'}</span> 
             <span className="currency">₽</span>
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
            {/* NEW: Переключатель Расход/Доход */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 15, gap: 20 }}>
              <button 
                onClick={() => toggleTransType('expense')}
                style={{
                  background: transType === 'expense' ? '#FFADAD' : '#F0F0F0',
                  border: 'none', borderRadius: 20, padding: '8px 16px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: transType === 'expense' ? 'white' : '#A0A0A0', fontWeight: 'bold',
                  transition: '0.3s'
                }}
              >
                <ArrowDownCircle size={18} /> Расход
              </button>

              <button 
                onClick={() => toggleTransType('income')}
                style={{
                  background: transType === 'income' ? '#4ADE80' : '#F0F0F0',
                  border: 'none', borderRadius: 20, padding: '8px 16px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: transType === 'income' ? 'white' : '#A0A0A0', fontWeight: 'bold',
                  transition: '0.3s'
                }}
              >
                <ArrowUpCircle size={18} /> Доход
              </button>
            </div>

            {/* Категории (меняются в зависимости от типа) */}
            <div className="categories-wrapper">
              <div className="categories-scroll">
                {currentCategories.map((cat) => (
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

        {/* Остальные вкладки (Stats, Budget) без изменений */}
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
            <BudgetView stats={statsData} limits={catLimits} totalLimit={budgetLimit} onEditCategory={openEditCategory} onEditTotal={openEditTotal} />
            <div style={{ height: 80 }} />
          </div>
        )}
      </div>

      <div className="bottom-tab-bar">
        <button className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`} onClick={() => { setActiveTab('input'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Plus size={24} /></div><span>Ввод</span></button>
        <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><LayoutGrid size={24} /></div><span>Инфо</span></button>
        <button className={`tab-btn ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => { setActiveTab('budget'); WebApp.HapticFeedback.selectionChanged(); }}><div className="tab-icon-bg"><Target size={24} /></div><span>Бюджет</span></button>
      </div>
    </div>
  )
}

export default App
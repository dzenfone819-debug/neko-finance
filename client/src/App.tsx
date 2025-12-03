import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WebApp from '@twa-dev/sdk'
import { LayoutGrid, Plus } from 'lucide-react'
import './App.css'

import { NumPad } from './components/NumPad'
import { StatsView } from './components/StatsView'
import { TransactionList } from './components/TransactionList' // NEW
import { CATEGORIES } from './data/constants'
import * as api from './api/nekoApi'

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'stats'>('input')
  const [selectedCategory, setSelectedCategory] = useState('groceries')
  const [amount, setAmount] = useState('')
  const [totalSpent, setTotalSpent] = useState(0)
  const [statsData, setStatsData] = useState<{name: string, value: number}[]>([])
  const [transactions, setTransactions] = useState<any[]>([]) // NEW
  const [isHappy, setIsHappy] = useState(false)
  const [isError, setIsError] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  
  useEffect(() => {
    WebApp.ready();
    WebApp.expand(); 
    WebApp.enableClosingConfirmation(); 

    let currentUserId = 777; 
    if (WebApp.initDataUnsafe.user) {
      currentUserId = WebApp.initDataUnsafe.user.id;
    }
    setUserId(currentUserId);
    loadData(currentUserId);
  }, [])

  const loadData = async (uid: number) => {
    try {
      const balance = await api.fetchBalance(uid);
      const stats = await api.fetchStats(uid);
      const history = await api.fetchTransactions(uid); // NEW

      setTotalSpent(balance);
      setStatsData(stats);
      setTransactions(history); // NEW
    } catch (e) { console.error(e) }
  }

  const handleConfirm = async () => {
    const value = parseFloat(amount);
    if (!amount || amount === '.' || isNaN(value) || value <= 0 || !userId) {
      triggerError(); return;
    }

    try {
      await api.addExpense(userId, value, selectedCategory);
      WebApp.HapticFeedback.notificationOccurred('success');
      setIsHappy(true);
      setAmount('');
      loadData(userId);
      setTimeout(() => setIsHappy(false), 3000);
    } catch { triggerError(); }
  }

  // NEW: Функция удаления
  const handleDeleteTransaction = async (id: number) => {
    if (!userId) return;
    WebApp.HapticFeedback.impactOccurred('medium');
    try {
      await api.deleteTransaction(userId, id);
      loadData(userId); // Пересчитать всё
    } catch { triggerError(); }
  }

  const handleNumberClick = (num: string) => {
    WebApp.HapticFeedback.impactOccurred('light');
    if (amount.length >= 6) return;
    if (num === '.' && amount.includes('.')) return;
    setAmount(prev => prev + num)
    setIsError(false)
  }

  const handleDelete = () => {
    WebApp.HapticFeedback.impactOccurred('medium');
    setAmount(prev => prev.slice(0, -1))
    setIsError(false)
  }

  const triggerError = () => {
    WebApp.HapticFeedback.notificationOccurred('error');
    setIsError(true);
    setTimeout(() => setIsError(false), 500);
  }

  return (
    <div className="app-container">
      
      <div className="header-section">
        <motion.div 
          animate={
            isError ? { rotate: [0, -20, 20, 0] } :
            isHappy ? { scale: 1.1, y: [0, -10, 0] } : 
            { scale: 1, y: 0 }
          }
          className="neko-avatar"
        >
          {isError ? '🙀' : (isHappy ? '😻' : '😿')}
        </motion.div>
        
        {activeTab === 'input' ? (
           <motion.div className="amount-display">
             {amount || '0'} <span className="currency">₽</span>
           </motion.div>
        ) : (
          <div style={{fontSize: 24, color: '#6B4C75', fontWeight: 'bold', marginTop: 10}}>
            Ваши траты
          </div>
        )}
      </div>

      <div className={`content-area ${activeTab === 'stats' ? 'stats-mode' : ''}`}>
        
        {activeTab === 'input' ? (
          <>
            <div className="categories-wrapper">
              <div className="categories-scroll">
                {CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { 
                      setSelectedCategory(cat.id); 
                      WebApp.HapticFeedback.selectionChanged(); 
                    }}
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

            <NumPad 
              onNumberClick={handleNumberClick}
              onDelete={handleDelete}
              onConfirm={handleConfirm}
            />
          </>
        ) : (
          /* --- СТАТИСТИКА И ИСТОРИЯ --- */
          <div style={{ width: '100%', height: '100%', overflowY: 'auto', paddingRight: 5 }}>
            
            <StatsView data={statsData} total={totalSpent} />
            
            <div style={{ height: 1, background: '#F0F0F0', margin: '20px 0' }} />
            
            {/* Наш новый компонент списка */}
            <TransactionList 
              transactions={transactions} 
              onDelete={handleDeleteTransaction} 
            />
            
            {/* Отступ, чтобы список не прятался под меню */}
            <div style={{ height: 80 }} /> 
          </div>
        )}
      </div>

      <div className="bottom-tab-bar">
        <button 
          className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => { setActiveTab('input'); WebApp.HapticFeedback.selectionChanged(); }}
        >
          <div className="tab-icon-bg"><Plus size={24} /></div>
          <span>Ввод</span>
        </button>
        
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => { setActiveTab('stats'); WebApp.HapticFeedback.selectionChanged(); }}
        >
          <div className="tab-icon-bg"><LayoutGrid size={24} /></div>
          <span>Инфо</span>
        </button>
      </div>

    </div>
  )
}

export default App
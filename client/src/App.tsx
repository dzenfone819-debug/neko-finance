import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WebApp from '@twa-dev/sdk'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { NumPad } from './components/NumPad'
import { LayoutGrid, Plus, Wallet } from 'lucide-react'
import './App.css'

const API_URL = ''; 

// Яркие пастельные цвета
const COLORS = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'];

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'stats'>('input')
  const [amount, setAmount] = useState('')
  const [totalSpent, setTotalSpent] = useState(0)
  const [statsData, setStatsData] = useState<{name: string, value: number}[]>([])
  const [isHappy, setIsHappy] = useState(false)
  const [isError, setIsError] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  
  useEffect(() => {
    WebApp.ready();
    WebApp.expand(); // Просим телеграм развернуть на весь экран
    
    // Запрещаем скролл на уровне WebApp
    WebApp.enableClosingConfirmation(); 

    let currentUserId = 777; 
    if (WebApp.initDataUnsafe.user) {
      currentUserId = WebApp.initDataUnsafe.user.id;
    }
    setUserId(currentUserId);
    fetchBalance(currentUserId);
    fetchStats(currentUserId);
  }, [])

  const fetchBalance = async (uid: number) => {
    try {
      const response = await fetch(`${API_URL}/balance`, { headers: { 'x-user-id': uid.toString() } });
      const data = await response.json();
      setTotalSpent(data.total);
    } catch (e) { console.error(e) }
  }

  const fetchStats = async (uid: number) => {
    try {
      const response = await fetch(`${API_URL}/stats`, { headers: { 'x-user-id': uid.toString() } });
      const data = await response.json();
      setStatsData(data);
    } catch (e) { console.error(e) }
  }

  const handleConfirm = async () => {
    const value = parseFloat(amount);
    if (!amount || amount === '.' || isNaN(value) || value <= 0 || !userId) {
      triggerError(); return;
    }

    try {
      const response = await fetch(`${API_URL}/add-expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
        body: JSON.stringify({ amount: value }) 
      });

      if (response.ok) {
        WebApp.HapticFeedback.notificationOccurred('success');
        setIsHappy(true);
        setAmount('');
        fetchBalance(userId);
        fetchStats(userId);
        setTimeout(() => setIsHappy(false), 3000);
      } else { triggerError(); }
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
      
      {/* 1. ШАПКА: Кот и Баланс */}
      <div className="header-section">
        {/* Баланс только в шапке */}
        <div style={{ position: 'absolute', top: 15, right: 20, textAlign: 'right' }}>
          <span style={{ fontSize: 12, color: '#6B4C75', opacity: 0.7 }}>Потрачено</span>
          <div style={{ fontSize: 20, fontWeight: '800', color: '#6B4C75' }}>
            {totalSpent.toLocaleString()} ₽
          </div>
        </div>

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
        
        {/* Показываем вводимую сумму ТОЛЬКО на вкладке ввода */}
        {activeTab === 'input' ? (
           <motion.div className="amount-display">
             {amount || '0'} <span className="currency">₽</span>
           </motion.div>
        ) : (
          <div style={{fontSize: 18, color: '#6B4C75', fontWeight: 'bold'}}>
            Статистика
          </div>
        )}
      </div>

      {/* 2. КОНТЕНТ: Белая карточка с Numpad или Графиком */}
      <div className="content-area">
        
        {activeTab === 'input' ? (
          <NumPad 
            onNumberClick={handleNumberClick}
            onDelete={handleDelete}
            onConfirm={handleConfirm}
          />
        ) : (
          /* Экран статистики */
          <div className="stats-container">
            {statsData.length > 0 ? (
              <>
                {/* Сам График */}
                <div style={{ width: '100%', height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statsData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {statsData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `${value} ₽`}
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Текст в центре бублика */}
                  <div style={{ 
                    position: 'absolute', top: '110px', left: '0', right: '0', 
                    textAlign: 'center', pointerEvents: 'none', color: '#6B4C75', fontWeight: 'bold' 
                  }}>
                    {statsData.length} кат.
                  </div>
                </div>

                {/* Легенда (Список) снизу */}
                <div className="chart-legend">
                  {statsData.map((entry, index) => (
                    <div key={index} className="legend-item">
                      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        <div style={{width: 12, height: 12, borderRadius: '50%', background: COLORS[index % COLORS.length]}} />
                        <span>{entry.name === 'general' ? 'Разное' : entry.name}</span>
                      </div>
                      <span>{entry.value} ₽</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{textAlign: 'center', marginTop: 50, color: '#9E9E9E'}}>
                <Wallet size={48} style={{opacity: 0.3, marginBottom: 10}} />
                <p>Трат пока нет. <br/>Добавьте первый расход!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. НИЖНЕЕ МЕНЮ (Tab Bar) */}
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
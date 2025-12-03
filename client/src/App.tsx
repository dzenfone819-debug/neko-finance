import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WebApp from '@twa-dev/sdk'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts' // Библиотека графиков
import { NumPad } from './components/NumPad'
import { LayoutGrid, Plus } from 'lucide-react' // Иконки для меню
import './App.css'

const API_URL = ''; 

// Цвета для графика (пастельная палитра Neko)
const COLORS = ['#D291BC', '#FEC8D8', '#957DAD', '#E0BBE4', '#FFDFD3'];

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'stats'>('input') // Переключатель экранов
  const [amount, setAmount] = useState('')
  const [totalSpent, setTotalSpent] = useState(0)
  const [statsData, setStatsData] = useState<{name: string, value: number}[]>([]) // Данные для графика
  const [isHappy, setIsHappy] = useState(false)
  const [isError, setIsError] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  
  useEffect(() => {
    WebApp.ready();
    WebApp.expand();

    let currentUserId = 777; 
    if (WebApp.initDataUnsafe.user) {
      currentUserId = WebApp.initDataUnsafe.user.id;
    }
    setUserId(currentUserId);
    fetchBalance(currentUserId);
    fetchStats(currentUserId); // Загружаем статистику сразу
  }, [])

  const fetchBalance = async (uid: number) => {
    try {
      const response = await fetch(`${API_URL}/balance`, {
        headers: { 'x-user-id': uid.toString() }
      });
      const data = await response.json();
      setTotalSpent(data.total);
    } catch (error) { console.error(error); }
  }

  // Загрузка данных для графика
  const fetchStats = async (uid: number) => {
    try {
      const response = await fetch(`${API_URL}/stats`, {
        headers: { 'x-user-id': uid.toString() }
      });
      const data = await response.json();
      setStatsData(data);
    } catch (error) { console.error(error); }
  }

  const handleConfirm = async () => {
    const value = parseFloat(amount);
    if (!amount || amount === '.' || isNaN(value) || value <= 0 || !userId) {
      triggerError(); return;
    }

    try {
      const response = await fetch(`${API_URL}/add-expense`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId.toString() 
        },
        // Пока шлем категорию "general", позже добавим выбор
        body: JSON.stringify({ amount: value }) 
      });

      if (response.ok) {
        WebApp.HapticFeedback.notificationOccurred('success');
        setIsHappy(true);
        setAmount('');
        fetchBalance(userId);
        fetchStats(userId); // Обновляем график
        setTimeout(() => setIsHappy(false), 3000);
      } else { triggerError(); }
    } catch { triggerError(); }
  }

  // ... (Остальные функции handleNumberClick, handleDelete, triggerError такие же) ...
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
      {/* Шапка с Котом */}
      <div className="header-section">
        <div style={{ position: 'absolute', top: 20, right: 20, textAlign: 'right' }}>
          <span style={{ fontSize: 12, color: '#9E9E9E' }}>Всего:</span>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#6B4C75' }}>
            {totalSpent.toLocaleString()} ₽
          </div>
        </div>

        <motion.div 
          animate={
            isError ? { rotate: [0, -20, 20, 0] } :
            isHappy ? { scale: 1.2, y: [0, -20, 0] } : 
            { scale: 1, y: 0 }
          }
          className="neko-avatar"
        >
          {isError ? '🙀' : (isHappy ? '😻' : '😿')}
        </motion.div>
        
        {/* Показываем сумму только на экране ввода */}
        {activeTab === 'input' && (
           <motion.div className="amount-display">
             {amount || '0'} <span className="currency">₽</span>
           </motion.div>
        )}
      </div>

      {/* Основной контент (Меняется в зависимости от вкладки) */}
      <div className="content-area" style={{ flex: 1, width: '100%', padding: 20 }}>
        
        {activeTab === 'input' ? (
          <NumPad 
            onNumberClick={handleNumberClick}
            onDelete={handleDelete}
            onConfirm={handleConfirm}
          />
        ) : (
          /* Экран статистики */
          <div style={{ height: '300px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{color: '#6B4C75', marginBottom: 0}}>Структура трат</h3>
            
            {statsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statsData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{color: '#9E9E9E', marginTop: 50}}>Трат пока нет 😿</p>
            )}
            
            {/* Легенда */}
            <div style={{display: 'flex', gap: 10, fontSize: 14, color: '#6B4C75'}}>
               {statsData.map((entry, index) => (
                 <div key={index}>
                    <span style={{color: COLORS[index % COLORS.length]}}>●</span> {entry.name}
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>

      {/* Нижнее меню навигации */}
      <div className="bottom-menu">
        <button 
          className={`menu-btn ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          <Plus size={24} />
          <span>Ввод</span>
        </button>
        
        <button 
          className={`menu-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <LayoutGrid size={24} />
          <span>Инфо</span>
        </button>
      </div>

    </div>
  )
}

export default App
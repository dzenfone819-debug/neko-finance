import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WebApp from '@twa-dev/sdk'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { NumPad } from './components/NumPad'
// Убрали Wallet, чтобы не было ошибки
import { 
  LayoutGrid, Plus, Coffee, Car, Gamepad2, Zap, 
  Home, Bus, RefreshCcw, Divide, Armchair, Shirt, PiggyBank, ShoppingBasket 
} from 'lucide-react'
import './App.css'

const API_URL = ''; 

const COLORS = [
  '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', 
  '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFFFFC', '#E4C1F9', 
  '#D0F4DE', '#A9DEF9'
];

const CATEGORIES = [
  { id: 'groceries', name: 'Еда', icon: <ShoppingBasket size={20} />, color: '#CAFFBF' },
  { id: 'food', name: 'Кафе', icon: <Coffee size={20} />, color: '#FFADAD' },
  { id: 'transport', name: 'Трансп.', icon: <Car size={20} />, color: '#A0C4FF' },
  { id: 'commute', name: 'Проезд', icon: <Bus size={20} />, color: '#9BF6FF' },
  { id: 'mortgage', name: 'Ипотека', icon: <Home size={20} />, color: '#BDB2FF' },
  { id: 'bills', name: 'КУ', icon: <Zap size={20} />, color: '#FDFFB6' },
  { id: 'subs', name: 'Подписки', icon: <RefreshCcw size={20} />, color: '#E4C1F9' },
  { id: 'split', name: 'Сплит', icon: <Divide size={20} />, color: '#FFC6FF' },
  { id: 'home', name: 'Дом', icon: <Armchair size={20} />, color: '#FFD6A5' },
  { id: 'personal', name: 'Себе', icon: <Shirt size={20} />, color: '#D0F4DE' },
  { id: 'fun', name: 'Развл.', icon: <Gamepad2 size={20} />, color: '#A9DEF9' },
  { id: 'reserve', name: 'Резерв', icon: <PiggyBank size={20} />, color: '#FFFFFC' },
];

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'stats'>('input')
  const [selectedCategory, setSelectedCategory] = useState('groceries')
  const [amount, setAmount] = useState('')
  const [totalSpent, setTotalSpent] = useState(0)
  const [statsData, setStatsData] = useState<{name: string, value: number}[]>([])
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
        body: JSON.stringify({ amount: value, category: selectedCategory }) 
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

  const getCategoryName = (id: string) => {
    const cat = CATEGORIES.find(c => c.id === id);
    return cat ? cat.name : (id === 'general' ? 'Разное' : id);
  }

  return (
    <div className="app-container">
      
      {/* 1. ВЕРХ (Резиновый Кот) */}
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

      {/* 2. НИЗ (Белая карточка с контентом) */}
      <div className={`content-area ${activeTab === 'stats' ? 'stats-mode' : ''}`}>
        
        {activeTab === 'input' ? (
          <>
            {/* КАТЕГОРИИ */}
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

            {/* КЛАВИАТУРА */}
            <NumPad 
              onNumberClick={handleNumberClick}
              onDelete={handleDelete}
              onConfirm={handleConfirm}
            />
          </>
        ) : (
          /* СТАТИСТИКА */
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* --- ИСПРАВЛЕНИЕ ЗДЕСЬ: position: 'relative' --- */}
            <div style={{ width: '100%', height: '220px', flexShrink: 0, position: 'relative' }}>
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
                    {statsData.map((entry, index) => {
                      const cat = CATEGORIES.find(c => c.id === entry.name);
                      return <Cell key={`cell-${index}`} fill={cat ? cat.color : COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} ₽`} />
                </PieChart>
              </ResponsiveContainer>
              
              <div style={{ 
                    position: 'absolute', top: '90px', left: '0', right: '0', 
                    textAlign: 'center', pointerEvents: 'none', color: '#6B4C75', fontWeight: 'bold' 
              }}>
                Всего:<br/>{totalSpent} ₽
              </div>
            </div>

            <div style={{width: '100%', marginTop: 20}}>
              {statsData.map((entry, index) => {
                const cat = CATEGORIES.find(c => c.id === entry.name);
                const color = cat ? cat.color : COLORS[index % COLORS.length];
                return (
                  <div key={index} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '12px 0',
                    borderBottom: '1px solid #F0F0F0'
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                      <div style={{width: 12, height: 12, borderRadius: '50%', background: color}} />
                      <span style={{fontWeight: 600, color: '#2D3436'}}>{getCategoryName(entry.name)}</span>
                    </div>
                    <span style={{fontWeight: 700, color: '#6B4C75'}}>{entry.value} ₽</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. МЕНЮ */}
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
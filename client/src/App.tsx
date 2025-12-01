import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WebApp from '@twa-dev/sdk' // Импортируем мостик к Телеграму
import { NumPad } from './components/NumPad'
import './App.css'

const API_URL = ''; 

function App() {
  const [amount, setAmount] = useState('')
  const [totalSpent, setTotalSpent] = useState(0)
  const [isHappy, setIsHappy] = useState(false)
  const [isError, setIsError] = useState(false)
  
  useEffect(() => {
    // Сообщаем Телеграму, что приложение готово
    WebApp.ready();
    // Растягиваем на весь экран
    WebApp.expand();
    
    fetchBalance();
  }, [])

  const fetchBalance = async () => {
    try {
      const response = await fetch(`${API_URL}/balance`);
      const data = await response.json();
      setTotalSpent(data.total);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const handleNumberClick = (num: string) => {
    // 1. Легкая вибрация при клике (как на iPhone)
    WebApp.HapticFeedback.impactOccurred('light');

    if (amount.length >= 6) return;
    if (num === '.' && amount.includes('.')) return;
    
    setAmount(prev => prev + num)
    setIsError(false)
  }

  const handleDelete = () => {
    // Вибрация чуть пожестче при удалении
    WebApp.HapticFeedback.impactOccurred('medium');
    
    setAmount(prev => prev.slice(0, -1))
    setIsError(false)
  }

  const handleConfirm = async () => {
    const value = parseFloat(amount);

    if (!amount || amount === '.' || isNaN(value) || value <= 0) {
      triggerError();
      return;
    }

    try {
      const response = await fetch(`${API_URL}/add-expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value })
      });

      if (response.ok) {
        // 2. Вибрация УСПЕХА (приятная дрожь)
        WebApp.HapticFeedback.notificationOccurred('success');
        
        setIsHappy(true);
        setAmount('');
        fetchBalance();
        setTimeout(() => setIsHappy(false), 3000);
      } else {
        triggerError();
      }
    } catch (error) {
      triggerError();
    }
  }

  const triggerError = () => {
    // 3. Вибрация ОШИБКИ (двойной стук)
    WebApp.HapticFeedback.notificationOccurred('error');
    
    setIsError(true);
    setTimeout(() => setIsError(false), 500);
  }

  return (
    <div className="app-container">
      <div className="header-section">
        <div style={{ position: 'absolute', top: 20, right: 20, textAlign: 'right' }}>
          <span style={{ fontSize: 12, color: '#9E9E9E' }}>Всего потрачено:</span>
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
        
        <motion.div 
          className="amount-display"
          animate={isError ? { x: [0, -10, 10, -10, 10, 0], color: "#E74C3C" } : { x: 0, color: "#6B4C75" }}
        >
          {amount || '0'} 
          <span className="currency" style={{color: isError ? "#E74C3C" : "#D291BC"}}>₽</span>
        </motion.div>

        <p style={{color: isError ? '#E74C3C' : '#9E9E9E', marginTop: 5}}>
          {isError ? 'Ошибка!' : (isHappy ? 'Вкусно!' : 'Введите сумму расхода')}
        </p>
      </div>

      <div className="input-section">
        <NumPad 
          onNumberClick={handleNumberClick}
          onDelete={handleDelete}
          onConfirm={handleConfirm}
        />
      </div>
    </div>
  )
}

export default App
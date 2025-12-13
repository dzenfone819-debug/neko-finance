import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { CalendarHeatmap } from './CalendarHeatmap'
import { getBudgetPeriod } from '../utils/budgetPeriod'
import * as api from '../api/nekoApi'
import WebApp from '@twa-dev/sdk'

interface Transaction {
  id: number
  amount: number
  category: string
  date: string
  type: 'expense' | 'income'
}

interface CustomCategory {
  id: string
  name: string
  icon: string
  color: string
}

interface Props {
  transactions: Transaction[]
  currentMonth: Date
  customCategories?: CustomCategory[]
}

export const AnalyticsView: React.FC<Props> = ({ transactions, currentMonth, customCategories = [] }) => {
  const [activeSection, setActiveSection] = useState<'compare' | 'top5' | 'chart' | 'heatmap'>('compare')
  const [periodType, setPeriodType] = useState<'calendar_month' | 'custom_period'>('calendar_month')
  const [periodStartDay, setPeriodStartDay] = useState<number>(1)

  useEffect(() => {
    const loadBudgetPeriodSettings = async () => {
      try {
        const userId = WebApp.initDataUnsafe?.user?.id || 777
        const settings = await api.getBudgetPeriodSettings(userId)
        setPeriodType(settings.period_type)
        setPeriodStartDay(settings.period_start_day)
      } catch (error) {
        console.error('Failed to load budget period settings:', error)
      }
    }
    loadBudgetPeriodSettings()
  }, [])

  // Получаем границы текущего и предыдущего периодов
  const currentPeriod = getBudgetPeriod(currentMonth, periodType, periodStartDay)
  
  // Для предыдущего периода берем дату на месяц назад от текущей
  const prevMonthDate = new Date(currentMonth)
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
  const prevPeriod = getBudgetPeriod(prevMonthDate, periodType, periodStartDay)

  // Сравнение с прошлым периодом
  const getMonthComparison = () => {
    const currentMonthExpenses = transactions
      .filter(t => {
        const date = new Date(t.date)
        return t.type === 'expense' && 
               date >= currentPeriod.startDate && 
               date <= currentPeriod.endDate
      })
      .reduce((sum, t) => sum + t.amount, 0)

    const prevMonthExpenses = transactions
      .filter(t => {
        const date = new Date(t.date)
        return t.type === 'expense' && 
               date >= prevPeriod.startDate && 
               date <= prevPeriod.endDate
      })
      .reduce((sum, t) => sum + t.amount, 0)

    const diff = currentMonthExpenses - prevMonthExpenses
    const percentChange = prevMonthExpenses > 0 ? (diff / prevMonthExpenses) * 100 : 0

    return { currentMonthExpenses, prevMonthExpenses, diff, percentChange }
  }

  // Топ-5 самых дорогих покупок
  const getTop5Expenses = () => {
    return transactions
      .filter(t => {
        const date = new Date(t.date)
        return t.type === 'expense' && 
               date >= currentPeriod.startDate && 
               date <= currentPeriod.endDate
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }

  // График баланса по дням
  const getBalanceChartData = () => {
    const dailyData: { day: string; balance: number }[] = []
    let runningBalance = 0

    // Получаем все даты в текущем периоде
    const currentDate = new Date(currentPeriod.startDate)
    
    while (currentDate <= currentPeriod.endDate) {
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.date)
        return tDate.getFullYear() === currentDate.getFullYear() &&
               tDate.getMonth() === currentDate.getMonth() &&
               tDate.getDate() === currentDate.getDate()
      })

      dayTransactions.forEach(t => {
        if (t.type === 'income') runningBalance += t.amount
        else runningBalance -= t.amount
      })

      dailyData.push({ 
        day: `${currentDate.getDate()}/${currentDate.getMonth() + 1}`, 
        balance: runningBalance 
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return dailyData
  }

  const comparison = getMonthComparison()
  const top5 = getTop5Expenses()
  const chartData = getBalanceChartData()

  const getCategoryName = (id: string) => {
    // Проверяем кастомные категории
    const customCat = customCategories.find(c => c.id === id)
    if (customCat) return customCat.name
    
    const categories: Record<string, string> = {
      groceries: 'Продукты', transport: 'Транспорт', entertainment: 'Развлечения',
      utilities: 'Коммуналка', health: 'Здоровье', shopping: 'Покупки',
      cafe: 'Кафе', home: 'Дом', other: 'Прочее', salary: 'Зарплата',
      freelance: 'Фриланс', investment: 'Инвестиции'
    }
    return categories[id] || id
  }

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', paddingBottom: 80 }}>
      {/* Заголовок */}
      <div style={{ 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: 'var(--text-main)', 
        padding: '15px 20px',
        background: 'var(--bg-content)',
        borderBottom: '2px solid var(--border-color)'
      }}>
        📈 Аналитика
      </div>

      {/* Переключатель секций */}
      <div style={{ 
        display: 'flex', 
        gap: 10, 
        padding: '15px 20px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveSection('compare')}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: 'none',
            background: activeSection === 'compare' 
              ? 'linear-gradient(135deg, var(--primary) 0%, #D291BC 100%)'
              : 'var(--bg-input)',
            color: activeSection === 'compare' ? '#fff' : 'var(--text-main)',
            fontWeight: 'bold',
            fontSize: 14,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          📊 Сравнение
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveSection('top5')}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: 'none',
            background: activeSection === 'top5'
              ? 'linear-gradient(135deg, var(--primary) 0%, #D291BC 100%)'
              : 'var(--bg-input)',
            color: activeSection === 'top5' ? '#fff' : 'var(--text-main)',
            fontWeight: 'bold',
            fontSize: 14,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          💰 Топ-5
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveSection('chart')}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: 'none',
            background: activeSection === 'chart'
              ? 'linear-gradient(135deg, var(--primary) 0%, #D291BC 100%)'
              : 'var(--bg-input)',
            color: activeSection === 'chart' ? '#fff' : 'var(--text-main)',
            fontWeight: 'bold',
            fontSize: 14,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          📈 График
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveSection('heatmap')}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: 'none',
            background: activeSection === 'heatmap'
              ? 'linear-gradient(135deg, var(--primary) 0%, #D291BC 100%)'
              : 'var(--bg-input)',
            color: activeSection === 'heatmap' ? '#fff' : 'var(--text-main)',
            fontWeight: 'bold',
            fontSize: 14,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          🔥 Карта
        </motion.button>
      </div>

      {/* Контент */}
      <div style={{ padding: '0 20px' }}>
        {/* Сравнение периодов */}
        {activeSection === 'compare' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 20 }}
          >
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 16,
              padding: 20,
              border: '2px solid var(--border-color)',
              marginBottom: 20,
              boxShadow: '0 4px 12px var(--shadow-color)'
            }}>
              <div style={{ fontSize: 16, color: 'var(--text-main)', marginBottom: 15, fontWeight: 'bold' }}>
                Текущий месяц vs Прошлый
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Этот месяц</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-main)' }}>
                    {comparison.currentMonthExpenses.toLocaleString()}₽
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Прошлый</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    {comparison.prevMonthExpenses.toLocaleString()}₽
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 12,
                borderRadius: 12,
                background: comparison.percentChange > 0 
                  ? 'rgba(255, 107, 107, 0.1)' 
                  : 'rgba(39, 174, 96, 0.1)'
              }}>
                {comparison.percentChange > 0 ? (
                  <TrendingUp color="var(--accent-danger)" size={24} />
                ) : (
                  <TrendingDown color="var(--accent-success)" size={24} />
                )}
                <div>
                  <div style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold',
                    color: comparison.percentChange > 0 ? 'var(--accent-danger)' : 'var(--accent-success)'
                  }}>
                    {comparison.percentChange > 0 ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {Math.abs(comparison.diff).toLocaleString()}₽ {comparison.percentChange > 0 ? 'больше' : 'меньше'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Топ-5 покупок */}
        {activeSection === 'top5' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 20 }}
          >
            {top5.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: 40, 
                color: 'var(--text-secondary)',
                fontSize: 14 
              }}>
                Нет транзакций за этот месяц
              </div>
            ) : (
              top5.map((t, index) => (
                <motion.div
                  key={t.id}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background: 'var(--bg-card)',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    border: '2px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px var(--shadow-color)'
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: index === 0 
                      ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                      : 'linear-gradient(135deg, var(--primary) 0%, #D291BC 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: '#fff'
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: 'bold', marginBottom: 4 }}>
                      {getCategoryName(t.category)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {new Date(t.date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text-main)' }}>
                    {t.amount.toLocaleString()}₽
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* График баланса */}
        {activeSection === 'chart' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 20 }}
          >
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 16,
              padding: 20,
              border: '2px solid var(--border-color)',
              marginBottom: 20,
              boxShadow: '0 4px 12px var(--shadow-color)'
            }}>
              <div style={{ fontSize: 16, color: 'var(--text-main)', marginBottom: 15, fontWeight: 'bold' }}>
                График баланса
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="day" 
                    stroke="var(--text-secondary)"
                    style={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)"
                    style={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-content)',
                      border: '2px solid var(--border-color)',
                      borderRadius: 12,
                      fontSize: 12,
                      color: 'var(--text-main)'
                    }}
                    itemStyle={{ color: 'var(--text-main)' }}
                    formatter={(value: number) => [`${value.toLocaleString()}₽`, 'Баланс']}
                    labelFormatter={(label) => `День ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="var(--primary)" 
                    strokeWidth={3}
                    dot={{ fill: 'var(--bg-content)', stroke: 'var(--primary)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Тепловая карта */}
        {activeSection === 'heatmap' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 20 }}
          >
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 16,
              padding: 20,
              border: '2px solid var(--border-color)',
              marginBottom: 20,
              boxShadow: '0 4px 12px var(--shadow-color)'
            }}>
              <div style={{ fontSize: 16, color: 'var(--text-main)', marginBottom: 15, fontWeight: 'bold' }}>
                Тепловая карта расходов
              </div>
              <CalendarHeatmap 
                transactions={transactions}
                currentMonth={currentMonth.getMonth()}
                currentYear={currentMonth.getFullYear()}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

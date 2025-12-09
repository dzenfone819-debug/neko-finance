import { useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { CalendarHeatmap } from './CalendarHeatmap'

interface Transaction {
  id: number
  amount: number
  category: string
  date: string
  type: 'expense' | 'income'
}

interface Props {
  transactions: Transaction[]
  currentMonth: Date
}

export const AnalyticsView: React.FC<Props> = ({ transactions, currentMonth }) => {
  const [activeSection, setActiveSection] = useState<'compare' | 'top5' | 'chart' | 'heatmap'>('compare')

  // Сравнение с прошлым месяцем
  const getMonthComparison = () => {
    const currentMonthNum = currentMonth.getMonth()
    const currentYear = currentMonth.getFullYear()
    
    const currentMonthExpenses = transactions
      .filter(t => {
        const date = new Date(t.date)
        return t.type === 'expense' && 
               date.getMonth() === currentMonthNum && 
               date.getFullYear() === currentYear
      })
      .reduce((sum, t) => sum + t.amount, 0)

    const prevMonth = new Date(currentYear, currentMonthNum - 1, 1)
    const prevMonthExpenses = transactions
      .filter(t => {
        const date = new Date(t.date)
        return t.type === 'expense' && 
               date.getMonth() === prevMonth.getMonth() && 
               date.getFullYear() === prevMonth.getFullYear()
      })
      .reduce((sum, t) => sum + t.amount, 0)

    const diff = currentMonthExpenses - prevMonthExpenses
    const percentChange = prevMonthExpenses > 0 ? (diff / prevMonthExpenses) * 100 : 0

    return { currentMonthExpenses, prevMonthExpenses, diff, percentChange }
  }

  // Топ-5 самых дорогих покупок
  const getTop5Expenses = () => {
    const currentMonthNum = currentMonth.getMonth()
    const currentYear = currentMonth.getFullYear()
    
    return transactions
      .filter(t => {
        const date = new Date(t.date)
        return t.type === 'expense' && 
               date.getMonth() === currentMonthNum && 
               date.getFullYear() === currentYear
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }

  // График баланса по дням
  const getBalanceChartData = () => {
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    
    const dailyData: { day: number; balance: number }[] = []
    let runningBalance = 0

    for (let d = 1; d <= monthEnd.getDate(); d++) {
      const dayTransactions = transactions.filter(t => {
        const date = new Date(t.date)
        return date.getMonth() === currentMonth.getMonth() && 
               date.getFullYear() === currentMonth.getFullYear() &&
               date.getDate() === d
      })

      dayTransactions.forEach(t => {
        if (t.type === 'income') runningBalance += t.amount
        else runningBalance -= t.amount
      })

      dailyData.push({ day: d, balance: runningBalance })
    }

    return dailyData
  }

  const comparison = getMonthComparison()
  const top5 = getTop5Expenses()
  const chartData = getBalanceChartData()

  const getCategoryName = (id: string) => {
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
        color: '#6B4C75', 
        padding: '15px 20px',
        background: 'linear-gradient(135deg, #FFF 0%, #FFF5F8 100%)',
        borderBottom: '2px solid rgba(254, 200, 216, 0.3)'
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
              ? 'linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%)'
              : '#F0F0F0',
            color: activeSection === 'compare' ? '#fff' : '#6B4C75',
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
              ? 'linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%)'
              : '#F0F0F0',
            color: activeSection === 'top5' ? '#fff' : '#6B4C75',
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
              ? 'linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%)'
              : '#F0F0F0',
            color: activeSection === 'chart' ? '#fff' : '#6B4C75',
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
              ? 'linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%)'
              : '#F0F0F0',
            color: activeSection === 'heatmap' ? '#fff' : '#6B4C75',
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
              background: 'linear-gradient(135deg, #FFF 0%, #FFF5F8 100%)',
              borderRadius: 16,
              padding: 20,
              border: '2px solid rgba(254, 200, 216, 0.3)',
              marginBottom: 20
            }}>
              <div style={{ fontSize: 16, color: '#6B4C75', marginBottom: 15, fontWeight: 'bold' }}>
                Текущий месяц vs Прошлый
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 5 }}>Этот месяц</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#6B4C75' }}>
                    {comparison.currentMonthExpenses.toLocaleString()}₽
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 5 }}>Прошлый</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#999' }}>
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
                  <TrendingUp color="#FF6B6B" size={24} />
                ) : (
                  <TrendingDown color="#27AE60" size={24} />
                )}
                <div>
                  <div style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold',
                    color: comparison.percentChange > 0 ? '#FF6B6B' : '#27AE60'
                  }}>
                    {comparison.percentChange > 0 ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
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
                color: '#999',
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
                    background: 'linear-gradient(135deg, #FFF 0%, #FFF5F8 100%)',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    border: '2px solid rgba(254, 200, 216, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: index === 0 
                      ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                      : 'linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%)',
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
                    <div style={{ fontSize: 14, color: '#6B4C75', fontWeight: 'bold', marginBottom: 4 }}>
                      {getCategoryName(t.category)}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      {new Date(t.date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#6B4C75' }}>
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
              background: 'linear-gradient(135deg, #FFF 0%, #FFF5F8 100%)',
              borderRadius: 16,
              padding: 20,
              border: '2px solid rgba(254, 200, 216, 0.3)',
              marginBottom: 20
            }}>
              <div style={{ fontSize: 16, color: '#6B4C75', marginBottom: 15, fontWeight: 'bold' }}>
                График баланса
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#999"
                    style={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#999"
                    style={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '2px solid #FEC8D8',
                      borderRadius: 12,
                      fontSize: 12
                    }}
                    formatter={(value: number) => `${value.toLocaleString()}₽`}
                    labelFormatter={(label) => `День ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#D291BC" 
                    strokeWidth={3}
                    dot={{ fill: '#FEC8D8', strokeWidth: 2, r: 4 }}
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
              background: 'linear-gradient(135deg, #FFF 0%, #FFF5F8 100%)',
              borderRadius: 16,
              padding: 20,
              border: '2px solid rgba(254, 200, 216, 0.3)',
              marginBottom: 20
            }}>
              <div style={{ fontSize: 16, color: '#6B4C75', marginBottom: 15, fontWeight: 'bold' }}>
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

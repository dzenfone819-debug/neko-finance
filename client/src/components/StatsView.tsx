import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { CATEGORIES, COLORS, getCategoryName } from '../data/constants';

interface StatsViewProps {
  data: { name: string; value: number }[];
  total: number;
  transactions?: any[];
  budgetLimit?: number;
}

export const StatsView: React.FC<StatsViewProps> = ({ data, total, transactions = [], budgetLimit = 0 }) => {
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('month');

  // Кастомный Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const categoryId = payload[0].name;
      const value = payload[0].value;
      const categoryName = getCategoryName(categoryId);
      const currentTotal = periodTotal > 0 ? periodTotal : total;
      const percentage = ((value / currentTotal) * 100).toFixed(1);
      const cat = CATEGORIES.find(c => c.id === categoryId);
      const color = cat ? cat.color : COLORS[0];

      return (
        <div style={{
          background: 'rgba(255, 255, 255, 0.98)',
          border: `3px solid ${color}`,
          borderRadius: 12,
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            fontWeight: 'bold',
            color: '#6B4C75',
            fontSize: 14,
            marginBottom: 6
          }}>
            {categoryName}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: color
            }}>
              {value.toLocaleString()} ₽
            </span>
            <span style={{
              background: color,
              color: 'white',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 'bold'
            }}>
              {percentage}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Фильтрация транзакций по выбранному периоду
  const getFilteredTransactions = () => {
    const now = new Date();
    const filtered = transactions.filter(t => {
      const tDate = new Date(t.date);
      const diffTime = now.getTime() - tDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (timePeriod === 'day') return diffDays < 1;
      if (timePeriod === 'week') return diffDays < 7;
      return true; // month - все транзакции месяца
    });
    return filtered.filter(t => t.type === 'expense');
  };

  // Статистика по категориям для выбранного периода
  const getPeriodStats = () => {
    const filtered = getFilteredTransactions();
    const stats: Record<string, number> = {};
    filtered.forEach(t => {
      stats[t.category] = (stats[t.category] || 0) + t.amount;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  const periodData = getPeriodStats();
  const periodTotal = periodData.reduce((sum, item) => sum + item.value, 0);

  // Процент бюджета на категорию
  const getCategoryPercentage = (value: number) => {
    if (budgetLimit <= 0) return ((value / total) * 100).toFixed(1);
    return ((value / budgetLimit) * 100).toFixed(1);
  };

  // Средние расходы за неделю
  const getWeeklyAverage = () => {
    const now = new Date();
    const daysInMonth = now.getDate();
    const weeksElapsed = daysInMonth / 7;
    
    return weeksElapsed > 0 ? Math.round(total / weeksElapsed) : 0;
  };

  // Прогноз до конца месяца
  const getForecast = () => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = daysInMonth - currentDay;
    
    if (currentDay === 0) return total;
    
    const dailyAverage = total / currentDay;
    const forecast = total + (dailyAverage * daysRemaining);
    
    return Math.round(forecast);
  };

  const weeklyAvg = getWeeklyAverage();
  const forecast = getForecast();

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {data.length > 0 ? (
        <>
          {/* Заголовок с кнопкой экспорта */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            marginBottom: 16,
            paddingLeft: 10,
            paddingRight: 10
          }}>
            {/* Переключатель периода */}
            <div style={{
              display: 'flex',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: 12,
              padding: 4
            }}>
              {(['day', 'week', 'month'] as const).map((period) => (
                <motion.button
                  key={period}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTimePeriod(period)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: 8,
                    background: timePeriod === period ? '#667eea' : 'transparent',
                    color: timePeriod === period ? 'white' : '#6B4C75',
                    fontWeight: 'bold',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {period === 'day' ? 'День' : period === 'week' ? 'Неделя' : 'Месяц'}
                </motion.button>
              ))}
            </div>
          </div>

          {/* График */}
          <div style={{ width: '100%', height: '220px', flexShrink: 0, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={periodData.length > 0 ? periodData : data}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {(periodData.length > 0 ? periodData : data).map((entry, index) => {
                    const cat = CATEGORIES.find(c => c.id === entry.name);
                    return <Cell key={`cell-${index}`} fill={cat ? cat.color : COLORS[index % COLORS.length]} />;
                  })}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            <div style={{ 
                  position: 'absolute', top: '90px', left: '0', right: '0', 
                  textAlign: 'center', pointerEvents: 'none', color: '#6B4C75', fontWeight: 'bold',
                  zIndex: -1
            }}>
              Всего:<br/>{periodTotal > 0 ? periodTotal : total} ₽
            </div>
          </div>

          {/* Карточки с метриками */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            width: '100%',
            marginTop: 20,
            marginBottom: 20
          }}>
            {/* Средние расходы за неделю */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 12,
                padding: 16,
                color: 'white'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Calendar size={18} />
                <span style={{ fontSize: 11, opacity: 0.9 }}>В среднем/неделю</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 'bold' }}>{weeklyAvg.toLocaleString()} ₽</div>
            </motion.div>

            {/* Прогноз до конца месяца */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: 12,
                padding: 16,
                color: 'white'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TrendingUp size={18} />
                <span style={{ fontSize: 11, opacity: 0.9 }}>Прогноз месяца</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 'bold' }}>{forecast.toLocaleString()} ₽</div>
            </motion.div>
          </div>

          {/* Список с процентами от бюджета */}
          <div style={{width: '100%', marginTop: 10}}>
            <div style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: '#6B4C75',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <DollarSign size={18} />
              {budgetLimit > 0 ? '% от бюджета по категориям' : 'Распределение по категориям'}
            </div>
            {(periodData.length > 0 ? periodData : data).map((entry, index) => {
              const cat = CATEGORIES.find(c => c.id === entry.name);
              const color = cat ? cat.color : COLORS[index % COLORS.length];
              const percentage = getCategoryPercentage(entry.value);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid #F0F0F0'
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1}}>
                    <div style={{width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0}} />
                    <span style={{fontWeight: 600, color: '#2D3436', fontSize: 14}}>{getCategoryName(entry.name)}</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                    <span style={{
                      fontWeight: 700,
                      color: '#6B4C75',
                      fontSize: 14
                    }}>
                      {entry.value.toLocaleString()} ₽
                    </span>
                    <span style={{
                      background: 'rgba(102, 126, 234, 0.1)',
                      color: '#667eea',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 'bold',
                      minWidth: 48,
                      textAlign: 'center'
                    }}>
                      {percentage}%
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </>
      ) : (
        <div style={{textAlign: 'center', marginTop: 50, color: '#9E9E9E'}}>
          <Wallet size={48} style={{opacity: 0.3, marginBottom: 10}} />
          <p>Трат пока нет. <br/>Добавьте первый расход!</p>
        </div>
      )}
    </div>
  );
};
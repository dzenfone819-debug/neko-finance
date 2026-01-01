import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { CATEGORIES, COLORS, getCategoryName, getIconByName } from '../data/constants';
import { getBudgetPeriod } from '../utils/budgetPeriod';

interface CustomCategory {
  id: string
  name: string
  icon: string
  color: string
}

interface StatsViewProps {
  data: { name: string; value: number }[];
  total: number;
  transactions?: any[];
  budgetLimit?: number;
  customCategories?: CustomCategory[];
  categoryOverrides?: Record<string, any>;
  periodType?: 'calendar_month' | 'custom_period';
  periodStartDay?: number;
  currentMonth?: Date;
}

const RADIAN = Math.PI / 180;

export const StatsView: React.FC<StatsViewProps> = ({ data, total, transactions = [], budgetLimit = 0, customCategories = [], categoryOverrides = {}, periodType = 'calendar_month', periodStartDay = 1, currentMonth = new Date() }) => {
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('month');

  // Функция для получения названия категории с учетом кастомных
  const getDisplayCategoryName = (categoryId: string) => {
    const override = categoryOverrides?.[categoryId] || {};
    if (override.name) return override.name;
    const customCat = customCategories.find(c => c.id === categoryId);
    if (customCat) return customCat.name;
    return getCategoryName(categoryId);
  };

  const getCategoryIcon = (categoryId: string) => {
    const override = categoryOverrides?.[categoryId] || {};
    if (override.icon) return getIconByName(override.icon, 14);
    const customCat = customCategories.find(c => c.id === categoryId);
    if (customCat) {
      return getIconByName(customCat.icon, 14);
    }
    const cat = CATEGORIES.find(c => c.id === categoryId);
    // Standard icons are 20px, we might want smaller for label
    // If it's a React Element, we can return it.
    // However, for foreignObject or text, we might need adjustments.
    // @ts-ignore - Lucide icons accept size prop
    return cat ? React.cloneElement(cat.icon as React.ReactElement, { size: 14 }) : null;
  };

  const getCategoryColor = (categoryId: string, index: number) => {
    const override = categoryOverrides?.[categoryId] || {};
    if (override.color) return override.color;
    const customCat = customCategories.find(c => c.id === categoryId);
    if (customCat) return customCat.color;
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat ? cat.color : COLORS[index % COLORS.length];
  }

  // Кастомный Tooltip
  const CustomTooltip = ({ active, payload, coordinate }: any) => {
    if (active && payload && payload.length) {
      const categoryId = payload[0].name;
      const value = payload[0].value;
      const categoryName = getDisplayCategoryName(categoryId);
      const currentTotal = periodTotal > 0 ? periodTotal : total;
      const percentage = ((value / currentTotal) * 100).toFixed(1);
      const color = getCategoryColor(categoryId, 0);

      // Position the tooltip near the slice using coordinate.x / coordinate.y
      const left = Math.max(8, coordinate.x - 20);
      const top = Math.max(8, coordinate.y - 60);

      return (
        <div style={{
          position: 'absolute',
          left,
          top,
          background: 'var(--bg-content)',
          border: `2px solid ${color}`,
          borderRadius: 12,
          padding: '8px 12px',
          boxShadow: '0 4px 12px var(--shadow-color)',
          zIndex: 9999,
          opacity: 1,
          pointerEvents: 'auto'
        }}>
          <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: 13, marginBottom: 4 }}>
            {categoryName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
             <span style={{ fontSize: 14, fontWeight: 'bold', color: color }}>
              {value.toLocaleString()} ₽
            </span>
            <span style={{ background: color, color: 'white', padding: '1px 5px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>
              {percentage}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Фильтрация транзакций по выбранному периоду (Календарные дни)
  const getFilteredTransactions = () => {
    const now = new Date();
    
    // Начало сегодняшнего дня (00:00)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Начало текущей недели (Понедельник)
    const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);

    const filtered = transactions.filter(t => {
      const tDate = new Date(t.date);
      
      if (timePeriod === 'day') {
        return tDate >= startOfDay;
      }
      if (timePeriod === 'week') {
        return tDate >= startOfWeek;
      }
      return true; // month - все транзакции (уже отфильтрованы по месяцу в App.tsx)
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
    return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const periodData = getPeriodStats();
  const periodTotal = periodData.reduce((sum, item) => sum + item.value, 0);

  // Процент бюджета на категорию
  const getCategoryPercentage = (value: number) => {
    if (budgetLimit <= 0) return ((value / total) * 100).toFixed(1);
    return ((value / budgetLimit) * 100).toFixed(1);
  };

  //const getPercentageOfTotal = (value: number) => {
  //   const currentTotal = periodTotal > 0 ? periodTotal : total;
  //   if (currentTotal === 0) return 0;
  //   return (value / currentTotal) * 100;
  //}

  // Средние расходы за неделю
  const getWeeklyAverage = () => {
    const period = getBudgetPeriod(currentMonth, periodType, periodStartDay);
    const now = new Date();
    const daysSinceStart = Math.max(1, Math.floor((now.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const weeksElapsed = daysSinceStart / 7;
    return weeksElapsed > 0 ? Math.round(total / weeksElapsed) : 0;
  };

  // Прогноз до конца периода
  const getForecast = () => {
    const period = getBudgetPeriod(currentMonth, periodType, periodStartDay);
    const now = new Date();
    const daysSinceStart = Math.max(1, Math.floor((now.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const totalDaysInPeriod = Math.floor((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysRemaining = totalDaysInPeriod - daysSinceStart;
    if (daysSinceStart === 0) return total;
    const dailyAverage = total / daysSinceStart;
    const forecast = total + (dailyAverage * daysRemaining);
    return Math.round(forecast);
  };

  const weeklyAvg = getWeeklyAverage();
  const forecast = getForecast();

  // Custom Label for Pie Chart
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, percent, name } = props;
    if (percent < 0.04) return null; // Скрываем метки для секторов меньше 4%

    const radius = outerRadius * 1.35; // Выносим метку дальше
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Выравнивание текста в зависимости от стороны
    const textAnchor = x > cx ? 'start' : 'end';
    
    // Получаем иконку и цвет
    const icon = getCategoryIcon(name);
    const color = getCategoryColor(name, props.index);
    const percentValue = (percent * 100).toFixed(0) + '%';

    return (
      <g>
        {/* Линия от центра сегмента к метке */}
        <path
          d={`M${cx + outerRadius * Math.cos(-midAngle * RADIAN)},${cy + outerRadius * Math.sin(-midAngle * RADIAN)}L${x > cx ? x - 5 : x + 5},${y}`}
          stroke={color}
          strokeWidth={1}
          fill="none"
          opacity={0.5}
        />
        
        {/* Иконка в кружочке */}
        <foreignObject x={x > cx ? x : x - 22} y={y - 11} width={22} height={22}>
           <div style={{
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: 22, 
              height: 22,
              borderRadius: '50%',
              background: color,
              color: '#fff'
           }}>
             {icon}
           </div>
        </foreignObject>

        {/* Процент */}
        <text 
          x={x > cx ? x + 26 : x - 30} 
          y={y + 5} 
          fill={'var(--text-main)'} 
          textAnchor={textAnchor} 
          dominantBaseline="central"
          style={{ fontSize: '12px', fontWeight: '800' }}
        >
          {percentValue}
        </text>
      </g>
    );
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {data.length > 0 ? (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            marginBottom: 20,
            paddingLeft: 10,
            paddingRight: 10
          }}>
            <div style={{
              display: 'flex',
              gap: 4,
              background: 'var(--bg-input)',
              borderRadius: 14,
              padding: 4
            }}>
              {(['day', 'week', 'month'] as const).map((period) => (
                <motion.button
                  key={period}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setTimePeriod(period);
                    // Haptic feedback could be triggered here via props or global
                  }}
                  style={{
                    padding: '8px 20px',
                    border: 'none',
                    borderRadius: 10,
                    background: timePeriod === period ? 'var(--bg-card)' : 'transparent',
                    color: timePeriod === period ? 'var(--text-main)' : 'var(--text-secondary)',
                    fontWeight: '800',
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: timePeriod === period ? '0 2px 8px var(--shadow-color)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {period === 'day' ? 'День' : period === 'week' ? 'Неделя' : 'Месяц'}
                </motion.button>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', height: '260px', flexShrink: 0, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={periodData.length > 0 ? periodData : [{name: 'empty', value: 1}]}
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  label={periodData.length > 0 ? renderCustomizedLabel : undefined}
                  labelLine={false} 
                >
                  {(periodData.length > 0 ? periodData : [{name: 'empty', value: 1}]).map((entry, index) => {
                     if (entry.name === 'empty') return <Cell key="empty" fill="var(--bg-input)" />;
                     return <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name, index)} />;
                  })}
                </Pie>
                {periodData.length > 0 && <Tooltip content={<CustomTooltip />} />}
              </PieChart>
            </ResponsiveContainer>
            
            <div style={{ 
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  textAlign: 'center', pointerEvents: 'none', color: 'var(--text-main)', 
                  zIndex: 0
            }}>
              <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 700 }}>ВСЕГО</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{periodTotal.toLocaleString()}</div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            width: '100%',
            marginTop: 10,
            marginBottom: 20
          }}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 16,
                padding: 16,
                color: 'white',
                boxShadow: '0 4px 12px rgba(118, 75, 162, 0.3)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Calendar size={18} />
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>В среднем/неделю</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 'bold' }}>{weeklyAvg.toLocaleString()} ₽</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: 16,
                padding: 16,
                color: 'white',
                boxShadow: '0 4px 12px rgba(245, 87, 108, 0.3)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TrendingUp size={18} />
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>
                  {periodType === 'calendar_month' ? 'Прогноз месяца' : 'Прогноз периода'}
                </span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 'bold' }}>{forecast.toLocaleString()} ₽</div>
            </motion.div>
          </div>

          {/* Список с процентами от бюджета */}
          <div style={{width: '100%', marginTop: 10}}>
            <div style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: 'var(--text-main)',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <DollarSign size={18} />
              {budgetLimit > 0 ? '% от бюджета по категориям' : 'Распределение по категориям'}
            </div>
            {(periodData.length > 0 ? periodData : data).map((entry, index) => {
              const override = categoryOverrides?.[entry.name] || {};
              const cat = CATEGORIES.find(c => c.id === entry.name);
              const color = override.color || (cat ? cat.color : COLORS[index % COLORS.length]);
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
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: 15
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0}}>
                      <div style={{width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0}} />
                      <span className="stats-category-name" style={{fontWeight: 600, color: 'var(--text-main)', fontSize: 14}}>{getDisplayCategoryName(entry.name)}</span>
                    </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                    <span style={{
                      fontWeight: 700,
                      color: 'var(--text-main)',
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
        <div style={{textAlign: 'center', marginTop: 50, color: 'var(--text-secondary)'}}>
          <Wallet size={48} style={{opacity: 0.3, marginBottom: 10}} />
          <p style={{fontWeight: 'bold'}}>Трат пока нет. <br/>Добавьте первый расход!</p>
        </div>
      )}
    </div>
  );
};

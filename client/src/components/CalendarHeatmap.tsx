import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Transaction {
  id: number;
  amount: number;
  category: string;
  date: string;
  type?: 'expense' | 'income';
}

interface Props {
  transactions: Transaction[];
  currentMonth: number;
  currentYear: number;
}

export const CalendarHeatmap = ({ transactions, currentMonth, currentYear }: Props) => {
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [viewYear, setViewYear] = useState(currentYear);

  // Получаем данные о расходах по дням
  const dailyExpenses = useMemo(() => {
    const expenses: Record<string, number> = {};
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const date = new Date(t.date);
        if (date.getMonth() === viewMonth && date.getFullYear() === viewYear) {
          const day = date.getDate();
          expenses[day] = (expenses[day] || 0) + t.amount;
        }
      });
    
    return expenses;
  }, [transactions, viewMonth, viewYear]);

  // Находим максимальную сумму для нормализации цвета
  const maxExpense = useMemo(() => {
    const values = Object.values(dailyExpenses);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [dailyExpenses]);

  // Получаем цвет ячейки на основе суммы расходов
  const getColor = (amount: number) => {
    if (amount === 0) return 'var(--bg-input)';
    const intensity = amount / maxExpense;
    
    // For heatmap colors, we might want to keep the pink scale or adapt it slightly.
    // Let's keep the pink scale but make the "empty" or "low" values work in dark mode.
    // The previous implementation used light pinks which might look odd in dark mode.
    // We'll use CSS variables or a function that respects theme if needed,
    // but typically heatmaps use a distinct color scale.
    // For "no expense", 'var(--bg-input)' is good (greyish/dark in dark mode).

    if (intensity < 0.2) return '#FFF0F5'; // Very light pink
    if (intensity < 0.4) return '#FFD1E0';
    if (intensity < 0.6) return '#FFB3CC';
    if (intensity < 0.8) return '#FF94B8';
    return '#E75480'; // Strong pink
  };

  // Получаем количество дней в месяце
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Получаем день недели первого дня месяца (0 = воскресенье)
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Преобразуем в понедельник = 0

  // Создаем массив дней для отображения
  const calendarDays = [];
  
  // Пустые ячейки в начале
  for (let i = 0; i < adjustedFirstDay; i++) {
    calendarDays.push(null);
  }
  
  // Дни месяца
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div style={{ width: '100%', padding: '0 10px' }}>
      {/* Заголовок с навигацией */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handlePrevMonth}
          style={{
            background: 'var(--bg-input)',
            border: '2px solid var(--border-color)',
            borderRadius: 12,
            padding: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-main)',
          }}
        >
          <ChevronLeft size={20} />
        </motion.button>

        <div style={{
          fontSize: 16,
          fontWeight: 800,
          color: 'var(--text-main)',
        }}>
          {monthNames[viewMonth]} {viewYear}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleNextMonth}
          style={{
            background: 'var(--bg-input)',
            border: '2px solid var(--border-color)',
            borderRadius: 12,
            padding: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-main)',
          }}
        >
          <ChevronRight size={20} />
        </motion.button>
      </div>

      {/* Дни недели */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        marginBottom: 8,
      }}>
        {weekDays.map((day) => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-secondary)',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Календарная сетка */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
      }}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} style={{ aspectRatio: '1' }} />;
          }

          const expense = dailyExpenses[day] || 0;
          const color = getColor(expense);

          return (
            <motion.div
              key={day}
              whileTap={{ scale: 0.9 }}
              style={{
                aspectRatio: '1',
                background: color,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: expense > maxExpense * 0.5 ? 'white' : 'var(--text-main)', // Use text-main for lighter cells
                boxShadow: expense > 0 ? '0 2px 4px var(--shadow-color)' : 'none',
                cursor: expense > 0 ? 'pointer' : 'default',
              }}
            >
              <div>{day}</div>
              {expense > 0 && (
                <div style={{ fontSize: 9, opacity: 0.8 }}>
                  {Math.round(expense)}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Легенда */}
      <div style={{
        marginTop: 20,
        padding: 16,
        background: 'var(--bg-card)',
        borderRadius: 16,
        border: '2px solid var(--border-color)',
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: 10,
        }}>
          🎨 Легенда:
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          {[
            { color: 'var(--bg-input)', label: 'Нет' },
            { color: '#FFF0F5', label: 'Мало' },
            { color: '#FFD1E0', label: 'Средне' },
            { color: '#FFB3CC', label: 'Выше' },
            { color: '#FF94B8', label: 'Много' },
            { color: '#E75480', label: 'Макс' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: item.color,
                  borderRadius: 4,
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

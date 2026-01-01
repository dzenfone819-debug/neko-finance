import { useMemo } from 'react';
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
  onMonthChange?: (month: number, year: number) => void;
}

export const CalendarHeatmap = ({ transactions, currentMonth, currentYear, onMonthChange }: Props) => {
  // Use props directly for view state
  const viewMonth = currentMonth;
  const viewYear = currentYear;

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

  // Получаем уровень интенсивности (0-5)
  const getLevel = (amount: number) => {
    if (amount === 0) return 0;
    if (maxExpense === 0) return 0;
    
    const intensity = amount / maxExpense;
    if (intensity < 0.2) return 1;
    if (intensity < 0.4) return 2;
    if (intensity < 0.6) return 3;
    if (intensity < 0.8) return 4;
    return 5;
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
    let newMonth = viewMonth;
    let newYear = viewYear;
    if (viewMonth === 0) {
      newMonth = 11;
      newYear = viewYear - 1;
    } else {
      newMonth = viewMonth - 1;
    }
    if (onMonthChange) onMonthChange(newMonth, newYear);
  };

  const handleNextMonth = () => {
    let newMonth = viewMonth;
    let newYear = viewYear;
    if (viewMonth === 11) {
      newMonth = 0;
      newYear = viewYear + 1;
    } else {
      newMonth = viewMonth + 1;
    }
    if (onMonthChange) onMonthChange(newMonth, newYear);
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
          const level = getLevel(expense);

          return (
            <motion.div
              key={day}
              whileTap={{ scale: 0.9 }}
              className={`heatmap-cell-${level}`}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
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
            { level: 0, label: 'Нет' },
            { level: 1, label: 'Мало' },
            { level: 2, label: 'Средне' },
            { level: 3, label: 'Выше' },
            { level: 4, label: 'Много' },
            { level: 5, label: 'Макс' },
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
                className={`heatmap-cell-${item.level}`}
                style={{
                  width: 16,
                  height: 16,
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

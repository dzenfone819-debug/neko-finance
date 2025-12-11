/**
 * Утилиты для работы с бюджетными периодами
 */

export interface BudgetPeriod {
  startDate: Date
  endDate: Date
}

/**
 * Рассчитать бюджетный период на основе даты и настроек
 */
export function getBudgetPeriod(
  date: Date,
  periodType: 'calendar_month' | 'custom_period',
  startDay: number
): BudgetPeriod {
  const current = new Date(date)
  
  if (periodType === 'calendar_month') {
    // Обычный календарный месяц
    const year = current.getFullYear()
    const month = current.getMonth()
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0, 23, 59, 59)
    return { startDate, endDate }
  } else {
    // Кастомный период
    const year = current.getFullYear()
    const month = current.getMonth()
    const day = current.getDate()
    
    let periodStartDate: Date, periodEndDate: Date
    
    if (day >= startDay) {
      // Текущий период: startDay текущего месяца - (startDay-1) следующего месяца
      periodStartDate = new Date(year, month, startDay)
      periodEndDate = new Date(year, month + 1, startDay - 1, 23, 59, 59)
    } else {
      // Предыдущий период: startDay прошлого месяца - (startDay-1) текущего месяца
      periodStartDate = new Date(year, month - 1, startDay)
      periodEndDate = new Date(year, month, startDay - 1, 23, 59, 59)
    }
    
    return { startDate: periodStartDate, endDate: periodEndDate }
  }
}

/**
 * Форматировать дату в короткий формат для отображения
 */
export function formatPeriodDate(date: Date): string {
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  return `${date.getDate()} ${months[date.getMonth()]}`
}

/**
 * Получить название периода для отображения
 */
export function getPeriodLabel(
  date: Date,
  periodType: 'calendar_month' | 'custom_period',
  startDay: number
): string {
  const period = getBudgetPeriod(date, periodType, startDay)
  
  if (periodType === 'calendar_month') {
    // Для календарного месяца показываем просто название месяца
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  } else {
    // Для кастомного периода показываем месяц начала, день и год
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    const startMonth = months[period.startDate.getMonth()]
    const year = period.startDate.getFullYear()
    return `${startMonth} ${year} с ${startDay}-го`
  }
}

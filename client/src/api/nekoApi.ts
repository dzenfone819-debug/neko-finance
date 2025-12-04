const API_URL = '';

// Вспомогательная функция для добавления параметров
const getQuery = (month?: number, year?: number) => {
  if (month !== undefined && year !== undefined) {
    return `?month=${month}&year=${year}`; // +1 к месяцу не надо, будем передавать человеческий (1-12)
  }
  return '';
}

export const fetchBalance = async (userId: number, month?: number, year?: number) => {
  const query = getQuery(month, year);
  const response = await fetch(`${API_URL}/balance${query}`, { 
    headers: { 'x-user-id': userId.toString() } 
  });
  return await response.json(); 
};

export const fetchStats = async (userId: number, month?: number, year?: number) => {
  const query = getQuery(month, year);
  const response = await fetch(`${API_URL}/stats${query}`, { 
    headers: { 'x-user-id': userId.toString() } 
  });
  return await response.json();
};

export const fetchTransactions = async (userId: number, month?: number, year?: number) => {
  const query = getQuery(month, year);
  const response = await fetch(`${API_URL}/transactions${query}`, { 
    headers: { 'x-user-id': userId.toString() } 
  });
  return await response.json();
};

// ... Остальные функции (add, delete, settings, limits) без изменений ...
// (Обязательно оставь их!)
export const addTransaction = async (userId: number, amount: number, category: string, type: 'expense' | 'income') => {
  const response = await fetch(`${API_URL}/add-expense`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ amount, category, type }) 
  }); if (!response.ok) throw new Error('Failed to add'); return await response.json();
};
export const deleteTransaction = async (userId: number, transactionId: number) => {
  const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
    method: 'DELETE', headers: { 'x-user-id': userId.toString() }
  }); if (!response.ok) throw new Error('Failed to delete'); return true;
};
export const fetchBudget = async (userId: number) => {
  const response = await fetch(`${API_URL}/settings`, { headers: { 'x-user-id': userId.toString() } });
  const data = await response.json(); return data.budget || 0;
};
export const setBudget = async (userId: number, budget: number) => {
  const response = await fetch(`${API_URL}/settings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ budget }) 
  }); return await response.json();
};
export const fetchCategoryLimits = async (userId: number) => {
  const response = await fetch(`${API_URL}/limits`, { headers: { 'x-user-id': userId.toString() } });
  return await response.json();
};
export const setCategoryLimit = async (userId: number, category: string, limit: number) => {
  await fetch(`${API_URL}/limits`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ category, limit }) 
  });
};
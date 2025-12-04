const API_URL = '';

// Теперь возвращаем сложный объект, а не просто число
export const fetchBalance = async (userId: number) => {
  const response = await fetch(`${API_URL}/balance`, { 
    headers: { 'x-user-id': userId.toString() } 
  });
  // Возвращаем: { balance, total_expense, total_income }
  return await response.json(); 
};

// ... fetchStats, fetchTransactions без изменений ...
export const fetchStats = async (userId: number) => {
  const response = await fetch(`${API_URL}/stats`, { headers: { 'x-user-id': userId.toString() } });
  return await response.json();
};

export const fetchTransactions = async (userId: number) => {
  const response = await fetch(`${API_URL}/transactions`, { headers: { 'x-user-id': userId.toString() } });
  return await response.json();
};

// Добавить (Расход или Доход)
export const addTransaction = async (userId: number, amount: number, category: string, type: 'expense' | 'income') => {
  const response = await fetch(`${API_URL}/add-expense`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ amount, category, type }) 
  });
  if (!response.ok) throw new Error('Failed to add');
  return await response.json();
};

export const deleteTransaction = async (userId: number, transactionId: number) => {
  const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
    method: 'DELETE', headers: { 'x-user-id': userId.toString() }
  });
  if (!response.ok) throw new Error('Failed to delete');
  return true;
};

// ... Остальное (settings, limits) без изменений ...
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
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
export const addTransaction = async (userId: number, amount: number, category: string, type: 'expense' | 'income', accountId?: number, targetType: 'account' | 'goal' = 'account', date?: string) => {
  const payload = { amount, category, type, account_id: accountId, target_type: targetType, date };
  console.log('🔵 API addTransaction payload:', payload);
  const response = await fetch(`${API_URL}/add-expense`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify(payload) 
  }); 
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ API error response:', error);
    throw new Error('Failed to add: ' + error);
  }
  const result = await response.json();
  console.log('✅ API addTransaction result:', result);
  return result;
};
export const deleteTransaction = async (userId: number, transactionId: number) => {
  const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
    method: 'DELETE', headers: { 'x-user-id': userId.toString() }
  }); if (!response.ok) throw new Error('Failed to delete'); return true;
};

export const updateTransaction = async (userId: number, transactionId: number, amount: number, category: string, date: string, type: 'expense' | 'income') => {
  const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ amount, category, date, type })
  });
  if (!response.ok) throw new Error('Failed to update');
  return await response.json();
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

export const deleteCategoryLimit = async (userId: number, category: string) => {
  await fetch(`${API_URL}/limits/${category}`, {
    method: 'DELETE', 
    headers: { 'x-user-id': userId.toString() }
  });
};

// ========== КАСТОМНЫЕ КАТЕГОРИИ ==========

export const fetchCustomCategories = async (userId: number) => {
  const response = await fetch(`${API_URL}/custom-categories`, {
    headers: { 'x-user-id': userId.toString() }
  });
  return await response.json();
};

export const createCustomCategory = async (userId: number, name: string, icon: string, color: string, limit?: number) => {
  const response = await fetch(`${API_URL}/custom-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ name, icon, color, limit })
  });
  return await response.json();
};

export const deleteCustomCategory = async (userId: number, categoryId: string) => {
  const response = await fetch(`${API_URL}/custom-categories/${categoryId}`, {
    method: 'DELETE',
    headers: { 'x-user-id': userId.toString() }
  });
  return await response.json();
};

// ========== СЧЕТА ==========

export const fetchAccounts = async (userId: number) => {
  const response = await fetch(`${API_URL}/accounts`, { 
    headers: { 'x-user-id': userId.toString() } 
  });
  return await response.json();
};

export const createAccount = async (userId: number, name: string, balance: number, type: string, color: string) => {
  const response = await fetch(`${API_URL}/accounts`, {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ name, balance, type, color })
  });
  return await response.json();
};

export const updateAccount = async (userId: number, accountId: number, data: any) => {
  const response = await fetch(`${API_URL}/accounts/${accountId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify(data)
  });
  return await response.json();
};

export const deleteAccount = async (userId: number, accountId: number) => {
  const response = await fetch(`${API_URL}/accounts/${accountId}`, {
    method: 'DELETE',
    headers: { 'x-user-id': userId.toString() }
  });
  return await response.json();
};

// ========== КОПИЛКИ (SAVINGS GOALS) ==========

export const fetchGoals = async (userId: number) => {
  const response = await fetch(`${API_URL}/goals`, {
    headers: { 'x-user-id': userId.toString() }
  });
  return await response.json();
};

export const createGoal = async (userId: number, name: string, target_amount: number, color: string, icon: string) => {
  const response = await fetch(`${API_URL}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ name, target_amount, color, icon })
  });
  return await response.json();
};

export const updateGoal = async (userId: number, goalId: number, data: any) => {
  const response = await fetch(`${API_URL}/goals/${goalId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify(data)
  });
  return await response.json();
};

export const deleteGoal = async (userId: number, goalId: number) => {
  const response = await fetch(`${API_URL}/goals/${goalId}`, {
    method: 'DELETE',
    headers: { 'x-user-id': userId.toString() }
  });
  return await response.json();
};

// ========== СВЯЗАННЫЕ АККАУНТЫ ==========

export const linkAccount = async (userId: number, primaryUserId: number) => {
  const response = await fetch(`${API_URL}/link-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ primary_user_id: primaryUserId })
  });
  if (!response.ok) throw new Error('Failed to link account');
  return await response.json();
};

export const unlinkAccount = async (userId: number) => {
  const response = await fetch(`${API_URL}/unlink-account`, {
    method: 'DELETE',
    headers: { 'x-user-id': userId.toString() }
  });
  if (!response.ok) throw new Error('Failed to unlink account');
  return await response.json();
};

export const getLinkedAccounts = async (userId: number) => {
  const response = await fetch(`${API_URL}/linked-accounts`, {
    headers: { 'x-user-id': userId.toString() }
  });
  if (!response.ok) throw new Error('Failed to get linked accounts');
  return await response.json();
};

// ========== ПЕРЕВОДЫ ==========

export const transfer = async (userId: number, from_type: string, from_id: number, to_type: string, to_id: number, amount: number, description?: string) => {
  const response = await fetch(`${API_URL}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ from_type, from_id, to_type, to_id, amount, description })
  });
  return await response.json();
};

export const logToServer = async (message: string, data?: any) => {
  try {
    await fetch(`${API_URL}/log-client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, data })
    });
  } catch (e) {
    console.error('Failed to log to server:', e);
  }
};

export const fetchTotalBalance = async (userId: number) => {
  const response = await fetch(`${API_URL}/total-balance`, {
    headers: { 'x-user-id': userId.toString() }
  });
  return await response.json();
};

export const resetAllData = async (userId: number) => {
  const response = await fetch(`${API_URL}/reset-all-data`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-user-id': userId.toString() 
    },
    body: JSON.stringify({})
  });
  if (!response.ok) {
    throw new Error('Failed to reset data');
  }
  return await response.json();
};
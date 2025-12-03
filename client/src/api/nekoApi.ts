const API_URL = ''; // Относительный путь

export const fetchBalance = async (userId: number) => {
  const response = await fetch(`${API_URL}/balance`, { 
    headers: { 'x-user-id': userId.toString() } 
  });
  const data = await response.json();
  return data.total;
};

export const fetchStats = async (userId: number) => {
  const response = await fetch(`${API_URL}/stats`, { 
    headers: { 'x-user-id': userId.toString() } 
  });
  return await response.json();
};

export const addExpense = async (userId: number, amount: number, category: string) => {
  const response = await fetch(`${API_URL}/add-expense`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'x-user-id': userId.toString() 
    },
    body: JSON.stringify({ amount, category }) 
  });
  
  if (!response.ok) throw new Error('Failed to add expense');
  return await response.json();
};
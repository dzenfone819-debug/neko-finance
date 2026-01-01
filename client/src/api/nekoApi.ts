// ... (Existing code) ...
const API_URL = '';

const getQuery = (month?: number, year?: number) => {
  if (month !== undefined && year !== undefined) {
    return `?month=${month}&year=${year}`;
  }
  return '';
}

// ... (Other functions unchanged) ...
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

export const fetchTransactions = async (userId: number, month?: number, year?: number, limit?: number, offset?: number, forceCalendarMode?: boolean) => {
  let query = getQuery(month, year);
  if (limit !== undefined) {
    query += query ? `&limit=${limit}` : `?limit=${limit}`;
  }
  if (offset !== undefined) {
    query += query ? `&offset=${offset}` : `?offset=${offset}`;
  }
  if (forceCalendarMode) {
    query += query ? `&force_calendar_mode=true` : `?force_calendar_mode=true`;
  }
  const response = await fetch(`${API_URL}/transactions${query}`, { 
    headers: { 'x-user-id': userId.toString() } 
  });
  return await response.json();
};

export const addTransaction = async (
  userId: number, 
  amount: number, 
  category: string, 
  type: 'expense' | 'income', 
  accountId?: number, 
  targetType: 'account' | 'goal' = 'account', 
  date?: string,
  note?: string,
  tags?: string[],
  photo_urls?: string[]
) => {
  const payload = { amount, category, type, account_id: accountId, target_type: targetType, date, note, tags, photo_urls };
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
  return await response.json();
};

export const uploadFile = async (file: File) => {
  // Compress images in-browser before upload to reduce traffic and server load
  const compressImage = async (input: File, maxWidth = 1280, quality = 0.7): Promise<File> => {
    try {
      if (!input.type.startsWith('image/')) return input;

      // createImageBitmap is faster and more memory efficient when available
      const bitmap = await createImageBitmap(input);
      let { width, height } = bitmap;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = Math.round(maxWidth);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return input;
      ctx.drawImage(bitmap, 0, 0, width, height);

      // Detect WebP support
      const supportsWebP = (() => {
        try {
          const c = document.createElement('canvas');
          return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        } catch (e) {
          return false;
        }
      })();

      const mime = supportsWebP ? 'image/webp' : input.type;

      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, mime, quality));
      if (!blob) return input;

      const ext = input.name.includes('.') ? input.name.substring(input.name.lastIndexOf('.')) : '';
      const newName = supportsWebP ? input.name.replace(ext, '.webp') : input.name;
      return new File([blob], newName, { type: mime });
    } catch (e) {
      // If anything fails, return original
      return input;
    }
  };

  const fileToUpload = await compressImage(file, 1280, 0.7);

  const formData = new FormData();
  formData.append('file', fileToUpload);

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }
  return await response.json(); // returns { url: ... }
};

export const deleteTransaction = async (userId: number, transactionId: number) => {
  const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
    method: 'DELETE', headers: { 'x-user-id': userId.toString() }
  }); if (!response.ok) throw new Error('Failed to delete'); return true;
};

export const updateTransaction = async (userId: number, transactionId: number, amount: number, category: string, date: string, type: 'expense' | 'income', note?: string, tags?: string[], photo_urls?: string[]) => {
  const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ amount, category, date, type, note, tags, photo_urls })
  });
  if (!response.ok) throw new Error('Failed to update');
  return await response.json();
};

// ... (Rest of the file unchanged) ...

export const fetchBudget = async (userId: number, month?: number, year?: number) => {
  const query = getQuery(month, year);
  const response = await fetch(`${API_URL}/settings${query}`, { headers: { 'x-user-id': userId.toString() } });
  const data = await response.json(); return data.budget || 0;
};
export const setBudget = async (userId: number, budget: number, month?: number, year?: number) => {
  const response = await fetch(`${API_URL}/settings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ budget, month, year }) 
  }); return await response.json();
};
export const fetchCategoryLimits = async (userId: number, month?: number, year?: number) => {
  const query = getQuery(month, year);
  const response = await fetch(`${API_URL}/limits${query}`, { headers: { 'x-user-id': userId.toString() } });
  return await response.json();
};
export const setCategoryLimit = async (userId: number, category: string, limit: number, month?: number, year?: number) => {
  await fetch(`${API_URL}/limits`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ category, limit, month, year }) 
  });
};

export const deleteCategoryLimit = async (userId: number, category: string) => {
  const response = await fetch(`${API_URL}/limits/${encodeURIComponent(category)}`, {
    method: 'DELETE',
    headers: { 'x-user-id': userId.toString() }
  });
  if (!response.ok) throw new Error('Failed to delete category limit');
  return await response.json();
};

export const fetchCustomCategories = async (userId: number) => {
  const response = await fetch(`${API_URL}/custom-categories`, {
    headers: { 'x-user-id': userId.toString() }
  });
  return await response.json();
};

export const fetchCategoryOverrides = async (userId: number) => {
  const response = await fetch(`${API_URL}/category-overrides`, {
    headers: { 'x-user-id': userId.toString() }
  });
  if (!response.ok) return {};
  return await response.json();
};

export const setCategoryOverride = async (userId: number, categoryId: string, data: any) => {
  const response = await fetch(`${API_URL}/category-overrides/${encodeURIComponent(categoryId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify(data)
  });
  return await response.json();
};

export const deleteCategoryOverride = async (userId: number, categoryId: string) => {
  const response = await fetch(`${API_URL}/category-overrides/${encodeURIComponent(categoryId)}`, {
    method: 'DELETE',
    headers: { 'x-user-id': userId.toString() }
  });
  return await response.json();
};

export const createCustomCategory = async (userId: number, name: string, icon: string, color: string, limit?: number, type: 'expense' | 'income' = 'expense') => {
  const response = await fetch(`${API_URL}/custom-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId.toString() },
    body: JSON.stringify({ name, icon, color, limit, type })
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

export const getBudgetPeriodSettings = async (userId: number) => {
  const response = await fetch(`${API_URL}/budget-period-settings`, {
    headers: { 'x-user-id': userId.toString() }
  });
  return await response.json();
};

export const setBudgetPeriodSettings = async (
  userId: number,
  periodType: 'calendar_month' | 'custom_period',
  periodStartDay: number
) => {
  const response = await fetch(`${API_URL}/budget-period-settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId.toString()
    },
    body: JSON.stringify({
      period_type: periodType,
      period_start_day: periodStartDay
    })
  });
  if (!response.ok) {
    throw new Error('Failed to save budget period settings');
  }
  return await response.json();
};

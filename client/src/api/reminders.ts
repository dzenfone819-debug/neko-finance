const API_URL = import.meta.env.VITE_API_URL || '';

export interface Reminder {
  id: number;
  user_id: number;
  title: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  time: string;
  start_date: string | null;
  end_date: string | null;
  is_active: number;
  last_sent: string | null;
  timezone_offset: number;
  created_at: string;
}

const getHeaders = (userId: number | null) => ({
  'Content-Type': 'application/json',
  'x-user-id': userId ? userId.toString() : '0'
});

export const fetchReminders = async (userId: number): Promise<Reminder[]> => {
  const response = await fetch(`${API_URL}/reminders`, { headers: getHeaders(userId) });
  if (!response.ok) throw new Error('Failed to fetch reminders');
  return response.json();
};

export const createReminder = async (userId: number, reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'last_sent' | 'is_active'>) => {
  const response = await fetch(`${API_URL}/reminders`, {
    method: 'POST',
    headers: getHeaders(userId),
    body: JSON.stringify(reminder)
  });
  if (!response.ok) throw new Error('Failed to create reminder');
  return response.json();
};

export const updateReminder = async (userId: number, id: number, updates: Partial<Reminder>) => {
  const response = await fetch(`${API_URL}/reminders/${id}`, {
    method: 'PUT',
    headers: getHeaders(userId),
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update reminder');
  return response.json();
};

export const deleteReminder = async (userId: number, id: number) => {
  const headers = {
    'x-user-id': userId ? userId.toString() : '0'
  };
  const response = await fetch(`${API_URL}/reminders/${id}`, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) throw new Error('Failed to delete reminder');
  return response.json();
};

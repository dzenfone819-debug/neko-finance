import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { ReminderItem } from './ReminderItem';
import { ReminderForm } from './ReminderForm';
import * as api from '../../api/reminders';
import type { Reminder } from '../../api/reminders';

interface Props {
  userId: number;
  onBack: () => void;
}

export const RemindersList: React.FC<Props> = ({ userId, onBack }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    loadReminders();
  }, [userId]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const data = await api.fetchReminders(userId);
      setReminders(data);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Partial<Reminder>) => {
    try {
      await api.createReminder(userId, data as any);
      WebApp.HapticFeedback.notificationOccurred('success');
      loadReminders();
    } catch (error) {
      console.error(error);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  const handleUpdate = async (data: Partial<Reminder>) => {
    if (!editingReminder) return;
    try {
      await api.updateReminder(userId, editingReminder.id, data);
      WebApp.HapticFeedback.notificationOccurred('success');
      loadReminders();
    } catch (error) {
      console.error(error);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить напоминание?')) return;
    try {
      await api.deleteReminder(userId, id);
      WebApp.HapticFeedback.notificationOccurred('success');
      loadReminders();
    } catch (error) {
      console.error(error);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await api.updateReminder(userId, id, { is_active: isActive ? 1 : 0 });
      WebApp.HapticFeedback.impactOccurred('light');
      // Optimistic update
      setReminders(prev => prev.map(r => r.id === id ? { ...r, is_active: isActive ? 1 : 0 } : r));
    } catch (error) {
      console.error(error);
      loadReminders(); // Revert on error
    }
  };

  return (
    <div style={{ height: '100%', padding: '20px 15px', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 25 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            WebApp.HapticFeedback.selectionChanged();
            onBack();
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 5,
            cursor: 'pointer',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft size={24} />
        </motion.button>
        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: 22 }}>Напоминания</h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          Загрузка...
        </div>
      ) : reminders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-secondary)',
          background: 'var(--bg-card)',
          borderRadius: 24,
          boxShadow: '0 4px 12px var(--shadow-color)'
        }}>
          <div style={{ fontSize: 40, marginBottom: 15 }}>🔔</div>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>Нет напоминаний</h3>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>
            Создайте свое первое напоминание, чтобы не забыть о важных платежах.
          </p>
        </div>
      ) : (
        <div>
          {reminders.map(reminder => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onEdit={(r) => {
                setEditingReminder(r);
                setIsFormOpen(true);
              }}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* FAB Add Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          WebApp.HapticFeedback.impactOccurred('medium');
          setEditingReminder(null);
          setIsFormOpen(true);
        }}
        style={{
          position: 'fixed',
          bottom: 100,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 100
        }}
      >
        <Plus size={28} />
      </motion.button>

      <ReminderForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={editingReminder ? handleUpdate : handleCreate}
        initialData={editingReminder}
      />
    </div>
  );
};

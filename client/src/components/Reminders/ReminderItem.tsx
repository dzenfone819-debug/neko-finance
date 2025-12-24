import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Repeat, Trash2, Edit2, Clock } from 'lucide-react';
import type { Reminder } from '../../api/reminders';
import WebApp from '@twa-dev/sdk';

interface Props {
  reminder: Reminder;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, isActive: boolean) => void;
}

export const ReminderItem: React.FC<Props> = ({ reminder, onEdit, onDelete, onToggle }) => {
  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'once': return 'Один раз';
      case 'daily': return 'Ежедневно';
      case 'weekly': return 'Еженедельно';
      case 'monthly': return 'Ежемесячно';
      default: return freq;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      style={{
        background: 'var(--bg-card)',
        borderRadius: 16,
        padding: '16px',
        marginBottom: 12,
        boxShadow: '0 2px 8px var(--shadow-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            background: reminder.is_active ? 'var(--primary)' : 'var(--bg-input)',
            padding: 10,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: reminder.is_active ? 'white' : 'var(--text-secondary)'
          }}>
            <Bell size={20} />
          </div>
          <div>
            <div style={{ 
              fontSize: 16, 
              fontWeight: 'bold', 
              color: reminder.is_active ? 'var(--text-main)' : 'var(--text-secondary)',
              textDecoration: !reminder.is_active ? 'line-through' : 'none'
            }}>
              {reminder.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              <Clock size={13} />
              <span>{reminder.time}</span>
              <span style={{ opacity: 0.5 }}>|</span>
              <Repeat size={13} />
              <span>{getFrequencyLabel(reminder.frequency)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              WebApp.HapticFeedback.impactOccurred('light');
              onToggle(reminder.id, !reminder.is_active);
            }}
            style={{
              padding: 8,
              borderRadius: 8,
              border: 'none',
              background: 'var(--bg-input)',
              color: reminder.is_active ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            {reminder.is_active ? 'Вкл' : 'Выкл'}
          </motion.button>
        </div>
      </div>

      <div style={{ 
        height: 1, 
        background: 'var(--border-color)',
        opacity: 0.5
      }} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            WebApp.HapticFeedback.impactOccurred('light');
            onEdit(reminder);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--bg-input)',
            color: 'var(--text-main)',
            fontSize: 13,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer'
          }}
        >
          <Edit2 size={14} />
          Изменить
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            WebApp.HapticFeedback.impactOccurred('medium');
            onDelete(reminder.id);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'rgba(231, 76, 60, 0.1)',
            color: '#E74C3C',
            fontSize: 13,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer'
          }}
        >
          <Trash2 size={14} />
          Удалить
        </motion.button>
      </div>
    </motion.div>
  );
};

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '../Modal';
import WebApp from '@twa-dev/sdk';
import type { Reminder } from '../../api/reminders';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminder: Partial<Reminder>) => Promise<void>;
  initialData?: Reminder | null;
}

export const ReminderForm: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setTime(initialData.time);
      setFrequency(initialData.frequency);
      setStartDate(initialData.start_date ? initialData.start_date.split('T')[0] : '');
      setEndDate(initialData.end_date ? initialData.end_date.split('T')[0] : '');
    } else {
      setTitle('');
      setTime('09:00');
      setFrequency('once');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async () => {
    if (!title || !time) return;

    WebApp.HapticFeedback.impactOccurred('light');

    const timezone_offset = new Date().getTimezoneOffset();

    await onSave({
      title,
      time,
      frequency,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      timezone_offset
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Редактировать напоминание' : 'Новое напоминание'}
    >
      <div className="modal-body">
        <label className="modal-label">Название</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: Оплатить интернет"
          className="modal-input"
        />

        <div style={{ marginTop: 12 }}>
          <label className="modal-label">Время</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="modal-input"
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="modal-label">Частота</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'once', label: 'Один раз' },
              { id: 'daily', label: 'Ежедневно' },
              { id: 'weekly', label: 'Еженедельно' },
              { id: 'monthly', label: 'Ежемесячно' }
            ].map((opt) => (
              <motion.button
                key={opt.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFrequency(opt.id as any)}
                style={{
                  flex: 1,
                  minWidth: '45%',
                  padding: '10px',
                  background: frequency === opt.id ? 'var(--primary)' : 'var(--bg-input)',
                  color: frequency === opt.id ? 'white' : 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {opt.label}
              </motion.button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="modal-label">Дата начала</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="modal-input"
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="modal-label">Дата окончания (опц.)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="modal-input"
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          className="modal-submit-button"
          style={{ marginTop: 24 }}
        >
          {initialData ? 'Сохранить изменения' : 'Создать напоминание'}
        </motion.button>
      </div>
    </Modal>
  );
};

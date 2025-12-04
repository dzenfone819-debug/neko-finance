import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  title: string;
  initialValue: number;
  onSave: (value: number) => void;
  onClose: () => void;
}

export const ModalInput: React.FC<Props> = ({ isOpen, title, initialValue, onSave, onClose }) => {
  const [value, setValue] = useState('');

  // При открытии окна подставляем текущее значение
  useEffect(() => {
    if (isOpen) setValue(initialValue > 0 ? initialValue.toString() : '');
  }, [isOpen, initialValue]);

  const handleSave = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onSave(num);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Затемнение фона */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 1000,
              backdropFilter: 'blur(3px)'
            }}
          />

          {/* Само окно */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            style={{
              position: 'fixed', top: '35%', left: '10%', right: '10%',
              background: 'white', padding: 25, borderRadius: 24,
              zIndex: 1001, boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column', gap: 15
            }}
          >
            <h3 style={{ margin: 0, color: '#6B4C75', textAlign: 'center' }}>{title}</h3>
            
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0 ₽"
              autoFocus
              style={{
                fontSize: 24, padding: 10, borderRadius: 12,
                border: '2px solid #FEC8D8', outline: 'none',
                textAlign: 'center', color: '#6B4C75', fontWeight: 'bold'
              }}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, border: 'none',
                  background: '#F0F0F0', color: '#6B4C75', fontWeight: 'bold',
                  fontSize: 16
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, border: 'none',
                  background: '#D291BC', color: 'white', fontWeight: 'bold',
                  fontSize: 16
                }}
              >
                Сохранить
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
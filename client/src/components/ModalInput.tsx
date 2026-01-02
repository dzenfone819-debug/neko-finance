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
  const [error, setError] = useState('');

  // При открытии окна подставляем текущее значение
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue > 0 ? initialValue.toString() : '');
      setError('');
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      setError('Введите корректную положительную сумму');
      return;
    }
    onSave(num);
    onClose();
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
              background: 'var(--modal-overlay)', zIndex: 1000,
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
              background: 'var(--bg-card)',
              padding: 30, borderRadius: 24,
              zIndex: 1001, boxShadow: '0 20px 60px var(--shadow-color)',
              display: 'flex', flexDirection: 'column', gap: 20,
              border: '2px solid var(--border-color)'
            }}
          >
            <h3 style={{ 
              margin: 0, 
              background: 'linear-gradient(135deg, var(--primary) 0%, #FEC8D8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: 'center',
              fontSize: 20,
              fontWeight: 'bold'
            }}>{title}</h3>
            
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => {
                  const val = e.target.value;
                  setError('');
                  
                  // Разрешаем пустое значение (опционально)
                  if (val === '') {
                    setValue(val);
                    return;
                  }
                  
                  // Проверка на минус
                  if (val.includes('-')) {
                    setError('Бюджет не может быть отрицательным');
                    return;
                  }
                  
                  // Проверка на недопустимые символы
                  const onlyDigitsAndDot = /^[0-9.]+$/;
                  if (!onlyDigitsAndDot.test(val)) {
                    setError('Введите корректное число');
                    return;
                  }
                  
                  // Проверка на несколько точек
                  if ((val.match(/\./g) || []).length > 1) {
                    setError('Введите корректное число');
                    return;
                  }
                  
                  // Проверка на знаки после запятой
                  const parts = val.split('.');
                  if (parts.length === 2 && parts[1].length > 2) {
                    setError('Максимум 2 знака после запятой');
                    return;
                  }
                  
                  const num = parseFloat(val);
                  
                  // Проверка на NaN
                  if (isNaN(num)) {
                    setError('Введите корректное число');
                    return;
                  }
                  
                  // Если все проверки пройдены
                  setValue(val);
                }}
                placeholder="0"
                autoFocus
                style={{
                  fontSize: 32, 
                  padding: '16px 20px', 
                  borderRadius: 16,
                  border: error ? '2px solid #F87171' : '2px solid var(--border-color)', 
                  outline: 'none',
                  textAlign: 'center', 
                  color: 'var(--text-main)', 
                  fontWeight: 'bold',
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--bg-input)',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px var(--shadow-color)'
                }}
                onFocus={(e) => e.target.style.borderColor = error ? '#F87171' : 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = error ? '#F87171' : 'var(--border-color)'}
              />
              <span style={{
                position: 'absolute',
                right: 24,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 24,
                color: 'var(--primary)',
                fontWeight: 'bold',
                pointerEvents: 'none'
              }}>₽</span>
            </div>
            
            {error && (
              <div style={{
                color: '#F87171',
                fontSize: 13,
                textAlign: 'center',
                marginTop: -10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                style={{
                  flex: 1, 
                  padding: 14, 
                  borderRadius: 14, 
                  border: '2px solid var(--border-color)',
                  background: 'var(--bg-input)', 
                  color: 'var(--text-main)', 
                  fontWeight: 'bold',
                  fontSize: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
              >
                Отмена
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                style={{
                  flex: 1, 
                  padding: 14, 
                  borderRadius: 14, 
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--primary) 0%, #D291BC 100%)', 
                  color: 'white', 
                  fontWeight: 'bold',
                  fontSize: 16,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--shadow-color)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Сохранить
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

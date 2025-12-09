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
              background: 'linear-gradient(135deg, #FFF 0%, #FFF5F8 100%)',
              padding: 30, borderRadius: 24,
              zIndex: 1001, boxShadow: '0 20px 60px rgba(107, 76, 117, 0.3)',
              display: 'flex', flexDirection: 'column', gap: 20,
              border: '2px solid rgba(254, 200, 216, 0.3)'
            }}
          >
            <h3 style={{ 
              margin: 0, 
              background: 'linear-gradient(135deg, #D291BC 0%, #FEC8D8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: 'center',
              fontSize: 20,
              fontWeight: 'bold'
            }}>{title}</h3>
            
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                autoFocus
                style={{
                  fontSize: 32, 
                  padding: '16px 20px', 
                  borderRadius: 16,
                  border: '2px solid #FEC8D8', 
                  outline: 'none',
                  textAlign: 'center', 
                  color: '#6B4C75', 
                  fontWeight: 'bold',
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(254, 200, 216, 0.1)',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(254, 200, 216, 0.2)'
                }}
                onFocus={(e) => e.target.style.borderColor = '#D291BC'}
                onBlur={(e) => e.target.style.borderColor = '#FEC8D8'}
              />
              <span style={{
                position: 'absolute',
                right: 24,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 24,
                color: '#D291BC',
                fontWeight: 'bold',
                pointerEvents: 'none'
              }}>₽</span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                style={{
                  flex: 1, 
                  padding: 14, 
                  borderRadius: 14, 
                  border: '2px solid #E8E8E8',
                  background: 'white', 
                  color: '#6B4C75', 
                  fontWeight: 'bold',
                  fontSize: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F8F8F8'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
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
                  background: 'linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%)', 
                  color: 'white', 
                  fontWeight: 'bold',
                  fontSize: 16,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(210, 145, 188, 0.4)',
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
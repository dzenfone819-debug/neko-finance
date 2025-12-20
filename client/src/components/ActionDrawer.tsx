import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ActionItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string; // e.g. 'var(--accent-danger)' or 'var(--text-main)'
  isDestructive?: boolean;
}

interface ActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionItem[];
}

export const ActionDrawer: React.FC<ActionDrawerProps> = ({ isOpen, onClose, title, actions }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--modal-overlay)',
              zIndex: 2000,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end'
            }}
          >
            {/* Drawer Content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-content)',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: '24px 16px 40px 16px',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
                position: 'relative',
                width: '100%',
                maxWidth: 500,
                alignSelf: 'center',
                boxSizing: 'border-box'
              }}
            >
              {/* Handle bar for visual cue */}
              <div style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 40,
                height: 4,
                background: 'var(--border-color)',
                borderRadius: 2
              }} />

              {title && (
                <div style={{
                  textAlign: 'center',
                  marginBottom: 20,
                  fontWeight: '800',
                  fontSize: 18,
                  color: 'var(--text-main)'
                }}>
                  {title}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {actions.map((action, index) => (
                  <motion.button
                    key={index}
                    whileTap={{ scale: 0.98, backgroundColor: 'var(--bg-input)' }}
                    onClick={() => {
                      action.onClick();
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '16px 20px',
                      background: 'var(--bg-card)',
                      border: 'none',
                      borderRadius: 16,
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      boxShadow: '0 2px 8px var(--shadow-color)',
                      color: action.isDestructive ? 'var(--accent-danger)' : (action.color || 'var(--text-main)'),
                      fontSize: 16,
                      fontWeight: '600'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'inherit'
                    }}>
                      {action.icon}
                    </div>
                    <span>{action.label}</span>
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                style={{
                  marginTop: 24,
                  width: '100%',
                  padding: '16px',
                  background: 'var(--bg-input)',
                  border: 'none',
                  borderRadius: 16,
                  color: 'var(--text-secondary)',
                  fontWeight: 'bold',
                  fontSize: 16,
                  cursor: 'pointer'
                }}
              >
                Отмена
              </motion.button>

            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

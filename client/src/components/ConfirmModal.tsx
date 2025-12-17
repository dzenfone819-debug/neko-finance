import React from 'react';
import { Modal } from './Modal';
import { motion } from 'framer-motion';

interface Props {
  isOpen: boolean;
  title?: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<Props> = ({ isOpen, title = 'Подтвердите действие', message, onCancel, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div style={{ padding: 20 }}>
        <div style={{ marginBottom: 20, color: 'var(--text-main)' }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="modal-cancel" onClick={onCancel} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
            Отмена
          </button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={onConfirm} className="modal-submit-button" style={{ padding: '10px 14px' }}>
            Удалить
          </motion.button>
        </div>
      </div>
    </Modal>
  );
};

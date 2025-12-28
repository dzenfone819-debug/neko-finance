import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, StickyNote, Image, Tag, Trash2, Edit2 } from 'lucide-react';
import { getIconByName } from '../data/constants';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onDelete?: (id: number) => void;
  onEdit?: (t: any) => void;
  accountName?: string;
  categoryIcon?: string | React.ReactNode;
  categoryColor?: string;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen, onClose, transaction, onDelete, onEdit, accountName, categoryIcon, categoryColor
}) => {
  if (!isOpen || !transaction) return null;

  const tags = transaction.tags ? (typeof transaction.tags === 'string' ? JSON.parse(transaction.tags) : transaction.tags) : [];
  const photos = transaction.photo_urls ? (typeof transaction.photo_urls === 'string' ? JSON.parse(transaction.photo_urls) : transaction.photo_urls) : [];
  const dateObj = new Date(transaction.date);
  const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
        <motion.div 
          className="modal-content detail-modal"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <div 
                 className="detail-icon"
                 style={{ 
                   backgroundColor: categoryColor || '#eee', 
                   width: 40, height: 40, borderRadius: 12,
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   color: '#fff', fontSize: 20
                 }}
               >
                 {typeof categoryIcon === 'string' ? getIconByName(categoryIcon) : categoryIcon}
               </div>
               <div>
                 <div className="modal-title" style={{ fontSize: 18 }}>{transaction.category}</div>
                 <div style={{ fontSize: 12, opacity: 0.7 }}>{accountName || 'Счет'}</div>
               </div>
            </div>
            <button className="modal-close" onClick={onClose}><X /></button>
          </div>

          <div className="detail-amount" style={{ 
            fontSize: 32, fontWeight: 800, textAlign: 'center', margin: '20px 0',
            color: transaction.type === 'income' ? 'var(--accent-success)' : 'var(--text-main)'
          }}>
             {transaction.type === 'expense' ? '-' : '+'}{transaction.amount.toLocaleString()} ₽
          </div>

          <div className="detail-info-grid">
            <div className="detail-row">
              <Calendar size={18} className="detail-row-icon" />
              <span>{formattedDate} в {formattedTime}</span>
            </div>

            {transaction.note && (
              <div className="detail-row note-row">
                <StickyNote size={18} className="detail-row-icon" />
                <div className="note-text">{transaction.note}</div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="detail-row tags-row">
                <Tag size={18} className="detail-row-icon" />
                <div className="detail-tags">
                  {tags.map((t: string) => <span key={t} className="detail-tag">#{t}</span>)}
                </div>
              </div>
            )}
          </div>

          {photos.length > 0 && (
            <div className="detail-photos">
              <div className="detail-photos-label"><Image size={14} /> Фото</div>
              <div className="detail-photos-grid">
                {photos.map((url: string, i: number) => (
                   <img key={i} src={url} alt="attachment" onClick={() => window.open(url, '_blank')} />
                ))}
              </div>
            </div>
          )}

          <div className="detail-actions" style={{ marginTop: 'auto', display: 'flex', gap: 10, paddingTop: 20 }}>
            <button 
              onClick={() => { onEdit && onEdit(transaction); onClose(); }} 
              className="action-btn edit-btn"
              style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'var(--bg-input)', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Edit2 size={16} /> Редактировать
            </button>
            <button 
              onClick={() => { onDelete && onDelete(transaction.id); onClose(); }} 
              className="action-btn delete-btn"
              style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'rgba(255, 0, 0, 0.1)', color: 'var(--accent-danger)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Trash2 size={16} /> Удалить
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, FileText, Camera, Trash2, Plus } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryName, getIconByName, getCategoryColor } from '../data/constants';
import { formatCurrency } from '../utils/calculator';
import { uploadFile } from '../api/nekoApi';
import WebApp from '@twa-dev/sdk';

interface Transaction {
  id: number;
  amount: number;
  category: string;
  date: string;
  type?: 'expense' | 'income';
  note?: string;
  tags?: string[];
  photo_urls?: string[];
  account_id?: number | null;
}

interface CustomCategory {
    id: string;
    name: string;
    icon: string;
    color: string;
    type?: 'expense' | 'income';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSave: (updatedTransaction: Transaction) => Promise<void>;
  onDelete: (id: number) => Promise<void> | void;
  customCategories: CustomCategory[];
  accounts?: any[];
}

export const TransactionDetailModal: React.FC<Props> = ({
  isOpen, onClose, transaction, onSave, onDelete, customCategories
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState<Transaction | null>(null);

  // Edit states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (transaction) {
      setEditedTransaction(transaction);
      setAmount(transaction.amount.toString());
      setCategory(transaction.category);
      setDate(transaction.date.split('T')[0]);
      setNote(transaction.note || '');
      setTags(transaction.tags || []);
      setPhotos(transaction.photo_urls || []);
      setIsEditing(false);
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === 'income';
  const displayCategories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const currentCategory = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...customCategories].find(c => c.id === (isEditing ? category : transaction.category));
  const categoryName = currentCategory ? currentCategory.name : getCategoryName(transaction.category);
  const categoryIcon = currentCategory ? (typeof currentCategory.icon === 'string' ? getIconByName(currentCategory.icon, 24) : currentCategory.icon) : null;
  const categoryColor = currentCategory ? currentCategory.color : getCategoryColor(transaction.category);

  const handleSave = async () => {
    if (!editedTransaction) return;

    WebApp.HapticFeedback.notificationOccurred('success');
    await onSave({
      ...editedTransaction,
      amount: parseFloat(amount),
      category,
      date: new Date(date + 'T12:00:00').toISOString(),
      note,
      tags,
      photo_urls: photos
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
      onDelete(transaction.id);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (photos.length >= 3) {
        WebApp.HapticFeedback.notificationOccurred('error');
        return;
      }

      const file = e.target.files[0];
      try {
        WebApp.HapticFeedback.impactOccurred('light');
        const urls = await uploadFile(file);
        if (urls && urls.length > 0) {
           setPhotos([...photos, ...urls]);
        }
      } catch (err) {
        console.error(err);
        WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'var(--modal-overlay)'
        }} onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 400,
                    background: 'var(--bg-card)',
                    borderRadius: 24,
                    padding: 24,
                    boxShadow: '0 20px 60px var(--shadow-color)',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{isEditing ? 'Редактирование' : 'Детали операции'}</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Amount & Category Header (View Mode) */}
                    {!isEditing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                            <div style={{
                                width: 56, height: 56,
                                borderRadius: '50%',
                                background: categoryColor,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff',
                                fontSize: 24
                            }}>
                                {categoryIcon}
                            </div>
                            <div>
                                <div style={{ fontSize: 24, fontWeight: 'bold', color: isIncome ? 'var(--accent-success)' : 'var(--text-main)' }}>
                                    {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)} ₽
                                </div>
                                <div style={{ color: 'var(--text-secondary)' }}>{categoryName}</div>
                            </div>
                        </div>
                    )}

                    {/* Edit Fields */}
                    {isEditing && (
                        <>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Сумма</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: 16, color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Категория</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: 16, color: 'var(--text-main)' }}
                                >
                                    {displayCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    {customCategories.filter(c => (c.type || 'expense') === (isIncome ? 'income' : 'expense')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Дата</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: 16, color: 'var(--text-main)' }}
                                />
                            </div>
                        </>
                    )}

                    {/* Metadata (Note, Tags, Photos) */}
                    <div style={{ background: 'var(--bg-input)', borderRadius: 16, padding: 16 }}>
                        {/* Note */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                            <FileText size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            {isEditing ? (
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Добавить заметку"
                                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: 14, resize: 'none' }}
                                />
                            ) : (
                                <div style={{ color: transaction.note ? 'var(--text-main)' : 'var(--text-secondary)', fontSize: 14 }}>
                                    {transaction.note || 'Нет заметки'}
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                            <Hash size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            {isEditing ? (
                                <input
                                    type="text"
                                    placeholder="Теги (через запятую)"
                                    value={tags.join(', ')}
                                    onChange={(e) => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: 14 }}
                                />
                            ) : (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {transaction.tags && transaction.tags.length > 0 ? (
                                        transaction.tags.map(t => (
                                            <span key={t} style={{ background: 'var(--primary)', color: '#fff', fontSize: 12, padding: '2px 8px', borderRadius: 10 }}>#{t}</span>
                                        ))
                                    ) : (
                                        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Нет тегов</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Photos */}
                         <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <Camera size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 4 }} />

                            {/* Photo List */}
                            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flexWrap: 'wrap' }}>
                                {photos.length > 0 ? (
                                    photos.map((url, i) => (
                                        <div key={i} style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                                            <img src={url} alt="receipt" style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }} />
                                            {isEditing && (
                                                <button
                                                    onClick={() => removePhoto(i)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: -4,
                                                        right: -4,
                                                        background: 'var(--bg-card)',
                                                        borderRadius: '50%',
                                                        width: 20,
                                                        height: 20,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: 'none',
                                                        padding: 0,
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <X size={12} color="var(--text-main)" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    !isEditing && <span style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>Нет фото</span>
                                )}

                                {/* Add Photo Button (Edit Mode) */}
                                {isEditing && photos.length < 3 && (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 8,
                                            border: '2px dashed var(--border-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: 'var(--text-secondary)'
                                        }}
                                    >
                                        <Plus size={24} />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                        {isEditing ? (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSave}
                                style={{ flex: 1, padding: 14, background: 'var(--primary)', color: '#fff', borderRadius: 14, border: 'none', fontWeight: 'bold', fontSize: 16 }}
                            >
                                Сохранить
                            </motion.button>
                        ) : (
                            <>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsEditing(true)}
                                    style={{ flex: 1, padding: 14, background: 'var(--bg-input)', color: 'var(--text-main)', borderRadius: 14, border: 'none', fontWeight: 'bold', fontSize: 16 }}
                                >
                                    Редактировать
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleDelete}
                                    style={{ width: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-danger)', color: '#fff', borderRadius: 14, border: 'none' }}
                                >
                                    <Trash2 size={20} />
                                </motion.button>
                            </>
                        )}
                    </div>

                </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, StickyNote, Image, Tag, Trash2, Edit2 } from 'lucide-react';
import { Modal } from './Modal';
import { getIconByName, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/constants';
import * as api from '../api/nekoApi';
import WebApp from '@twa-dev/sdk';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onDelete?: (id: number) => void;
  accountName?: string;
  categoryIcon?: string | React.ReactNode;
  categoryColor?: string;
  userId?: number | null;
  existingTags?: string[];
  availableCategoryIds?: string[];
  categoryOverrides?: Record<string, any>;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen, onClose, transaction, onDelete, accountName, categoryIcon, categoryColor, userId, existingTags = [], availableCategoryIds = [], categoryOverrides = {}
}) => {
  if (!isOpen || !transaction) return null;

  const tags = transaction.tags ? (typeof transaction.tags === 'string' ? JSON.parse(transaction.tags) : transaction.tags) : [];
  const photos = transaction.photo_urls ? (typeof transaction.photo_urls === 'string' ? JSON.parse(transaction.photo_urls) : transaction.photo_urls) : [];
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [noteInput, setNoteInput] = useState(transaction.note || '');
  const [localAmount, setLocalAmount] = useState<number>(transaction.amount || 0);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editAmount, setEditAmount] = useState<string>(transaction.amount ? transaction.amount.toString() : '');
  const [amountError, setAmountError] = useState('');
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const [localDateObj, setLocalDateObj] = useState<Date>(new Date(transaction.date));
  const [isEditingDate, setIsEditingDate] = useState(false);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(transaction.date));
  const [timeStr, setTimeStr] = useState<string>(() => {
    const d = new Date(transaction.date);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const noteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [localTags, setLocalTags] = useState<string[]>(tags.slice());
  const [localPhotos, setLocalPhotos] = useState<string[]>(photos.slice());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [customCats, setCustomCats] = useState<any[]>([]);
  const [currentCategoryId, setCurrentCategoryId] = useState<string>(transaction.category);
  const [currentCategoryName, setCurrentCategoryName] = useState<string>(() => transaction.category);
  const [currentCategoryIcon, setCurrentCategoryIcon] = useState<any>(categoryIcon);
  const [currentCategoryColor, setCurrentCategoryColor] = useState<string | undefined>(categoryColor);
  const displayDate = localDateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const displayTime = localDateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    setNoteInput(transaction.note || '');
    setLocalTags(tags.slice());
    setLocalPhotos(photos.slice());
    setLocalAmount(transaction.amount || 0);
    setEditAmount(transaction.amount ? transaction.amount.toString() : '');
    setLocalDateObj(new Date(transaction.date));
    setCurrentCategoryId(transaction.category);
    // derive display values using overrides if present
    const override = (categoryOverrides && categoryOverrides[transaction.category]) || {};
    const std = ([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(c => c.id === transaction.category));
    // Для истории используем все категории (включая удаленные)
    const custom = customCats.find(c => c.id === transaction.category);
    // Для удаленных кастомных категорий используем только значения из базы (они уже актуальные)
    const isDeletedCustom = custom && ('is_deleted' in custom) && (custom.is_deleted === 1 || custom.is_deleted === true);
    const derivedName = isDeletedCustom ? (custom.name || transaction.category) : (override.name || (std ? std.name : (custom ? custom.name : transaction.category)));
    const derivedIcon = isDeletedCustom ? (custom.icon || categoryIcon) : (override.icon || (std ? std.icon : (custom ? custom.icon : categoryIcon)));
    const derivedColor = isDeletedCustom ? (custom.color || categoryColor) : (override.color || (std ? std.color : (custom ? custom.color : categoryColor)));
    setCurrentCategoryName(derivedName as string);
    setCurrentCategoryIcon(derivedIcon);
    setCurrentCategoryColor(derivedColor);
  }, [transaction]);

  useEffect(() => {
    // when overrides or custom list change while modal open, refresh displayed category meta
    if (!transaction) return;
    const id = transaction.category;
    const override = (categoryOverrides && categoryOverrides[id]) || {};
    const std = ([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(c => c.id === id));
    const custom = customCats.find(c => c.id === id);
    // Для удаленных кастомных категорий используем только значения из базы
    const isDeletedCustom = custom && ('is_deleted' in custom) && (custom.is_deleted === 1 || custom.is_deleted === true);
    const derivedName = isDeletedCustom ? (custom.name || id) : (override.name || (std ? std.name : (custom ? custom.name : id)));
    const derivedIcon = override.icon || (std ? std.icon : (custom ? custom.icon : categoryIcon));
    const derivedColor = override.color || (std ? std.color : (custom ? custom.color : categoryColor));
    setCurrentCategoryName(derivedName as string);
    setCurrentCategoryIcon(derivedIcon);
    setCurrentCategoryColor(derivedColor);
  }, [categoryOverrides, customCats]);

  useEffect(() => {
    const loadCustom = async () => {
      if (!userId) return;
      try {
        // Загружаем все категории (включая удаленные) для истории транзакций
        const res = await api.fetchCustomCategories(userId, true);
        setCustomCats(res || []);
      } catch (e) { console.error('Failed to load custom categories', e); }
    }
    loadCustom();
  }, [userId]);

  useEffect(() => {
    if (isEditingAmount && amountInputRef.current) {
      amountInputRef.current.focus();
      amountInputRef.current.select();
    }
  }, [isEditingAmount]);

  useEffect(() => {
    if (isEditingDate && dateInputRef.current) {
      dateInputRef.current.focus();
    }
  }, [isEditingDate]);

  const monthName = (d: Date) => d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const buildMonthMatrix = (d: Date) => {
    const year = d.getFullYear();
    const month = d.getMonth();
    const first = new Date(year, month, 1);
    // JS getDay(): 0 = Sun, 1 = Mon ... Convert so Monday is 0
    const startDay = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows: (number | null)[][] = [];
    let current = 1 - startDay;
    for (let r = 0; r < 6; r++) {
      const row: (number | null)[] = [];
      for (let c = 0; c < 7; c++) {
        if (current > 0 && current <= daysInMonth) row.push(current);
        else row.push(null);
        current++;
      }
      rows.push(row);
    }
    return rows;
  }

  const saveAmountAndOrDate = async (amountStr?: string, dateObj?: Date) => {
    if (!userId) return;
    const amountVal = (typeof amountStr !== 'undefined') ? parseFloat(amountStr) : localAmount;
    if (isNaN(amountVal) || amountVal <= 0) { 
      setAmountError('Введите корректную положительную сумму');
      WebApp.HapticFeedback.notificationOccurred('error'); 
      return; 
    }
    const dateVal = dateObj ? dateObj : localDateObj;
    try {
      await api.updateTransaction(userId, transaction.id, amountVal, transaction.category, dateVal.toISOString(), transaction.type, noteInput, localTags, localPhotos);
      WebApp.HapticFeedback.notificationOccurred('success');
      setLocalAmount(amountVal);
      setEditAmount(amountVal.toString());
      setLocalDateObj(dateVal);
      setIsEditingAmount(false);
      setIsEditingDate(false);
      setAmountError('');
    } catch (err) {
      console.error(err);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  }

  // Build picker list:
  // - For expenses: keep previous behavior (only show standard expense categories that exist in budget via `availableCategoryIds` and matching custom expense categories).
  // - For incomes: show standard income categories unless hidden by override, plus all custom income categories (to match BudgetView).
  const pickerCategories = (() => {
    const avail = availableCategoryIds || [];
    const stdList = (transaction.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES) as any[];
    let filteredStd: any[] = [];
    let filteredCustom: any[] = [];

    if (transaction.type === 'expense') {
      filteredStd = avail.length === 0 ? [] : stdList.filter(c => avail.includes(c.id));
      // Фильтруем удаленные категории из списка выбора
      filteredCustom = avail.length === 0 ? [] : customCats.filter(c => (c.type || 'expense') === 'expense' && avail.includes(c.id) && (c.is_deleted === 0 || c.is_deleted === null || c.is_deleted === undefined));
    } else {
      filteredStd = stdList.filter(c => !(categoryOverrides && categoryOverrides[c.id] && categoryOverrides[c.id].hidden));
      // Фильтруем удаленные категории из списка выбора
      filteredCustom = customCats.filter(c => c.type === 'income' && (c.is_deleted === 0 || c.is_deleted === null || c.is_deleted === undefined));
    }

    // merge and dedupe by id/name
    const map: Record<string, any> = {};
    [...filteredStd, ...filteredCustom].forEach(c => { const id = c.id || c.name; map[id] = c; });
    const merged = Object.values(map) as any[];

    return merged.map(c => {
      const ov = (categoryOverrides && categoryOverrides[c.id]) || {};
      return { ...c, name: ov.name || c.name, icon: ov.icon || c.icon, color: ov.color || c.color };
    });
  })();

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
                   backgroundColor: currentCategoryColor || categoryColor || '#eee', 
                   width: 40, height: 40, borderRadius: 12,
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   color: '#fff', fontSize: 20
                 }}
               >
                 {typeof currentCategoryIcon === 'string' ? getIconByName(currentCategoryIcon) : currentCategoryIcon}
               </div>
               <div>
                 <div className="modal-title" style={{ fontSize: 18 }}>
                   <span onClick={() => { setCategoryPickerOpen(true); WebApp.HapticFeedback.impactOccurred('light'); }} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                     <span>{currentCategoryName}</span>
                     <Edit2 size={14} style={{ opacity: 0.6 }} />
                   </span>
                 </div>
                 <div style={{ fontSize: 12, opacity: 0.7 }}>{accountName || 'Счет'}</div>
               </div>
            </div>
            <button className="modal-close" onClick={onClose}><X /></button>
          </div>

          <div className="detail-amount" style={{ 
            fontSize: 32, fontWeight: 800, textAlign: 'center', margin: '20px 0',
            color: transaction.type === 'income' ? 'var(--accent-success)' : 'var(--text-main)'
          }}>
            {!isEditingAmount ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div onClick={() => setIsEditingAmount(true)} style={{ cursor: 'text' }}>
                  {transaction.type === 'expense' ? '-' : '+'}{localAmount.toLocaleString()} ₽
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <input
                    ref={amountInputRef}
                    type="text"
                    inputMode="decimal"
                    value={editAmount}
                    onChange={e => {
                      const value = e.target.value;
                      setAmountError('');
                      
                      // Пустое поле не разрешено
                      if (value === '') {
                        setEditAmount(value);
                        setAmountError('Сумма не может быть пустой');
                        return;
                      }
                      
                      // Проверка на минус
                      if (value.includes('-')) {
                        setAmountError('Сумма не может быть отрицательной');
                        return;
                      }
                      
                      // Проверка на недопустимые символы
                      const onlyDigitsAndDot = /^[0-9.]+$/;
                      if (!onlyDigitsAndDot.test(value)) {
                        setAmountError('Введите корректное число');
                        return;
                      }
                      
                      // Проверка на несколько точек
                      if ((value.match(/\./g) || []).length > 1) {
                        setAmountError('Введите корректное число');
                        return;
                      }
                      
                      // Проверка на количество знаков после запятой
                      const parts = value.split('.');
                      if (parts.length === 2 && parts[1].length > 2) {
                        setAmountError('Максимум 2 знака после запятой');
                        return;
                      }
                      
                      const num = parseFloat(value);
                      
                      // Проверка на NaN
                      if (isNaN(num)) {
                        setAmountError('Введите корректное число');
                        return;
                      }
                      
                      // Проверка на ноль
                      if (num === 0) {
                        setEditAmount(value);
                        setAmountError('Сумма должна быть больше нуля');
                        return;
                      }
                      
                      // Если все проверки пройдены
                      if (num > 0) {
                        setEditAmount(value);
                      }
                    }}
                    className="extras-input"
                    style={{ 
                      width: 140, 
                      textAlign: 'center',
                      borderColor: amountError ? '#F87171' : undefined,
                      borderWidth: amountError ? '2px' : undefined
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (!amountError && editAmount.trim() !== '') {
                          saveAmountAndOrDate(editAmount, undefined);
                        }
                      } else if (e.key === 'Escape') {
                        setIsEditingAmount(false);
                        setEditAmount(localAmount.toString());
                        setAmountError('');
                      }
                    }}
                    onBlur={() => {
                      // Если есть ошибка или пустое поле - отменяем редактирование
                      if (editAmount.trim() === '' || amountError) {
                        setIsEditingAmount(false);
                        setEditAmount(localAmount.toString());
                        setAmountError('');
                        return;
                      }
                      if (editAmount === localAmount.toString()) {
                        setIsEditingAmount(false);
                        setEditAmount(localAmount.toString());
                        setAmountError('');
                        return;
                      }
                      saveAmountAndOrDate(editAmount, undefined);
                    }}
                  />
                </div>
                {amountError && (
                  <div style={{
                    color: '#F87171',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    ⚠️ {amountError}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="detail-info-grid">
            <div className="detail-row">
              <Calendar size={18} className="detail-row-icon" />
              <div onClick={() => {
                setCalendarMonth(new Date(localDateObj));
                const pad = (n: number) => String(n).padStart(2, '0');
                setTimeStr(`${pad(localDateObj.getHours())}:${pad(localDateObj.getMinutes())}`);
                setDatePickerOpen(true);
              }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{displayDate} в {displayTime}</span>
              </div>
            </div>

            <div className="detail-row note-row" onClick={() => { setNoteModalOpen(true); WebApp.HapticFeedback.impactOccurred('light'); }} style={{ cursor: 'pointer' }}>
              <StickyNote size={18} className="detail-row-icon" />
              <div className="note-text">{noteInput || <span style={{ opacity: 0.6 }}>Добавить заметку...</span>}</div>
            </div>

            <div className="detail-row tags-row" onClick={() => { setTagsModalOpen(true); WebApp.HapticFeedback.impactOccurred('light'); }} style={{ cursor: 'pointer' }}>
              <Tag size={18} className="detail-row-icon" />
              <div className="detail-tags">
                {localTags.length > 0 ? localTags.map((t: string) => <span key={t} className="detail-tag">#{t}</span>) : <span style={{ opacity: 0.6 }}>Добавить тег</span>}
              </div>
            </div>
          </div>

          <div className="detail-photos">
            <div className="detail-photos-label"><Image size={14} /> Фото</div>
            <div className="detail-photos-grid">
              {/** show up to 2 slots; thumbnails with delete X in corner, placeholders with + otherwise */}
              {[0,1].map((slot) => (
                  <div key={slot} className="photo-slot" style={{ width: 92, height: 92, borderRadius: 8, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)', cursor: 'pointer' }}>
                  {localPhotos[slot] ? (
                    <>
                      <img src={localPhotos[slot]} alt={`photo-${slot}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => { setViewerIndex(slot); setViewerOpen(true); }} />
                      <button className="photo-remove" onClick={async (e) => { e.stopPropagation(); const newPhotos = localPhotos.slice(); newPhotos.splice(slot,1); setLocalPhotos(newPhotos); try { if (userId) await api.updateTransaction(userId, transaction.id, transaction.amount, transaction.category, transaction.date, transaction.type, noteInput, localTags, newPhotos); } catch (err) { console.error(err); } }} style={{ position: 'absolute', top: 6, right: 6, background: 'transparent', color: 'var(--text-main)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0 }}>
                        <X size={16} strokeWidth={2} />
                        <span className="icon-fallback" aria-hidden style={{ display: 'none' }}>✖</span>
                      </button>
                      <button className="photo-edit" onClick={(e) => { e.stopPropagation(); if (fileInputRef.current) { fileInputRef.current.dataset.idx = String(slot); fileInputRef.current.click(); } }} style={{ position: 'absolute', top: 6, left: 6, background: 'transparent', color: 'var(--text-main)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0 }}>
                        <Edit2 size={16} strokeWidth={1.5} />
                        <span className="icon-fallback" aria-hidden style={{ display: 'none' }}>✎</span>
                      </button>
                    </>
                  ) : (
                    <div onClick={() => { if (fileInputRef.current) { fileInputRef.current.dataset.idx = String(slot); fileInputRef.current.click(); } }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>+</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
              const input = e.target as HTMLInputElement;
              const f = input.files?.[0];
              if (!f) return;
              const idxStr = input.dataset.idx;
              // enforce max 2
              if (localPhotos.length >= 2 && !idxStr) { WebApp.HapticFeedback.notificationOccurred('warning'); input.value = ''; return; }
              try {
                const res = await api.uploadFile(f);
                const url = (res && (res as any).url) ? (res as any).url : (res as any);
                const newPhotos = localPhotos.slice();
                if (idxStr) {
                  const idx = parseInt(idxStr,10);
                  newPhotos[idx] = url;
                } else {
                  newPhotos.push(url);
                }
                setLocalPhotos(newPhotos.slice(0,2));
                if (userId) await api.updateTransaction(userId, transaction.id, transaction.amount, transaction.category, transaction.date, transaction.type, noteInput, localTags, newPhotos.slice(0,2));
                WebApp.HapticFeedback.notificationOccurred('success');
              } catch (err) { console.error(err); WebApp.HapticFeedback.notificationOccurred('error'); }
              input.value = '';
            }} />
          </div>

          <Modal variant="center" isOpen={viewerOpen} onClose={() => setViewerOpen(false)} title={`Фото ${viewerIndex + 1} из ${photos.length}`}>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ maxWidth: '90vw', maxHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={localPhotos[viewerIndex]} alt={`photo-${viewerIndex}`} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => setViewerIndex(i => (i - 1 + localPhotos.length) % localPhotos.length)} disabled={localPhotos.length <= 1}>Пред.</button>
                <button className="btn" onClick={() => setViewerIndex(i => (i + 1) % localPhotos.length)} disabled={localPhotos.length <= 1}>След.</button>
                <button className="btn" onClick={() => setViewerOpen(false)}>Закрыть</button>
              </div>
            </div>
          </Modal>

          <Modal variant="center" isOpen={datePickerOpen} onClose={() => setDatePickerOpen(false)} title="Выбрать дату">
            <div className="picker-modal" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch', width: '100%', maxWidth: 360, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button className="icon-btn" onClick={() => { const m = new Date(calendarMonth); m.setMonth(m.getMonth() - 1); setCalendarMonth(m); }} style={{ background: 'transparent', border: 'none' }}>‹</button>
                <div style={{ fontWeight: 700 }}>{monthName(calendarMonth)}</div>
                <button className="icon-btn" onClick={() => { const m = new Date(calendarMonth); m.setMonth(m.getMonth() + 1); setCalendarMonth(m); }} style={{ background: 'transparent', border: 'none' }}>›</button>
              </div>
              <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center', maxWidth: 320, margin: '0 auto', width: '100%' }}>
                {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d} className="calendar-weekday" style={{ fontSize: 12, opacity: 0.7 }}>{d}</div>)}
                {buildMonthMatrix(calendarMonth).map((row, ri) => row.map((day, ci) => {
                  const isSelected = day !== null && new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day).toDateString() === new Date(localDateObj).toDateString();
                  return (
                    <div key={`${ri}-${ci}`}>
                      {day ? (
                        <button className={`calendar-day-button${isSelected ? ' selected' : ''}`} onClick={() => {
                          const d = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                          const [hh, mm] = timeStr.split(':').map(s => parseInt(s||'0',10));
                          d.setHours(hh, mm, 0, 0);
                          setLocalDateObj(d);
                        }}>{day}</button>
                      ) : <div style={{ height: 36 }} />}
                    </div>
                  )
                }))}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ margin: '0 auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={localDateObj.getHours()} onChange={e => { const d = new Date(localDateObj); d.setHours(parseInt(e.target.value, 10)); setLocalDateObj(d); const pad = (n: number) => String(n).padStart(2, '0'); setTimeStr(`${pad(d.getHours())}:${pad(d.getMinutes())}`); }} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', fontSize: 14 }}>
                    {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
                  </select>
                  <span style={{ fontSize: 16, opacity: 0.7 }}>:</span>
                  <select value={localDateObj.getMinutes()} onChange={e => { const d = new Date(localDateObj); d.setMinutes(parseInt(e.target.value, 10)); setLocalDateObj(d); const pad = (n: number) => String(n).padStart(2, '0'); setTimeStr(`${pad(d.getHours())}:${pad(d.getMinutes())}`); }} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', fontSize: 14 }}>
                    {Array.from({ length: 60 }).map((_, m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                  </select>
                </div>
                <button onClick={() => { saveAmountAndOrDate(undefined, localDateObj); setDatePickerOpen(false); }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: 'transparent' }}>Готово</button>
              </div>
            </div>
          </Modal>

          {/* NOTE modal copied behavior from TransactionExtras */}
          <Modal variant="center" isOpen={noteModalOpen} onClose={() => setNoteModalOpen(false)} title="Заметка">
            <div style={{ padding: 12 }}>
              <textarea
                ref={noteInputRef}
                className="extras-input note-textarea"
                placeholder="Добавить заметку..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                rows={4}
                style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn" onClick={async () => { try { if (userId) await api.updateTransaction(userId, transaction.id, transaction.amount, transaction.category, transaction.date, transaction.type, noteInput, localTags, localPhotos); WebApp.HapticFeedback.notificationOccurred('success'); } catch (e) { console.error(e); WebApp.HapticFeedback.notificationOccurred('error'); } setNoteModalOpen(false); }}>Готово</button>
              </div>
            </div>
          </Modal>

          {/* TAGS modal copied behavior from TransactionExtras */}
          <Modal variant="center" isOpen={tagsModalOpen} onClose={() => setTagsModalOpen(false)} title="Теги">
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {localTags.map(tag => (
                  <span key={tag} className="tag-chip-item">
                    #{tag}
                    <button onClick={async () => { const newTags = localTags.filter(t => t !== tag); setLocalTags(newTags); try { if (userId) await api.updateTransaction(userId, transaction.id, transaction.amount, transaction.category, transaction.date, transaction.type, noteInput, newTags, localPhotos); WebApp.HapticFeedback.impactOccurred('light'); } catch (e) { console.error(e); } }}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <div className="tag-input-wrapper" style={{ marginTop: 12 }}>
                <input
                  ref={tagInputRef}
                  className="extras-input tag-text-input"
                  placeholder="тег..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const trimmed = tagInput.trim().replace(/^#/, ''); if (trimmed && !localTags.includes(trimmed)) { const newTags = [...localTags, trimmed]; setLocalTags(newTags); setTagInput(''); (async () => { try { if (userId) await api.updateTransaction(userId, transaction.id, transaction.amount, transaction.category, transaction.date, transaction.type, noteInput, newTags, localPhotos); WebApp.HapticFeedback.impactOccurred('light'); } catch (err) { console.error(err); } })(); } } }}
                />
              </div>
              {existingTags.length > 0 && (
                <div className="tags-suggestions" style={{ marginTop: 8 }}>
                  {existingTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !localTags.includes(t)).slice(0,5).map(tag => (
                    <button key={tag} onClick={async () => { const newTags = [...localTags, tag]; setLocalTags(newTags); try { if (userId) await api.updateTransaction(userId, transaction.id, transaction.amount, transaction.category, transaction.date, transaction.type, noteInput, newTags, localPhotos); WebApp.HapticFeedback.impactOccurred('light'); } catch (e) { console.error(e); } }} className="suggestion-chip">#{tag}</button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn" onClick={async () => { if (tagInput.trim()) { const trimmed = tagInput.trim().replace(/^#/, ''); if (!localTags.includes(trimmed)) { const newTags = [...localTags, trimmed]; setLocalTags(newTags); try { if (userId) await api.updateTransaction(userId, transaction.id, transaction.amount, transaction.category, transaction.date, transaction.type, noteInput, newTags, localPhotos); WebApp.HapticFeedback.impactOccurred('light'); } catch (e) { console.error(e); } } } setTagsModalOpen(false); }}>Готово</button>
              </div>
            </div>
          </Modal>

          {/* Category picker - custom mobile-style selector */}
          <Modal variant="center" isOpen={categoryPickerOpen} onClose={() => setCategoryPickerOpen(false)} title="Выбрать категорию">
            <div style={{ maxWidth: 420, width: '100%' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
                {pickerCategories.map(c => {
                  const cid = c.id || c.name;
                  const isSelected = cid === currentCategoryId;
                  const icon = c.icon || '📦';
                  const color = c.color || '#ddd';
                  return (
                    <button key={cid} onClick={async () => {
                      setCategoryPickerOpen(false);
                      const newCatId = cid;
                      const name = c.name || cid;
                      try {
                        if (userId) await api.updateTransaction(userId, transaction.id, transaction.amount, newCatId, localDateObj.toISOString(), transaction.type, noteInput, localTags, localPhotos);
                        setCurrentCategoryId(newCatId);
                        setCurrentCategoryName(name);
                        setCurrentCategoryIcon(c.icon);
                        setCurrentCategoryColor(color);
                        WebApp.HapticFeedback.notificationOccurred('success');
                      } catch (err) {
                        console.error(err);
                        WebApp.HapticFeedback.notificationOccurred('error');
                      }
                    }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: 10, minWidth: 86, borderRadius: 12, border: isSelected ? '2px solid rgba(0,0,0,0.12)' : '1px solid rgba(0,0,0,0.06)', background: 'var(--bg-input)'
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color, color: '#fff', fontSize: 20 }}>
                        {typeof icon === 'string' ? getIconByName(icon) : icon}
                      </div>
                      <div style={{ fontSize: 13, textAlign: 'center' }}>{c.name}</div>
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn" onClick={() => setCategoryPickerOpen(false)}>Отмена</button>
              </div>
            </div>
          </Modal>

          <div className="detail-actions" style={{ marginTop: 'auto', display: 'flex', gap: 10, paddingTop: 20 }}>
            <div style={{ flex: 1 }} />
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

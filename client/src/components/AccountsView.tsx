import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowRightLeft } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import * as api from '../api/nekoApi';
import { Modal } from './Modal';

interface Account {
  id: number;
  name: string;
  balance: number;
  type: string;
  color: string;
  icon?: string;
}

interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  icon: string;
}

interface Props {
  userId: number | null;
  accounts: Account[];
  goals: Goal[];
  onRefresh: () => void;
}

export const AccountsView: React.FC<Props> = ({ userId, accounts, goals, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'goals'>('accounts');
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [selectedColor, setSelectedColor] = useState('#CAFFBF');
  const [selectedEmoji, setSelectedEmoji] = useState('💳');
  const [transferFrom, setTransferFrom] = useState<{ type: string; id: number } | null>(null);
  const [transferTo, setTransferTo] = useState<{ type: string; id: number } | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ accountId: number; x: number; y: number } | null>(null);
  const [goalContextMenu, setGoalContextMenu] = useState<{ goalId: number; x: number; y: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountBalance, setEditAccountBalance] = useState('');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalTarget, setEditGoalTarget] = useState('');

  const colors = ['#CAFFBF', '#FFADAD', '#A0C4FF', '#FFD6A5', '#FFC6FF', '#9BF6FF', '#D0F4DE'];
  const accountEmojis = ['💳', '💵', '🏦', '💰', '💸', '🪙', '💴', '💶', '💷', '🤑'];
  const goalEmojis = ['🐷', '🎯', '🏠', '✈️', '🚗', '🎓', '💍', '🎁', '🌟', '💎'];
  const accountTypes = [
    { value: 'cash', label: '💵 Наличные' },
    { value: 'card', label: '💳 Карта' },
    { value: 'checking', label: '🏦 Расчетный счет' },
    { value: 'savings', label: '💰 Сбережения' }
  ];

  const handleCreateAccount = async () => {
    if (!userId || !newAccountName || !newAccountType) return;
    try {
      await api.createAccount(userId, newAccountName, 0, newAccountType, selectedColor, 'RUB', selectedEmoji);
      WebApp.HapticFeedback.notificationOccurred('success');
      setNewAccountName('');
      setNewAccountType('cash');
      setSelectedColor('#667eea');
      setSelectedEmoji('💳');
      setShowAccountForm(false);
      onRefresh();
    } catch (e) {
      console.error(e);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  const handleCreateGoal = async () => {
    if (!userId || !newGoalName || !newGoalTarget) return;
    try {
      await api.createGoal(userId, newGoalName, parseFloat(newGoalTarget), selectedColor, selectedEmoji);
      WebApp.HapticFeedback.notificationOccurred('success');
      setNewGoalName('');
      setNewGoalTarget('');
      setSelectedColor('#667eea');
      setSelectedEmoji('🐷');
      setShowGoalForm(false);
      onRefresh();
    } catch (e) {
      console.error(e);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!userId) return;
    try {
      await api.deleteAccount(userId, accountId);
      WebApp.HapticFeedback.notificationOccurred('success');
      setContextMenu(null);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditAccount = async () => {
    if (!userId || !editingAccount || !editAccountName) return;
    try {
      await api.updateAccount(userId, editingAccount.id, {
        name: editAccountName,
        balance: parseFloat(editAccountBalance) || editingAccount.balance,
        color: selectedColor,
        icon: selectedEmoji
      });
      WebApp.HapticFeedback.notificationOccurred('success');
      setEditingAccount(null);
      onRefresh();
    } catch (e) {
      console.error(e);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setEditAccountName(account.name);
    setEditAccountBalance(account.balance.toString());
    setSelectedColor(account.color);
    setSelectedEmoji(account.icon || '💳');
    setContextMenu(null);
  };

  const handleEditGoal = async () => {
    if (!userId || !editingGoal || !editGoalName || !editGoalTarget) return;
    try {
      await api.updateGoal(userId, editingGoal.id, {
        name: editGoalName,
        target_amount: parseFloat(editGoalTarget),
        color: selectedColor,
        icon: selectedEmoji
      });
      WebApp.HapticFeedback.notificationOccurred('success');
      setEditingGoal(null);
      onRefresh();
    } catch (e) {
      console.error(e);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  const openEditGoalModal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditGoalName(goal.name);
    setEditGoalTarget(goal.target_amount.toString());
    setSelectedColor(goal.color);
    setSelectedEmoji(goal.icon || '🐷');
    setGoalContextMenu(null);
  };

  const handleLongPressStart = (accountId: number, e: React.TouchEvent | React.MouseEvent) => {
    const timer = window.setTimeout(() => {
      WebApp.HapticFeedback.impactOccurred('medium');
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setContextMenu({ accountId, x: rect.right - 150, y: rect.bottom });
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressStartGoal = (goalId: number, e: React.TouchEvent | React.MouseEvent) => {
    const timer = window.setTimeout(() => {
      WebApp.HapticFeedback.impactOccurred('medium');
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setGoalContextMenu({ goalId, x: rect.right - 150, y: rect.bottom });
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      window.clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    if (!userId) return;
    try {
      await api.deleteGoal(userId, goalId);
      WebApp.HapticFeedback.notificationOccurred('success');
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTransfer = async () => {
    if (!userId || !transferFrom || !transferTo || !transferAmount) return;
    try {
      await api.transfer(
        userId,
        transferFrom.type,
        transferFrom.id,
        transferTo.type,
        transferTo.id,
        parseFloat(transferAmount)
      );
      WebApp.HapticFeedback.notificationOccurred('success');
      setShowTransfer(false);
      setTransferAmount('');
      setTransferFrom(null);
      setTransferTo(null);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalSavings = goals.reduce((sum, goal) => sum + goal.current_amount, 0);

  return (
    <div style={{ padding: '0 0', height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
      {/* ОБЩИЙ БАЛАНС */}
      <div style={{ padding: '15px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '20px 20px 0 0', color: 'white', marginBottom: 5 }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 5 }}>Общий баланс на счетах</div>
        <div style={{ fontSize: 32, fontWeight: 'bold' }}>{totalBalance.toLocaleString()} ₽</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 5 }}>В копилках: {totalSavings.toLocaleString()} ₽</div>
      </div>

      {/* ТАБЫ */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 15px', background: '#F5F5F5', borderBottom: '1px solid #E0E0E0' }}>
        <button
          onClick={() => setActiveTab('accounts')}
          style={{
            flex: 1,
            padding: '10px',
            background: activeTab === 'accounts' ? '#667eea' : '#FFF',
            color: activeTab === 'accounts' ? 'white' : '#666',
            border: 'none',
            borderRadius: 10,
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: '0.3s'
          }}
        >
          💳 Счета ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          style={{
            flex: 1,
            padding: '10px',
            background: activeTab === 'goals' ? '#667eea' : '#FFF',
            color: activeTab === 'goals' ? 'white' : '#666',
            border: 'none',
            borderRadius: 10,
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: '0.3s'
          }}
        >
          🐷 Копилки ({goals.length})
        </button>
      </div>

      {/* СЧЕТА */}
      {activeTab === 'accounts' && (
        <div style={{ padding: '15px' }}>
          {accounts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', padding: '30px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💳</div>
              <div>Нет счетов. Создай свой первый счет!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {accounts.map((acc) => (
                <motion.div
                  key={acc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onTouchStart={(e) => handleLongPressStart(acc.id, e)}
                  onTouchEnd={handleLongPressEnd}
                  onMouseDown={(e) => handleLongPressStart(acc.id, e)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  style={{
                    background: acc.color,
                    padding: '15px',
                    borderRadius: '15px',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>{acc.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{acc.balance.toLocaleString()} ₽</div>
                  </div>
                  <div style={{
                    fontSize: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {acc.icon || '💳'}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* КНОПКА ДОБАВИТЬ СЧЕТ */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAccountForm(true)}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '12px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <Plus size={20} /> Добавить счет
          </motion.button>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ СЧЕТА */}
      <Modal isOpen={showAccountForm} onClose={() => setShowAccountForm(false)} title="Новый счет">
        <div className="modal-body">
          <input
            type="text"
            placeholder="Название счета"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            className="modal-input"
          />
          <select
            value={newAccountType}
            onChange={(e) => setNewAccountType(e.target.value)}
            className="modal-select"
          >
            {accountTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <div>
            <label className="modal-label">Цвет и иконка</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E0E0E0',
                  background: '#F8F9FA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: selectedColor, flexShrink: 0 }} />
                <span style={{ color: '#666' }}>Выбрать цвет</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E0E0E0',
                  background: '#F8F9FA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{selectedEmoji}</span>
                <span style={{ color: '#666' }}>Выбрать иконку</span>
              </motion.button>
            </div>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="color-picker"
                style={{ marginTop: 10 }}
              >
                {colors.map((col) => (
                  <motion.button
                    key={col}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedColor(col)}
                    className="color-option"
                    style={{
                      background: col,
                      border: selectedColor === col ? '3px solid #667eea' : '2px solid #E0E0E0',
                    }}
                  />
                ))}
              </motion.div>
            )}
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="emoji-picker"
                style={{ marginTop: 10 }}
              >
                {accountEmojis.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedEmoji(emoji)}
                    className="emoji-option"
                    style={{
                      border: selectedEmoji === emoji ? '3px solid #667eea' : '2px solid #E0E0E0',
                    }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateAccount}
            className="modal-submit-button"
          >
            Создать счет
          </motion.button>
        </div>
      </Modal>

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ СЧЕТА */}
      <Modal
        isOpen={!!editingAccount}
        onClose={() => setEditingAccount(null)}
        title="Редактировать счет"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <input
            className="modal-input"
            type="text"
            placeholder="Название счета"
            value={editAccountName}
            onChange={(e) => setEditAccountName(e.target.value)}
          />
          <input
            className="modal-input"
            type="number"
            placeholder="Текущий баланс"
            value={editAccountBalance}
            onChange={(e) => setEditAccountBalance(e.target.value)}
          />
          <div>
            <label className="modal-label">Цвет и иконка</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E0E0E0',
                  background: '#F8F9FA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: selectedColor, flexShrink: 0 }} />
                <span style={{ color: '#666' }}>Выбрать цвет</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E0E0E0',
                  background: '#F8F9FA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{selectedEmoji}</span>
                <span style={{ color: '#666' }}>Выбрать иконку</span>
              </motion.button>
            </div>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="color-picker"
                style={{ marginTop: 10 }}
              >
                {colors.map((col) => (
                  <motion.button
                    key={col}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedColor(col)}
                    className="color-option"
                    style={{
                      background: col,
                      border: selectedColor === col ? '3px solid #667eea' : '2px solid #E0E0E0',
                    }}
                  />
                ))}
              </motion.div>
            )}
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="emoji-picker"
                style={{ marginTop: 10 }}
              >
                {accountEmojis.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedEmoji(emoji)}
                    className="emoji-option"
                    style={{
                      border: selectedEmoji === emoji ? '3px solid #667eea' : '2px solid #E0E0E0',
                    }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleEditAccount}
            className="modal-submit-button"
          >
            Сохранить изменения
          </motion.button>
        </div>
      </Modal>

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ КОПИЛКИ */}
      <Modal
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        title="Редактировать копилку"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <input
            className="modal-input"
            type="text"
            placeholder="Название копилки"
            value={editGoalName}
            onChange={(e) => setEditGoalName(e.target.value)}
          />
          <input
            className="modal-input"
            type="number"
            placeholder="Целевая сумма"
            value={editGoalTarget}
            onChange={(e) => setEditGoalTarget(e.target.value)}
          />
          <div>
            <label className="modal-label">Цвет и иконка</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E0E0E0',
                  background: '#F8F9FA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: selectedColor, flexShrink: 0 }} />
                <span style={{ color: '#666' }}>Выбрать цвет</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E0E0E0',
                  background: '#F8F9FA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{selectedEmoji}</span>
                <span style={{ color: '#666' }}>Выбрать иконку</span>
              </motion.button>
            </div>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="color-picker"
                style={{ marginTop: 10 }}
              >
                {colors.map((col) => (
                  <motion.button
                    key={col}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedColor(col)}
                    className="color-option"
                    style={{
                      background: col,
                      border: selectedColor === col ? '3px solid #667eea' : '2px solid #E0E0E0',
                    }}
                  />
                ))}
              </motion.div>
            )}
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="emoji-picker"
                style={{ marginTop: 10 }}
              >
                {goalEmojis.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedEmoji(emoji)}
                    className="emoji-option"
                    style={{
                      border: selectedEmoji === emoji ? '3px solid #667eea' : '2px solid #E0E0E0',
                    }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleEditGoal}
            className="modal-submit-button"
          >
            Сохранить изменения
          </motion.button>
        </div>
      </Modal>

      {/* КОПИЛКИ */}
      {activeTab === 'goals' && (
        <div style={{ padding: '15px' }}>
          {goals.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', padding: '30px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🐷</div>
              <div>Нет копилок. Создай свою первую цель!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {goals.map((goal) => {
                const progress = (goal.current_amount / goal.target_amount) * 100;
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onTouchStart={(e) => handleLongPressStartGoal(goal.id, e)}
                    onTouchEnd={handleLongPressEnd}
                    onMouseDown={(e) => handleLongPressStartGoal(goal.id, e)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    style={{
                      background: 'white',
                      padding: '15px',
                      borderRadius: '15px',
                      border: `2px solid ${goal.color}`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 'bold' }}>{goal.icon || '🐷'} {goal.name}</div>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 5 }}>
                          {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()} ₽
                        </div>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 8, background: '#F0F0F0', borderRadius: 4, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                        style={{
                          height: '100%',
                          background: goal.color,
                          borderRadius: 4
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 8, textAlign: 'right' }}>
                      {progress.toFixed(1)}%
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* КНОПКА ДОБАВИТЬ КОПИЛКУ */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowGoalForm(true)}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '12px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <Plus size={20} /> Новая копилка
          </motion.button>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ КОПИЛКИ */}
      <Modal isOpen={showGoalForm} onClose={() => setShowGoalForm(false)} title="Новая копилка">
        <div className="modal-body">
          <input
            type="text"
            placeholder="Название цели"
            value={newGoalName}
            onChange={(e) => setNewGoalName(e.target.value)}
            className="modal-input"
          />
          <input
            type="number"
            placeholder="Целевая сумма"
            value={newGoalTarget}
            onChange={(e) => setNewGoalTarget(e.target.value)}
            className="modal-input"
          />
          <div>
            <label className="modal-label">Цвет и иконка</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E0E0E0',
                  background: '#F8F9FA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: selectedColor, flexShrink: 0 }} />
                <span style={{ color: '#666' }}>Выбрать цвет</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E0E0E0',
                  background: '#F8F9FA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{selectedEmoji}</span>
                <span style={{ color: '#666' }}>Выбрать иконку</span>
              </motion.button>
            </div>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="color-picker"
                style={{ marginTop: 10 }}
              >
                {colors.map((col) => (
                  <motion.button
                    key={col}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedColor(col)}
                    className="color-option"
                    style={{
                      background: col,
                      border: selectedColor === col ? '3px solid #667eea' : '2px solid #E0E0E0',
                    }}
                  />
                ))}
              </motion.div>
            )}
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="emoji-picker"
                style={{ marginTop: 10 }}
              >
                {goalEmojis.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedEmoji(emoji)}
                    className="emoji-option"
                    style={{
                      border: selectedEmoji === emoji ? '3px solid #667eea' : '2px solid #E0E0E0',
                    }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateGoal}
            className="modal-submit-button"
          >
            Создать копилку
          </motion.button>
        </div>
      </Modal>

      {/* КНОПКА ПЕРЕВОДА */}
      <div style={{ padding: '15px' }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowTransfer(true)}
          style={{
            width: '100%',
            padding: '12px',
            background: '#4ECDC4',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer'
          }}
        >
          <ArrowRightLeft size={20} /> Перевод между счетами
        </motion.button>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ПЕРЕВОДА */}
      <Modal isOpen={showTransfer} onClose={() => setShowTransfer(false)} title="Перевод между счетами">
        <div className="modal-body">
          <div style={{ marginBottom: 15 }}>
            <label className="modal-label">Откуда</label>
            <select
              value={transferFrom ? `${transferFrom.type}-${transferFrom.id}` : ''}
              onChange={(e) => {
                const [type, id] = e.target.value.split('-');
                setTransferFrom({ type, id: parseInt(id) });
              }}
              className="modal-select"
            >
              <option value="">Выбери счет или копилку</option>
              {accounts.map((acc) => (
                <option key={`acc-${acc.id}`} value={`account-${acc.id}`}>
                  💳 {acc.name} ({acc.balance}₽)
                </option>
              ))}
              {goals.map((goal) => (
                <option key={`goal-${goal.id}`} value={`goal-${goal.id}`}>
                  🐷 {goal.name} ({goal.current_amount}₽)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 15 }}>
            <label className="modal-label">Куда</label>
            <select
              value={transferTo ? `${transferTo.type}-${transferTo.id}` : ''}
              onChange={(e) => {
                const [type, id] = e.target.value.split('-');
                setTransferTo({ type, id: parseInt(id) });
              }}
              className="modal-select"
            >
              <option value="">Выбери счет или копилку</option>
              {accounts.map((acc) => (
                <option key={`acc-${acc.id}`} value={`account-${acc.id}`}>
                  💳 {acc.name} ({acc.balance}₽)
                </option>
              ))}
              {goals.map((goal) => (
                <option key={`goal-${goal.id}`} value={`goal-${goal.id}`}>
                  🐷 {goal.name} ({goal.current_amount}₽)
                </option>
              ))}
            </select>
          </div>

          <input
            type="number"
            placeholder="Сумма перевода"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            className="modal-input"
          />

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleTransfer}
            className="modal-submit-button"
            style={{ background: '#4ECDC4' }}
          >
            Перевести
          </motion.button>
        </div>
      </Modal>

      {/* КОНТЕКСТНОЕ МЕНЮ */}
      {contextMenu && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setContextMenu(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              zIndex: 1000,
              minWidth: 150
            }}
          >
            <button
              onClick={() => {
                const account = accounts.find(acc => acc.id === contextMenu.accountId);
                if (account) openEditModal(account);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: '#667eea',
                borderBottom: '1px solid #F0F0F0'
              }}
            >
              ✏️ Редактировать
            </button>
            <button
              onClick={() => handleDeleteAccount(contextMenu.accountId)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: '#FF6B6B'
              }}
            >
              🗑️ Удалить
            </button>
          </motion.div>
        </>
      )}

      {/* КОНТЕКСТНОЕ МЕНЮ ДЛЯ КОПИЛОК */}
      {goalContextMenu && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setGoalContextMenu(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              top: goalContextMenu.y,
              left: goalContextMenu.x,
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              zIndex: 1000,
              minWidth: 150
            }}
          >
            <button
              onClick={() => {
                const goal = goals.find(g => g.id === goalContextMenu.goalId);
                if (goal) openEditGoalModal(goal);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: '#667eea',
                borderBottom: '1px solid #F0F0F0'
              }}
            >
              ✏️ Редактировать
            </button>
            <button
              onClick={() => handleDeleteGoal(goalContextMenu.goalId)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: '#FF6B6B'
              }}
            >
              🗑️ Удалить
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
};

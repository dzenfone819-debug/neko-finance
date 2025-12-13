import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowRightLeft, Edit2, Trash2 } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import * as api from '../api/nekoApi';
import { Modal } from './Modal';

interface Account {
  id: number;
  name: string;
  balance: number;
  type: string;
  color: string;
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
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedIcon, setSelectedIcon] = useState('🐷');
  const [transferFrom, setTransferFrom] = useState<{ type: string; id: number } | null>(null);
  const [transferTo, setTransferTo] = useState<{ type: string; id: number } | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [contextMenu, setContextMenu] = useState<{ type: 'account' | 'goal'; id: number; x: number; y: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountBalance, setEditAccountBalance] = useState('');
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalTarget, setEditGoalTarget] = useState('');
  const [editGoalCurrent, setEditGoalCurrent] = useState('');

  const colors = ['#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#FFA07A', '#74b9ff', '#a29bfe', '#dfe6e9', '#00b894', '#fdcb6e'];
  const goalIcons = ['🐷', '🏠', '✈️', '🚗', '💍', '🎓', '💻', '🎮', '📱', '⌚', '🐱', '🐶', '🎁', '🎸', '📷'];
  const accountTypes = [
    { value: 'cash', label: '💵 Наличные' },
    { value: 'card', label: '💳 Карта' },
    { value: 'checking', label: '🏦 Расчетный счет' },
    { value: 'savings', label: '💰 Сбережения' }
  ];

  const handleCreateAccount = async () => {
    if (!userId || !newAccountName || !newAccountType) return;
    try {
      await api.createAccount(userId, newAccountName, 0, newAccountType, selectedColor);
      WebApp.HapticFeedback.notificationOccurred('success');
      setNewAccountName('');
      setNewAccountType('cash');
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
      await api.createGoal(userId, newGoalName, parseFloat(newGoalTarget), selectedColor, selectedIcon);
      WebApp.HapticFeedback.notificationOccurred('success');
      setNewGoalName('');
      setNewGoalTarget('');
      setSelectedIcon('🐷');
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

  const handleDeleteGoal = async (goalId: number) => {
    if (!userId) return;
    try {
      await api.deleteGoal(userId, goalId);
      WebApp.HapticFeedback.notificationOccurred('success');
      setContextMenu(null);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLongPressStart = (type: 'account' | 'goal', id: number, e: React.TouchEvent | React.MouseEvent) => {
    // Используем координаты клика/тача для позиционирования меню
    let clientX, clientY;

    if ('touches' in e) {
       clientX = e.touches[0].clientX;
       clientY = e.touches[0].clientY;
    } else {
       clientX = (e as React.MouseEvent).clientX;
       clientY = (e as React.MouseEvent).clientY;
    }

    const timer = window.setTimeout(() => {
      WebApp.HapticFeedback.impactOccurred('medium');
      // Корректируем координаты, чтобы меню не уходило за экран
      const screenWidth = window.innerWidth;
      const x = clientX > screenWidth / 2 ? clientX - 160 : clientX;

      setContextMenu({ type, id, x, y: clientY });
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      window.clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const openEditAccount = (account: Account) => {
    setEditingAccount(account);
    setEditAccountName(account.name);
    setEditAccountBalance(account.balance.toString());
    setSelectedColor(account.color);
    setContextMenu(null);
  };

  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditGoalName(goal.name);
    setEditGoalTarget(goal.target_amount.toString());
    setEditGoalCurrent(goal.current_amount.toString());
    setSelectedColor(goal.color);
    setSelectedIcon(goal.icon);
    setContextMenu(null);
  };

  const handleEditAccount = async () => {
    if (!userId || !editingAccount || !editAccountName) return;
    try {
      await api.updateAccount(userId, editingAccount.id, {
        name: editAccountName,
        balance: parseFloat(editAccountBalance) || editingAccount.balance,
        color: selectedColor
      });
      WebApp.HapticFeedback.notificationOccurred('success');
      setEditingAccount(null);
      onRefresh();
    } catch (e) {
      console.error(e);
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  const handleEditGoal = async () => {
    if (!userId || !editingGoal || !editGoalName || !editGoalTarget) return;
    try {
      await api.updateGoal(userId, editingGoal.id, {
        name: editGoalName,
        target_amount: parseFloat(editGoalTarget),
        current_amount: parseFloat(editGoalCurrent) || 0,
        color: selectedColor,
        icon: selectedIcon
      });
      WebApp.HapticFeedback.notificationOccurred('success');
      setEditingGoal(null);
      onRefresh();
    } catch (e) {
      console.error(e);
      WebApp.HapticFeedback.notificationOccurred('error');
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
    <div className="accounts-container">
      {/* HEADER */}
      <div className="accounts-header">
        <div className="accounts-header-title">Общий баланс</div>
        <div className="accounts-header-balance">{totalBalance.toLocaleString()} ₽</div>
        <div className="accounts-header-subtitle">В копилках: {totalSavings.toLocaleString()} ₽</div>
      </div>

      {/* TABS */}
      <div className="accounts-tabs">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`tab-button ${activeTab === 'accounts' ? 'active' : ''}`}
        >
          💳 Счета
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`tab-button ${activeTab === 'goals' ? 'active' : ''}`}
        >
          🐷 Копилки
        </button>
      </div>

      {/* CONTENT */}
      <div className="content-section">

        {/* ACCOUNTS LIST */}
        {activeTab === 'accounts' && (
          <>
            {accounts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💳</div>
                <div className="empty-state-text">Нет счетов. Создай свой первый счет!</div>
              </div>
            ) : (
              <div className="cards-list">
                {accounts.map((acc) => (
                  <motion.div
                    key={acc.id}
                    className="account-card"
                    style={{ background: acc.color }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.98 }}
                    onTouchStart={(e) => handleLongPressStart('account', acc.id, e)}
                    onTouchEnd={handleLongPressEnd}
                    onMouseDown={(e) => handleLongPressStart('account', acc.id, e)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                  >
                    <div className="account-card-content">
                      <div className="account-name">{acc.name}</div>
                      <div className="account-balance">{acc.balance.toLocaleString()} ₽</div>
                    </div>
                    <div style={{ opacity: 0.3 }}>
                      {acc.type === 'card' && <div style={{ fontSize: 40 }}>💳</div>}
                      {acc.type === 'cash' && <div style={{ fontSize: 40 }}>💵</div>}
                      {acc.type === 'savings' && <div style={{ fontSize: 40 }}>💰</div>}
                      {acc.type === 'checking' && <div style={{ fontSize: 40 }}>🏦</div>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ADD ACCOUNT BUTTON */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAccountForm(true)}
              className="action-button"
            >
              <Plus size={20} /> Добавить счет
            </motion.button>
          </>
        )}

        {/* GOALS LIST */}
        {activeTab === 'goals' && (
          <>
            {goals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🐷</div>
                <div className="empty-state-text">Нет копилок. Создай свою первую цель!</div>
              </div>
            ) : (
              <div className="cards-list">
                {goals.map((goal) => {
                  const progress = (goal.current_amount / goal.target_amount) * 100;
                  return (
                    <motion.div
                      key={goal.id}
                      className="goal-card"
                      style={{ borderColor: goal.color }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileTap={{ scale: 0.98 }}
                      onTouchStart={(e) => handleLongPressStart('goal', goal.id, e)}
                      onTouchEnd={handleLongPressEnd}
                      onMouseDown={(e) => handleLongPressStart('goal', goal.id, e)}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                    >
                      <div className="goal-header">
                        <div>
                          <div className="goal-title">
                            <span style={{ fontSize: 20 }}>{goal.icon}</span> {goal.name}
                          </div>
                          <div className="goal-amount">
                            {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()} ₽
                          </div>
                        </div>
                        <div style={{ color: goal.color, fontWeight: 'bold' }}>
                          {Math.round(progress)}%
                        </div>
                      </div>

                      <div className="progress-container">
                        <motion.div
                          className="progress-bar"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress, 100)}%` }}
                          transition={{ duration: 0.5 }}
                          style={{ background: goal.color }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ADD GOAL BUTTON */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowGoalForm(true)}
              className="action-button"
            >
              <Plus size={20} /> Новая копилка
            </motion.button>
          </>
        )}

        {/* TRANSFER BUTTON */}
        <div style={{ marginTop: 24, paddingBottom: 24 }}>
           <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTransfer(true)}
            className="transfer-button"
          >
            <ArrowRightLeft size={20} /> Перевод между счетами
          </motion.button>
        </div>

      </div>

      {/* --- MODALS --- */}

      {/* CREATE ACCOUNT MODAL */}
      <Modal isOpen={showAccountForm} onClose={() => setShowAccountForm(false)} title="Новый счет">
        <div className="modal-body">
          <div className="modal-form-group">
            <label className="modal-label">Название</label>
            <input
              type="text"
              placeholder="Например: Основная карта"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="modal-input"
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Тип счета</label>
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
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Цвет</label>
            <div className="color-picker">
              {colors.map((col) => (
                <motion.button
                  key={col}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedColor(col)}
                  className={`color-option ${selectedColor === col ? 'selected' : ''}`}
                  style={{ background: col }}
                />
              ))}
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateAccount}
            className="modal-submit-btn"
          >
            Создать счет
          </motion.button>
        </div>
      </Modal>

      {/* CREATE GOAL MODAL */}
      <Modal isOpen={showGoalForm} onClose={() => setShowGoalForm(false)} title="Новая копилка">
        <div className="modal-body">
          <div className="modal-form-group">
            <label className="modal-label">Название</label>
            <input
              type="text"
              placeholder="На что копим?"
              value={newGoalName}
              onChange={(e) => setNewGoalName(e.target.value)}
              className="modal-input"
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Целевая сумма</label>
            <input
              type="number"
              placeholder="0"
              value={newGoalTarget}
              onChange={(e) => setNewGoalTarget(e.target.value)}
              className="modal-input"
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Иконка</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {goalIcons.map((icon) => (
                <motion.button
                  key={icon}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedIcon(icon)}
                  style={{
                    width: 44,
                    height: 44,
                    fontSize: 22,
                    border: selectedIcon === icon ? '3px solid #667eea' : '2px solid transparent',
                    borderRadius: 12,
                    background: '#F8F9FA',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  {icon}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Цвет</label>
            <div className="color-picker">
              {colors.map((col) => (
                <motion.button
                  key={col}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedColor(col)}
                  className={`color-option ${selectedColor === col ? 'selected' : ''}`}
                  style={{ background: col }}
                />
              ))}
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateGoal}
            className="modal-submit-btn"
          >
            Создать копилку
          </motion.button>
        </div>
      </Modal>

      {/* TRANSFER MODAL */}
      <Modal isOpen={showTransfer} onClose={() => setShowTransfer(false)} title="Перевод средств">
        <div className="modal-body">
          <div className="modal-form-group">
            <label className="modal-label">Откуда</label>
            <select
              value={transferFrom ? `${transferFrom.type}-${transferFrom.id}` : ''}
              onChange={(e) => {
                const [type, id] = e.target.value.split('-');
                setTransferFrom({ type, id: parseInt(id) });
              }}
              className="modal-select"
            >
              <option value="">Выберите счет списания</option>
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

          <div className="modal-form-group">
            <label className="modal-label">Куда</label>
            <select
              value={transferTo ? `${transferTo.type}-${transferTo.id}` : ''}
              onChange={(e) => {
                const [type, id] = e.target.value.split('-');
                setTransferTo({ type, id: parseInt(id) });
              }}
              className="modal-select"
            >
              <option value="">Выберите счет пополнения</option>
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

          <div className="modal-form-group">
            <label className="modal-label">Сумма перевода</label>
            <input
              type="number"
              placeholder="0"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="modal-input"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleTransfer}
            className="modal-submit-btn"
            style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #556270 100%)', boxShadow: '0 4px 16px rgba(78, 205, 196, 0.4)' }}
          >
            Перевести
          </motion.button>
        </div>
      </Modal>

      {/* CONTEXT MENU */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="context-menu-backdrop"
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="context-menu"
              style={{
                top: contextMenu.y,
                left: contextMenu.x,
              }}
            >
              <button
                className="context-menu-item"
                onClick={() => {
                  if (contextMenu.type === 'account') {
                    const account = accounts.find((a) => a.id === contextMenu.id);
                    if (account) openEditAccount(account);
                  } else {
                    const goal = goals.find((g) => g.id === contextMenu.id);
                    if (goal) openEditGoal(goal);
                  }
                }}
              >
                <Edit2 size={18} /> Редактировать
              </button>
              <button
                className="context-menu-item delete"
                onClick={() => {
                  if (contextMenu.type === 'account') {
                    handleDeleteAccount(contextMenu.id);
                  } else {
                    handleDeleteGoal(contextMenu.id);
                  }
                }}
              >
                <Trash2 size={18} /> Удалить
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* EDIT ACCOUNT MODAL */}
      <Modal isOpen={editingAccount !== null} onClose={() => setEditingAccount(null)} title="Редактировать счет">
        <div className="modal-body">
          <div className="modal-form-group">
            <label className="modal-label">Название</label>
            <input
              type="text"
              value={editAccountName}
              onChange={(e) => setEditAccountName(e.target.value)}
              className="modal-input"
            />
          </div>
          <div className="modal-form-group">
            <label className="modal-label">Баланс</label>
            <input
              type="number"
              value={editAccountBalance}
              onChange={(e) => setEditAccountBalance(e.target.value)}
              className="modal-input"
            />
          </div>
          <div className="modal-form-group">
            <label className="modal-label">Цвет</label>
            <div className="color-picker">
              {colors.map((col) => (
                <motion.button
                  key={col}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedColor(col)}
                  className={`color-option ${selectedColor === col ? 'selected' : ''}`}
                  style={{ background: col }}
                />
              ))}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleEditAccount}
            className="modal-submit-btn"
          >
            Сохранить
          </motion.button>
        </div>
      </Modal>

      {/* EDIT GOAL MODAL */}
      <Modal isOpen={editingGoal !== null} onClose={() => setEditingGoal(null)} title="Редактировать копилку">
        <div className="modal-body">
          <div className="modal-form-group">
            <label className="modal-label">Название</label>
            <input
              type="text"
              value={editGoalName}
              onChange={(e) => setEditGoalName(e.target.value)}
              className="modal-input"
            />
          </div>
          <div className="modal-form-group">
            <label className="modal-label">Текущая сумма</label>
            <input
              type="number"
              value={editGoalCurrent}
              onChange={(e) => setEditGoalCurrent(e.target.value)}
              className="modal-input"
            />
          </div>
          <div className="modal-form-group">
            <label className="modal-label">Целевая сумма</label>
            <input
              type="number"
              value={editGoalTarget}
              onChange={(e) => setEditGoalTarget(e.target.value)}
              className="modal-input"
            />
          </div>
          <div className="modal-form-group">
            <label className="modal-label">Иконка</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {goalIcons.map((icon) => (
                <motion.button
                  key={icon}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedIcon(icon)}
                  style={{
                    width: 44,
                    height: 44,
                    fontSize: 22,
                    border: selectedIcon === icon ? '3px solid #667eea' : '2px solid transparent',
                    borderRadius: 12,
                    background: '#F8F9FA',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  {icon}
                </motion.button>
              ))}
            </div>
          </div>
          <div className="modal-form-group">
            <label className="modal-label">Цвет</label>
            <div className="color-picker">
              {colors.map((col) => (
                <motion.button
                  key={col}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedColor(col)}
                  className={`color-option ${selectedColor === col ? 'selected' : ''}`}
                  style={{ background: col }}
                />
              ))}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleEditGoal}
            className="modal-submit-btn"
          >
            Сохранить
          </motion.button>
        </div>
      </Modal>
    </div>
  );
};

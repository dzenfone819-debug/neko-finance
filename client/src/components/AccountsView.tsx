import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowRightLeft } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import * as api from '../api/nekoApi';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';

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

  const colors = ['#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#FFA07A'];
  const goalIcons = ['🐷', '🏠', '✈️', '🚗', '💍', '🎓', '💻', '🎮', '📱', '⌚'];
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

  // Local confirmation state for account/goal deletion
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ type: 'account' | 'goal'; id: number } | null>(null);

  const openLocalConfirm = (type: 'account' | 'goal', id: number) => {
    setPendingDelete({ type, id });
    setConfirmMessage(type === 'account' ? 'Удалить счет? Все транзакции, связанные со счетом останутся.' : 'Удалить копилку? Данные будут утеряны.');
    setConfirmOpen(true);
  }

  const handleLocalConfirmCancel = () => { setConfirmOpen(false); setPendingDelete(null); }

  const handleLocalConfirm = async () => {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.type === 'account') await handleDeleteAccount(pendingDelete.id);
      else await handleDeleteGoal(pendingDelete.id);
    } catch (e) { console.error(e); }
    setConfirmOpen(false);
    setPendingDelete(null);
  }

  const handleLongPressStart = (type: 'account' | 'goal', id: number, e: React.TouchEvent | React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const timer = window.setTimeout(() => {
      WebApp.HapticFeedback.impactOccurred('medium');
      setContextMenu({ type, id, x: rect.right - 150, y: rect.bottom });
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
    <div style={{ padding: '0 0', height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
      {/* ОБЩИЙ БАЛАНС */}
      <div className="accounts-header">
        <div className="subtitle">Общий баланс на счетах</div>
        <div className="total">{totalBalance.toLocaleString()} ₽</div>
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 6 }}>В копилках: {totalSavings.toLocaleString()} ₽</div>
      </div>

      {/* ТАБЫ */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 15px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('accounts')}
          style={{
            flex: 1,
            padding: '10px',
            background: activeTab === 'accounts' ? 'linear-gradient(135deg, var(--primary) 0%, #764ba2 100%)' : 'var(--bg-card)',
            color: activeTab === 'accounts' ? 'white' : 'var(--text-secondary)',
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
            background: activeTab === 'goals' ? 'linear-gradient(135deg, var(--primary) 0%, #764ba2 100%)' : 'var(--bg-card)',
            color: activeTab === 'goals' ? 'white' : 'var(--text-secondary)',
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
        <div className="accounts-container">
          {accounts.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px 0' }}>
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
                  onTouchStart={(e) => handleLongPressStart('account', acc.id, e)}
                  onTouchEnd={handleLongPressEnd}
                  onMouseDown={(e) => handleLongPressStart('account', acc.id, e)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  className="account-card"
                  style={{ background: acc.color, cursor: 'pointer', userSelect: 'none' }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>{acc.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{acc.balance.toLocaleString()} ₽</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* КНОПКА ДОБАВИТЬ СЧЕТ */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAccountForm(true)}
            className="add-button"
            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #764ba2 100%)', color: 'white', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
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
          <div className="color-picker">
            {colors.map((col) => (
              <motion.button
                key={col}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedColor(col)}
                className="color-option"
                style={{
                  background: col,
                  border: selectedColor === col ? '3px solid var(--primary)' : '2px solid var(--border-color)',
                }}
              />
            ))}
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

      {/* КОПИЛКИ */}
      {activeTab === 'goals' && (
        <div style={{ padding: '15px' }}>
          {goals.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px 0' }}>
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
                    onTouchStart={(e) => handleLongPressStart('goal', goal.id, e)}
                    onTouchEnd={handleLongPressEnd}
                    onMouseDown={(e) => handleLongPressStart('goal', goal.id, e)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    className="goal-card"
                    style={{ border: `2px solid ${goal.color}`, cursor: 'pointer', userSelect: 'none', background: 'var(--bg-card)' }}
                  >
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--text-main)' }}>{goal.icon} {goal.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>
                        {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()} ₽
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
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
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'right' }}>
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
            className="add-button"
            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #764ba2 100%)', color: 'white', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
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
          <div style={{ marginBottom: 15 }}>
            <label className="modal-label">Иконка</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {goalIcons.map((icon) => (
                <motion.button
                  key={icon}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedIcon(icon)}
                  style={{
                    width: 40,
                    height: 40,
                    fontSize: 20,
                    border: selectedIcon === icon ? '3px solid var(--primary)' : '2px solid var(--border-color)',
                    borderRadius: 8,
                    background: 'var(--bg-input)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {icon}
                </motion.button>
              ))}
            </div>
          </div>
          <div className="color-picker">
            {colors.map((col) => (
              <motion.button
                key={col}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedColor(col)}
                className="color-option"
                style={{
                  background: col,
                  border: selectedColor === col ? '3px solid var(--primary)' : '2px solid var(--border-color)',
                }}
              />
            ))}
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

      {/* CONTEXT MENU */}
      {contextMenu && (
        <>
          <div
            onClick={() => setContextMenu(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: 'var(--bg-card)',
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              padding: 8,
              zIndex: 1000,
              minWidth: 150
            }}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (contextMenu.type === 'account') {
                  const account = accounts.find((a) => a.id === contextMenu.id);
                  if (account) openEditAccount(account);
                } else {
                  const goal = goals.find((g) => g.id === contextMenu.id);
                  if (goal) openEditGoal(goal);
                }
              }}
              style={{
                width: '100%',
                padding: '10px 15px',
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                color: 'var(--text-main)',
                textAlign: 'left'
              }}
            >
              ✏️ Редактировать
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (contextMenu.type === 'account') {
                  openLocalConfirm('account', contextMenu.id);
                } else {
                  openLocalConfirm('goal', contextMenu.id);
                }
              }}
              style={{
                width: '100%',
                padding: '10px 15px',
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                color: 'var(--accent-danger)',
                textAlign: 'left'
              }}
            >
              🗑️ Удалить
            </motion.button>
          </motion.div>
        </>
      )}

      <ConfirmModal isOpen={confirmOpen} message={confirmMessage} onCancel={handleLocalConfirmCancel} onConfirm={handleLocalConfirm} />

      {/* MODAL EDIT ACCOUNT */}
      <Modal isOpen={editingAccount !== null} onClose={() => setEditingAccount(null)} title="Редактировать счет">
        <div className="modal-body">
          <input
            type="text"
            placeholder="Название счета"
            value={editAccountName}
            onChange={(e) => setEditAccountName(e.target.value)}
            className="modal-input"
          />
          <input
            type="number"
            placeholder="Баланс"
            value={editAccountBalance}
            onChange={(e) => setEditAccountBalance(e.target.value)}
            className="modal-input"
          />
          <div className="color-picker">
            {colors.map((col) => (
              <motion.button
                key={col}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedColor(col)}
                className="color-option"
                style={{
                  background: col,
                  border: selectedColor === col ? '3px solid var(--primary)' : '2px solid var(--border-color)',
                }}
              />
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleEditAccount}
            className="modal-submit-button"
          >
            Сохранить
          </motion.button>
        </div>
      </Modal>

      {/* MODAL EDIT GOAL */}
      <Modal isOpen={editingGoal !== null} onClose={() => setEditingGoal(null)} title="Редактировать копилку">
        <div className="modal-body">
          <input
            type="text"
            placeholder="Название копилки"
            value={editGoalName}
            onChange={(e) => setEditGoalName(e.target.value)}
            className="modal-input"
          />
          <input
            type="number"
            placeholder="Текущая сумма"
            value={editGoalCurrent}
            onChange={(e) => setEditGoalCurrent(e.target.value)}
            className="modal-input"
          />
          <input
            type="number"
            placeholder="Целевая сумма"
            value={editGoalTarget}
            onChange={(e) => setEditGoalTarget(e.target.value)}
            className="modal-input"
          />
          <div style={{ marginBottom: 15 }}>
            <label className="modal-label">Иконка</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {goalIcons.map((icon) => (
                <motion.button
                  key={icon}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedIcon(icon)}
                  style={{
                    width: 40,
                    height: 40,
                    fontSize: 20,
                    border: selectedIcon === icon ? '3px solid var(--primary)' : '2px solid var(--border-color)',
                    borderRadius: 8,
                    background: 'var(--bg-input)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {icon}
                </motion.button>
              ))}
            </div>
          </div>
          <div className="color-picker">
            {colors.map((col) => (
              <motion.button
                key={col}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedColor(col)}
                className="color-option"
                style={{
                  background: col,
                  border: selectedColor === col ? '3px solid var(--primary)' : '2px solid var(--border-color)',
                }}
              />
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleEditGoal}
            className="modal-submit-button"
          >
            Сохранить
          </motion.button>
        </div>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, ArrowRightLeft } from 'lucide-react';
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
  const [selectedColor, setSelectedColor] = useState('#CAFFBF');
  const [transferFrom, setTransferFrom] = useState<{ type: string; id: number } | null>(null);
  const [transferTo, setTransferTo] = useState<{ type: string; id: number } | null>(null);
  const [transferAmount, setTransferAmount] = useState('');

  const colors = ['#CAFFBF', '#FFADAD', '#A0C4FF', '#FFD6A5', '#FFC6FF', '#9BF6FF', '#D0F4DE'];
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
      await api.createGoal(userId, newGoalName, parseFloat(newGoalTarget), selectedColor, '🐷');
      WebApp.HapticFeedback.notificationOccurred('success');
      setNewGoalName('');
      setNewGoalTarget('');
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
                  style={{
                    background: acc.color,
                    padding: '15px',
                    borderRadius: '15px',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>{acc.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{acc.balance.toLocaleString()} ₽</div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteAccount(acc.id)}
                    style={{
                      background: 'rgba(255,255,255,0.3)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white'
                    }}
                  >
                    <Trash2 size={18} />
                  </motion.button>
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
          <div className="color-picker">
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
                    style={{
                      background: 'white',
                      padding: '15px',
                      borderRadius: '15px',
                      border: `2px solid ${goal.color}`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 'bold' }}>{goal.icon} {goal.name}</div>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 5 }}>
                          {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()} ₽
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteGoal(goal.id)}
                        style={{
                          background: '#FFE5E5',
                          border: 'none',
                          borderRadius: '50%',
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#FF6B6B'
                        }}
                      >
                        <Trash2 size={16} />
                      </motion.button>
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
          <div className="color-picker">
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
    </div>
  );
};

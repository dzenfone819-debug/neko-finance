import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Settings, Link2, Unlink, Info, UserPlus, Check, X, Trash2, Download, Upload, Cloud } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import * as api from '../api/nekoApi';
import { exportBackup, importBackup, performFullRestore } from '../utils/backupRestore';
import { cloudStorage } from '../utils/cloudStorage';

interface LinkedAccount {
  telegram_id: number
  primary_user_id: number
}

interface Account {
  id: number;
  name: string;
  balance: number;
  type: string;
  color: string;
}

interface Props {
  periodType: 'calendar_month' | 'custom_period';
  periodStartDay: number;
  onSave: (periodType: 'calendar_month' | 'custom_period', startDay: number) => void;
  userId: number | null;
  accounts?: Account[];
  onRefresh?: () => void;
}

export const SettingsView: React.FC<Props> = ({ periodType, periodStartDay, onSave, userId, accounts = [], onRefresh }) => {
  const [localPeriodType, setLocalPeriodType] = useState(periodType);
  const [localStartDay, setLocalStartDay] = useState(periodStartDay);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Состояния для связанных аккаунтов
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [primaryUserId, setPrimaryUserId] = useState<number | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [linkUserId, setLinkUserId] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (userId) {
      loadLinkedAccounts()
    }
  }, [userId])

  const loadLinkedAccounts = async () => {
    if (!userId) return
    try {
      const data = await api.getLinkedAccounts(userId)
      setLinkedAccounts(data.linked_accounts || [])
      setPrimaryUserId(data.primary_user_id)
    } catch (error) {
      console.error('Error loading linked accounts:', error)
    }
  }

  const handleLinkAccount = async () => {
    if (!userId || !linkUserId) return
    
    const targetUserId = parseInt(linkUserId)
    if (isNaN(targetUserId)) {
      showMessage('Введите корректный ID', 'error')
      return
    }

    WebApp.HapticFeedback.impactOccurred('medium')
    
    try {
      await api.linkAccount(userId, targetUserId)
      showMessage('Аккаунт успешно привязан!', 'success')
      setLinkUserId('')
      setIsLinking(false)
      loadLinkedAccounts()
      WebApp.HapticFeedback.notificationOccurred('success')
    } catch (error) {
      console.error('Error linking account:', error)
      showMessage('Ошибка при привязке', 'error')
      WebApp.HapticFeedback.notificationOccurred('error')
    }
  }

  const handleUnlinkAccount = async () => {
    if (!userId) return
    
    WebApp.HapticFeedback.impactOccurred('medium')
    
    const confirmed = window.confirm('Вы уверены, что хотите отвязать свой аккаунт? Вы вернетесь к использованию отдельных данных.')
    if (!confirmed) return

    try {
      await api.unlinkAccount(userId)
      showMessage('Аккаунт отвязан', 'success')
      loadLinkedAccounts()
      WebApp.HapticFeedback.notificationOccurred('success')
    } catch (error) {
      console.error('Error unlinking account:', error)
      showMessage('Ошибка при отвязке', 'error')
      WebApp.HapticFeedback.notificationOccurred('error')
    }
  }

  const handleResetAllData = async () => {
    if (!userId) return
    
    WebApp.HapticFeedback.impactOccurred('heavy')
    
    const confirmed = window.confirm(
      '⚠️ ВНИМАНИЕ!\n\n' +
      'Вы собираетесь ПОЛНОСТЬЮ УДАЛИТЬ все данные:\n' +
      '• Все транзакции\n' +
      '• Все счета\n' +
      '• Все копилки\n' +
      '• Бюджет и лимиты\n' +
      '• Кастомные категории\n' +
      '• Связанные аккаунты\n\n' +
      'Это действие НЕВОЗМОЖНО отменить!\n\n' +
      'Продолжить?'
    )
    
    if (!confirmed) return

    const doubleConfirmed = window.confirm(
      '🚨 ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ!\n\n' +
      'Все данные будут безвозвратно удалены.\n' +
      'Вы ТОЧНО уверены?'
    )
    
    if (!doubleConfirmed) return

    try {
      await api.resetAllData(userId)
      showMessage('✅ Все данные удалены. Перезагрузите приложение.', 'success')
      WebApp.HapticFeedback.notificationOccurred('success')
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Error resetting data:', error)
      showMessage('❌ Ошибка при сбросе данных', 'error')
      WebApp.HapticFeedback.notificationOccurred('error')
    }
  }

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  // Бэкап и восстановление
  const handleExportBackup = async () => {
    if (!userId) return;
    try {
      WebApp.HapticFeedback.impactOccurred('light');
      
      // Загружаем все данные для экспорта
      const [allTransactions, budgetData, customCategories, categoryLimits, goals] = await Promise.all([
        api.fetchTransactions(userId),
        api.fetchBudget(userId),
        api.fetchCustomCategories(userId),
        api.fetchCategoryLimits(userId),
        api.fetchGoals(userId)
      ]);

      await exportBackup(allTransactions, accounts || [], goals, { budget_limit: budgetData }, customCategories, categoryLimits);
      WebApp.HapticFeedback.notificationOccurred('success');
      showMessage('✅ Бэкап успешно создан!', 'success');
    } catch (e) {
      console.error('Export error:', e);
      WebApp.HapticFeedback.notificationOccurred('error');
      showMessage('❌ Ошибка создания бэкапа', 'error');
    }
  };

  const handleImportBackup = () => {
    WebApp.HapticFeedback.impactOccurred('light');
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    try {
      setIsRestoring(true);
      WebApp.HapticFeedback.impactOccurred('medium');

      const backup = await importBackup(file);
      if (!backup) {
        WebApp.HapticFeedback.notificationOccurred('error');
        alert('Ошибка: неверный формат файла');
        return;
      }

      const confirmed = confirm(
        `Восстановить данные из бэкапа?\\n\\n` +
        `Дата экспорта: ${new Date(backup.exportDate).toLocaleString('ru')}\\n` +
        `Транзакций: ${backup.data.transactions?.length || 0}\\n` +
        `Счетов: ${backup.data.accounts?.length || 0}\\n` +
        `Копилок: ${backup.data.goals?.length || 0}\\n` +
        `Категорий: ${backup.data.categories?.length || 0}\\n\\n` +
        `ВНИМАНИЕ: Это добавит новые данные к существующим.`
      );

      if (!confirmed) {
        setIsRestoring(false);
        return;
      }

      const success = await performFullRestore(String(userId), backup);
      
      if (success) {
        WebApp.HapticFeedback.notificationOccurred('success');
        showMessage('✅ Данные успешно восстановлены!', 'success');
        if (onRefresh) onRefresh();
      } else {
        WebApp.HapticFeedback.notificationOccurred('error');
        showMessage('❌ Ошибка восстановления данных', 'error');
      }
    } catch (e) {
      console.error('Import error:', e);
      WebApp.HapticFeedback.notificationOccurred('error');
      showMessage('❌ Ошибка импорта', 'error');
    } finally {
      setIsRestoring(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!userId || !cloudStorage.isAvailable()) {
      showMessage('☁️ Облачное хранилище недоступно', 'error');
      return;
    }

    try {
      WebApp.HapticFeedback.impactOccurred('medium');
      setIsRestoring(true);

      const cloudData = await cloudStorage.loadFromCloud();
      if (!cloudData || cloudData.transactions.length === 0) {
        showMessage('☁️ В облаке нет сохранённых данных', 'error');
        return;
      }

      const confirmed = confirm(
        `Восстановить данные из облака?\\n\\n` +
        `Последняя синхронизация: ${new Date(cloudData.lastSyncTime).toLocaleString('ru')}\\n` +
        `Транзакций: ${cloudData.transactions.length}\\n` +
        `Счетов: ${cloudData.accounts.length}\\n\\n` +
        `ВНИМАНИЕ: Это добавит новые данные к существующим.`
      );

      if (!confirmed) {
        setIsRestoring(false);
        return;
      }

      const backup = {
        version: '1.0',
        exportDate: new Date(cloudData.lastSyncTime).toISOString(),
        data: {
          transactions: cloudData.transactions,
          accounts: cloudData.accounts,
          budgetSettings: cloudData.budgetSettings,
          categories: cloudData.categories
        }
      };

      const success = await performFullRestore(String(userId), backup);
      
      if (success) {
        WebApp.HapticFeedback.notificationOccurred('success');
        showMessage('✅ Данные из облака восстановлены!', 'success');
        if (onRefresh) onRefresh();
      } else {
        WebApp.HapticFeedback.notificationOccurred('error');
        showMessage('❌ Ошибка восстановления', 'error');
      }
    } catch (e) {
      console.error('Cloud restore error:', e);
      WebApp.HapticFeedback.notificationOccurred('error');
      showMessage('❌ Ошибка восстановления из облака', 'error');
    } finally {
      setIsRestoring(false);
    }
  };


  const handleSave = async () => {
    WebApp.HapticFeedback.impactOccurred('medium');
    setIsSaving(true);
    try {
      await onSave(localPeriodType, localStartDay);
      WebApp.HapticFeedback.notificationOccurred('success');
      // Перезагружаем страницу через 500мс чтобы применить новые настройки
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      WebApp.HapticFeedback.notificationOccurred('error');
      setIsSaving(false);
    }
  };

  const handlePeriodTypeChange = (type: 'calendar_month' | 'custom_period') => {
    WebApp.HapticFeedback.selectionChanged();
    setLocalPeriodType(type);
    // При переключении на календарный месяц сбрасываем день на 1
    if (type === 'calendar_month') {
      setLocalStartDay(1);
    }
  };

  const handleDayChange = (day: number) => {
    WebApp.HapticFeedback.selectionChanged();
    setLocalStartDay(day);
  };

  const hasChanges = localPeriodType !== periodType || localStartDay !== periodStartDay;

  return (
    <div style={{ padding: '20px 15px', paddingBottom: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 25 }}>
        <Settings size={24} color="#6B4C75" />
        <h2 style={{ margin: 0, color: '#6B4C75', fontSize: 20 }}>Настройки бюджета</h2>
      </div>

      {/* Тип периода */}
      <div style={{ 
        background: '#FFF', 
        borderRadius: 20, 
        padding: 20, 
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15 }}>
          <Calendar size={20} color="#6B4C75" />
          <h3 style={{ margin: 0, fontSize: 16, color: '#2D3436' }}>Бюджетный период</h3>
        </div>

        <p style={{ 
          fontSize: 13, 
          color: '#666', 
          marginBottom: 15,
          lineHeight: 1.5
        }}>
          Выберите, как вести бюджет: по календарным месяцам или по собственным периодам
        </p>

        {/* Календарный месяц */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => handlePeriodTypeChange('calendar_month')}
          style={{
            background: localPeriodType === 'calendar_month' ? '#F0E6F6' : '#F8F9FA',
            border: `2px solid ${localPeriodType === 'calendar_month' ? '#D291BC' : '#E0E0E0'}`,
            borderRadius: 15,
            padding: 15,
            marginBottom: 12,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 14, color: '#2D3436', marginBottom: 4 }}>
                Календарный месяц
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                С 1-го по последнее число месяца
              </div>
            </div>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `2px solid ${localPeriodType === 'calendar_month' ? '#D291BC' : '#CCC'}`,
              background: localPeriodType === 'calendar_month' ? '#D291BC' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {localPeriodType === 'calendar_month' && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFF' }} />
              )}
            </div>
          </div>
        </motion.div>

        {/* Кастомный период */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => handlePeriodTypeChange('custom_period')}
          style={{
            background: localPeriodType === 'custom_period' ? '#F0E6F6' : '#F8F9FA',
            border: `2px solid ${localPeriodType === 'custom_period' ? '#D291BC' : '#E0E0E0'}`,
            borderRadius: 15,
            padding: 15,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 14, color: '#2D3436', marginBottom: 4 }}>
                Свой бюджетный период
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                Например, с 10-го по 9-е число
              </div>
            </div>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `2px solid ${localPeriodType === 'custom_period' ? '#D291BC' : '#CCC'}`,
              background: localPeriodType === 'custom_period' ? '#D291BC' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {localPeriodType === 'custom_period' && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFF' }} />
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* День начала периода */}
      {localPeriodType === 'custom_period' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#FFF',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', fontSize: 16, color: '#2D3436' }}>
            День начала периода
          </h3>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 15, lineHeight: 1.5 }}>
            Выберите день, с которого начинается ваш бюджетный период (от 1 до 28)
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: 8 
          }}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
              <motion.button
                key={day}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDayChange(day)}
                style={{
                  background: localStartDay === day ? '#D291BC' : '#F8F9FA',
                  color: localStartDay === day ? '#FFF' : '#2D3436',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 8px',
                  fontSize: 13,
                  fontWeight: localStartDay === day ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {day}
              </motion.button>
            ))}
          </div>

          <div style={{
            marginTop: 15,
            padding: 12,
            background: '#FFF9E6',
            borderRadius: 10,
            fontSize: 12,
            color: '#8B7500',
            lineHeight: 1.5
          }}>
            💡 Период будет с <strong>{localStartDay}-го</strong> числа текущего месяца по <strong>{localStartDay - 1}-е</strong> число следующего
          </div>
        </motion.div>
      )}

      {/* Кнопка сохранения */}
      {hasChanges && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={isSaving}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #D291BC 0%, #957DAD 100%)',
            color: '#FFF',
            border: 'none',
            borderRadius: 20,
            padding: '16px 24px',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
            boxShadow: '0 4px 12px rgba(210, 145, 188, 0.3)'
          }}
        >
          {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
        </motion.button>
      )}

      {/* Пример */}
      <div style={{
        marginTop: 20,
        padding: 15,
        background: '#F0F9FF',
        borderRadius: 15,
        fontSize: 12,
        color: '#0369A1',
        lineHeight: 1.6
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>ℹ️ Как это работает?</div>
        {localPeriodType === 'calendar_month' ? (
          <div>
            Бюджет считается с 1-го числа месяца по последнее. Например: 1 декабря - 31 декабря.
          </div>
        ) : (
          <div>
            Бюджет считается с {localStartDay}-го числа одного месяца по {localStartDay - 1}-е число следующего. 
            Например: {localStartDay} декабря - {localStartDay - 1} января. Удобно, если зарплата приходит не в начале месяца.
          </div>
        )}
      </div>

      {/* Сообщение */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: message.type === 'success' ? '#27AE60' : '#E74C3C',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 12,
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {message.text}
        </motion.div>
      )}

      {/* Разделитель */}
      <div style={{
        height: 2,
        background: '#E0E0E0',
        margin: '40px 0 30px 0',
        borderRadius: 2
      }} />

      {/* Связанные аккаунты */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
          <Link2 size={24} color="#6B4C75" />
          <h2 style={{ margin: 0, color: '#6B4C75', fontSize: 20 }}>Связанные аккаунты</h2>
        </div>

        <p style={{ 
          fontSize: 13, 
          color: '#666', 
          marginBottom: 15,
          lineHeight: 1.5
        }}>
          Привяжите несколько Telegram аккаунтов для доступа к одним данным
        </p>

        {/* Информационная карточка */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: 16,
            padding: '16px',
            marginBottom: 20,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}
        >
          <Info size={20} color="#667eea" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: '#6B4C75', lineHeight: 1.6 }}>
            <strong>Текущий ID:</strong> {userId}<br/>
            {linkedAccounts.some(acc => acc.telegram_id === userId) && (
              <>
                <strong>Главный аккаунт:</strong> {primaryUserId}<br/>
                <strong>Статус:</strong> {primaryUserId === userId ? 'Главный аккаунт' : 'Связанный аккаунт'}
              </>
            )}
            {!linkedAccounts.some(acc => acc.telegram_id === userId) && (
              <span style={{ opacity: 0.7 }}>Ваш аккаунт не связан с другими</span>
            )}
          </div>
        </motion.div>

        {/* Список связанных аккаунтов */}
        {linkedAccounts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: '#6B4C75',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              Привязанные аккаунты ({linkedAccounts.length})
            </div>
            
            {linkedAccounts.map((acc, index) => (
              <motion.div
                key={acc.telegram_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', color: '#6B4C75', fontSize: 15 }}>
                    ID: {acc.telegram_id}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B4C75', opacity: 0.6, marginTop: 2 }}>
                    {acc.telegram_id === primaryUserId ? 'Главный аккаунт' : `→ Привязан к ${acc.primary_user_id}`}
                  </div>
                </div>
                {acc.telegram_id === userId && (
                  <div style={{
                    background: '#27AE60',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 'bold'
                  }}>
                    ВЫ
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Кнопка привязки */}
        {!isLinking && !linkedAccounts.some(acc => acc.telegram_id === userId) && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsLinking(true)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              padding: '16px',
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              marginBottom: 12
            }}
          >
            <UserPlus size={20} />
            Привязать к аккаунту
          </motion.button>
        )}

        {/* Форма привязки */}
        {isLinking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '20px',
              marginBottom: 20,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#6B4C75',
              marginBottom: 12
            }}>
              Введите ID главного аккаунта
            </div>
            
            <input
              type="number"
              placeholder="Например: 123456789"
              value={linkUserId}
              onChange={(e) => setLinkUserId(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                border: '2px solid #E0E0E0',
                borderRadius: 12,
                fontSize: 15,
                marginBottom: 15,
                boxSizing: 'border-box',
                outline: 'none',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
            />

            <div style={{
              fontSize: 12,
              color: '#6B4C75',
              opacity: 0.7,
              marginBottom: 15,
              lineHeight: 1.5
            }}>
              💡 Узнайте ID главного аккаунта в этом же разделе на другом устройстве
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleLinkAccount}
                disabled={!linkUserId}
                style={{
                  flex: 1,
                  background: linkUserId ? '#27AE60' : '#CCC',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 'bold',
                  cursor: linkUserId ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Check size={18} />
                Привязать
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsLinking(false)
                  setLinkUserId('')
                }}
                style={{
                  flex: 1,
                  background: '#E74C3C',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <X size={18} />
                Отмена
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Кнопка отвязки */}
        {linkedAccounts.some(acc => acc.telegram_id === userId) && primaryUserId !== userId && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleUnlinkAccount}
            style={{
              width: '100%',
              background: 'white',
              color: '#E74C3C',
              border: '2px solid #E74C3C',
              borderRadius: 14,
              padding: '16px',
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginTop: 12
            }}
          >
            <Unlink size={20} />
            Отвязать аккаунт
          </motion.button>
        )}

        {/* Предупреждение для главного аккаунта */}
        {linkedAccounts.some(acc => acc.telegram_id === userId) && primaryUserId === userId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: 'rgba(255, 193, 7, 0.1)',
              borderRadius: 12,
              padding: '14px',
              marginTop: 15,
              fontSize: 13,
              color: '#6B4C75',
              lineHeight: 1.6
            }}
          >
            <strong>⚠️ Главный аккаунт</strong><br/>
            Вы не можете отвязаться, так как являетесь главным аккаунтом. Другие пользователи могут отвязаться от вас.
          </motion.div>
        )}
      </div>

      {/* Бэкап и восстановление */}
      <div style={{ marginTop: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
          <Download size={24} color="#6B4C75" />
          <h2 style={{ margin: 0, color: '#6B4C75', fontSize: 20 }}>Бэкап и восстановление</h2>
        </div>

        <p style={{ 
          fontSize: 13, 
          color: '#666', 
          marginBottom: 15,
          lineHeight: 1.5
        }}>
          Сохраняйте резервные копии данных и восстанавливайте их при необходимости
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <motion.button
            onClick={handleExportBackup}
            disabled={isRestoring}
            whileTap={{ scale: 0.95 }}
            style={{
              flex: 1,
              padding: '14px',
              background: isRestoring ? '#CCC' : 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 'bold',
              cursor: isRestoring ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: isRestoring ? 'none' : '0 4px 12px rgba(78, 205, 196, 0.3)'
            }}
          >
            <Download size={18} />
            Экспорт
          </motion.button>

          <motion.button
            onClick={handleImportBackup}
            disabled={isRestoring}
            whileTap={{ scale: 0.95 }}
            style={{
              flex: 1,
              padding: '14px',
              background: isRestoring ? '#CCC' : 'linear-gradient(135deg, #F38181 0%, #E74C3C 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 'bold',
              cursor: isRestoring ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: isRestoring ? 'none' : '0 4px 12px rgba(243, 129, 129, 0.3)'
            }}
          >
            <Upload size={18} />
            Импорт
          </motion.button>
        </div>

        {cloudStorage.isAvailable() && (
          <motion.button
            onClick={handleRestoreFromCloud}
            disabled={isRestoring}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '100%',
              padding: '14px',
              background: isRestoring ? '#CCC' : 'linear-gradient(135deg, #AA96DA 0%, #8B7AB8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 'bold',
              cursor: isRestoring ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: isRestoring ? 'none' : '0 4px 12px rgba(170, 150, 218, 0.3)'
            }}
          >
            <Cloud size={18} />
            Восстановить из облака
          </motion.button>
        )}

        <div style={{
          marginTop: 12,
          padding: 12,
          background: '#F0F9FF',
          borderRadius: 12,
          fontSize: 12,
          color: '#0369A1',
          lineHeight: 1.5
        }}>
          <strong>ℹ️ Важно:</strong> Импорт добавляет данные к существующим, не удаляя их. Для полной очистки используйте сброс всех данных ниже.
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Опасная зона */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          marginTop: 30,
          paddingTop: 30,
          borderTop: '2px dashed #E0E0E0'
        }}
      >
        <div style={{
          fontSize: 14,
          fontWeight: 'bold',
          color: '#E74C3C',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          🚨 Опасная зона
        </div>
        <div style={{
          fontSize: 12,
          color: '#999',
          marginBottom: 12,
          lineHeight: 1.5
        }}>
          Полностью удалить все данные приложения и вернуться к начальному состоянию. 
          Это действие невозможно отменить.
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleResetAllData}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontSize: 15,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)'
          }}
        >
          <Trash2 size={20} />
          Сбросить все данные
        </motion.button>
      </motion.div>
    </div>
  );
};
